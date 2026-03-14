import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);
    const user = await rdsn.auth.me();
    
    if (!user) {
      return buildCorsResponse({ error: 'Não autorizado' }, { status: 401 });
    }

    const { integracao_id, evento, dados, payload } = await req.json();

    // Buscar configuração da integração
    const integracao = await rdsn.entities.IntegracaoExterna.get(integracao_id);
    
    if (!integracao || !integracao.ativa) {
      return buildCorsResponse({ error: 'Integração não encontrada ou inativa' }, { status: 404 });
    }

    // Verificar se o evento está habilitado
    if (!integracao.eventos_habilitados?.includes(evento)) {
      return buildCorsResponse({ 
        success: false, 
        message: 'Evento não habilitado para esta integração' 
      });
    }

    const startTime = Date.now();

    // Preparar headers de autenticação
    const headers = {
      'Content-Type': 'application/json',
    };

    if (integracao.tipo_autenticacao === 'API Key') {
      headers['X-API-Key'] = integracao.chave_api;
    } else if (integracao.tipo_autenticacao === 'Bearer Token') {
      headers['Authorization'] = `Bearer ${integracao.chave_api}`;
    } else if (integracao.tipo_autenticacao === 'Basic Auth') {
      headers['Authorization'] = `Basic ${integracao.chave_api}`;
    }

    // Formatar payload conforme o formato escolhido (usar payload fornecido ou dados)
    let payloadFinal;
    if (payload) {
      // Payload já fornecido (reenvio)
      payloadFinal = payload;
      if (integracao.formato_exportacao === 'XML') {
        headers['Content-Type'] = 'application/xml';
      } else if (integracao.formato_exportacao === 'CSV') {
        headers['Content-Type'] = 'text/csv';
      }
    } else {
      // Criar novo payload
      if (integracao.formato_exportacao === 'JSON') {
        payloadFinal = JSON.stringify({
          evento,
          timestamp: new Date().toISOString(),
          dados
        });
      } else if (integracao.formato_exportacao === 'XML') {
        payloadFinal = `<?xml version="1.0" encoding="UTF-8"?>
<evento>
  <tipo>${evento}</tipo>
  <timestamp>${new Date().toISOString()}</timestamp>
  <dados>${JSON.stringify(dados)}</dados>
</evento>`;
        headers['Content-Type'] = 'application/xml';
      } else {
        const csvData = Object.entries(dados).map(([k, v]) => `${k},${v}`).join('\n');
        payloadFinal = csvData;
        headers['Content-Type'] = 'text/csv';
      }
    }

    // Enviar webhook com retry automático
    let response;
    let tentativa = 0;
    const maxTentativas = 3;
    
    while (tentativa < maxTentativas) {
      try {
        response = await fetch(integracao.url_webhook, {
          method: 'POST',
          headers,
          body: payloadFinal,
          signal: AbortSignal.timeout(30000) // 30s timeout
        });
        
        if (response.ok) break;
        
        // Se não foi OK e ainda tem tentativas, aguarda antes de tentar novamente
        if (tentativa < maxTentativas - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000 * (tentativa + 1))); // backoff exponencial
        }
      } catch (error) {
        if (tentativa === maxTentativas - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000 * (tentativa + 1)));
      }
      tentativa++;
    }

    const tempoResposta = Date.now() - startTime;
    const status = response.ok ? 'SUCESSO' : 'FALHA';

    // Registrar log
    await rdsn.entities.LogIntegracao.create({
      integracao_id,
      evento,
      payload: payloadFinal.substring(0, 5000), // Limitar tamanho
      status,
      codigo_resposta: response.status,
      mensagem_erro: response.ok ? null : `Tentativa ${tentativa}/${maxTentativas}: ${await response.text()}`,
      tempo_resposta_ms: tempoResposta
    });

    // Atualizar integração
    if (response.ok) {
      await rdsn.entities.IntegracaoExterna.update(integracao_id, {
        ultima_sincronizacao: new Date().toISOString(),
        erros_consecutivos: 0
      });
    } else {
      await rdsn.entities.IntegracaoExterna.update(integracao_id, {
        erros_consecutivos: (integracao.erros_consecutivos || 0) + 1
      });
    }

    return buildCorsResponse({
      success: response.ok,
      status: response.status,
      tempo_resposta_ms: tempoResposta,
      mensagem: response.ok ? 'Webhook enviado com sucesso' : 'Erro ao enviar webhook'
    });

  } catch (error) {
    return buildCorsResponse({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});