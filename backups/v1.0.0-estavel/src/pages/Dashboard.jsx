// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { Package, TrendingUp, AlertTriangle, CircleCheck, Clock, BarChart3, XCircle, PlayCircle, Zap, Activity, Users } from 'lucide-react';
import ProducaoChart from '../components/charts/ProducaoChart';
import StatusPieChart from '../components/charts/StatusPieChart';
import QuickActions from '../components/dashboard/QuickActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        return await base44.entities.ReservaLote.list('-created_at', 1000);
      }
      return await base44.entities.ReservaLote.filter({ setor_id: setorAtivo }, '-created_at', 1000);
    },
    enabled: !!setorAtivo
  });

  const { data: sequencias = [], isLoading: loadingSequencias } = useQuery({
    queryKey: ['sequencias', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await base44.entities.SequenciaAnual.list();
      }
      return await base44.entities.SequenciaAnual.filter({ setor_id: setorAtivo });
    },
    enabled: !!setorAtivo
  });

  const { data: movimentacoes = [], isLoading: loadingMovimentacoes } = useQuery({
    queryKey: ['movimentacoes-dashboard', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await base44.entities.MovimentacaoEstoque.list('-created_at', 500);
      }

      // Filtrar por produtos do setor
      const produtos = await base44.entities.Produto.filter({ setor_id: setorAtivo });
      const produtoIds = produtos.map(p => p.id);
      const todasMov = await base44.entities.MovimentacaoEstoque.list('-created_at', 500);
      return todasMov.filter(m => produtoIds.includes(m.produto_id));
    },
    enabled: !!setorAtivo
  });

  const { data: auditoria = [], isLoading: loadingAuditoria } = useQuery({
    queryKey: ['auditoria-dashboard', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await base44.entities.Auditoria.list('-created_at', 50);
      }

      // Filtrar por produtos do setor
      const seqs = await base44.entities.SequenciaAnual.filter({ setor_id: setorAtivo });
      const letras = [...new Set(seqs.map(s => s.letra_produto))];
      const todasAud = await base44.entities.Auditoria.list('-created_at', 50);
      return todasAud.filter(a => letras.includes(a.letra_produto));
    },
    enabled: !!setorAtivo
  });

  const stats = useMemo(() => {
    const hoje = new Date().toDateString();
    const filtradas = reservas.filter(r => !filtroAno || r.ano === filtroAno);

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

    // Gargalos - células com menor produção
    const producaoPorCelula = movimentacoes
      .filter(m => m.tipo === 'PRODUCAO' && m.celula)
      .reduce((acc, m) => {
        acc[m.celula] = (acc[m.celula] || 0) + (m.quantidade || 0);
        return acc;
      }, {});

    const gargalos = Object.entries(producaoPorCelula)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([celula, quantidade]) => ({ celula, quantidade }));

    const totalReservado = filtradas.reduce((acc, r) => acc + (r.quantidade || 0), 0);
    const totalProduzido = filtradas.reduce((acc, r) => acc + (r.quantidade_baixada || 0), 0);
    const emProducao = filtradas.filter(r => r.status === 'EM_PRODUCAO').length;
    const pendentes = filtradas.filter(r => r.status === 'RESERVADO').length;

    const statusCount = filtradas.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    const porCliente = filtradas.reduce((acc, r) => {
      if (r.cliente) {
        acc[r.cliente] = (acc[r.cliente] || 0) + (r.quantidade || 0);
      }
      return acc;
    }, {});

    const topClientes = Object.entries(porCliente)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, reservado: value, produzido: Math.round(value * 0.7) }));

    const porMes = filtradas.reduce((acc, r) => {
      const mes = r.mes_producao || 'Sem Mês';
      if (!acc[mes]) acc[mes] = { reservado: 0, produzido: 0 };
      acc[mes].reservado += r.quantidade || 0;
      acc[mes].produzido += r.quantidade_baixada || 0;
      return acc;
    }, {});

    const dadosMensais = Object.entries(porMes).map(([name, data]) => ({
      name,
      ...data
    }));

    return {
      producaoDia,
      alertasRecentes,
      lotesNaoFinalizados,
      gargalos,
      totalReservado,
      totalProduzido,
      emProducao,
      pendentes,
      statusCount,
      topClientes,
      dadosMensais,
      percentualProduzido: totalReservado > 0 ? Math.round((totalProduzido / totalReservado) * 100) : 0
    };
  }, [reservas, filtroAno, movimentacoes, auditoria]);

  const anosDisponiveis = [...new Set(sequencias.map(s => s.ano))].sort((a, b) => b - a);

  const isLoading = loadingReservas || loadingSequencias || loadingMovimentacoes || loadingAuditoria;

  if (isLoading) {
    return <LoadingPage message="Carregando dashboard..." />;
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-4 md:p-6 transition-colors duration-300">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Header Premium */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(37,99,235,0.1),transparent)] pointer-events-none" />
            <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
              <div className="flex items-center gap-6 sm:gap-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-indigo-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all hover:scale-105 active:scale-95 group border border-blue-400/20 cursor-pointer">
                  <Activity className="w-8 h-8 sm:w-10 sm:h-10 text-white group-hover:rotate-12 transition-transform duration-500" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                    PCP<span className="text-blue-600 dark:text-blue-400">MATRIX</span>
                  </h1>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                    Industrial Intelligence Hub • 20{filtroAno}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 bg-slate-100/50 dark:bg-slate-950/40 p-2 rounded-[1.5rem] border border-slate-200 dark:border-white/10 backdrop-blur-xl">
                <div className="flex items-center gap-2 px-4 border-r border-slate-200 dark:border-white/10 hidden sm:flex">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest italic leading-none">Status: Operacional</span>
                </div>

                <Select value={filtroAno?.toString()} onValueChange={(v) => setFiltroAno(Number(v))}>
                  <SelectTrigger className="w-[140px] sm:w-[180px] bg-transparent border-0 text-slate-900 dark:text-white font-black uppercase text-[10px] tracking-widest focus:ring-0 h-10 italic">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-800 rounded-2xl">
                    {anosDisponiveis.map(ano => (
                      <SelectItem key={ano} value={ano.toString()} className="font-bold text-xs uppercase tracking-widest text-slate-900 dark:text-slate-100">Ciclo 20{ano}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* KPIs Principais Premium */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Produção Hoje', value: stats.producaoDia.toLocaleString(), subtitle: 'unidades coletadas', icon: Zap, color: 'blue' },
              { label: 'Total Produzido', value: stats.totalProduzido.toLocaleString(), subtitle: `${stats.percentualProduzido}% do ciclo`, icon: CircleCheck, color: 'emerald' },
              { label: 'Em Produção', value: stats.emProducao, subtitle: 'lotes em operação', icon: PlayCircle, color: 'indigo' },
              { label: 'Alertas (24h)', value: stats.alertasRecentes.length, subtitle: 'eventos críticos', icon: AlertTriangle, color: stats.alertasRecentes.length > 5 ? 'rose' : 'slate' },
            ].map((item, i) => (
              <Card key={i} className="relative overflow-hidden group border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 backdrop-blur-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80">{item.label}</p>
                      <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{item.value}</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic opacity-60">{item.subtitle}</p>
                    </div>
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6",
                      item.color === 'blue' ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20" :
                        item.color === 'emerald' ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20" :
                          item.color === 'indigo' ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/20" :
                            item.color === 'rose' ? "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20" :
                              "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 border border-slate-500/20"
                    )}>
                      <item.icon className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
                <div className={cn(
                  "absolute bottom-0 left-0 h-1 bg-gradient-to-r opacity-50 transition-all duration-500 group-hover:h-1.5",
                  item.color === 'blue' ? "from-blue-600 to-blue-400 w-full" :
                    item.color === 'emerald' ? "from-emerald-600 to-emerald-400 w-full" :
                      item.color === 'indigo' ? "from-indigo-600 to-indigo-400 w-full" :
                        item.color === 'rose' ? "from-rose-600 to-rose-400 w-full" :
                          "from-slate-600 to-slate-400 w-full"
                )} />
              </Card>
            ))}
          </div>



          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SlideIn direction="up" delay={0.6}>
              <ProducaoChart
                data={stats.dadosMensais}
                title="Produção por Mês"
              />
            </SlideIn>
            <SlideIn direction="up" delay={0.7}>
              <StatusPieChart
                data={stats.statusCount}
                title="Status dos Lotes"
              />
            </SlideIn>
          </div>

          {/* Top Clientes e Sequências */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SlideIn direction="up" delay={0.8}>
              <ProducaoChart
                data={stats.topClientes}
                title="Top 5 Clientes"
              />
            </SlideIn>

            <SlideIn direction="up" delay={0.9}>
              <Card className="border border-slate-200 dark:border-0 shadow-2xl bg-white dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
                <CardHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-white/5 p-6 sm:p-8 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner">
                      <BarChart3 className="w-6 h-6 text-blue-400" />
                    </div>
                    <CardTitle className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Sequências Ativas</CardTitle>
                  </div>
                  <Badge className="bg-slate-950 dark:bg-white text-white dark:text-slate-900 font-black text-[9px] px-2 py-0.5 rounded-md italic">ANUAL_LOG</Badge>
                </CardHeader>
                <CardContent className="p-0">
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
                </CardContent>
              </Card>
            </SlideIn>
          </div>

          {/* Ações Rápidas */}
          <SlideIn direction="up" delay={1.0}>
            <QuickActions />
          </SlideIn>

          {/* Lotes Não Finalizados - Destaque */}
          <SlideIn direction="up" delay={1.1}>
            <Card className="border border-slate-200 dark:border-0 shadow-2xl bg-white dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
              <CardHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-white/5 p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-500/20 shadow-inner">
                      <Clock className="w-6 h-6 text-amber-500 animate-pulse" />
                    </div>
                    <CardTitle className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Lotes em Atraso / Pendentes</CardTitle>
                  </div>
                  <Badge className="bg-amber-500 text-slate-950 font-black uppercase text-xs tracking-widest px-4 py-1.5 rounded-full shadow-lg shadow-amber-500/20">{stats.lotesNaoFinalizados.length} ALERTAS</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
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
              </CardContent>
            </Card>
          </SlideIn>

          {/* Alertas Recentes e Gargalos Premium */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
            {/* Alertas Recentes */}
            <SlideIn direction="left" delay={1.2}>
              <Card className="border-0 shadow-2xl bg-rose-500/5 dark:bg-rose-950/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
                <CardHeader className="border-b border-rose-200 dark:border-white/5 p-6 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center border border-rose-500/20 shadow-inner">
                      <AlertTriangle className="w-6 h-6 text-rose-500" />
                    </div>
                    <CardTitle className="text-xl font-black text-rose-900 dark:text-rose-400 tracking-tighter uppercase italic leading-none">Eventos Críticos</CardTitle>
                  </div>
                  <Badge className="bg-rose-500 text-white font-black text-[10px] px-2.5 rounded-full">REALTIME</Badge>
                </CardHeader>
                <CardContent className="p-0">
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
                </CardContent>
              </Card>
            </SlideIn>

            {/* Gargalos */}
            <SlideIn direction="right" delay={1.2}>
              <Card className="border-0 shadow-2xl bg-amber-500/5 dark:bg-amber-950/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
                <CardHeader className="border-b border-amber-200 dark:border-white/5 p-6 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-500/20 shadow-inner">
                      <TrendingUp className="w-6 h-6 text-amber-500" />
                    </div>
                    <CardTitle className="text-xl font-black text-amber-900 dark:text-amber-400 tracking-tighter uppercase italic leading-none">Identificador de Gargalo</CardTitle>
                  </div>
                  <Activity className="w-5 h-5 text-amber-500/40 animate-pulse" />
                </CardHeader>
                <CardContent className="p-6 sm:p-10">
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
                </CardContent>
              </Card>
            </SlideIn>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}