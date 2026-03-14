import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
    try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

        const rdsn = createClientFromRequest(req);
        const user = await rdsn.auth.me();

        if (!user || user.role !== 'admin') {
            return buildCorsResponse({ error: 'Unauthorized' }, { status: 403 });
        }

        const agora = new Date();
        const seteDiasAtras = new Date(agora - 7 * 24 * 60 * 60 * 1000);

        // Buscar reservas em produção
        const reservas = await rdsn.asServiceRole.entities.ReservaLote.filter({
            status: 'EM_PRODUCAO'
        });

        // Buscar movimentações recentes
        const movimentacoes = await rdsn.asServiceRole.entities.MovimentacaoEstoque.list('-created_date', 500);

        const alertasCriados = [];

        // 1. Verificar lotes com progresso baixo
        for (const reserva of reservas) {
            const criadaEm = new Date(reserva.created_date);
            const diasEmProducao = (agora - criadaEm) / (1000 * 60 * 60 * 24);

            if (diasEmProducao > 7) {
                const progresso = ((reserva.quantidade_baixada || 0) / reserva.quantidade) * 100;

                if (progresso < 30) {
                    // Verificar se já existe um alerta similar recente
                    const alertasExistentes = await rdsn.asServiceRole.entities.Alerta.filter({
                        entidade_id: reserva.id,
                        tipo: 'PROGRESSO_BAIXO',
                        resolvido: false
                    });

                    if (alertasExistentes.length === 0) {
                        await rdsn.asServiceRole.entities.Alerta.create({
                            tipo: 'PROGRESSO_BAIXO',
                            severidade: progresso < 15 ? 'ALTA' : 'MEDIA',
                            titulo: `Lote ${reserva.codigo_completo} com baixo progresso`,
                            descricao: `O lote está em produção há ${Math.floor(diasEmProducao)} dias com apenas ${progresso.toFixed(1)}% de progresso (${reserva.quantidade_baixada || 0} de ${reserva.quantidade} unidades).`,
                            entidade_tipo: 'ReservaLote',
                            entidade_id: reserva.id,
                            dados_extras: JSON.stringify({
                                codigo: reserva.codigo_completo,
                                cliente: reserva.cliente,
                                progresso: progresso
                            })
                        });
                        alertasCriados.push('PROGRESSO_BAIXO');
                    }
                }
            }
        }

        // 2. Verificar gargalos de produção
        const producaoPorCelula = movimentacoes
            .filter(m => m.tipo === 'PRODUCAO' && m.celula && new Date(m.created_date) >= seteDiasAtras)
            .reduce((acc, m) => {
                acc[m.celula] = (acc[m.celula] || 0) + (m.quantidade || 0);
                return acc;
            }, {});

        const celulas = Object.entries(producaoPorCelula);
        if (celulas.length > 0) {
            const mediaProducao = celulas.reduce((sum, [, qtd]) => sum + qtd, 0) / celulas.length;

            for (const [celula, quantidade] of celulas) {
                if (quantidade < mediaProducao * 0.5) { // Menos de 50% da média
                    const alertasExistentes = await rdsn.asServiceRole.entities.Alerta.filter({
                        tipo: 'GARGALO',
                        resolvido: false
                    });

                    const jaExiste = alertasExistentes.some(a => 
                        a.dados_extras && a.dados_extras.includes(celula)
                    );

                    if (!jaExiste) {
                        await rdsn.asServiceRole.entities.Alerta.create({
                            tipo: 'GARGALO',
                            severidade: 'ALTA',
                            titulo: `Gargalo detectado na ${celula}`,
                            descricao: `A célula produziu ${quantidade.toLocaleString()} unidades na última semana, ${((1 - quantidade/mediaProducao) * 100).toFixed(0)}% abaixo da média de ${mediaProducao.toFixed(0)} unidades.`,
                            entidade_tipo: 'Celula',
                            dados_extras: JSON.stringify({
                                celula: celula,
                                quantidade: quantidade,
                                media: mediaProducao
                            })
                        });
                        alertasCriados.push('GARGALO');
                    }
                }
            }
        }

        // 3. Verificar produtos com estoque baixo
        const produtos = await rdsn.asServiceRole.entities.Produto.filter({
            ativo: true
        });

        for (const produto of produtos) {
            if (produto.estoque_minimo > 0 && produto.estoque_atual < produto.estoque_minimo) {
                const alertasExistentes = await rdsn.asServiceRole.entities.Alerta.filter({
                    entidade_id: produto.id,
                    tipo: 'ESTOQUE_BAIXO',
                    resolvido: false
                });

                if (alertasExistentes.length === 0) {
                    await rdsn.asServiceRole.entities.Alerta.create({
                        tipo: 'ESTOQUE_BAIXO',
                        severidade: produto.estoque_atual === 0 ? 'CRITICA' : 'MEDIA',
                        titulo: `Estoque baixo: ${produto.letra_produto}${produto.sufixo}`,
                        descricao: `Estoque atual de ${produto.estoque_atual} unidades está abaixo do mínimo de ${produto.estoque_minimo} unidades.`,
                        entidade_tipo: 'Produto',
                        entidade_id: produto.id,
                        dados_extras: JSON.stringify({
                            letra: produto.letra_produto,
                            sufixo: produto.sufixo,
                            estoque_atual: produto.estoque_atual,
                            estoque_minimo: produto.estoque_minimo
                        })
                    });
                    alertasCriados.push('ESTOQUE_BAIXO');
                }
            }
        }

        return buildCorsResponse({
            success: true,
            message: `Verificação concluída`,
            alertas_criados: alertasCriados.length,
            tipos: [...new Set(alertasCriados)]
        });
    } catch (error) {
        return buildCorsResponse({ error: error.message }, { status: 500 });
    }
});