const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase config not found");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking 'Cliente' table...");
  const { data: clientes, error: errClient } = await supabase.from('Cliente').select('*');
  if (errClient) {
    console.error("Error fetching Cliente:", errClient);
  } else {
    console.log(`Found ${clientes.length} clients.`);
    const suspicious = clientes.filter(c => c.sequencia_decrescente);
    console.log("Clients with sequencia_decrescente=true:", suspicious.map(c => ({ id: c.id, nome: c.nome, label: c.sequencia_label })));
  }

  console.log("\nChecking 'Setor' table...");
  const { data: setores, error: errSetor } = await supabase.from('Setores').select('*');
  if (errSetor) {
     const { data: setores2, error: errSetor2 } = await supabase.from('Setor').select('*');
     if (errSetor2) console.error("Error fetching Setor/Setores:", errSetor2);
     else console.log(`Found ${setores2.length} sectors.`, setores2.map(s => s.nome));
  } else {
    console.log(`Found ${setores.length} sectors.`, setores.map(s => s.nome));
  }
}
check();
