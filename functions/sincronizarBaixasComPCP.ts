import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

/**
 * Sincroniza as baixas de produção com o "Realizado" na programação mensal do PCP.
 * 
 * Otimizações:
 * - Todas as reservas são buscadas em paralelo (Promise.all) por código de produto.
 * - Todas as BaixaLotes são buscadas em paralelo por reserva_id.
 * - Todos os PCPProducaoDiaria existentes do mês são buscados em UMA única chamada.
 * - Writes (update/create) são agrupados e disparados em paralelo por OP.
 * - Falhas parciais (por OP) não abortam as demais — são coletadas e retornadas no response.
 */
Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);
    const user = await rdsn.auth.me();
    if (!user) {
      return buildCorsResponse({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mes, ano, op_id, setor_id } = await req.json();

    if (!mes || !ano) {
      return buildCorsResponse({ error: 'mes e ano são obrigatórios' }, { status: 400 });
    }

    // 1. Buscar OPs do mês/ano
    let filtroOps = op_id
      ? { id: op_id, mes, ano }
      : { mes, ano, status: 'Ativo' };
    
    if (setor_id && !op_id) {
      filtroOps = { ...filtroOps, setor_id };
    }

    const ops = await rdsn.entities.PCPOrdemProducao.filter(filtroOps, null, 200);
    // Cada OP tem um código de produto associado: usa codigo_produto se preenchido, senão usa codigo_op
    const opsComCodigo = ops.filter(op => (op.codigo_produto && op.codigo_produto.trim()) || (op.codigo_op && op.codigo_op.trim()));

    if (opsComCodigo.length === 0) {
      return buildCorsResponse({ message: 'Nenhuma OP encontrada para sincronizar', sincronizadas: 0 });
    }

    // 2. Buscar reservas em paralelo por cada codigo_produto único
    // Usa codigo_produto se disponível e não-vazio, senão usa codigo_op como fallback
    const getCodigoOP = (op) => (op.codigo_produto && op.codigo_produto.trim()) || op.codigo_op;
    const codigosUnicos = [...new Set(opsComCodigo.map(o => getCodigoOP(o)).filter(Boolean))];

    const [reservasPorCodigoArr, todasProducoesMes] = await Promise.all([
      // Buscar reservas de todos os códigos em paralelo
      Promise.all(
        codigosUnicos.map(codigo =>
          rdsn.entities.ReservaLote.filter({ codigo_produto: codigo }, null, 500)
            .then(reservas => ({ codigo, reservas }))
            .catch(() => ({ codigo, reservas: [] })) // falha parcial: ignora código problemático
        )
      ),
      // Buscar TODOS os PCPProducaoDiaria do mês de uma vez (sem filtro de setor para encontrar registros antigos sem setor_id)
      rdsn.entities.PCPProducaoDiaria.filter({ mes, ano }, null, 5000)
    ]);

    // Montar mapa codigo_produto → reservas
    const reservasPorCodigo = {};
    for (const { codigo, reservas } of reservasPorCodigoArr) {
      reservasPorCodigo[codigo] = reservas;
    }

    // Montar mapa op_id+dia → registro existente (evita consulta por OP)
    // Prioriza registros COM setor_id sobre registros sem setor_id
    const producaoExistentePorKey = {};
    const registrosOrfaos = []; // Registros sem setor_id que têm duplicata com setor_id
    for (const p of todasProducoesMes) {
      const key = `${p.op_id}-${p.dia}`;
      const existing = producaoExistentePorKey[key];
      if (!existing) {
        producaoExistentePorKey[key] = p;
      } else {
        // Há duplicata: priorizar o que tem setor_id
        if (p.setor_id && !existing.setor_id) {
          // O novo tem setor, o antigo não — marca o antigo para remoção
          registrosOrfaos.push(existing);
          producaoExistentePorKey[key] = p;
        } else if (!p.setor_id && existing.setor_id) {
          // O antigo tem setor, o novo não — marca o novo para remoção
          registrosOrfaos.push(p);
        } else if (p.setor_id && existing.setor_id && setor_id) {
          // Ambos têm setor — priorizar o do setor correto
          if (p.setor_id === setor_id && existing.setor_id !== setor_id) {
            registrosOrfaos.push(existing);
            producaoExistentePorKey[key] = p;
          } else {
            registrosOrfaos.push(p);
          }
        }
      }
    }

    // Limpar registros órfãos/duplicados (sem setor_id) que têm versão com setor_id
    if (registrosOrfaos.length > 0) {
      await Promise.allSettled(
        registrosOrfaos.map(p => {
          // Mover o realizado para o registro correto antes de deletar
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

    // Data de referência para filtrar baixas do mês
    const anoCompleto = 2000 + ano;
    const inicioMes = new Date(anoCompleto, mes - 1, 1).toISOString();
    const fimMes = new Date(anoCompleto, mes, 0, 23, 59, 59).toISOString();

    // 3. Coletar todos os reserva_ids necessários de uma vez
    const todasReservas = Object.values(reservasPorCodigo).flat();
    const reservaIdSet = new Set(todasReservas.map(r => r.id));

    // 4. Buscar TODAS as baixas em paralelo (por reserva_id)
    const baixasPorReservaArr = await Promise.all(
      [...reservaIdSet].map(reservaId =>
        rdsn.entities.BaixaLote.filter({ reserva_id: reservaId }, null, 1000)
          .then(baixas => ({ reservaId, baixas }))
          .catch(() => ({ reservaId, baixas: [] }))
      )
    );

    // Montar mapa reservaId → baixas do mês
    const baixasPorReserva = {};
    for (const { reservaId, baixas } of baixasPorReservaArr) {
      baixasPorReserva[reservaId] = baixas.filter(b => {
        if (!b.created_date) return true;
        return b.created_date >= inicioMes && b.created_date <= fimMes;
      });
    }

    // 5. Processar cada OP em paralelo, capturando falhas individualmente
    const erros = [];

    const resultados = await Promise.allSettled(
      opsComCodigo.map(async (op) => {
        // Coletar reservas e baixas desta OP (usa codigo_produto ou codigo_op como fallback)
        const codigoBusca = getCodigoOP(op);
        const reservas = reservasPorCodigo[codigoBusca] || [];
        const todasBaixas = reservas.flatMap(r => baixasPorReserva[r.id] || []);

        if (todasBaixas.length === 0) return { op_id: op.id, skipped: true };

        // Agrupar quantidade por dia
        const qtdPorDia = {};
        for (const baixa of todasBaixas) {
          const dia = baixa.created_date ? new Date(baixa.created_date).getDate() : 1;
          qtdPorDia[dia] = (qtdPorDia[dia] || 0) + (baixa.quantidade || 0);
        }

        // Disparar writes em paralelo para cada dia
        const writes = Object.entries(qtdPorDia).map(([diaStr, qtd]) => {
          const dia = Number(diaStr);
          const existente = producaoExistentePorKey[`${op.id}-${dia}`];
          if (existente) {
            if (existente.realizado === qtd) return Promise.resolve(); // nada a fazer
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

    return buildCorsResponse({
      message: 'Sincronização concluída',
      sincronizadas: totalSincronizadas,
      erros: erros.length > 0 ? erros : undefined,
      mes,
      ano
    });

  } catch (error) {
    return buildCorsResponse({ error: error.message }, { status: 500 });
  }
});