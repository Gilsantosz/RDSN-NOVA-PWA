import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
    try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

        const rdsn = createClientFromRequest(req);
        const user = await rdsn.auth.me();

        if (!user) {
            return buildCorsResponse({ error: 'Unauthorized' }, { status: 401 });
        }

        // Buscar todas as auditorias que não têm codigo_produto
        const auditorias = await rdsn.asServiceRole.entities.Auditoria.filter({});
        const reservas = await rdsn.asServiceRole.entities.ReservaLote.filter({});

        let updated = 0;
        let notFound = 0;

        for (const auditoria of auditorias) {
            // Se já tem codigo_produto, pular
            if (auditoria.codigo_produto) continue;

            // Se for uma ação relacionada a reserva ou baixa
            if (['RESERVA_CRIADA', 'RESERVA_CANCELADA', 'RESERVA_LIBERADA', 'BAIXA_REGISTRADA'].includes(auditoria.acao)) {
                // Buscar a reserva correspondente
                const reserva = reservas.find(r => 
                    r.letra_produto === auditoria.letra_produto &&
                    r.ano === auditoria.ano &&
                    r.numero_inicial === auditoria.numero_inicial &&
                    r.numero_final === auditoria.numero_final
                );

                if (reserva && reserva.codigo_produto) {
                    // Atualizar auditoria com o codigo_produto
                    await rdsn.asServiceRole.entities.Auditoria.update(auditoria.id, {
                        codigo_produto: reserva.codigo_produto
                    });
                    updated++;
                } else {
                    notFound++;
                }
            }
        }

        return buildCorsResponse({ 
            success: true,
            message: `Sincronização concluída`,
            updated,
            notFound
        });
    } catch (error) {
        return buildCorsResponse({ error: error.message }, { status: 500 });
    }
});