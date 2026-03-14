import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);
    
    const body = await req.json();
    const reservaId = body.reservaId;

    if (!reservaId) {
      return buildCorsResponse({ error: 'reservaId é obrigatório' }, { status: 400 });
    }

    // Buscar reserva com service role
    const reservas = await rdsn.asServiceRole.entities.ReservaLote.filter({ id: reservaId });
    if (reservas.length === 0) {
      return buildCorsResponse({ error: 'Reserva não encontrada' }, { status: 404 });
    }
    const reserva = reservas[0];


    // Buscar produto para pegar descrição correta
    const produtos = await rdsn.asServiceRole.entities.Produto.filter({ codigo_produto: reserva.codigo_produto });
    const produto = produtos.length > 0 ? produtos[0] : null;

    // Buscar última caixa dessa reserva
    const etiquetas = await rdsn.asServiceRole.entities.Etiqueta.filter({ reserva_id: reservaId });
    const ultimaCaixa = etiquetas.length > 0 
      ? Math.max(...etiquetas.map(e => e.numero_caixa))
      : 0;

    // Buscar última etiqueta registrada dessa reserva para continuidade de série
    const ultimaEtiqueta = etiquetas.length > 0
      ? etiquetas.sort((a, b) => b.numero_serie_final - a.numero_serie_final)[0]
      : null;

    const proximaSerieInicial = ultimaEtiqueta 
      ? ultimaEtiqueta.numero_serie_final + 1
      : reserva.numero_inicial;

    // Usar código completo como prefixo (ex: A26LM)
    const prefixo = reserva.codigo_completo || '';

    return buildCorsResponse({
      cliente: reserva.cliente,
      codigoProduto: reserva.codigo_produto,
      descricao: produto?.descricao || reserva.modelo || 'Sem descrição',
      numeroLoteInicial: reserva.numero_inicial,
      numeroLoteFinal: reserva.numero_final,
      quantidade: reserva.quantidade,
      ultimaCaixa,
      proximaCaixa: ultimaCaixa + 1,
      proximaSerieInicial,
      prefixo,
      codigoCompleto: reserva.codigo_completo
    });
  } catch (error) {
    return buildCorsResponse({ error: error.message }, { status: 500 });
  }
});