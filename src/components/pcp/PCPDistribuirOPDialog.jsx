// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, SlidersHorizontal, RefreshCw, Check, Calendar } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { usePCPSetor } from '@/components/pcp/PCPSetorGuard';
import { cn } from '@/lib/utils';
import { broadcastPCPInvalidate } from '@/lib/pcpTabSync';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getDiasNoMes(mes, ano) {
  return new Date(ano + 2000, mes, 0).getDate();
}

function getDiaSemana(ano, mes, dia) {
  return new Date(ano + 2000, mes - 1, dia).getDay();
}

function isWeekend(ano, mes, dia) {
  const d = getDiaSemana(ano, mes, dia);
  return d === 0 || d === 6;
}

export default function PCPDistribuirOPDialog({ op, mes, ano, producoes: producoesProp = [], onClose }) {
  const queryClient = useQueryClient();
  const { setorAtivo } = usePCPSetor();
  const totalDias = getDiasNoMes(mes, ano);
  const dias = Array.from({ length: totalDias }, (_, i) => i + 1);

  const diasUteis = useMemo(() => dias.filter(d => !isWeekend(ano, mes, d)), [dias, mes, ano]);

  // Busca as produções internas para garantir dados frescos para OPs recém-criadas
  const { data: producoesInternas = [], isLoading: loadingProducoes } = useQuery({
    queryKey: ['pcp-producoes-op', op.id, mes, ano],
    queryFn: () => rdsn.entities.PCPProducaoDiaria.filter({ op_id: op.id, mes, ano }, null, 500),
    enabled: !!op.id,
    // Não usa cache antigo — garante dados frescos
    staleTime: 0,
  });

  // Mescla: produções internas têm prioridade sobre a prop
  const producoes = producoesInternas.length > 0 ? producoesInternas : producoesProp.filter(p => p.op_id === op.id);

  const [valores, setValores] = useState(() => {
    const m = {};
    for (const d of dias) {
      const existing = producoesProp.find(p => p.op_id === op.id && p.dia === d);
      m[d] = existing?.previsto || 0;
    }
    return m;
  });

  // Re-inicializa valores quando as produções internas carregam (caso OP recém-criada)
  React.useEffect(() => {
    if (!loadingProducoes && producoesInternas.length >= 0) {
      setValores(prev => {
        const temValor = Object.values(prev).some(v => (v || 0) > 0);
        // Só re-inicializa se ainda não há valores definidos pelo usuário
        if (temValor) return prev;
        const m = { ...prev };
        for (const d of dias) {
          const existing = producoesInternas.find(p => p.dia === d);
          m[d] = existing?.previsto || 0;
        }
        return m;
      });
    }
  }, [producoesInternas, loadingProducoes]);

  const [modo, setModo] = useState('uniforme');
  const [diasSelecionados, setDiasSelecionados] = useState(() =>
    new Set(diasUteis)
  );

  const qtdTotal = op.quantidade_total || 0;
  const totalDistribuido = Object.values(valores).reduce((s, v) => s + (Number(v) || 0), 0);
  const diferenca = qtdTotal - totalDistribuido;

  const toggleDia = (dia) => {
    setDiasSelecionados(prev => {
      const novo = new Set(prev);
      if (novo.has(dia)) novo.delete(dia);
      else novo.add(dia);
      return novo;
    });
  };

  const distribuirAutomatico = () => {
    const selecionados = [...diasSelecionados].sort((a, b) => a - b);
    if (selecionados.length === 0) {
      toast.error('Selecione pelo menos um dia para distribuir');
      return;
    }

    const novos = { ...valores };
    for (const d of dias) novos[d] = 0;

    if (modo === 'uniforme') {
      const base = Math.floor(qtdTotal / selecionados.length);
      const resto = qtdTotal % selecionados.length;
      selecionados.forEach((d, i) => {
        novos[d] = base + (i < resto ? 1 : 0);
      });
    } else if (modo === 'crescente') {
      const n = selecionados.length;
      const pesos = selecionados.map((_, i) => i + 1);
      const somaPesos = pesos.reduce((s, p) => s + p, 0);
      let restante = qtdTotal;
      selecionados.forEach((d, i) => {
        const val = i === n - 1 ? restante : Math.round((pesos[i] / somaPesos) * qtdTotal);
        novos[d] = val;
        restante -= val;
      });
    }

    setValores(novos);
  };

  const { data: reservasOP = [] } = useQuery({
    queryKey: ['reservas-op-distribuir', op.codigo_produto, op.cliente_nome],
    queryFn: async () => {
      if (!op.codigo_produto) return [];
      const todas = await rdsn.entities.ReservaLote.filter({ codigo_produto: op.codigo_produto });
      return todas.filter(r => ['RESERVADO', 'EM_PRODUCAO'].includes(r.status));
    },
    enabled: !!op.codigo_produto
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const anoCompleto = 2000 + ano;
      const promises = [];
      for (const dia of dias) {
        const val = Number(valores[dia]) || 0;
        const existing = producoes.find(p => p.op_id === op.id && p.dia === dia);
        if (existing) {
          if (existing.previsto !== val) {
            promises.push(rdsn.entities.PCPProducaoDiaria.update(existing.id, { previsto: val }));
          }
        } else if (val > 0) {
          promises.push(rdsn.entities.PCPProducaoDiaria.create({
            op_id: op.id, mes, ano, dia, previsto: val, setor_id: setorAtivo || ''
          }));
        }
      }
      await Promise.all(promises);

      if (reservasOP.length > 0) {
        let diaMax = null;
        let valMax = 0;
        for (const d of dias) {
          const v = Number(valores[d]) || 0;
          if (v > valMax) { valMax = v; diaMax = d; }
        }

        if (diaMax) {
          const diasComValor = dias.filter(d => (Number(valores[d]) || 0) > 0);
          const reservasAgendamento = [...reservasOP];
          const agendPromises = [];

          if (reservasAgendamento.length === 1) {
            const dataAgendada = `${anoCompleto}-${String(mes).padStart(2, '0')}-${String(diaMax).padStart(2, '0')}`;
            agendPromises.push(
              rdsn.entities.ReservaLote.update(reservasAgendamento[0].id, { data_prevista: dataAgendada })
            );
          } else {
            const diasOrdenados = [...diasComValor].sort((a, b) => (Number(valores[b]) || 0) - (Number(valores[a]) || 0));
            reservasAgendamento.forEach((reserva, idx) => {
              const diaEscolhido = diasOrdenados[idx % diasOrdenados.length];
              const dataAgendada = `${anoCompleto}-${String(mes).padStart(2, '0')}-${String(diaEscolhido).padStart(2, '0')}`;
              agendPromises.push(
                rdsn.entities.ReservaLote.update(reserva.id, { data_prevista: dataAgendada })
              );
            });
          }
          await Promise.all(agendPromises);
        }
      }
    },
    onSuccess: () => {
      // Invalida queries localmente nesta aba
      queryClient.invalidateQueries({ queryKey: ['pcp-producoes'] });
      queryClient.invalidateQueries({ queryKey: ['pcp-producoes-op', op.id, mes, ano] });
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      queryClient.invalidateQueries({ queryKey: ['todasReservas'] });
      // ✨ Sincroniza produção em todas as outras abas abertas
      broadcastPCPInvalidate([
        ['pcp-producoes'],
        ['pcp-producoes-op', op.id, mes, ano],
        ['pcp-ops', mes, ano],
        ['reservas'],
        ['todasReservas'],
      ]);
      const qtdReservas = reservasOP.length;
      toast.success(`Distribuição salva! ${qtdReservas > 0 ? `${qtdReservas} reserva(s) agendada(s) automaticamente.` : ''}`);
      onClose();
    },
    onError: (e) => toast.error('Erro ao salvar: ' + e.message)
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl dark:bg-slate-900/90 dark:border-white/10 rounded-[2.5rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0 flex flex-col h-[90vh]">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <SlidersHorizontal className="w-6 h-6 text-indigo-200" />
              </span>
              Distribuir <span className="text-indigo-200">Volume</span>
            </DialogTitle>
            <p className="text-[10px] font-black text-indigo-100/60 uppercase tracking-[0.2em] mt-2 italic">
              Balanceamento de Carga • {op.codigo_op}
            </p>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-slate-300 dark:bg-slate-700" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 leading-none">Meta Contratada</span>
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                {qtdTotal.toLocaleString()} <span className="text-xs font-bold text-slate-400 italic">UN</span>
              </p>
            </div>

            <div className={cn(
              "p-6 rounded-3xl border-2 transition-all flex flex-col justify-center relative overflow-hidden",
              Math.abs(diferenca) < 1
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-amber-500/5 border-amber-500/20'
            )}>
              <div className={cn("absolute top-0 left-0 w-1 h-full", Math.abs(diferenca) < 1 ? "bg-emerald-500" : "bg-amber-500")} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 leading-none">Status da Alocação</span>
              <div className="flex items-center gap-3">
                <p className={cn(
                  "text-3xl font-black tracking-tighter",
                  Math.abs(diferenca) < 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                )}>
                  {totalDistribuido.toLocaleString()}
                </p>
                {diferenca !== 0 ? (
                  <Badge variant="outline" className="bg-white dark:bg-slate-950 text-[10px] font-black border-amber-200 dark:border-amber-500/20 text-amber-600 px-3 py-1">
                    {diferenca > 0 ? `-${diferenca}` : `+${Math.abs(diferenca)}`} FALTA
                  </Badge>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 animate-in zoom-in duration-300">
                    <Check className="w-5 h-5" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {reservasOP.length > 0 && (
            <div className="flex items-center gap-4 p-5 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-3xl animate-in slide-in-from-top-2 duration-300">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-blue-900 dark:text-blue-400 uppercase tracking-widest leading-none">Sincronismo Automático</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium italic">
                  <span className="font-black text-blue-600 dark:text-blue-300">{reservasOP.length} reserva(s)</span> do PCP serão re-agendadas conforme esta cobertura.
                </p>
              </div>
            </div>
          )}

          <div className="bg-slate-900/[0.03] dark:bg-white/[0.03] rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-8 backdrop-blur-sm relative overflow-hidden group/intel">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mr-24 -mt-24 group-hover/intel:bg-indigo-500/20 transition-all duration-700" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-200">Assistente de Distribuição</span>
              </div>
              <div className="flex gap-1.5 p-1.5 bg-white/50 dark:bg-black/20 rounded-xl border border-white dark:border-white/5 shadow-sm">
                <button className="text-[9px] font-black text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 uppercase tracking-widest transition-all px-3 py-1 rounded-md" onClick={() => setDiasSelecionados(new Set(diasUteis))}>Úteis</button>
                <div className="w-px h-4 bg-slate-200 dark:bg-white/10 self-center" />
                <button className="text-[9px] font-black text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 uppercase tracking-widest transition-all px-3 py-1 rounded-md" onClick={() => setDiasSelecionados(new Set(dias))}>Todos</button>
                <div className="w-px h-4 bg-slate-200 dark:bg-white/10 self-center" />
                <button className="text-[9px] font-black text-slate-500 dark:text-slate-400 hover:text-red-500 uppercase tracking-widest transition-all px-3 py-1 rounded-md" onClick={() => setDiasSelecionados(new Set())}>Reset</button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-4 space-y-3">
                <Label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-1">Modelo Matemático</Label>
                <Select value={modo} onValueChange={setModo}>
                  <SelectTrigger className="h-14 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest px-6 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-white/10 rounded-2xl">
                    <SelectItem value="uniforme" className="font-black uppercase text-[10px] tracking-widest focus:bg-indigo-500/10">Equitativa (Flat)</SelectItem>
                    <SelectItem value="crescente" className="font-black uppercase text-[10px] tracking-widest focus:bg-indigo-500/10">Progressiva (Ramp)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[9px] text-slate-400 italic px-1">
                  * {modo === 'uniforme' ? 'Distribui unidades de forma igualitária entre os dias.' : 'Aumenta a carga progressivamente até o fim do período.'}
                </p>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="flex flex-wrap gap-2 justify-center">
                  {dias.map(dia => {
                    const wknd = isWeekend(ano, mes, dia);
                    const sel = diasSelecionados.has(dia);
                    return (
                      <button
                        key={dia}
                        onClick={() => toggleDia(dia)}
                        className={cn(
                          "w-10 h-10 rounded-xl text-xs font-black border transition-all transform hover:scale-110 active:scale-90 flex items-center justify-center relative overflow-hidden",
                          sel
                            ? wknd
                              ? 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/30'
                              : 'bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-500/30'
                            : 'bg-white dark:bg-white/5 text-slate-300 dark:text-slate-700 border-slate-100 dark:border-white/5 opacity-50 grayscale'
                        )}
                      >
                        {dia}
                        {wknd && !sel && <div className="absolute top-0 right-0 w-2 h-2 bg-slate-200 dark:bg-slate-800 rounded-bl-sm" />}
                      </button>
                    );
                  })}
                </div>
                <Button
                  onClick={distribuirAutomatico}
                  className="w-full gap-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] h-14 shadow-xl shadow-indigo-600/20 border-0 transition-all active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  Efetuar Cálculo de Malha
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 px-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Micro-ajustes da Agenda</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-3 max-h-[40vh] overflow-y-auto p-2 custom-scrollbar">
              {dias.map(dia => {
                const wknd = isWeekend(ano, mes, dia);
                const diaSem = DIAS_SEMANA[getDiaSemana(ano, mes, dia)];
                const hasValue = (valores[dia] || 0) > 0;
                return (
                  <div
                    key={dia}
                    className={cn(
                      "flex flex-col items-center p-3 rounded-2xl border-2 transition-all relative group/cell",
                      hasValue
                        ? 'bg-white dark:bg-white/5 border-indigo-500/30 dark:border-indigo-500/40 shadow-sm'
                        : wknd
                          ? 'bg-slate-50/50 dark:bg-black/20 border-slate-100 dark:border-white/5 opacity-60'
                          : 'bg-white dark:bg-transparent border-slate-100 dark:border-white/5'
                    )}
                  >
                    <span className="text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase mb-1 tracking-tighter">{diaSem}</span>
                    <span className={cn(
                      "text-sm font-black mb-2 transition-colors",
                      hasValue ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-700'
                    )}>{dia}</span>
                    <Input
                      type="number"
                      min="0"
                      value={valores[dia] || ''}
                      onChange={e => setValores(prev => ({ ...prev, [dia]: Number(e.target.value) || 0 }))}
                      className="h-10 text-center text-sm font-black bg-slate-50 dark:bg-white/5 border-0 focus-visible:ring-2 focus-visible:ring-indigo-500/20 rounded-xl p-0 dark:text-white"
                      placeholder="0"
                    />
                    {hasValue && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center text-[8px] text-white font-black shadow-sm shadow-indigo-500/20">
                        !
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-8 pt-6 border-t dark:border-white/5 flex gap-4 mt-auto">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-16 border-slate-200 dark:border-white/10 dark:hover:bg-white/5 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] transition-all"
          >
            Descartar
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || Math.abs(diferenca) > 0}
            className={cn(
              "flex-[1.8] gap-3 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] h-16 shadow-2xl transition-all border-0",
              diferenca === 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
            )}
          >
            {saveMutation.isPending ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            Consolidar Grade
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
