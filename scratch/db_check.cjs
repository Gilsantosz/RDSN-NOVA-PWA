const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load .env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName) {
    console.log(`\n--- Checking table: ${tableName} ---`);
    try {
        const { data, error, count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: false });
        
        if (error) {
            console.error(`Error checking ${tableName}:`, error.message);
            return;
        }
        
        console.log(`Count for ${tableName}: ${count}`);
        if (data && data.length > 0) {
            console.log(`Sample data for ${tableName} (first row):`, JSON.stringify(data[0], null, 2));
        } else {
            console.log(`No data found in ${tableName}`);
        }
    } catch (e) {
        console.error(`Exception checking ${tableName}:`, e.message);
    }
}

async function run() {
    await checkTable('Cliente');
    await checkTable('PCPCliente');
    await checkTable('Setor');
    await checkTable('PCPOrdemProducao');
}

run();
