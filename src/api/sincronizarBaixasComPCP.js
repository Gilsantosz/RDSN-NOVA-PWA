import { rdsn } from './supabaseClient.js';

export async function sincronizarBaixasComPCP(payload) {
  try {
    const { mes, ano, op_id, setor_id } = payload;

    if (!mes || !ano) {
      return { data: { error: 'mes e ano são obrigatórios' }, status: 400 };
    }

    // 1. Buscar OPs do mês/ano
    let filtroOps = op_id
      ? { id: op_id, mes, ano }
      : { mes, ano, status: 'Ativo' };

    if (setor_id && !op_id) {
      filtroOps = { ...filtroOps, setor_id };
    }

    const ops = await rdsn.entities.PCPOrdemProducao.filter(filtroOps, null, 200);
    const opsComCodigo = ops.filter(op => (op.codigo_produto && op.codigo_produto.trim()) || (op.codigo_op && op.codigo_op.trim()));

    if (opsComCodigo.length === 0) {
      return { data: { message: 'Nenhuma OP encontrada para sincronizar', sincronizadas: 0 } };
    }

    // 2. Buscar reservas em paralelo por cada codigo_produto único
    const getCodigoOP = (op) => (op.codigo_produto && op.codigo_produto.trim()) || op.codigo_op;
    const codigosUnicos = [...new Set(opsComCodigo.map(o => getCodigoOP(o)).filter(Boolean))];

    const [reservasPorCodigoArr, todasProducoesMes] = await Promise.all([
      Promise.all(
        codigosUnicos.map(codigo =>
          rdsn.entities.ReservaLote.filter({ codigo_produto: codigo }, null, 500)
            .then(reservas => ({ codigo, reservas }))
            .catch(() => ({ codigo, reservas: [] }))
        )
      ),
      rdsn.entities.PCPProducaoDiaria.filter({ mes, ano }, null, 5000)
    ]);

    const reservasPorCodigo = {};
    for (const { codigo, reservas } of reservasPorCodigoArr) {
      reservasPorCodigo[codigo] = reservas;
    }

    const producaoExistentePorKey = {};
    const registrosOrfaos = [];
    for (const p of todasProducoesMes) {
      const key = `${p.op_id}-${p.dia}`;
      const existing = producaoExistentePorKey[key];
      if (!existing) {
        producaoExistentePorKey[key] = p;
      } else {
        if (p.setor_id && !existing.setor_id) {
          registrosOrfaos.push(existing);
          producaoExistentePorKey[key] = p;
        } else if (!p.setor_id && existing.setor_id) {
          registrosOrfaos.push(p);
        } else if (p.setor_id && existing.setor_id && setor_id) {
          if (p.setor_id === setor_id && existing.setor_id !== setor_id) {
            registrosOrfaos.push(existing);
            producaoExistentePorKey[key] = p;
          } else {
            registrosOrfaos.push(p);
          }
        }
      }
    }

    if (registrosOrfaos.length > 0) {
      await Promise.allSettled(
        registrosOrfaos.map(p => {
          const key = `${p.op_id}-${p.dia}`;
          const correto = producaoExistentePorKey[key];
          if (correto && p.realizado > 0 && (!correto.realizado || correto.realizado === 0)) {
            return rdsn.entities.PCPProducaoDiaria.update(correto.id, { realizado: p.realizado })
              .then(() => rdsn.entities.PCPProducaoDiaria.delete(p.id));
          }
          return rdsn.entities.PCPProducaoDiaria.delete(p.id);
        })
      );
    }

    const anoCompleto = 2000 + ano;
    const inicioMes = new Date(anoCompleto, mes - 1, 1).toISOString();
    const fimMes = new Date(anoCompleto, mes, 0, 23, 59, 59).toISOString();

    const todasReservas = Object.values(reservasPorCodigo).flat();
    const reservaIdSet = new Set(todasReservas.map(r => r.id));

    const baixasPorReservaArr = await Promise.all(
      [...reservaIdSet].map(reservaId =>
        rdsn.entities.BaixaLote.filter({ reserva_id: reservaId }, null, 1000)
          .then(baixas => ({ reservaId, baixas }))
          .catch(() => ({ reservaId, baixas: [] }))
      )
    );

    const baixasPorReserva = {};
    for (const { reservaId, baixas } of baixasPorReservaArr) {
      baixasPorReserva[reservaId] = baixas.filter(b => {
        if (!b.created_at) return true;
        return b.created_at >= inicioMes && b.created_at <= fimMes;
      });
    }

    const erros = [];

    const resultados = await Promise.allSettled(
      opsComCodigo.map(async (op) => {
        const codigoBusca = getCodigoOP(op);
        const reservas = reservasPorCodigo[codigoBusca] || [];
        const todasBaixas = reservas.flatMap(r => baixasPorReserva[r.id] || []);

        if (todasBaixas.length === 0) return { op_id: op.id, skipped: true };

        const qtdPorDia = {};
        for (const baixa of todasBaixas) {
          const dia = baixa.created_at ? new Date(baixa.created_at).getDate() : 1;
          qtdPorDia[dia] = (qtdPorDia[dia] || 0) + (baixa.quantidade || 0);
        }

        const writes = Object.entries(qtdPorDia).map(([diaStr, qtd]) => {
          const dia = Number(diaStr);
          const existente = producaoExistentePorKey[`${op.id}-${dia}`];
          if (existente) {
            if (existente.realizado === qtd) return Promise.resolve();
            return rdsn.entities.PCPProducaoDiaria.update(existente.id, { realizado: qtd });
          } else {
            return rdsn.entities.PCPProducaoDiaria.create({
              op_id: op.id, mes, ano, dia, previsto: 0, realizado: qtd, setor_id: setor_id || op.setor_id || ''
            });
          }
        });

        await Promise.all(writes);
        return { op_id: op.id, dias: Object.keys(qtdPorDia).length };
      })
    );

    let totalSincronizadas = 0;
    for (const r of resultados) {
      if (r.status === 'fulfilled' && !r.value?.skipped) {
        totalSincronizadas++;
      } else if (r.status === 'rejected') {
        erros.push(r.reason?.message || 'Erro desconhecido');
      }
    }

    return {
      data: {
        success: true,
        message: 'Sincronização concluída',
        sincronizadas: totalSincronizadas,
        erros: erros.length > 0 ? erros : undefined,
        mes,
        ano
      }
    };

  } catch (error) {
    return { data: { error: error.message }, status: 500 };
  }
}