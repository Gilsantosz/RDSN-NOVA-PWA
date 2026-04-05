import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PremiumCard } from '@/components/ui/PremiumCard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Filter, X, ArrowUpCircle, ArrowDownCircle, RefreshCw,
  Factory, Package, TrendingUp, BarChart3, Activity
} from 'lucide-react';
import ExportarRelatorio from './ExportarRelatorio';
import PaginacaoTabela from '../tables/PaginacaoTabela';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TIPO_CONFIG = {
  ENTRADA: { label: 'Entrada', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20', icon: ArrowUpCircle },
  SAIDA: { label: 'Saída', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20', icon: ArrowDownCircle },
  AJUSTE: { label: 'Ajuste', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20', icon: RefreshCw },
  PRODUCAO: { label: 'Produção', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20', icon: Factory },
  BAIXA: { label: 'Baixa', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20', icon: Package }
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="font-bold text-slate-700 dark:text-slate-300">{entry.name}:</span>
          <span className="font-black text-slate-900 dark:text-white">{entry.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export default function RelatorioMovimentacaoEstoque() {
  const { setorAtivo, isAdmin } = useSetor();

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(50);

  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    produto_id: '',
    tipo: '',
    celula: '',
    operador: ''
  });

  const { data: movimentacoes = [], isLoading } = useQuery({
    queryKey: ['mov-estoque-relatorio', setorAtivo],
    queryFn: async () => {
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.MovimentacaoEstoque.list('-created_at', 2000);
      }
      const todas = await rdsn.entities.MovimentacaoEstoque.list('-created_at', 2000);
      const produtosDoSetor = await rdsn.entities.Produto.filter({ setor_id: setorAtivo });
      const produtoIds = produtosDoSetor.map(p => p.id);
      return todas.filter(m => produtoIds.includes(m.produto_id));
    },
    enabled: !!setorAtivo
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-mov', setorAtivo],
    queryFn: async () => {
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.Produto.list();
      }
      return await rdsn.entities.Produto.filter({ setor_id: setorAtivo });
    },
    enabled: !!setorAtivo
  });

  const getProdutoNome = (produtoId) => {
    const p = produtos.find(pr => pr.id === produtoId);
    return p ? `${p.letra_produto}${p.sufixo ? ' - ' + p.sufixo : ''} ${p.descricao || p.modelo || ''}`.trim() : produtoId || '-';
  };

  const dadosFiltrados = useMemo(() => {
    let resultado = [...movimentacoes];

    if (filtros.dataInicio) {
      const di = new Date(filtros.dataInicio);
      resultado = resultado.filter(m => new Date(m.created_at) >= di);
    }
    if (filtros.dataFim) {
      const df = new Date(filtros.dataFim);
      df.setHours(23, 59, 59, 999);
      resultado = resultado.filter(m => new Date(m.created_at) <= df);
    }
    if (filtros.produto_id) {
      resultado = resultado.filter(m => m.produto_id === filtros.produto_id);
    }
    if (filtros.tipo) {
      resultado = resultado.filter(m => m.tipo === filtros.tipo);
    }
    if (filtros.celula) {
      resultado = resultado.filter(m => m.celula?.toLowerCase().includes(filtros.celula.toLowerCase()));
    }
    if (filtros.operador) {
      resultado = resultado.filter(m => m.operador?.toLowerCase().includes(filtros.operador.toLowerCase()));
    }

    return resultado;
  }, [movimentacoes, filtros]);

  // Reset página ao mudar filtros
  React.useEffect(() => { setPaginaAtual(1); }, [filtros]);

  const dadosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return dadosFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [dadosFiltrados, paginaAtual, itensPorPagina]);

  // Estatísticas
  const estatisticas = useMemo(() => {
    const entradas = dadosFiltrados.filter(m => m.tipo === 'ENTRADA' || m.tipo === 'PRODUCAO');
    const saidas = dadosFiltrados.filter(m => m.tipo === 'SAIDA' || m.tipo === 'BAIXA');
    const totalEntrada = entradas.reduce((acc, m) => acc + (m.quantidade || 0), 0);
    const totalSaida = saidas.reduce((acc, m) => acc + (m.quantidade || 0), 0);

    // Por período (mês)
    const porMes = dadosFiltrados.reduce((acc, m) => {
      const data = new Date(m.created_at);
      const mes = format(data, 'MMM/yy', { locale: ptBR });
      if (!acc[mes]) acc[mes] = { mes, entrada: 0, saida: 0, ajuste: 0 };
      if (m.tipo === 'ENTRADA' || m.tipo === 'PRODUCAO') acc[mes].entrada += (m.quantidade || 0);
      else if (m.tipo === 'SAIDA' || m.tipo === 'BAIXA') acc[mes].saida += (m.quantidade || 0);
      else acc[mes].ajuste += (m.quantidade || 0);
      return acc;
    }, {});

    // Por produto
    const porProduto = dadosFiltrados.reduce((acc, m) => {
      const nome = getProdutoNome(m.produto_id);
      if (!acc[nome]) acc[nome] = { produto: nome, entrada: 0, saida: 0 };
      if (m.tipo === 'ENTRADA' || m.tipo === 'PRODUCAO') acc[nome].entrada += (m.quantidade || 0);
      else acc[nome].saida += (m.quantidade || 0);
      return acc;
    }, {});

    return {
      totalMovimentacoes: dadosFiltrados.length,
      totalEntrada,
      totalSaida,
      saldo: totalEntrada - totalSaida,
      porMes: Object.values(porMes),
      porProduto: Object.values(porProduto).sort((a, b) => (b.entrada + b.saida) - (a.entrada + a.saida)).slice(0, 10)
    };
  }, [dadosFiltrados, produtos]);

  const limparFiltros = () => {
    setFiltros({ dataInicio: '', dataFim: '', produto_id: '', tipo: '', celula: '', operador: '' });
  };

  const dadosExportacao = useMemo(() => {
    return dadosFiltrados.map(m => ({
      data: format(new Date(m.created_at), 'dd/MM/yy HH:mm'),
      produto: getProdutoNome(m.produto_id),
      tipo: TIPO_CONFIG[m.tipo]?.label || m.tipo,
      quantidade: m.quantidade || 0,
      qtd_anterior: m.quantidade_anterior ?? '-',
      qtd_nova: m.quantidade_nova ?? '-',
      celula: m.celula || '-',
      operador: m.operador || '-',
      observacao: m.observacao || '-'
    }));
  }, [dadosFiltrados, produtos]);

  const colunasExportacao = [
    { key: 'data', label: 'Data/Hora', width: 16 },
    { key: 'produto', label: 'Produto', width: 20 },
    { key: 'tipo', label: 'Tipo', width: 12 },
    { key: 'quantidade', label: 'Quantidade', width: 12, tipo: 'numero' },
    { key: 'qtd_anterior', label: 'Qtd Anterior', width: 12, tipo: 'numero' },
    { key: 'qtd_nova', label: 'Qtd Nova', width: 12, tipo: 'numero' },
    { key: 'celula', label: 'Celula', width: 14 },
    { key: 'operador', label: 'Operador', width: 16 },
    { key: 'observacao', label: 'Observacao', width: 25 }
  ];

  const resumoExportacao = {
    'Total Movimentacoes': estatisticas.totalMovimentacoes,
    'Entradas/Producao': estatisticas.totalEntrada,
    'Saidas/Baixas': estatisticas.totalSaida,
    'Saldo': estatisticas.saldo
  };

  const filtrosExportacao = {
    'Data Inicio': filtros.dataInicio || '-',
    'Data Fim': filtros.dataFim || '-',
    'Tipo': filtros.tipo ? (TIPO_CONFIG[filtros.tipo]?.label || filtros.tipo) : 'Todos',
    'Celula': filtros.celula || 'Todas',
    'Operador': filtros.operador || 'Todos'
  };

  const tiposDisponiveis = Object.keys(TIPO_CONFIG);

  return (
    <div className="space-y-6">
      {/* Filtros Premium */}
      <PremiumCard
        title="Filtros"
        icon={Filter}
        iconColor="#64748b"
        badge={
          <Button
            variant="ghost"
            size="sm"
            onClick={limparFiltros}
            className="h-9 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/5 transition-all"
          >
            <X className="w-3.5 h-3.5 mr-1.5" />
            Limpar
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 italic">Data Início</Label>
            <Input
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => setFiltros(p => ({ ...p, dataInicio: e.target.value }))}
              className="h-11 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 rounded-xl px-4 text-sm font-bold text-slate-900 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 italic">Data Fim</Label>
            <Input
              type="date"
              value={filtros.dataFim}
              onChange={(e) => setFiltros(p => ({ ...p, dataFim: e.target.value }))}
              className="h-11 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 rounded-xl px-4 text-sm font-bold text-slate-900 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 italic">Produto</Label>
            <Select value={filtros.produto_id} onValueChange={(v) => setFiltros(p => ({ ...p, produto_id: v }))}>
              <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold dark:text-slate-200">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="rounded-xl dark:bg-slate-950 dark:border-white/10 backdrop-blur-xl">
                <SelectItem value={null}>Todos</SelectItem>
                {produtos.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.letra_produto}{p.sufixo ? ' - ' + p.sufixo : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 italic">Tipo</Label>
            <Select value={filtros.tipo} onValueChange={(v) => setFiltros(p => ({ ...p, tipo: v }))}>
              <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold dark:text-slate-200">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="rounded-xl dark:bg-slate-950 dark:border-white/10 backdrop-blur-xl">
                <SelectItem value={null}>Todos</SelectItem>
                {tiposDisponiveis.map(t => (
                  <SelectItem key={t} value={t}>{TIPO_CONFIG[t].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 italic">Célula</Label>
            <Input
              placeholder="Filtrar célula"
              value={filtros.celula}
              onChange={(e) => setFiltros(p => ({ ...p, celula: e.target.value }))}
              className="h-11 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 rounded-xl px-4 text-sm font-bold text-slate-900 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 italic">Operador</Label>
            <Input
              placeholder="Filtrar operador"
              value={filtros.operador}
              onChange={(e) => setFiltros(p => ({ ...p, operador: e.target.value }))}
              className="h-11 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 rounded-xl px-4 text-sm font-bold text-slate-900 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
          <Button size="sm" variant="ghost" onClick={() => {
            const today = new Date().toISOString().split('T')[0];
            setFiltros(p => ({ ...p, dataInicio: today, dataFim: today }));
          }} className="h-8 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-all">Hoje</Button>
          <Button size="sm" variant="ghost" onClick={() => {
            const d = new Date();
            setFiltros(p => ({
              ...p,
              dataInicio: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0],
              dataFim: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
            }));
          }} className="h-8 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-all">Mês Atual</Button>
          <Button size="sm" variant="ghost" onClick={() => {
            const d = new Date();
            const start = new Date(d);
            start.setDate(d.getDate() - 7);
            setFiltros(p => ({
              ...p,
              dataInicio: start.toISOString().split('T')[0],
              dataFim: d.toISOString().split('T')[0]
            }));
          }} className="h-8 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-all">Últimos 7 dias</Button>
        </div>
      </PremiumCard>

      {/* KPIs Premium */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: 'Movimentações',
            value: estatisticas.totalMovimentacoes,
            icon: Activity,
            iconColor: '#3b82f6',
            sublabel: 'registros no período'
          },
          {
            label: 'Entradas/Produção',
            value: estatisticas.totalEntrada.toLocaleString(),
            icon: ArrowUpCircle,
            iconColor: '#10b981',
            sublabel: 'unidades incorporadas'
          },
          {
            label: 'Saídas/Baixas',
            value: estatisticas.totalSaida.toLocaleString(),
            icon: ArrowDownCircle,
            iconColor: '#ef4444',
            sublabel: 'unidades consumidas'
          },
          {
            label: 'Saldo',
            value: `${estatisticas.saldo >= 0 ? '+' : ''}${estatisticas.saldo.toLocaleString()}`,
            icon: TrendingUp,
            iconColor: estatisticas.saldo >= 0 ? '#3b82f6' : '#f59e0b',
            sublabel: 'balanço operacional'
          }
        ].map((kpi, idx) => (
          <PremiumCard key={idx} title={kpi.label} icon={kpi.icon} iconColor={kpi.iconColor}>
            <div className="space-y-1">
              <p className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">{kpi.value}</p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic opacity-60 mt-1">{kpi.sublabel}</p>
            </div>
          </PremiumCard>
        ))}
      </div>

      {/* Gráficos Premium */}
      {estatisticas.porMes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PremiumCard title="Movimentação por Mês" icon={BarChart3} iconColor="#6366f1">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={estatisticas.porMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="mes" fontSize={11} fontWeight={700} tick={{ fill: '#94a3b8' }} axisLine={{ stroke: 'rgba(148,163,184,0.2)' }} />
                <YAxis fontSize={11} fontWeight={700} tick={{ fill: '#94a3b8' }} axisLine={{ stroke: 'rgba(148,163,184,0.2)' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                <Bar dataKey="entrada" name="Entradas" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="saida" name="Saídas" fill="#ef4444" radius={[6, 6, 0, 0]} />
                <Bar dataKey="ajuste" name="Ajustes" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </PremiumCard>

          <PremiumCard title="Top Produtos" icon={Package} iconColor="#0ea5e9">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={estatisticas.porProduto} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis type="number" fontSize={11} fontWeight={700} tick={{ fill: '#94a3b8' }} axisLine={{ stroke: 'rgba(148,163,184,0.2)' }} />
                <YAxis type="category" dataKey="produto" width={120} fontSize={10} fontWeight={700} tick={{ fill: '#94a3b8' }} axisLine={{ stroke: 'rgba(148,163,184,0.2)' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                <Bar dataKey="entrada" name="Entradas" fill="#10b981" radius={[0, 6, 6, 0]} />
                <Bar dataKey="saida" name="Saídas" fill="#ef4444" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </PremiumCard>
        </div>
      )}

      {/* Ações de exportação */}
      <div className="flex gap-3 justify-end">
        <ExportarRelatorio
          dados={dadosExportacao}
          colunas={colunasExportacao}
          titulo="Relatorio Movimentacao Estoque"
          resumo={resumoExportacao}
          filtrosAplicados={filtrosExportacao}
        />
      </div>

      {/* Tabela Premium */}
      <PremiumCard
        title={`Movimentações (${dadosFiltrados.length} registros)`}
        icon={Activity}
        iconColor="#3b82f6"
        noPadding
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-950/50">
              <TableRow className="border-b dark:border-white/5 hover:bg-transparent">
                <TableHead className="text-[10px] uppercase font-black italic tracking-widest py-4 text-slate-500 dark:text-slate-400">Data</TableHead>
                <TableHead className="text-[10px] uppercase font-black italic tracking-widest py-4 text-slate-500 dark:text-slate-400">Produto</TableHead>
                <TableHead className="text-[10px] uppercase font-black italic tracking-widest py-4 text-slate-500 dark:text-slate-400">Tipo</TableHead>
                <TableHead className="text-[10px] uppercase font-black italic tracking-widest py-4 text-slate-500 dark:text-slate-400">Quantidade</TableHead>
                <TableHead className="text-[10px] uppercase font-black italic tracking-widest py-4 text-slate-500 dark:text-slate-400">Anterior</TableHead>
                <TableHead className="text-[10px] uppercase font-black italic tracking-widest py-4 text-slate-500 dark:text-slate-400">Nova</TableHead>
                <TableHead className="text-[10px] uppercase font-black italic tracking-widest py-4 text-slate-500 dark:text-slate-400">Célula</TableHead>
                <TableHead className="text-[10px] uppercase font-black italic tracking-widest py-4 text-slate-500 dark:text-slate-400">Operador</TableHead>
                <TableHead className="text-[10px] uppercase font-black italic tracking-widest py-4 text-slate-500 dark:text-slate-400">Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="hover:bg-transparent border-0">
                  <TableCell colSpan={9} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic">Carregando dados...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : dadosFiltrados.length === 0 ? (
                <TableRow className="hover:bg-transparent border-0">
                  <TableCell colSpan={9} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <Package className="w-10 h-10 text-slate-400" />
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest italic">
                        Nenhuma movimentação encontrada
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                dadosPaginados.map(mov => (
                  <TableRow key={mov.id} className="border-b dark:border-white/5 hover:bg-slate-50 dark:hover:bg-blue-600/5 transition-colors">
                    <TableCell className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {format(new Date(mov.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-slate-700 dark:text-slate-300 max-w-[150px] truncate">
                      {getProdutoNome(mov.produto_id)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${TIPO_CONFIG[mov.tipo]?.color || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'} font-black text-[9px] uppercase rounded-lg`}>
                        {TIPO_CONFIG[mov.tipo]?.label || mov.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-black text-slate-900 dark:text-white italic">{mov.quantidade}</TableCell>
                    <TableCell className="text-sm text-slate-400 dark:text-slate-500 font-medium">{mov.quantidade_anterior ?? '-'}</TableCell>
                    <TableCell className="text-sm text-slate-400 dark:text-slate-500 font-medium">{mov.quantidade_nova ?? '-'}</TableCell>
                    <TableCell className="text-sm font-medium text-slate-600 dark:text-slate-400">{mov.celula || '-'}</TableCell>
                    <TableCell className="text-sm font-medium text-slate-600 dark:text-slate-400">{mov.operador || '-'}</TableCell>
                    <TableCell className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[200px] truncate font-medium italic">{mov.observacao || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="p-4 border-t border-slate-100 dark:border-white/5">
            <PaginacaoTabela
              totalItems={dadosFiltrados.length}
              paginaAtual={paginaAtual}
              itensPorPagina={itensPorPagina}
              onPaginaChange={setPaginaAtual}
              onItensPorPaginaChange={(v) => { setItensPorPagina(v); setPaginaAtual(1); }}
            />
          </div>
        </div>
      </PremiumCard>
    </div>
  );
}