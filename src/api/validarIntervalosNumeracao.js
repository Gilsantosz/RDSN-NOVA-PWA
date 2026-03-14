import { rdsn } from './supabaseClient.js';

export async function validarIntervalosNumeracao(payload) {
  try {
    const { letra_produto, ano, numero_inicial, numero_final, reserva_id_ignorar, setor_id } = payload;

    // Buscar todas as reservas ativas para esta letra, ano E setor
    // Excluir também reservas LIBERADAS pois elas já foram liberadas para reutilização
    const todasReservas = await rdsn.asServiceRole.entities.ReservaLote.filter({
      letra_produto,
      ano,
      setor_id
    });

    // Filtro no client-side para array operators (devido limitação simples de shim)
    const reservas = todasReservas.filter(r =>
      r.status !== 'CANCELADO' && r.status !== 'LIBERADO'
    );

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

    // NOTA: A validação por ultimo_numero foi removida intencionalmente.
    // Reservas CANCELADAS ou LIBERADAS liberam seus intervalos para reutilização.
    // A proteção anti-sobreposição já vem do filtro de reservas ativas acima (linhas 16-18).


    return {
      data: {
        valido: conflitos.length === 0,
        conflitos,
        intervalo_solicitado: `${numero_inicial} - ${numero_final}`
      }
    };

  } catch (error) {
    return { data: { error: error.message }, status: 500 };
  }
}