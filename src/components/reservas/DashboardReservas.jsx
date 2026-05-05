import React, { useMemo, useEffect } from 'react';
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
import { normalizeYear } from '@/utils';
import { useRealtime } from '@/lib/RealtimeContext';

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
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] opacity-40 italic">PCP Matrix • Algoritmo de Alocação v4.2 Pro Ativo</p>
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
  const { status: realtimeStatus } = useRealtime();

  // Sincronismo agora é gerenciado pelo GlobalRealtimeSync de forma centralizada
  // Isso remove redundância e garante que todos os componentes atualizem juntos

  // Membros do time/sessão
  const { data: user } = useQuery({
    queryKey: ['internalUser'],
    queryFn: () => SessionManager.getUser(),
    staleTime: Infinity
  });

  // Buscar lista de setores para exibir nomes amigáveis
  const { data: setores = [] } = useQuery({
    queryKey: ['setores-dashboard'],
    queryFn: () => rdsn.entities.Setor.list(),
    staleTime: Infinity
  });

  const setorNome = useMemo(() => {
    if (setorAtivo === 'ALL') return 'Global';
    const setor = setores.find(s => s.id === setorAtivo);
    return setor?.nome || `Setor ${setorAtivo}`;
  }, [setores, setorAtivo]);

  // Consultas de dados — filtradas por setor quando um setor específico está ativo
  const isGlobal = !setorAtivo || setorAtivo === 'ALL';

  const { data: reservas = [] } = useQuery({
    queryKey: ['reservas-dashboard', setorAtivo],
    queryFn: async () => {
      const data = isGlobal
        ? await rdsn.entities.ReservaLote.list('-created_at', 5000)
        : await rdsn.entities.ReservaLote.filter({ setor_id: setorAtivo }, '-created_at', 5000);
      console.log("[DASHBOARD] Dados de Reservas:", data?.length || 0, '| Setor:', setorAtivo);
      return data;
    },
    enabled: !!setorAtivo,
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  // MovimentacaoEstoque removida: producaoDia agora usa apenas BaixaLote (evita dupla contagem)

  const { data: auditoria = [] } = useQuery({
    queryKey: ['auditoria-dashboard', setorAtivo],
    queryFn: async () => {
      if (isGlobal) {
        return await rdsn.entities.Auditoria.list('-created_at', 50);
      }
      // Para setor específico: filtra pela letra do produto ligada ao setor
      const seqs = await rdsn.entities.SequenciaAnual.filter({ setor_id: setorAtivo });
      const letras = [...new Set(seqs.map(s => s.letra_produto))];
      const todas = await rdsn.entities.Auditoria.list('-created_at', 50);
      return todas.filter(a => letras.includes(a.letra_produto));
    },
    enabled: !!setorAtivo,
    staleTime: 0
  });

  const { data: pcpOps = [] } = useQuery({
    queryKey: ['pcp-ops-dashboard', setorAtivo],
    queryFn: async () => {
      const data = isGlobal
        ? await rdsn.entities.PCPOrdemProducao.list('-created_at', 3000)
        : await rdsn.entities.PCPOrdemProducao.filter({ setor_id: setorAtivo }, '-created_at', 3000);
      console.log("[DASHBOARD] Dados de PCP OPs:", data?.length || 0, '| Setor:', setorAtivo);
      return data;
    },
    enabled: !!setorAtivo,
    staleTime: 0
  });

  const { data: sequencias = [] } = useQuery({
    queryKey: ['sequencias-dashboard', setorAtivo],
    queryFn: async () => {
      return isGlobal
        ? await rdsn.entities.SequenciaAnual.list()
        : await rdsn.entities.SequenciaAnual.filter({ setor_id: setorAtivo });
    },
    enabled: !!setorAtivo,
    staleTime: Infinity
  });

  const { data: baixas = [] } = useQuery({
    queryKey: ['baixas-dashboard', setorAtivo],
    queryFn: async () => {
      const data = isGlobal
        ? await rdsn.entities.BaixaLote.list('-created_at', 3000)
        : await rdsn.entities.BaixaLote.filter({ setor_id: setorAtivo }, '-created_at', 3000);
      console.log("[DASHBOARD] Dados de Baixas:", data?.length || 0, '| Setor:', setorAtivo);
      return data;
    },
    enabled: !!setorAtivo,
    staleTime: 0
  });

  // Estatísticas calculadas de forma otimizada para lidar com grandes volumes
  const stats = useMemo(() => {
    console.log("[DASHBOARD] Recalculando estatísticas...");
    // 1. Otimização de filtros básicos - Comparação flexível (String ou Number)
    const preFiltradas = filtroAno 
      ? reservas.filter(r => normalizeYear(r.ano) === normalizeYear(filtroAno)) 
      : reservas;
    
    // Filtro para ignorar reservas canceladas e reservas com OPs Canceladas
    const filtradas = preFiltradas.filter(r => {
      if (r.status === 'CANCELADO') return false;
      
      if (pcpOps && pcpOps.length > 0 && r.codigo_produto) {
        const opVinculada = pcpOps.find(op => 
          op.codigo_produto && 
          op.codigo_produto.toLowerCase().trim() === r.codigo_produto.toLowerCase().trim()
        );
        if (opVinculada && opVinculada.status === 'Cancelado') {
          return false;
        }
      }
      return true;
    });

    const hojeString = new Date().toDateString();
    const ultimas24h = Date.now() - 24 * 60 * 60 * 1000;
    const acoesRelevantes = new Set(['RESERVA_CANCELADA', 'ANO_ENCERRADO']);

    // 2. Loop único para movimentações (evita filter seguido de reduce e recriação de Date)
    let producaoDia = 0;
    // Usar APENAS BaixaLote como fonte de verdade para produção do dia
    // (MovimentacaoEstoque tipo=PRODUCAO é sempre criada junto com BaixaLote, gerando dupla contagem)
    for (const b of baixas) {
      if (new Date(b.created_at).toDateString() === hojeString) {
        producaoDia += Number(b.quantidade || 0);
      }
    }

    // 3. Loop único para auditoria com data otimizada
    const alertasRecentes = auditoria.filter(a =>
      new Date(a.created_at).getTime() >= ultimas24h && acoesRelevantes.has(a.acao)
    );

    // 4. Loop único processando as milhares de reservas sem recriar arrays
    let totalReservado = 0;
    let totalProduzido = 0;
    const lotesEmProducao = [];
    const porMes = {};
    const mesesOrdenados = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    // Mapa de índice de mês (0-11) → nome pt-BR para lookup rápido
    const mesNomes = mesesOrdenados;

    for (const r of filtradas) {
      if (r.status === 'EM_PRODUCAO') {
        lotesEmProducao.push(r);
      }
      
      const q = Number(r.quantidade || 0);
      const qb = Number(r.quantidade_baixada || 0);
      
      totalReservado += q;
      totalProduzido += qb;

      // Prioriza mes_producao; se ausente, usa o mês de criação da reserva
      let mes = null;
      if (r.mes_producao && r.mes_producao.trim() !== '') {
        // Normaliza capitalização (ex: "janeiro" → "Janeiro")
        const mesCap = r.mes_producao.trim().charAt(0).toUpperCase() + r.mes_producao.trim().slice(1).toLowerCase();
        if (mesesOrdenados.includes(mesCap)) {
          mes = mesCap;
        } else {
          mes = r.mes_producao.trim(); // mantém original se for outro formato
        }
      } else if (r.created_at) {
        // Fallback: extrai mês do timestamp de criação
        mes = mesNomes[new Date(r.created_at).getMonth()];
      }
      
      if (mes) {
        if (!porMes[mes]) porMes[mes] = { reservado: 0, produzido: 0 };
        porMes[mes].reservado += q;
        porMes[mes].produzido += qb;
      }
    }

    // Ordena pelos meses do calendário e inclui qualquer mês extra encontrado ao final
    const dadosMensais = [
      ...mesesOrdenados.filter(mes => porMes[mes]),
      ...Object.keys(porMes).filter(mes => !mesesOrdenados.includes(mes))
    ].map(mes => ({
      mes,
      reservado: porMes[mes].reservado,
      produzido: porMes[mes].produzido,
      eficiencia: porMes[mes].reservado > 0 ? Math.round((porMes[mes].produzido / porMes[mes].reservado) * 100) : 0
    }));

    const rawPercentual = totalReservado > 0 ? Math.round((totalProduzido / totalReservado) * 100) : 0;
    const percentualProduzido = Math.min(100, rawPercentual); // Impede o overflow visual na barra se for > 100%

    return {
      producaoDia,
      alertasRecentes,
      lotesEmProducao,
      totalReservado,
      totalProduzido,
      dadosMensais,
      rawPercentual,
      percentualProduzido,
      lastUpdate: new Date().toLocaleTimeString('pt-BR')
    };
  }, [reservas, filtroAno, auditoria, baixas, pcpOps, setorAtivo]);

  useEffect(() => {
    console.log("[DASHBOARD] Stats atualizado:", stats.lastUpdate, {
      totalReservado: stats.totalReservado,
      totalProduzido: stats.totalProduzido,
      producaoDia: stats.producaoDia
    });
  }, [stats]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['reservas-dashboard', setorAtivo] });
    queryClient.invalidateQueries({ queryKey: ['auditoria-dashboard', setorAtivo] });
    queryClient.invalidateQueries({ queryKey: ['baixas-dashboard', setorAtivo] });
    queryClient.invalidateQueries({ queryKey: ['pcp-ops-dashboard', setorAtivo] });
    queryClient.invalidateQueries({ queryKey: ['sequencias-dashboard', setorAtivo] });
    queryClient.invalidateQueries({ queryKey: ['setores-dashboard'] });
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
              Matrix <span className="text-blue-500">Analytics</span>
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="relative flex h-2 w-2">
                <span className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  realtimeStatus === 'CONNECTED' ? "bg-emerald-400" : (realtimeStatus === 'ERROR' ? "bg-rose-400" : "bg-amber-400")
                )}></span>
                <span className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  realtimeStatus === 'CONNECTED' ? "bg-emerald-500" : (realtimeStatus === 'ERROR' ? "bg-rose-500" : "bg-amber-500")
                )}></span>
              </span>
              <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                <span className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  realtimeStatus === 'CONNECTED' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : (realtimeStatus === 'ERROR' ? "bg-rose-500" : "bg-amber-500")
                )} />
                {realtimeStatus === 'CONNECTED' 
                  ? (setorAtivo === 'ALL' ? 'Monitoramento Global Ativo' : `${setorNome} • Tempo Real`)
                  : (realtimeStatus === 'CONNECTING' ? 'Conectando ao Matrix...' : 'Matrix Offline')}
                <span className="bg-slate-200 dark:bg-white/10 px-2 py-0.5 rounded text-[9px] text-slate-500 dark:text-slate-400">
                  Sincronizado: {stats.lastUpdate}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 self-end xl:self-auto">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <History size={12} /> Período Fiscal
            </span>
            <Select 
              value={filtroAno ? normalizeYear(filtroAno) : 'all'} 
              onValueChange={(v) => setFiltroAno(v === 'all' ? null : normalizeYear(v))}
            >
              <SelectTrigger className="w-[180px] h-14 rounded-2xl border-white/20 dark:border-white/5 bg-white/50 dark:bg-slate-900/40 backdrop-blur-2xl font-black text-slate-900 dark:text-white shadow-xl ring-1 ring-black/5 hover:bg-white dark:hover:bg-slate-800 transition-all text-base px-6">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-3xl bg-white/95 dark:bg-slate-950/95 p-2 overflow-hidden">
                <SelectItem value="all" className="font-extrabold cursor-pointer py-4 rounded-2xl focus:bg-blue-500/10 dark:text-white text-base">
                  Todos os Anos
                </SelectItem>
                {[...new Set(sequencias.map(s => normalizeYear(s.ano)))].sort((a, b) => Number(b) - Number(a)).map(ano => (
                  <SelectItem key={ano} value={ano} className="font-extrabold cursor-pointer py-4 rounded-2xl focus:bg-blue-500/10 dark:text-white text-base">
                    Fiscal 20{ano}
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
          subValue={`${stats.rawPercentual}% da meta`}
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
                    {stats.rawPercentual}% <span className="text-slate-500 text-lg">DONE</span>
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
                    {stats.totalProduzido >= stats.totalReservado 
                      ? <span className="text-emerald-400">Meta concluída!</span>
                      : <>Faltam <span className="text-white">{(stats.totalReservado - stats.totalProduzido).toLocaleString()}</span> peças para meta</>
                    }
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
          <AlertasPrazos reservas={reservas.filter(r => !filtroAno || normalizeYear(r.ano) === normalizeYear(filtroAno))} userId={user?.id || 'GLOBAL'} />
        </div>
      </motion.div>
    </motion.div>
  );
}