
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://saczzyiofmlvygsopfws.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhY3p6eWlvZm1sdnlnc29wZndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDA0MzIsImV4cCI6MjA4ODIxNjQzMn0.Uv-HzvaHDbskLxcOaoHtzVq-QWcmDl6x9FUTe3VFiNQ');

async function list() {
    const { data: setores } = await supabase.from('Setor').select('*');
    console.log('SETORES:', JSON.stringify(setores, null, 2));
    
    // Pegar produtos
    const { data: prods } = await supabase.from('Produto').select('*').limit(20);
    console.log('EXEMPLOS PRODUTOS:', JSON.stringify(prods?.map(p => ({ codigo: p.codigo, setor_id: p.j_data?.setor_id })) || [], null, 2));

    // Pegar pcp_clientes
    const { data: clis } = await supabase.from('PCPCliente').select('*').limit(20);
    console.log('EXEMPLOS CLIENTES:', JSON.stringify(clis?.map(p => ({ codigo: p.codigo, setor_id: p.j_data?.setor_id })) || [], null, 2));

}

list();
