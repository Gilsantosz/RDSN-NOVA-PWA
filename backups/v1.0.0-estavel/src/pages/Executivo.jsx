// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { TrendingUp, AlertTriangle, Target, CheckCircle2, Activity, ArrowUpRight, ArrowDownRight, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import KPIConfigurator from '../components/dashboard/KPIConfigurator';
import UserKPIPreferences from '../components/dashboard/UserKPIPreferences';
import { useSetor } from '../components/context/SetorContext';
import { cn } from '@/lib/utils';

const RISK_COLORS = {
  low: { bg: 'bg-emerald-500', text: 'text-emerald-600', label: 'BAIXO' },
  medium: { bg: 'bg-amber-500', text: 'text-amber-600', label: 'MÉDIO' },
  high: { bg: 'bg-red-500', text: 'text-red-600', label: 'ALTO' }
};

export default function Executivo() {
  const { setorAtivo, isAdmin } = useSetor();
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear() % 100);
  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  // const [kpisVisiveis, setKpisVisiveis] = ... (keeping for future if needed)

  const { data: reservas = [] } = useQuery({
    queryKey: ['reservas', setorAtivo],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && (setorAtivo === 'ALL' || setorAtivo === 'TODOS')) {
        return await base44.entities.ReservaLote.list('-created_at', 2000);
      }
      return await base44.entities.ReservaLote.filter({ setor_id: setorAtivo }, '-created_at', 2000);
    },
    enabled: !!setorAtivo
  });

  const { data: sequencias = [] } = useQuery({
    queryKey: ['sequencias', setorAtivo],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && (setorAtivo === 'ALL' || setorAtivo === 'TODOS')) {
        return await base44.entities.SequenciaAnual.list();
      }
      return await base44.entities.SequenciaAnual.filter({ setor_id: setorAtivo });
    },
    enabled: !!setorAtivo
  });

  const { data: ops = [] } = useQuery({
    queryKey: ['ops-executivo', setorAtivo, filtroAno],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && (setorAtivo === 'ALL' || setorAtivo === 'TODOS')) {
        return await base44.entities.PCPOrdemProducao.list('-created_at', 2000);
      }
      return await base44.entities.PCPOrdemProducao.filter({ setor_id: setorAtivo }, '-created_at', 2000);
    },
    enabled: !!setorAtivo
  });

  const { data: producoesPCP = [] } = useQuery({
    queryKey: ['producoes-pcp-executivo', setorAtivo, filtroAno],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && (setorAtivo === 'ALL' || setorAtivo === 'TODOS')) {
        return await base44.entities.PCPProducaoDiaria.list('-created_at', 5000);
      }
      return await base44.entities.PCPProducaoDiaria.filter({ setor_id: setorAtivo }, '-created_at', 5000);
    },
    enabled: !!setorAtivo
  });

  const { data: alertasPCP = [] } = useQuery({
    queryKey: ['alertas-pcp-executivo', setorAtivo],
    queryFn: async () => {
      if (!setorAtivo) return [];
      return await base44.entities.Alerta.filter({ tipo: 'PROGRESSO_BAIXO', lido: false });
    },
    enabled: !!setorAtivo
  });

  const analytics = useMemo(() => {
    const anoAtual = reservas.filter(r => r.ano === filtroAno);
    const anoAnterior = reservas.filter(r => r.ano === filtroAno - 1);

    // KPIs do PCP
    const opsAnoAtual = ops.filter(op => op.ano === filtroAno);
    const opsComAtraso = opsAnoAtual.filter(op => op.status === 'Ativo' && (op.quantidade_total || 0) > 0);
    const totalOPsPrevistas = opsAnoAtual.reduce((acc, op) => acc + (op.quantidade_total || 0), 0);
    const totalOPsRealizadas = producoesPCP.filter(p => p.ano === filtroAno).reduce((acc, p) => acc + (p.realizado || 0), 0);

    // KPIs principais (mantém histórico)
    const totalReservado = anoAtual.reduce((acc, r) => acc + (r.quantidade || 0), 0);
    const totalProduzido = anoAtual.reduce((acc, r) => acc + (r.quantidade_baixada || 0), 0);
    const reservasSemProducao = anoAtual.filter(r => r.status === 'RESERVADO' && (r.quantidade_baixada || 0) === 0).length;
    // const emProducao = anoAtual.filter(r => r.status === 'EM_PRODUCAO').length; (unused)

    // Cálculo de Risco simplificado - foca em produção vs reservas
    const taxaProducao = totalReservado > 0 ? (totalProduzido / totalReservado) * 100 : 0;
    const reservasAtivas = anoAtual.filter(r => ['RESERVADO', 'EM_PRODUCAO'].includes(r.status)).length;

    // Score baseado em produção e reservas ativas
    let riskScore = 20; // baseline baixo
    if (taxaProducao < 30 && reservasAtivas > 10) riskScore = 85;
    else if (taxaProducao < 50 && reservasAtivas > 5) riskScore = 60;
    else if (taxaProducao < 70) riskScore = 40;

    // Nível de risco
    let riskLevel = 'low';
    if (riskScore > 70) riskLevel = 'high';
    else if (riskScore > 40) riskLevel = 'medium';

    // Produção por mês (linha do tempo)
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const mesesCompletos = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    // Mapear nomes completos para índice
    const mesParaIndice = {};
    mesesCompletos.forEach((nome, i) => { mesParaIndice[nome.toLowerCase()] = i; });
    mesesNomes.forEach((nome, i) => { mesParaIndice[nome.toLowerCase()] = i; });

    const porMesIndex = {};
    anoAtual.forEach(r => {
      const mesRaw = (r.mes_producao || '').trim().toLowerCase();
      let idx = mesParaIndice[mesRaw];

      // Tentar também pela data_prevista se mes_producao não bater
      if (idx === undefined && r.data_prevista) {
        const d = new Date(r.data_prevista);
        if (!isNaN(d.getTime())) idx = d.getMonth();
      }
      if (idx === undefined && r.created_at) {
        const d = new Date(r.created_at);
        if (!isNaN(d.getTime())) idx = d.getMonth();
      }

      if (idx !== undefined) {
        if (!porMesIndex[idx]) porMesIndex[idx] = { reservado: 0, produzido: 0 };
        porMesIndex[idx].reservado += r.quantidade || 0;
        porMesIndex[idx].produzido += r.quantidade_baixada || 0;
      }
    });

    const dadosMensais = mesesNomes.map((mes, i) => ({
      name: mes,
      reservado: porMesIndex[i]?.reservado || 0,
      produzido: porMesIndex[i]?.produzido || 0
    }));

    // Top clientes
    const porCliente = anoAtual.reduce((acc, r) => {
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
      .map(([name, data]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        ...data,
        percentual: totalReservado > 0 ? Math.round((data.reservado / totalReservado) * 100) : 0
      }));

    // Concentração de clientes
    const top3Percentual = topClientes.slice(0, 3).reduce((acc, c) => acc + c.percentual, 0);

    // Comparativo ano anterior
    const totalAnoAnterior = anoAnterior.reduce((acc, r) => acc + (r.quantidade || 0), 0);
    const crescimento = totalAnoAnterior > 0
      ? Math.round(((totalReservado - totalAnoAnterior) / totalAnoAnterior) * 100)
      : 0;

    // Cálculo de eficiência mensal
    const eficiênciaMensal = dadosMensais.map(d => ({
      ...d,
      eficiencia: d.reservado > 0 ? Math.round((d.produzido / d.reservado) * 100) : 0
    }));

    // Taxa média de eficiência
    const eficienciaMedia = eficiênciaMensal.length > 0
      ? Math.round(eficiênciaMensal.reduce((acc, m) => acc + m.eficiencia, 0) / eficiênciaMensal.length)
      : 0;

    return {
      totalReservado,
      totalProduzido,
      reservasSemProducao,
      riskLevel,
      riskScore,
      dadosMensais,
      topClientes,
      top3Percentual,
      crescimento,
      eficiênciaMensal,
      eficienciaMedia,
      totalOPsPrevistas,
      totalOPsRealizadas,
      opsComAtraso: opsComAtraso.length,
      alertasAbertos: alertasPCP.length,
      taxaProducao: Math.round(taxaProducao),
      reservasAtivas
    };
  }, [reservas, sequencias, filtroAno, ops, producoesPCP, alertasPCP]);

  const anosDisponiveis = useMemo(() => [...new Set(sequencias.map(s => s.ano))].sort((a, b) => b - a), [sequencias]);
  const riskConfig = RISK_COLORS[analytics.riskLevel];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(139,92,246,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-600 to-purple-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all hover:scale-105 active:scale-95 group border border-indigo-400/20">
                <Activity className="w-8 h-8 sm:w-10 sm:h-10 text-white group-hover:rotate-12 transition-transform duration-500" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Dashboard <span className="text-indigo-600 dark:text-indigo-400">Executivo</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                  Visão Estratégica • Produção & Risco
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 w-full xl:w-auto">
              <Button
                variant={abaAtiva === 'dashboard' ? 'default' : 'outline'}
                onClick={() => setAbaAtiva('dashboard')}
                className={cn(
                  "h-12 px-6 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 backdrop-blur-xl transition-all text-xs font-black uppercase tracking-widest",
                  abaAtiva === 'dashboard' ? "bg-slate-900 text-white dark:bg-indigo-600 shadow-lg border-0" : "text-slate-900 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10"
                )}
              >
                Dashboard
              </Button>
              <Button
                variant={abaAtiva === 'kpis' ? 'default' : 'outline'}
                onClick={() => setAbaAtiva('kpis')}
                className={cn(
                  "h-12 px-6 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 backdrop-blur-xl transition-all text-xs font-black uppercase tracking-widest",
                  abaAtiva === 'kpis' ? "bg-slate-900 text-white dark:bg-purple-600 shadow-lg border-0" : "text-slate-900 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10"
                )}
              >
                Configurar KPIs
              </Button>
              {abaAtiva === 'dashboard' && <UserKPIPreferences />}

              <Select value={filtroAno?.toString()} onValueChange={(v) => setFiltroAno(Number(v))}>
                <SelectTrigger className="h-12 w-[140px] px-6 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold uppercase text-[10px] tracking-widest">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                  {anosDisponiveis.length > 0 ? anosDisponiveis.map(ano => (
                    <SelectItem key={ano} value={ano.toString()}>20{ano}</SelectItem>
                  )) : (
                    <SelectItem value={(new Date().getFullYear() % 100).toString()}>20{new Date().getFullYear() % 100}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {abaAtiva === 'kpis' ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border dark:border-slate-800">
            <KPIConfigurator setorId={setorAtivo} />
          </div>
        ) : (
          <>
            {/* KPIs Principais Premium */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'OPs Previstas (PCP)', value: analytics.totalOPsPrevistas.toLocaleString(), subtitle: 'unidades planejadas', icon: Target, color: 'indigo' },
                { label: 'OPs Realizadas (PCP)', value: analytics.totalOPsRealizadas.toLocaleString(), subtitle: `${analytics.totalOPsPrevistas > 0 ? Math.round((analytics.totalOPsRealizadas / analytics.totalOPsPrevistas) * 100) : 0}% do plano`, icon: CheckCircle2, color: 'emerald' },
                { label: 'OPs com Atraso', value: analytics.opsComAtraso, subtitle: 'ordens atrasadas', icon: AlertTriangle, color: 'amber' },
                { label: 'Alertas Abertos', value: analytics.alertasAbertos, subtitle: 'de progresso baixo', icon: AlertTriangle, color: analytics.alertasAbertos > 0 ? 'rose' : 'slate' },
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
                        item.color === 'indigo' ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/20" :
                          item.color === 'emerald' ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20" :
                            item.color === 'amber' ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20" :
                              item.color === 'rose' ? "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20" :
                                "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 border border-slate-500/20"
                      )}>
                        <item.icon className="w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                  <div className={cn(
                    "absolute bottom-0 left-0 h-1 bg-gradient-to-r opacity-50 transition-all duration-500 group-hover:h-1.5",
                    item.color === 'indigo' ? "from-indigo-600 to-indigo-400 w-full" :
                      item.color === 'emerald' ? "from-emerald-600 to-emerald-400 w-full" :
                        item.color === 'amber' ? "from-amber-600 to-amber-400 w-full" :
                          item.color === 'rose' ? "from-rose-600 to-rose-400 w-full" :
                            "from-slate-600 to-slate-400 w-full"
                  )} />
                </Card>
              ))}
            </div>

            {/* Risk Score Card */}
            <Card className="bg-gradient-to-r from-slate-800 to-slate-700 border-slate-600 dark:from-slate-950 dark:to-slate-900 dark:border-slate-800 shadow-xl overflow-hidden relative">
              <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:16px_16px]" />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm uppercase tracking-wide">Score de Risco</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-5xl font-bold text-white">{analytics.riskScore}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${riskConfig.bg} text-white`}>
                        {riskConfig.label}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-2 text-sm">
                      Taxa de Produção: {analytics.taxaProducao}% | Reservas Ativas: {analytics.reservasAtivas}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-sm">Eficiência Média (Mês)</p>
                    <p className="text-2xl font-bold text-white mt-1">{analytics.eficienciaMedia}%</p>
                    <p className="text-slate-400 text-sm mt-1">
                      Produzido vs Reservado
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Total Reservado</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{analytics.totalReservado.toLocaleString()}</p>
                    </div>
                    <div className={cn("flex items-center gap-1", analytics.crescimento >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                      {analytics.crescimento >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      <span className="text-sm font-medium">{Math.abs(analytics.crescimento)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
                <CardContent className="p-6">
                  <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Total Produzido</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{analytics.totalProduzido.toLocaleString()}</p>
                  <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">
                    {analytics.totalReservado > 0 ? Math.round((analytics.totalProduzido / analytics.totalReservado) * 100) : 0}% executado
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
                <CardContent className="p-6">
                  <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Reservas Paradas</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{analytics.reservasSemProducao}</p>
                  <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">Sem produção iniciada</p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
                <CardContent className="p-6">
                  <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Concentração Top 3</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{analytics.top3Percentual}%</p>
                  <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">dos 3 maiores clientes</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Eficiência Mensal */}
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Eficiência de Produção (%Realizado vs Reservado)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-8">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.eficienciaMensal}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff' }}
                          formatter={(value) => [value + '%', '']}
                        />
                        <Bar dataKey="eficiencia" fill="#3b82f6" name="Eficiência %" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Clientes */}
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Top Clientes por Volume
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-8">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.topClientes} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(v) => (v / 1000) + 'k'} />
                        <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={100} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff' }}
                          formatter={(value) => [value?.toLocaleString() || '-', '']}
                        />
                        <Bar dataKey="reservado" fill="#3b82f6" name="Reservado" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="produzido" fill="#10b981" name="Produzido" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Produção Mensal */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Produção vs Reservado por Mês
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-8">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.dadosMensais}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(v) => (v / 1000) + 'k'} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value) => [value?.toLocaleString() || '-', '']}
                      />
                      <Legend />
                      <Bar dataKey="reservado" fill="#3b82f6" name="Reservado" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="produzido" fill="#10b981" name="Produzido" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Insights */}
            <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Insights Estratégicos (Score de Risco: {analytics.riskScore})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.riskScore > 70 && (
                  <div className="flex items-start gap-3 p-3 bg-red-500/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                    <p className="text-red-200">
                      <strong>Risco Alto:</strong> Score de risco em {analytics.riskScore}.
                      Taxa de produção em {analytics.taxaProducao}% com {analytics.reservasAtivas} reservas ativas.
                      Ação urgente necessária para aumentar produção.
                    </p>
                  </div>
                )}
                {analytics.riskScore > 40 && analytics.riskScore <= 70 && (
                  <div className="flex items-start gap-3 p-3 bg-amber-500/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                    <p className="text-amber-200">
                      <strong>Risco Médio:</strong> Score de {analytics.riskScore}.
                      Taxa de produção em {analytics.taxaProducao}%. Monitoramento contínuo recomendado.
                    </p>
                  </div>
                )}
                {analytics.reservasSemProducao > 5 && (
                  <div className="flex items-start gap-3 p-3 bg-amber-500/20 rounded-lg">
                    <Target className="w-5 h-5 text-amber-400 mt-0.5" />
                    <p className="text-amber-200">
                      <strong>Atenção:</strong> Existem {analytics.reservasSemProducao} reservas sem produção iniciada.
                      Verifique se há bloqueios operacionais.
                    </p>
                  </div>
                )}
                {analytics.top3Percentual > 60 && (
                  <div className="flex items-start gap-3 p-3 bg-blue-500/20 rounded-lg">
                    <Users className="w-5 h-5 text-blue-400 mt-0.5" />
                    <p className="text-blue-200">
                      <strong>Concentração:</strong> Os 3 maiores clientes representam {analytics.top3Percentual}% da demanda.
                      Considere estratégias de diversificação.
                    </p>
                  </div>
                )}
                {analytics.crescimento > 20 && (
                  <div className="flex items-start gap-3 p-3 bg-emerald-500/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-emerald-400 mt-0.5" />
                    <p className="text-emerald-200">
                      <strong>Crescimento:</strong> A demanda cresceu {analytics.crescimento}% em relação ao ano anterior.
                      Garanta capacidade de numeração para absorver o crescimento.
                    </p>
                  </div>
                )}
                {analytics.riskScore <= 40 && (
                  <div className="flex items-start gap-3 p-3 bg-emerald-500/20 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                    <p className="text-emerald-200">
                      <strong>Risco Baixo:</strong> Sistema operando dentro de parâmetros saudáveis.
                      Continue monitorando periodicamente.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}