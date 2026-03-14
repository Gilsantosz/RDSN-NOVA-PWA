import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);

    // Buscar todas as configurações ativas
    const configuracoes = await rdsn.asServiceRole.entities.ConfiguracaoAlerta.filter({ ativo: true });
    
    const alertasEnviados = [];
    const agora = new Date();

    for (const config of configuracoes) {
      const parametros = config.parametros ? JSON.parse(config.parametros) : {};
      const setoresMonitorados = config.setores_monitorados || [];
      
      try {
        switch (config.tipo_alerta) {
          case 'RESERVA_ESGOTAMENTO': {
            const percentualLimite = parametros.percentual || 85;
            const query = setoresMonitorados.length > 0 
              ? { status: 'EM_PRODUCAO', setor_id: { $in: setoresMonitorados } }
              : { status: 'EM_PRODUCAO' };
            
            const reservas = await rdsn.asServiceRole.entities.ReservaLote.filter(query);
            
            for (const reserva of reservas) {
              const percentualProduzido = (reserva.quantidade_baixada / reserva.quantidade) * 100;
              if (percentualProduzido >= percentualLimite) {
                await enviarAlerta(rdsn, config, {
                  titulo: 'Reserva Próxima ao Esgotamento',
                  mensagem: `A reserva ${reserva.codigo_completo} atingiu ${percentualProduzido.toFixed(1)}% de produção (${reserva.quantidade_baixada}/${reserva.quantidade})`,
                  tipo: 'ALERTA',
                  prioridade: 'ALTA',
                  entidade_tipo: 'ReservaLote',
                  entidade_id: reserva.id
                });
                alertasEnviados.push({ config_id: config.id, reserva_id: reserva.id });
              }
            }
            break;
          }

          case 'PRODUCAO_PARADA': {
            const diasLimite = parametros.dias || 3;
            const dataLimite = new Date(agora.getTime() - diasLimite * 24 * 60 * 60 * 1000);
            
            const query = setoresMonitorados.length > 0 
              ? { status: 'EM_PRODUCAO', setor_id: { $in: setoresMonitorados } }
              : { status: 'EM_PRODUCAO' };
            
            const reservas = await rdsn.asServiceRole.entities.ReservaLote.filter(query);
            
            for (const reserva of reservas) {
              // Buscar última baixa da reserva
              const baixas = await rdsn.asServiceRole.entities.BaixaLote.filter({ reserva_id: reserva.id });
              if (baixas.length > 0) {
                const ultimaBaixa = baixas.sort((a, b) => 
                  new Date(b.created_date) - new Date(a.created_date)
                )[0];
                
                const dataUltimaBaixa = new Date(ultimaBaixa.created_date);
                if (dataUltimaBaixa < dataLimite) {
                  const diasParado = Math.floor((agora - dataUltimaBaixa) / (1000 * 60 * 60 * 24));
                  await enviarAlerta(rdsn, config, {
                    titulo: 'Produção Parada',
                    mensagem: `O lote ${reserva.codigo_completo} está há ${diasParado} dias sem movimentação`,
                    tipo: 'ALERTA',
                    prioridade: 'ALTA',
                    entidade_tipo: 'ReservaLote',
                    entidade_id: reserva.id
                  });
                  alertasEnviados.push({ config_id: config.id, reserva_id: reserva.id });
                }
              }
            }
            break;
          }

          case 'PROBLEMA_AUDITORIA': {
            // Verificar problemas críticos para cada letra/ano
            const sequencias = await rdsn.asServiceRole.entities.SequenciaAnual.list();
            
            for (const seq of sequencias) {
              if (setoresMonitorados.length > 0 && !setoresMonitorados.includes(seq.setor_id)) {
                continue;
              }

              const response = await rdsn.asServiceRole.functions.invoke('detectarProblemasNumeracao', {
                letra_produto: seq.letra_produto,
                ano: seq.ano
              });

              if (response.data.problemas) {
                const problemasCriticos = response.data.problemas.filter(p => p.severidade === 'CRITICA');
                if (problemasCriticos.length > 0) {
                  await enviarAlerta(rdsn, config, {
                    titulo: 'Problemas Críticos na Auditoria',
                    mensagem: `Detectados ${problemasCriticos.length} problemas críticos em ${seq.letra_produto}${seq.ano}: ${problemasCriticos.map(p => p.tipo).join(', ')}`,
                    tipo: 'ERRO',
                    prioridade: 'CRITICA',
                    entidade_tipo: 'SequenciaAnual',
                    entidade_id: seq.id
                  });
                  alertasEnviados.push({ config_id: config.id, sequencia_id: seq.id });
                }
              }
            }
            break;
          }

          case 'BAIXA_FORA_PADRAO': {
            const quantidadeMaxima = parametros.quantidade_maxima || 1000;
            const dataLimite = new Date(agora.getTime() - 24 * 60 * 60 * 1000); // Últimas 24h
            
            const baixas = await rdsn.asServiceRole.entities.BaixaLote.filter({ tipo: 'MANUAL' });
            
            for (const baixa of baixas) {
              if (new Date(baixa.created_date) < dataLimite) continue;
              
              if (setoresMonitorados.length > 0 && !setoresMonitorados.includes(baixa.setor_producao)) {
                continue;
              }

              if (baixa.quantidade > quantidadeMaxima) {
                const reserva = await rdsn.asServiceRole.entities.ReservaLote.get(baixa.reserva_id);
                await enviarAlerta(rdsn, config, {
                  titulo: 'Baixa Manual Fora do Padrão',
                  mensagem: `Baixa manual de ${baixa.quantidade} unidades excede o limite de ${quantidadeMaxima} (Reserva: ${reserva?.codigo_completo})`,
                  tipo: 'ALERTA',
                  prioridade: 'MEDIA',
                  entidade_tipo: 'BaixaLote',
                  entidade_id: baixa.id
                });
                alertasEnviados.push({ config_id: config.id, baixa_id: baixa.id });
              }
            }
            break;
          }
        }

        // Atualizar última verificação
        await rdsn.asServiceRole.entities.ConfiguracaoAlerta.update(config.id, {
          ultima_verificacao: agora.toISOString(),
          total_alertas_enviados: (config.total_alertas_enviados || 0) + alertasEnviados.filter(a => a.config_id === config.id).length
        });

      } catch (error) {
        console.error(`Erro ao processar alerta ${config.tipo_alerta}:`, error);
      }
    }

    return buildCorsResponse({
      success: true,
      verificadas: configuracoes.length,
      alertas_enviados: alertasEnviados.length,
      detalhes: alertasEnviados
    });

  } catch (error) {
    return buildCorsResponse({ error: error.message }, { status: 500 });
  }
});

