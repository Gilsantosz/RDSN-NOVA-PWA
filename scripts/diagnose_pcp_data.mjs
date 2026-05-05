import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://saczzyiofmlvygsopfws.supabase.co';
const SERVICE_ROLE_KEY = 'REMOVED_SEE_ENV';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  console.log('--- DIAGNÓSTICO DE DADOS PCP ---');

  // 1. Verificar Setores
  console.log('\n[1] Verificando tabela "Setor"...');
  const { data: setores, error: setorError } = await supabase.from('Setor').select('*');
  if (setorError) {
    console.error('❌ Erro ao ler Setor:', setorError.message);
  } else {
    console.log(`✅ Encontrados ${setores.length} setores.`);
    setores.forEach(s => {
      console.log(`   - ID: ${s.id} | Nome: ${s.nome || 'SEM NOME'} | j_data: ${JSON.stringify(s.j_data)}`);
    });
  }

  // 2. Verificar Clientes
  console.log('\n[2] Verificando tabela "PCPCliente"...');
  const { data: clientes, error: clienteError } = await supabase.from('PCPCliente').select('*');
  if (clienteError) {
    console.error('❌ Erro ao ler PCPCliente:', clienteError.message);
  } else {
    console.log(`✅ Encontrados ${clientes.length} clientes.`);
    clientes.forEach(c => {
      const unpacked = { ...c, ...(c.j_data || {}) };
      console.log(`   - ID: ${c.id} | Nome: ${unpacked.nome} | Setor ID: ${unpacked.setor_id}`);
    });
  }

  // 3. Verificar se há clientes órfãos ou em setores inexistentes
  if (clientes && setores) {
    const setorIds = new Set(setores.map(s => s.id));
    const orfaos = clientes.filter(c => {
       const unpacked = { ...c, ...(c.j_data || {}) };
       return unpacked.setor_id && !setorIds.has(unpacked.setor_id);
    });
    console.log(`\n[3] Clientes com Setor ID inexistente: ${orfaos.length}`);
    orfaos.forEach(c => {
       const unpacked = { ...c, ...(c.j_data || {}) };
       console.log(`   - Cliente: ${unpacked.nome} | Setor ID: ${unpacked.setor_id}`);
    });
  }

  // 4. Verificar Auditoria
  console.log('\n[4] Verificando auditoria...');
  const { data: logs, error: logError } = await supabase.from('Auditoria').select('*').order('created_at', { ascending: false }).limit(20);
  if (!logError && logs) {
    console.log('Últimos 20 logs de auditoria:');
    logs.forEach(l => {
      const unpacked = { ...l, ...(l.j_data || {}) };
      console.log(`   - ${l.created_at} | Tabela: ${l.tabela} | Op: ${l.operacao} | Ref: ${unpacked.ref_id || unpacked.codigo_op || ''}`);
    });
  }

}

main().catch(console.error);
