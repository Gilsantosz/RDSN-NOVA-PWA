import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { useSetor } from '@/components/context/SetorContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, Plus } from 'lucide-react';
import { toast } from "sonner";
import ExportarRelatorio from './ExportarRelatorio';

const CORES = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#ef4444', '#14b8a6'];

export default function RelatorioCustomizavel() {
  const { setorAtivo, isAdmin } = useSetor();
  const [entidadeSelecionada, setEntidadeSelecionada] = useState('ReservaLote');
  const [camposSelecionados, setCamposSelecionados] = useState([]);
  const [filtros, setFiltros] = useState([]);
  const [agrupamento, setAgrupamento] = useState('');
  const [tipoGrafico, setTipoGrafico] = useState('barra');
  const [campoGraficoX, setCampoGraficoX] = useState('');
  const [campoGraficoY, setCampoGraficoY] = useState('');

  const entidadesDisponiveis = {
    ReservaLote: {
      label: 'Reservas',
      campos: [
        { key: 'codigo_completo', label: 'Código', tipo: 'texto' },
        { key: 'cliente', label: 'Cliente', tipo: 'texto' },
        { key: 'codigo_produto', label: 'Cód. Produto', tipo: 'texto' },
        { key: 'modelo', label: 'Modelo', tipo: 'texto' },
        { key: 'quantidade', label: 'Quantidade', tipo: 'numero' },
        { key: 'quantidade_baixada', label: 'Qtd Baixada', tipo: 'numero' },
        { key: 'status', label: 'Status', tipo: 'texto' },
        { key: 'created_at', label: 'Data Criação', tipo: 'data' }
      ]
    },
    BaixaLote: {
      label: 'Baixas',
      campos: [
        { key: 'tipo', label: 'Tipo', tipo: 'texto' },
        { key: 'quantidade', label: 'Quantidade', tipo: 'numero' },
        { key: 'de_setor', label: 'De Setor', tipo: 'texto' },
        { key: 'para_setor', label: 'Para Setor', tipo: 'texto' },
        { key: 'operador', label: 'Operador', tipo: 'texto' },
        { key: 'created_at', label: 'Data', tipo: 'data' }
      ]
    },
    Produto: {
      label: 'Produtos',
      campos: [
        { key: 'letra_produto', label: 'Letra', tipo: 'texto' },
        { key: 'modelo', label: 'Modelo', tipo: 'texto' },
        { key: 'descricao', label: 'Descrição', tipo: 'texto' },
        { key: 'estoque_atual', label: 'Estoque', tipo: 'numero' },
        { key: 'estoque_minimo', label: 'Estoque Mín', tipo: 'numero' }
      ]
    }
  };

  const { data: dados = [], isLoading } = useQuery({
    queryKey: ['relatorio-dados', entidadeSelecionada, setorAtivo],
    queryFn: async () => {
      const todas = await base44.entities[entidadeSelecionada].list();
      
      // Filtrar por setor
      if (isAdmin && setorAtivo === 'TODOS') return todas;
      
      if (entidadeSelecionada === 'Produto') {
        return todas.filter(item => item.setor_id === setorAtivo);
      } else if (entidadeSelecionada === 'ReservaLote') {
        return todas.filter(item => item.setor_id === setorAtivo);
      } else if (entidadeSelecionada === 'BaixaLote') {
        // Para baixas, precisamos filtrar pelas reservas do setor
        const reservasDoSetor = await base44.entities.ReservaLote.filter({ setor_id: setorAtivo });
        const reservaIds = reservasDoSetor.map(r => r.id);
        return todas.filter(item => reservaIds.includes(item.reserva_id));
      }
      
      return todas;
    },
    enabled: !!setorAtivo
  });

  const dadosFiltrados = useMemo(() => {
    let resultado = [...dados];

    filtros.forEach(filtro => {
      if (filtro.campo && filtro.valor) {
        resultado = resultado.filter(item => {
          const valor = item[filtro.campo];
          if (filtro.operador === 'contem') {
            return String(valor).toLowerCase().includes(filtro.valor.toLowerCase());
          } else if (filtro.operador === 'igual') {
            return String(valor) === filtro.valor;
          } else if (filtro.operador === 'maior') {
            return Number(valor) > Number(filtro.valor);
          } else if (filtro.operador === 'menor') {
            return Number(valor) < Number(filtro.valor);
          }
          return true;
        });
      }
    });

    return resultado;
  }, [dados, filtros]);

  const dadosAgrupados = useMemo(() => {
    if (!agrupamento || !campoGraficoY) return [];

    const grupos = {};
    dadosFiltrados.forEach(item => {
      const chave = item[agrupamento] || 'Sem categoria';
      if (!grupos[chave]) {
        grupos[chave] = { nome: chave, valor: 0, count: 0 };
      }
      grupos[chave].valor += Number(item[campoGraficoY]) || 0;
      grupos[chave].count += 1;
    });

    return Object.values(grupos);
  }, [dadosFiltrados, agrupamento, campoGraficoY]);

  const colunasExportacao = useMemo(() => {
    const camposConfig = entidadesDisponiveis[entidadeSelecionada].campos;
    const camposExportar = camposSelecionados.length > 0 
      ? camposConfig.filter(c => camposSelecionados.includes(c.key))
      : camposConfig;
    return camposExportar.map(c => ({
      key: c.key,
      label: c.label,
      width: 16,
      tipo: c.tipo === 'numero' ? 'numero' : undefined
    }));
  }, [entidadeSelecionada, camposSelecionados]);

  const resumoExportacao = useMemo(() => {
    const r = { 'Total de Registros': dadosFiltrados.length };
    if (campoGraficoY) {
      const soma = dadosFiltrados.reduce((acc, item) => acc + (Number(item[campoGraficoY]) || 0), 0);
      r[`Total ${campoGraficoY}`] = soma;
    }
    return r;
  }, [dadosFiltrados, campoGraficoY]);

  const adicionarFiltro = () => {
    setFiltros([...filtros, { campo: '', operador: 'contem', valor: '' }]);
  };

  const renderGrafico = () => {
    if (!agrupamento || dadosAgrupados.length === 0) return null;

    const componentes = {
      barra: (
        <BarChart data={dadosAgrupados}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="nome" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="valor" fill="#0ea5e9" />
        </BarChart>
      ),
      linha: (
        <LineChart data={dadosAgrupados}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="nome" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="valor" stroke="#8b5cf6" strokeWidth={2} />
        </LineChart>
      ),
      pizza: (
        <PieChart>
          <Pie
            data={dadosAgrupados}
            dataKey="valor"
            nameKey="nome"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {dadosAgrupados.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      )
    };

    return (
      <Card className="border-slate-200 mt-6">
        <CardHeader>
          <CardTitle className="text-base">Visualização Gráfica</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            {componentes[tipoGrafico]}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Configuração */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Configurar Relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seleção de Entidade */}
          <div className="space-y-2">
            <Label>Fonte de Dados</Label>
            <Select value={entidadeSelecionada} onValueChange={setEntidadeSelecionada}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(entidadesDisponiveis).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de Campos */}
          <div className="space-y-2">
            <Label>Campos para Exibir</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-slate-50 rounded-lg">
              {entidadesDisponiveis[entidadeSelecionada].campos.map(campo => (
                <div key={campo.key} className="flex items-center space-x-2">
                  <Checkbox
                    checked={camposSelecionados.includes(campo.key)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setCamposSelecionados([...camposSelecionados, campo.key]);
                      } else {
                        setCamposSelecionados(camposSelecionados.filter(c => c !== campo.key));
                      }
                    }}
                  />
                  <label className="text-sm">{campo.label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Filtros */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Filtros Dinâmicos</Label>
              <Button size="sm" variant="outline" onClick={adicionarFiltro}>
                <Plus className="w-3 h-3 mr-1" />
                Adicionar Filtro
              </Button>
            </div>
            {filtros.map((filtro, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded">
                <Select
                  value={filtro.campo}
                  onValueChange={(v) => {
                    const novos = [...filtros];
                    novos[idx].campo = v;
                    setFiltros(novos);
                  }}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Campo" />
                  </SelectTrigger>
                  <SelectContent>
                    {entidadesDisponiveis[entidadeSelecionada].campos.map(c => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filtro.operador}
                  onValueChange={(v) => {
                    const novos = [...filtros];
                    novos[idx].operador = v;
                    setFiltros(novos);
                  }}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contem">Contém</SelectItem>
                    <SelectItem value="igual">Igual a</SelectItem>
                    <SelectItem value="maior">Maior que</SelectItem>
                    <SelectItem value="menor">Menor que</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Valor"
                  value={filtro.valor}
                  onChange={(e) => {
                    const novos = [...filtros];
                    novos[idx].valor = e.target.value;
                    setFiltros(novos);
                  }}
                  className="text-xs"
                />
              </div>
            ))}
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Agrupamento</Label>
              <Select value={agrupamento} onValueChange={setAgrupamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhum</SelectItem>
                  {entidadesDisponiveis[entidadeSelecionada].campos
                    .filter(c => c.tipo === 'texto')
                    .map(c => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Campo Numérico</Label>
              <Select value={campoGraficoY} onValueChange={setCampoGraficoY}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {entidadesDisponiveis[entidadeSelecionada].campos
                    .filter(c => c.tipo === 'numero')
                    .map(c => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Gráfico</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={tipoGrafico === 'barra' ? 'default' : 'outline'}
                  onClick={() => setTipoGrafico('barra')}
                  className="flex-1"
                >
                  <BarChart3 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={tipoGrafico === 'linha' ? 'default' : 'outline'}
                  onClick={() => setTipoGrafico('linha')}
                  className="flex-1"
                >
                  <LineIcon className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={tipoGrafico === 'pizza' ? 'default' : 'outline'}
                  onClick={() => setTipoGrafico('pizza')}
                  className="flex-1"
                >
                  <PieIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>


          {/* Ações de Exportação */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <ExportarRelatorio
              dados={dadosFiltrados}
              colunas={colunasExportacao}
              titulo={`Relatorio de ${entidadesDisponiveis[entidadeSelecionada].label}`}
              resumo={resumoExportacao}
              filtrosAplicados={{ 'Fonte': entidadesDisponiveis[entidadeSelecionada].label }}
            />
          </div>

        </CardContent>
      </Card>

      {/* Gráfico */}
      {renderGrafico()}

      {/* Tabela de Dados */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Dados ({dadosFiltrados.length} registros)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    {entidadesDisponiveis[entidadeSelecionada].campos
                      .filter(c => camposSelecionados.length === 0 || camposSelecionados.includes(c.key))
                      .map(campo => (
                        <th key={campo.key} className="text-left p-2 font-semibold text-slate-700">
                          {campo.label}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {dadosFiltrados.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      {entidadesDisponiveis[entidadeSelecionada].campos
                        .filter(c => camposSelecionados.length === 0 || camposSelecionados.includes(c.key))
                        .map(campo => (
                          <td key={campo.key} className="p-2">
                            {row[campo.key] || '-'}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {dadosFiltrados.length > 50 && (
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Exibindo 50 de {dadosFiltrados.length} registros. Exporte para ver todos.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}