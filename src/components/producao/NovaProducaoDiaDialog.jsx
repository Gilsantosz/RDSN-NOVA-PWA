// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  Plus,
  Trash2,
  Play,
  Workflow,
  Box,
  X,
  Factory,
  CheckCircle2,
  Circle,
  Filter,
  Layers,
  ChevronRight,
  Hash
} from "lucide-react";
import { proximoNumero } from '@/core/numeracaoService';
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { extrairPrefixo, formatarNumeracao } from '../formatacao/FormatacaoNumeracao';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NovaProducaoDiaDialog({
  open,
  onOpenChange,
  reservas,
  lotesJaAbertos,
  baixasPorReserva,
  setorNome,
  onIniciar,
  isLoading,
  produtos = [],
  setorInfo,
  lotesSessaoAbertos = []
}) {
  const [search, setSearch] = useState('');
  const [selecionados, setSelecionados] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filtroLetra, setFiltroLetra] = useState('TODOS');

  // Filtrar reservas elegíveis
  const reservasElegiveis = useMemo(() => {
    let result = reservas.filter(r =>
      ['RESERVADO', 'EM_PRODUCAO'].includes(r.status) &&
      !lotesJaAbertos.includes(r.id) &&
      (r.cliente?.toLowerCase().includes(search.toLowerCase()) ||
        r.codigo_completo?.toLowerCase().includes(search.toLowerCase()) ||
        r.modelo?.toLowerCase().includes(search.toLowerCase()))
    );

    if (filtroLetra !== 'TODOS') {
      result = result.filter(r => r.letra_produto === filtroLetra);
    }

    return result;
  }, [reservas, search, lotesJaAbertos, filtroLetra]);

  const letrasDisponiveis = useMemo(() => {
    return ['TODOS', ...new Set(reservas.map(r => r.letra_produto).filter(Boolean))].sort();
  }, [reservas]);

  const handleToggle = (reserva) => {
    const jaSelecionado = selecionados.find(s => s.reserva_id === reserva.id);
    if (jaSelecionado) {
      setSelecionados(selecionados.filter(s => s.reserva_id !== reserva.id));
    } else {
      const baixas = baixasPorReserva[reserva.id] || [];
      const lotesSessao = lotesSessaoAbertos.filter(l => l.reserva_id === reserva.id);

      const prodInfo = produtos.find(p => p.codigo_produto === reserva.codigo_produto) ||
        produtos.find(p => p.letra_produto === reserva.letra_produto && !p.codigo_produto);
      const isDecrescente = reserva.sequencia_decrescente === true;

      let sugereNum;

      // Unificar o que já saiu do banco e o que está aberto em sessão
      const numsJaUsados = [
        ...baixas.map(b => [Number(b.numero_inicial), Number(b.numero_final)]).flat(),
        ...lotesSessao.map(l => [Number(l.numeracao_inicial), Number(l.numeracao_final)]).flat()
      ].filter(n => !isNaN(n));

      const resIni = Number(reserva.numero_inicial) || 0;
      const resFim = Number(reserva.numero_final) || 0;
      const rangeMin = Math.min(resIni, resFim);
      const rangeMax = Math.max(resIni, resFim);

      if (isDecrescente) {
        // Se decrescente, tenta o topo da reserva. Se o topo já estiver ocupado, sugere o anterior ao menor usado.
        if (numsJaUsados.length === 0 || !numsJaUsados.includes(rangeMax)) {
          sugereNum = rangeMax;
        } else {
          const menorUsado = Math.min(...numsJaUsados);
          sugereNum = proximoNumero(menorUsado, true);
        }
      } else {
        // Se crescente, tenta o início da reserva. Se o início já estiver ocupado, sugere o próximo do maior usado.
        if (numsJaUsados.length === 0 || !numsJaUsados.includes(rangeMin)) {
          sugereNum = rangeMin;
        } else {
          const maiorUsado = Math.max(...numsJaUsados);
          sugereNum = proximoNumero(maiorUsado, false);
        }
      }

      setSelecionados([...selecionados, {
        reserva_id: reserva.id,
        reserva,
        numeracao_inicial: sugereNum,
        sequencia_decrescente: isDecrescente
      }]);
    }
  };

  const handleUpdateNum = (id, num) => {
    setSelecionados(selecionados.map(s =>
      s.reserva_id === id ? { ...s, numeracao_inicial: parseInt(num) || 0 } : s
    ));
  };

  const handleToggleOrdem = (id) => {
    setSelecionados(selecionados.map(s => {
      if (s.reserva_id !== id) return s;
      const novaOrdem = !s.sequencia_decrescente;
      
      // Re-sugerir número inicial baseado na nova ordem se o atual for o default
      let novoSugere = s.numeracao_inicial;
      const baixas = baixasPorReserva[s.reserva_id] || [];
      const lotesSessao = lotesSessaoAbertos.filter(l => l.reserva_id === s.reserva_id);
      const reserva = s.reserva;

      const numsJaUsados = [
        ...baixas.map(b => [Number(b.numero_inicial), Number(b.numero_final)]).flat(),
        ...lotesSessao.map(l => [Number(l.numeracao_inicial), Number(l.numeracao_final)]).flat()
      ].filter(n => !isNaN(n));

      const resIni = Number(reserva.numero_inicial) || 0;
      const resFim = Number(reserva.numero_final) || 0;
      const rangeMin = Math.min(resIni, resFim);
      const rangeMax = Math.max(resIni, resFim);

      if (novaOrdem) {
        // Decrescente: Prioriza o topo se livre
        if (numsJaUsados.length === 0 || !numsJaUsados.includes(rangeMax)) {
          novoSugere = rangeMax;
        } else {
          const menorUsado = Math.min(...numsJaUsados);
          novoSugere = proximoNumero(menorUsado, true);
        }
      } else {
        // Crescente: Prioriza o início se livre
        if (numsJaUsados.length === 0 || !numsJaUsados.includes(rangeMin)) {
          novoSugere = rangeMin;
        } else {
          const maiorUsado = Math.max(...numsJaUsados);
          novoSugere = proximoNumero(maiorUsado, false);
        }
      }

      return { ...s, sequencia_decrescente: novaOrdem, numeracao_inicial: novoSugere };
    }));
  };

  const handleIniciar = () => {
    if (selecionados.length === 0) return;
    onIniciar(selecionados);
    setSelecionados([]);
    setSearch('');
    // delay fechar para UX
    onOpenChange(false);
  };

  const canStart = selecionados.length > 0 && !isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] lg:max-w-7xl h-[95vh] flex flex-col p-0 overflow-hidden border-0 bg-white dark:bg-slate-950 rounded-none sm:rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,0.4)]">

        {/* Header Premium Industrial */}
        <div className="relative bg-slate-950 px-8 py-10 shrink-0 overflow-hidden border-b border-white/5">
          <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-blue-600/10 rounded-full blur-[120px] -mr-64 -mt-64" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/5 rounded-full blur-[100px] -ml-48 -mb-48" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8 pr-12 md:pr-0">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-[1rem] bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                  <Factory className="w-7 h-7 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">Dispatcher de Produção</DialogTitle>
                  <p className="text-[10px] font-black tracking-[0.4em] uppercase text-blue-400 italic mt-2 flex items-center gap-2">
                    Protocolo de Lançamento Digital • {setorNome || 'Unidade RDSN'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 sm:w-80 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="LOCALIZAR LOTE/CLIENTE..."
                  className="h-14 pl-12 pr-6 bg-white/5 border-white/10 text-white font-black italic rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-slate-600 uppercase tracking-wider"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "h-14 px-6 rounded-2xl border-white/10 text-white font-black uppercase text-[10px] tracking-widest gap-3 transition-all",
                  showFilters ? "bg-white/10 border-white/30" : "hover:bg-white/5"
                )}
              >
                <Filter className="w-4 h-4 text-blue-400" />
                {showFilters ? 'Ocultar Filtros' : 'Filtros'}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="relative z-10 mt-8 pt-8 border-t border-white/5 animate-in slide-in-from-top-4 duration-300 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Filtragem por Letra</Label>
                <Select value={filtroLetra} onValueChange={setFiltroLetra}>
                  <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white font-bold rounded-xl outline-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    {letrasDisponiveis.map(l => <SelectItem key={l} value={l} className="uppercase font-bold">{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 sm:top-8 sm:right-8 z-50 text-slate-400 hover:text-white hover:bg-white/10 rounded-full w-12 h-12 p-0 transition-all"
          >
            <X className="w-8 h-8" />
          </Button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-50 dark:bg-black">

          {/* Lado Esquerdo: Lotes Disponíveis */}
          <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-white/5">
            <div className="px-10 py-5 flex items-center justify-between bg-white dark:bg-slate-900/40 border-b border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-blue-500" />
                <span className="text-[11px] font-black uppercase text-slate-500 italic tracking-[0.2em]">Disponibilidade de Carga ({reservasElegiveis.length})</span>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-8 space-y-4">
                {reservasElegiveis.length === 0 ? (
                  <div className="py-24 text-center space-y-6 opacity-30">
                    <Search className="w-20 h-20 text-slate-400 mx-auto" />
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Nenhuma reserva localizada no radar</p>
                  </div>
                ) : (
                  reservasElegiveis.map(reserva => {
                    const isSelected = selecionados.find(s => s.reserva_id === reserva.id);
                    return (
                      <div
                        key={reserva.id}
                        onClick={() => handleToggle(reserva)}
                        className={cn(
                          "group relative rounded-[2.5rem] p-8 cursor-pointer transition-all border-2 overflow-hidden flex items-center gap-8",
                          isSelected
                            ? "bg-blue-600/5 border-blue-600 dark:bg-blue-600/10 shadow-2xl scale-[1.01]"
                            : "bg-white dark:bg-slate-900 border-transparent hover:border-slate-300 dark:hover:border-white/10 shadow-sm hover:translate-x-1"
                        )}
                      >
                        <div className={cn(
                          "w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all duration-500",
                          isSelected ? "bg-blue-600 text-white shadow-lg" : "bg-slate-100 dark:bg-black text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-800"
                        )}>
                          <span className="text-3xl font-black italic">{reserva.letra_produto}</span>
                        </div>

                        <div className="flex-1 space-y-4 min-w-0">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Estrutura Operacional</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter truncate">{reserva.cliente || 'CLIENTE FINAL'}</p>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/5">
                              <Box className="w-3 h-3 text-blue-500" />
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 font-mono tracking-tighter">{reserva.codigo_completo}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/5">
                              <Plus className="w-3 h-3 text-blue-500" />
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase italic tracking-widest">{reserva.modelo}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/5">
                              <Hash className="w-3 h-3 text-blue-500" />
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 font-mono tracking-tighter">
                                {(() => {
                                  const isDecrescente = reserva.sequencia_decrescente === true;
                                  return `${isDecrescente ? Math.max(reserva.numero_inicial, reserva.numero_final) : Math.min(reserva.numero_inicial, reserva.numero_final)} — ${isDecrescente ? Math.min(reserva.numero_inicial, reserva.numero_final) : Math.max(reserva.numero_inicial, reserva.numero_final)}`;
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end gap-4 shrink-0 pl-4 border-l border-slate-100 dark:border-white/5">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Massa</span>
                            <p className="text-4xl font-black text-slate-950 dark:text-white italic tracking-tighter leading-none hover:text-blue-600 transition-colors">{reserva.quantidade}</p>
                          </div>
                          {isSelected ? (
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                              <CheckCircle2 className="w-5 h-5 text-white stroke-[3px]" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                              <Circle className="w-4 h-4 text-slate-300" />
                            </div>
                          )}
                        </div>

                        {/* Background Decorative Factory */}
                        <div className="absolute top-0 right-0 p-2 opacity-[0.03] scale-[2.5] rotate-12 -mr-10 -mt-10 pointer-events-none group-hover:opacity-[0.07] transition-all duration-700">
                          <Factory className="w-32 h-32" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Lado Direito: Sequenciador Operacional */}
          <div className="w-full lg:w-[32rem] flex flex-col bg-slate-100 dark:bg-slate-900/50 border-t lg:border-t-0 border-slate-200 dark:border-white/5">
            <div className="px-10 py-5 flex items-center justify-between bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <Workflow className="w-5 h-5 text-blue-500" />
                <span className="text-[11px] font-black uppercase text-blue-600 italic tracking-[0.2em]">Sequenciador Operativo</span>
              </div>
              {selecionados.length > 0 && (
                <Badge className="bg-blue-600 text-white font-black px-3 py-1 rounded-[0.5rem] tracking-tighter">{selecionados.length} ATIVOS</Badge>
              )}
            </div>

            <ScrollArea className="flex-1">
              <div className="p-8 space-y-6">
                {selecionados.length === 0 ? (
                  <div className="py-32 text-center px-12 space-y-6 opacity-30">
                    <div className="relative mx-auto w-24 h-24">
                      <div className="absolute inset-0 bg-blue-600/20 blur-3xl rounded-full" />
                      <Workflow className="relative w-full h-full text-slate-400" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 leading-relaxed italic">Aguardando definição da sequência operacional no dispatcher principal</p>
                  </div>
                ) : (
                  selecionados.map((sel, idx) => (
                    <div key={sel.reserva_id} className="bg-white dark:bg-black rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/10 shadow-2xl relative overflow-hidden group animate-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                      <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />

                      <div className="flex items-start justify-between mb-8">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Box className="w-4 h-4 text-blue-500" />
                            <p className="text-base font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">{sel.reserva.codigo_completo}</p>
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[15rem] leading-none mb-1">{sel.reserva.cliente || 'CLIENTE FINAL'}</p>
                        </div>
                        <button
                          onClick={() => handleToggle(sel.reserva)}
                          className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all shadow-sm"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-5 bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 mt-4">
                        <div className="flex items-center justify-between mb-2">
                           <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-1 flex items-center gap-2">
                            <Play className="w-3 h-3 text-blue-500" />
                            Coleta de Partida Hoje
                          </Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleOrdem(sel.reserva_id)}
                            className={cn(
                              "h-7 px-3 rounded-full text-[9px] font-black uppercase tracking-widest gap-2 border transition-all",
                              sel.sequencia_decrescente 
                                ? "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20" 
                                : "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                            )}
                          >
                            {sel.sequencia_decrescente ? (
                              <>
                                <Hash className="w-3 h-3 rotate-180" />
                                Decrescente (↓)
                              </>
                            ) : (
                              <>
                                <Hash className="w-3 h-3" />
                                Crescente (↑)
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="relative group">
                          <Input
                            type="number"
                            value={sel.numeracao_inicial}
                            onChange={e => handleUpdateNum(sel.reserva_id, e.target.value)}
                            className="h-16 pl-6 pr-6 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-black text-3xl italic text-blue-600 dark:text-blue-400 tracking-tighter shadow-inner focus:ring-0 focus:border-blue-500 transition-all text-center"
                          />
                        </div>

                        <div className="pt-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-between px-2">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Offset Global</span>
                            <span className="text-[11px] font-black text-slate-900 dark:text-white italic tracking-tighter">
                              {sel.reserva.codigo_completo}{formatarNumeracao(sel.numeracao_inicial, extrairPrefixo(sel.reserva.codigo_completo), setorNome)}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                          <div className="text-right flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cota Reservada</span>
                            <span className="text-[10px] font-black text-slate-500 font-mono italic">
                              {sel.sequencia_decrescente ? Math.max(sel.reserva.numero_inicial, sel.reserva.numero_final) : Math.min(sel.reserva.numero_inicial, sel.reserva.numero_final)} → {sel.sequencia_decrescente ? Math.min(sel.reserva.numero_inicial, sel.reserva.numero_final) : Math.max(sel.reserva.numero_inicial, sel.reserva.numero_final)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="p-10 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.05)]">
              <Button
                onClick={handleIniciar}
                disabled={!canStart}
                className="w-full h-20 bg-slate-950 dark:bg-white text-white dark:text-black rounded-[2rem] font-black uppercase text-sm tracking-[0.3em] shadow-[0_20px_40px_rgba(0,0,0,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_25px_50px_rgba(0,0,0,0.4)] active:scale-95 disabled:grayscale overflow-hidden relative group"
              >
                <div className="absolute inset-y-0 left-0 w-3 bg-blue-600 transition-all group-hover:w-full group-hover:opacity-10 group-disabled:hidden" />
                {isLoading ? (
                  <div className="w-7 h-7 border-4 border-slate-400 border-t-transparent rounded-full animate-spin mr-4" />
                ) : (
                  <Play className="w-6 h-6 mr-4 fill-current group-hover:animate-pulse" />
                )}
                Sincronizar Coleta Operativa
              </Button>
              <div className="mt-6 flex items-center justify-center gap-3 opacity-30 group">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] group-hover:scale-150 transition-transform" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Protocolo de Operação Ativo</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}