/**
 * dispararNotificacoesOP.js
 * Serviço responsável por disparar notificações em tempo real para operadores
 * quando uma Ordem de Produção (OP) é cancelada, reduzida ou modificada pelo PCP.
 *
 * Chamado a partir do PCPEditarOPDialog após uma mutação bem-sucedida.
 */

import { rdsn } from './supabaseClient';

/**
 * Busca todas as ReservaLote ativas vinculadas a uma OP pelo código do produto ou nome do cliente.
 * @param {Object} op - O objeto da OP
 * @returns {Promise<Array>} Lista de reservas afetadas
 */
async function buscarReservasAfetadas(op) {
  try {
    // Busca reservas ativas no geral (RESERVADO ou EM_PRODUCAO)
    const reservas = await rdsn.entities.ReservaLote.filter({
      status: { $in: ['RESERVADO', 'EM_PRODUCAO'] }
    });

    if (!reservas || reservas.length === 0) return [];

    const codigoOp = op.codigo_op?.toLowerCase();
    const codigoProduto = op.codigo_produto?.toLowerCase();
    const clienteNome = op.cliente_nome?.toLowerCase();

    // Filtra apenas as reservas que têm relação com esta OP
    return reservas.filter(r => {
      const codProduto = r.codigo_produto?.toLowerCase();
      const codCompleto = r.codigo_completo?.toLowerCase();
      const clienteReserva = r.cliente?.toLowerCase();

      const matchPorCodigo =
        codProduto && codigoProduto && codProduto === codigoProduto;
      const matchPorCodigoOp =
        codCompleto && codigoOp && codCompleto.includes(codigoOp);
      const matchPorCliente =
        clienteNome && clienteReserva && clienteReserva === clienteNome;

      return matchPorCodigo || matchPorCodigoOp || matchPorCliente;
    });
  } catch (err) {
    console.error('[NOTIF-OP] Erro ao buscar reservas afetadas:', err);
    return [];
  }
}

/**
 * Busca os IDs dos operadores que devem ser notificados.
 * Prioriza operadores dos setores envolvidos nas reservas afetadas.
 * @param {Array} reservas - Reservas afetadas
 * @param {string} setorId - ID do setor da OP
 * @returns {Promise<string[]>} Lista de IDs de usuários a notificar
 */
async function buscarOperadoresAfetados(reservas, setorId) {
  try {
    // Coleta os setor_ids únicos das reservas afetadas
    const setorIds = [...new Set(
      reservas.map(r => String(r.setor_id)).filter(Boolean)
    )];

    // Inclui o setor da própria OP
    if (setorId && !setorIds.includes(String(setorId))) {
      setorIds.push(String(setorId));
    }

    if (setorIds.length === 0) return [];

    // Busca todos os usuários ativos
    const todosUsuarios = await rdsn.entities.usuarios.filter({ status: 'Ativo' });

    if (!todosUsuarios || todosUsuarios.length === 0) return [];

    // Filtra operadores que pertencem a algum dos setores das reservas
    const operadores = todosUsuarios.filter(u => {
      const pertenceAoSetor = setorIds.some(sid => String(u.setor_id) === sid);
      const ehOperador = u.role_custom?.toLowerCase() === 'operador' ||
        u.role?.toLowerCase() === 'operador';
      return pertenceAoSetor && ehOperador;
    });

    return [...new Set(operadores.map(u => u.id))];
  } catch (err) {
    console.error('[NOTIF-OP] Erro ao buscar operadores afetados:', err);
    return [];
  }
}

/**
 * Cria um registro de Notificacao para um único usuário.
 */
async function criarNotificacao({ usuario_id, titulo, mensagem, tipo, prioridade, entidade_id, link_relacionado }) {
  try {
    await rdsn.entities.Notificacao.create({
      usuario_id,
      titulo,
      mensagem,
      tipo,
      prioridade,
      entidade_tipo: 'PCPOrdemProducao',
      entidade_id: String(entidade_id),
      link_relacionado: link_relacionado || '/reservas',
      lida: false,
      arquivada: false,
    });
  } catch (err) {
    console.error('[NOTIF-OP] Erro ao criar notificação:', err, { usuario_id, titulo });
  }
}

