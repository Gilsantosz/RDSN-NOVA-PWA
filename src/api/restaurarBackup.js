export async function restaurarBackup(payload, rdsn) {
    console.log('[RESTAURAR SHIM] Iniciando restauração local...', payload);
    try {
        const { arquivo_url, entidades_para_restaurar } = payload;
        const user = await rdsn.auth.me();

        if (user?.role !== 'admin') {
            return { data: { error: 'Não autorizado - apenas admins' }, status: 403 };
        }

        if (!arquivo_url) {
            return { data: { error: 'URL do arquivo é obrigatória' }, status: 400 };
        }

        // Baixar o arquivo (pode ser um blob url local ou url remota)
        const response = await fetch(arquivo_url);
        const backup = await response.json();

        if (!backup.dados) {
            throw new Error('Arquivo de backup inválido');
        }

        const mapeamento = {
            reservas: 'ReservaLote',
            baixas: 'BaixaLote',
            sequencias: 'SequenciaAnual',
            numeracoes: 'NumeracaoLivre',
            bloqueios: 'BloqueioIntervalo',
            movimentacoes: 'MovimentacaoEstoque',
            auditorias: 'Auditoria',
            alertas: 'Alerta',
            notificacoes: 'Notificacao',
            producao_dia: 'ProducaoDia',
            producao_dia_lotes: 'ProducaoDiaLote'
        };

        const transacionais = Object.keys(mapeamento);
        const entidadesAlvo = entidades_para_restaurar || transacionais;
        
        const resultados = {};
        let totalRestaurado = 0;

        for (const chave of entidadesAlvo) {
            const entidade = mapeamento[chave];
            const dados = backup.dados[chave];

            if (!entidade || !dados || !Array.isArray(dados) || dados.length === 0) {
                continue;
            }

            console.log(`[RESTAURAR SHIM] Restaurando ${entidade}: ${dados.length} registros`);

            const dadosLimpos = dados.map(item => {
                const { id, created_at, created_date, updated_at, updated_date, created_by, ...resto } = item;
                return resto;
            });

            try {
                // Usar o novo bulkCreate que adicionaremos ao supabaseClient
                await rdsn.asServiceRole.entities[entidade].bulkCreate(dadosLimpos);
                resultados[chave] = { restaurados: dadosLimpos.length };
                totalRestaurado += dadosLimpos.length;
            } catch (err) {
                console.error(`[RESTAURAR SHIM] Erro em ${entidade}:`, err.message);
                resultados[chave] = { restaurados: 0, erro: err.message };
            }
        }

        return {
            data: {
                sucesso: true,
                mensagem: `Restauração local concluída: ${totalRestaurado} registros`,
                total_restaurado: totalRestaurado,
                detalhes: resultados
            }
        };

    } catch (error) {
        console.error('[RESTAURAR SHIM] Erro crítico:', error);
        return { data: { error: error.message }, status: 500 };
    }
}
