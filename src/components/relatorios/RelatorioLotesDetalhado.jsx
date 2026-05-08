import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { Filter, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ExportarRelatorio from './ExportarRelatorio';
import PaginacaoTabela from '../tables/PaginacaoTabela';

export default function RelatorioLotesDetalhado() {
  const { setorAtivo, isAdmin } = useSetor();
  
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(50);

  const [filtros, setFiltros] = useState({
    cliente: '',
    codigoProduto: '',
    modelo: '',
    letra_produto: '',
    ano: '',
    status: '',
    dataInicio: '',
    dataFim: '',
    numeroInicial: '',
    numeroFinal: ''
  });



  const { data: reservas = [], isLoading } = useQuery({
    queryKey: ['reservas-relatorio-detalhado', setorAtivo],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.ReservaLote.list('-created_at', 2000);
      }
      return await rdsn.entities.ReservaLote.filter({ setor_id: setorAtivo }, '-created_at', 2000);
    },
    enabled: !!setorAtivo
  });

  const { data: _baixas = [] } = useQuery({
    queryKey: ['baixas-detalhado', setorAtivo],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.BaixaLote.list('-created_at', 2000);
      }
      const todas = await rdsn.entities.BaixaLote.list('-created_at', 2000);
      const reservasDoSetor = await rdsn.entities.ReservaLote.filter({ setor_id: setorAtivo });
      const reservaIds = reservasDoSetor.map(r => r.id);
      return todas.filter(b => reservaIds.includes(b.reserva_id));
    },
    enabled: !!setorAtivo
  });

  const { data: _clientes = [] } = useQuery({
    queryKey: ['clientes-relatorio'],
    queryFn: () => rdsn.entities.Cliente.list()
  });

  // Filtrar dados
  const dadosFiltrados = useMemo(() => {
    let resultado = [...reservas];

    if (filtros.cliente) {
      resultado = resultado.filter(r => 
        r.cliente?.toLowerCase().includes(filtros.cliente.toLowerCase())
      );
    }

    if (filtros.codigoProduto) {
      resultado = resultado.filter(r => 
        r.codigo_produto?.toLowerCase().includes(filtros.codigoProduto.toLowerCase())
      );
    }

    if (filtros.modelo) {
      resultado = resultado.filter(r => 
        r.modelo?.toLowerCase().includes(filtros.modelo.toLowerCase())
      );
    }

    if (filtros.letra_produto) {
      resultado = resultado.filter(r => r.letra_produto === filtros.letra_produto);
    }

    if (filtros.ano) {
      resultado = resultado.filter(r => String(r.ano) === String(filtros.ano));
    }

    if (filtros.status) {
      resultado = resultado.filter(r => r.status === filtros.status);
    }

    if (filtros.dataInicio) {
      const dataInicio = new Date(filtros.dataInicio);
      resultado = resultado.filter(r => new Date(r.created_at) >= dataInicio);
    }

    if (filtros.dataFim) {
      const dataFim = new Date(filtros.dataFim);
      dataFim.setHours(23, 59, 59, 999);
      resultado = resultado.filter(r => new Date(r.created_at) <= dataFim);
    }

    if (filtros.numeroInicial) {
      resultado = resultado.filter(r => r.numero_inicial >= parseInt(filtros.numeroInicial));
    }

    if (filtros.numeroFinal) {
      resultado = resultado.filter(r => r.numero_final <= parseInt(filtros.numeroFinal));
    }

    return resultado;
  }, [reservas, filtros]);

  // Reset página ao mudar filtros
  React.useEffect(() => { setPaginaAtual(1); }, [filtros]);

  const dadosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return dadosFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [dadosFiltrados, paginaAtual, itensPorPagina]);

  // Estatísticas
  const estatisticas = useMemo(() => {
    const total = dadosFiltrados.length;
    const quantidadeTotal = dadosFiltrados.reduce((acc, r) => acc + (r.quantidade || 0), 0);
    const quantidadeBaixada = dadosFiltrados.reduce((acc, r) => acc + (r.quantidade_baixada || 0), 0);
    const porStatus = dadosFiltrados.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});
    const porCliente = dadosFiltrados.reduce((acc, r) => {
      const cliente = r.cliente || 'Sem cliente';
      acc[cliente] = (acc[cliente] || 0) + (r.quantidade || 0);
      return acc;
    }, {});

    return {
      total,
      quantidadeTotal,
      quantidadeBaixada,
      quantidadePendente: quantidadeTotal - quantidadeBaixada,
      porStatus,
      porCliente: Object.entries(porCliente).sort((a, b) => b[1] - a[1]).slice(0, 5)
    };
  }, [dadosFiltrados]);

  const dadosExportacao = useMemo(() => {
    return dadosFiltrados.map(r => ({
      data: format(new Date(r.created_at), 'dd/MM/yy'),
      cliente: r.cliente || '-',
      codigo: r.codigo_completo || '-',
      codigo_produto: r.codigo_produto || '-',
      modelo: r.modelo || '-',
      letra_ano: `${r.letra_produto}${r.ano}`,
      num_inicial: r.numero_inicial,
      num_final: r.numero_final,
      quantidade: r.quantidade,
      baixada: r.quantidade_baixada || 0,
      status: r.status,
      mes_producao: r.mes_producao || '-'
    }));
  }, [dadosFiltrados]);

  const colunasExportacao = [
    { key: 'data', label: 'Data', width: 12 },
    { key: 'cliente', label: 'Cliente', width: 20 },
    { key: 'codigo', label: 'Codigo Lote', width: 14 },
    { key: 'codigo_produto', label: 'Cod. Produto', width: 16 },
    { key: 'modelo', label: 'Modelo', width: 14 },
    { key: 'letra_ano', label: 'Letra/Ano', width: 10 },
    { key: 'num_inicial', label: 'Num Inicial', width: 12, tipo: 'numero' },
    { key: 'num_final', label: 'Num Final', width: 12, tipo: 'numero' },
    { key: 'quantidade', label: 'Quantidade', width: 12, tipo: 'numero' },
    { key: 'baixada', label: 'Baixada', width: 12, tipo: 'numero' },
    { key: 'mes_producao', label: 'Mes Producao', width: 14 },
    { key: 'status', label: 'Status', width: 14 }
  ];

  const resumoExportacao = {
    'Total de Lotes': estatisticas.total,
    'Quantidade Total': estatisticas.quantidadeTotal,
    'Quantidade Baixada': estatisticas.quantidadeBaixada,
    'Quantidade Pendente': estatisticas.quantidadePendente
  };

  const filtrosExportacao = {
    'Cliente': filtros.cliente || 'Todos',
    'Letra': filtros.letra_produto || 'Todas',
    'Ano': filtros.ano || 'Todos',
    'Status': filtros.status || 'Todos',
    'Data Inicio': filtros.dataInicio || '-',
    'Data Fim': filtros.dataFim || '-'
  };

  const limparFiltros = () => {
    setFiltros({
      cliente: '',
      codigoProduto: '',
      modelo: '',
      letra_produto: '',
      ano: '',
      status: '',
      dataInicio: '',
      dataFim: '',
      numeroInicial: '',
      numeroFinal: ''
    });
  };

  const letrasDisponiveis = [...new Set(reservas.map(r => r.letra_produto))].filter(Boolean).sort();
  const anosDisponiveis = [...new Set(reservas.map(r => r.ano))].filter(Boolean).sort((a, b) => b - a);
  const statusDisponiveis = ['RESERVADO', 'EM_PRODUCAO', 'PRODUZIDO', 'BAIXADO', 'CANCELADO', 'LIBERADO'];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros Avançados
            </CardTitle>
            <Button variant="outline" size="sm" onClick={limparFiltros}>
              <X className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <Label>Cliente</Label>
              <Input
                placeholder="Nome do cliente"
                value={filtros.cliente}
                onChange={(e) => setFiltros(prev => ({ ...prev, cliente: e.target.value }))}
              />
            </div>

            <div>
              <Label>Código Produto</Label>
              <Input
                placeholder="Código técnico"
                value={filtros.codigoProduto}
                onChange={(e) => setFiltros(prev => ({ ...prev, codigoProduto: e.target.value }))}
              />
            </div>

            <div>
              <Label>Modelo</Label>
              <Input
                placeholder="Modelo"
                value={filtros.modelo}
                onChange={(e) => setFiltros(prev => ({ ...prev, modelo: e.target.value }))}
              />
            </div>

            <div>
              <Label>Letra</Label>
              <Select value={filtros.letra_produto} onValueChange={(v) => setFiltros(prev => ({ ...prev, letra_produto: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todas</SelectItem>
                  {letrasDisponiveis.map(letra => (
                    <SelectItem key={letra} value={letra}>{letra}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Ano</Label>
              <Select value={filtros.ano} onValueChange={(v) => setFiltros(prev => ({ ...prev, ano: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos</SelectItem>
                  {anosDisponiveis.map(ano => (
                    <SelectItem key={ano} value={String(ano)}>{ano}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={filtros.status} onValueChange={(v) => setFiltros(prev => ({ ...prev, status: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos</SelectItem>
                  {statusDisponiveis.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros(prev => ({ ...prev, dataInicio: e.target.value }))}
              />
            </div>

            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros(prev => ({ ...prev, dataFim: e.target.value }))}
              />
            </div>

            <div>
              <Label>Nº Inicial Min.</Label>
              <Input
                type="number"
                placeholder="Ex: 1000"
                value={filtros.numeroInicial}
                onChange={(e) => setFiltros(prev => ({ ...prev, numeroInicial: e.target.value }))}
              />
            </div>

            <div>
              <Label>Nº Final Máx.</Label>
              <Input
                type="number"
                placeholder="Ex: 5000"
                value={filtros.numeroFinal}
                onChange={(e) => setFiltros(prev => ({ ...prev, numeroFinal: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-500">Total de Lotes</p>
              <p className="text-3xl font-bold text-slate-900">{estatisticas.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-500">Qtd. Total</p>
              <p className="text-3xl font-bold text-blue-600">{estatisticas.quantidadeTotal.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-500">Qtd. Baixada</p>
              <p className="text-3xl font-bold text-green-600">{estatisticas.quantidadeBaixada.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-500">Qtd. Pendente</p>
              <p className="text-3xl font-bold text-amber-600">{estatisticas.quantidadePendente.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações */}
      <div className="flex gap-3 justify-end">
        <ExportarRelatorio
          dados={dadosExportacao}
          colunas={colunasExportacao}
          titulo="Relatorio Detalhado de Lotes"
          resumo={resumoExportacao}
          filtrosAplicados={filtrosExportacao}
        />
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados ({dadosFiltrados.length} lotes)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Letra/Ano</TableHead>
                  <TableHead>Nº Inicial</TableHead>
                  <TableHead>Nº Final</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Baixada</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">Carregando...</TableCell>
                  </TableRow>
                ) : dadosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                      Nenhum lote encontrado com os filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  dadosPaginados.map(reserva => (
                    <TableRow key={reserva.id}>
                      <TableCell className="text-sm">
                        {format(new Date(reserva.created_at), 'dd/MM/yy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>{reserva.cliente || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{reserva.codigo_produto || '-'}</TableCell>
                      <TableCell className="text-sm">{reserva.modelo || '-'}</TableCell>
                      <TableCell className="font-mono font-bold">{reserva.letra_produto}{reserva.ano}</TableCell>
                      <TableCell className="font-mono">{reserva.numero_inicial}</TableCell>
                      <TableCell className="font-mono">{reserva.numero_final}</TableCell>
                      <TableCell className="font-bold">{reserva.quantidade}</TableCell>
                      <TableCell className="text-green-600 font-semibold">{reserva.quantidade_baixada || 0}</TableCell>
                      <TableCell>
                        <Badge variant={reserva.status === 'PRODUZIDO' ? 'default' : 'outline'}>
                          {reserva.status}
                        </Badge>
                      </TableCell>
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