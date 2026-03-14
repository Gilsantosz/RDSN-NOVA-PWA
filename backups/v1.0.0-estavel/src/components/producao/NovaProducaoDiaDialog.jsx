import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, X, Play, Search, Filter, Check } from "lucide-react";
import { formatarNumeracao, extrairPrefixo } from '../formatacao/FormatacaoNumeracao';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function NovaProducaoDiaDialog({
  open,
  onOpenChange,
  reservas,
  lotesJaAbertos,
  baixasPorReserva,
  setorNome,
  onIniciar,
  isLoading,
  produtos = []
}) {
  const [lotesSelecionados, setLotesSelecionados] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroLetra, setFiltroLetra] = useState('TODOS');
  const [filtroCliente, setFiltroCliente] = useState('TODOS');
  const [filtroAno, setFiltroAno] = useState('TODOS');
  const [filtroMes, setFiltroMes] = useState('TODOS');
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Lotes disponíveis (reservados ou em produção, com restante > 0, não já abertos)
  const lotesDisponiveis = useMemo(() => {
    return reservas.filter(r => {
      if (!['RESERVADO', 'EM_PRODUCAO'].includes(r.status)) return false;
      const restante = (r.quantidade || 0) - (r.quantidade_baixada || 0);
      if (restante <= 0) return false;
      if (lotesJaAbertos.includes(r.id)) return false;
      if (lotesSelecionados.find(l => l.reserva.id === r.id)) return false;
      return true;
    });
  }, [reservas, lotesJaAbertos, lotesSelecionados]);

  // Opções de filtro dinâmicas
  const opcoesFiltro = useMemo(() => {
    const letras = [...new Set(lotesDisponiveis.map(r => r.letra_produto).filter(Boolean))].sort();
    const clientes = [...new Set(lotesDisponiveis.map(r => r.cliente).filter(Boolean))].sort();
    const anos = [...new Set(lotesDisponiveis.map(r => r.ano).filter(Boolean))].sort((a, b) => b - a);
    const meses = [...new Set(lotesDisponiveis.map(r => r.mes_producao).filter(Boolean))].sort();
    return { letras, clientes, anos, meses };
  }, [lotesDisponiveis]);

  // Aplicar filtros e busca
  const lotesFiltrados = useMemo(() => {
    let result = [...lotesDisponiveis];

    if (busca.length >= 1) {
      const termo = busca.toLowerCase();
      result = result.filter(r =>
        r.cliente?.toLowerCase().includes(termo) ||
        r.codigo_produto?.toLowerCase().includes(termo) ||
        r.codigo_completo?.toLowerCase().includes(termo) ||
        r.letra_produto?.toLowerCase().includes(termo) ||
        r.modelo?.toLowerCase().includes(termo) ||
        String(r.numero_inicial).includes(termo) ||
        String(r.numero_final).includes(termo)
      );
    }

    if (filtroLetra !== 'TODOS') {
      result = result.filter(r => r.letra_produto === filtroLetra);
    }
    if (filtroCliente !== 'TODOS') {
      result = result.filter(r => r.cliente === filtroCliente);
    }
    if (filtroAno !== 'TODOS') {
      result = result.filter(r => String(r.ano) === filtroAno);
    }
    if (filtroMes !== 'TODOS') {
      result = result.filter(r => r.mes_producao === filtroMes);
    }
    if (filtroCodigo) {
      const termo = filtroCodigo.toLowerCase();
      result = result.filter(r => r.codigo_produto?.toLowerCase().includes(termo) || r.codigo_completo?.toLowerCase().includes(termo));
    }

    // Ordenação Lógica Contínua para sugerir sequência
    const gruposEmProducao = new Set(
      reservas.filter(r => r.status === 'EM_PRODUCAO').map(r => `${r.cliente || ''}-${r.codigo_completo}`)
    );

    result.sort((a, b) => {
      const grupoA = `${a.cliente || ''}-${a.codigo_completo}`;
      const grupoB = `${b.cliente || ''}-${b.codigo_completo}`;

      const aTemProducao = gruposEmProducao.has(grupoA);
      const bTemProducao = gruposEmProducao.has(grupoB);

      // 1. Grupos de clientes/prefixos que têm itens já em produção sobem
      if (aTemProducao && !bTemProducao) return -1;
      if (!aTemProducao && bTemProducao) return 1;

      // 2. Agrupar por cliente
      const clienteA = a.cliente || '';
      const clienteB = b.cliente || '';
      if (clienteA < clienteB) return -1;
      if (clienteA > clienteB) return 1;

      // 3. Agrupar por prefixo
      if (a.codigo_completo < b.codigo_completo) return -1;
      if (a.codigo_completo > b.codigo_completo) return 1;

      // 4. EM_PRODUCAO primeiro dentro do grupo
      if (a.status === 'EM_PRODUCAO' && b.status !== 'EM_PRODUCAO') return -1;
      if (a.status !== 'EM_PRODUCAO' && b.status === 'EM_PRODUCAO') return 1;

      // 5. Crescente/Decrescente
      const isDesc = (produtos.find(p => p.codigo_produto === a.codigo_produto) ||
        produtos.find(p => p.letra_produto === a.letra_produto && !p.codigo_produto))?.ordem_baixa === 'decrescente';
      if (isDesc) return b.numero_final - a.numero_final;
      return a.numero_inicial - b.numero_inicial;
    });

    return result;
  }, [lotesDisponiveis, busca, filtroLetra, filtroCliente, filtroAno, filtroMes, filtroCodigo, produtos, reservas]);

  // Plano de Sequência Sugerido (Top 3 do mesmo cliente e prefixo)
  const primeiroLote = lotesFiltrados[0];
  const prefixoSugerido = primeiroLote ? primeiroLote.codigo_completo : '';
  const clienteSugerido = primeiroLote ? (primeiroLote.cliente || '') : '';
  const lotesSugeridos = lotesFiltrados.filter(l => l.codigo_completo === prefixoSugerido && (l.cliente || '') === clienteSugerido).slice(0, 3);
  const lotesRestantes = lotesFiltrados.filter(l => !lotesSugeridos.includes(l));

  const handleAddSequenciaSugerida = () => {
    lotesSugeridos.forEach(lote => {
      if (!lotesSelecionados.find(ls => ls.reserva.id === lote.id)) {
        handleAddLote(lote);
      }
    });
  };

  const handleAddLote = (reserva) => {
    const baixasDoLote = baixasPorReserva[reserva.id] || [];
    const produtoInfo = produtos.find(p => p.codigo_produto === reserva.codigo_produto)
      || produtos.find(p => p.letra_produto === reserva.letra_produto && !p.codigo_produto);
    const ordemDecrescente = produtoInfo?.ordem_baixa === 'decrescente';

    let sugestaoInicial;
    if (ordemDecrescente) {
      // Ordem invertida: começa do numero_final e vai descendo
      sugestaoInicial = reserva.numero_final - (reserva.quantidade_baixada || 0);
      if (baixasDoLote.length > 0) {
        const menorInicial = Math.min(...baixasDoLote.map(b => b.numero_inicial));
        sugestaoInicial = menorInicial - 1;
      }
    } else {
      // Ordem normal: crescente
      sugestaoInicial = reserva.numero_inicial + (reserva.quantidade_baixada || 0);
      if (baixasDoLote.length > 0) {
        const maiorFinal = Math.max(...baixasDoLote.map(b => b.numero_final));
        sugestaoInicial = maiorFinal + 1;
      }
    }
    setLotesSelecionados(prev => [...prev, {
      reserva,
      numeracao_inicial: sugestaoInicial.toString(),
      erro: ''
    }]);
  };

  const handleRemoveLote = (reservaId) => {
    setLotesSelecionados(prev => prev.filter(l => l.reserva.id !== reservaId));
  };

  const handleChangeInicial = (reservaId, valor) => {
    setLotesSelecionados(prev => prev.map(l => {
      if (l.reserva.id !== reservaId) return l;
      const num = Number(valor);
      let erro = '';
      if (valor && isNaN(num)) erro = 'Número inválido';
      else if (num < l.reserva.numero_inicial || num > l.reserva.numero_final) {
        erro = `Fora do intervalo (${l.reserva.numero_inicial.toLocaleString()} - ${l.reserva.numero_final.toLocaleString()})`;
      }
      return { ...l, numeracao_inicial: valor, erro };
    }));
  };

  const canStart = lotesSelecionados.length > 0 &&
    lotesSelecionados.every(l => l.numeracao_inicial && !l.erro);

  const handleIniciar = () => {
    onIniciar(lotesSelecionados.map(l => ({
      reserva_id: l.reserva.id,
      numeracao_inicial: Number(l.numeracao_inicial),
      reserva: l.reserva
    })));
    setLotesSelecionados([]);
  };

  const limparFiltros = () => {
    setBusca('');
    setFiltroLetra('TODOS');
    setFiltroCliente('TODOS');
    setFiltroAno('TODOS');
    setFiltroMes('TODOS');
    setFiltroCodigo('');
  };

  const temFiltrosAtivos = filtroLetra !== 'TODOS' || filtroCliente !== 'TODOS' || filtroAno !== 'TODOS' || filtroMes !== 'TODOS' || filtroCodigo;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setLotesSelecionados([]); limparFiltros(); } onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">Iniciar Produção do Dia</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Busca + Filtros */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por cliente, código, letra, numeração..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={showFilters ? "default" : "outline"}
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <Filter className="w-4 h-4" />
                {temFiltrosAtivos && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
                )}
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <Label className="text-xs text-slate-500">Letra</Label>
                  <Select value={filtroLetra} onValueChange={setFiltroLetra}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODOS">Todas</SelectItem>
                      {opcoesFiltro.letras.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Cliente</Label>
                  <Select value={filtroCliente} onValueChange={setFiltroCliente}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODOS">Todos</SelectItem>
                      {opcoesFiltro.clientes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Ano</Label>
                  <Select value={filtroAno} onValueChange={setFiltroAno}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODOS">Todos</SelectItem>
                      {opcoesFiltro.anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Mês Produção</Label>
                  <Select value={filtroMes} onValueChange={setFiltroMes}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODOS">Todos</SelectItem>
                      {opcoesFiltro.meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Código</Label>
                  <Input
                    placeholder="Código..."
                    value={filtroCodigo}
                    onChange={(e) => setFiltroCodigo(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                {temFiltrosAtivos && (
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" onClick={limparFiltros} className="text-xs h-8 text-slate-500">
                      <X className="w-3 h-3 mr-1" /> Limpar
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
              Lotes Disponíveis ({lotesFiltrados.length})
            </Label>

            {lotesFiltrados.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm border border-slate-200 rounded-lg">
                {lotesDisponiveis.length === 0
                  ? 'Nenhum lote disponível para produção'
                  : 'Nenhum lote encontrado com os filtros aplicados'}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Destaque em Verde: Plano de Sequência Sugerido */}
                {lotesSugeridos.length > 0 && busca.length === 0 && filtroLetra === 'TODOS' && (
                  <div className="border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] rounded-xl overflow-hidden bg-emerald-50/30">
                    <div className="bg-emerald-500/10 px-4 py-2 border-b border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Seq. {prefixoSugerido} • {clienteSugerido || 'S/ CLIENTE'}
                      </span>
                      <Button
                        onClick={handleAddSequenciaSugerida}
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 uppercase tracking-widest font-black"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Selecionar {lotesSugeridos.length} Lotes
                      </Button>
                    </div>
                    <div className="divide-y divide-emerald-100">
                      {lotesSugeridos.map((r, index) => {
                        const restante = (r.quantidade || 0) - (r.quantidade_baixada || 0);
                        const progresso = r.quantidade > 0 ? Math.round(((r.quantidade_baixada || 0) / r.quantidade) * 100) : 0;
                        const prodInfo = produtos.find(p => p.codigo_produto === r.codigo_produto) || produtos.find(p => p.letra_produto === r.letra_produto && !p.codigo_produto);
                        const isDecrescente = prodInfo?.ordem_baixa === 'decrescente';

                        return (
                          <button
                            key={r.id}
                            onClick={() => handleAddLote(r)}
                            className="w-full text-left px-3 py-2.5 hover:bg-emerald-100/50 transition-colors flex items-center gap-3 group"
                          >
                            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xs shadow-sm shadow-emerald-500/30 flex-shrink-0 group-hover:scale-110 transition-transform">
                              {index + 1}
                            </div>
                            <div className="w-9 h-9 bg-emerald-900 text-white rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 group-hover:scale-105 transition-transform shadow-md">
                              {r.letra_produto}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm text-slate-900">{r.cliente || 'Sem cliente'}</p>
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] px-1.5 py-0 font-black tracking-widest">{r.status === 'EM_PRODUCAO' ? 'EM PROD.' : 'RESERVADO'}</Badge>
                                {isDecrescente && <Badge className="bg-purple-100 text-purple-800 border-0 text-[10px] px-1.5 py-0 font-black tracking-widest">↓ INV</Badge>}
                              </div>
                              <p className="text-xs text-slate-500 truncate m-0">
                                {r.codigo_completo} · {r.codigo_produto}
                              </p>
                              <p className="text-xs font-mono font-bold text-slate-700 underline my-0.5">
                                {r.codigo_completo}{String(r.numero_inicial).padStart(7, '0')} - {r.codigo_completo}{String(r.numero_final).padStart(7, '0')}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0 pr-2">
                              <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Restante</p>
                              <p className="font-black text-lg text-emerald-700 leading-none">{restante.toLocaleString()}</p>
                            </div>
                            <Plus className="w-5 h-5 text-emerald-500 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Lista Completa Restante */}
                {lotesRestantes.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {lotesRestantes.map(r => {
                      const restante = (r.quantidade || 0) - (r.quantidade_baixada || 0);
                      const progresso = r.quantidade > 0 ? Math.round(((r.quantidade_baixada || 0) / r.quantidade) * 100) : 0;
                      const prodInfo = produtos.find(p => p.codigo_produto === r.codigo_produto) || produtos.find(p => p.letra_produto === r.letra_produto && !p.codigo_produto);
                      const isDecrescente = prodInfo?.ordem_baixa === 'decrescente';
                      return (
                        <button
                          key={r.id}
                          onClick={() => handleAddLote(r)}
                          className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors flex items-center gap-3 group"
                        >
                          <div className="w-9 h-9 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 transition-transform group-hover:scale-105">
                            {r.letra_produto}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm text-slate-900 truncate">{r.cliente || 'Sem cliente'}</p>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0 text-slate-500">
                                {r.status === 'EM_PRODUCAO' ? 'Em Prod.' : 'Reservado'}
                              </Badge>
                              {isDecrescente && (
                                <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] px-1.5 py-0 flex-shrink-0">↓ Invertida</Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 truncate">
                              {r.codigo_completo} · {r.codigo_produto} · {r.modelo || ''}
                            </p>
                            <p className="text-xs font-mono font-bold text-slate-700 underline">
                              {r.codigo_completo}{String(r.numero_inicial).padStart(7, '0')} - {r.codigo_completo}{String(r.numero_final).padStart(7, '0')}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0 pr-2">
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Restante</p>
                            <p className="font-bold text-base text-slate-900 leading-none">{restante.toLocaleString()}</p>
                          </div>
                          <Plus className="w-4 h-4 text-blue-500 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lotes selecionados */}
          {lotesSelecionados.length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                Selecionados ({lotesSelecionados.length})
              </Label>
              {lotesSelecionados.map((item) => {
                const r = item.reserva;
                const prefixo = extrairPrefixo(r.codigo_completo);
                const progresso = r.quantidade > 0 ? Math.round(((r.quantidade_baixada || 0) / r.quantidade) * 100) : 0;
                return (
                  <div key={r.id} className="border-2 border-blue-200 rounded-lg p-3 bg-blue-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                          {r.letra_produto}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{r.cliente}</p>
                          <p className="text-xs text-slate-500">{r.codigo_completo} · {r.codigo_produto}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLote(r.id)}
                        className="h-7 w-7 text-slate-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {/* Progresso real */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>Progresso: {(r.quantidade_baixada || 0).toLocaleString()} / {r.quantidade?.toLocaleString()}</span>
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progresso}%` }} />
                      </div>
                      <span className="font-medium">{progresso}%</span>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">Numeração Inicial *</Label>
                      <Input
                        value={item.numeracao_inicial}
                        onChange={(e) => handleChangeInicial(r.id, e.target.value)}
                        className="mt-1 font-bold text-center"
                      />
                      {item.numeracao_inicial && !item.erro && (
                        <p className="text-xs text-slate-600 mt-1">
                          → {r.codigo_completo}{formatarNumeracao(Number(item.numeracao_inicial), prefixo, setorNome)}
                        </p>
                      )}
                      {item.erro && (
                        <p className="text-xs text-red-600 mt-1">{item.erro}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {lotesSelecionados.length === 0 && lotesFiltrados.length > 0 && (
            <div className="text-center py-4 text-slate-400">
              <p className="text-sm">Selecione lotes da lista acima para iniciar a produção</p>
            </div>
          )}
        </div>

        {/* Botão Iniciar (fixo no fundo) */}
        <div className="pt-3 border-t border-slate-200 mt-2">
          <Button
            onClick={handleIniciar}
            disabled={!canStart || isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Play className="w-5 h-5 mr-2" />
            )}
            Iniciar Produção ({lotesSelecionados.length} lote{lotesSelecionados.length !== 1 ? 's' : ''})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}