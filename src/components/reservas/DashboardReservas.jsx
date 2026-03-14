// @ts-nocheck
import React, { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Package, CircleCheck, AlertTriangle,
  PlayCircle, Clock, Zap, BarChart3, Activity, RefreshCw, Layers, Calendar
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import NotificacoesReserva from './NotificacoesReserva';
import AlertasPrazos from './AlertasPrazos';
import SessionManager from '@/lib/sessionManager';



export default function DashboardReservas({ filtroAno, setFiltroAno, sequencias = [] }) {
  const { setorAtivo, isAdmin } = useSetor();
  const queryClient = useQueryClient();

  // Obter usuário atual de forma segura
  const { data: user } = useQuery({
    queryKey: ['internalUser'],
    queryFn: () => SessionManager.getUser(),
    staleTime: Infinity
  });

  const { data: reservas = [] } = useQuery({
    queryKey: ['reservas', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.ReservaLote.list('-created_at', 2000);
      }
      return await rdsn.entities.ReservaLote.filter({ setor_id: setorAtivo }, '-created_at', 2000);
    },
    enabled: !!setorAtivo
  });

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ['movimentacoes-dashboard', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.MovimentacaoEstoque.list('-created_at', 500);
      }
      // Filtrar por produtos do setor se não for admin/ALL
      const produtos = await rdsn.entities.Produto.filter({ setor_id: setorAtivo });
      const produtoIds = produtos.map(p => p.id);
      const todas = await rdsn.entities.MovimentacaoEstoque.list('-created_at', 500);
      return todas.filter(m => produtoIds.includes(m.produto_id));
    },
    enabled: !!setorAtivo
  });

  const { data: auditoria = [] } = useQuery({
    queryKey: ['auditoria-dashboard', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.Auditoria.list('-created_at', 50);
      }
      const todas = await rdsn.entities.Auditoria.list('-created_at', 50);
      const seqs = await rdsn.entities.SequenciaAnual.filter({ setor_id: setorAtivo });
      const letras = [...new Set(seqs.map(s => s.letra_produto))];
      return todas.filter(a => letras.includes(a.letra_produto));
    },
    enabled: !!setorAtivo
  });

  const stats = useMemo(() => {
    const hojeString = new Date().toDateString();
    const filtradas = reservas.filter(r => !filtroAno || r.ano === filtroAno);

    const producaoDia = movimentacoes
      .filter(m => m.tipo === 'PRODUCAO' && new Date(m.created_at).toDateString() === hojeString)
      .reduce((acc, m) => acc + (m.quantidade || 0), 0);

    const ultimas24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const alertasRecentes = auditoria.filter(a =>
      new Date(a.created_at) >= ultimas24h &&
      ['RESERVA_CANCELADA', 'ANO_ENCERRADO'].includes(a.acao)
    );

    const lotesEmProducao = filtradas.filter(r => r.status === 'EM_PRODUCAO');

    const totalReservado = filtradas.reduce((acc, r) => acc + (r.quantidade || 0), 0);
    const totalProduzido = filtradas.reduce((acc, r) => acc + (r.quantidade_baixada || 0), 0);

    const porMes = filtradas.reduce((acc, r) => {
      const mes = r.mes_producao || 'Sem Mês';
      if (!acc[mes]) acc[mes] = { reservado: 0, produzido: 0 };
      acc[mes].reservado += r.quantidade || 0;
      acc[mes].produzido += r.quantidade_baixada || 0;
      return acc;
    }, {});

    const mesesOrdenados = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const dadosMensais = mesesOrdenados
      .filter(mes => porMes[mes])
      .map(mes => ({
        mes,
        reservado: porMes[mes].reservado,
        produzido: porMes[mes].produzido
      }));

    return {
      producaoDia,
      alertasRecentes,
      lotesEmProducao,
      totalReservado,
      totalProduzido,
      dadosMensais,
      percentualProduzido: totalReservado > 0 ? Math.round((totalProduzido / totalReservado) * 100) : 0
    };
  }, [reservas, filtroAno, movimentacoes, auditoria]);

  const anosDisponiveis = useMemo(() =>
    [...new Set(sequencias.map(s => s.ano))].sort((a, b) => b - a),
    [sequencias]
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Dynamic Header Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.15),transparent)] pointer-events-none" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.4)] transition-all hover:rotate-6 active:scale-95 group">
              <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                Intelligence <span className="text-blue-600 dark:text-blue-400">Dashboard</span>
              </h1>
              <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] italic opacity-80 flex items-center gap-2">
                <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
                Análise de Performance Operacional
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-950/60 p-2 rounded-[1.5rem] border border-slate-200 dark:border-white/10 shadow-inner">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['reservas'] });
                queryClient.invalidateQueries({ queryKey: ['movimentacoes-dashboard'] });
                queryClient.invalidateQueries({ queryKey: ['auditoria-dashboard'] });
                toast.success('Sync finalizado com êxito!');
              }}
              className="w-12 h-12 rounded-2xl hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-500 hover:text-blue-500 active:rotate-180 duration-500"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>

            <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-1" />

            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/50 dark:border-white/5">
              <Calendar className="w-4 h-4 text-blue-500" />
              <Select value={filtroAno ? String(filtroAno) : 'all'} onValueChange={(v) => setFiltroAno(v === 'all' ? null : Number(v))}>
                <SelectTrigger className="w-[120px] bg-transparent border-0 focus:ring-0 font-black uppercase text-[10px] tracking-widest h-8 px-0">
                  <SelectValue placeholder="Temporada" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-white/10 backdrop-blur-xl">
                  <SelectItem value="all" className="font-bold uppercase text-[10px]">Todos Anos</SelectItem>
                  {anosDisponiveis.map(ano => (
                    <SelectItem key={ano} value={String(ano)} className="font-bold uppercase text-[10px]">Temporada 20{ano}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Section with Enhanced Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <PremiumCard className="relative group overflow-hidden border-0 bg-white dark:bg-slate-900/60 shadow-xl">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Package className="w-20 h-20 -rotate-12" />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-sm">
                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Volume Reservado</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">{stats.totalReservado.toLocaleString()}</h3>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em] italic opacity-60">unidades bloqueadas na safra</p>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="relative group overflow-hidden border-0 bg-white dark:bg-slate-900/60 shadow-xl">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <CircleCheck className="w-20 h-20 -rotate-12" />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-sm">
                  <CircleCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Efetiva Produção</span>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-black italic px-3">{stats.percentualProduzido}%</Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">{stats.totalProduzido.toLocaleString()}</h3>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em] italic opacity-60">unidades baixadas no estoque</p>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="relative group overflow-hidden border-0 bg-white dark:bg-slate-900/60 shadow-xl border-b-4 border-amber-500/50">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap className="w-20 h-20 -rotate-12" />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-sm">
                <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Coleta Realtime</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">{stats.producaoDia.toLocaleString()}</h3>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em] italic opacity-60">processadas nas últimas 24h</p>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="relative group overflow-hidden border-0 bg-white dark:bg-slate-900/60 shadow-xl border-b-4 border-indigo-500/50">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Layers className="w-20 h-20 -rotate-12" />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-sm">
                <PlayCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Lotes em Atividade</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">{stats.lotesEmProducao.length}</h3>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em] italic opacity-60">unidades logísticas em fila</p>
            </div>
          </div>
        </PremiumCard>
      </div>

      {/* Analytics Visualization and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <PremiumCard title="Distribuição Cronológica de Produção" icon={Activity} className="h-full">
            <div className="h-[400px] mt-8">
              {stats.dadosMensais.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.dadosMensais} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorReservado" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorProduzido" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(203, 213, 225, 0.2)" />
                    <XAxis
                      dataKey="mes"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8', transform: 'translate(0, 10)' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                      contentStyle={{
                        background: 'rgba(15, 23, 42, 0.9)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: '1.5rem',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        padding: '1.5rem'
                      }}
                      itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '8px', fontWeight: 'black', textTransform: 'uppercase' }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', paddingBottom: '20px', letterSpacing: '0.1em' }}
                    />
                    <Bar dataKey="reservado" name="Previsto" fill="url(#colorReservado)" radius={[8, 8, 0, 0]} barSize={30} />
                    <Bar dataKey="produzido" name="Realizado" fill="url(#colorProduzido)" radius={[8, 8, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                    <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic leading-relaxed">Matriz de dados vazia para o ciclo selecionado</p>
                </div>
              )}
            </div>
          </PremiumCard>
        </div>

        <div className="space-y-6">
          <PremiumCard title="Audit Log Recente" icon={AlertTriangle} className="h-full bg-red-500/5 border-red-500/10">
            <div className="space-y-4 mt-6">
              {stats.alertasRecentes.length > 0 ? (
                stats.alertasRecentes.slice(0, 6).map(alerta => (
                  <div key={alerta.id} className="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-red-500/50 before:rounded-full group hover:before:bg-red-500 transition-all">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider italic flex items-center gap-2">
                        {alerta.acao === 'RESERVA_CANCELADA' ? 'Anulação de Lote' : 'Encerramento de Safra'}
                        <Clock className="w-2.5 h-2.5 opacity-60" />
                        {alerta.created_at ? new Date(alerta.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </p>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight group-hover:text-red-500 transition-colors">
                        ID: {alerta.letra_produto}{alerta.ano}
                      </h4>
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{alerta.created_by || 'Sistema Central'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center space-y-4">
                  <CircleCheck className="w-12 h-12 text-emerald-500/20 mx-auto" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Nenhuma anomalia crítica detectada</p>
                </div>
              )}
            </div>
            {stats.alertasRecentes.length > 0 && (
              <Button variant="ghost" className="w-full mt-6 rounded-[1.2rem] h-12 border-dashed border-red-500/30 text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all">
                Ver Auditoria Completa
              </Button>
            )}
          </PremiumCard>
        </div>
      </div>

      {/* Notifications and Overdue Management */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <NotificacoesReserva userId={user?.id || 'GLOBAL'} />
        </div>
        <div className="lg:col-span-2">
          <AlertasPrazos reservas={reservas.filter(r => !filtroAno || r.ano === filtroAno)} userId={user?.id || 'GLOBAL'} />
        </div>
      </div>
    </div>
  );
}