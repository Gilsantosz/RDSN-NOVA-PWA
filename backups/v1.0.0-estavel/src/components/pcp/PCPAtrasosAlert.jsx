import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, ChevronDown, ChevronUp, X, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Componente que detecta OPs do mês anterior ainda não concluídas
 * e oferece importá-las como "Atraso" no mês atual.
 * 
 * Props:
 *   mesAtual, anoAtual  — mês/ano atual (números)
 *   opsAtual            — OPs já existentes no mês atual
 */
export default function PCPAtrasosAlert({ mesAtual, anoAtual, opsAtual, opsAnterior, producoesMesAnterior }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  // Buscar baixas do mês anterior agrupadas por codigo_produto das OPs
  const mesAnt = mesAtual === 1 ? 12 : mesAtual - 1;
  const anoAnt = mesAtual === 1 ? anoAtual - 1 : anoAtual;
  const anoCompletoAnt = 2000 + anoAnt;
  const inicioMesAnt = new Date(anoCompletoAnt, mesAnt - 1, 1).toISOString();
  const fimMesAnt = new Date(anoCompletoAnt, mesAnt, 0, 23, 59, 59).toISOString();

  const codigosProdutoAnt = React.useMemo(() =>
    [...new Set((opsAnterior || []).map(o => o.codigo_produto).filter(Boolean))],
    [opsAnterior]
  );

  // Buscar reservas dos produtos anteriores para achar baixas reais
  const { data: reservasAnt = [] } = useQuery({
    queryKey: ['reservas-pcp-atraso', codigosProdutoAnt.join(',')],
    queryFn: async () => {
      if (!codigosProdutoAnt.length) return [];
      const all = await Promise.all(codigosProdutoAnt.map(cod =>
        base44.entities.ReservaLote.filter({ codigo_produto: cod }, null, 500)
      ));
      return all.flat();
    },
    enabled: codigosProdutoAnt.length > 0
  });

  // Indexar reservas por codigo_produto
  const reservasPorCodigo = React.useMemo(() => {
    const m = {};
    reservasAnt.forEach(r => {
      if (!m[r.codigo_produto]) m[r.codigo_produto] = [];
      m[r.codigo_produto].push(r);
    });
    return m;
  }, [reservasAnt]);

  // Baixas do mês anterior agrupadas por reserva_id
  const reservaIdsAnt = reservasAnt.map(r => r.id);
  const { data: baixasAnt = [] } = useQuery({
    queryKey: ['baixas-pcp-atraso', reservaIdsAnt.join(',')],
    queryFn: async () => {
      if (!reservaIdsAnt.length) return [];
      const all = await Promise.all(reservaIdsAnt.map(id =>
        base44.entities.BaixaLote.filter({ reserva_id: id }, null, 500)
      ));
      return all.flat().filter(b =>
        !b.created_at || (b.created_at >= inicioMesAnt && b.created_at <= fimMesAnt)
      );
    },
    enabled: reservaIdsAnt.length > 0
  });

  // Calcular total baixado por codigo_produto no mês anterior (via BaixaLote real)
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
    for (const p of producoesMesAnterior) {
      m[p.op_id] = (m[p.op_id] || 0) + (p.realizado || 0);
    }
    return m;
  }, [producoesMesAnterior]);

  // Detectar OPs do mês anterior que não foram concluídas
  const opsAtrasadas = React.useMemo(() => {
    if (!opsAnterior || !opsAnterior.length) return [];
    return opsAnterior.filter(op => {
      if (op.status !== 'Ativo') return false;
      if (op.tipo === 'Atraso') return false;
      const jaExiste = opsAtual.some(o => o.codigo_op === op.codigo_op && o.tipo === 'Atraso');
      if (jaExiste) return false;
      const qtdTotal = op.quantidade_total || 0;
      if (qtdTotal === 0) return false;
      // Priorizar o realizado via BaixaLote real; fallback para PCPProducaoDiaria
      const realizadoReal = op.codigo_produto
        ? (baixadoPorCodigo[op.codigo_produto] || 0)
        : (realizadoPorOp[op.id] || 0);
      return realizadoReal < qtdTotal;
    });
  }, [opsAnterior, opsAtual, baixadoPorCodigo, realizadoPorOp]);

  // Estado de edição local para cada OP sugerida
  const [editValues, setEditValues] = useState({});

  // Inicializar/atualizar editValues quando opsAtrasadas mudar
  React.useEffect(() => {
    if (!opsAtrasadas.length) return;
    setEditValues(prev => {
      const m = { ...prev };
      opsAtrasadas.forEach(op => {
        if (m[op.id]) return; // já inicializado
        const realizadoReal = op.codigo_produto
          ? (baixadoPorCodigo[op.codigo_produto] || 0)
          : (realizadoPorOp[op.id] || 0);
        const saldo = (op.quantidade_total || 0) - realizadoReal;
        m[op.id] = {
          codigo_op: op.codigo_op,
          descricao: op.descricao || '',
          cliente_nome: op.cliente_nome || '',
          codigo_produto: op.codigo_produto || '',
          quantidade_total: saldo > 0 ? saldo : op.quantidade_total || 0,
          item_num: op.item_num || '',
          selected: true,
        };
      });
      return m;
    });
  }, [opsAtrasadas.length, baixadoPorCodigo, realizadoPorOp]);

  const importMutation = useMutation({
    mutationFn: async () => {
      const toImport = opsAtrasadas.filter(op => editValues[op.id]?.selected);
      await Promise.all(toImport.map(op => {
        const ev = editValues[op.id];
        return base44.entities.PCPOrdemProducao.create({
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
          mes_origem: mesAnt,
          ano_origem: anoAnt,
        });
      }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pcp-ops', mesAtual, anoAtual] });
      toast.success('OPs em atraso importadas com sucesso!');
      setDismissed(true);
    },
    onError: e => toast.error('Erro ao importar: ' + e.message),
  });

  if (dismissed || opsAtrasadas.length === 0) return null;

  const selectedCount = Object.values(editValues).filter(v => v.selected).length;

  return (
    <div className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 shadow-md overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-amber-100 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold text-amber-800">
            {opsAtrasadas.length} OP{opsAtrasadas.length > 1 ? 's' : ''} em atraso detectada{opsAtrasadas.length > 1 ? 's' : ''} do mês anterior
          </p>
          <p className="text-xs text-amber-600">Clique para revisar e importar como atraso para este mês</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); setDismissed(true); }}
          className="p-1 rounded hover:bg-amber-200 text-amber-500"
          title="Ignorar"
        >
          <X className="w-4 h-4" />
        </button>
        {expanded ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
      </div>

      {/* Lista editável */}
      {expanded && (
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-amber-100 text-amber-800">
                  <th className="px-2 py-1.5 text-left font-semibold w-8">
                    <input
                      type="checkbox"
                      checked={selectedCount === opsAtrasadas.length}
                      onChange={e => {
                        setEditValues(prev => {
                          const n = { ...prev };
                          Object.keys(n).forEach(k => { n[k] = { ...n[k], selected: e.target.checked }; });
                          return n;
                        });
                      }}
                    />
                  </th>
                  <th className="px-2 py-1.5 text-left font-semibold">Cód. OP</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Descrição</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Cliente</th>
                  <th className="px-2 py-1.5 text-center font-semibold">Qtd Saldo</th>
                  <th className="px-2 py-1.5 text-center font-semibold">Item #</th>
                </tr>
              </thead>
              <tbody>
                {opsAtrasadas.map(op => {
                  const ev = editValues[op.id] || {};
                  const realizadoReal = op.codigo_produto
                    ? (baixadoPorCodigo[op.codigo_produto] || 0)
                    : (realizadoPorOp[op.id] || 0);
                  const realizado = realizadoReal;
                  const qtdOrig = op.quantidade_total || 0;

                  return (
                    <tr key={op.id} className={`border-t border-amber-200 ${ev.selected ? 'bg-white' : 'bg-amber-50/50 opacity-50'}`}>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={!!ev.selected}
                          onChange={e => setEditValues(prev => ({ ...prev, [op.id]: { ...prev[op.id], selected: e.target.checked } }))}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          value={ev.codigo_op || ''}
                          onChange={e => setEditValues(prev => ({ ...prev, [op.id]: { ...prev[op.id], codigo_op: e.target.value } }))}
                          className="h-6 text-xs font-mono"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          value={ev.descricao || ''}
                          onChange={e => setEditValues(prev => ({ ...prev, [op.id]: { ...prev[op.id], descricao: e.target.value } }))}
                          className="h-6 text-xs"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          value={ev.cliente_nome || ''}
                          onChange={e => setEditValues(prev => ({ ...prev, [op.id]: { ...prev[op.id], cliente_nome: e.target.value } }))}
                          className="h-6 text-xs"
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <Input
                            type="number"
                            value={ev.quantidade_total || ''}
                            onChange={e => setEditValues(prev => ({ ...prev, [op.id]: { ...prev[op.id], quantidade_total: e.target.value } }))}
                            className="h-6 text-xs text-center w-24"
                          />
                          <span className="text-amber-600 text-[10px]">
                            {realizado}/{qtdOrig} realiz.
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-1 text-center">
                        <Input
                          type="number"
                          value={ev.item_num || ''}
                          onChange={e => setEditValues(prev => ({ ...prev, [op.id]: { ...prev[op.id], item_num: e.target.value } }))}
                          className="h-6 text-xs text-center w-16"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-amber-200">
            <p className="text-xs text-amber-700">
              {selectedCount} de {opsAtrasadas.length} OPs selecionadas para importar
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setDismissed(true)} className="border-amber-300 text-amber-700 hover:bg-amber-100">
                Ignorar
              </Button>
              <Button
                size="sm"
                onClick={() => importMutation.mutate()}
                disabled={selectedCount === 0 || importMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-1"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                {importMutation.isPending ? 'Importando...' : `Importar ${selectedCount} OP${selectedCount > 1 ? 's' : ''} como Atraso`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}