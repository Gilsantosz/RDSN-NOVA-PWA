// @ts-nocheck
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp, Package, CircleCheck, AlertTriangle,
  PlayCircle, Clock, Zap, BarChart3, Activity
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import NotificacoesReserva from './NotificacoesReserva';
import AlertasPrazos from './AlertasPrazos';

const COLORS = {
  RESERVADO: '#94a3b8',
  EM_PRODUCAO: '#3b82f6',
  BAIXADO: '#10b981',
  PRODUZIDO: '#22c55e',
  CANCELADO: '#ef4444',
  LIBERADO: '#f59e0b'
};

export default function DashboardReservas({ filtroAno, setFiltroAno, sequencias }) {
  const { setorAtivo, isAdmin } = useSetor();

  // Obter usuário atual
  const { data: user } = useQuery({
    queryKey: ['internalUser'],
    queryFn: () => {
      const loggedUser = localStorage.getItem('internalUser');
      return loggedUser ? JSON.parse(loggedUser) : null;
    },
    staleTime: Infinity
  });

  const { data: reservas = [] } = useQuery({
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

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ['movimentacoes-dashboard', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await base44.entities.MovimentacaoEstoque.list('-created_at', 100);
      }
      const todas = await base44.entities.MovimentacaoEstoque.list('-created_at', 100);
      // Filtrar por produtos do setor
      const produtos = await base44.entities.Produto.filter({ setor_id: setorAtivo });
      const produtoIds = produtos.map(p => p.id);
      return todas.filter(m => produtoIds.includes(m.produto_id));
    },
    enabled: !!setorAtivo
  });

  const { data: auditoria = [] } = useQuery({
    queryKey: ['auditoria-dashboard', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await base44.entities.Auditoria.list('-created_at', 50);
      }
      const todas = await base44.entities.Auditoria.list('-created_at', 50);
      // Filtrar por produtos do setor
      const seqs = await base44.entities.SequenciaAnual.filter({ setor_id: setorAtivo });
      const letras = [...new Set(seqs.map(s => s.letra_produto))];
      return todas.filter(a => letras.includes(a.letra_produto));
    },
    enabled: !!setorAtivo
  });

  const stats = useMemo(() => {
    const hoje = new Date().toDateString();
    const filtradas = reservas.filter(r => !filtroAno || r.ano === filtroAno);

    const producaoDia = movimentacoes
      .filter(m => m.tipo === 'PRODUCAO' && new Date(m.created_at).toDateString() === hoje)
      .reduce((acc, m) => acc + (m.quantidade || 0), 0);

    const ultimas24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const alertasRecentes = auditoria.filter(a =>
      new Date(a.created_at) >= ultimas24h &&
      ['RESERVA_CANCELADA', 'ANO_ENCERRADO'].includes(a.acao)
    );

    const lotesEmProducao = filtradas.filter(r => r.status === 'EM_PRODUCAO');

    const totalReservado = filtradas.reduce((acc, r) => acc + (r.quantidade || 0), 0);
    const totalProduzido = filtradas.reduce((acc, r) => acc + (r.quantidade_baixada || 0), 0);

    const statusCount = filtradas.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    const statusChartData = Object.entries(statusCount).map(([status, count]) => ({
      name: status.replace('_', ' '),
      value: count,
      color: COLORS[status]
    }));

    const porCliente = filtradas.reduce((acc, r) => {
      if (r.cliente) {
        acc[r.cliente] = (acc[r.cliente] || 0) + (r.quantidade || 0);
      }
      return acc;
    }, {});

    const topClientes = Object.entries(porCliente)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({
        cliente: name,
        quantidade: value
      }));

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
      statusChartData,
      topClientes,
      dadosMensais,
      percentualProduzido: totalReservado > 0 ? Math.round((totalProduzido / totalReservado) * 100) : 0
    };
  }, [reservas, filtroAno, movimentacoes, auditoria]);

  const anosDisponiveis = [...new Set(sequencias.map(s => s.ano))].sort((a, b) => b - a);

  return (
    <div className="space-y-6">

      {/* Header com Filtro */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard de Reservas</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Visão geral da produção e reservas</p>
          </div>
        </div>
        <Select value={filtroAno ? String(filtroAno) : 'all'} onValueChange={(v) => setFiltroAno(v === 'all' ? null : Number(v))}>
          <SelectTrigger className="w-[140px] bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os anos</SelectItem>
            {anosDisponiveis.map(ano => (
              <SelectItem key={ano} value={String(ano)}>20{ano}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs Premium */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Reservado', value: stats.totalReservado.toLocaleString(), subtitle: 'unidades bloqueadas', icon: Package, color: 'blue' },
          { label: 'Total Produzido', value: stats.totalProduzido.toLocaleString(), subtitle: `${stats.percentualProduzido}% do total`, icon: CircleCheck, color: 'emerald' },
          { label: 'Produção Hoje', value: stats.producaoDia.toLocaleString(), subtitle: 'unidades coletadas', icon: Zap, color: 'blue' },
          { label: 'Em Produção', value: stats.lotesEmProducao.length, subtitle: 'lotes ativos', icon: PlayCircle, color: 'indigo' },
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
                    "from-slate-600 to-slate-400 w-full"
            )} />
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produção por Mês */}
        <Card className="hover:shadow-lg transition-shadow dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Produção por Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {stats.dadosMensais.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.dadosMensais}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-10" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--tw-slate-950, #fff)',
                      border: '1px solid var(--tw-slate-800, #e2e8f0)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'var(--tw-slate-100, #1e293b)'
                    }}
                    itemStyle={{ color: 'inherit' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="reservado" fill="#94a3b8" name="Reservado" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="produzido" fill="#10b981" name="Produzido" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status dos Lotes */}
        <Card className="hover:shadow-lg transition-shadow dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Status dos Lotes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {stats.statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Clientes e Lotes em Produção */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Clientes */}
        <Card className="hover:shadow-lg transition-shadow dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Top 5 Clientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {stats.topClientes.length > 0 ? (
              <div className="space-y-4">
                {stats.topClientes.map((cliente, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{cliente.cliente}</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{cliente.quantidade.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">
                Nenhum cliente com reservas
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lotes em Produção */}
        <Card className="hover:shadow-lg transition-shadow dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Lotes em Produção
              <Badge variant="secondary" className="ml-auto">{stats.lotesEmProducao.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {stats.lotesEmProducao.length > 0 ? (
              <div className="space-y-3 max-h-[320px] overflow-y-auto">
                {stats.lotesEmProducao.slice(0, 5).map(lote => {
                  const progresso = ((lote.quantidade_baixada || 0) / lote.quantidade) * 100;
                  return (
                    <div key={lote.id} className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{lote.codigo_completo}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{lote.cliente || 'Cliente não especificado'}</p>
                        </div>
                        <Badge className="bg-blue-600 dark:bg-blue-700">Em Produção</Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                          <span>Progresso</span>
                          <span className="font-medium">
                            {(lote.quantidade_baixada || 0).toLocaleString()} / {lote.quantidade.toLocaleString()}
                          </span>
                        </div>
                        <Progress value={progresso} className="h-2 dark:bg-slate-800" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">
                <CircleCheck className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>Nenhum lote em produção no momento</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alertas Recentes */}
      {stats.alertasRecentes.length > 0 && (
        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="border-b border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10">
            <CardTitle className="text-lg font-semibold text-red-900 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Alertas Recentes (24h)
              <Badge variant="destructive" className="ml-auto">{stats.alertasRecentes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {stats.alertasRecentes.slice(0, 3).map(alerta => (
                <div key={alerta.id} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {alerta.acao === 'RESERVA_CANCELADA' ? 'Reserva Cancelada' : 'Ano Encerrado'}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{alerta.letra_produto}{alerta.ano} • {alerta.created_by}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      {new Date(alerta.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notificações e Alertas de Prazos - ao final */}
      {user?.id && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <NotificacoesReserva userId={user.id} />
          </div>
          <div>
            <AlertasPrazos reservas={reservas.filter(r => !filtroAno || r.ano === filtroAno)} userId={user.id} />
          </div>
        </div>
      )}
    </div>
  );
}