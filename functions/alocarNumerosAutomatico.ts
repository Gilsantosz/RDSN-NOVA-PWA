import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);
    const { letra_produto, ano, quantidade, setor_id, criterio } = await req.json();

    if (!letra_produto || !ano || !quantidade || !setor_id) {
      return buildCorsResponse({ 
        error: 'Parâmetros obrigatórios: letra_produto, ano, quantidade, setor_id' 
      }, { status: 400 });
    }

    // Buscar sequência atual
    let sequencias = [];
    try {
      const todas = await rdsn.asServiceRole.entities.SequenciaAnual.list();
      sequencias = todas.filter(s =>
        s.letra_produto === letra_produto &&
        s.ano === ano &&
        s.setor_id === setor_id
      );
    } catch (err) {
      console.log('Erro ao buscar sequências', err);
    }

    // Se não existir, criar sequência
    let sequencia;
    if (sequencias.length === 0) {
      try {
        sequencia = await rdsn.asServiceRole.entities.SequenciaAnual.create({
          letra_produto,
          ano,
          setor_id,
          ultimo_numero: 0,
          encerrado: false
        });
      } catch (err) {
        return buildCorsResponse({ 
          error: 'Erro ao criar sequência: ' + err.message
        }, { status: 500 });
      }
    } else {
      sequencia = sequencias[0];
    }

    if (sequencia.encerrado) {
      return buildCorsResponse({ 
        error: 'Ano encerrado. Não é possível criar novas reservas' 
      }, { status: 400 });
    }

    // Buscar todas as reservas existentes do mesmo setor
    const todasReservas = await rdsn.asServiceRole.entities.ReservaLote.filter({ 
      letra_produto, 
      ano,
      setor_id
    });

    const reservas = todasReservas.filter(r => 
      ['RESERVADO', 'EM_PRODUCAO', 'BAIXADO', 'PRODUZIDO'].includes(r.status)
    );

    // Buscar numerações livres do mesmo setor
    let numeracoesLivres = [];
    try {
      const todasNumLivres = await rdsn.asServiceRole.entities.NumeracaoLivre.list();
      numeracoesLivres = todasNumLivres.filter(n =>
        n.letra_produto === letra_produto &&
        n.ano === ano &&
        n.setor_id === setor_id &&
        n.disponivel === true
      );
    } catch (err) {
      console.log('NumeracaoLivre não possui registros ou erro ao buscar');
    }

    // Buscar bloqueios ativos
    const agora = new Date().toISOString();
    let bloqueiosAtivos = [];
    try {
      const todosBloqueios = await rdsn.asServiceRole.entities.BloqueioIntervalo.list();
      bloqueiosAtivos = todosBloqueios.filter(b =>
        b.letra_produto === letra_produto &&
        b.ano === ano &&
        b.setor_id === setor_id &&
        (!b.expira_em || new Date(b.expira_em) > new Date(agora))
      );
    } catch (err) {
      console.log('BloqueioIntervalo não possui registros ou erro ao buscar');
    }

    // Construir mapa de intervalos ocupados
    const intervalosOcupados = reservas.map(r => ({
      inicio: r.numero_inicial,
      fim: r.numero_final
    }));

    // Adicionar intervalos das numerações livres (invertido - elas são espaços livres)
    const intervalosLivresExistentes = numeracoesLivres.map(n => ({
      inicio: n.numero_inicial,
      fim: n.numero_final,
      quantidade: n.quantidade,
      isLivre: true
    }));

    // Função para verificar se um intervalo está livre
    const verificarIntervaloLivre = (inicio, fim) => {
      // Verificar sobreposição com reservas
      for (const ocupado of intervalosOcupados) {
        if (!(fim < ocupado.inicio || inicio > ocupado.fim)) {
          return false;
        }
      }
      
      // Verificar sobreposição com bloqueios
      for (const bloqueio of bloqueiosAtivos) {
        if (!(fim < bloqueio.numero_inicial || inicio > bloqueio.numero_final)) {
          return false;
        }
      }
      return true;
    };

    // Calcular proximidade com próximas reservas (padrão de uso)
    const calcularProximidadeReservas = (inicio, fim) => {
      const proximaReserva = reservas
        .map(r => r.numero_inicial)
        .filter(n => n > fim)
        .sort()[0];
      
      return proximaReserva ? proximaReserva - fim - 1 : Infinity;
    };

    // Calcular score de qualidade de um intervalo
    const calcularScoreQualidade = (intervalo) => {
      let score = 0;

      // Preferir reutilizar numerações livres (reduz fragmentação) - ALTA PRIORIDADE
      if (intervalo.origem === 'numeracao_livre') score += 100;
      if (intervalo.origem === 'numeracao_livre_combinada') score += 80; // Favorece reutilização parcial

      // Preferir continuação sequencial (menos disrupção)
      if (intervalo.origem === 'sequencia_nova') score += 40;

      // Penalizar grandes lacunas que deixam espaço desperdiçado (EXCETO para numerações livres parciais)
      if (intervalo.origem !== 'numeracao_livre_parcial' && intervalo.quantidadeDisponivel > intervalo.quantidade) {
        const desperdicio = intervalo.quantidadeDisponivel - intervalo.quantidade;
        score -= Math.min(20, desperdicio / 100);
      }

      // Preferir intervalos com proximidade moderada de futuras reservas
      const proximidade = calcularProximidadeReservas(intervalo.inicio, intervalo.fim);
      if (proximidade > 100 && proximidade < 1000) {
        score += 15; // Bom espaçamento
      } else if (proximidade < 100 && proximidade > 0) {
        score -= 10; // Muito próximo
      }

      return score;
    };

    // Encontrar intervalos disponíveis
    const intervalosDisponiveis = [];

    // 1. Verificar numerações livres existentes e criar intervalos combinados
    for (const livre of intervalosLivresExistentes) {
      // Se a numeração livre é suficiente para a quantidade completa
      if (livre.quantidade >= quantidade && verificarIntervaloLivre(livre.inicio, livre.fim)) {
        const intervalo = {
          inicio: livre.inicio,
          fim: livre.inicio + quantidade - 1,
          quantidade: quantidade,
          origem: 'numeracao_livre',
          quantidadeDisponivel: livre.quantidade,
          motivo: 'Reutiliza espaço liberado anteriormente'
        };
        intervalo.score = calcularScoreQualidade(intervalo);
        intervalosDisponiveis.push(intervalo);
      }
      // Se a numeração livre é parcial, criar intervalo COMBINADO começando na numeração livre
      else if (livre.quantidade > 0 && livre.quantidade < quantidade) {
        const inicioLivre = livre.inicio;
        const fimLivre = livre.fim;
        const quantidadeLivre = livre.quantidade;
        const quantidadeFaltante = quantidade - quantidadeLivre;
        const fimTotal = inicioLivre + quantidade - 1;
        
        // Verificar se o intervalo combinado (livre + continuação) está disponível
        if (verificarIntervaloLivre(inicioLivre, fimTotal)) {
          const intervalo = {
            inicio: inicioLivre,
            fim: fimTotal,
            quantidade: quantidade,
            origem: 'numeracao_livre_combinada',
            quantidadeDisponivel: quantidade,
            quantidadeLivre: quantidadeLivre,
            quantidadeSequencial: quantidadeFaltante,
            motivo: `Combina ${quantidadeLivre} números livres (${inicioLivre}-${fimLivre}) + ${quantidadeFaltante} sequenciais (${fimLivre + 1}-${fimTotal})`
          };
          intervalo.score = calcularScoreQualidade(intervalo);
          intervalosDisponiveis.push(intervalo);
        }
      }
    }

    // 2. Procurar gaps ANTES da primeira reserva e entre reservas existentes
    const todosNumeros = [...intervalosOcupados]
      .sort((a, b) => a.inicio - b.inicio);

    // PRIMEIRO: Verificar espaço ANTES da primeira reserva (do número 1 até primeira reserva)
    if (todosNumeros.length > 0) {
      const primeiraReserva = todosNumeros[0];
      const espacoInicial = primeiraReserva.inicio - 1;
      
      if (espacoInicial >= quantidade) {
        const intervalo = {
          inicio: 1,
          fim: quantidade,
          quantidade: quantidade,
          origem: 'inicio_sequencia',
          quantidadeDisponivel: espacoInicial,
          motivo: `Usa espaço disponível no início (1 a ${espacoInicial})`
        };
        intervalo.score = calcularScoreQualidade(intervalo) + 50; // Bonus por ser início
        intervalosDisponiveis.push(intervalo);
      }
    }

    // SEGUNDO: Procurar gaps ENTRE reservas existentes
    for (let i = 0; i < todosNumeros.length - 1; i++) {
      const fimAtual = todosNumeros[i].fim;
      const inicioProximo = todosNumeros[i + 1].inicio;
      const gap = inicioProximo - fimAtual - 1;

      if (gap >= quantidade) {
        const inicioGap = fimAtual + 1;
        const intervalo = {
          inicio: inicioGap,
          fim: inicioGap + quantidade - 1,
          quantidade: quantidade,
          origem: 'gap_entre_reservas',
          quantidadeDisponivel: gap,
          motivo: `Preenche lacuna de ${gap} números entre reservas`
        };
        intervalo.score = calcularScoreQualidade(intervalo);
        intervalosDisponiveis.push(intervalo);
      }
    }

    // 3. Verificar continuação da sequência (procurar primeiro bloco livre após último número usado)
    let tentativaNumero = (sequencia.ultimo_numero || 0) + 1;
    let encontradoSequencia = false;
    let maxTentativas = 1000; // Evitar loop infinito em caso de erro bizarro

    while (!encontradoSequencia && maxTentativas > 0) {
      if (verificarIntervaloLivre(tentativaNumero, tentativaNumero + quantidade - 1)) {
        const intervalo = {
          inicio: tentativaNumero,
          fim: tentativaNumero + quantidade - 1,
          quantidade: quantidade,
          origem: 'sequencia_nova',
          quantidadeDisponivel: quantidade,
          motivo: tentativaNumero === (sequencia.ultimo_numero || 0) + 1 
            ? 'Continuação sequencial imediata' 
            : `Continuação sequencial (pulando intervalos ocupados até ${tentativaNumero})`
        };
        intervalo.score = calcularScoreQualidade(intervalo);
        intervalosDisponiveis.push(intervalo);
        encontradoSequencia = true;
      } else {
        // Pular para o final da reserva que está bloqueando ou incrementar
        const bloqueador = reservas.find(r => !(tentativaNumero + quantidade - 1 < r.numero_inicial || tentativaNumero > r.numero_final));
        if (bloqueador) {
          tentativaNumero = bloqueador.numero_final + 1;
        } else {
          tentativaNumero++;
        }
      }
      maxTentativas--;
    }

    if (intervalosDisponiveis.length === 0) {
      return buildCorsResponse({ 
        error: 'Não há intervalos disponíveis para a quantidade solicitada',
        sugestao: 'Considere reduzir a quantidade ou usar numeração manual'
      }, { status: 400 });
    }

    // Aplicar critério de seleção com inteligência aumentada
    let intervaloSelecionado;
    const alternativasOrdenadas = [...intervalosDisponiveis].sort((a, b) => b.score - a.score);

    if (criterio === 'menor_intervalo') {
      intervaloSelecionado = alternativasOrdenadas
        .filter(i => i.origem === 'numeracao_livre')[0]
        || alternativasOrdenadas[0];
    } else if (criterio === 'maior_contiguo') {
      intervaloSelecionado = alternativasOrdenadas
        .sort((a, b) => b.quantidadeDisponivel - a.quantidadeDisponivel)[0];
    } else if (criterio === 'sequencial') {
      // Critério sequencial: SEMPRE retorna continuação da sequência com exatamente a quantidade digitada
      intervaloSelecionado = intervalosDisponiveis
        .find(i => i.origem === 'sequencia_nova' && i.quantidade === quantidade);
      
      if (!intervaloSelecionado) {
        // Se não encontrou sequencial com quantidade exata, busca outro critério mas mantém prioridade sequencial
        intervaloSelecionado = intervalosDisponiveis
          .find(i => i.origem === 'sequencia_nova')
          || alternativasOrdenadas[0];
      }
    } else {
      // Default: melhor score (algoritmo inteligente)
      // PRIORIZAR numerações livres quando existirem e forem eficientes
      const numLivreCompleta = alternativasOrdenadas.find(i => i.origem === 'numeracao_livre');
      
      if (numLivreCompleta && numLivreCompleta.score > 50) {
        intervaloSelecionado = numLivreCompleta;
      } else {
        intervaloSelecionado = alternativasOrdenadas[0];
      }
    }

    // Preparar top 3 alternativas com justificativas
    const topAlternativas = alternativasOrdenadas.slice(0, 3).map(alt => ({
      numero_inicial: alt.inicio,
      numero_final: alt.fim,
      origem: alt.origem,
      motivo: alt.motivo,
      score: Math.round(alt.score),
      quantidadeDisponivel: alt.quantidadeDisponivel
    }));

    return buildCorsResponse({
      success: true,
      intervalo: {
        numero_inicial: intervaloSelecionado.inicio,
        numero_final: intervaloSelecionado.fim,
        quantidade: quantidade,
        origem: intervaloSelecionado.origem,
        criterio_aplicado: criterio || 'inteligente',
        motivo: intervaloSelecionado.motivo,
        score: Math.round(intervaloSelecionado.score)
      },
      alternativas: topAlternativas,
      totalAlternativas: intervalosDisponiveis.length,
      mensagem: `Intervalo alocado (score ${Math.round(intervaloSelecionado.score)}): ${intervaloSelecionado.inicio.toLocaleString()} - ${intervaloSelecionado.fim.toLocaleString()}`
    });

  } catch (error) {
    console.error('Erro ao alocar números:', error);
    return buildCorsResponse({ 
      error: error.message || 'Erro ao alocar números automaticamente' 
    }, { status: 500 });
  }
});