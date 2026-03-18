import { gerarSequencia, proximoNumero } from '../core/numeracaoService.js';
import assert from 'node:assert';

console.log('--- Iniciando teste_geracao_numero.js ---');

try {
  // Teste gerarSequencia - CRESCENTE
  console.log('Testando gerarSequencia (CRESCENTE)...');
  const seqCrescente = gerarSequencia(1, 5, "CRESCENTE");
  assert.deepStrictEqual(seqCrescente, [1, 2, 3, 4, 5], 'Sequência crescente deve ser [1, 2, 3, 4, 5]');

  // Teste gerarSequencia - DECRESCENTE
  console.log('Testando gerarSequencia (DECRESCENTE)...');
  const seqDecrescente = gerarSequencia(1, 5, "DECRESCENTE");
  assert.deepStrictEqual(seqDecrescente, [5, 4, 3, 2, 1], 'Sequência decrescente deve ser [5, 4, 3, 2, 1]');

  // Teste proximoNumero - CRESCENTE
  console.log('Testando proximoNumero (CRESCENTE)...');
  assert.strictEqual(proximoNumero(10, "CRESCENTE"), 11, 'Próximo de 10 crescente deve ser 11');

  // Teste proximoNumero - DECRESCENTE
  console.log('Testando proximoNumero (DECRESCENTE)...');
  assert.strictEqual(proximoNumero(10, "DECRESCENTE"), 9, 'Próximo de 10 decrescente deve ser 9');

  console.log('✅ Todos os testes de geração passaram!');
} catch (error) {
  console.error('❌ Falha nos testes:');
  console.error(error.message);
  process.exit(1);
}
