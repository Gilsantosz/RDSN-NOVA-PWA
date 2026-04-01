import { validarSequencia } from '../core/numeracaoService.js';
import assert from 'node:assert';

console.log('--- Iniciando test_numeracao_completo.js ---');

try {
  // Teste validarSequencia - CRESCENTE
  console.log('Testando validarSequencia (CRESCENTE)...');
  assert.strictEqual(validarSequencia(11, 10, "CRESCENTE"), true, '11 deve ser válido após 10 crescente');
  assert.strictEqual(validarSequencia(10, 11, "CRESCENTE"), false, '10 deve ser inválido após 11 crescente');
  assert.strictEqual(validarSequencia(10, 10, "CRESCENTE"), false, '10 deve ser inválido após 10 crescente (não subiu)');

  // Teste validarSequencia - DECRESCENTE
  console.log('Testando validarSequencia (DECRESCENTE)...');
  assert.strictEqual(validarSequencia(9, 10, "DECRESCENTE"), true, '9 deve ser válido após 10 decrescente');
  assert.strictEqual(validarSequencia(11, 10, "DECRESCENTE"), false, '11 deve ser inválido após 10 decrescente');
  assert.strictEqual(validarSequencia(10, 10, "DECRESCENTE"), false, '10 deve ser inválido após 10 decrescente (não caiu)');

  // Teste validarSequencia - Primeira Baixa
  console.log('Testando validarSequencia (Primeira Baixa)...');
  assert.strictEqual(validarSequencia(100, null, "CRESCENTE"), true, 'Qualquer número na primeira baixa crescente deve ser válido');
  assert.strictEqual(validarSequencia(100, null, "DECRESCENTE"), true, 'Qualquer número na primeira baixa decrescente deve ser válido');

  console.log('✅ Todos os testes de validação de sequência passaram!');
} catch (error) {
  console.error('❌ Falha nos testes:');
  console.error(error.message);
  process.exit(1);
}
