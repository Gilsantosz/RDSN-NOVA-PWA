export async function redefinirParaCopia(payload, rdsn) {
    console.log('[REDEFINIR SHIM] Iniciando execução local...', payload);
    try {
        const { confirmar_codigo } = payload;

        console.log('[REDEFINIR SHIM] Verificando sessão...');
        const user = await rdsn.auth.me();
        console.log('[REDEFINIR SHIM] Usuário identificado:', user?.email, 'Role:', user?.role);

        if (!user || user.role !== 'admin') {
            console.error('[REDEFINIR SHIM] Acesso negado: Usuário não é admin');
            return { data: { error: 'Não autorizado - apenas admins' }, status: 403 };
        }

        if (confirmar_codigo !== 'REDEFINIR-SISTEMA') {
            return {
                data: {
                    error: 'Código de confirmação inválido. Digite REDEFINIR-SISTEMA para confirmar.',
                    requer_confirmacao: true
                }, status: 400
            };
        }

        console.log('[REDEFINIR SHIM] Iniciando limpeza massiva de dados transacionais...');

        // Entidades transacionais que devem ser limpas
        const entidadesTransacionais = [
            'ReservaLote',
            'BaixaLote',
            'SequenciaAnual',
            'NumeracaoLivre',
            'BloqueioIntervalo',
            'MovimentacaoEstoque',
            'Auditoria',
            'Alerta',
            'Notificacao',
            'ProducaoDia',
            'ProducaoDiaLote',
            'PCPOrdemProducao',
            'PCPProducaoDiaria',
            'PCPSimulacao',
            'BackupHistorico',
            'HistoricoAuditoria',
            'AuditoriaUsuarios',
            'Etiqueta',
            'LogIntegracao'
        ];

        const resultados = {};
        let totalRemovido = 0;

        for (const entidade of entidadesTransacionais) {
            console.log(`[REDEFINIR SHIM] Limpando entidade: ${entidade}...`);
            try {
                // Obter ids para informar no log, mas apagar tudo de uma vez
                const registros = await rdsn.asServiceRole.entities[entidade].list();
                const qtd = registros.length;

                if (qtd > 0) {
                    // Em vez de loop, apagar todos de uma vez (Supabase permite delete condicional)
                    // Mas como o mock asServiceRole.entities não tem deleteAll, 
                    // vamos fazer em pedaços de 50 para não estourar mas ser rápido
                    const ids = registros.map(r => r.id);
                    const chunkSize = 50;
                    for (let i = 0; i < ids.length; i += chunkSize) {
                        const chunk = ids.slice(i, i + chunkSize);
                        for (const id of chunk) {
                            await rdsn.asServiceRole.entities[entidade].delete(id);
                        }
                        console.log(`[REDEFINIR SHIM] ${entidade}: Limpando... ${i + chunk.length}/${qtd}`);
                    }

                    resultados[entidade] = { removidos: qtd };
                    totalRemovido += qtd;
                    console.log(`[REDEFINIR SHIM] ${entidade}: OK! ${qtd} registros removidos`);
                } else {
                    resultados[entidade] = { removidos: 0 };
                }
            } catch (err) {
                console.error(`[REDEFINIR SHIM] Erro ao limpar ${entidade}:`, err.message);
                resultados[entidade] = { removidos: 0, erro: err.message };
            }
        }

        console.log(`[REDEFINIR SHIM] Concluído com Sucesso! Total removido: ${totalRemovido}`);

        return {
            data: {
                success: true,
                mensagem: `Sistema redefinido localmente: ${totalRemovido} registros removidos.`,
                total_removido: totalRemovido,
                detalhes: resultados
            }
        };

    } catch (error) {
        console.error('[REDEFINIR SHIM] Erro crítico catastrófico:', error);
        return { data: { error: error.message || 'Erro interno no simulador' }, status: 500 };
    }
}
