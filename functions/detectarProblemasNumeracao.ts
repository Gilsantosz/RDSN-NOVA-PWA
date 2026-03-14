import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);
    const { letra_produto, ano } = await req.json();

    const reservas = await rdsn.asServiceRole.entities.ReservaLote.filter({
      letra_produto,
      ano,
      status: { $nin: ['CANCELADO'] }
    });

    const sequencia = await rdsn.asServiceRole.entities.SequenciaAnual.filter({
      letra_produto,
      ano
    });

    const numeracoesLivres = await rdsn.asServiceRole.entities.NumeracaoLivre.filter({
      letra_produto,
      ano
    });

    const problemas = [];

    // 1. Detectar reservas com número final menor que inicial
    reservas.forEach(r => {
      if (r.numero_final < r.numero_inicial) {
        problemas.push({
          tipo: 'INTERVALO_INVALIDO',
          severidade: 'CRITICA',
          descricao: `Reserva ${r.codigo_completo} tem número final menor que inicial`,
          detalhes: {
            reserva_id: r.id,
            codigo: r.codigo_completo,
            numero_inicial: r.numero_inicial,
            numero_final: r.numero_final,
            cliente: r.cliente
          }
        });
      }
    });

    // 2. Detectar números duplicados em reservas
    const numerosReservas = new Map();
    reservas.forEach(r => {
      for (let n = r.numero_inicial; n <= r.numero_final; n++) {
        if (!numerosReservas.has(n)) {
          numerosReservas.set(n, []);
        }
        numerosReservas.get(n).push({ id: r.id, codigo: r.codigo_completo, cliente: r.cliente });
      }
    });

    numerosReservas.forEach((ocorrencias, numero) => {
      if (ocorrencias.length > 1) {
        problemas.push({
          tipo: 'NUMERO_DUPLICADO_RESERVAS',
          severidade: 'CRITICA',
          descricao: `Número ${numero} aparece em múltiplas reservas`,
          detalhes: {
            numero,
            reservas: ocorrencias
          }
        });
      }
    });

    // 3. Detectar sobreposições entre reservas
    for (let i = 0; i < reservas.length; i++) {
      for (let j = i + 1; j < reservas.length; j++) {
        const r1 = reservas[i];
        const r2 = reservas[j];
        
        const sobrepoe = !(r1.numero_final < r2.numero_inicial || r1.numero_inicial > r2.numero_final);
        
        if (sobrepoe) {
          problemas.push({
            tipo: 'SOBREPOSICAO_RESERVAS',
            severidade: 'CRITICA',
            descricao: `Reservas ${r1.codigo_completo} e ${r2.codigo_completo} têm intervalos sobrepostos`,
            detalhes: {
              reserva1: { id: r1.id, intervalo: `${r1.numero_inicial}-${r1.numero_final}`, cliente: r1.cliente },
              reserva2: { id: r2.id, intervalo: `${r2.numero_inicial}-${r2.numero_final}`, cliente: r2.cliente }
            }
          });
        }
      }
    }

    // 4. Detectar sobreposições entre reservas e numerações livres
    reservas.forEach(r => {
      numeracoesLivres.forEach(nl => {
        const sobrepoe = !(r.numero_final < nl.numero_inicial || r.numero_inicial > nl.numero_final);
        if (sobrepoe) {
          problemas.push({
            tipo: 'SOBREPOSICAO_RESERVA_LIVRE',
            severidade: 'CRITICA',
            descricao: `Reserva ${r.codigo_completo} sobrepõe numeração livre`,
            detalhes: {
              reserva: { id: r.id, codigo: r.codigo_completo, intervalo: `${r.numero_inicial}-${r.numero_final}` },
              numeracao_livre: { id: nl.id, intervalo: `${nl.numero_inicial}-${nl.numero_final}`, motivo: nl.motivo }
            }
          });
        }
      });
    });

    // 5. Detectar números duplicados em numerações livres
    const numerosLivres = new Map();
    numeracoesLivres.forEach(nl => {
      for (let n = nl.numero_inicial; n <= nl.numero_final; n++) {
        if (!numerosLivres.has(n)) {
          numerosLivres.set(n, []);
        }
        numerosLivres.get(n).push({ id: nl.id, intervalo: `${nl.numero_inicial}-${nl.numero_final}`, motivo: nl.motivo });
      }
    });

    numerosLivres.forEach((ocorrencias, numero) => {
      if (ocorrencias.length > 1) {
        problemas.push({
          tipo: 'NUMERO_DUPLICADO_LIVRES',
          severidade: 'ALTA',
          descricao: `Número ${numero} aparece em múltiplas numerações livres`,
          detalhes: {
            numero,
            numeracoes: ocorrencias
          }
        });
      }
    });

    // 6. Detectar números órfãos (lacunas sem numeração livre registrada)
    if (sequencia.length > 0 && reservas.length > 0) {
      const seq = sequencia[0];
      const numerosUsados = [];
      
      reservas.forEach(r => {
        for (let n = r.numero_inicial; n <= r.numero_final; n++) {
          numerosUsados.push(n);
        }
      });

      numeracoesLivres.forEach(nl => {
        for (let n = nl.numero_inicial; n <= nl.numero_final; n++) {
          numerosUsados.push(n);
        }
      });

      numerosUsados.sort((a, b) => a - b);

      // Encontrar lacunas
      const lacunas = [];
      for (let i = 1; i < numerosUsados.length; i++) {
        const diff = numerosUsados[i] - numerosUsados[i - 1];
        if (diff > 1) {
          lacunas.push({
            inicio: numerosUsados[i - 1] + 1,
            fim: numerosUsados[i] - 1,
            quantidade: diff - 1
          });
        }
      }

      // Verificar se há números antes do primeiro e depois do último
      if (numerosUsados.length > 0) {
        const primeiro = Math.min(...numerosUsados);
        const ultimo = Math.max(...numerosUsados);

        if (primeiro > 1 && seq.ultimo_numero >= primeiro - 1) {
          lacunas.push({
            inicio: 1,
            fim: primeiro - 1,
            quantidade: primeiro - 1
          });
        }

        if (ultimo < seq.ultimo_numero) {
          lacunas.push({
            inicio: ultimo + 1,
            fim: seq.ultimo_numero,
            quantidade: seq.ultimo_numero - ultimo
          });
        }
      }

      if (lacunas.length > 0) {
        problemas.push({
          tipo: 'NUMEROS_ORFAOS',
          severidade: 'MEDIA',
          descricao: `${lacunas.length} lacunas de numeração não registradas como livres`,
          detalhes: { lacunas }
        });
      }
    }

    // 7. Detectar inconsistências entre quantidade e intervalo
    reservas.forEach(r => {
      const quantidadeCalculada = r.numero_final - r.numero_inicial + 1;
      if (quantidadeCalculada !== r.quantidade) {
        problemas.push({
          tipo: 'QUANTIDADE_INCONSISTENTE',
          severidade: 'ALTA',
          descricao: `Reserva ${r.codigo_completo} tem quantidade inconsistente`,
          detalhes: {
            reserva_id: r.id,
            codigo: r.codigo_completo,
            quantidade_registrada: r.quantidade,
            quantidade_calculada: quantidadeCalculada,
            intervalo: `${r.numero_inicial}-${r.numero_final}`
          }
        });
      }
    });

    // 8. Detectar baixas fora do intervalo da reserva
    const baixas = await rdsn.asServiceRole.entities.BaixaLote.list('-created_date', 1000);
    
    for (const baixa of baixas) {
      const reserva = reservas.find(r => r.id === baixa.reserva_id);
      if (reserva) {
        const foraDaReserva = 
          baixa.numero_inicial < reserva.numero_inicial || 
          baixa.numero_final > reserva.numero_final;
        
        if (foraDaReserva) {
          problemas.push({
            tipo: 'BAIXA_FORA_INTERVALO',
            severidade: 'CRITICA',
            descricao: `Baixa com números fora do intervalo da reserva ${reserva.codigo_completo}`,
            detalhes: {
              baixa_id: baixa.id,
              baixa_intervalo: `${baixa.numero_inicial}-${baixa.numero_final}`,
              reserva_intervalo: `${reserva.numero_inicial}-${reserva.numero_final}`
            }
          });
        }
      }
    }

    return buildCorsResponse({
      letra_produto,
      ano,
      problemas,
      total_problemas: problemas.length,
      severidade_maxima: problemas.length > 0 
        ? problemas.some(p => p.severidade === 'CRITICA') ? 'CRITICA' 
        : problemas.some(p => p.severidade === 'ALTA') ? 'ALTA' : 'MEDIA'
        : null
    });

  } catch (error) {
    return buildCorsResponse({ error: error.message }, { status: 500 });
  }
});