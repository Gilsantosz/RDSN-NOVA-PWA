import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);

    const body = await req.json();
    const { reservaId, reservaIds, pallet, caixas, isMultiple } = body;

    if ((!reservaId && !reservaIds) || !caixas || !Array.isArray(caixas)) {
      return buildCorsResponse({ error: 'Dados obrigatórios ausentes' }, { status: 400 });
    }

    // IDs das reservas envolvidas
    const ids = isMultiple ? reservaIds : [reservaId];
    
    // Buscar todas as reservas envolvidas
    const reservasCompletas = await Promise.all(
      ids.map(id => rdsn.asServiceRole.entities.ReservaLote.filter({ id }))
    );
    const reservasFlat = reservasCompletas.flat();
    
    if (reservasFlat.length === 0) {
      return buildCorsResponse({ error: 'Reserva(s) não encontrada(s)' }, { status: 404 });
    }

    // Ordenar por numero_inicial
    reservasFlat.sort((a, b) => a.numero_inicial - b.numero_inicial);
    const primeiraReserva = reservasFlat[0];

    // Extrair prefixo
    const prefixo = primeiraReserva.codigo_completo || '';

    // Buscar produto para descrição
    const produtos = await rdsn.asServiceRole.entities.Produto.filter({ 
      codigo_produto: primeiraReserva.codigo_produto 
    });
    const produto = produtos[0];

    // Registrar cada caixa do pallet
    const etiquetasCriadas = [];
    for (const caixa of caixas) {
      // Encontrar a qual reserva essa caixa pertence baseado no intervalo de números
      let reservaCorrespondente = primeiraReserva;
      for (const reserva of reservasFlat) {
        if (caixa.serieInicial >= reserva.numero_inicial && caixa.serieInicial <= reserva.numero_final) {
          reservaCorrespondente = reserva;
          break;
        }
      }

      const novaEtiqueta = await rdsn.asServiceRole.entities.Etiqueta.create({
        reserva_id: reservaCorrespondente.id,
        reserva_ids: isMultiple ? ids.join(',') : reservaCorrespondente.id,
        cliente: primeiraReserva.cliente,
        codigo_produto: primeiraReserva.codigo_produto,
        descricao: produto?.descricao || primeiraReserva.modelo,
        numero_caixa: caixa.numeroCaixa,
        numero_serie_inicial: caixa.serieInicial,
        numero_serie_final: caixa.serieFinal,
        quantidade: caixa.quantidade,
        prefixo,
        pallet_numero: pallet,
        status: 'REGISTRADA'
      });
      etiquetasCriadas.push(novaEtiqueta);
    }

    return buildCorsResponse({
      success: true,
      etiquetas: etiquetasCriadas,
      total: etiquetasCriadas.length
    });
  } catch (error) {
    return buildCorsResponse({ error: error.message }, { status: 500 });
  }
});