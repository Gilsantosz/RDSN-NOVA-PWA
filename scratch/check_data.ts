
import { rdsn } from './src/api/supabaseClient.ts';

async function checkData() {
    try {
        const clientes = await rdsn.entities.Cliente.list();
        console.log(`Table 'Cliente' count: ${clientes.length}`);
        if (clientes.length > 0) {
            console.log('Sample Cliente:', clientes[0]);
        }

        const pcpClientes = await rdsn.entities.PCPCliente.list();
        console.log(`Table 'PCPCliente' count: ${pcpClientes.length}`);
        if (pcpClientes.length > 0) {
            console.log('Sample PCPCliente:', pcpClientes[0]);
        }

        const setores = await rdsn.entities.Setor.list();
        console.log(`Table 'Setor' count: ${setores.length}`);
        if (setores.length > 0) {
            console.log('Sample Setor:', setores[0]);
        }
    } catch (error) {
        console.error('Error checking data:', error);
    }
}

checkData();
