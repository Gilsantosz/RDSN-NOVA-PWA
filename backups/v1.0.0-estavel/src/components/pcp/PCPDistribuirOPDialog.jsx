import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, SlidersHorizontal, RefreshCw, Check, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { usePCPSetor } from '@/components/pcp/PCPSetorGuard';

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

export default function PCPDistribuirOPDialog({ op, mes, ano, producoes, onClose }) {
  const queryClient = useQueryClient();
  const { setorAtivo } = usePCPSetor();
  const totalDias = getDiasNoMes(mes, ano);
  const dias = Array.from({ length: totalDias }, (_, i) => i + 1);

  const diasUteis = useMemo(() => dias.filter(d => !isWeekend(ano, mes, d)), [dias, mes, ano]);

  // Estado inicial: pegar previstos já salvos
  const [valores, setValores] = useState(() => {
    const m = {};
    for (const d of dias) {
      const existing = producoes.find(p => p.op_id === op.id && p.dia === d);
      m[d] = existing?.previsto || 0;
    }
    return m;
  });

  const [modo, setModo] = useState('uniforme'); // uniforme | crescente | manual
  const [diasSelecionados, setDiasSelecionados] = useState(() =>
    new Set(diasUteis) // padrão: dias úteis
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
    // Zerar todos primeiro
    for (const d of dias) novos[d] = 0;

    if (modo === 'uniforme') {
      const base = Math.floor(qtdTotal / selecionados.length);
      const resto = qtdTotal % selecionados.length;
      selecionados.forEach((d, i) => {
        novos[d] = base + (i < resto ? 1 : 0);
      });
    } else if (modo === 'crescente') {
      // Distribuição crescente: dias no final recebem mais
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

  // Buscar reservas do cliente vinculado a esta OP (pelo codigo_produto)
  const { data: reservasOP = [] } = useQuery({
    queryKey: ['reservas-op-distribuir', op.codigo_produto, op.cliente_nome],
    queryFn: async () => {
      if (!op.codigo_produto) return [];
      const todas = await base44.entities.ReservaLote.filter({ codigo_produto: op.codigo_produto });
      return todas.filter(r => ['RESERVADO', 'EM_PRODUCAO'].includes(r.status));
    },
    enabled: !!op.codigo_produto
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const anoCompleto = 2000 + ano;

      // 1. Salvar produção diária (PCPProducaoDiaria)
      const promises = [];
      for (const dia of dias) {
        const val = Number(valores[dia]) || 0;
        const existing = producoes.find(p => p.op_id === op.id && p.dia === dia);
        if (existing) {
          if (existing.previsto !== val) {
            promises.push(base44.entities.PCPProducaoDiaria.update(existing.id, { previsto: val }));
          }
        } else if (val > 0) {
          promises.push(base44.entities.PCPProducaoDiaria.create({
            op_id: op.id, mes, ano, dia, previsto: val, setor_id: setorAtivo || ''
          }));
        }
      }
      await Promise.all(promises);

      // 2. Agendar reservas automaticamente com base na distribuição
      // Encontra o dia com maior quantidade prevista (principal dia de produção)
      if (reservasOP.length > 0) {
        // Encontra o dia com maior previsto
        let diaMax = null;
        let valMax = 0;
        for (const d of dias) {
          const v = Number(valores[d]) || 0;
          if (v > valMax) { valMax = v; diaMax = d; }
        }

        if (diaMax) {
          // Distribui as reservas pelos dias com quantidade prevista, proporcionalmente
          const diasComValor = dias.filter(d => (Number(valores[d]) || 0) > 0);
          const totalDistribuido = diasComValor.reduce((s, d) => s + (Number(valores[d]) || 0), 0);

          // Se há mais de uma reserva, distribui pelos dias com maior previsto
          // Se há só uma reserva, agenda no dia de maior previsto
          const reservasAgendamento = [...reservasOP];
          const agendPromises = [];

          if (reservasAgendamento.length === 1) {
            // Uma reserva → dia com maior previsto
            const dataAgendada = `${anoCompleto}-${String(mes).padStart(2, '0')}-${String(diaMax).padStart(2, '0')}`;
            agendPromises.push(
              base44.entities.ReservaLote.update(reservasAgendamento[0].id, { data_prevista: dataAgendada })
            );
          } else {
            // Múltiplas reservas → distribui pelos dias com previsto, ordenado por quantidade decrescente
            const diasOrdenados = [...diasComValor].sort((a, b) => (Number(valores[b]) || 0) - (Number(valores[a]) || 0));
            reservasAgendamento.forEach((reserva, idx) => {
              const diaEscolhido = diasOrdenados[idx % diasOrdenados.length];
              const dataAgendada = `${anoCompleto}-${String(mes).padStart(2, '0')}-${String(diaEscolhido).padStart(2, '0')}`;
              agendPromises.push(
                base44.entities.ReservaLote.update(reserva.id, { data_prevista: dataAgendada })
              );
            });
          }

          await Promise.all(agendPromises);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcp-producoes'] });
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      queryClient.invalidateQueries({ queryKey: ['todasReservas'] });
      const qtdReservas = reservasOP.length;
      toast.success(`Distribuição salva! ${qtdReservas > 0 ? `${qtdReservas} reserva(s) agendada(s) automaticamente.` : ''}`);
      onClose();
    },
    onError: (e) => toast.error('Erro ao salvar: ' + e.message)
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-blue-600" />
            Distribuir Quantidade — {op.codigo_op}
          </DialogTitle>
        </DialogHeader>

        {/* Info OP */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Total: {qtdTotal.toLocaleString()} un.
          </Badge>
          <Badge variant="outline" className={`${Math.abs(diferenca) < 5 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            Distribuído: {totalDistribuido.toLocaleString()} un.
            {diferenca !== 0 && ` (${diferenca > 0 ? '-' : '+'}${Math.abs(diferenca)} restante)`}
          </Badge>
        </div>

        {/* Info reservas que serão agendadas */}
        {reservasOP.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-2">
            <Calendar className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              <span className="font-semibold">{reservasOP.length} reserva(s)</span> vinculada(s) a esta OP serão <span className="font-semibold">agendadas automaticamente</span> na página de Agendamentos com base na distribuição definida.
            </p>
          </div>
        )}

        {/* Painel automático */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-4">
          <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Distribuição Automática
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs text-slate-500 mb-1 block">Modo</label>
              <Select value={modo} onValueChange={setModo}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uniforme">Uniforme (igual todos os dias)</SelectItem>
                  <SelectItem value="crescente">Crescente (mais no fim do mês)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={distribuirAutomatico} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4" />
              Calcular
            </Button>
          </div>

          {/* Seletor de dias */}
          <div className="mt-3">
            <p className="text-xs text-slate-500 mb-2">Dias selecionados para distribuição (clique para incluir/excluir):</p>
            <div className="flex flex-wrap gap-1">
              {dias.map(dia => {
                const wknd = isWeekend(ano, mes, dia);
                const sel = diasSelecionados.has(dia);
                return (
                  <button
                    key={dia}
                    onClick={() => toggleDia(dia)}
                    className={`w-8 h-8 rounded text-xs font-medium border transition-all ${
                      sel
                        ? wknd
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-blue-600 text-white border-blue-700'
                        : 'bg-white text-slate-400 border-slate-200 line-through'
                    }`}
                    title={`${dia} - ${DIAS_SEMANA[getDiaSemana(ano, mes, dia)]}`}
                  >
                    {dia}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 mt-2 text-xs text-slate-500">
              <button className="underline" onClick={() => setDiasSelecionados(new Set(diasUteis))}>Só dias úteis</button>
              <button className="underline" onClick={() => setDiasSelecionados(new Set(dias))}>Todos os dias</button>
              <button className="underline" onClick={() => setDiasSelecionados(new Set())}>Nenhum</button>
            </div>
          </div>
        </div>

        {/* Edição manual por dia */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            Edição Manual por Dia
          </p>
          <div className="grid grid-cols-7 gap-1">
            {dias.map(dia => {
              const wknd = isWeekend(ano, mes, dia);
              const diaSem = DIAS_SEMANA[getDiaSemana(ano, mes, dia)];
              return (
                <div key={dia} className={`flex flex-col items-center p-1.5 rounded-lg border ${wknd ? 'bg-slate-100 border-slate-200' : 'bg-white border-slate-200'}`}>
                  <span className="text-[10px] text-slate-400 font-medium">{diaSem}</span>
                  <span className="text-xs font-bold text-slate-700">{dia}</span>
                  <Input
                    type="number"
                    min="0"
                    value={valores[dia] || ''}
                    onChange={e => setValores(prev => ({ ...prev, [dia]: Number(e.target.value) || 0 }))}
                    className={`mt-1 h-7 text-center text-xs p-0.5 ${wknd ? 'bg-slate-50' : ''} ${valores[dia] > 0 ? 'border-blue-300 text-blue-700 font-semibold' : ''}`}
                    placeholder="0"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <div className="flex-1 text-sm text-slate-500">
            {totalDistribuido > 0 && (
              <span className={diferenca === 0 ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                {diferenca === 0 ? '✓ Distribuição completa' : `Faltam ${Math.abs(diferenca)} un. para completar o total`}
              </span>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-2 bg-slate-900 hover:bg-slate-800"
          >
            <Check className="w-4 h-4" />
            Salvar Distribuição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}