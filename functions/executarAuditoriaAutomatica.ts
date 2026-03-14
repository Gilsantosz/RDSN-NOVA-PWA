import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

  const startTime = Date.now();
  
  try {
    const rdsn = createClientFromRequest(req);
    
    const { 
      letra_produto, 
      ano, 
      setor_id, 
      regras_ids = [], 
      tipo_execucao = 'MANUAL',
      executado_por = 'Sistema'
    } = await req.json();

    // Buscar regras a aplicar
    let regras = [];
    if (regras_ids.length > 0) {
      const todasRegras = await rdsn.asServiceRole.entities.RegraAuditoria.list();
      regras = todasRegras.filter(r => regras_ids.includes(r.id) && r.ativa);
    } else {
      // Buscar todas as regras ativas
      regras = await rdsn.asServiceRole.entities.RegraAuditoria.filter({ ativa: true });
    }

    // Filtrar regras pelo escopo
    regras = regras.filter(regra => {
      const escopo = regra.escopo || {};
      
      if (letra_produto && escopo.letras_produto?.length > 0) {
        if (!escopo.letras_produto.includes(letra_produto)) return false;
      }
      
      if (ano && escopo.anos?.length > 0) {
        if (!escopo.anos.includes(ano)) return false;
      }
      
      if (setor_id && escopo.setores?.length > 0) {
        if (!escopo.setores.includes(setor_id)) return false;
      }
      
      return true;
    });

    // Buscar dados para auditoria
    const queryReservas = { status: { $ne: 'CANCELADO' } };
    if (letra_produto) queryReservas.letra_produto = letra_produto;
    if (ano) queryReservas.ano = ano;
    if (setor_id) queryReservas.setor_id = setor_id;

    const reservas = await rdsn.asServiceRole.entities.ReservaLote.filter(queryReservas);
    
    const queryLivres = {};
    if (letra_produto) queryLivres.letra_produto = letra_produto;
    if (ano) queryLivres.ano = ano;
    if (setor_id) queryLivres.setor_id = setor_id;
    
    const numeracoesLivres = await rdsn.asServiceRole.entities.NumeracaoLivre.filter(queryLivres);

    const problemas = [];

    // Aplicar cada regra
    for (const regra of regras) {
      switch (regra.tipo_verificacao) {
        case 'SOBREPOSICAO':
          const sobreposicoes = detectarSobreposicao(reservas);
          sobreposicoes.forEach(s => problemas.push({
            tipo: 'SOBREPOSICAO',
            severidade: regra.severidade,
            descricao: `Sobreposição detectada entre reservas`,
            detalhes: s,
            regra_id: regra.id,
            regra_nome: regra.nome
          }));
          break;

        case 'LACUNAS':
          const lacunas = detectarLacunas(reservas, numeracoesLivres);
          lacunas.forEach(l => problemas.push({
            tipo: 'LACUNAS',
            severidade: regra.severidade,
            descricao: `Lacuna na numeração detectada`,
            detalhes: l,
            regra_id: regra.id,
            regra_nome: regra.nome
          }));
          break;

        case 'DUPLICIDADE':
          const duplicidades = detectarDuplicidade(reservas);
          duplicidades.forEach(d => problemas.push({
            tipo: 'DUPLICIDADE',
            severidade: regra.severidade,
            descricao: `Números duplicados detectados`,
            detalhes: d,
            regra_id: regra.id,
            regra_nome: regra.nome
          }));
          break;

        case 'SEQUENCIA_INVALIDA':
          const invalidas = detectarSequenciaInvalida(reservas);
          invalidas.forEach(i => problemas.push({
            tipo: 'SEQUENCIA_INVALIDA',
            severidade: regra.severidade,
            descricao: `Sequência inválida detectada`,
            detalhes: i,
            regra_id: regra.id,
            regra_nome: regra.nome
          }));
          break;

        case 'NUMERACAO_LIVRE_INVALIDA':
          const livresInvalidas = detectarNumeracaoLivreInvalida(numeracoesLivres, reservas);
          livresInvalidas.forEach(li => problemas.push({
            tipo: 'NUMERACAO_LIVRE_INVALIDA',
            severidade: regra.severidade,
            descricao: `Numeração livre inválida`,
            detalhes: li,
            regra_id: regra.id,
            regra_nome: regra.nome
          }));
          break;
      }
    }

    const duracao = Date.now() - startTime;

    // Salvar histórico
    const historico = await rdsn.asServiceRole.entities.HistoricoAuditoria.create({
      tipo_execucao,
      escopo: { letra_produto, ano, setor_id },
      total_problemas: problemas.length,
      problemas,
      regras_aplicadas: regras.map(r => r.id),
      duracao_ms: duracao,
      status: 'SUCESSO',
      executado_por
    });

    // Criar alertas se necessário
    if (problemas.length > 0) {
      const problemasCriticos = problemas.filter(p => p.severidade === 'CRITICA' || p.severidade === 'ALTA');
      
      if (problemasCriticos.length > 0) {
        await rdsn.asServiceRole.entities.Alerta.create({
          tipo: 'GARGALO',
          severidade: 'ALTA',
          titulo: `Auditoria: ${problemasCriticos.length} problema(s) crítico(s)`,
          descricao: `Auditoria de numeração detectou ${problemasCriticos.length} problema(s) crítico(s). Verifique o histórico de auditoria.`,
          entidade_tipo: 'HistoricoAuditoria',
          entidade_id: historico.id,
          dados_extras: JSON.stringify({ 
            letra_produto, 
            ano, 
            total_problemas: problemas.length 
          })
        });
      }
    }

    return buildCorsResponse({
      sucesso: true,
      total_problemas: problemas.length,
      problemas,
      regras_aplicadas: regras.length,
      duracao_ms: duracao,
      historico_id: historico.id
    });

  } catch (error) {
    console.error('Erro na auditoria automática:', error);
    return buildCorsResponse({ 
      sucesso: false, 
      error: error.message 
    }, { status: 500 });
  }
});

