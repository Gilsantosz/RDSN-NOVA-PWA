import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);

    // Buscar todas as configurações de KPI ativas
    const kpisAtivos = await rdsn.asServiceRole.entities.ConfiguracaoKPI.filter({
      ativo: true,
      notificar_quando_fora_meta: true
    });

    const alertasGerados = [];

    for (const kpi of kpisAtivos) {
      // Calcular valor atual do KPI
      const valorAtual = await calcularValorKPI(rdsn, kpi);

      // Verificar se está fora da meta
      const foraDaMeta = (
        (kpi.limite_inferior > 0 && valorAtual < kpi.limite_inferior) ||
        (kpi.limite_superior > 0 && valorAtual > kpi.limite_superior)
      );

      if (foraDaMeta) {
        // Criar notificação para usuários configurados
        const usuarios = kpi.usuarios_notificar || [];
        
        for (const usuarioId of usuarios) {
          await rdsn.asServiceRole.entities.Notificacao.create({
            titulo: `KPI fora da meta: ${kpi.nome}`,
            mensagem: `O KPI "${kpi.nome}" está em ${valorAtual}, fora do intervalo esperado (${kpi.limite_inferior} - ${kpi.limite_superior})`,
            tipo: 'ALERTA',
            prioridade: 'ALTA',
            usuario_id: usuarioId,
            entidade_tipo: 'ConfiguracaoKPI',
            entidade_id: kpi.id
          });
        }

        // Criar alerta geral
        await rdsn.asServiceRole.entities.Alerta.create({
          tipo: 'GARGALO',
          severidade: 'ALTA',
          titulo: `KPI "${kpi.nome}" fora da meta`,
          descricao: `Valor atual: ${valorAtual}. Limite esperado: ${kpi.limite_inferior} - ${kpi.limite_superior}`,
          entidade_tipo: 'ConfiguracaoKPI',
          entidade_id: kpi.id,
          dados_extras: JSON.stringify({
            valor_atual: valorAtual,
            meta: kpi.meta_valor,
            limite_inferior: kpi.limite_inferior,
            limite_superior: kpi.limite_superior
          })
        });

        alertasGerados.push({
          kpi: kpi.nome,
          valor_atual: valorAtual,
          status: 'alerta_criado'
        });
      }
    }

    return buildCorsResponse({
      success: true,
      kpis_verificados: kpisAtivos.length,
      alertas_gerados: alertasGerados.length,
      detalhes: alertasGerados
    });

  } catch (error) {
    console.error('Erro ao verificar KPIs:', error);
    return buildCorsResponse({ error: error.message }, { status: 500 });
  }
});

async function calcularValorKPI(rdsn, kpi) {
  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  switch (kpi.tipo) {
    case 'producao_diaria': {
      const baixasHoje = await rdsn.asServiceRole.entities.BaixaLote.filter({
        created_date: { $gte: inicioHoje.toISOString() }
      });
      return baixasHoje.reduce((sum, b) => sum + (b.quantidade || 0), 0);
    }

    case 'reservas_ativas': {
      const reservas = await rdsn.asServiceRole.entities.ReservaLote.filter({
        status: { $in: ['RESERVADO', 'EM_PRODUCAO'] },
        setor_id: kpi.setor_id
      });
      return reservas.length;
    }

    case 'estoque_disponivel': {
      const produtos = await rdsn.asServiceRole.entities.Produto.filter({
        setor_id: kpi.setor_id
      });
      return produtos.reduce((sum, p) => sum + (p.estoque_atual || 0), 0);
    }

    case 'alertas_pendentes': {
      const alertas = await rdsn.asServiceRole.entities.Alerta.filter({
        lido: false,
        resolvido: false
      });
      return alertas.length;
    }

    case 'taxa_eficiencia': {
      const reservas = await rdsn.asServiceRole.entities.ReservaLote.filter({
        setor_id: kpi.setor_id,
        status: { $in: ['EM_PRODUCAO', 'PRODUZIDO'] }
      });
      
      if (reservas.length === 0) return 0;
      
      const totalPlanejado = reservas.reduce((sum, r) => sum + (r.quantidade || 0), 0);
      const totalProduzido = reservas.reduce((sum, r) => sum + (r.quantidade_baixada || 0), 0);
      
      return totalPlanejado > 0 ? ((totalProduzido / totalPlanejado) * 100).toFixed(2) : 0;
    }

    default:
      return 0;
  }
}