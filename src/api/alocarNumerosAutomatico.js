import { rdsn } from './supabaseClient.js';

export async function alocarNumerosAutomatico(payload) {
  try {
    const { letra_produto, ano, quantidade, setor_id, criterio } = payload;

    if (!letra_produto || !ano || !quantidade || !setor_id) {
      return { data: { error: 'Parâmetros obrigatórios: letra_produto, ano, quantidade, setor_id' }, status: 400 };
    }

    // Buscar sequência atual
    let sequencias = [];
    try {
      const todas = await rdsn.asServiceRole.entities.SequenciaAnual.list();
      sequencias = todas.filter(s =>
        String(s.letra_produto) === String(letra_produto) &&
        String(s.ano) === String(ano) &&
        String(s.setor_id) === String(setor_id)
      );
    } catch (err) {
      console.log('Erro ao buscar sequências', err);
    }

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
        return { data: { error: 'Erro ao criar sequência: ' + err.message }, status: 500 };
      }
    } else {
      sequencia = sequencias[0];
    }

    if (sequencia.encerrado) {
      return { data: { error: 'Ano encerrado. Não é possível criar novas reservas' }, status: 400 };
    }

    const todasReservas = await rdsn.asServiceRole.entities.ReservaLote.filter({
      letra_produto,
      ano,
      setor_id
    });

    const reservas = todasReservas.filter(r =>
      ['RESERVADO', 'EM_PRODUCAO', 'BAIXADO', 'PRODUZIDO'].includes(r.status)
    );

    let numeracoesLivres = [];
    try {
      const todasNumLivres = await rdsn.asServiceRole.entities.NumeracaoLivre.list();
      numeracoesLivres = todasNumLivres.filter(n =>
        String(n.letra_produto) === String(letra_produto) &&
        String(n.ano) === String(ano) &&
        String(n.setor_id) === String(setor_id) &&
        n.disponivel === true
      );
    } catch (err) {
      console.log('NumeracaoLivre não possui registros ou erro ao buscar');
    }

    const agora = new Date().toISOString();
    let bloqueiosAtivos = [];
    try {
      const todosBloqueios = await rdsn.asServiceRole.entities.BloqueioIntervalo.list();
      bloqueiosAtivos = todosBloqueios.filter(b =>
        String(b.letra_produto) === String(letra_produto) &&
        String(b.ano) === String(ano) &&
        String(b.setor_id) === String(setor_id) &&
        (!b.expira_em || new Date(b.expira_em) > new Date(agora))
      );
    } catch (err) {
      console.log('BloqueioIntervalo não possui registros ou erro ao buscar');
    }

    const intervalosOcupados = reservas.map(r => ({
      inicio: r.numero_inicial,
      fim: r.numero_final
    }));

    const intervalosLivresExistentes = numeracoesLivres.map(n => ({
      inicio: n.numero_inicial,
      fim: n.numero_final,
      quantidade: n.quantidade,
      isLivre: true
    }));

    const verificarIntervaloLivre = (inicio, fim) => {
      for (const ocupado of intervalosOcupados) {
        if (!(fim < ocupado.inicio || inicio > ocupado.fim)) {
          return false;
        }
      }
      for (const bloqueio of bloqueiosAtivos) {
        if (!(fim < bloqueio.numero_inicial || inicio > bloqueio.numero_final)) {
          return false;
        }
      }
      return true;
    };

    const calcularProximidadeReservas = (inicio, fim) => {
      const proximaReserva = reservas
        .map(r => r.numero_inicial)
        .filter(n => n > fim)
        .sort((a, b) => a - b)[0];

      return proximaReserva ? (proximaReserva - fim - 1) : Infinity;
    };

    const calcularScoreQualidade = (intervalo) => {
      let score = 0;
      if (intervalo.origem === 'numeracao_livre') score += 100;
      if (intervalo.origem === 'numeracao_livre_combinada') score += 90;
      if (intervalo.origem === 'numeracao_livre_parcial') score += 60;
      if (intervalo.origem === 'sequencia_nova') score += 40;

      if (intervalo.origem !== 'numeracao_livre_parcial' && intervalo.quantidadeDisponivel > intervalo.quantidade) {
        const desperdicio = intervalo.quantidadeDisponivel - intervalo.quantidade;
        score -= Math.min(20, desperdicio / 100);
      }

      const proximidade = calcularProximidadeReservas(intervalo.inicio, intervalo.fim);
      if (proximidade > 100 && proximidade < 1000) {
        score += 15;
      } else if (proximidade < 100 && proximidade > 0) {
        score -= 10;
      }

      return score;
    };

    const intervalosDisponiveis = [];

    for (const livre of intervalosLivresExistentes) {
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
      else if (livre.quantidade > 0 && livre.quantidade < quantidade) {
        const inicioLivre = livre.inicio;
        const fimLivre = livre.fim;
        const quantidadeLivre = livre.quantidade;
        const quantidadeFaltante = quantidade - quantidadeLivre;
        const fimTotal = inicioLivre + quantidade - 1;

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

    const todosNumeros = [...intervalosOcupados].sort((a, b) => a.inicio - b.inicio);

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
        intervalo.score = calcularScoreQualidade(intervalo) + 50;
        intervalosDisponiveis.push(intervalo);
      }
    }

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

    // Próximo número = fim da ÚLTIMA RESERVA CONFIRMADA + 1
    // Ignora ultimo_numero (pode estar contaminado por simulações antigas)
    // A fonte da verdade é sempre o banco de dados de reservas confirmadas.
    const maxOcupado = reservas.reduce((max, r) => Math.max(max, r.numero_final || 0), 0);
    const proximoNumero = maxOcupado + 1;

    if (verificarIntervaloLivre(proximoNumero, proximoNumero + quantidade - 1)) {
      const intervalo = {
        inicio: proximoNumero,
        fim: proximoNumero + quantidade - 1,
        quantidade: quantidade,
        origem: 'sequencia_nova',
        quantidadeDisponivel: quantidade,
        motivo: `Continuação sequencial: ${proximoNumero.toLocaleString()} – ${(proximoNumero + quantidade - 1).toLocaleString()}`
      };
      intervalo.score = calcularScoreQualidade(intervalo);
      intervalosDisponiveis.push(intervalo);
    }

    if (intervalosDisponiveis.length === 0) {
      return {
        data: {
          error: 'Não há intervalos disponíveis para a quantidade solicitada',
          sugestao: 'Considere reduzir a quantidade ou usar numeração manual'
        }, status: 400
      };
    }

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
      intervaloSelecionado = intervalosDisponiveis
        .find(i => i.origem === 'sequencia_nova' && i.quantidade === quantidade);

      if (!intervaloSelecionado) {
        intervaloSelecionado = intervalosDisponiveis
          .find(i => i.origem === 'sequencia_nova')
          || alternativasOrdenadas[0];
      }
    } else {
      const numLivreCompleta = alternativasOrdenadas.find(i => i.origem === 'numeracao_livre');
      const numLivreParcial = alternativasOrdenadas.find(i => i.origem === 'numeracao_livre_parcial');

      if (numLivreCompleta) {
        intervaloSelecionado = numLivreCompleta;
      } else if (numLivreParcial && numLivreParcial.score > 20) {
        intervaloSelecionado = numLivreParcial;
      } else {
        intervaloSelecionado = alternativasOrdenadas[0];
      }
    }

    const topAlternativas = alternativasOrdenadas.slice(0, 3).map(alt => ({
      numero_inicial: alt.inicio,
      numero_final: alt.fim,
      origem: alt.origem,
      motivo: alt.motivo,
      score: Math.round(alt.score),
      quantidadeDisponivel: alt.quantidadeDisponivel
    }));

    // NOTA: ultimo_numero NÃO é atualizado aqui.
    // Esta função é read-only — apenas sugere um intervalo.
    // O ultimo_numero deve ser atualizado somente quando a reserva for
    // efetivamente confirmada (salva no banco via ReservaLote.create).
    // A sequência correta sempre é derivada de maxOcupado (reservas confirmadas).

    return {
      data: {
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
      }
    };

  } catch (error) {
    console.error('Erro ao alocar números:', error);
    return { data: { error: error.message || 'Erro ao alocar números automaticamente' }, status: 500 };
  }
}