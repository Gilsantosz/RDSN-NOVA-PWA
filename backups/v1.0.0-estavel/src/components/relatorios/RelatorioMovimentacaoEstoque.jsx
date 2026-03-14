import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Filter, X, ArrowUpCircle, ArrowDownCircle, RefreshCw, Factory, Package } from 'lucide-react';
import ExportarRelatorio from './ExportarRelatorio';
import PaginacaoTabela from '../tables/PaginacaoTabela';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const TIPO_CONFIG = {
  ENTRADA: { label: 'Entrada', color: 'bg-green-100 text-green-800', icon: ArrowUpCircle },
  SAIDA: { label: 'Saída', color: 'bg-red-100 text-red-800', icon: ArrowDownCircle },
  AJUSTE: { label: 'Ajuste', color: 'bg-amber-100 text-amber-800', icon: RefreshCw },
  PRODUCAO: { label: 'Produção', color: 'bg-blue-100 text-blue-800', icon: Factory },
  BAIXA: { label: 'Baixa', color: 'bg-purple-100 text-purple-800', icon: Package }
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
        return await base44.entities.MovimentacaoEstoque.list('-created_at', 2000);
      }
      const todas = await base44.entities.MovimentacaoEstoque.list('-created_at', 2000);
      const produtosDoSetor = await base44.entities.Produto.filter({ setor_id: setorAtivo });
      const produtoIds = produtosDoSetor.map(p => p.id);
      return todas.filter(m => produtoIds.includes(m.produto_id));
    },
    enabled: !!setorAtivo
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-mov', setorAtivo],
    queryFn: async () => {
      if (isAdmin && setorAtivo === 'ALL') {
        return await base44.entities.Produto.list();
      }
      return await base44.entities.Produto.filter({ setor_id: setorAtivo });
    },
    enabled: !!setorAtivo
  });

  const { data: setores = [] } = useQuery({
    queryKey: ['setores-mov'],
    queryFn: () => base44.entities.Setor.list()
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

  const celulasDisponiveis = [...new Set(movimentacoes.map(m => m.celula).filter(Boolean))].sort();
  const tiposDisponiveis = Object.keys(TIPO_CONFIG);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
            <Button variant="outline" size="sm" onClick={limparFiltros}>
              <X className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label className="text-xs">Data Início</Label>
              <Input type="date" value={filtros.dataInicio} onChange={(e) => setFiltros(p => ({ ...p, dataInicio: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Data Fim</Label>
              <Input type="date" value={filtros.dataFim} onChange={(e) => setFiltros(p => ({ ...p, dataFim: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Produto</Label>
              <Select value={filtros.produto_id} onValueChange={(v) => setFiltros(p => ({ ...p, produto_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos</SelectItem>
                  {produtos.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.letra_produto}{p.sufixo ? ' - ' + p.sufixo : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={filtros.tipo} onValueChange={(v) => setFiltros(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos</SelectItem>
                  {tiposDisponiveis.map(t => (
                    <SelectItem key={t} value={t}>{TIPO_CONFIG[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Célula</Label>
              <Input placeholder="Filtrar célula" value={filtros.celula} onChange={(e) => setFiltros(p => ({ ...p, celula: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Operador</Label>
              <Input placeholder="Filtrar operador" value={filtros.operador} onChange={(e) => setFiltros(p => ({ ...p, operador: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="ghost" onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setFiltros(p => ({ ...p, dataInicio: today, dataFim: today }));
            }} className="text-blue-600 text-xs">Hoje</Button>
            <Button size="sm" variant="ghost" onClick={() => {
              const d = new Date();
              setFiltros(p => ({
                ...p,
                dataInicio: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0],
                dataFim: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
              }));
            }} className="text-blue-600 text-xs">Mês Atual</Button>
            <Button size="sm" variant="ghost" onClick={() => {
              const d = new Date();
              const start = new Date(d);
              start.setDate(d.getDate() - 7);
              setFiltros(p => ({
                ...p,
                dataInicio: start.toISOString().split('T')[0],
                dataFim: d.toISOString().split('T')[0]
              }));
            }} className="text-blue-600 text-xs">Últimos 7 dias</Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-slate-500">Movimentações</p>
            <p className="text-3xl font-bold text-slate-900">{estatisticas.totalMovimentacoes}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-green-600">Entradas/Produção</p>
            <p className="text-3xl font-bold text-green-700">{estatisticas.totalEntrada.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-red-600">Saídas/Baixas</p>
            <p className="text-3xl font-bold text-red-700">{estatisticas.totalSaida.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className={estatisticas.saldo >= 0 ? 'border-blue-200' : 'border-amber-200'}>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-slate-500">Saldo</p>
            <p className={`text-3xl font-bold ${estatisticas.saldo >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
              {estatisticas.saldo >= 0 ? '+' : ''}{estatisticas.saldo.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      {estatisticas.porMes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Movimentação por Mês</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={estatisticas.porMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="entrada" name="Entradas" fill="#22c55e" />
                  <Bar dataKey="saida" name="Saídas" fill="#ef4444" />
                  <Bar dataKey="ajuste" name="Ajustes" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Top Produtos Movimentados</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={estatisticas.porProduto} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="produto" width={120} fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="entrada" name="Entradas" fill="#22c55e" />
                  <Bar dataKey="saida" name="Saídas" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-3 justify-end">
        <ExportarRelatorio
          dados={dadosExportacao}
          colunas={colunasExportacao}
          titulo="Relatorio Movimentacao Estoque"
          resumo={resumoExportacao}
          filtrosAplicados={filtrosExportacao}
        />
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Movimentações ({dadosFiltrados.length} registros)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Anterior</TableHead>
                  <TableHead>Nova</TableHead>
                  <TableHead>Célula</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">Carregando...</TableCell>
                  </TableRow>
                ) : dadosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                      Nenhuma movimentação encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  dadosPaginados.map(mov => (
                    <TableRow key={mov.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(mov.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">
                        {getProdutoNome(mov.produto_id)}
                      </TableCell>
                      <TableCell>
                        <Badge className={TIPO_CONFIG[mov.tipo]?.color || 'bg-slate-100 text-slate-800'}>
                          {TIPO_CONFIG[mov.tipo]?.label || mov.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">{mov.quantidade}</TableCell>
                      <TableCell className="text-slate-500">{mov.quantidade_anterior ?? '-'}</TableCell>
                      <TableCell className="text-slate-500">{mov.quantidade_nova ?? '-'}</TableCell>
                      <TableCell className="text-sm">{mov.celula || '-'}</TableCell>
                      <TableCell className="text-sm">{mov.operador || '-'}</TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">{mov.observacao || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <PaginacaoTabela
              totalItems={dadosFiltrados.length}
              paginaAtual={paginaAtual}
              itensPorPagina={itensPorPagina}
              onPaginaChange={setPaginaAtual}
              onItensPorPaginaChange={(v) => { setItensPorPagina(v); setPaginaAtual(1); }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}