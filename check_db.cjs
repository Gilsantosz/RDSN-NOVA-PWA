const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase config não encontrada");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: clientes, error: err1 } = await supabase.from('clientes').select('*');
  if (err1) console.error(err1);
  else console.log("Clientes:", clientes.length, clientes.filter(c => c.sequencia_decrescente).map(c => c.id + " - " + c.nome));
}
check();
