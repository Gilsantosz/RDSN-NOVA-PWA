import React, { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { motion } from 'framer-motion';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  AlertTriangle,
  Zap, 
  BarChart3, 
  Activity, 
  RefreshCw, 
  Layers,
  CircleCheck,
  ArrowUpRight,
  History,
  Info
} from "lucide-react";
import { 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Area,
  ComposedChart,
  Line
} from 'recharts';
import { PremiumDashboardCell } from "@/components/ui/PremiumDashboardCell";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Button } from "@/components/ui/button";
import NotificacoesReserva from './NotificacoesReserva';
import AlertasPrazos from './AlertasPrazos';
import SessionManager from '@/lib/sessionManager';
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

const CustomTooltip = ({ active = false, payload = [], label = "" }) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="bg-white/90 dark:bg-slate-950/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 p-5 rounded-[1.5rem] shadow-2xl ring-1 ring-black/5"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
          {label}
        </p>
      </div>
      
      <div className="space-y-3">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-2.5">
              <div 
                className="w-2.5 h-2.5 rounded-full shadow-lg" 
                style={{ backgroundColor: p.color }} 
              />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{p.name}</span>
            </div>
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {p.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default function DashboardReservas({ filtroAno, setFiltroAno, setActiveTab, setFilters }) {
  const { setorAtivo, isAdmin } = useSetor();
  const queryClient = useQueryClient();

  // Membros do time/sessão
  const { data: user } = useQuery({
    queryKey: ['internalUser'],
    queryFn: () => SessionManager.getUser(),
    staleTime: Infinity
  });

  // Consultas de dados
  const { data: reservas = [] } = useQuery({
    queryKey: ['reservas', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.ReservaLote.list('-created_at', 2000);
      }
      return await rdsn.entities.ReservaLote.filter({ setor_id: setorAtivo }, '-created_at', 2000);
    },
    enabled: !!setorAtivo,
    staleTime: 5 * 60 * 1000
  });

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ['movimentacoes-dashboard', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.MovimentacaoEstoque.list('-created_at', 500);
      }
      const produtos = await rdsn.entities.Produto.filter({ setor_id: setorAtivo });
      const produtoIds = produtos.map(p => p.id);
      const todas = await rdsn.entities.MovimentacaoEstoque.list('-created_at', 500);
      return todas.filter(m => produtoIds.includes(m.produto_id));
    },
    enabled: !!setorAtivo,
    staleTime: 5 * 60 * 1000
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
    enabled: !!setorAtivo,
    staleTime: 5 * 60 * 1000
  });

  // Estatísticas calculadas
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
        produzido: porMes[mes].produzido,
        eficiencia: porMes[mes].reservado > 0 ? (porMes[mes].produzido / porMes[mes].reservado) * 100 : 0
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

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['reservas'] });
    queryClient.invalidateQueries({ queryKey: ['movimentacoes-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['auditoria-dashboard'] });
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-12 pb-24"
    >
      {/* Dynamic Header */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 py-6 sticky top-0 z-40 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-3xl -mx-4 px-8 rounded-b-[3rem] border-b border-white/20 dark:border-white/5 shadow-2xl dark:shadow-none">
        <div className="flex items-center gap-6">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: -2 }}
            className="p-4 rounded-[1.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl shadow-blue-500/30 text-white"
          >
            <BarChart3 size={32} strokeWidth={2.5} />
          </motion.div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white leading-tight">
              RDSN <span className="text-blue-500">Analytics</span>
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">
                {setorAtivo === 'ALL' ? 'Monitoramento Global Ativo' : `Setor ${setorAtivo} • Tempo Real`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 self-end xl:self-auto">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <History size={12} /> Período Fiscal
            </span>
            <Select value={filtroAno?.toString()} onValueChange={(v) => setFiltroAno(parseInt(v))}>
              <SelectTrigger className="w-[180px] h-14 rounded-2xl border-white/20 dark:border-white/5 bg-white/50 dark:bg-slate-900/40 backdrop-blur-2xl font-black text-slate-900 dark:text-white shadow-xl ring-1 ring-black/5 hover:bg-white dark:hover:bg-slate-800 transition-all text-base px-6">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-3xl bg-white/95 dark:bg-slate-950/95 p-2 overflow-hidden">
                {[2024, 2025, 2026, 2027].map(ano => (
                  <SelectItem key={ano} value={ano.toString()} className="font-extrabold cursor-pointer py-4 rounded-2xl focus:bg-blue-500/10 dark:text-white text-base">
                    Fiscal {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            variant="outline" 
            size="icon"
            onClick={handleRefresh}
            className="h-14 w-14 rounded-2xl border-white/20 dark:border-white/5 bg-white/50 dark:bg-slate-900/40 shadow-xl ring-1 ring-black/5 hover:shadow-blue-500/20 transition-all active:scale-90 text-blue-500 group"
          >
            <RefreshCw size={24} className="group-hover:rotate-180 transition-transform duration-700" />
          </Button>
        </div>
      </header>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-2">
        <PremiumDashboardCell 
          title="Stock Commitment"
          value={stats.totalReservado.toLocaleString()}
          subValue="Peças Reservadas"
          icon={Layers}
          color="blue"
          delay={0.1}
          onClick={() => setActiveTab && setActiveTab('reservas')}
        />
        <PremiumDashboardCell 
          title="Yield Performance"
          value={stats.totalProduzido.toLocaleString()}
          subValue={`${stats.percentualProduzido}% da meta`}
          icon={CircleCheck}
          color="emerald"
          trend={stats.producaoDia > 0 ? `+${stats.producaoDia}` : null}
          trendType="up"
          delay={0.2}
          onClick={() => setActiveTab && setActiveTab('reservas')}
        />
        <PremiumDashboardCell 
          title="Daily Throughput"
          value={stats.producaoDia.toLocaleString()}
          subValue="Ciclo 24h"
          icon={Zap}
          color="amber"
          delay={0.3}
          onClick={() => setActiveTab && setActiveTab('reservas')}
        />
        <PremiumDashboardCell 
          title="Critical Alerts"
          value={stats.alertasRecentes.length}
          subValue="Pendências"
          icon={AlertTriangle}
          color={stats.alertasRecentes.length > 0 ? "rose" : "slate"}
          delay={0.4}
          onClick={() => {
            if (setFilters) setFilters(prev => ({ ...prev, status: 'atrasada' }));
            if (setActiveTab) setActiveTab('reservas');
          }}
        />
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <motion.div variants={itemVariants} className="xl:col-span-2">
          <PremiumCard 
            title="Produção Consolidada" 
            icon={Activity}
            noPadding
            className="h-full border border-white/20 dark:border-white/5 bg-white/40 dark:bg-slate-950/40 backdrop-blur-3xl shadow-2xl rounded-[3rem] overflow-hidden"
          >
            <div className="p-8 pb-0 flex items-center justify-between mb-8">
               <div>
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Live Analytics</p>
                 <h4 className="text-lg font-black dark:text-white mt-1 uppercase tracking-tighter">Comparativo de Eficiência</h4>
               </div>
               <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Reserva</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Produção</span>
                  </div>
               </div>
            </div>

            <div className="h-[420px] w-full px-4">
              {stats.dadosMensais.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-4"
                >
                  <div className="p-5 rounded-full bg-slate-100 dark:bg-slate-800/50 ring-1 ring-black/5 dark:ring-white/5">
                    <Activity size={32} className="opacity-50" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">Nenhum dado de produção</p>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mt-1 opacity-70">Aguardando movimentações neste período fiscal</p>
                  </div>
                </motion.div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={stats.dadosMensais} margin={{ top: 20, right: 20, left: 0, bottom: 40 }}>
                    <defs>
                      <linearGradient id="colorReserva" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProducao" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                    <XAxis 
                      dataKey="mes" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                      dy={20}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                      tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(59, 130, 246, 0.2)', strokeWidth: 2 }} />
                    
                    <Area 
                      type="monotone" 
                      dataKey="reservado" 
                      name="Reserva" 
                      stroke="#3b82f6" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorReserva)" 
                      animationDuration={2000}
                    />
                    
                    <Bar 
                      dataKey="produzido" 
                      name="Produção" 
                      fill="#10b981" 
                      radius={[10, 10, 0, 0]} 
                      barSize={32}
                    />

                    <Line 
                      type="monotone" 
                      dataKey="eficiencia" 
                      name="Eficiência %" 
                      stroke="#f59e0b" 
                      strokeWidth={3} 
                      dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4, stroke: '#fff' }}
                      yAxisId="right"
                    />
                    <YAxis yAxisId="right" orientation="right" hide />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </PremiumCard>
        </motion.div>

        <motion.div variants={itemVariants} className="xl:col-span-1">
          <PremiumCard 
            title="Resumo Operacional" 
            icon={Info}
            className="h-full border border-white/20 dark:border-white/5 bg-white/40 dark:bg-slate-950/40 backdrop-blur-3xl shadow-2xl rounded-[3rem]"
          >
            <div className="space-y-10">
               <div className="p-6 rounded-[2rem] bg-slate-900 shadow-2xl shadow-slate-950 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                    <Activity size={80} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Status Geral</p>
                  <h3 className="text-3xl font-black mt-2 tracking-tighter">
                    {stats.percentualProduzido}% <span className="text-slate-500 text-lg">DONE</span>
                  </h3>
                  <div className="mt-8 h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.percentualProduzido}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]" 
                    />
                  </div>
                  <p className="text-[10px] font-bold mt-4 text-slate-500">
                    Faltam <span className="text-white">{(stats.totalReservado - stats.totalProduzido).toLocaleString()}</span> peças para meta
                  </p>
               </div>

               <div className="space-y-6">
                 <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-white/5 pb-4 px-2">Insights Recentes</h5>
                 {[
                   { label: 'Lotes em Produção', value: stats.lotesEmProducao.length, color: 'text-blue-500' },
                   { label: 'Média de Produção/Mês', value: Math.round(stats.totalProduzido / (stats.dadosMensais.length || 1)), color: 'text-emerald-500' },
                   { label: 'Anomalias Identificadas', value: stats.alertasRecentes.length, color: stats.alertasRecentes.length > 0 ? 'text-rose-500' : 'text-slate-400' }
                 ].map((item, i) => (
                   <div key={i} className="flex items-center justify-between px-2 group hover:translate-x-1 transition-transform">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{item.label}</span>
                      <span className={cn("text-xl font-black tracking-tighter", item.color)}>{item.value}</span>
                   </div>
                 ))}
               </div>
               
               <div className="pt-4">
                  <Button variant="ghost" className="w-full h-14 rounded-2xl border border-slate-200 dark:border-white/5 font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 dark:hover:bg-slate-900 group">
                    Exportar Relatório Executive <ArrowUpRight size={14} className="ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </Button>
               </div>
            </div>
          </PremiumCard>
        </motion.div>
      </div>

      {/* Notifications and Alerts */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3">
          <NotificacoesReserva userId={user?.id || 'GLOBAL'} />
        </div>
        <div className="lg:col-span-2">
          <AlertasPrazos reservas={reservas.filter(r => !filtroAno || r.ano === filtroAno)} userId={user?.id || 'GLOBAL'} />
        </div>
      </motion.div>
    </motion.div>
  );
}