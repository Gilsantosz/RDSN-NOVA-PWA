import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);
    const { letra_produto, ano, numero_inicial, numero_final, reserva_id_ignorar, setor_id } = await req.json();

    // Buscar todas as reservas ativas para esta letra, ano E setor
    // Excluir também reservas LIBERADAS pois elas já foram liberadas para reutilização
    const reservas = await rdsn.asServiceRole.entities.ReservaLote.filter({
      letra_produto,
      ano,
      setor_id,
      status: { $nin: ['CANCELADO', 'LIBERADO'] }
    });

    const conflitos = [];

    // Verificar sobreposição com reservas
    for (const reserva of reservas) {
      if (reserva_id_ignorar && reserva.id === reserva_id_ignorar) continue;

      const sobrepoe = !(numero_final < reserva.numero_inicial || numero_inicial > reserva.numero_final);
      
      if (sobrepoe) {
        conflitos.push({
          tipo: 'RESERVA',
          id: reserva.id,
          codigo: reserva.codigo_completo,
          cliente: reserva.cliente,
          intervalo: `${reserva.numero_inicial} - ${reserva.numero_final}`,
          status: reserva.status
        });
      }
    }

    // NÃO verificar conflitos com numerações livres - elas são espaços DISPONÍVEIS para reutilização!

    return buildCorsResponse({
      valido: conflitos.length === 0,
      conflitos,
      intervalo_solicitado: `${numero_inicial} - ${numero_final}`
    });

  } catch (error) {
    return buildCorsResponse({ error: error.message }, { status: 500 });
  }
});