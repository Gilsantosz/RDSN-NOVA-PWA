// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { FileText, TrendingUp, Package, Users, Eye } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MonthlyProductionChart from '../components/charts/MonthlyProductionChart';
import AdvancedFilters from '../components/relatorios/AdvancedFilters';
import ReportPresets from '../components/relatorios/ReportPresets';
import RelatorioCustomizavel from '../components/relatorios/RelatorioCustomizavel';
import RelatorioLotesDetalhado from '../components/relatorios/RelatorioLotesDetalhado';
import RelatorioMovimentacaoEstoque from '../components/relatorios/RelatorioMovimentacaoEstoque';
import ExportarRelatorio from '../components/relatorios/ExportarRelatorio';
import BotaoImprimir, { imprimirRelatorio } from '../components/relatorios/BotaoImprimir';

export default function Relatorios() {
  const { setorAtivo, isAdmin } = useSetor();
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    letra_produto: 'TODOS',
    cliente: 'TODOS',
    status: 'TODOS',
    celula: 'TODOS',
    operador: 'TODOS'
  });
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  const [mostrarDetalheBaixas, setMostrarDetalheBaixas] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);

  const { data: reservas = [] } = useQuery({
    queryKey: ['reservas-relatorio', setorAtivo],
    queryFn: async () => {
      if (isAdmin && setorAtivo === 'ALL') {
        return await base44.entities.ReservaLote.list('-created_at', 1000);
      }
      return await base44.entities.ReservaLote.filter({ setor_id: setorAtivo }, '-created_at', 1000);
    },
    enabled: !!setorAtivo
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos', setorAtivo],
    queryFn: async () => {
      if (isAdmin && setorAtivo === 'ALL') {
        return await base44.entities.Produto.list();
      }
      return await base44.entities.Produto.filter({ setor_id: setorAtivo });
    },
    enabled: !!setorAtivo
  });

  const { data: baixas = [] } = useQuery({
    queryKey: ['baixas-relatorio', setorAtivo],
    queryFn: async () => {
      if (isAdmin && setorAtivo === 'ALL') {
        return await base44.entities.BaixaLote.list('-created_at', 1000);
      }

      const todas = await base44.entities.BaixaLote.list('-created_at', 1000);
      // Filtrar por reservas do setor
      const reservasDoSetor = await base44.entities.ReservaLote.filter({ setor_id: setorAtivo });
      const reservaIds = reservasDoSetor.map(r => r.id);
      return todas.filter(b => reservaIds.includes(b.reserva_id));
    },
    enabled: !!setorAtivo
  });

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ['movimentacoes', setorAtivo],
    queryFn: async () => {
      if (isAdmin && setorAtivo === 'ALL') {
        return await base44.entities.MovimentacaoEstoque.list('-created_at', 1000);
      }

      const todas = await base44.entities.MovimentacaoEstoque.list('-created_at', 1000);
      // Filtrar por produtos do setor
      const produtosDoSetor = await base44.entities.Produto.filter({ setor_id: setorAtivo });
      const produtoIds = produtosDoSetor.map(p => p.id);
      return todas.filter(m => produtoIds.includes(m.produto_id));
    },
    enabled: !!setorAtivo
  });

  // Processar dados filtrados
  const dadosFiltrados = useMemo(() => {
    let baixasFiltradas = [...baixas];
    let movFiltradas = [...movimentacoes];
    let reservasFiltradas = [...reservas];

    // Filtro de data
    if (filters.dataInicio) {
      const dataInicio = new Date(filters.dataInicio);
      baixasFiltradas = baixasFiltradas.filter(b => new Date(b.created_at) >= dataInicio);
      movFiltradas = movFiltradas.filter(m => new Date(m.created_at) >= dataInicio);
      reservasFiltradas = reservasFiltradas.filter(r => new Date(r.created_at) >= dataInicio);
    }
    if (filters.dataFim) {
      const dataFim = new Date(filters.dataFim);
      dataFim.setHours(23, 59, 59);
      baixasFiltradas = baixasFiltradas.filter(b => new Date(b.created_at) <= dataFim);
      movFiltradas = movFiltradas.filter(m => new Date(m.created_at) <= dataFim);
      reservasFiltradas = reservasFiltradas.filter(r => new Date(r.created_at) <= dataFim);
    }

    // Filtro de produto (letra)
    if (filters.letra_produto !== 'TODOS') {
      movFiltradas = movFiltradas.filter(m => {
        const produto = produtos.find(p => p.id === m.produto_id);
        return produto?.letra_produto === filters.letra_produto;
      });
      reservasFiltradas = reservasFiltradas.filter(r => r.letra_produto === filters.letra_produto);
      baixasFiltradas = baixasFiltradas.filter(b => {
        const reserva = reservas.find(r => r.id === b.reserva_id);
        return reserva?.letra_produto === filters.letra_produto;
      });
    }

    // Filtro de cliente
    if (filters.cliente !== 'TODOS') {
      reservasFiltradas = reservasFiltradas.filter(r => r.cliente === filters.cliente);
    }

    // Filtro de status
    if (filters.status !== 'TODOS') {
      reservasFiltradas = reservasFiltradas.filter(r => r.status === filters.status);
    }

    // Filtro de célula
    if (filters.celula !== 'TODOS') {
      movFiltradas = movFiltradas.filter(m => m.celula === filters.celula);
    }

    // Filtro de operador
    if (filters.operador !== 'TODOS') {
      movFiltradas = movFiltradas.filter(m => m.operador === filters.operador);
    }

    return { baixasFiltradas, movFiltradas, reservasFiltradas };
  }, [baixas, movimentacoes, reservas, produtos, filters]);

  // Calcular métricas
  const metricas = useMemo(() => {
    const { baixasFiltradas, movFiltradas } = dadosFiltrados;

    const totalProducao = movFiltradas
      .filter(m => m.tipo === 'PRODUCAO')
      .reduce((acc, m) => acc + (m.quantidade || 0), 0);

    const producaoPorTipo = movFiltradas
      .filter(m => m.tipo === 'PRODUCAO')
      .reduce((acc, m) => {
        const produto = produtos.find(p => p.id === m.produto_id);
        const tipo = produto?.categoria || 'Outro';
        acc[tipo] = (acc[tipo] || 0) + (m.quantidade || 0);
        return acc;
      }, {});

    const producaoPorCelula = movFiltradas
      .filter(m => m.tipo === 'PRODUCAO' && m.celula)
      .reduce((acc, m) => {
        acc[m.celula] = (acc[m.celula] || 0) + (m.quantidade || 0);
        return acc;
      }, {});

    const producaoPorOperador = movFiltradas
      .filter(m => m.tipo === 'PRODUCAO' && m.operador)
      .reduce((acc, m) => {
        acc[m.operador] = (acc[m.operador] || 0) + (m.quantidade || 0);
        return acc;
      }, {});

    // Produção por mês
    const producaoPorMes = movFiltradas
      .filter(m => m.tipo === 'PRODUCAO')
      .reduce((acc, m) => {
        const data = new Date(m.created_at);
        const mes = data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        acc[mes] = (acc[mes] || 0) + (m.quantidade || 0);
        return acc;
      }, {});

    // Identificar gargalos (células com menor produção)
    const celulasOrdenadas = Object.entries(producaoPorCelula)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3);

    return {
      totalProducao,
      producaoPorTipo,
      producaoPorCelula,
      producaoPorOperador,
      producaoPorMes: Object.entries(producaoPorMes).map(([mes, quantidade]) => ({ mes, quantidade })),
      gargalos: celulasOrdenadas,
      totalBaixas: baixasFiltradas.length,
      totalMovimentacoes: movFiltradas.length,
      celulasAtivas: Object.keys(producaoPorCelula).length
    };
  }, [dadosFiltrados, produtos]);

  // Opções dinâmicas para filtros (atualizadas com base nos dados filtrados)
  const opcoesDisponiveis = useMemo(() => {
    const { movFiltradas, reservasFiltradas } = dadosFiltrados;

    // Produtos disponíveis (baseado nos dados já filtrados)
    const letrasDisponiveis = [...new Set(
      filters.letra_produto === 'TODOS'
        ? produtos.map(p => p.letra_produto)
        : [filters.letra_produto]
    )].filter(Boolean);

    // Células disponíveis (baseado no produto selecionado e outros filtros)
    const celulasDisponiveis = [...new Set(
      movFiltradas
        .filter(m => {
          if (filters.letra_produto !== 'TODOS') {
            const produto = produtos.find(p => p.id === m.produto_id);
            return produto?.letra_produto === filters.letra_produto;
          }
          return true;
        })
        .map(m => m.celula)
    )].filter(Boolean);

    // Operadores disponíveis (baseado na célula e produto selecionados)
    const operadoresDisponiveis = [...new Set(
      movFiltradas
        .filter(m => {
          if (filters.celula !== 'TODOS' && m.celula !== filters.celula) return false;
          if (filters.letra_produto !== 'TODOS') {
            const produto = produtos.find(p => p.id === m.produto_id);
            return produto?.letra_produto === filters.letra_produto;
          }
          return true;
        })
        .map(m => m.operador)
    )].filter(Boolean);

    // Clientes disponíveis (baseado no produto e status selecionados)
    const clientesDisponiveis = [...new Set(
      reservasFiltradas
        .filter(r => {
          if (filters.letra_produto !== 'TODOS' && r.letra_produto !== filters.letra_produto) return false;
          if (filters.status !== 'TODOS' && r.status !== filters.status) return false;
          return true;
        })
        .map(r => r.cliente)
    )].filter(Boolean).sort();

    return {
      letras: letrasDisponiveis,
      celulas: celulasDisponiveis,
      operadores: operadoresDisponiveis,
      clientes: clientesDisponiveis
    };
  }, [dadosFiltrados, produtos, filters.letra_produto, filters.celula, filters.status]);

  const statusOptions = ['RESERVADO', 'EM_PRODUCAO', 'PRODUZIDO', 'BAIXADO', 'CANCELADO', 'LIBERADO'];

  const dadosPredefinidos = useMemo(() => {
    const { reservasFiltradas } = dadosFiltrados;
    return reservasFiltradas.map(r => ({
      data: format(new Date(r.created_at), 'dd/MM/yy'),
      codigo: r.codigo_completo || '-',
      cliente: r.cliente || '-',
      modelo: r.modelo || '-',
      status: r.status || '-',
      quantidade: r.quantidade || 0,
      baixada: r.quantidade_baixada || 0,
      num_inicial: r.numero_inicial || '',
      num_final: r.numero_final || ''
    }));
  }, [dadosFiltrados]);

  const colunasPredefinidas = [
    { key: 'data', label: 'Data', width: 12 },
    { key: 'codigo', label: 'Codigo', width: 14 },
    { key: 'cliente', label: 'Cliente', width: 20 },
    { key: 'modelo', label: 'Modelo', width: 14 },
    { key: 'num_inicial', label: 'Num Inicial', width: 12, tipo: 'numero' },
    { key: 'num_final', label: 'Num Final', width: 12, tipo: 'numero' },
    { key: 'quantidade', label: 'Quantidade', width: 12, tipo: 'numero' },
    { key: 'baixada', label: 'Baixada', width: 12, tipo: 'numero' },
    { key: 'status', label: 'Status', width: 14 }
  ];

  const resumoPredefinido = {
    'Total Producao': metricas.totalProducao,
    'Total Baixas': metricas.totalBaixas,
    'Movimentacoes': metricas.totalMovimentacoes,
    'Celulas Ativas': metricas.celulasAtivas
  };

  const filtrosPredefinidos = {
    'Data Inicio': filters.dataInicio || '-',
    'Data Fim': filters.dataFim || '-',
    'Produto': filters.letra_produto,
    'Cliente': filters.cliente,
    'Status': filters.status,
    'Celula': filters.celula,
    'Operador': filters.operador
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at:50%_-20%,rgba(100,116,139,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-slate-600 to-slate-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(100,116,139,0.3)] transition-all hover:scale-105 active:scale-95 group border border-slate-400/20">
                <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-white group-hover:rotate-12 transition-transform duration-500" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Relatórios <span className="text-slate-600 dark:text-slate-400">e Análises</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                  Data Intelligence • KPIs • Exportação
                </p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="lotes" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-slate-100 dark:bg-slate-900/50 border border-transparent dark:border-slate-800 p-1.5 rounded-2xl shadow-inner">
            <TabsTrigger value="lotes" className="flex items-center justify-center gap-2 px-3 sm:px-5 py-2 rounded-xl text-sm font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-blue-600 data-[state=active]:shadow-md data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 uppercase tracking-widest text-[10px]">Relatório de Lotes</TabsTrigger>
            <TabsTrigger value="movimentacao" className="flex items-center justify-center gap-2 px-3 sm:px-5 py-2 rounded-xl text-sm font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-blue-600 data-[state=active]:shadow-md data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 uppercase tracking-widest text-[10px]">Movimentação Estoque</TabsTrigger>
            <TabsTrigger value="customizado" className="flex items-center justify-center gap-2 px-3 sm:px-5 py-2 rounded-xl text-sm font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-blue-600 data-[state=active]:shadow-md data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 uppercase tracking-widest text-[10px]">Relatórios Customizados</TabsTrigger>
            <TabsTrigger value="predefinidos" className="flex items-center justify-center gap-2 px-3 sm:px-5 py-2 rounded-xl text-sm font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-blue-600 data-[state=active]:shadow-md data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 uppercase tracking-widest text-[10px]">Relatórios Pré-definidos</TabsTrigger>
          </TabsList>

          <TabsContent value="lotes" className="space-y-6">
            <RelatorioLotesDetalhado />
          </TabsContent>

          <TabsContent value="movimentacao" className="space-y-6">
            <RelatorioMovimentacaoEstoque />
          </TabsContent>

          <TabsContent value="customizado" className="space-y-6">
            <RelatorioCustomizavel />
          </TabsContent>

          <TabsContent value="predefinidos" className="space-y-6">
            {/* Filtros Avançados e Presets */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AdvancedFilters
                  filters={filters}
                  onFilterChange={setFilters}
                  opcoesDisponiveis={opcoesDisponiveis}
                  statusOptions={statusOptions}
                  isExpanded={advancedFiltersOpen}
                  onToggleExpanded={setAdvancedFiltersOpen}
                />
              </div>
              <div>
                <ReportPresets
                  currentFilters={filters}
                  onLoadPreset={setFilters}
                />
              </div>
            </div>

            {/* Ações de Exportação / Impressão */}
            <div className="flex gap-3 justify-end flex-wrap">
              <BotaoImprimir
                label="Imprimir Reservas"
                onClick={() => {
                  const filtrosAtivos = Object.entries(filtrosPredefinidos)
                    .filter(([, v]) => v && v !== '-' && v !== 'TODOS')
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' | ');
                  const linhas = dadosPredefinidos.map(r => `
                <tr>
                  <td>${r.data}</td>
                  <td>${r.codigo}</td>
                  <td>${r.cliente}</td>
                  <td>${r.modelo}</td>
                  <td>${r.num_inicial}</td>
                  <td>${r.num_final}</td>
                  <td>${r.quantidade}</td>
                  <td>${r.baixada}</td>
                  <td>${r.status}</td>
                </tr>
              `).join('');
                  imprimirRelatorio({
                    titulo: 'Relatório de Reservas',
                    subtitulo: filtrosAtivos || 'Todos os registros',
                    htmlTabela: `<table>
                  <thead><tr>
                    <th>Data</th><th>Código</th><th>Cliente</th><th>Modelo</th>
                    <th>Nº Inicial</th><th>Nº Final</th><th>Qtd</th><th>Baixada</th><th>Status</th>
                  </tr></thead>
                  <tbody>${linhas}</tbody>
                </table>`
                  });
                }}
              />
              <ExportarRelatorio
                dados={dadosPredefinidos}
                colunas={colunasPredefinidas}
                titulo="Relatorio Predefinido Filtrado"
                resumo={resumoPredefinido}
                filtrosAplicados={filtrosPredefinidos}
              />
            </div>

            {/* KPIs Premium */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Produzido', value: metricas.totalProducao.toLocaleString(), subtitle: 'unidades contabilizadas', icon: Package, color: 'blue' },
                { label: 'Baixas Registradas', value: metricas.totalBaixas, subtitle: 'registros em sistema', icon: FileText, color: 'slate' },
                { label: 'Movimentações', value: metricas.totalMovimentacoes, subtitle: 'operações no período', icon: TrendingUp, color: 'emerald' },
                { label: 'Células Ativas', value: metricas.celulasAtivas, subtitle: 'em rede de operação', icon: Users, color: 'amber' },
              ].map((item, i) => (
                <Card key={i} className="relative overflow-hidden group border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 backdrop-blur-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80">{item.label}</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-none">{item.value}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic opacity-60 mt-1">{item.subtitle}</p>
                      </div>
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6",
                        item.color === 'blue' ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20" :
                          item.color === 'slate' ? "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 border border-slate-500/20" :
                            item.color === 'emerald' ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20" :
                              "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20"
                      )}>
                        <item.icon className="w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                  <div className={cn(
                    "absolute bottom-0 left-0 h-1 bg-gradient-to-r opacity-50 transition-all duration-500 group-hover:h-1.5",
                    item.color === 'blue' ? "from-blue-600 to-blue-400 w-full" :
                      item.color === 'slate' ? "from-slate-600 to-slate-400 w-full" :
                        item.color === 'emerald' ? "from-emerald-600 to-emerald-400 w-full" :
                          "from-amber-600 to-amber-400 w-full"
                  )} />
                </Card>
              ))}
            </div>

            {/* Gráfico de Produção Mensal */}
            {metricas.producaoPorMes.length > 0 && (
              <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900 transition-colors">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                  <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">Produção por Mês</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <MonthlyProductionChart data={metricas.producaoPorMes} />
                </CardContent>
              </Card>
            )}

            {/* Produção por Tipo */}
            <Card className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
              <CardHeader className="dark:border-slate-800">
                <CardTitle className="dark:text-slate-100">Produção por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(metricas.producaoPorTipo).map(([tipo, qtd]) => (
                    <div key={tipo} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-transparent dark:border-slate-800 transition-colors">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{tipo}</span>
                      <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{qtd.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Produção por Célula */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
                <CardHeader className="dark:border-slate-800">
                  <CardTitle className="dark:text-slate-100">Produção por Célula</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(metricas.producaoPorCelula)
                      .sort((a, b) => b[1] - a[1])
                      .map(([celula, qtd]) => (
                        <div key={celula} className="flex items-center justify-between py-2 border-b last:border-0 border-slate-100 dark:border-slate-800">
                          <span className="text-slate-600 dark:text-slate-400">{celula}</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{qtd.toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
                <CardHeader className="dark:border-slate-800">
                  <CardTitle className="dark:text-slate-100">Produção por Operador</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(metricas.producaoPorOperador)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([operador, qtd]) => (
                        <div key={operador} className="flex items-center justify-between py-2 border-b last:border-0 border-slate-100 dark:border-slate-800">
                          <span className="text-slate-600 dark:text-slate-400">{operador}</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{qtd.toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gargalos */}
            {metricas.gargalos.length > 0 && (
              <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10 transition-colors">
                <CardHeader>
                  <CardTitle className="text-amber-900 dark:text-amber-400">Possíveis Gargalos (Células com Menor Produção)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {metricas.gargalos.map(([celula, qtd]) => (
                      <div key={celula} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900/50 rounded border border-transparent dark:border-amber-900/20">
                        <span className="text-slate-700 dark:text-slate-300">{celula}</span>
                        <span className="text-amber-600 dark:text-amber-500 font-medium">{qtd.toLocaleString()} unidades</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Histórico de Baixas por Produto */}
            <Card className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 border-b dark:border-slate-800">
                <CardTitle className="dark:text-slate-100">Histórico de Baixas</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={filters.letra_produto} onValueChange={(v) => setFilters(prev => ({ ...prev, letra_produto: v }))}>
                    <SelectTrigger className="w-48 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                      <SelectItem value="TODOS">Todos os produtos</SelectItem>
                      {opcoesDisponiveis.letras.map(letra => (
                        <SelectItem key={letra} value={letra}>{letra}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <BotaoImprimir
                    onClick={() => {
                      const linhas = dadosFiltrados.baixasFiltradas.map(baixa => {
                        const reserva = reservas.find(r => r.id === baixa.reserva_id);
                        return `<tr><td>${format(new Date(baixa.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}</td><td>${reserva?.codigo_completo || '-'}</td><td>${reserva?.cliente || '-'}</td><td>${baixa.numero_inicial}</td><td>${baixa.numero_final}</td><td>${baixa.quantidade}</td><td>${baixa.tipo}</td></tr>`;
                      }).join('');
                      imprimirRelatorio({
                        titulo: 'Histórico de Baixas',
                        subtitulo: `Produto: ${filters.letra_produto} | Total: ${dadosFiltrados.baixasFiltradas.length} registros`,
                        htmlTabela: `<table><thead><tr><th>Data/Hora</th><th>Produto</th><th>Cliente</th><th>Nº Inicial</th><th>Nº Final</th><th>Quantidade</th><th>Tipo</th></tr></thead><tbody>${linhas}</tbody></table>`
                      });
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                    <TableRow className="border-b dark:border-slate-800 hover:bg-transparent">
                      <TableHead className="dark:text-slate-400">Data</TableHead>
                      <TableHead className="dark:text-slate-400">Produto</TableHead>
                      <TableHead className="dark:text-slate-400">Cliente</TableHead>
                      <TableHead className="dark:text-slate-400">Nº Inicial</TableHead>
                      <TableHead className="dark:text-slate-400">Nº Final</TableHead>
                      <TableHead className="dark:text-slate-400">Quantidade</TableHead>
                      <TableHead className="dark:text-slate-400">Tipo</TableHead>
                      <TableHead className="text-right dark:text-slate-400">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dadosFiltrados.baixasFiltradas.length === 0 ? (
                      <TableRow className="hover:bg-transparent border-0">
                        <TableCell colSpan={8} className="text-center text-slate-500 py-12">
                          Nenhuma baixa registrada no período
                        </TableCell>
                      </TableRow>
                    ) : (
                      dadosFiltrados.baixasFiltradas.map(baixa => {
                        const reserva = reservas.find(r => r.id === baixa.reserva_id);
                        return (
                          <TableRow key={baixa.id} className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <TableCell className="dark:text-slate-300">{format(new Date(baixa.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}</TableCell>
                            <TableCell className="font-mono dark:text-slate-300">{reserva?.codigo_completo || '-'}</TableCell>
                            <TableCell className="dark:text-slate-300">{reserva?.cliente || '-'}</TableCell>
                            <TableCell className="font-mono font-bold dark:text-blue-400">{baixa.numero_inicial}</TableCell>
                            <TableCell className="font-mono font-bold dark:text-blue-400">{baixa.numero_final}</TableCell>
                            <TableCell className="dark:text-slate-300">{baixa.quantidade}</TableCell>
                            <TableCell>
                              <Badge variant={baixa.tipo === 'COLETA' ? 'primary' : 'outline'} className={baixa.tipo !== 'COLETA' ? 'dark:border-slate-700 dark:text-slate-400' : ''}>
                                {baixa.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="dark:hover:bg-slate-800 dark:text-slate-400"
                                onClick={() => {
                                  setProdutoSelecionado(reserva);
                                  setMostrarDetalheBaixas(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Dialog Detalhe de Baixas */}
            <Dialog open={mostrarDetalheBaixas} onOpenChange={setMostrarDetalheBaixas}>
              <DialogContent className="max-w-4xl dark:bg-slate-950 dark:border-slate-800">
                <DialogHeader>
                  <DialogTitle className="dark:text-slate-100">
                    Histórico Completo - {produtoSelecionado?.codigo_completo}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 transition-colors">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Cliente</p>
                      <p className="font-medium dark:text-slate-200">{produtoSelecionado?.cliente}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Modelo</p>
                      <p className="font-medium dark:text-slate-200">{produtoSelecionado?.modelo || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Quantidade Total</p>
                      <p className="font-medium dark:text-slate-200">{produtoSelecionado?.quantidade}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Quantidade Baixada</p>
                      <p className="font-medium dark:text-slate-200">{produtoSelecionado?.quantidade_baixada || 0}</p>
                    </div>
                  </div>

                  <div className="rounded-md border dark:border-slate-800 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="h-9 dark:text-slate-400">Data/Hora</TableHead>
                          <TableHead className="h-9 dark:text-slate-400">Nº Inicial</TableHead>
                          <TableHead className="h-9 dark:text-slate-400">Nº Final</TableHead>
                          <TableHead className="h-9 dark:text-slate-400">Quantidade</TableHead>
                          <TableHead className="h-9 dark:text-slate-400">Tipo</TableHead>
                          <TableHead className="h-9 dark:text-slate-400">Código Lido</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {baixas
                          .filter(b => b.reserva_id === produtoSelecionado?.id)
                          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                          .map(baixa => (
                            <TableRow key={baixa.id} className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <TableCell className="dark:text-slate-300">{format(new Date(baixa.created_at), 'dd/MM/yy HH:mm:ss', { locale: ptBR })}</TableCell>
                              <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400">{baixa.numero_inicial}</TableCell>
                              <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400">{baixa.numero_final}</TableCell>
                              <TableCell className="font-semibold dark:text-slate-200">{baixa.quantidade}</TableCell>
                              <TableCell>
                                <Badge variant={baixa.tipo === 'COLETA' ? 'primary' : 'outline'} className={baixa.tipo !== 'COLETA' ? 'dark:border-slate-700 dark:text-slate-400' : ''}>
                                  {baixa.tipo}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-[10px] dark:text-slate-400">{baixa.codigo_lido || '-'}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}