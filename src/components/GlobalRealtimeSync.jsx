import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useRealtime } from '@/lib/RealtimeContext';

export function GlobalRealtimeSync() {
    const queryClient = useQueryClient()
    const { isAuthenticated } = useAuth()
    const { setStatus } = useRealtime()

    useEffect(() => {
        if (!isAuthenticated) {
            setStatus('DISCONNECTED');
            return;
        }

        console.log('[REALTIME] Iniciando monitoramento global...');
        setStatus('CONNECTING');

        let timeout;

        const safeInvalidate = (table, event) => {
            clearTimeout(timeout)
            console.log(`[SYNC] Alteração em ${table} (${event}). Agendando atualização...`)
            timeout = setTimeout(() => {
                console.log('[SYNC] Executando atualização das estatísticas do Dashboard...')
                
                // Invalida todas as queries que começam com as chaves conhecidas do Dashboard
                const dashboardKeys = [
                    'reservas',
                    'reservas-dashboard',
                    'reservas-producao',
                    'dashboard',
                    'baixas',
                    'produtos',
                    'clientes',
                    'movimentacoes-dashboard',
                    'auditoria-dashboard',
                    'baixas-dashboard',
                    'sequencias',
                    'sequencias-dashboard',
                    'pcp-ops-dashboard',
                    'pcp-producoes-dashboard',
                    'setores-dashboard'
                ];

                queryClient.invalidateQueries({
                    predicate: query => {
                        const firstKey = query.queryKey[0];
                        const shouldInvalidate = dashboardKeys.includes(firstKey);
                        if (shouldInvalidate) {
                            console.log(`[SYNC] Invalidando: ${query.queryKey.join(' -> ')}`);
                        }
                        return shouldInvalidate;
                    },
                    refetchType: 'active' // Força refetch apenas das queries visíveis na tela
                });
            }, 500) // Aumentado para 500ms para agrupar mais alterações
        }

        const tables = [
            'ReservaLote', 
            'BaixaLote', 
            'Produto', 
            'Cliente', 
            'MovimentacaoEstoque', 
            'PCPOrdemProducao', 
            'SequenciaAnual', 
            'Auditoria'
        ]

        const channel = supabase.channel('global-sync-v2')

        tables.forEach(table => {
            channel.on(
                'postgres_changes',
                { event: '*', schema: 'public', table },
                (payload) => {
                    console.log(`[REALTIME] Mudança em ${table}:`, payload.eventType)
                    safeInvalidate(table, payload.eventType)
                }
            )
        })

        channel.subscribe(status => {
            console.log(`[REALTIME] Status da inscrição: ${status}`);
            setStatus(status === 'SUBSCRIBED' ? 'CONNECTED' : (status === 'CHANNEL_ERROR' ? 'ERROR' : 'DISCONNECTED'));
            
            if (status === 'SUBSCRIBED') {
                console.log('[REALTIME] Conectado com sucesso. Monitorando:', tables.join(', '))
            }
            if (status === 'CHANNEL_ERROR') {
                console.error('[REALTIME] Erro crítico na conexão. Verifique permissões de Realtime no Supabase.');
            }
        })

        return () => {
            clearTimeout(timeout)
            console.log('[REALTIME] Finalizando monitoramento...');
            supabase.removeChannel(channel)
        }
    }, [queryClient, isAuthenticated, setStatus])

    return null
}
