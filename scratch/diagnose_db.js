const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://saczzyiofmlvygsopfws.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    try {
        console.log("Checking tables...");
        
        // Check Cliente
        const { data: clientes, error: errCli } = await supabase.from('Cliente').select('*').limit(5);
        console.log("Cliente table sample:", errCli ? `Error: ${errCli.message}` : JSON.stringify(clientes, null, 2));

        // Check PCPCliente
        const { data: pcpClientes, error: errPcpCli } = await supabase.from('PCPCliente').select('*').limit(5);
        console.log("PCPCliente table sample:", errPcpCli ? `Error: ${errPcpCli.message}` : JSON.stringify(pcpClientes, null, 2));

        // Check Setor
        const { data: setores, error: errSet } = await supabase.from('Setor').select('*').limit(5);
        console.log("Setor table sample:", errSet ? `Error: ${errSet.message}` : JSON.stringify(setores, null, 2));

        // Try ordering by nome
        const { data: orderedSetores, error: errOrder } = await supabase.from('Setor').select('*').order('nome').limit(1);
        console.log("Order by 'nome' result:", errOrder ? `Error: ${errOrder.message}` : "Success");
    } catch (e) {
        console.error("Critical error:", e);
    }
}

check();
