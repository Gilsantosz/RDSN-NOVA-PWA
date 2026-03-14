import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

export function GlobalRealtimeSync() {
    const queryClient = useQueryClient()
    const { isAuthenticated } = useAuth()

    useEffect(() => {
        if (!isAuthenticated) return

        console.log('Realtime iniciado')

        let timeout

        const safeInvalidate = () => {
            clearTimeout(timeout)
            timeout = setTimeout(() => {
                queryClient.invalidateQueries({
                    predicate: query =>
                        [
                            'reservas',
                            'reservas-producao',
                            'dashboard',
                            'baixas',
                            'produtos',
                            'clientes'
                        ].includes(query.queryKey[0])
                })
            }, 300)
        }

        const channel = supabase
            .channel('global-sync')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'ReservaLote' },
                safeInvalidate
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'ReservaLote' },
                safeInvalidate
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'BaixaLote' },
                safeInvalidate
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'BaixaLote' },
                safeInvalidate
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'Produto' },
                safeInvalidate
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'Cliente' },
                safeInvalidate
            )
            .subscribe(status => {
                if (status === 'SUBSCRIBED') {
                    console.log('Realtime conectado')
                }
            })

        return () => {
            clearTimeout(timeout)
            supabase.removeChannel(channel)
        }
    }, [queryClient, isAuthenticated])

    return null
}
