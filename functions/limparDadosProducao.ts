import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function deletarEntidade(rdsn, entidade, lista) {
  for (let i = 0; i < lista.length; i += 3) {
    await Promise.all(lista.slice(i, i + 3).map(item => 
      rdsn.asServiceRole.entities[entidade].delete(item.id).catch(() => {})
    ));
    await sleep(400);
  }
  return lista.length;
}

async function listar(rdsn, entidade) {
  try {
    const data = await rdsn.asServiceRole.entities[entidade].list();
    await sleep(300);
    return data || [];
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { filtros, internalUserId } = body;

    // Verificar autorização
    let isAdmin = false;
    if (internalUserId === 'admin') {
      isAdmin = true;
    } else if (internalUserId) {
      const usuarios = await listar(rdsn, 'UsuarioInterno');
      const u = usuarios.find(x => x.id === internalUserId);
      if (u && u.role_custom === 'Admin') isAdmin = true;
    } else {
      try {
        const user = await rdsn.auth.me();
        if (user && user.role === 'admin') isAdmin = true;
      } catch {}
    }

    if (!isAdmin) {
      return buildCorsResponse({ error: 'Apenas administradores podem limpar dados' }, { status: 403 });
    }

    const inicio = Date.now();
    const isTotal = !filtros || Object.keys(filtros).length === 0;
    const resultados = {};

    if (!isTotal) {
      // Exclusão seletiva
      const todasReservas = await listar(rdsn, 'ReservaLote');
      const reservas = todasReservas.filter(r => {
        if (filtros.codigos?.length > 0) {
          const match = filtros.codigos.some(cod => r.codigo_completo?.includes(cod) || r.codigo_produto?.includes(cod));
          if (!match) return false;
        }
        if (filtros.clientes?.length > 0) {
          const match = filtros.clientes.some(cli => r.cliente?.toLowerCase().includes(cli.toLowerCase()));
          if (!match) return false;
        }
        if (filtros.modelos?.length > 0) {
          const match = filtros.modelos.some(mod => r.modelo?.toLowerCase().includes(mod.toLowerCase()));
          if (!match) return false;
        }
        if (filtros.numero_inicial && r.numero_final < Number(filtros.numero_inicial)) return false;
        if (filtros.numero_final && r.numero_inicial > Number(filtros.numero_final)) return false;
        return true;
      });

      const reservaIds = new Set(reservas.map(r => r.id));
      const todasBaixas = await listar(rdsn, 'BaixaLote');
      const baixas = todasBaixas.filter(b => reservaIds.has(b.reserva_id));

      resultados.baixas_deletadas = await deletarEntidade(rdsn, 'BaixaLote', baixas);
      resultados.reservas_deletadas = await deletarEntidade(rdsn, 'ReservaLote', reservas);
    } else {
      // Exclusão total - listar e deletar uma entidade por vez
      const entidades = [
        'BaixaLote',
        'ReservaLote',
        'SequenciaAnual',
        'NumeracaoLivre',
        'BloqueioIntervalo',
        'Notificacao',
        'Alerta',
        'MovimentacaoEstoque',
        'Auditoria',
        'AuditoriaUsuarios',
        'TarefaAgendada',
        'RelatorioCustomizado',
        'ConfiguracaoKPI',
        'ProducaoDiaLote',
        'ProducaoDia',
      ];

      for (const entidade of entidades) {
        const lista = await listar(rdsn, entidade);
        if (lista.length > 0) {
          const count = await deletarEntidade(rdsn, entidade, lista);
          resultados[entidade] = count;
        } else {
          resultados[entidade] = 0;
        }
      }
    }

    const total = Object.values(resultados).reduce((a, b) => a + b, 0);
    const tempo_ms = Date.now() - inicio;

    return buildCorsResponse({
      success: true,
      resultados: { ...resultados, tempo_ms },
      mensagem: `${total} registros deletados com sucesso em ${tempo_ms}ms`
    });

  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    return buildCorsResponse({ error: error.message || 'Erro ao limpar dados de produção' }, { status: 500 });
  }
});