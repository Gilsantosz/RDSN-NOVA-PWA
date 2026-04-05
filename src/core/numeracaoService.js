/**
 * NumeracaoService.js
 * Centraliza toda a inteligência de manipulação de sequências numéricas (RDSN).
 * 
 * MODELO DE NUMERAÇÃO: Linear ilimitado (1, 2, 3 ... 999, 1000, 1001 ... 1.000.000+)
 * Não há ciclo nem wrap-around — a sequência cresce indefinidamente.
 */

/**
 * Retorna o próximo número na sequência RDSN (linear, sem limite).
 */
export function proximoNumero(n, decrescente = false) {
  const num = Number(n);
  if (isNaN(num)) return null;
  return decrescente ? num - 1 : num + 1;
}

/**
 * Retorna o número anterior na sequência RDSN (linear).
 */
export function anteriorNumero(n) {
  const num = Number(n);
  if (isNaN(num)) return null;
  return num - 1;
}

/**
 * Calcula a quantidade de números em um intervalo (inclusive).
 * Suporta direção decrescente.
 */
export function calcularQuantidade(inicio, fim, decrescente = false) {
  const i = Number(inicio);
  const f = Number(fim);

  if (isNaN(i) || isNaN(f)) return 0;

  if (decrescente) {
    // Decrescente: inicio >= fim
    return i >= f ? i - f + 1 : 0;
  } else {
    // Crescente: inicio <= fim
    return i <= f ? f - i + 1 : 0;
  }
}

/**
 * Calcula o número final baseado no início e quantidade.
 * Operação O(1) — sem loop, suporta números acima do milhão.
 */
export function calcularFim(inicio, quantidade, decrescente = false) {
  const ini = Number(inicio);
  const qty = Number(quantidade);

  if (isNaN(ini) || isNaN(qty) || qty <= 0) return null;

  return decrescente ? ini - qty + 1 : ini + qty - 1;
}

/**
 * Gera um array de números para exibição ou impressão.
 * Limitado a 10.000 itens para evitar travamento de memória.
 */
export function gerarArray(inicio, fim, decrescente = false) {
  const i = Number(inicio);
  const f = Number(fim);
  const qty = calcularQuantidade(i, f, decrescente);

  if (qty <= 0 || qty > 10000) return [];

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
 */
export function estaContido(numero, limiteInicio, limiteFim, decrescente = false) {
  const n = Number(numero);
  const start = Number(limiteInicio);
  const end = Number(limiteFim);

  if (isNaN(n) || isNaN(start) || isNaN(end)) return false;

  const min = Math.min(start, end);
  const max = Math.max(start, end);
  return n >= min && n <= max;
}

/**
 * Verifica se dois intervalos se sobrepõem.
 * Usa comparação matemática (O(1)), não geração de arrays.
 */
export function checarSobreposicao(ini1, fim1, ini2, fim2) {
  const a = Number(ini1);
  const b = Number(fim1);
  const c = Number(ini2);
  const d = Number(fim2);

  if (isNaN(a) || isNaN(b) || isNaN(c) || isNaN(d)) return false;

  const minAB = Math.min(a, b);
  const maxAB = Math.max(a, b);
  const minCD = Math.min(c, d);
  const maxCD = Math.max(c, d);

  // Sobreposição se os intervalos não são disjuntos
  return maxAB >= minCD && maxCD >= minAB;
}

/**
 * Verifica se um número (n1) está logicamente "depois" de outro (n2)
 * em uma sequência linear crescente.
 */
export function eApos(n1, n2) {
  const a = Number(n1);
  const b = Number(n2);
  if (isNaN(a) || isNaN(b)) return false;
  return a > b;
}

/**
 * Valida se um número segue corretamente a sequência baseada no anterior e na direção.
 */
export function validarSequencia(novo, anterior, modo) {
  if (anterior === null || anterior === undefined || anterior === '') return true;
  return proximoNumero(anterior, modo === 'DECRESCENTE') === Number(novo);
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

  if (!estaContido(final, resIni, resFim, decrescente)) {
    return { valida: false, erro: `Fora do intervalo da reserva (${resIni} – ${resFim})`, quantidade };
  }

  return { valida: true, erro: '', quantidade };
}

// v3: 2026-03-19 - Refactor: numeração linear ilimitada (remove ciclo 1000, checarSobreposicao O(1))

/** @deprecated Use gerarArray */
export const gerarSequencia = gerarArray;

