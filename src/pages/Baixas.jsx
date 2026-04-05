// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { cn } from "@/lib/utils";
import { PremiumCard } from '@/components/ui/PremiumCard';
import { Button } from '@/components/ui/button';
import {
  Filter,
  Download,
  Activity,
  ArrowUpDown,
  Calendar,
  Layers,
  User,
  Package,
  TrendingUp,
  BarChart3,
  CalendarDays,
  Hash,
  ScanLine
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import FiltroBaixas from '@/components/baixas/FiltroBaixas';
import BaixaCard from '@/components/baixas/BaixaCard';
import { formatarNumeracao, extrairPrefixo } from '../components/formatacao/FormatacaoNumeracao';

export default function BaixasPage() {
  const { setorAtivo, isAdmin } = useSetor();
  const queryClient = useQueryClient();
  const [filtroData, setFiltroData] = useState('todos'); // hoje, semana, mes, todos, especifico
  const [dataEspecifica, setDataEspecifica] = useState('');
  const [filtros, setFiltros] = useState({
    clientes: [],
    codigos: [],
    operadores: [],
    tipos: [],
    deSetores: [],
    paraSetores: [],
    dataInicio: '',
    dataFim: '',
    consultores: [],
    setoresIndustriais: [],
    requisicao: '',
    pedido: '',
    op: '',
    chassi: ''
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Buscar reservas do setor primeiro
  const { data: reservas = [] } = useQuery({
    queryKey: ['reservas-baixas', setorAtivo],
    queryFn: async () => {
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.ReservaLote.list();
      }
      return await rdsn.entities.ReservaLote.filter({ setor_id: setorAtivo });
    },
    enabled: !!setorAtivo
  });

  // Buscar baixas apenas das reservas do setor
  const { data: baixas = [], isLoading } = useQuery({
    queryKey: ['baixas', setorAtivo, reservas],
    queryFn: async () => {
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.BaixaLote.list('-created_at');
      }
      // Filtrar baixas pelas reservas do setor
      const reservaIds = reservas.map(r => r.id);
      if (reservaIds.length === 0) return [];
      const todas = await rdsn.entities.BaixaLote.list('-created_at');
      return todas.filter(b => reservaIds.includes(b.reserva_id));
    },
    enabled: !!setorAtivo && reservas.length >= 0
  });

  // Buscar setores
  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: () => rdsn.entities.Setor.list()
  });

  // Quando novas baixas chegam, sincronizar com PCP automaticamente
  useEffect(() => {
    if (baixas.length === 0) return;
    // Descobrir meses/anos únicos das baixas recentes e sincronizar
    const hoje = new Date();
    const mes = hoje.getMonth() + 1;
    const ano = hoje.getFullYear() % 100;
    rdsn.functions.invoke('sincronizarBaixasComPCP', { mes, ano })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['pcp-producoes', mes, ano] });
      })
      .catch(() => { });
  }, [baixas.length]);

  // Subscription em tempo real para novas baixas
  useEffect(() => {
    const unsubscribe = rdsn.entities.BaixaLote.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        queryClient.invalidateQueries({ queryKey: ['baixas'] });
        // Sincronizar com PCP no mês correto da baixa
        const hoje = new Date();
        const mes = hoje.getMonth() + 1;
        const ano = hoje.getFullYear() % 100;
        rdsn.functions.invoke('sincronizarBaixasComPCP', { mes, ano })
          .then(() => queryClient.invalidateQueries({ queryKey: ['pcp-producoes', mes, ano] }))
          .catch(() => { });
      }
    });
    return () => unsubscribe();
  }, []);

  // Enriquecer baixas com informações de reserva
  const baixasEnriquecidas = baixas.map(baixa => {
    const reserva = reservas.find(r => r.id === baixa.reserva_id);
    return { ...baixa, reserva };
  });

  // Aplicar filtros (somente se houver filtros ativos)
  const baixasFiltradas = useMemo(() => {
    return baixasEnriquecidas.filter(baixa => {
      // Filtro por data rápido
      const hoje = new Date();
      const hojeStr = hoje.toISOString().split('T')[0]; // YYYY-MM-DD

      if (filtroData === 'hoje') {
        const dataBaixaStr = baixa.created_at?.split('T')[0];
        if (dataBaixaStr !== hojeStr) return false;
      } else if (filtroData === 'semana') {
        const dataBaixa = baixa.created_at ? new Date(baixa.created_at) : null;
        if (!dataBaixa) return false;
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(hoje.getDate() - hoje.getDay());
        inicioSemana.setHours(0, 0, 0, 0);
        if (dataBaixa < inicioSemana) return false;
      } else if (filtroData === 'mes') {
        const dataBaixa = baixa.created_at ? new Date(baixa.created_at) : null;
        if (!dataBaixa) return false;
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        inicioMes.setHours(0, 0, 0, 0);
        if (dataBaixa < inicioMes) return false;
      } else if (filtroData === 'especifico' && dataEspecifica) {
        const dataBaixaStr = baixa.created_at?.split('T')[0];
        if (dataBaixaStr !== dataEspecifica) return false;
      }

      if (filtros.clientes?.length > 0 && !filtros.clientes.includes(baixa.reserva?.cliente)) return false;
      if (filtros.codigos?.length > 0 && !filtros.codigos.includes(baixa.reserva?.codigo_produto)) return false;
      if (filtros.operadores?.length > 0 && !filtros.operadores.includes(baixa.operador)) return false;
      if (filtros.tipos?.length > 0 && !filtros.tipos.includes(baixa.tipo)) return false;
      if (filtros.deSetores?.length > 0 && !filtros.deSetores.includes(baixa.de_setor)) return false;
      if (filtros.paraSetores?.length > 0 && !filtros.paraSetores.includes(baixa.para_setor)) return false;
      
      // Novos filtros industriais
      if (filtros.consultores?.length > 0 && !filtros.consultores.includes(baixa.consultor)) return false;
      if (filtros.setoresIndustriais?.length > 0 && !filtros.setoresIndustriais.includes(baixa.setor)) return false;
      if (filtros.requisicao && !baixa.requisicao?.toLowerCase().includes(filtros.requisicao.toLowerCase())) return false;
      if (filtros.pedido && !baixa.pedido?.toLowerCase().includes(filtros.pedido.toLowerCase())) return false;
      if (filtros.op && !baixa.op?.toLowerCase().includes(filtros.op.toLowerCase())) return false;
      if (filtros.chassi && !baixa.chassi?.toLowerCase().includes(filtros.chassi.toLowerCase())) return false;

      if (filtros.dataInicio && new Date(baixa.created_at) < new Date(filtros.dataInicio)) return false;
      if (filtros.dataFim && new Date(baixa.created_at) > new Date(filtros.dataFim)) return false;
      return true;
    });
  }, [baixasEnriquecidas, filtros, filtroData, dataEspecifica]);

  // Calcular estatísticas
  const stats = {
    totalBaixas: baixasFiltradas.length,
    totalUnidades: baixasFiltradas.reduce((sum, b) => sum + (b.quantidade || 0), 0),
    baixasManual: baixasFiltradas.filter(b => b.tipo === 'MANUAL').length,
    baixasColeta: baixasFiltradas.filter(b => b.tipo === 'COLETA').length
  };

  // Dados para gráficos
  const baixasPorTipo = [
    { name: 'Manual', value: stats.baixasManual, color: '#1e293b' },
    { name: 'Coleta', value: stats.baixasColeta, color: '#475569' }
  ];

  const baixasPorDia = baixasFiltradas.reduce((acc, baixa) => {
    const data = new Date(baixa.created_at).toLocaleDateString('pt-BR');
    const existing = acc.find(item => item.data === data);
    if (existing) {
      existing.quantidade += baixa.quantidade || 0;
    } else {
      acc.push({ data, quantidade: baixa.quantidade || 0 });
    }
    return acc;
  }, []).slice(0, 7).reverse();

  const baixasPorOperador = baixasFiltradas.reduce((acc, baixa) => {
    const operador = baixa.operador || 'Sem operador';
    const existing = acc.find(item => item.operador === operador);
    if (existing) {
      existing.quantidade += baixa.quantidade || 0;
    } else {
      acc.push({ operador, quantidade: baixa.quantidade || 0 });
    }
    return acc;
  }, []).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);

  const handleExportar = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Baixas de Produção');

      // Definir colunas
      worksheet.columns = [
        { header: 'Data', key: 'data', width: 20 },
        { header: 'Código Produto', key: 'codigo', width: 15 },
        { header: 'Cliente', key: 'cliente', width: 25 },
        { header: 'Intervalo', key: 'intervalo', width: 30 },
        { header: 'Quantidade', key: 'quantidade', width: 12 },
        { header: 'Tipo', key: 'tipo', width: 10 },
        { header: 'De Setor', key: 'de_setor', width: 12 },
        { header: 'Local Origem', key: 'local', width: 12 },
        { header: 'Para Setor', key: 'para_setor', width: 12 },
        { header: 'Local Destino', key: 'local_destino', width: 12 },
        { header: 'Operador', key: 'operador', width: 20 },
        { header: 'Consultor', key: 'consultor', width: 15 },
        { header: 'Setor Industrial', key: 'setor', width: 15 },
        { header: 'Requisição', key: 'requisicao', width: 15 },
        { header: 'Pedido', key: 'pedido', width: 15 },
        { header: 'OP', key: 'op', width: 12 },
        { header: 'Chassi', key: 'chassi', width: 20 },
        { header: 'Descrição', key: 'descricao', width: 30 }
      ];

      // Estilizar cabeçalho
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1e293b' }
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Adicionar dados
      baixasFiltradas.forEach((baixa) => {
        const setor = setores.find(s => s.id === baixa.reserva?.setor_id);
        const setorNome = setor?.nome || '';
        const prefixo = baixa.reserva ? extrairPrefixo(baixa.reserva.codigo_completo) : '';
        const numInicial = baixa.reserva ? formatarNumeracao(baixa.numero_inicial, prefixo, setorNome) : '';
        const numFinal = baixa.reserva ? formatarNumeracao(baixa.numero_final, prefixo, setorNome) : '';
        const intervalo = baixa.reserva ? `${baixa.reserva.codigo_completo}${numInicial} - ${baixa.reserva.codigo_completo}${numFinal}` : '';

        worksheet.addRow({
          data: new Date(baixa.created_at).toLocaleString('pt-BR'),
          codigo: baixa.reserva?.codigo_produto || '',
          cliente: baixa.reserva?.cliente || '',
          intervalo,
          quantidade: baixa.quantidade || 0,
          tipo: baixa.tipo || '',
          de_setor: baixa.de_setor || '',
          local: baixa.local || '',
          para_setor: baixa.para_setor || '',
          local_destino: baixa.local_destino || '',
          operador: baixa.operador || '',
          consultor: baixa.consultor || '',
          setor: baixa.setor || '',
          requisicao: baixa.requisicao || '',
          pedido: baixa.pedido || '',
          op: baixa.op || '',
          chassi: baixa.chassi || '',
          descricao: baixa.descricao_item || ''
        });
      });

      // Gerar arquivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `baixas-producao-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar dados');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(37,99,235,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-600 to-indigo-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all hover:scale-105 active:scale-95 group border border-blue-400/20">
                <ScanLine className="w-8 h-8 sm:w-6 sm:h-6 text-white group-hover:rotate-12 transition-transform duration-500" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Baixas de <span className="text-blue-600 dark:text-blue-400">Produção</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                  Rastreabilidade Industrial • Tempo Real • Histórico
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center">
              <Button
                variant={mostrarFiltros ? "default" : "outline"}
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className="h-12 px-6 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 backdrop-blur-xl hover:bg-slate-50 dark:hover:bg-white/10 text-xs font-black uppercase tracking-widest gap-2 shadow-xl"
              >
                <Filter className="w-4 h-4" />
                {mostrarFiltros ? "Fechar Filtros" : "Filtros Avançados"}
              </Button>
              <Button
                onClick={handleExportar}
                className="h-12 px-8 rounded-2xl bg-slate-900 dark:bg-blue-600 text-white font-bold uppercase text-xs tracking-widest gap-2 shadow-xl hover:scale-[1.02] active:scale-95 transition-all border-0 shadow-blue-500/20"
              >
                <Download className="w-4 h-4" />
                Relatório Excel
              </Button>
            </div>
          </div>
        </div>

        {/* Filtros rápidos por data */}
        <div className="flex gap-2 items-center flex-wrap">
          {[
            { id: 'todos', label: 'Histórico Total', icon: Hash },
            { id: 'hoje', label: 'Registros de Hoje', icon: Calendar },
            { id: 'semana', label: 'Esta Semana', icon: CalendarDays },
            { id: 'mes', label: 'Mês Atual', icon: Calendar },
          ].map((btn) => (
            <Button
              key={btn.id}
              variant={filtroData === btn.id ? 'default' : 'outline'}
              onClick={() => setFiltroData(btn.id)}
              size="sm"
              className={cn(
                "h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 transition-all shadow-sm",
                filtroData === btn.id
                  ? "bg-slate-900 text-white dark:bg-blue-600 border-0"
                  : "bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              <btn.icon className="w-3.5 h-3.5" />
              {btn.label}
            </Button>
          ))}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto sm:ml-2 sm:border-l sm:pl-2 dark:border-slate-800">
            <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4 text-slate-500 hidden sm:block" />
            <input
              type="date"
              value={dataEspecifica}
              onChange={(e) => {
                setDataEspecifica(e.target.value);
                if (e.target.value) setFiltroData('especifico');
              }}
              className="px-2 sm:px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:bg-slate-900 dark:text-slate-100 transition-colors"
            />
          </div>
        </div>

        {/* Filtros Avançados */}
        {mostrarFiltros && (
          <FiltroBaixas
            filtros={filtros}
            onChange={setFiltros}
            baixas={baixasEnriquecidas}
            setores={setores}
          />
        )}

        {/* Cards de Estatísticas Premium */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <PremiumCard
            title="Total de Baixas"
            icon={Package}
            className="hover:scale-[1.02] transition-all"
          >
            <h3 className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter">{stats.totalBaixas}</h3>
            <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold italic uppercase mt-2 opacity-80">Registros Processados</p>
          </PremiumCard>

          <PremiumCard
            title="Unidades Totais"
            icon={TrendingUp}
            className="hover:scale-[1.02] transition-all"
          >
            <h3 className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter">{stats.totalUnidades.toLocaleString()}</h3>
            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold italic uppercase mt-2 opacity-80">Volume Industrial</p>
          </PremiumCard>

          <PremiumCard
            title="Coletas Manuais"
            icon={User}
            className="hover:scale-[1.02] transition-all"
          >
            <h3 className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter">{stats.baixasManual}</h3>
            <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold italic uppercase mt-2 opacity-80">Intervenções Humanas</p>
          </PremiumCard>

          <PremiumCard
            title="Coletas Diretas"
            icon={Calendar}
            className="hover:scale-[1.02] transition-all"
          >
            <h3 className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter">{stats.baixasColeta}</h3>
            <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold italic uppercase mt-2 opacity-80">Processamento Scanner</p>
          </PremiumCard>
        </div>

        {/* Gráfico de Baixas por Dia */}
        <PremiumCard
          title="Analítico de Produtividade Diária"
          icon={BarChart3}
          className="hover:shadow-blue-500/10"
        >
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={baixasPorDia} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="opacity-50 dark:opacity-5" vertical={false} />
                <XAxis
                  dataKey="data"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 'bold', fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 'bold', fill: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(51, 65, 85, 0.5)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(10px)',
                    color: '#f8fafc',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  itemStyle={{ color: '#60a5fa', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)', radius: 10 }}
                  formatter={(value) => [`${value.toLocaleString()} un`, 'Produção']}
                />
                <Bar
                  dataKey="quantidade"
                  fill="url(#barGradient)"
                  radius={[10, 10, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PremiumCard>

        {/* Gráficos Analíticos de Apoio */}
      </div>

      {/* Gráficos Analíticos de Apoio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PremiumCard
          title="Distribuição por Tipo"
          icon={Layers}
          className="hover:shadow-indigo-500/10"
        >
          <div className="h-[250px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={baixasPorTipo}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {baixasPorTipo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(51, 65, 85, 0.5)',
                    borderRadius: '16px',
                    color: '#f8fafc'
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </PremiumCard>

        <PremiumCard
          title="TOP 5 Operadores"
          icon={User}
          className="hover:shadow-emerald-500/10"
        >
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={baixasPorOperador}
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="opacity-10" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="operador"
                  type="category"
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(51, 65, 85, 0.5)',
                    borderRadius: '12px',
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                />
                <Bar dataKey="quantidade" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PremiumCard>
      </div>

      {/* Journal Operacional */}
      <PremiumCard
        title="Journal Operacional"
        icon={Activity}
        className="mb-12"
        badge={
          <Button variant="ghost" size="sm" className="h-12 px-6 rounded-2xl border border-slate-200 dark:border-white/10 dark:bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] italic transition-all hover:bg-slate-50 dark:hover:bg-white/10 text-slate-900 dark:text-white">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Sync Order
          </Button>
        }
      >
        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest italic mb-6 opacity-70">
          Rastreabilidade Coleta • {baixasFiltradas.length} Eventos
        </p>
        {isLoading ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400 italic font-bold uppercase tracking-widest text-xs">Carregando Fluxos...</div>
        ) : baixasFiltradas.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400 italic">Nenhum evento registrado no período selecionado</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {baixasFiltradas.map((baixa) => (
              <BaixaCard
                key={baixa.id}
                baixa={baixa}
                setores={setores}
              />
            ))}
          </div>
        )}
      </PremiumCard>
    </div>
  );
}