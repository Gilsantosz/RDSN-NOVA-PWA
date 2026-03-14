export async function backupDados(payload, rdsn) {
    console.log('[BACKUP SHIM] Iniciando geração de backup local...');
    try {
        const user = await rdsn.auth.me();
        const userEmail = user?.email || 'Sistema Local';
        const dataBackup = new Date().toISOString();

        // Lista de entidades para backup (mesma do functions/backupDados.ts)
        const entidades = {
            reservas: 'ReservaLote',
            baixas: 'BaixaLote',
            sequencias: 'SequenciaAnual',
            numeracoes: 'NumeracaoLivre',
            bloqueios: 'BloqueioIntervalo',
            produtos: 'Produto',
            clientes: 'Cliente',
            setores: 'Setor',
            movimentacoes: 'MovimentacaoEstoque',
            auditorias: 'Auditoria',
            alertas: 'Alerta',
            notificacoes: 'Notificacao',
            usuarios_internos: 'UsuarioInterno',
            producao_dia: 'ProducaoDia',
            producao_dia_lotes: 'ProducaoDiaLote'
        };

        const dados = {};
        const estatisticas = {};

        for (const [chave, entidade] of Object.entries(entidades)) {
            console.log(`[BACKUP SHIM] Extraindo ${entidade}...`);
            const registros = await rdsn.asServiceRole.entities[entidade].list();
            dados[chave] = registros;
            estatisticas[`total_${chave}`] = registros.length;
        }

        const backup = {
            versao: '1.0-LOCAL',
            data_backup: dataBackup,
            gerado_por: userEmail,
            dados,
            estatisticas
        };

        const backupJson = JSON.stringify(backup, null, 2);
        const totalRegistros = Object.values(dados).reduce(
            (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
            0
        );

        // Simular o upload gerando um Blob URL temporário para o frontend baixar
        const blob = new Blob([backupJson], { type: 'application/json' });
        const dummyUrl = URL.createObjectURL(blob);

        // Registrar no histórico local
        await rdsn.asServiceRole.entities.BackupHistorico.create({
            data_backup: dataBackup,
            status: 'SUCESSO',
            tipo: 'MANUAL_LOCAL',
            total_registros: totalRegistros,
            tamanho_bytes: blob.size,
            arquivo_url: dummyUrl,
            detalhes: JSON.stringify(estatisticas)
        });

        return {
            data: {
                sucesso: true,
                mensagem: 'Backup local realizado com sucesso',
                arquivo_url: dummyUrl,
                total_registros: totalRegistros,
                tamanho_mb: (blob.size / 1024 / 1024).toFixed(2)
            }
        };

    } catch (error) {
        console.error('[BACKUP SHIM] Erro ao gerar backup:', error);
        return { data: { sucesso: false, erro: error.message }, status: 500 };
    }
}
