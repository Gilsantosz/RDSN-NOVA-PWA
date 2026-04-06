
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://saczzyiofmlvygsopfws.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhY3p6eWlvZm1sdnlnc29wZndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDA0MzIsImV4cCI6MjA4ODIxNjQzMn0.Uv-HzvaHDbskLxcOaoHtzVq-QWcmDl6x9FUTe3VFiNQ');

async function list() {
    const { data: prods } = await supabase.from('Produto').select('*').limit(10);
    console.log('PRODS:', JSON.stringify(prods, null, 2));

    const { data: clis } = await supabase.from('PCPCliente').select('*').limit(10);
    console.log('CLIS:', JSON.stringify(clis, null, 2));
}

list();
