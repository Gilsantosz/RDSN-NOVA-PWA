import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);

    // Buscar todos os produtos ativos
    const produtos = await rdsn.asServiceRole.entities.Produto.filter({ ativo: true });
    
    // Encontrar produtos com estoque abaixo do mínimo
    const produtosBaixos = produtos.filter(p => 
      (p.estoque_minimo || 0) > 0 && (p.estoque_atual || 0) <= (p.estoque_minimo || 0)
    );

    if (produtosBaixos.length === 0) {
      return buildCorsResponse({ 
        sucesso: true, 
        mensagem: 'Nenhum produto com estoque baixo',
        alertas_enviados: 0 
      });
    }

    // Buscar configurações de alerta de estoque mínimo ativas
    const configsAlerta = await rdsn.asServiceRole.entities.ConfiguracaoAlerta.filter({ 
      tipo_alerta: 'ESTOQUE_MINIMO', 
      ativo: true 
    });

    // Buscar todos os usuários internos ativos
    const usuarios = await rdsn.asServiceRole.entities.UsuarioInterno.filter({ ativo: true });

    let totalAlertas = 0;
    let totalEmails = 0;

    for (const produto of produtosBaixos) {
      // Verificar se já existe alerta recente (últimas 24h) para este produto
      const alertasExistentes = await rdsn.asServiceRole.entities.Alerta.filter({
        tipo: 'ESTOQUE_BAIXO',
        entidade_id: produto.id,
        resolvido: false
      });

      // Se já existe alerta não resolvido, pular
      if (alertasExistentes.length > 0) continue;

      // Criar alerta no sistema
      await rdsn.asServiceRole.entities.Alerta.create({
        tipo: 'ESTOQUE_BAIXO',
        severidade: (produto.estoque_atual || 0) === 0 ? 'CRITICA' : 'ALTA',
        titulo: `Estoque Baixo: ${produto.letra_produto}${produto.sufixo}`,
        descricao: `O produto ${produto.letra_produto}${produto.sufixo} (${produto.descricao || ''}) está com estoque em ${produto.estoque_atual || 0} unidades, abaixo do mínimo de ${produto.estoque_minimo} unidades.`,
        entidade_tipo: 'Produto',
        entidade_id: produto.id,
        lido: false,
        resolvido: false
      });
      totalAlertas++;

      // Processar cada configuração de alerta
      for (const config of configsAlerta) {
        // Verificar se o produto está nos setores/produtos monitorados
        const setoresOk = !config.setores_monitorados?.length || 
          config.setores_monitorados.includes(produto.setor_id);
        const produtosOk = !config.produtos_monitorados?.length || 
          config.produtos_monitorados.includes(produto.id);

        if (!setoresOk || !produtosOk) continue;

        const usuario = usuarios.find(u => u.id === config.usuario_id);
        if (!usuario) continue;

        // Notificação in-app
        if (config.notificar_inapp) {
          await rdsn.asServiceRole.entities.Notificacao.create({
            titulo: `⚠️ Estoque Baixo: ${produto.letra_produto}${produto.sufixo}`,
            mensagem: `Estoque atual: ${produto.estoque_atual || 0} | Mínimo: ${produto.estoque_minimo}. ${produto.descricao || ''}`,
            tipo: 'ALERTA',
            prioridade: (produto.estoque_atual || 0) === 0 ? 'CRITICA' : 'ALTA',
            usuario_id: config.usuario_id,
            entidade_tipo: 'Produto',
            entidade_id: produto.id,
            lida: false,
            arquivada: false
          });
        }

        // Notificação por email
        if (config.notificar_email && usuario.email) {
          try {
            await rdsn.asServiceRole.integrations.Core.SendEmail({
              to: usuario.email,
              subject: `[Alerta] Estoque Baixo - ${produto.letra_produto}${produto.sufixo}`,
              body: `
                <h2>⚠️ Alerta de Estoque Mínimo</h2>
                <p>O produto <strong>${produto.letra_produto}${produto.sufixo}</strong> atingiu o nível mínimo de estoque.</p>
                <table style="border-collapse: collapse; margin: 16px 0;">
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Produto</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${produto.letra_produto}${produto.sufixo} - ${produto.descricao || ''}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Estoque Atual</td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: red; font-weight: bold;">${produto.estoque_atual || 0} unidades</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Estoque Mínimo</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${produto.estoque_minimo} unidades</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Categoria</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${produto.categoria || 'N/A'}</td>
                  </tr>
                </table>
                <p>Acesse o sistema para reabastecer o estoque.</p>
              `
            });
            totalEmails++;
          } catch (emailError) {
            console.error(`Erro ao enviar email para ${usuario.email}:`, emailError);
          }
        }

        // Atualizar contador na configuração
        await rdsn.asServiceRole.entities.ConfiguracaoAlerta.update(config.id, {
          ultima_verificacao: new Date().toISOString(),
          total_alertas_enviados: (config.total_alertas_enviados || 0) + 1
        });
      }
    }

    return buildCorsResponse({
      sucesso: true,
      mensagem: `Verificação concluída`,
      produtos_baixos: produtosBaixos.length,
      alertas_criados: totalAlertas,
      emails_enviados: totalEmails
    });

  } catch (error) {
    console.error('Erro na verificação de estoque:', error);
    return buildCorsResponse({ 
      sucesso: false, 
      erro: error.message 
    }, { status: 500 });
  }
});