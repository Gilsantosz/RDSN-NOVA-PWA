import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://saczzyiofmlvygsopfws.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string; // Definir via .env local

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('--- DIAGNÓSTICO DE DADOS ---');
  
  // 1. Verificar Clientes
  const { data: clientes, error: errC } = await supabase.from('Cliente').select('*');
  console.log('Clientes encontrados:', clientes?.length || 0);
  if (clientes && clientes.length > 0) {
    console.log('Amostra de clientes:', clientes.slice(0, 3).map(c => ({ id: c.id, j_data: c.j_data })));
  }
  if (errC) console.error('Erro ao buscar clientes:', errC);

  // 2. Verificar Auditoria para deleções de clientes
  const { data: auditoria, error: errA } = await supabase
    .from('Auditoria')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  
  console.log('Total registros auditoria:', auditoria?.length || 0);
  const delecoes = auditoria?.filter(a => 
    (a.acao && a.acao.includes('DELETE')) || 
    (a.j_data?.acao && a.j_data.acao.includes('DELETE')) ||
    (a.detalhes && a.detalhes.includes('Cliente'))
  );

  console.log('Deleções detectadas:', delecoes?.length || 0);
  if (delecoes && delecoes.length > 0) {
    console.log('Deleções recentes:', delecoes.slice(0, 5).map(d => ({ 
        data: d.created_at, 
        detalhes: d.detalhes || d.j_data?.detalhes,
        usuario: d.usuario_id || d.j_data?.usuario
    })));
  }

  // 3. Verificar Setores
  const { data: setores } = await supabase.from('Setor').select('id, j_data');
  console.log('Setores cadastrados:', setores?.length || 0);
  console.log('Mapeamento de setores:', setores?.map(s => ({ id: s.id, nome: s.j_data?.nome || s.nome })));
}

diagnose();
