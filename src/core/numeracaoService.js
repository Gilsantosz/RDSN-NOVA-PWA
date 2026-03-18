/**
 * Serviço global para lidar com lógicas de numeração (Crescente ou Decrescente)
 */

/**
 * Gera um array numérico sequencial com base no início, fim e ordem definidos.
 * 
 * @param {number} inicio Número inicial
 * @param {number} fim Número final
 * @param {string} ordem 'CRESCENTE' | 'DECRESCENTE'
 * @returns {number[]}
 */
export function gerarSequencia(inicio, fim, ordem = "CRESCENTE") {
  if (ordem === "CRESCENTE") {
    return Array.from(
      { length: fim - inicio + 1 },
      (_, i) => inicio + i
    );
  }

  if (ordem === "DECRESCENTE") {
    return Array.from(
      { length: fim - inicio + 1 },
      (_, i) => fim - i
    );
  }

  return [];
}

/**
 * Calcula o próximo número da sequência com base na ordem.
 * 
 * @param {number} numeroAtual
 * @param {string} ordem 'CRESCENTE' | 'DECRESCENTE'
 * @returns {number}
 */
export function proximoNumero(numeroAtual, ordem = "CRESCENTE") {
  if (ordem === "DECRESCENTE") {
    return numeroAtual - 1;
  }
  return numeroAtual + 1;
}

/**
 * Valida a consistência do número inserido baseando-se na ordem.
 * Retorna true se válido, false se inválido.
 * 
 * @param {number} numeroInformado 
 * @param {number} ultimoNumeroBaixado
 * @param {string} ordem 'CRESCENTE' | 'DECRESCENTE'
 * @returns {boolean}
 */
export function validarSequencia(numeroInformado, ultimoNumeroBaixado, ordem = "CRESCENTE") {
  if (!ultimoNumeroBaixado) return true; // Primeira baixa
  
  if (ordem === "DECRESCENTE") {
    // Na ordem decrescente, o próximo número DEVE ser menor que o anterior.
    // Ex: 1000 -> 999. Inserir 1001 é inválido.
    return numeroInformado < ultimoNumeroBaixado;
  }
  
  // Na ordem crescente, o próximo número DEVE ser maior que o anterior.
  return numeroInformado > ultimoNumeroBaixado;
}