/**
 * Ponto de entrada principal. Chamado após uma mutação PCP para disparar notificações.
 *
 * @param {Object} params
 * @param {Object} params.op - O objeto da OP (antes da atualização)
 * @param {'CANCELAMENTO' | 'REDUCAO_QUANTIDADE' | 'ENCURTAMENTO' | 'ATUALIZACAO'} params.tipoAlteracao
 * @param {Object} [params.dadosAnteriores] - Dados anteriores da OP (para delta de quantidade)
 * @param {Object} [params.dadosNovos] - Novos dados da OP
 * @param {string} [params.setorId] - ID do setor da OP
 * @returns {Promise<{notificadas: number}>}
 */
export async function dispararNotificacoesOP({ op, tipoAlteracao, dadosAnteriores = {}, dadosNovos = {}, setorId }) {
  try {
    const reservasAfetadas = await buscarReservasAfetadas(op);

    if (reservasAfetadas.length === 0) {
      console.log('[NOTIF-OP] Nenhuma reserva afetada encontrada para a OP:', op.codigo_op);
      return { notificadas: 0 };
    }

    const operadorIds = await buscarOperadoresAfetados(reservasAfetadas, setorId);

    if (operadorIds.length === 0) {
      console.log('[NOTIF-OP] Nenhum operador encontrado para notificar');
      return { notificadas: 0 };
    }

    let titulo = '';
    let mensagem = '';
    let tipo = 'ALERTA';
    let prioridade = 'ALTA';

    switch (tipoAlteracao) {
      case 'CANCELAMENTO':
        titulo = `⛔ OP Cancelada: ${op.codigo_op}`;
        mensagem = `A Ordem de Produção ${op.codigo_op}${op.descricao ? ` (${op.descricao})` : ''} foi CANCELADA pelo PCP. Verifique o impacto nas suas reservas ativas.`;
        tipo = 'ERRO';
        prioridade = 'CRITICA';
        break;

      case 'REDUCAO_QUANTIDADE': {
        const qtdAnterior = Number(dadosAnteriores.quantidade_total) || 0;
        const qtdNova = Number(dadosNovos.quantidade_total) || 0;
        const delta = qtdAnterior - qtdNova;
        titulo = `⚠️ OP Reduzida: ${op.codigo_op}`;
        mensagem = `A quantidade da OP ${op.codigo_op} foi REDUZIDA de ${qtdAnterior.toLocaleString()} para ${qtdNova.toLocaleString()} unidades (−${delta.toLocaleString()}). Revise a programação das suas reservas.`;
        tipo = 'ALERTA';
        prioridade = 'ALTA';
        break;
      }

      case 'ENCURTAMENTO':
        titulo = `📉 Programação Ajustada: ${op.codigo_op}`;
        mensagem = `A Ordem de Produção ${op.codigo_op} teve sua programação mensal ajustada pelo PCP. Verifique as novas metas de produção.`;
        tipo = 'ALERTA';
        prioridade = 'MEDIA';
        break;

      default:
        titulo = `📋 OP Atualizada: ${op.codigo_op}`;
        mensagem = `A Ordem de Produção ${op.codigo_op} foi atualizada pelo PCP. Verifique as informações mais recentes.`;
        tipo = 'INFO';
        prioridade = 'MEDIA';
    }

    // Dispara para todos os operadores afetados em paralelo
    await Promise.all(
      operadorIds.map(usuario_id =>
        criarNotificacao({
          usuario_id,
          titulo,
          mensagem,
          tipo,
          prioridade,
          entidade_id: op.id,
          link_relacionado: '/reservas',
        })
      )
    );

    console.log(`[NOTIF-OP] ${operadorIds.length} operador(es) notificado(s) — tipo: ${tipoAlteracao} — OP: ${op.codigo_op}`);
    return { notificadas: operadorIds.length };
  } catch (err) {
    console.error('[NOTIF-OP] Erro crítico ao disparar notificações de OP:', err);
    return { notificadas: 0 };
  }
}
