import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);
    
    // Buscar todas as reservas ativas ou em produção
    const reservas = await rdsn.asServiceRole.entities.ReservaLote.filter({
      status: { $in: ['RESERVADO', 'EM_PRODUCAO'] }
    });

    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 20); // 20 dias atrás

    const alertasCriados = [];
    const notificacoesCriadas = [];

    for (const reserva of reservas) {
      const dataReserva = new Date(reserva.created_date);
      const diasInativo = Math.floor((Date.now() - dataReserva.getTime()) / (1000 * 60 * 60 * 24));
      
      // Se a reserva foi criada há mais de 20 dias e não está completa
      if (dataReserva < dataLimite) {
        const quantidadeFaltante = reserva.quantidade - (reserva.quantidade_baixada || 0);
        const percentualPendente = ((quantidadeFaltante / reserva.quantidade) * 100).toFixed(1);

        // Verificar se já existe alerta para esta reserva
        const alertasExistentes = await rdsn.asServiceRole.entities.Alerta.filter({
          entidade_tipo: 'ReservaLote',
          entidade_id: reserva.id,
          tipo: 'PROGRESSO_BAIXO',
          resolvido: false
        });

        if (alertasExistentes.length === 0) {
          // Determinar severidade baseada no tempo inativo
          let severidade = 'MEDIA';
          if (diasInativo > 40) severidade = 'CRITICA';
          else if (diasInativo > 30) severidade = 'ALTA';

          // Criar alerta
          const alerta = await rdsn.asServiceRole.entities.Alerta.create({
            tipo: 'PROGRESSO_BAIXO',
            severidade,
            titulo: `Reserva Inativa há ${diasInativo} dias`,
            descricao: `A reserva ${reserva.codigo_completo} está inativa há ${diasInativo} dias. Faltam ${quantidadeFaltante} unidades (${percentualPendente}%) para finalizar a produção.`,
            entidade_tipo: 'ReservaLote',
            entidade_id: reserva.id,
            lido: false,
            resolvido: false,
            dados_extras: JSON.stringify({
              codigo_completo: reserva.codigo_completo,
              quantidade_total: reserva.quantidade,
              quantidade_faltante: quantidadeFaltante,
              percentual_pendente: percentualPendente,
              dias_inativo: diasInativo,
              cliente: reserva.cliente,
              setor_id: reserva.setor_id
            })
          });

          alertasCriados.push(alerta);

          // Buscar usuários do setor para notificar
          const usuarios = await rdsn.asServiceRole.entities.UsuarioInterno.filter({
            ativo: true,
            setores_permitidos: { $contains: reserva.setor_id }
          });

          // Também notificar admins
          const admins = await rdsn.asServiceRole.entities.UsuarioInterno.filter({
            ativo: true,
            role_custom: 'Admin'
          });

          const todosUsuarios = [...usuarios, ...admins];

          // Criar notificações para cada usuário
          for (const usuario of todosUsuarios) {
            const notif = await rdsn.asServiceRole.entities.Notificacao.create({
              titulo: `⚠️ Reserva Inativa: ${reserva.codigo_completo}`,
              mensagem: `Há ${diasInativo} dias sem produção. Faltam ${quantidadeFaltante} unidades (${percentualPendente}%) para finalizar.`,
              tipo: 'ALERTA',
              prioridade: severidade,
              usuario_id: usuario.id,
              link_relacionado: `/Reservas?id=${reserva.id}`,
              entidade_tipo: 'ReservaLote',
              entidade_id: reserva.id,
              lida: false,
              arquivada: false
            });

            notificacoesCriadas.push(notif);
          }
        }
      }
    }

    return buildCorsResponse({
      success: true,
      message: `Verificação concluída. ${alertasCriados.length} alertas criados.`,
      alertasCriados: alertasCriados.length,
      notificacoesCriadas: notificacoesCriadas.length,
      reservasVerificadas: reservas.length,
      detalhes: alertasCriados.map(a => ({
        codigo: a.dados_extras ? JSON.parse(a.dados_extras).codigo_completo : '',
        dias_inativo: a.dados_extras ? JSON.parse(a.dados_extras).dias_inativo : 0
      }))
    });
  } catch (error) {
    console.error('Erro ao verificar reservas inativas:', error);
    return buildCorsResponse({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});