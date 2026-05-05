import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, ChevronDown, ChevronUp, X, Package } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { broadcastPCPInvalidate } from '@/lib/pcpTabSync';

/**
 * Componente que detecta OPs do mês anterior ainda não concluídas
 * e oferece importá-las como "Atraso" no mês atual.
 */
export default function PCPAtrasosAlert({ mesAtual, anoAtual, opsAtual, opsAnterior, producoesMesAnterior, onRegularizado, setorAtivo }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  // Persiste o estado de descartado por mês/ano no localStorage
  // assim um reload não reapresenta o alerta de um mês que o usuário já descartou
  const dismissKey = `pcp-atraso-dismissed-${mesAtual}-${anoAtual}`;
  const [dismissed, setDismissedState] = useState(() => {
    try { return localStorage.getItem(dismissKey) === '1'; } catch { return false; }
  });
  const setDismissed = (val) => {
    setDismissedState(val);
    try { if (val) localStorage.setItem(dismissKey, '1'); else localStorage.removeItem(dismissKey); } catch {}
  };

  // Buscar baixas do mês anterior agrupadas por codigo_produto das OPs
  const mesAnt = mesAtual === 1 ? 12 : mesAtual - 1;
  const anoAnt = mesAtual === 1 ? anoAtual - 1 : anoAtual;
  const anoCompletoAnt = 2000 + anoAnt;
  const inicioMesAnt = new Date(anoCompletoAnt, mesAnt - 1, 1).toISOString();
  const fimMesAnt = new Date(anoCompletoAnt, mesAnt, 0, 23, 59, 59).toISOString();

  const getCodigoOP = (op) => (op.codigo_produto && op.codigo_produto.trim()) || op.codigo_op;

  const codigosProdutoAnt = React.useMemo(() =>
    [...new Set((opsAnterior || []).map(getCodigoOP).filter(Boolean))],
    [opsAnterior]
  );

  // ── Busca TODAS as OPs de Atraso do mês atual SEM filtro de setor ──────────
  // Necessário para evitar duplicatas quando a OP foi criada sem setor_id
  const { data: opsAtualTodas = [] } = useQuery({
    queryKey: ['pcp-ops-atraso-sem-setor', mesAtual, anoAtual],
    queryFn: () => rdsn.entities.PCPOrdemProducao.filter(
      { mes: mesAtual, ano: anoAtual, tipo: 'Atraso', status: 'Ativo' }, null, 500
    ),
    staleTime: 0,
  });

  // Buscar reservas dos produtos anteriores para achar baixas reais
  const { data: reservasAnt = [], isLoading: isLoadingReservas } = useQuery({
    queryKey: ['reservas-pcp-atraso', codigosProdutoAnt.join(',')],
    queryFn: async () => {
      if (!codigosProdutoAnt.length) return [];
      const all = await Promise.all(codigosProdutoAnt.map(cod =>
        rdsn.entities.ReservaLote.filter({ codigo_produto: cod }, null, 500)
      ));
      return all.flat();
    },
    enabled: codigosProdutoAnt.length > 0
  });

  // Baixas do mês anterior agrupadas por reserva_id
  const reservaIdsAnt = reservasAnt.map(r => r.id);
  const { data: baixasAnt = [], isLoading: isLoadingBaixas } = useQuery({
    queryKey: ['baixas-pcp-atraso', reservaIdsAnt.join(',')],
    queryFn: async () => {
      if (!reservaIdsAnt.length) return [];
      const all = await Promise.all(reservaIdsAnt.map(id =>
        rdsn.entities.BaixaLote.filter({ reserva_id: id }, null, 500)
      ));
      return all.flat().filter(b =>
        !b.created_at || (b.created_at >= inicioMesAnt && b.created_at <= fimMesAnt)
      );
    },
    enabled: reservaIdsAnt.length > 0
  });

  // TRUE enquanto as baixas ainda não chegaram → impede regularizar com quantidade errada
  const isBaixasLoading = isLoadingReservas || (reservaIdsAnt.length > 0 && isLoadingBaixas);

  // Calcular total baixado por codigo_produto no mês anterior
  const baixadoPorCodigo = React.useMemo(() => {
    const m = {};
    for (const baixa of baixasAnt) {
      const reserva = reservasAnt.find(r => r.id === baixa.reserva_id);
      if (!reserva?.codigo_produto) continue;
      m[reserva.codigo_produto] = (m[reserva.codigo_produto] || 0) + (baixa.quantidade || 0);
    }
    return m;
  }, [baixasAnt, reservasAnt]);

  // Calcular realizado por op_id (PCPProducaoDiaria)
  const realizadoPorOp = React.useMemo(() => {
    const m = {};
    for (const p of (producoesMesAnterior || [])) {
      m[p.op_id] = (m[p.op_id] || 0) + (p.realizado || 0);
    }
    return m;
  }, [producoesMesAnterior]);

  // Detectar OPs do mês anterior que não foram concluídas
  const opsAtrasadas = React.useMemo(() => {
    if (!opsAnterior || !opsAnterior.length) return [];
    return opsAnterior.filter(op => {
      if (op.status !== 'Ativo') return false;
      const qtdTotal = op.quantidade_total || 0;
      if (qtdTotal === 0) return false;

      // ─── Verificar se já foi regularizada (usa lista SEM filtro de setor) ──
      // Importante: opsAtual filtra por setor_id, então pode não achar OPs criadas
      // sem setor (bug anterior). opsAtualTodas não tem esse filtro.
      const fonteVerificacao = opsAtualTodas.length > 0 ? opsAtualTodas : (opsAtual || []);

      // 1. Pelo campo mes_origem/ano_origem + codigo_produto (sinal canônico)
      const jaRegularizadaPorOrigem = fonteVerificacao.some(o =>
        o.tipo === 'Atraso' &&
        Number(o.mes_origem) === Number(mesAnt) &&
        Number(o.ano_origem) === Number(anoAnt) &&
        (o.codigo_op === op.codigo_op || o.codigo_produto === op.codigo_produto)
      );
      if (jaRegularizadaPorOrigem) return false;

      // 2. Fallback: pelo codigo_op direto
      const jaExistePorCodigo = fonteVerificacao.some(o =>
        o.tipo === 'Atraso' && o.codigo_op === op.codigo_op
      );
      if (jaExistePorCodigo) return false;

      // ─── Verificar saldo pendente ─────────────────────────────────────────
      const codigoMatch = getCodigoOP(op);
      const realizadoReal = codigoMatch
        ? (baixadoPorCodigo[codigoMatch] || 0)
        : (realizadoPorOp[op.id] || 0);
        
      return realizadoReal < qtdTotal;
    });
  }, [opsAnterior, opsAtual, baixadoPorCodigo, realizadoPorOp]);


  // Estado de edição local
  const [editValues, setEditValues] = useState({});

  // Recalcula editValues SEMPRE que baixas ou opsAtrasadas mudam
  // (sem o "if (m[op.id]) return" que impedia atualização quando baixas chegavam depois)
  React.useEffect(() => {
    if (!opsAtrasadas.length) return;
    setEditValues(prev => {
      const m = { ...prev };
      let changed = false;
      opsAtrasadas.forEach(op => {
        const codigoMatch = getCodigoOP(op);
        const realizadoReal = codigoMatch
          ? (baixadoPorCodigo[codigoMatch] || 0)
          : (realizadoPorOp[op.id] || 0);

        const qtdTotal = op.quantidade_total || 0;
        const saldo = Math.max(0, qtdTotal - realizadoReal);
        // Usa saldo se >0, senão quantidade total (nunca 0)
        const qtdFinal = saldo > 0 ? saldo : qtdTotal;

        // Só preserva o valor editado manualmente pelo usuário se a entrada já existia
        // E só se o realizadoReal ainda era 0 (baixas não tinham chegado) — reavalia
        const jaExistia = !!prev[op.id];
        const eraCalculoSemBaixas = jaExistia && prev[op.id]?.quantidade_total === qtdTotal && realizadoReal > 0;

        if (!jaExistia || eraCalculoSemBaixas) {
          changed = true;
          m[op.id] = {
            ...(prev[op.id] || {}),
            codigo_op: op.codigo_op,
            descricao: op.descricao || '',
            cliente_nome: op.cliente_nome || '',
            codigo_produto: op.codigo_produto || '',
            quantidade_total: qtdFinal,
            item_num: op.item_num || '',
            selected: prev[op.id]?.selected !== false, // mantém seleção do usuário
          };
        }
      });
      return changed ? m : prev;
    });
  }, [opsAtrasadas, baixadoPorCodigo, realizadoPorOp]);

  const importMutation = useMutation({
    mutationFn: async () => {
      const toImport = opsAtrasadas.filter(op => editValues[op.id]?.selected);
      const created = await Promise.all(toImport.map(op => {
        const ev = editValues[op.id];
        return rdsn.entities.PCPOrdemProducao.create({
          codigo_op: ev.codigo_op,
          descricao: ev.descricao,
          cliente_id: op.cliente_id,
          cliente_nome: ev.cliente_nome,
          codigo_produto: ev.codigo_produto || op.codigo_produto || '',
          quantidade_total: Number(ev.quantidade_total) || 0,
          item_num: Number(ev.item_num) || undefined,
          tipo: 'Atraso',
          status: 'Ativo',
          mes: mesAtual,
          ano: anoAtual,
          mes_origem: op.mes_origem || mesAnt,
          ano_origem: op.ano_origem || anoAnt,
          // ← setor_id é CRÍTICO: sem ele, a query que filtra por setor nunca acha a OP
          setor_id: setorAtivo && setorAtivo !== 'ALL' ? setorAtivo : (op.setor_id || null),
        });
      }));
      return created;
    },
    onSuccess: (created) => {
      // Invalida queries nesta aba
      qc.invalidateQueries({ queryKey: ['pcp-ops', mesAtual, anoAtual, setorAtivo] });
      qc.invalidateQueries({ queryKey: ['pcp-ops', mesAtual, anoAtual] });
      qc.invalidateQueries({ queryKey: ['pcp-ops-atraso-sem-setor', mesAtual, anoAtual] });
      // ✨ Sincroniza todas as outras abas abertas na mesma página
      broadcastPCPInvalidate([
        ['pcp-ops', mesAtual, anoAtual, setorAtivo],
        ['pcp-ops', mesAtual, anoAtual],
        ['pcp-ops-atraso-sem-setor', mesAtual, anoAtual],
      ]);
      const mesesNome = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      toast.success(
        `✅ ${created.length} OP(s) realocada(s) para ${mesesNome[mesAtual-1]}/${anoAtual} como Atraso Produtivo (origem: ${mesesNome[mesAnt-1]}/${anoAnt}). Distribua a produção diária em cada OP.`,
        { duration: 6000 }
      );
      if (onRegularizado && created.length > 0) {
        setTimeout(() => onRegularizado(created), 600);
      }
    },
    onError: e => toast.error('Erro ao importar: ' + e.message),
  });

  if (dismissed || opsAtrasadas.length === 0) return null;

  // Conta apenas OPs na lista atual (ignora entradas antigas no editValues)
  const selectedCount = opsAtrasadas.filter(op => editValues[op.id]?.selected).length;

  return (
    <div className="mb-6 rounded-[2rem] border border-amber-200/50 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 backdrop-blur-xl shadow-xl overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-top-4">
      {/* Header */}
      <div
        className="flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-amber-100/80 to-transparent dark:from-amber-900/30 dark:to-transparent cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/20 shadow-inner">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-black text-amber-900 dark:text-amber-200 uppercase tracking-tight italic">
            {opsAtrasadas.length} OP{opsAtrasadas.length > 1 ? 's' : ''} em Atraso Identificada{opsAtrasadas.length > 1 ? 's' : ''}
          </p>
          <p className="text-[10px] font-bold text-amber-700/70 dark:text-amber-400/60 uppercase tracking-widest">Procedência: Mês {mesAnt}/{anoAnt} • Solicitação de Regularização</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); setDismissed(true); }}
            className="p-2 rounded-lg hover:bg-amber-200/50 dark:hover:bg-amber-500/10 text-amber-500 transition-colors"
            title="Ignorar"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="p-2 rounded-lg bg-amber-200/30 dark:bg-amber-500/10">
            {expanded ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
          </div>
        </div>
      </div>

      {/* Lista editável */}
      {expanded && (
        <div className="p-6 pt-2 space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-amber-200/30 dark:border-amber-500/10 bg-white/50 dark:bg-black/20">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-amber-100/50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-300">
                  <th className="px-4 py-3 text-center w-10">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-amber-600 cursor-pointer"
                      checked={selectedCount === opsAtrasadas.length && opsAtrasadas.length > 0}
                      onChange={e => {
                        setEditValues(prev => {
                          const n = { ...prev };
                          Object.keys(n).forEach(k => { n[k] = { ...n[k], selected: e.target.checked }; });
                          return n;
                        });
                      }}
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-[9px]">Identificador</th>
                  <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-[9px]">Especificação Técnica</th>
                  <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-[9px]">Entidade / Cliente</th>
                  <th className="px-4 py-3 text-center font-black uppercase tracking-widest text-[9px]">Saldo Residual</th>
                  <th className="px-4 py-3 text-center font-black uppercase tracking-widest text-[9px]">Item #</th>
                </tr>
              </thead>
              <tbody>
                {opsAtrasadas.map(op => {
                  const ev = editValues[op.id] || {};
                  const realizadoReal = op.codigo_produto
                    ? (baixadoPorCodigo[op.codigo_produto] || 0)
                    : (realizadoPorOp[op.id] || 0);
                  const qtdOrig = op.quantidade_total || 0;

                  return (
                    <tr key={op.id} className={cn(
                      "border-t border-amber-200/30 dark:border-amber-500/10 transition-colors",
                      ev.selected ? "bg-amber-500/5 dark:bg-amber-500/5" : "opacity-40 grayscale"
                    )}>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-amber-600 cursor-pointer"
                          checked={!!ev.selected}
                          onChange={e => setEditValues(prev => ({ ...prev, [op.id]: { ...prev[op.id], selected: e.target.checked } }))}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={ev.codigo_op || ''}
                          onChange={e => setEditValues(prev => ({ ...prev, [op.id]: { ...prev[op.id], codigo_op: e.target.value } }))}
                          className="h-8 text-xs font-mono font-bold bg-white dark:bg-slate-900 border-amber-200/50 dark:border-amber-500/20"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={ev.descricao || ''}
                          onChange={e => setEditValues(prev => ({ ...prev, [op.id]: { ...prev[op.id], descricao: e.target.value } }))}
                          className="h-8 text-xs bg-white dark:bg-slate-900 border-amber-200/50 dark:border-amber-500/20"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={ev.cliente_nome || ''}
                          onChange={e => setEditValues(prev => ({ ...prev, [op.id]: { ...prev[op.id], cliente_nome: e.target.value } }))}
                          className="h-8 text-xs bg-white dark:bg-slate-900 border-amber-200/50 dark:border-amber-500/20"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Input
                            type="number"
                            value={ev.quantidade_total || ''}
                            onChange={e => setEditValues(prev => ({ ...prev, [op.id]: { ...prev[op.id], quantidade_total: e.target.value } }))}
                            className="h-8 text-xs text-center w-24 font-black bg-white dark:bg-slate-900 border-amber-200/50 dark:border-amber-500/20"
                          />
                          <Badge variant="outline" className="text-[8px] font-black border-amber-500/20 text-amber-600 dark:text-amber-400">
                            {realizadoReal}/{qtdOrig} REALIZADO
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Input
                          type="number"
                          value={ev.item_num || ''}
                          onChange={e => setEditValues(prev => ({ ...prev, [op.id]: { ...prev[op.id], item_num: e.target.value } }))}
                          className="h-8 text-xs text-center w-16 bg-white dark:bg-slate-900 border-amber-200/50 dark:border-amber-500/20"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-700 dark:text-amber-400 italic">
                {selectedCount} de {opsAtrasadas.length} Registro{opsAtrasadas.length > 1 ? 's' : ''} Selecionado{opsAtrasadas.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDismissed(true)}
                className="h-10 rounded-xl border-amber-200 dark:border-amber-500/20 bg-transparent text-amber-700 dark:text-amber-400 font-black uppercase text-[10px] tracking-widest"
              >
                Descartar Alerta
              </Button>
              <Button
                size="sm"
                onClick={() => importMutation.mutate()}
                disabled={selectedCount === 0 || importMutation.isPending || isBaixasLoading}
                className="h-10 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-amber-600/20 border-0"
              >
                {importMutation.isPending ? (
                  <>Sincronizando...</>
                ) : isBaixasLoading ? (
                  <>Calculando saldo...</>
                ) : (
                  <>
                    <Package className="w-3.5 h-3.5" />
                    Regularizar {selectedCount} OP{selectedCount > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}