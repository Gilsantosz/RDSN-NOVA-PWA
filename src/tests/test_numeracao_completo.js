import { validarSequencia } from '../core/numeracaoService.js';
import assert from 'node:assert';

console.log('--- Iniciando teste_numeracao_completo.js ---');

try {
  // Teste validarSequencia - CRESCENTE
  console.log('Testando validarSequencia (CRESCENTE)...');
  assert.strictEqual(validarSequencia(10, 5, "CRESCENTE"), true, '10 > 5 deve ser válido (CRESCENTE)');
  assert.strictEqual(validarSequencia(5, 10, "CRESCENTE"), false, '5 > 10 deve ser inválido (CRESCENTE)');
  assert.strictEqual(validarSequencia(5, 5, "CRESCENTE"), false, '5 > 5 deve ser inválido (CRESCENTE)');
  assert.strictEqual(validarSequencia(1, null, "CRESCENTE"), true, 'Primeira baixa deve ser válida');

  // Teste validarSequencia - DECRESCENTE
  console.log('Testando validarSequencia (DECRESCENTE)...');
  assert.strictEqual(validarSequencia(5, 10, "DECRESCENTE"), true, '5 < 10 deve ser válido (DECRESCENTE)');
  assert.strictEqual(validarSequencia(10, 5, "DECRESCENTE"), false, '10 < 5 deve ser inválido (DECRESCENTE)');
  assert.strictEqual(validarSequencia(5, 5, "DECRESCENTE"), false, '5 < 5 deve ser inválido (DECRESCENTE)');
  assert.strictEqual(validarSequencia(100, null, "DECRESCENTE"), true, 'Primeira baixa deve ser válida');

  console.log('✅ Todos os testes de validação passaram!');
} catch (error) {
  console.error('❌ Falha nos testes:');
  console.error(error.message);
  process.exit(1);
}
