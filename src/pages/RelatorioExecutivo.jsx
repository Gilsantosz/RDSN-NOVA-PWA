import React, { useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { BarChart3, Target, CircleCheck, Activity } from 'lucide-react';
import { useSetor } from '@/components/context/SetorContext';

export default function RelatorioExecutivo() {
    const { setorAtivo } = useSetor();
    const queryClient = useQueryClient();

    useEffect(() => {
        const unsubReservas = rdsn.entities.ReservaLote.subscribe(() => {
            queryClient.invalidateQueries({ queryKey: ['executivo-reservas'] });
        });
        const unsubBaixas = rdsn.entities.BaixaLote.subscribe(() => {
            queryClient.invalidateQueries({ queryKey: ['executivo-baixas'] });
        });

        return () => {
            if (unsubReservas) unsubReservas();
            if (unsubBaixas) unsubBaixas();
        };
    }, [queryClient]);

    const { data: reservas = [] } = useQuery({
        queryKey: ['executivo-reservas', setorAtivo],
        queryFn: () => rdsn.entities.ReservaLote.list('-created_at', 2000)
    });

    const { data: baixas = [] } = useQuery({
        queryKey: ['executivo-baixas', setorAtivo],
        queryFn: () => rdsn.entities.BaixaLote.list('-created_at', 2000)
    });

    const stats = useMemo(() => {
        const totalReservado = reservas.reduce((s, r) => s + (r.quantidade || 0), 0);
        const totalEntregue = baixas.reduce((s, b) => s + (b.quantidade || 0), 0);
        const taxaAtendimento = totalReservado > 0 ? ((totalEntregue / totalReservado) * 100).toFixed(1) : 0;

        return { totalReservado, totalEntregue, taxaAtendimento };
    }, [reservas, baixas]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                        Dashboard <span className="text-blue-600">Executivo</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Visão Consolidada de Performance</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PremiumCard title="Total Reservado" icon={Target}>
                    <p className="text-4xl font-black italic">{stats.totalReservado.toLocaleString()}</p>
                </PremiumCard>
                <PremiumCard title="Total Entregue" icon={CircleCheck}>
                    <p className="text-4xl font-black italic">{stats.totalEntregue.toLocaleString()}</p>
                </PremiumCard>
                <PremiumCard title="Taxa de Atendimento" icon={Activity}>
                    <p className="text-4xl font-black italic">{stats.taxaAtendimento}%</p>
                </PremiumCard>
            </div>

            <PremiumCard title="Performance por Cliente" icon={BarChart3}>
                <div className="h-80 flex items-center justify-center text-slate-400 italic">
                    Relatórios detalhados sendo processados...
                </div>
            </PremiumCard>
        </div>
    );
}