function detectarSobreposicao(reservas) {
  const sobreposicoes = [];
  
  for (let i = 0; i < reservas.length; i++) {
    for (let j = i + 1; j < reservas.length; j++) {
      const r1 = reservas[i];
      const r2 = reservas[j];
      
      if (r1.letra_produto !== r2.letra_produto || r1.ano !== r2.ano) continue;
      
      const inicio1 = r1.numero_inicial;
      const fim1 = r1.numero_final;
      const inicio2 = r2.numero_inicial;
      const fim2 = r2.numero_final;
      
      if ((inicio1 <= fim2 && fim1 >= inicio2)) {
        sobreposicoes.push({
          reserva1: { id: r1.id, codigo: r1.codigo_completo, inicio: inicio1, fim: fim1 },
          reserva2: { id: r2.id, codigo: r2.codigo_completo, inicio: inicio2, fim: fim2 }
        });
      }
    }
  }
  
  return sobreposicoes;
}

function detectarLacunas(reservas, numeracoesLivres) {
  const lacunas = [];
  const gruposPorLetraAno = {};
  
  reservas.forEach(r => {
    const key = `${r.letra_produto}-${r.ano}`;
    if (!gruposPorLetraAno[key]) gruposPorLetraAno[key] = [];
    gruposPorLetraAno[key].push(r);
  });
  
  Object.entries(gruposPorLetraAno).forEach(([key, grupo]) => {
    const ordenadas = grupo.sort((a, b) => a.numero_inicial - b.numero_inicial);
    
    for (let i = 0; i < ordenadas.length - 1; i++) {
      const atual = ordenadas[i];
      const proxima = ordenadas[i + 1];
      
      if (proxima.numero_inicial > atual.numero_final + 1) {
        const lacuna = {
          de: atual.numero_final + 1,
          ate: proxima.numero_inicial - 1,
          quantidade: proxima.numero_inicial - atual.numero_final - 1
        };
        
        const cobertaPorLivre = numeracoesLivres.some(nl => 
          nl.letra_produto === atual.letra_produto &&
          nl.ano === atual.ano &&
          nl.numero_inicial <= lacuna.de &&
          nl.numero_final >= lacuna.ate
        );
        
        if (!cobertaPorLivre) {
          lacunas.push({
            ...lacuna,
            letra_produto: atual.letra_produto,
            ano: atual.ano,
            entre_reservas: [atual.codigo_completo, proxima.codigo_completo]
          });
        }
      }
    }
  });
  
  return lacunas;
}

function detectarDuplicidade(reservas) {
  const duplicidades = [];
  const numerosPorLetraAno = {};
  
  reservas.forEach(r => {
    const key = `${r.letra_produto}-${r.ano}`;
    if (!numerosPorLetraAno[key]) numerosPorLetraAno[key] = {};
    
    for (let num = r.numero_inicial; num <= r.numero_final; num++) {
      if (numerosPorLetraAno[key][num]) {
        duplicidades.push({
          numero: num,
          letra_produto: r.letra_produto,
          ano: r.ano,
          reservas: [numerosPorLetraAno[key][num], r.codigo_completo]
        });
      } else {
        numerosPorLetraAno[key][num] = r.codigo_completo;
      }
    }
  });
  
  return duplicidades;
}

function detectarSequenciaInvalida(reservas) {
  const invalidas = [];
  
  reservas.forEach(r => {
    if (r.numero_inicial > r.numero_final) {
      invalidas.push({
        reserva_id: r.id,
        codigo: r.codigo_completo,
        numero_inicial: r.numero_inicial,
        numero_final: r.numero_final,
        motivo: 'Número inicial maior que final'
      });
    }
    
    if (r.numero_inicial < 0 || r.numero_final < 0) {
      invalidas.push({
        reserva_id: r.id,
        codigo: r.codigo_completo,
        numero_inicial: r.numero_inicial,
        numero_final: r.numero_final,
        motivo: 'Números negativos'
      });
    }
  });
  
  return invalidas;
}

function detectarNumeracaoLivreInvalida(numeracoesLivres, reservas) {
  const invalidas = [];
  
  numeracoesLivres.forEach(nl => {
    const conflitos = reservas.filter(r => 
      r.letra_produto === nl.letra_produto &&
      r.ano === nl.ano &&
      r.numero_inicial <= nl.numero_final &&
      r.numero_final >= nl.numero_inicial
    );
    
    if (conflitos.length > 0) {
      invalidas.push({
        numeracao_livre_id: nl.id,
        intervalo: `${nl.numero_inicial}-${nl.numero_final}`,
        conflitos: conflitos.map(c => c.codigo_completo)
      });
    }
  });
  
  return invalidas;
}