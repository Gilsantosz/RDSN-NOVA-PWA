// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { FileText, TrendingUp, Package, Users, Eye, Activity, Target, CircleCheck } from 'lucide-react';

import { PremiumCard } from '@/components/ui/PremiumCard';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// cn removed (unused)
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
        return await rdsn.entities.ReservaLote.list('-created_at', 1000);
      }
      return await rdsn.entities.ReservaLote.filter({ setor_id: setorAtivo }, '-created_at', 1000);
    },
    enabled: !!setorAtivo
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos', setorAtivo],
    queryFn: async () => {
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.Produto.list();
      }
      return await rdsn.entities.Produto.filter({ setor_id: setorAtivo });
    },
    enabled: !!setorAtivo
  });

  const { data: baixas = [] } = useQuery({
    queryKey: ['baixas-relatorio', setorAtivo],
    queryFn: async () => {
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.BaixaLote.list('-created_at', 1000);
      }

      const todas = await rdsn.entities.BaixaLote.list('-created_at', 1000);
      // Filtrar por reservas do setor
      const reservasDoSetor = await rdsn.entities.ReservaLote.filter({ setor_id: setorAtivo });
      const reservaIds = reservasDoSetor.map(r => r.id);
      return todas.filter(b => reservaIds.includes(b.reserva_id));
    },
    enabled: !!setorAtivo
  });

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ['movimentacoes', setorAtivo],
    queryFn: async () => {
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.MovimentacaoEstoque.list('-created_at', 1000);
      }

      const todas = await rdsn.entities.MovimentacaoEstoque.list('-created_at', 1000);
      // Filtrar por produtos do setor
      const produtosDoSetor = await rdsn.entities.Produto.filter({ setor_id: setorAtivo });
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
        let mes = 'N/A';
        try {
          if (data && !isNaN(data.getTime())) {
            mes = data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          }
        } catch (e) {
          console.error("Erro ao formatar data:", e);
        }
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
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at:50%_-20%,rgba(100,116,139,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-14 sm:h-14 bg-gradient-to-br from-slate-600 to-slate-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(100,116,139,0.3)] transition-all hover:scale-105 active:scale-95 group border border-slate-400/20">
                <FileText className="w-8 h-8 sm:w-6 sm:h-6 text-white group-hover:rotate-12 transition-transform duration-500" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Relatórios <span className="text-slate-600 dark:text-slate-400">e Análises</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                  Data Intelligence • KPIs • Exportação
                </p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="movimentacao" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 dark:bg-slate-900/50 border border-transparent dark:border-slate-800 p-1.5 rounded-2xl shadow-inner">
            <TabsTrigger value="movimentacao" className="flex items-center justify-center gap-2 px-3 sm:px-5 py-2 rounded-xl text-sm font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-blue-600 data-[state=active]:shadow-md data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 uppercase tracking-widest text-[10px]">Movimentação Estoque</TabsTrigger>
            <TabsTrigger value="predefinidos" className="flex items-center justify-center gap-2 px-3 sm:px-5 py-2 rounded-xl text-sm font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-blue-600 data-[state=active]:shadow-md data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 uppercase tracking-widest text-[10px]">Relatórios Pré-definidos</TabsTrigger>
          </TabsList>

          <TabsContent value="movimentacao" className="space-y-6">
            <RelatorioMovimentacaoEstoque />
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <PremiumCard
                title="Total Produzido"
                icon={Package}
                iconColor="#3b82f6"
              >
                <div className="space-y-1">
                  <p className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">{metricas.totalProducao.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic opacity-60 mt-1">unidades contabilizadas</p>
                </div>
              </PremiumCard>

              <PremiumCard
                title="Baixas"
                icon={FileText}
                iconColor="#64748b"
              >
                <div className="space-y-1">
                  <p className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">{metricas.totalBaixas}</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic opacity-60 mt-1">registros em sistema</p>
                </div>
              </PremiumCard>

              <PremiumCard
                title="Movimentações"
                icon={TrendingUp}
                iconColor="#10b981"
              >
                <div className="space-y-1">
                  <p className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">{metricas.totalMovimentacoes}</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic opacity-60 mt-1">operações no período</p>
                </div>
              </PremiumCard>

              <PremiumCard
                title="Células Ativas"
                icon={Users}
                iconColor="#f59e0b"
              >
                <div className="space-y-1">
                  <p className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">{metricas.celulasAtivas}</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic opacity-60 mt-1">em rede de operação</p>
                </div>
              </PremiumCard>
            </div>

            {metricas.producaoPorMes.length > 0 && (
              <PremiumCard title="Produção por Mês" icon={TrendingUp}>
                <MonthlyProductionChart data={metricas.producaoPorMes} />
              </PremiumCard>
            )}

            <PremiumCard title="Produção por Categoria" icon={Package}>
              <div className="space-y-3">
                {Object.entries(metricas.producaoPorTipo).map(([tipo, qtd]) => (
                  <div key={tipo} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-transparent dark:border-slate-800 transition-colors">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{tipo}</span>
                    <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{qtd.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </PremiumCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PremiumCard title="Produção por Célula" icon={Users}>
                <div className="space-y-3">
                  {Object.entries(metricas.producaoPorCelula)
                    .sort((a, b) => b[1] - a[1])
                    .map(([celula, qtd]) => (
                      <div key={celula} className="flex items-center justify-between py-2 border-b last:border-0 border-slate-100 dark:border-slate-800 text-sm">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{celula}</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{qtd.toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              </PremiumCard>

              <PremiumCard title="Produção por Operador" icon={Users}>
                <div className="space-y-3">
                  {Object.entries(metricas.producaoPorOperador)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([operador, qtd]) => (
                      <div key={operador} className="flex items-center justify-between py-2 border-b last:border-0 border-slate-100 dark:border-slate-800 text-sm">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{operador}</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{qtd.toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              </PremiumCard>
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

            <PremiumCard
              title="Histórico de Baixas"
              icon={Activity}
              noPadding
              badge={
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={filters.letra_produto} onValueChange={(v) => setFilters(prev => ({ ...prev, letra_produto: v }))}>
                    <SelectTrigger className="w-48 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 h-9 rounded-xl">
                      <SelectValue placeholder="Produto" />
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
              }
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-950/50">
                    <TableRow className="border-b dark:border-slate-800 hover:bg-transparent">
                      <TableHead className="dark:text-slate-400 text-[10px] uppercase font-black italic tracking-widest py-4">Data</TableHead>
                      <TableHead className="dark:text-slate-400 text-[10px] uppercase font-black italic tracking-widest py-4">Produto</TableHead>
                      <TableHead className="dark:text-slate-400 text-[10px] uppercase font-black italic tracking-widest py-4">Cliente</TableHead>
                      <TableHead className="dark:text-slate-400 text-[10px] uppercase font-black italic tracking-widest py-4">Nº Inicial</TableHead>
                      <TableHead className="dark:text-slate-400 text-[10px] uppercase font-black italic tracking-widest py-4">Nº Final</TableHead>
                      <TableHead className="dark:text-slate-400 text-[10px] uppercase font-black italic tracking-widest py-4">Quantidade</TableHead>
                      <TableHead className="dark:text-slate-400 text-[10px] uppercase font-black italic tracking-widest py-4">Tipo</TableHead>
                      <TableHead className="text-right dark:text-slate-400 text-[10px] uppercase font-black italic tracking-widest py-4">Ações</TableHead>
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
                          <TableRow key={baixa.id} className="border-b dark:border-slate-800/10 hover:bg-slate-50 dark:hover:bg-blue-600/5 transition-colors">
                            <TableCell className="dark:text-slate-300 font-medium text-sm">{format(new Date(baixa.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}</TableCell>
                            <TableCell className="font-mono dark:text-slate-300 text-sm">{reserva?.codigo_completo || '-'}</TableCell>
                            <TableCell className="dark:text-slate-300 text-sm font-semibold">{reserva?.cliente || '-'}</TableCell>
                            <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">{baixa.numero_inicial}</TableCell>
                            <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">{baixa.numero_final}</TableCell>
                            <TableCell className="dark:text-slate-300 text-sm font-black italic">{baixa.quantidade}</TableCell>
                            <TableCell>
                              <Badge variant={baixa.tipo === 'COLETA' ? 'primary' : 'outline'} className={baixa.tipo !== 'COLETA' ? 'dark:border-slate-700 dark:text-slate-400' : 'bg-blue-600 text-white border-0'}>
                                {baixa.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="dark:hover:bg-blue-600/20 dark:text-slate-400 hover:text-blue-600 rounded-xl"
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
              </div>
            </PremiumCard>

            {/* Dialog Detalhe de Baixas */}
            <Dialog open={mostrarDetalheBaixas} onOpenChange={setMostrarDetalheBaixas}>
              <DialogContent className="max-w-5xl dark:bg-slate-900/90 dark:border-white/10 rounded-[2.5rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0">
                <div className="bg-gradient-to-br from-slate-900 to-blue-900 p-8 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
                  <DialogHeader className="relative z-10">
                    <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                      <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-blue-300" />
                      </span>
                      Log de <span className="text-blue-300">Rastreabilidade</span>
                    </DialogTitle>
                    <p className="text-xs font-bold text-blue-200/60 uppercase tracking-widest mt-1">
                      Histórico Analítico • {produtoSelecionado?.codigo_completo}
                    </p>
                  </DialogHeader>
                </div>

                <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Entidade / Cliente', value: produtoSelecionado?.cliente, icon: Users },
                      { label: 'Modelo Técnico', value: produtoSelecionado?.modelo || '-', icon: Package },
                      { label: 'Meta de Produção', value: produtoSelecionado?.quantidade, icon: Target },
                      { label: 'Consumado (Baixa)', value: produtoSelecionado?.quantidade_baixada || 0, icon: CircleCheck }
                    ].map((item, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm group hover:border-blue-500/30 transition-all">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                          <item.icon className="w-3 h-3" />
                          {item.label}
                        </p>
                        <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-inner bg-white dark:bg-slate-950/50">
                    <Table>
                      <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/10">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-4">Data/Hora</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-4">Intervalo Numérico</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-4">Qtd</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-4 text-center">Protocolo</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-4">Serial Vinculado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {baixas
                          .filter(b => b.reserva_id === produtoSelecionado?.id)
                          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                          .map(baixa => (
                            <TableRow key={baixa.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-blue-600/5 transition-colors">
                              <TableCell className="dark:text-slate-300 font-bold text-xs">{format(new Date(baixa.created_at), 'dd/MM/yy HH:mm:ss', { locale: ptBR })}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50">{baixa.numero_inicial}</Badge>
                                  <span className="text-slate-300">→</span>
                                  <Badge variant="outline" className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50">{baixa.numero_final}</Badge>
                                </div>
                              </TableCell>
                              <TableCell className="font-black text-slate-900 dark:text-slate-100 italic">{baixa.quantidade}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={baixa.tipo === 'COLETA' ? 'primary' : 'outline'} className={baixa.tipo !== 'COLETA' ? 'dark:border-white/10 dark:text-slate-400 text-[9px]' : 'bg-blue-600 text-white border-0 text-[9px] font-black'}>
                                  {baixa.tipo}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-[10px] dark:text-slate-400 font-bold opacity-60 tracking-tighter">{baixa.codigo_lido || 'N/A'}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="p-6 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md border-t dark:border-white/5 flex justify-end">
                  <Button
                    onClick={() => setMostrarDetalheBaixas(false)}
                    className="h-12 px-10 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-sm"
                  >
                    Fechar Visualização
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}