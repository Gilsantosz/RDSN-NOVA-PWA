// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { Package, TrendingUp, AlertTriangle, CircleCheck, Clock, BarChart3, XCircle, PlayCircle, Zap, Activity, Users, Target, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ProducaoChart from '../components/charts/ProducaoChart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PremiumCard } from '@/components/ui/PremiumCard';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { PageTransition, SlideIn } from "@/components/ui/page-transition";
import { useSetor } from '@/components/context/SetorContext';
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear() % 100);
  const { setorAtivo, isAdmin } = useSetor();

  const { data: reservas = [], isLoading: loadingReservas } = useQuery({
    queryKey: ['reservas', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.ReservaLote.list('-created_at', 1000);
      }
      return await rdsn.entities.ReservaLote.filter({ setor_id: setorAtivo }, '-created_at', 1000);
    },
    enabled: !!setorAtivo
  });

  const { data: sequencias = [], isLoading: loadingSequencias } = useQuery({
    queryKey: ['sequencias', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.SequenciaAnual.list();
      }
      return await rdsn.entities.SequenciaAnual.filter({ setor_id: setorAtivo });
    },
    enabled: !!setorAtivo
  });
  const { data: movimentacoes = [], isLoading: loadingMovimentacoes } = useQuery({
    queryKey: ['movimentacoes-dashboard', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && (setorAtivo === 'ALL' || setorAtivo === 'TODOS')) {
        return await rdsn.entities.MovimentacaoEstoque.list('-created_at', 500);
      }

      // Filtrar por produtos do setor
      const produtos = await rdsn.entities.Produto.filter({ setor_id: setorAtivo });
      const produtoIds = produtos.map(p => p.id);
      const todasMov = await rdsn.entities.MovimentacaoEstoque.list('-created_at', 500);
      return todasMov.filter(m => (m.produto_id && produtoIds.includes(m.produto_id)) || (m.setor_id === setorAtivo));
    },
    enabled: !!setorAtivo
  });


  const { data: pcpOps = [] } = useQuery({
    queryKey: ['pcp-ops-dashboard', setorAtivo],
    queryFn: async () => {
      if (!setorAtivo || setorAtivo === 'ALL') {
        return rdsn.entities.PCPOrdemProducao.list('-created_at', 2000);
      }
      return rdsn.entities.PCPOrdemProducao.filter({ setor_id: setorAtivo }, '-created_at', 2000);
    },
    enabled: !!setorAtivo
  });

  const { data: pcpProducoes = [] } = useQuery({
    queryKey: ['pcp-producoes-dashboard', setorAtivo],
    queryFn: async () => {
      if (!setorAtivo || setorAtivo === 'ALL') {
        return rdsn.entities.PCPProducaoDiaria.list('-created_at', 5000);
      }
      return rdsn.entities.PCPProducaoDiaria.filter({ setor_id: setorAtivo }, '-created_at', 5000);
    },
    enabled: !!setorAtivo
  });

  const { data: auditoria = [], isLoading: loadingAuditoria } = useQuery({
    queryKey: ['auditoria-dashboard', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.Auditoria.list('-created_at', 50);
      }

      // Filtrar por produtos do setor
      const seqs = await rdsn.entities.SequenciaAnual.filter({ setor_id: setorAtivo });
      const letras = [...new Set(seqs.map(s => s.letra_produto))];
      const todasAud = await rdsn.entities.Auditoria.list('-created_at', 50);
      return todasAud.filter(a => letras.includes(a.letra_produto));
    },
    enabled: !!setorAtivo
  });

  const stats = useMemo(() => {
    const hoje = new Date().toDateString();
    const filtradas = reservas.filter(r => !filtroAno || r.ano === filtroAno);
    const anoAnterior = reservas.filter(r => r.ano === (filtroAno - 1));

    // Cálculos Básicos
    const totalReservado = filtradas.reduce((acc, r) => acc + (r.quantidade || 0), 0);
    const totalProduzido = filtradas.reduce((acc, r) => acc + (r.quantidade_baixada || 0), 0);
    const emProducao = filtradas.filter(r => r.status === 'EM_PRODUCAO').length;
    const pendentes = filtradas.filter(r => r.status === 'RESERVADO').length;

    // Produção do dia
    const producaoDia = movimentacoes
      .filter(m => m.tipo === 'PRODUCAO' && new Date(m.created_at).toDateString() === hoje)
      .reduce((acc, m) => acc + (m.quantidade || 0), 0);

    // Alertas recentes (últimas 24h)
    const ultimas24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const alertasRecentes = auditoria.filter(a =>
      new Date(a.created_at) >= ultimas24h &&
      ['RESERVA_CANCELADA', 'ANO_ENCERRADO'].includes(a.acao)
    );

    // Lotes não finalizados
    const lotesNaoFinalizados = filtradas.filter(r =>
      ['RESERVADO', 'EM_PRODUCAO'].includes(r.status) &&
      r.quantidade_baixada < r.quantidade
    );

    // KPIs do PCP (Unidos do Executivo)
    const opsAnoAtual = pcpOps.filter(op => op.ano === filtroAno);
    const totalOPsPrevistas = opsAnoAtual.reduce((acc, op) => acc + (op.quantidade_total || 0), 0);
    const totalOPsRealizadas = pcpProducoes.filter(p => p.ano === filtroAno).reduce((acc, p) => acc + (p.realizado || 0), 0);
    const opsComAtraso = opsAnoAtual.filter(op => op.status === 'Ativo' && (op.quantidade_total || 0) > 0 && (op.realizado || 0) < op.quantidade_total).length;

    // --- SCORE DE RISCO ---
    const taxaProducao = totalReservado > 0 ? (totalProduzido / totalReservado) * 100 : 0;
    const reservasAtivas = filtradas.filter(r => ['RESERVADO', 'EM_PRODUCAO'].includes(r.status)).length;
    let riskScore = 20;
    if (taxaProducao < 30 && reservasAtivas > 10) riskScore = 85;
    else if (taxaProducao < 50 && reservasAtivas > 5) riskScore = 60;
    else if (taxaProducao < 70) riskScore = 40;

    let riskLevel = 'low';
    if (riskScore > 70) riskLevel = 'high';
    else if (riskScore > 40) riskLevel = 'medium';

    const riskConfig = {
      low: { bg: 'bg-emerald-500', text: 'text-emerald-500', label: 'BAIXO' },
      medium: { bg: 'bg-amber-500', text: 'text-amber-500', label: 'MÉDIO' },
      high: { bg: 'bg-red-500', text: 'text-red-500', label: 'ALTO' }
    }[riskLevel];

    // --- TOP CLIENTES ---
    const porCliente = filtradas.reduce((acc, r) => {
      if (r.cliente) {
        if (!acc[r.cliente]) acc[r.cliente] = { reservado: 0, produzido: 0 };
        acc[r.cliente].reservado += r.quantidade || 0;
        acc[r.cliente].produzido += r.quantidade_baixada || 0;
      }
      return acc;
    }, {});

    const topClientes = Object.entries(porCliente)
      .sort(([, a], [, b]) => b.reservado - a.reservado)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data }));

    // Concentração
    const totalVolTop3 = topClientes.slice(0, 3).reduce((acc, c) => acc + c.reservado, 0);
    const top3Percentual = totalReservado > 0 ? Math.round((totalVolTop3 / totalReservado) * 100) : 0;

    // --- COMPARATIVO ---
    const totalAnoAnterior = anoAnterior.reduce((acc, r) => acc + (r.quantidade || 0), 0);
    const crescimento = totalAnoAnterior > 0 ? Math.round(((totalReservado - totalAnoAnterior) / totalAnoAnterior) * 100) : 0;

    // --- DADOS MENSAIS ---
    const porMes = filtradas.reduce((acc, r) => {
      const m = r.mes_producao || 'Sem Mês';
      if (!acc[m]) acc[m] = { reservado: 0, produzido: 0 };
      acc[m].reservado += r.quantidade || 0;
      acc[m].produzido += r.quantidade_baixada || 0;
      return acc;
    }, {});

    const dadosMensais = Object.entries(porMes).map(([name, data]) => ({
      name,
      ...data,
      eficiencia: data.reservado > 0 ? Math.round((data.produzido / data.reservado) * 100) : 0
    }));

    const eficienciaMedia = dadosMensais.length > 0
      ? Math.round(dadosMensais.reduce((acc, m) => acc + m.eficiencia, 0) / dadosMensais.length)
      : 0;

    return {
      producaoDia,
      alertasRecentes,
      lotesNaoFinalizados,
      totalReservado,
      totalProduzido,
      emProducao,
      pendentes,
      statusCount: filtradas.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {}),
      topClientes,
      top3Percentual,
      crescimento,
      dadosMensais,
      eficienciaMedia,
      riskScore,
      riskLevel,
      riskConfig,
      totalOPsPrevistas,
      totalOPsRealizadas,
      opsComAtraso,
      percentualProduzido: totalReservado > 0 ? Math.round((totalProduzido / totalReservado) * 100) : 0,
      taxaProducao: Math.round(taxaProducao),
      gargalos: Object.entries(movimentacoes.filter(m => m.tipo === 'PRODUCAO' && m.celula).reduce((acc, m) => { acc[m.celula] = (acc[m.celula] || 0) + (m.quantidade || 0); return acc; }, {}))
        .sort((a, b) => a[1] - b[1]).slice(0, 3).map(([celula, quantidade]) => ({ celula, quantidade }))
    };
  }, [reservas, filtroAno, movimentacoes, auditoria, pcpOps, pcpProducoes]);

  const anosDisponiveis = useMemo(() => {
    return [...new Set(sequencias.filter(s => s && s.ano).map(s => s.ano))]
      .sort((a, b) => Number(b) - Number(a));
  }, [sequencias]);

  const isLoading = loadingReservas || loadingSequencias || loadingMovimentacoes || loadingAuditoria;

  if (isLoading) {
    return <LoadingPage message="Carregando dashboard..." />;
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-4 md:p-6 transition-colors duration-300">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Header Minimalista */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-500" />
                Dashboard PCP
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Visão geral da produção e indicadores</p>
            </div>
            
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Ano Base</span>
              </div>
              <Select value={filtroAno?.toString()} onValueChange={(v) => setFiltroAno(Number(v))}>
                <SelectTrigger className="w-[120px] h-8 bg-transparent border-0 text-slate-900 dark:text-white font-semibold text-sm focus:ring-0">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {anosDisponiveis.map(ano => (
                    <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <PremiumCard title="OPs Previstas" icon={Target} iconColor="#3b82f6">
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{stats.totalOPsPrevistas.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic mt-1">unidades planejadas</p>
            </PremiumCard>
            <PremiumCard title="OPs Realizadas" icon={CircleCheck} iconColor="#059669">
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{stats.totalOPsRealizadas.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic mt-1">{stats.totalOPsPrevistas > 0 ? Math.round((stats.totalOPsRealizadas / stats.totalOPsPrevistas) * 100) : 0}% do plano</p>
            </PremiumCard>
            <PremiumCard title="Em Produção" icon={PlayCircle} iconColor="#6366f1">
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{stats.emProducao}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic mt-1">lotes em operação</p>
            </PremiumCard>
            <PremiumCard title="Alertas (24h)" icon={AlertTriangle} iconColor={stats.alertasRecentes.length > 5 ? "#e11d48" : "#64748b"} badge={stats.alertasRecentes.length > 0 && <Badge className="bg-red-500 text-white border-0 px-2 py-0 h-5 text-[9px] font-black uppercase italic">Alerta</Badge>}>
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{stats.alertasRecentes.length}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic mt-1">eventos críticos</p>
            </PremiumCard>
          </div>

          {/* Score de Risco e Eficiência (Dashboard Executivo) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Risk Score Card */}
            <PremiumCard title="Score de Risco" icon={Activity} iconColor="#ef4444" className="bg-slate-900 border-0 shadow-2xl overflow-hidden relative lg:col-span-1 rounded-[2.5rem]">
              <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:16px_16px]" />
              <div className="relative z-10 flex flex-col justify-center h-full">
                <div className="flex items-baseline gap-4 mt-4">
                  <span className="text-7xl font-black text-white italic tracking-tighter">{stats.riskScore}</span>
                  <Badge className={cn("px-3 py-1 rounded-full text-[10px] font-black border text-center uppercase tracking-widest",
                    stats.riskLevel === 'low' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      stats.riskLevel === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        'bg-red-500/20 text-red-400 border-red-500/30'
                  )}>
                    {stats.riskConfig.label}
                  </Badge>
                </div>
                <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase italic tracking-widest">
                    <span>Eficiência Média</span>
                    <span className="text-white">{stats.eficienciaMedia}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] transition-all duration-1000" style={{ width: `${stats.eficienciaMedia}%` }} />
                  </div>
                </div>
              </div>
            </PremiumCard>

            <PremiumCard title="Eficiência de Produção" icon={TrendingUp} className="lg:col-span-2">
              <div className="h-56 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.dadosMensais}>
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="eficiencia" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </PremiumCard>
          </div>



          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SlideIn direction="up" delay={0.6}>
              <ProducaoChart
                data={stats.dadosMensais}
                title="Distribuição Mensal (Reservado vs Realizado)"
                icon={Activity}
              />
            </SlideIn>
            <SlideIn direction="up" delay={0.7}>
              <PremiumCard
                title="Top Clientes por Volume"
                icon={Target}
              >
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.topClientes} layout="vertical" margin={{ left: 30, right: 30 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} width={100} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff' }} />
                      <Bar dataKey="reservado" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Volume Reservado" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </PremiumCard>
            </SlideIn>
          </div>


          {/* Top Clientes e Sequências */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SlideIn direction="up" delay={0.9}>
              <PremiumCard
                title="Sequências Ativas"
                icon={BarChart3}
                noPadding
                badge={<Badge className="bg-slate-950 dark:bg-white text-white dark:text-slate-900 font-black text-[9px] px-2 py-0.5 rounded-md italic">ANUAL_LOG</Badge>}
              >
                <div className="divide-y divide-slate-100 dark:divide-slate-800/10">
                  {sequencias.filter(s => s.ano === filtroAno).map(seq => (
                    <div key={seq.id} className="flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group relative">
                      <div className="absolute top-0 left-0 w-1 h-0 group-hover:h-full transition-all duration-300 bg-blue-600" />
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-slate-950 dark:bg-white text-white dark:text-slate-900 rounded-2xl flex items-center justify-center font-black text-xl shadow-xl transition-transform group-hover:rotate-6">
                          {seq.letra_produto}
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-slate-900 dark:text-white text-lg tracking-tighter uppercase italic">{seq.letra_produto} — SERIE 20{seq.ano}</p>
                          <Badge
                            className={cn(
                              "text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 border-0 shadow-sm",
                              seq.encerrado
                                ? "bg-rose-500 text-white"
                                : "bg-emerald-500 text-white"
                            )}
                          >
                            {seq.encerrado ? 'ENCERRADO' : 'EM OPERAÇÃO'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-3xl font-black text-slate-900 dark:text-white leading-none italic tracking-tighter">#{seq.ultimo_numero?.toLocaleString()}</p>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest italic opacity-60">Ponto de Controle</p>
                      </div>
                    </div>
                  ))}
                  {sequencias.filter(s => s.ano === filtroAno).length === 0 && (
                    <div className="py-20 text-center space-y-4">
                      <Package className="w-16 h-16 text-slate-300 dark:text-slate-800 mx-auto opacity-50" />
                      <p className="text-slate-500 dark:text-slate-600 font-black uppercase text-[10px] tracking-widest italic">Aguardando dados de sequenciamento</p>
                    </div>
                  )}
                </div>
              </PremiumCard>
            </SlideIn>
          </div>


          {/* Lotes Não Finalizados - Destaque */}
          <SlideIn direction="up" delay={1.1}>
            <PremiumCard
              title="Lotes em Atraso / Pendentes"
              icon={Clock}
              noPadding
              badge={<Badge className="bg-amber-500 text-slate-950 font-black uppercase text-[10px] tracking-widest px-3 py-1 rounded-full shadow-lg shadow-amber-500/20">{stats.lotesNaoFinalizados.length} ALERTAS</Badge>}
            >
              {stats.lotesNaoFinalizados.length === 0 ? (
                <div className="text-center py-12">
                  <CircleCheck className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-20" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Toda operação está em dia!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50 max-h-[450px] overflow-y-auto">
                  {stats.lotesNaoFinalizados.slice(0, 15).map(lote => {
                    const progresso = ((lote.quantidade_baixada || 0) / lote.quantidade) * 100;
                    return (
                      <div key={lote.id} className="p-4 sm:p-6 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all group">
                        <div className="flex items-start justify-between mb-4 gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-900 dark:text-white text-lg sm:text-xl truncate tracking-tight italic uppercase">{lote.codigo_completo}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                                <Users className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{lote.cliente || 'Ocasional'}</span>
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black tracking-[0.2em] uppercase border-0 shadow-sm",
                            lote.status === 'EM_PRODUCAO' ? 'bg-blue-600/20 text-blue-400' : 'bg-amber-500/20 text-amber-500'
                          )}>
                            {lote.status === 'EM_PRODUCAO' ? 'PRODUÇÃO' : 'RESERVADO'}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-end">
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Status de Entrega</span>
                              <p className="text-sm font-black text-slate-900 dark:text-slate-100">{(lote.quantidade_baixada || 0).toLocaleString()} <span className="text-slate-400 font-normal">/ {lote.quantidade.toLocaleString()}</span></p>
                            </div>
                            <span className={`text-sm font-black ${progresso > 75 ? 'text-emerald-500' : 'text-blue-500'}`}>{progresso.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-1000 ease-out ${progresso > 75 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                              style={{ width: `${progresso}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </PremiumCard>
          </SlideIn>

          {/* Alertas e Gargalos Column */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Alertas Recentes */}
            <SlideIn direction="left" delay={1.2}>
              <PremiumCard
                title="Eventos Críticos"
                icon={AlertTriangle}
                className="border-0 shadow-2xl bg-rose-500/5 dark:bg-rose-950/40"
                headerClassName="border-b border-rose-200 dark:border-white/5"
                noPadding
                badge={<Badge className="bg-rose-500 text-white font-black text-[10px] px-2.5 rounded-full">REALTIME</Badge>}
              >
                {stats.alertasRecentes.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                      <CircleCheck className="w-8 h-8 text-emerald-500/40" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-600 font-black uppercase text-[10px] tracking-widest italic">Estabilidade Operacional Confirmada</p>
                  </div>
                ) : (
                  <div className="divide-y divide-rose-200/50 dark:divide-white/5 max-h-[400px] overflow-y-auto">
                    {stats.alertasRecentes.slice(0, 10).map(alerta => (
                      <div key={alerta.id} className="flex items-center justify-between p-6 hover:bg-rose-500/10 transition-all group relative">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center shadow-inner">
                            <XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-black text-rose-900 dark:text-white uppercase italic tracking-tight">
                              {alerta.acao === 'RESERVA_CANCELADA' ? 'RESERVA ANULADA' : 'CICLO ENCERRADO'}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest italic">
                              {alerta.letra_produto}{alerta.ano} • {alerta.created_by}
                            </p>
                          </div>
                        </div>
                        <p className="text-[10px] font-black text-rose-500 dark:text-rose-400/60 uppercase tracking-widest italic">
                          {new Date(alerta.created_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </PremiumCard>
            </SlideIn>

            {/* Gargalos */}
            <SlideIn direction="right" delay={1.2}>
              <PremiumCard
                title="Identificador de Gargalo"
                icon={TrendingUp}
                className="border-0 shadow-2xl bg-amber-500/5 dark:bg-amber-950/40"
                headerClassName="border-b border-amber-200 dark:border-white/5"
                badge={<Activity className="w-5 h-5 text-amber-500/40 animate-pulse" />}
              >
                {stats.gargalos.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center gap-4">
                    <div className="w-20 h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-emerald-500 animate-[shimmer_2s_infinite]" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-600 font-black uppercase text-[10px] tracking-[0.2em] italic">Nenhum Ponto de Retenção Crítica</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {stats.gargalos.map((gargalo, idx) => (
                      <div key={gargalo.celula} className="flex items-center justify-between p-6 bg-white dark:bg-slate-950/40 border border-amber-100 dark:border-white/5 rounded-3xl shadow-xl hover:scale-[1.02] transition-all">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-rose-500 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-lg">
                            0{idx + 1}
                          </div>
                          <div className="space-y-1">
                            <p className="font-black text-slate-900 dark:text-white uppercase italic tracking-tighter text-lg leading-none">{gargalo.celula}</p>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest italic opacity-60">Terminal de Coleta</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-black text-amber-600 dark:text-amber-500 italic tracking-tighter leading-none">{gargalo.quantidade.toLocaleString()}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mt-1">VOLUME_UNIT</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </PremiumCard>
            </SlideIn>
          </div>

          {/* Insights Estratégicos (Agregado do Executivo) */}
          <SlideIn direction="up" delay={1.4}>
            <Card className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-900 border-indigo-500/30 rounded-[2.5rem] shadow-2xl relative overflow-hidden pb-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.2),transparent)]" />
              <CardHeader className="relative z-10 p-8 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10">
                    <Zap className="w-6 h-6 text-amber-400" />
                  </div>
                  <CardTitle className="text-2xl font-black text-white uppercase italic tracking-tighter">Insights de Inteligência Industrial</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {stats.riskScore > 60 && (
                  <div className="flex items-start gap-4 p-5 bg-rose-500/10 border border-rose-500/20 rounded-[1.5rem]">
                    <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                    <p className="text-slate-200 text-sm font-bold uppercase italic leading-tight">Ação Urgente: O score de risco está crítico ({stats.riskScore}). Verifique gargalos e aumente o fluxo de produção para evitar atrasos em larga escala.</p>
                  </div>
                )}
                {stats.eficienciaMedia < 70 && (
                  <div className="flex items-start gap-4 p-5 bg-amber-500/10 border border-amber-500/20 rounded-[1.5rem]">
                    <TrendingUp className="w-6 h-6 text-amber-400 shrink-0" />
                    <p className="text-slate-200 text-sm font-bold uppercase italic leading-tight">Otimização Necessária: Eficiência média de {stats.eficienciaMedia}% indica subutilização da capacidade agendada. Revise o PCP Diário.</p>
                  </div>
                )}
                {stats.top3Percentual > 50 && (
                  <div className="flex items-start gap-4 p-5 bg-blue-500/10 border border-blue-500/20 rounded-[1.5rem]">
                    <Users className="w-6 h-6 text-blue-400 shrink-0" />
                    <p className="text-slate-200 text-sm font-bold uppercase italic leading-tight">Concentração de Risco: 3 clientes dominam {stats.top3Percentual}% do volume. Sua operação está altamente dependente de poucos players.</p>
                  </div>
                )}
                {stats.crescimento > 10 && (
                  <div className="flex items-start gap-4 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-[1.5rem]">
                    <TrendingUp className="w-6 h-6 text-emerald-400 shrink-0" />
                    <p className="text-slate-200 text-sm font-bold uppercase italic leading-tight">Expansão Detectada: Crescimento de {stats.crescimento}% vs período anterior. Planeje escalas extras para absorver a nova demanda.</p>
                  </div>
                )}
                <div className="flex items-start gap-4 p-5 bg-white/5 border border-white/10 rounded-[1.5rem]">
                  <CheckCircle2 className="w-6 h-6 text-indigo-400 shrink-0" />
                  <p className="text-slate-300 text-sm font-bold uppercase italic leading-tight">Status de Lotes: Atualmente existem {stats.emProducao} lotes ativos. Mantenha o fluxo contínuo de registros para precisão do dashboard.</p>
                </div>
              </CardContent>
            </Card>
          </SlideIn>
        </div>
      </div>
    </PageTransition >
  );
}