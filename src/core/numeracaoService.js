/**
 * NumeracaoService.js
 * Centraliza toda a inteligência de manipulação de sequências numéricas (RDSN).
 * Implementa a lógica "Pula 000" (Sequência de 001 a 1000).
 */

/**
 * Retorna o próximo número na sequência RDSN (001 a 1000).
 * Pula o número 000.
 */
export function proximoNumero(n, decrescente = false) {
  const num = Number(n);
  if (isNaN(num)) return null;

  if (decrescente) {
    return anteriorNumero(num);
  }

  // Se for 999, pula o 000 e vai para 001
  if (num === 1000) return 1;
  return num + 1;
}

/**
 * Retorna o número anterior na sequência RDSN (001 a 1000).
 * Pula o número 000.
 */
export function anteriorNumero(n) {
  const num = Number(n);
  if (isNaN(num)) return null;

  // Se for 001, pula o 000 e vai para 999
  if (num === 1) return 1000;
  return num - 1;
}

/**
 * Calcula a quantidade de números em um intervalo (inclusive).
 * Suporta wrap-around (ex: 900 até 100).
 */
export function calcularQuantidade(inicio, fim, decrescente = false) {
  const i = Number(inicio);
  const f = Number(fim);
  
  if (isNaN(i) || isNaN(f)) return 0;
  
  if (decrescente) {
    if (i >= f) {
      return i - f + 1;
    }
    // Caso com wrap-around (decrescente, i < f) ex: 005 -> 995
    if (f <= 1000) return i + (1000 - f + 1);
    return 0;
  } else {
    // Caso normal (sem wrap-around)
    if (i <= f) {
      return f - i + 1;
    }
    
    // Caso com wrap-around (crescente, i > f) ex: 990 até 010
    if (i <= 1000 && f <= 1000) return (1000 - i + 1) + f;
    return 0; // Sem wrap-around ou invalido
  }
}

/**
 * Calcula o número final baseado no início e quantidade.
 */
export function calcularFim(inicio, quantidade, decrescente = false) {
  const ini = Number(inicio);
  const qty = Number(quantidade);
  
  if (isNaN(ini) || isNaN(qty) || qty <= 0) return null;
  
  let atual = ini;
  for (let i = 1; i < qty; i++) {
    atual = decrescente ? anteriorNumero(atual) : proximoNumero(atual);
  }
  return atual;
}

/**
 * Gera um array de números para exibição ou impressão.
 */
export function gerarArray(inicio, fim, decrescente = false) {
  const i = Number(inicio);
  const f = Number(fim);
  const qty = calcularQuantidade(i, f);
  
  if (qty <= 0 || qty > 1000000) return [];

  const result = [];
  let atual = i;
  for (let step = 0; step < qty; step++) {
    result.push(atual);
    atual = decrescente ? anteriorNumero(atual) : proximoNumero(atual);
  }
  return result;
}

/**
 * Verifica se um número está contido em um intervalo (inclusive).
 * Suporta wrap-around.
 */
export function estaContido(numero, limiteInicio, limiteFim, decrescente = false) {
  const n = Number(numero);
  const start = Number(limiteInicio);
  const end = Number(limiteFim);
  
  if (isNaN(n) || isNaN(start) || isNaN(end)) return false;
  
  const min = Math.min(start, end);
  const max = Math.max(start, end);

  if (!decrescente) {
    if (start <= end) {
      return n >= start && n <= end;
    } else {
      // Caso wrap-around
      if (start <= 1000 && end <= 1000) return n >= start || n <= end;
      return n >= min && n <= max;
    }
  } else {
    if (start >= end) {
      return n >= end && n <= start;
    } else {
      // Caso wrap-around decrescente
      if (start <= 1000 && end <= 1000) return n <= start || n >= end;
      return n >= min && n <= max;
    }
  }
}

/**
 * Verifica se dois intervalos se sobrepõem.
 */
export function checarSobreposicao(ini1, fim1, ini2, fim2) {
  // Para simplificar, geramos os arrays e checamos interseção
  // (Ou lógica matemática para wrap-around, mas o array é mais seguro aqui)
  const range1 = gerarArray(ini1, fim1);
  const set1 = new Set(range1);
  
  const range2 = gerarArray(ini2, fim2);
  return range2.some(n => set1.has(n));
}

/**
 * Verifica se um número (n1) está logicamente "depois" de outro (n2)
 * em uma sequência cíclica de 1 a 1000.
 * 
 * @param {number|string} n1 O número a ser testado
 * @param {number|string} n2 O número de referência
 * @returns {boolean} True se n1 vem após n2 na sequência
 */
export function eApos(n1, n2) {
  const a = Number(n1);
  const b = Number(n2);
  if (isNaN(a) || isNaN(b)) return false;
  if (a === b) return false;

  // Calcula a distância horária de b para a
  // (a - b + 1000) % 1000 garante o intervalo [0, 999]
  const dist = (a - b + 1000) % 1000;
  
  // Se a distância for < 500, consideramos que n1 está "à frente"
  return dist > 0 && dist < 500;
}

/**
 * Valida se um número segue corretamente a sequência baseada no anterior e na direção.
 * 
 * @param {number|string} novo O novo número a ser validado
 * @param {number|string} anterior O número anterior da sequência (pode ser null)
 * @param {string} modo "CRESCENTE" ou "DECRESCENTE"
 * @returns {boolean} True se a sequência for válida
 */
export function validarSequencia(novo, anterior, modo) {
  if (anterior === null || anterior === undefined || anterior === '') return true;
  return proximoNumero(anterior, modo === "DECRESCENTE") === Number(novo);
}

/**
 * Valida o intervalo inserido para BaixaForm, verificando a quantidade e se está contido na reserva.
 */
export function validarIntervaloBaixa(numIni, numFim, resIni, resFim, decrescente = false) {
  const inicial = Number(numIni);
  const final = Number(numFim);
  
  if (isNaN(inicial) || isNaN(final)) return { valida: false, erro: 'Número inválido', quantidade: 0 };
  
  const quantidade = calcularQuantidade(numIni, numFim, decrescente);
  if (quantidade <= 0) {
    return { valida: false, erro: 'Intervalo inválido ou quantidade zero', quantidade: 0 };
  }

  // Verifica se o final informado está contido na reserva original
  if (!estaContido(final, resIni, resFim, decrescente)) {
    return { valida: false, erro: `Para fora do intervalo da reserva (${resIni} - ${resFim})`, quantidade };
  }

  return { valida: true, erro: '', quantidade };
}

// v2: 12:49 - 2026-03-18 - Fix: ciclo 1000 e export validarSequencia
