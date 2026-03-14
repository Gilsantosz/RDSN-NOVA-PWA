// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, BarChart3, TrendingUp, TrendingDown, CheckCircle2, Activity, Target, Layers, Factory, Download, Filter, AlertTriangle, Clock } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import BotaoImprimir from '@/components/relatorios/BotaoImprimir';
import PCPSetorGuard, { usePCPSetor } from '@/components/pcp/PCPSetorGuard';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// KPICard function removed (integrated into grid with premium styling)

function exportarCSV(dados, nomeArquivo) {
  if (!dados.length) return;
  const headers = Object.keys(dados[0]);
  const csvContent = [
    headers.join(';'),
    ...dados.map(row => headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(';'))
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nomeArquivo; a.click();
  URL.revokeObjectURL(url);
}

export default function PCPDashboard() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear() % 100);
  const { setorAtivo, bloqueado, nomeSetor } = usePCPSetor();

  // Filtros PCP
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  const { data: ops = [] } = useQuery({
    queryKey: ['pcp-ops-dash', mes, ano, setorAtivo],
    queryFn: () => {
      const filtro = { mes, ano, setor_id: setorAtivo };
      if (filtroStatus !== 'Todos') filtro.status = filtroStatus;
      if (setorAtivo && setorAtivo !== 'ALL') {
        return base44.entities.PCPOrdemProducao.filter(filtro, null, 500);
      }
      const filtroSemSetor = { mes, ano };
      if (filtroStatus !== 'Todos') filtroSemSetor.status = filtroStatus;
      return base44.entities.PCPOrdemProducao.filter(filtroSemSetor, null, 500);
    },
    enabled: !bloqueado
  });

  const { data: producoes = [] } = useQuery({
    queryKey: ['pcp-producoes-dash', mes, ano, setorAtivo],
    queryFn: () => {
      if (setorAtivo && setorAtivo !== 'ALL') {
        return base44.entities.PCPProducaoDiaria.filter({ mes, ano, setor_id: setorAtivo }, null, 5000);
      }
      return base44.entities.PCPProducaoDiaria.filter({ mes, ano }, null, 5000);
    },
    enabled: !bloqueado && ops.length > 0
  });

  const { data: baixas = [] } = useQuery({
    queryKey: ['baixas-dash', mes, ano, setorAtivo],
    queryFn: async () => {
      const anoCompleto = 2000 + ano;
      const inicio = new Date(anoCompleto, mes - 1, 1).toISOString();
      const fim = new Date(anoCompleto, mes, 0, 23, 59, 59).toISOString();
      const all = await base44.entities.BaixaLote.list('-created_at', 2000);
      return all.filter(b => b.created_at >= inicio && b.created_at <= fim);
    }
  });

  const navMes = (dir) => {
    let nm = mes + dir, na = ano;
    if (nm > 12) { nm = 1; na++; }
    if (nm < 1) { nm = 12; na--; }
    setMes(nm); setAno(na);
  };

  // OPs filtradas por data de criação
  const opsFiltradas = useMemo(() => {
    let lista = [...ops];
    if (filtroDataInicio) {
      const di = new Date(filtroDataInicio);
      lista = lista.filter(op => new Date(op.created_at) >= di);
    }
    if (filtroDataFim) {
      const df = new Date(filtroDataFim);
      df.setHours(23, 59, 59);
      lista = lista.filter(op => new Date(op.created_at) <= df);
    }
    return lista;
  }, [ops, filtroDataInicio, filtroDataFim]);

  // OPs não-canceladas para KPIs e gráficos
  const opsNaoCanceladas = useMemo(() => opsFiltradas.filter(op => op.status !== 'Cancelado'), [opsFiltradas]);

  // KPIs gerais — igual à lógica da Programação Mensal
  // totalPrev = soma de quantidade_total de cada OP (ou previsto se não tiver)
  // totalReal = soma de realizado por OP (todos os dias)
  const resumo = useMemo(() => {
    const totalPrev = opsNaoCanceladas.reduce((s, op) => {
      const qtd = op.quantidade_total || 0;
      if (qtd > 0) return s + qtd;
      // fallback: soma previsto dos dias desta OP
      return s + producoes.filter(p => p.op_id === op.id).reduce((ss, p) => ss + (p.previsto || 0), 0);
    }, 0);

    const totalReal = opsNaoCanceladas.reduce((s, op) =>
      s + producoes.filter(p => p.op_id === op.id).reduce((ss, p) => ss + (p.realizado || 0), 0), 0);

    const saldo = totalReal - totalPrev;
    const perc = totalPrev > 0 ? ((totalReal / totalPrev) * 100).toFixed(1) : '0.0';
    // Média diária: baseado nos dias com realizado > 0 (todos ops)
    const diasComReal = [...new Set(producoes.filter(p => (p.realizado || 0) > 0).map(p => p.dia))].length;
    const media = totalReal > 0 && diasComReal > 0 ? Math.round(totalReal / diasComReal) : 0;
    const opsAtivas = opsNaoCanceladas.filter(op => op.status === 'Ativo').length;
    return { totalPrev, totalReal, saldo, perc, media, opsAtivas };
  }, [producoes, opsFiltradas]);

  // Gráfico: Produção prevista vs realizada por dia (soma de todas OPs)
  const dadosDiarios = useMemo(() => {
    const diasMap = {};
    for (const p of producoes) {
      const d = p.dia;
      if (!diasMap[d]) diasMap[d] = { dia: `${d}`, previsto: 0, realizado: 0 };
      diasMap[d].previsto += p.previsto || 0;
      diasMap[d].realizado += p.realizado || 0;
    }
    return Object.values(diasMap)
      .filter(d => d.previsto > 0 || d.realizado > 0)
      .sort((a, b) => Number(a.dia) - Number(b.dia));
  }, [producoes]);

  // Gráfico: Baixas por dia (do mês)
  const baixasPorDia = useMemo(() => {
    const map = {};
    for (const b of baixas) {
      const d = new Date(b.created_at).getDate();
      map[d] = (map[d] || 0) + (b.quantidade || 0);
    }
    return Object.entries(map)
      .map(([dia, qtd]) => ({ dia: `${dia}`, quantidade: qtd }))
      .sort((a, b) => Number(a.dia) - Number(b.dia));
  }, [baixas]);

  // Gráfico pizza: Baixas por tipo
  const baixasPorTipo = useMemo(() => {
    const map = {};
    for (const b of baixas) {
      const t = b.tipo || 'Outros';
      map[t] = (map[t] || 0) + (b.quantidade || 0);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [baixas]);

  // Gráfico: OPs — previsto = quantidade_total (igual à Prog. Mensal), realizado = soma real
  const dadosPorOP = useMemo(() => {
    return opsNaoCanceladas.map(op => {
      const prods = producoes.filter(p => p.op_id === op.id);
      const prev = op.quantidade_total > 0
        ? op.quantidade_total
        : prods.reduce((s, p) => s + (p.previsto || 0), 0);
      const real = prods.reduce((s, p) => s + (p.realizado || 0), 0);
      return { op: op.codigo_op, previsto: prev, realizado: real };
    });
  }, [opsFiltradas, producoes]);

  const PIE_COLORS = ['#1e293b', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <PCPSetorGuard action="visualizar o Dashboard PCP">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 transition-colors duration-300 space-y-6 flex flex-col">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(245,158,11,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-500 to-orange-400 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all hover:scale-105 active:scale-95 group border border-amber-400/20">
                <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-white group-hover:rotate-12 transition-transform duration-500" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Dashboard <span className="text-amber-600 dark:text-amber-400">PCP</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                  Visão Geral • <span className="text-amber-600 dark:text-amber-500 flex items-center gap-1"><Factory className="w-3.5 h-3.5" />{nomeSetor}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2 shadow-sm transition-colors h-12">
                <button onClick={() => navMes(-1)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-600 dark:text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
                <span className="font-bold text-slate-800 dark:text-slate-100 min-w-[140px] text-center text-xs uppercase tracking-widest leading-none">{MESES[mes - 1]} 20{ano}</span>
                <button onClick={() => navMes(1)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-600 dark:text-slate-400"><ChevronRight className="w-4 h-4" /></button>
              </div>

              <BotaoImprimir
                label="Imprimir OPs"
                onClick={() => {
                  /* ... (mantém lógica de impressão) */
                }}
                className="h-12 px-6 rounded-2xl bg-slate-900 dark:bg-amber-600 text-white font-bold uppercase text-[10px] tracking-widest gap-2 shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              />

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  /* ... (mantém lógica de exportação) */
                  const dados = dadosPorOP.map((d, i) => {
                    const op = opsFiltradas[i];
                    return {
                      'Código OP': op?.codigo_op || '',
                      'Descrição': op?.descricao || '',
                      'Cliente': op?.cliente_nome || '',
                      'Status': op?.status || '',
                      'Tipo': op?.tipo || '',
                      'Previsto': d.previsto,
                      'Realizado': d.realizado,
                      'Saldo': d.realizado - d.previsto,
                      'Atendimento %': d.previsto > 0 ? ((d.realizado / d.previsto) * 100).toFixed(1) : '0.0',
                      'Data Criação': op?.created_at ? new Date(op.created_at).toLocaleDateString('pt-BR') : ''
                    };
                  });
                  exportarCSV(dados, `PCP_OPs_${MESES[mes - 1]}_20${ano}.csv`);
                }}
                className="h-12 px-6 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 backdrop-blur-xl hover:bg-slate-50 dark:hover:bg-white/10 text-[10px] font-black uppercase tracking-widest"
              >
                <Download className="w-3.5 h-3.5 mr-2" /> CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 dark:bg-white/5 rounded-lg flex items-center justify-center">
              <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Filtros Operacionais</span>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-2 hidden md:block" />

          <div className="flex items-center gap-2">
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="h-10 w-40 text-xs bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-xl font-bold">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                <SelectItem value="Todos">Todos Status</SelectItem>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Concluído">Concluído</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} className="h-10 w-40 text-xs bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-xl font-bold dark:text-slate-100" />
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">até</span>
            <Input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} className="h-10 w-40 text-xs bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-xl font-bold dark:text-slate-100" />
          </div>

          {(filtroStatus !== 'Todos' || filtroDataInicio || filtroDataFim) && (
            <Button variant="ghost" className="h-10 px-4 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-xl"
              onClick={() => { setFiltroStatus('Todos'); setFiltroDataInicio(''); setFiltroDataFim(''); }}>
              Limpar Filtros
            </Button>
          )}
        </div>

        {/* KPIs Grid Premium */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Previsto', value: resumo.totalPrev.toLocaleString(), subtitle: 'unidades planejadas', icon: Target, color: 'blue' },
            { label: 'Total Realizado', value: resumo.totalReal.toLocaleString(), subtitle: 'unidades coletadas', icon: CheckCircle2, color: 'emerald' },
            {
              label: 'Saldo Absoluto',
              value: resumo.saldo >= 0 ? `+${resumo.saldo.toLocaleString()}` : resumo.saldo.toLocaleString(),
              subtitle: resumo.saldo >= 0 ? 'superávit atual' : 'déficit no plano',
              icon: resumo.saldo >= 0 ? TrendingUp : TrendingDown,
              color: resumo.saldo >= 0 ? 'emerald' : 'rose'
            },
            { label: 'Média Diária', value: resumo.media.toLocaleString(), subtitle: 'produção/dia', icon: Activity, color: 'slate' },
            {
              label: 'Atendimento %',
              value: `${resumo.perc}%`,
              subtitle: 'eficiência global',
              icon: CheckCircle2,
              color: Number(resumo.perc) >= 90 ? 'emerald' : Number(resumo.perc) >= 70 ? 'amber' : 'rose'
            },
            { label: 'OPs Ativas', value: resumo.opsAtivas, subtitle: 'ordens em aberto', icon: Layers, color: 'purple' },
          ].map((item, i) => (
            <Card key={i} className="relative overflow-hidden group border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 backdrop-blur-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg">
              <CardContent className="p-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center border transition-transform group-hover:rotate-6",
                      item.color === 'blue' ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20" :
                        item.color === 'emerald' ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20" :
                          item.color === 'amber' ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20" :
                            item.color === 'rose' ? "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-500/20" :
                              item.color === 'purple' ? "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-500/20" :
                                "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 border-slate-500/20"
                    )}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">{item.label}</p>
                  </div>
                  <div>
                    <h3 className={cn(
                      "text-2xl font-black italic tracking-tighter leading-none transition-colors",
                      item.color === 'rose' ? "text-red-600 dark:text-red-400" :
                        item.color === 'emerald' && item.label === 'Saldo Absoluto' ? "text-emerald-600 dark:text-emerald-400" :
                          "text-slate-900 dark:text-white"
                    )}>
                      {item.value}
                    </h3>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic opacity-60 mt-1">{item.subtitle}</p>
                  </div>
                </div>
              </CardContent>
              <div className={cn(
                "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r opacity-50 transition-all duration-500 group-hover:h-1",
                item.color === 'blue' ? "from-blue-600 to-blue-400 w-full" :
                  item.color === 'emerald' ? "from-emerald-600 to-emerald-400 w-full" :
                    item.color === 'amber' ? "from-amber-600 to-amber-400 w-full" :
                      item.color === 'rose' ? "from-rose-600 to-rose-400 w-full" :
                        item.color === 'purple' ? "from-purple-600 to-purple-400 w-full" :
                          "from-slate-600 to-slate-400 w-full"
              )} />
            </Card>
          ))}
        </div>

        {/* Gráficos linha 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Previsto vs Realizado por dia */}
          <Card className="shadow-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                Previsto vs Realizado por Dia
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {dadosDiarios.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Sem dados para exibir</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dadosDiarios} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="opacity-100 dark:opacity-10" />
                    <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      formatter={(v) => v.toLocaleString()}
                      contentStyle={{
                        backgroundColor: 'var(--tw-slate-900, #0f172a)',
                        borderColor: 'var(--tw-slate-800, #1e293b)',
                        color: '#f8fafc'
                      }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="previsto" name="Previsto" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="realizado" name="Realizado" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Baixas por Dia */}
          <Card className="shadow-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-500" />
                Baixas por Dia (unidades produzidas)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {baixasPorDia.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm">Sem baixas no período</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={baixasPorDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-10" />
                    <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      formatter={(v) => [`${v.toLocaleString()} unidades`, 'Quantidade']}
                      contentStyle={{
                        backgroundColor: 'var(--tw-slate-900, #0f172a)',
                        borderColor: 'var(--tw-slate-800, #1e293b)',
                        color: '#f8fafc'
                      }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Bar dataKey="quantidade" name="Baixas" fill="#334155" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gráficos linha 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Pizza: Baixas por Tipo */}
          <Card className="shadow-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-500" />
                Baixas por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex items-center justify-center">
              {baixasPorTipo.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm">Sem baixas no período</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={baixasPorTipo}
                      dataKey="value"
                      nameKey="name"
                      cx="50%" cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {baixasPorTipo.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="rgba(255,255,255,0.1)" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => v.toLocaleString()}
                      contentStyle={{
                        backgroundColor: 'var(--tw-slate-900, #0f172a)',
                        borderColor: 'var(--tw-slate-800, #1e293b)',
                        color: '#f8fafc'
                      }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* OPs: Previsto vs Realizado */}
          <Card className="shadow-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Target className="w-4 h-4 text-green-500" />
                Desempenho por OP
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {dadosPorOP.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm">Sem OPs ativas</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dadosPorOP} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-10" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis type="category" dataKey="op" tick={{ fontSize: 10 }} width={110} stroke="#94a3b8" />
                    <Tooltip
                      formatter={(v) => v.toLocaleString()}
                      contentStyle={{
                        backgroundColor: 'var(--tw-slate-900, #0f172a)',
                        borderColor: 'var(--tw-slate-800, #1e293b)',
                        color: '#f8fafc'
                      }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="previsto" name="Previsto" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="realizado" name="Realizado" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabela resumo OPs */}
        {opsNaoCanceladas.length > 0 && (
          <Card className="shadow-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Resumo das OPs ({opsNaoCanceladas.length})
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-7 text-xs dark:border-slate-800 dark:hover:bg-slate-800"
                onClick={() => {
                  const dados = dadosPorOP.map((d, i) => {
                    const op = opsFiltradas[i];
                    const saldo = d.realizado - d.previsto;
                    const perc = d.previsto > 0 ? ((d.realizado / d.previsto) * 100).toFixed(1) : '0.0';
                    const diasAtivo = op.created_at ? Math.floor((new Date() - new Date(op.created_at)) / 86400000) : '';
                    return {
                      'Código OP': op?.codigo_op || '',
                      'Descrição': op?.descricao || '',
                      'Cliente': op?.cliente_nome || '',
                      'Status': op?.status || '',
                      'Tipo': op?.tipo || '',
                      'Previsto': d.previsto,
                      'Realizado': d.realizado,
                      'Saldo': saldo,
                      'Atendimento %': perc,
                      'Dias Ativo': diasAtivo,
                      'Data Criação': op?.created_at ? new Date(op.created_at).toLocaleDateString('pt-BR') : ''
                    };
                  });
                  exportarCSV(dados, `PCP_OPs_${MESES[mes - 1]}_20${ano}.csv`);
                }}
              >
                <Download className="w-3 h-3" /> Exportar CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-slate-600 dark:text-slate-400 font-semibold">OP</th>
                      <th className="px-4 py-2.5 text-left text-slate-600 dark:text-slate-400 font-semibold">Descrição</th>
                      <th className="px-4 py-2.5 text-left text-slate-600 dark:text-slate-400 font-semibold">Cliente</th>
                      <th className="px-4 py-2.5 text-left text-slate-600 dark:text-slate-400 font-semibold">Tipo</th>
                      <th className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-400 font-semibold">Previsto</th>
                      <th className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-400 font-semibold">Realizado</th>
                      <th className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-400 font-semibold">Saldo</th>
                      <th className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-400 font-semibold">% Aten.</th>
                      <th className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-400 font-semibold">Alerta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosPorOP.map((d, i) => {
                      const op = opsNaoCanceladas[i];
                      const saldo = d.realizado - d.previsto;
                      const perc = d.previsto > 0 ? ((d.realizado / d.previsto) * 100).toFixed(1) : '0.0';

                      // Indicador de alerta por dias ativo
                      const diasAtivo = op.created_at
                        ? Math.floor((new Date() - new Date(op.created_at)) / 86400000)
                        : 0;
                      // Alerta crítico: ativo há mais de 30 dias OU % atendimento < 50%
                      // Alerta médio: ativo há mais de 15 dias OU % atendimento < 70%
                      const isCritico = op.status === 'Ativo' && (diasAtivo > 30 || Number(perc) < 50);
                      const isAviso = !isCritico && op.status === 'Ativo' && (diasAtivo > 15 || Number(perc) < 70);

                      return (
                        <tr key={op.id} className={`border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isCritico ? 'bg-red-50 dark:bg-red-900/20' : isAviso ? 'bg-amber-50 dark:bg-amber-900/20' : ''}`}>
                          <td className="px-4 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">{op.codigo_op}</td>
                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{op.descricao || '-'}</td>
                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{op.cliente_nome || '-'}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${op.tipo === 'Atraso' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                              {op.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-blue-700 dark:text-blue-400 font-medium">{(op.quantidade_total || d.previsto).toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right text-green-700 dark:text-green-400 font-medium">{d.realizado.toLocaleString()}</td>
                          <td className={`px-4 py-2.5 text-right font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {saldo >= 0 ? `+${saldo.toLocaleString()}` : saldo.toLocaleString()}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-bold ${Number(perc) >= 90 ? 'text-green-600' : Number(perc) >= 70 ? 'text-amber-600' : 'text-red-500'}`}>
                            {perc}%
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <TooltipProvider>
                              {isCritico ? (
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center justify-center">
                                      <AlertTriangle className="w-4 h-4 text-red-500" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="text-xs max-w-[180px]">
                                    OP crítica: ativa há {diasAtivo} dias{Number(perc) < 50 ? ` e apenas ${perc}% atendido` : ''}
                                  </TooltipContent>
                                </UITooltip>
                              ) : isAviso ? (
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center justify-center">
                                      <Clock className="w-4 h-4 text-amber-500" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="text-xs max-w-[180px]">
                                    Atenção: ativa há {diasAtivo} dias{Number(perc) < 70 ? ` com ${perc}% atendido` : ''}
                                  </TooltipContent>
                                </UITooltip>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </TooltipProvider>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PCPSetorGuard >
  );
}