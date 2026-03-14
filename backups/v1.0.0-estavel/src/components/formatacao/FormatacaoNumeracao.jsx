export function formatarNumeracao(numero, prefixo, setorId) {
  if (!numero || !prefixo) return numero;

  const numStr = String(numero);

  // LM = 7 dígitos (total 12: A26LM0000001)
  if (prefixo.includes('LM')) {
    return numStr.padStart(7, '0');
  }

  // L com D no final (gás) = 7 dígitos + D (total 12: A26L0000001D)
  if (prefixo === 'L' && setorId && setorId.toLowerCase().includes('gás')) {
    return numStr.padStart(7, '0') + 'D';
  }

  // L normal (água) = 6 dígitos (total 10: A26L000001)
  if (prefixo === 'L' && setorId && setorId.toLowerCase().includes('água')) {
    return numStr.padStart(6, '0');
  }

  // L padrão (outros setores) = 6 dígitos
  if (prefixo === 'L') {
    return numStr.padStart(6, '0');
  }

  return numero;
}

export function extrairPrefixo(codigoCompleto) {
  if (!codigoCompleto) return '';
  const match = codigoCompleto.match(/([A-Z]+)$/);
  return match ? match[1] : '';
}

export function construirCodigoCompleto(letraProduto, ano, prefixo) {
  return `${letraProduto}${ano}${prefixo}`;
}