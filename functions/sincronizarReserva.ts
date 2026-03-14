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

    const { reserva_id, integracao_id } = await req.json();

    if (!reserva_id || !integracao_id) {
      return buildCorsResponse({ error: 'reserva_id e integracao_id são obrigatórios' }, { status: 400 });
    }

    // Buscar reserva
    const reservas = await rdsn.asServiceRole.entities.ReservaLote.filter({ id: reserva_id });
    if (reservas.length === 0) {
      return buildCorsResponse({ error: 'Reserva não encontrada' }, { status: 404 });
    }
    const reserva = reservas[0];

    // Buscar baixas da reserva
    const baixas = await rdsn.asServiceRole.entities.BaixaLote.filter({ reserva_id });

    // Preparar payload
    const payload = {
      codigo_lote: reserva.codigo_completo,
      cliente: reserva.cliente,
      modelo: reserva.modelo,
      quantidade_reservada: reserva.quantidade,
      quantidade_produzida: reserva.quantidade_baixada,
      status: reserva.status,
      data_reserva: reserva.created_date,
      numero_inicial: reserva.numero_inicial,
      numero_final: reserva.numero_final,
      mes_producao: reserva.mes_producao,
      baixas: baixas.map(b => ({
        quantidade: b.quantidade,
        tipo: b.tipo,
        data: b.created_date,
        operador: b.operador
      }))
    };

    // Enviar webhook
    const resultado = await rdsn.asServiceRole.functions.invoke('enviarWebhook', {
      integracao_id,
      evento: 'SINCRONIZACAO_MANUAL',
      payload: JSON.stringify(payload)
    });

    return buildCorsResponse({ 
      success: true, 
      message: 'Reserva sincronizada com sucesso',
      payload 
    });

  } catch (error) {
    return buildCorsResponse({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});