async function enviarAlerta(rdsn, config, dadosNotificacao) {
  // Criar notificação in-app
  if (config.notificar_inapp) {
    await rdsn.asServiceRole.entities.Notificacao.create({
      ...dadosNotificacao,
      usuario_id: config.usuario_id
    });
  }

  // Enviar email
  if (config.notificar_email) {
    try {
      const usuario = await rdsn.asServiceRole.entities.UsuarioInterno.get(config.usuario_id);
      if (usuario?.email) {
        await rdsn.asServiceRole.integrations.Core.SendEmail({
          to: usuario.email,
          subject: `[Sistema de Reservas] ${dadosNotificacao.titulo}`,
          body: `
            <h2>${dadosNotificacao.titulo}</h2>
            <p>${dadosNotificacao.mensagem}</p>
            <p><strong>Prioridade:</strong> ${dadosNotificacao.prioridade}</p>
            <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          `
        });
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error);
    }
  }

  // Criar alerta no sistema
  await rdsn.asServiceRole.entities.Alerta.create({
    tipo: config.tipo_alerta,
    severidade: dadosNotificacao.prioridade,
    titulo: dadosNotificacao.titulo,
    descricao: dadosNotificacao.mensagem,
    entidade_tipo: dadosNotificacao.entidade_tipo,
    entidade_id: dadosNotificacao.entidade_id
  });
}