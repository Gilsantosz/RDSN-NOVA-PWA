import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://saczzyiofmlvygsopfws.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    try {
        console.log("Checking tables...");
        
        // Check Cliente
        const { data: clientes, error: errCli, count: countCli } = await supabase.from('Cliente').select('*', { count: 'exact' });
        console.log(`Cliente table count: ${countCli}, sample:`, errCli ? `Error: ${errCli.message}` : JSON.stringify(clientes?.slice(0, 2), null, 2));

        // Check PCPCliente
        const { data: pcpClientes, error: errPcpCli, count: countPcp } = await supabase.from('PCPCliente').select('*', { count: 'exact' });
        console.log(`PCPCliente table count: ${countPcp}, sample:`, errPcpCli ? `Error: ${errPcpCli.message}` : JSON.stringify(pcpClientes?.slice(0, 2), null, 2));

        // Check Setor
        const { data: setores, error: errSet, count: countSet } = await supabase.from('Setor').select('*', { count: 'exact' });
        console.log(`Setor table count: ${countSet}, sample:`, errSet ? `Error: ${errSet.message}` : JSON.stringify(setores?.slice(0, 2), null, 2));

        // Try ordering by nome
        const { data: orderedSetores, error: errOrder } = await supabase.from('Setor').select('*').order('nome').limit(1);
        console.log("Order by 'nome' result:", errOrder ? `Error: ${errOrder.message}` : "Success");

        // Try ordering by j_data->>nome
        const { data: orderedSetoresJson, error: errOrderJson } = await supabase.from('Setor').select('*').order('j_data->>nome').limit(1);
        console.log("Order by 'j_data->>nome' result:", errOrderJson ? `Error: ${errOrderJson.message}` : "Success");
        
    } catch (e) {
        console.error("Critical error:", e);
    }
}

check();
