
import { rdsn } from './src/api/supabaseClient.js';

async function test() {
    try {
        const setores = await rdsn.entities.Setor.list();
        console.log('Setores:', JSON.stringify(setores, null, 2));
        
        // Ver se existem produtos para o setor de Gás
        const gasSetor = setores.find(s => s.nome?.toLowerCase().includes('gás') || s.nome?.toLowerCase().includes('gas'));
        if (gasSetor) {
            console.log('Setor de Gás encontrado:', gasSetor.id);
            const prods = await rdsn.entities.Produto.filter({ setor_id: gasSetor.id });
            console.log('Produtos para Gás:', prods.length);
            if (prods.length > 0) {
              console.log('Exemplo Produto Gás:', JSON.stringify(prods[0], null, 2));
            } else {
              // Se não encontrou por ID, tentar por NOME do setor se o campo for texto
              const prodsNome = await rdsn.entities.Produto.filter({ setor_id: gasSetor.nome });
              console.log('Produtos para Gás (por Nome):', prodsNome.length);
            }
        } else {
            console.log('Setor de Gás NÃO encontrado pelo nome!');
        }
    } catch (e) {
        console.error(e);
    }
}

test();
