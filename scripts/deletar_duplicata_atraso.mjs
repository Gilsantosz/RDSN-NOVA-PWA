/**
 * Script de limpeza: remove a OP de Atraso duplicada com quantidade errada (1000)
 * Mantém a OP correta (990, com setor_id)
 * 
 * Critério de deleção:
 *   - tipo = 'Atraso'
 *   - mes = 5 (Maio)
 *   - ano = 2026
 *   - Tem DUPLICATA: mesmo codigo_op/codigo_produto com outra OP de Atraso no mesmo mês
 *   - A deletar: a que tem setor_id = null (criada antes da correção) e/ou quantidade_total maior
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://saczzyiofmlvygsopfws.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  console.log('🔍 Buscando OPs de Atraso no mês atual (Maio/2026)...\n');

  // Busca TODAS as OPs de Atraso de Maio/2026
  const { data: ops, error } = await supabase
    .from('PCPOrdemProducao')
    .select('id, codigo_op, codigo_produto, quantidade_total, setor_id, mes_origem, ano_origem, created_at')
    .eq('tipo', 'Atraso')
    .eq('mes', 5)
    .eq('ano', 2026)
    .eq('status', 'Ativo')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Erro ao buscar OPs:', error.message);
    process.exit(1);
  }

  console.log(`📋 Encontradas ${ops.length} OP(s) de Atraso em Maio/2026:\n`);
  ops.forEach((op, i) => {
    console.log(`  [${i+1}] ID: ${op.id}`);
    console.log(`       Código OP:     ${op.codigo_op}`);
    console.log(`       Código Prod:   ${op.codigo_produto}`);
    console.log(`       Qtd Total:     ${op.quantidade_total}`);
    console.log(`       Setor ID:      ${op.setor_id ?? '⚠️  NULL (sem setor)'}`);
    console.log(`       Origem:        ${op.mes_origem}/${op.ano_origem}`);
    console.log(`       Criado em:     ${op.created_at}`);
    console.log('');
  });

  if (ops.length < 2) {
    console.log('✅ Sem duplicatas detectadas. Nenhuma ação necessária.');
    return;
  }

  // Agrupar por codigo_produto ou codigo_op para encontrar duplicatas
  const grupos = {};
  for (const op of ops) {
    const chave = op.codigo_produto || op.codigo_op;
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(op);
  }

  let totalDeletados = 0;

  for (const [chave, grupo] of Object.entries(grupos)) {
    if (grupo.length < 2) continue;

    console.log(`\n⚠️  DUPLICATA encontrada para "${chave}" (${grupo.length} entradas):`);

    // Ordena: prioriza manter a com setor_id preenchido e menor quantidade (saldo correto)
    grupo.sort((a, b) => {
      // Prefere a que TEM setor_id
      const aTemSetor = a.setor_id ? 1 : 0;
      const bTemSetor = b.setor_id ? 1 : 0;
      if (bTemSetor !== aTemSetor) return bTemSetor - aTemSetor;
      // Prefere a com MENOR quantidade_total (saldo residual correto)
      return a.quantidade_total - b.quantidade_total;
    });

    const manter = grupo[0];
    const deletar = grupo.slice(1);

    console.log(`  ✅ MANTER:  ID ${manter.id} | Qtd: ${manter.quantidade_total} | Setor: ${manter.setor_id}`);
    
    for (const op of deletar) {
      console.log(`  🗑️  DELETAR: ID ${op.id} | Qtd: ${op.quantidade_total} | Setor: ${op.setor_id ?? 'NULL'}`);
      
      const { error: delError } = await supabase
        .from('PCPOrdemProducao')
        .delete()
        .eq('id', op.id);

      if (delError) {
        console.error(`  ❌ Falha ao deletar ${op.id}:`, delError.message);
      } else {
        console.log(`  ✅ Deletado com sucesso: ${op.id}`);
        totalDeletados++;
      }
    }
  }

  console.log(`\n🎉 Limpeza concluída! ${totalDeletados} duplicata(s) removida(s).`);
}

main().catch(err => {
  console.error('Erro crítico:', err);
  process.exit(1);
});
