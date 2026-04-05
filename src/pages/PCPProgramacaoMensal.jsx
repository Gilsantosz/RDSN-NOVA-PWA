// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight, BarChart3, Zap, Pencil, SlidersHorizontal, RefreshCw, Factory, Target, CircleCheck, TrendingUp, Activity, Layers, TrendingDown } from 'lucide-react';
import { PremiumCard } from '@/components/ui/PremiumCard';
import BotaoImprimir, { imprimirRelatorio } from '@/components/relatorios/BotaoImprimir';
import PCPSetorGuard, { usePCPSetor } from '@/components/pcp/PCPSetorGuard';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import PCPNovaOPDialog from '@/components/pcp/PCPNovaOPDialog.jsx';
import PCPSimulacaoPanel from '@/components/pcp/PCPSimulacaoPanel.jsx';
import PCPEditarOPDialog from '@/components/pcp/PCPEditarOPDialog.jsx';
import PCPDistribuirOPDialog from '@/components/pcp/PCPDistribuirOPDialog.jsx';
import PCPAtrasosAlert from '@/components/pcp/PCPAtrasosAlert.jsx';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function getDiasNoMes(mes, ano) {
  return new Date(ano + 2000, mes, 0).getDate();
}

function isWeekend(ano, mes, dia) {
  const d = new Date(ano + 2000, mes - 1, dia).getDay();
  return d === 0 || d === 6;
}

// Larguras das colunas extras de componentes (após os dias)
const COMP_COLS = ['Kit', 'Carcaça', 'Plaqueta', 'Turbina'];
const COMP_W = 90; // px cada coluna

export default function PCPProgramacaoMensal() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear() % 100);
  const [showNovaOP, setShowNovaOP] = useState(false);
  const [showSimulacao, setShowSimulacao] = useState(false);
  const [editingOP, setEditingOP] = useState(null);
  const [distribuindoOP, setDistribuindoOP] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [sincronizando, setSincronizando] = useState(false);

  const queryClient = useQueryClient();
  const { bloqueado, nomeSetor, setorAtivo } = usePCPSetor();
  const totalDias = getDiasNoMes(mes, ano);
  const dias = Array.from({ length: totalDias }, (_, i) => i + 1);

  const { data: pcpClientes = [] } = useQuery({
    queryKey: ['pcp-clientes', setorAtivo],
    queryFn: () => {
      if (!setorAtivo || setorAtivo === 'ALL') {
        return rdsn.entities.PCPCliente.list('nome', 500);
      }
      return rdsn.entities.PCPCliente.filter({ setor_id: setorAtivo }, 'nome', 500);
    },
    enabled: !!setorAtivo
  });

  const clienteMap = useMemo(() => {
    const m = {};
    for (const c of pcpClientes) m[c.id] = c;
    return m;
  }, [pcpClientes]);

  const { data: ops = [] } = useQuery({
    queryKey: ['pcp-ops', mes, ano, setorAtivo],
    queryFn: () => {
      if (!setorAtivo || setorAtivo === 'ALL') {
        return rdsn.entities.PCPOrdemProducao.filter({ mes, ano, status: 'Ativo' }, 'item_num', 500);
      }
      return rdsn.entities.PCPOrdemProducao.filter({ mes, ano, status: 'Ativo', setor_id: setorAtivo }, 'item_num', 500);
    },
    enabled: !!setorAtivo && setorAtivo !== 'ALL' || true
  });

  // Mês anterior para detecção de atrasos
  const mesAnt = mes === 1 ? 12 : mes - 1;
  const anoAnt = mes === 1 ? ano - 1 : ano;

  const { data: opsAnterior = [] } = useQuery({
    queryKey: ['pcp-ops-anterior', mesAnt, anoAnt, setorAtivo],
    queryFn: () => {
      if (!setorAtivo || setorAtivo === 'ALL') {
        return rdsn.entities.PCPOrdemProducao.filter({ mes: mesAnt, ano: anoAnt, status: 'Ativo' }, 'item_num', 500);
      }
      return rdsn.entities.PCPOrdemProducao.filter({ mes: mesAnt, ano: anoAnt, status: 'Ativo', setor_id: setorAtivo }, 'item_num', 500);
    },
    enabled: !!setorAtivo
  });

  const { data: producoesMesAnterior = [] } = useQuery({
    queryKey: ['pcp-producoes-anterior', mesAnt, anoAnt, setorAtivo],
    queryFn: () => {
      if (!setorAtivo || setorAtivo === 'ALL') {
        return rdsn.entities.PCPProducaoDiaria.filter({ mes: mesAnt, ano: anoAnt }, null, 5000);
      }
      return rdsn.entities.PCPProducaoDiaria.filter({ mes: mesAnt, ano: anoAnt, setor_id: setorAtivo }, null, 5000);
    },
    enabled: opsAnterior.length > 0
  });

  const { data: producoes = [] } = useQuery({
    queryKey: ['pcp-producoes', mes, ano, setorAtivo],
    queryFn: () => {
      if (!setorAtivo || setorAtivo === 'ALL') {
        return rdsn.entities.PCPProducaoDiaria.filter({ mes, ano }, null, 5000);
      }
      return rdsn.entities.PCPProducaoDiaria.filter({ mes, ano, setor_id: setorAtivo }, null, 5000);
    },
    enabled: ops.length > 0
  });

  // Sincronização automática ao mudar mês/ano ou quando OPs são carregadas
  React.useEffect(() => {
    if (ops.length === 0 || !setorAtivo) return;
    rdsn.functions.invoke('sincronizarBaixasComPCP', { mes, ano, setor_id: setorAtivo !== 'ALL' ? setorAtivo : null })
      .then(() => queryClient.invalidateQueries({ queryKey: ['pcp-producoes', mes, ano, setorAtivo] }))
      .catch(() => { }); // silencioso
  }, [mes, ano, ops.length, setorAtivo]);

  // Subscription em tempo real: re-sincroniza ao detectar nova BaixaLote
  React.useEffect(() => {
    const unsubscribe = rdsn.entities.BaixaLote.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        rdsn.functions.invoke('sincronizarBaixasComPCP', { mes, ano, setor_id: setorAtivo !== 'ALL' ? setorAtivo : null })
          .then(() => queryClient.invalidateQueries({ queryKey: ['pcp-producoes', mes, ano, setorAtivo] }))
          .catch(() => { });
      }
    });
    return () => unsubscribe();
  }, [mes, ano, setorAtivo]);

  // Subscription em tempo real: re-carrega produção ao detectar mudança no PCPProducaoDiaria
  React.useEffect(() => {
    const unsubscribe = rdsn.entities.PCPProducaoDiaria.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['pcp-producoes', mes, ano, setorAtivo] });
    });
    return () => unsubscribe();
  }, [mes, ano, setorAtivo]);

  const updateProducaoMutation = useMutation({
    mutationFn: async ({ op_id, dia, campo, valor }) => {
      const existing = producoes.find(p => p.op_id === op_id && p.dia === dia);
      if (existing) {
        return rdsn.entities.PCPProducaoDiaria.update(existing.id, { [campo]: Number(valor) || 0 });
      } else {
        return rdsn.entities.PCPProducaoDiaria.create({ op_id, mes, ano, dia, [campo]: Number(valor) || 0, setor_id: setorAtivo || '' });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pcp-producoes', mes, ano, setorAtivo] })
  });

  const producaoMap = useMemo(() => {
    const m = {};
    for (const p of producoes) {
      m[`${p.op_id}-${p.dia}`] = p;
    }
    return m;
  }, [producoes]);

  const getVal = (op_id, dia, campo) => producaoMap[`${op_id}-${dia}`]?.[campo] || 0;
  const getTotalOP = (op_id, campo) => dias.reduce((s, d) => s + getVal(op_id, d, campo), 0);
  const getTotalDia = (dia, campo) => ops.filter(op => op.tipo === 'Normal').reduce((s, op) => s + getVal(op.id, dia, campo), 0);

  const getSaldo = (op_id, dia) => {
    let saldo = 0;
    for (let d = 1; d <= dia; d++) {
      saldo += getVal(op_id, d, 'realizado') - getVal(op_id, d, 'previsto');
    }
    return saldo;
  };

  const handleCellClick = (op_id, dia, campo) => {
    setEditingCell(`${op_id}-${dia}-${campo}`);
    setEditValue(String(getVal(op_id, dia, campo) || ''));
  };

  const handleCellBlur = (op_id, dia, campo) => {
    if (editValue !== String(getVal(op_id, dia, campo))) {
      updateProducaoMutation.mutate({ op_id, dia, campo, valor: editValue });
    }
    setEditingCell(null);
  };

  const handleSincronizarBaixas = async () => {
    setSincronizando(true);
    try {
      const res = await rdsn.functions.invoke('sincronizarBaixasComPCP', { mes, ano, setor_id: setorAtivo !== 'ALL' ? setorAtivo : null });
      queryClient.invalidateQueries({ queryKey: ['pcp-producoes', mes, ano, setorAtivo] });
      toast.success(`Sincronização concluída! ${res.data?.sincronizadas || 0} OPs atualizadas.`);
    } catch (e) {
      toast.error('Erro ao sincronizar: ' + e.message);
    } finally {
      setSincronizando(false);
    }
  };

  const navMes = (dir) => {
    let nm = mes + dir;
    let na = ano;
    if (nm > 12) { nm = 1; na++; }
    if (nm < 1) { nm = 12; na--; }
    setMes(nm);
    setAno(na);
  };

  const opsNormais = ops.filter(op => op.tipo === 'Normal');
  const opsAtraso = ops.filter(op => op.tipo === 'Atraso');

  const resumo = useMemo(() => {
    // Inclui todas as OPs (normais + atraso) nos totais
    const allOps = ops;
    const totalPrev = allOps.reduce((s, op) => {
      const qtd = op.quantidade_total || 0;
      return s + (qtd > 0 ? qtd : getTotalOP(op.id, 'previsto'));
    }, 0);
    const totalReal = allOps.reduce((s, op) => s + getTotalOP(op.id, 'realizado'), 0);
    const saldoTotal = totalReal - totalPrev;
    const perc = totalPrev > 0 ? ((totalReal / totalPrev) * 100).toFixed(1) : '0.0';
    // Média diária baseada nos dias que tiveram produção real
    const diasComReal = dias.filter(d => allOps.some(op => getVal(op.id, d, 'realizado') > 0)).length;
    const mediaDiaria = totalReal > 0 && diasComReal > 0 ? (totalReal / diasComReal).toFixed(0) : '0';
    return { totalPrev, totalReal, saldoTotal, perc, mediaDiaria };
  }, [producoes, ops, dias]);

  const cellClass = (op_id, dia) => {
    const s = getSaldo(op_id, dia);
    if (s > 0) return 'bg-green-50 dark:bg-green-900/10';
    if (s < 0) return 'bg-red-50 dark:bg-red-900/10';
    return '';
  };

  // Retorna os valores de componentes de uma OP (via cliente vinculado)
  const getComponentes = (op) => {
    const cli = clienteMap[op.cliente_id];
    return {
      kit: cli?.kit || '',
      carcaca: cli?.carcaca || '',
      plaqueta: cli?.plaqueta || '',
      turbina: cli?.turbina || '',
    };
  };

  const renderCompCells = (op, rowType) => {
    if (rowType !== 'previsto') {
      // Nas linhas Realizado e Saldo, células vazias com rowSpan já coberto pela linha Previsto
      return null;
    }
    const comp = getComponentes(op);
    const vals = [comp.kit, comp.carcaca, comp.plaqueta, comp.turbina];
    return vals.map((val, i) => (
      <td
        key={COMP_COLS[i]}
        rowSpan={3}
        className={`text-xs px-2 border-l border-slate-200 dark:border-slate-800 align-middle min-w-[${COMP_W}px] max-w-[${COMP_W}px] truncate ${val ? 'text-amber-800 dark:text-amber-400 font-medium bg-amber-50/40 dark:bg-amber-900/20' : 'text-slate-300 dark:text-slate-700 bg-white dark:bg-slate-900'}`}
        style={{ minWidth: COMP_W, maxWidth: COMP_W }}
        title={val || '—'}
      >
        {val || ''}
      </td>
    ));
  };

  const renderOPRows = (opsList) => opsList.map((op, idx) => {
    const totalPrev = getTotalOP(op.id, 'previsto');
    const totalReal = getTotalOP(op.id, 'realizado');
    const totalSaldo = totalReal - totalPrev;
    const qtdTotal = op.quantidade_total || 0;

    return (
      <React.Fragment key={op.id}>
        {/* Linha Previsto */}
        <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 group transition-colors">
          <td rowSpan={3} className="sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-center text-xs font-bold text-slate-500 dark:text-slate-400 px-2 min-w-[40px] group-hover:bg-blue-50 dark:group-hover:bg-slate-800 transition-colors">{op.item_num || idx + 1}</td>
          <td rowSpan={3} className="sticky left-[40px] z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 px-2 min-w-[125px] group-hover:bg-blue-50 dark:group-hover:bg-slate-800 transition-colors">
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="truncate" title={op.codigo_op}>{op.codigo_op}</span>
              <div className="flex items-center shrink-0">
                <button type="button" onClick={() => setEditingOP(op)} className="opacity-70 hover:opacity-100 transition-all p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700" title="Editar OP">
                  <Pencil className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </button>
                <button type="button" onClick={() => setDistribuindoOP(op)} className="opacity-70 hover:opacity-100 transition-all p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700" title="Distribuir quantidade">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                </button>
              </div>
            </div>
          </td>
          <td rowSpan={3} className="sticky left-[165px] z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 px-2 min-w-[150px] group-hover:bg-blue-50 dark:group-hover:bg-slate-800 max-w-[150px] transition-colors truncate">{op.descricao || '-'}</td>
          <td rowSpan={3} className="sticky left-[315px] z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 px-2 min-w-[120px] group-hover:bg-blue-50 dark:group-hover:bg-slate-800 max-w-[120px] transition-colors truncate">{op.cliente_nome || '-'}</td>
          <td className="sticky left-[435px] z-20 bg-blue-50 dark:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 text-center text-xs font-bold text-blue-700 dark:text-blue-400 px-2 min-w-[60px] shadow-[4px_0_6px_-2px_rgba(0,0,0,0.1)]">
            {qtdTotal > 0 ? qtdTotal.toLocaleString() : (totalPrev > 0 ? totalPrev.toLocaleString() : '-')}
          </td>
          <td className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/30 px-1 min-w-[28px] text-center border-r border-slate-100 dark:border-slate-800">Prev</td>
          {dias.map(dia => {
            const cellKey = `${op.id}-${dia}-previsto`;
            const isEditing = editingCell === cellKey;
            const val = getVal(op.id, dia, 'previsto');
            const isWknd = isWeekend(ano, mes, dia);
            return (
              <td key={dia} className={`text-center text-xs px-0.5 min-w-[38px] border-r border-slate-100 dark:border-slate-800 ${isWknd ? 'bg-slate-100 dark:bg-slate-800' : 'bg-blue-50/20 dark:bg-blue-900/10'} cursor-pointer`}
                onClick={() => handleCellClick(op.id, dia, 'previsto')}>
                {isEditing ? (
                  <input autoFocus className="w-full text-center text-xs border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-slate-800 dark:text-blue-100 p-0.5" value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => handleCellBlur(op.id, dia, 'previsto')}
                    onKeyDown={e => e.key === 'Enter' && handleCellBlur(op.id, dia, 'previsto')} />
                ) : (
                  <span className="text-blue-700 dark:text-blue-400">{val > 0 ? val.toLocaleString() : ''}</span>
                )}
              </td>
            );
          })}
          {/* Colunas de componentes — só na linha Previsto com rowSpan=3 */}
          {renderCompCells(op, 'previsto')}
        </tr>
        {/* Linha Realizado */}
        <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-green-50/30 dark:hover:bg-green-900/10 group transition-colors">
          <td className="sticky left-[435px] z-20 bg-green-50 dark:bg-emerald-950 border-r-2 border-slate-300 dark:border-slate-700 text-center text-xs font-bold text-green-700 dark:text-green-400 px-2 min-w-[60px] shadow-[4px_0_6px_-2px_rgba(0,0,0,0.1)]">
            {totalReal > 0 ? totalReal.toLocaleString() : '-'}
          </td>
          <td className="text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/30 px-1 min-w-[28px] text-center border-r border-slate-100 dark:border-slate-800">Real</td>
          {dias.map(dia => {
            const cellKey = `${op.id}-${dia}-realizado`;
            const isEditing = editingCell === cellKey;
            const val = getVal(op.id, dia, 'realizado');
            const isWknd = isWeekend(ano, mes, dia);
            return (
              <td key={dia} className={`text-center text-xs px-0.5 min-w-[38px] border-r border-slate-100 dark:border-slate-800 ${isWknd ? 'bg-slate-100 dark:bg-slate-800' : cellClass(op.id, dia)} cursor-pointer`}
                onClick={() => handleCellClick(op.id, dia, 'realizado')}>
                {isEditing ? (
                  <input autoFocus className="w-full text-center text-xs border border-green-300 dark:border-green-700 rounded bg-white dark:bg-slate-800 dark:text-green-100 p-0.5" value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => handleCellBlur(op.id, dia, 'realizado')}
                    onKeyDown={e => e.key === 'Enter' && handleCellBlur(op.id, dia, 'realizado')} />
                ) : (
                  <span className="text-green-700 dark:text-green-400 font-medium">{val > 0 ? val.toLocaleString() : ''}</span>
                )}
              </td>
            );
          })}
        </tr>
        {/* Linha Saldo */}
        <tr className="border-b-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 group transition-colors">
          <td className="sticky left-[435px] z-20 bg-slate-50 dark:bg-slate-900 border-r-2 border-slate-300 dark:border-slate-700 text-center text-xs font-bold px-2 min-w-[60px] shadow-[4px_0_6px_-2px_rgba(0,0,0,0.1)]">
            <span className={totalSaldo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {totalSaldo > 0 ? `+${totalSaldo}` : totalSaldo !== 0 ? totalSaldo.toLocaleString() : '-'}
            </span>
          </td>
          <td className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900 px-1 min-w-[28px] text-center border-r border-slate-100 dark:border-slate-800">Saldo</td>
          {dias.map(dia => {
            const saldo = getSaldo(op.id, dia);
            const isWknd = isWeekend(ano, mes, dia);
            return (
              <td key={dia} className={`text-center text-xs px-0.5 min-w-[38px] border-r border-slate-100 dark:border-slate-800 ${isWknd ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
                {saldo !== 0 && (
                  <span className={`font-semibold ${saldo > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {saldo > 0 ? `+${saldo}` : saldo}
                  </span>
                )}
              </td>
            );
          })}
        </tr>
      </React.Fragment>
    );
  });

  // Colunas extras para linha de total/atrasos (células vazias)
  const renderCompHeaderCells = (bgClass = 'bg-slate-900') =>
    COMP_COLS.map(col => (
      <th key={col} className={`px-2 py-1 text-center font-bold text-xs border-l border-slate-600 ${bgClass} text-amber-300`} style={{ minWidth: COMP_W }}>
        {col}
      </th>
    ));

  const renderCompSubHeaderCells = () =>
    COMP_COLS.map(col => (
      <th key={col} className="bg-amber-50 dark:bg-amber-950/20 text-center text-xs font-bold text-amber-700 dark:text-amber-400 px-2 py-1.5 border-l border-amber-200 dark:border-amber-900/50" style={{ minWidth: COMP_W }}>
        {col}
      </th>
    ));

  const renderCompEmptyCells = () =>
    COMP_COLS.map(col => (
      <td key={col} className="border-l border-slate-300 dark:border-slate-700" style={{ minWidth: COMP_W }} colSpan={1}></td>
    ));

  const content = (
    <div className="p-4 md:p-6 min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Header Premium */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(37,99,235,0.1),transparent)] pointer-events-none" />
        <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-600 to-indigo-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all hover:scale-105 active:scale-95 group border border-blue-400/20">
              <BarChart3 className="w-8 h-8 sm:w-6 sm:h-6 text-white group-hover:rotate-12 transition-transform duration-500" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                Programação <span className="text-blue-600 dark:text-blue-400">Mensal</span>
              </h1>
              <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                PCP • <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1"><Factory className="w-3.5 h-3.5" />{nomeSetor}</span>
                {bloqueado && (
                  <span className="text-red-500 ml-2 animate-pulse font-black leading-none">⚠ SELECIONE UM SETOR</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center">
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2 shadow-sm transition-colors">
              <button onClick={() => navMes(-1)} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"><ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" /></button>
              <span className="font-black text-slate-900 dark:text-white min-w-[140px] text-center text-xs uppercase tracking-widest">{MESES[mes - 1]} 20{ano}</span>
              <button onClick={() => navMes(1)} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"><ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" /></button>
            </div>

            <Button variant="outline" size="sm" onClick={handleSincronizarBaixas} disabled={sincronizando} className="h-12 px-6 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 backdrop-blur-xl hover:bg-slate-50 dark:hover:bg-white/10 font-black uppercase text-xs tracking-widest gap-2">
              <RefreshCw className={`w-4 h-4 ${sincronizando ? 'animate-spin' : ''}`} />
              {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
            </Button>

            <Button variant="outline" size="sm" onClick={() => setShowSimulacao(true)} className="h-12 px-6 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 backdrop-blur-xl hover:bg-slate-50 dark:hover:bg-white/10 font-black uppercase text-xs tracking-widest gap-2">
              <Zap className="w-4 h-4" /> Simular
            </Button>

            <BotaoImprimir
              className="h-12 px-6 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 backdrop-blur-xl hover:bg-slate-50 dark:hover:bg-white/10 font-black uppercase text-xs tracking-widest gap-2"
              onClick={() => {
                const linhasNormais = opsNormais.map((op, idx) => {
                  const totalPrev = getTotalOP(op.id, 'previsto');
                  const totalReal = getTotalOP(op.id, 'realizado');
                  const saldo = totalReal - totalPrev;
                  const perc = totalPrev > 0 ? ((totalReal / totalPrev) * 100).toFixed(1) : '0.0';
                  return `<tr>
                  <td>${op.item_num || idx + 1}</td>
                  <td>${op.codigo_op}</td>
                  <td>${op.descricao || '-'}</td>
                  <td>${op.cliente_nome || '-'}</td>
                  <td style="text-align:right">${(op.quantidade_total || totalPrev).toLocaleString()}</td>
                  <td style="text-align:right">${totalPrev.toLocaleString()}</td>
                  <td style="text-align:right">${totalReal.toLocaleString()}</td>
                  <td style="text-align:right;color:${saldo >= 0 ? 'green' : 'red'}">${saldo >= 0 ? '+' + saldo : saldo}</td>
                  <td style="text-align:right">${perc}%</td>
                </tr>`;
                }).join('');
                const linhasAtraso = opsAtraso.map((op) => {
                  const totalPrev = getTotalOP(op.id, 'previsto');
                  const totalReal = getTotalOP(op.id, 'realizado');
                  const saldo = totalReal - totalPrev;
                  const perc = totalPrev > 0 ? ((totalReal / totalPrev) * 100).toFixed(1) : '0.0';
                  return `<tr style="background:#fef2f2">
                  <td>⚠ Atraso</td>
                  <td>${op.codigo_op}</td>
                  <td>${op.descricao || '-'}</td>
                  <td>${op.cliente_nome || '-'}</td>
                  <td style="text-align:right">${(op.quantidade_total || totalPrev).toLocaleString()}</td>
                  <td style="text-align:right">${totalPrev.toLocaleString()}</td>
                  <td style="text-align:right">${totalReal.toLocaleString()}</td>
                  <td style="text-align:right;color:${saldo >= 0 ? 'green' : 'red'}">${saldo >= 0 ? '+' + saldo : saldo}</td>
                  <td style="text-align:right">${perc}%</td>
                </tr>`;
                }).join('');
                imprimirRelatorio({
                  titulo: `Programação Mensal PCP — ${MESES[mes - 1]} 20${ano}`,
                  subtitulo: `Setor: ${nomeSetor} | OPs: ${ops.length} | Previsto: ${resumo.totalPrev.toLocaleString()} | Realizado: ${resumo.totalReal.toLocaleString()} | Atendimento: ${resumo.perc}%`,
                  htmlTabela: `<table>
                  <thead><tr>
                    <th>#</th><th>Código OP</th><th>Descrição</th><th>Cliente</th>
                    <th>Qtd Total</th><th>Previsto</th><th>Realizado</th><th>Saldo</th><th>% Aten.</th>
                  </tr></thead>
                  <tbody>${linhasNormais}${opsAtraso.length > 0 ? linhasAtraso : ''}</tbody>
                </table>`
                });
              }}
            />

            <Button
              size="sm"
              onClick={() => setShowNovaOP(true)}
              disabled={bloqueado}
              className="h-12 px-6 rounded-2xl bg-slate-900 dark:bg-blue-600 text-white font-black uppercase text-xs tracking-widest gap-2 shadow-xl hover:scale-[1.02] active:scale-95 transition-all border-0 shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" /> Nova OP
            </Button>
          </div>
        </div>
      </div>

      {/* Alerta de atrasos do mês anterior */}
      <PCPAtrasosAlert
        mesAtual={mes}
        anoAtual={ano}
        opsAtual={ops}
        opsAnterior={opsAnterior}
        producoesMesAnterior={producoesMesAnterior}
      />

      <PremiumCard title="Quadro de Programação PCP" icon={Layers} contentClassName="p-0">
        <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 360px)' }}>
          <table className="text-xs border-collapse" style={{ minWidth: `${495 + totalDias * 38 + COMP_COLS.length * COMP_W}px` }}>
            <thead className="sticky top-0 z-20">
              {/* Linha Título */}
              <tr className="bg-slate-900 text-white">
                <th colSpan={4} className="sticky left-0 z-30 bg-slate-900 text-left px-3 py-2 text-xs font-bold border-r-2 border-slate-600">
                  {MESES[mes - 1].toUpperCase()} 20{ano} — PROGRAMAÇÃO PCP
                </th>
                <th className="sticky left-[435px] z-30 bg-slate-900 px-2 py-2 text-xs font-bold border-r-2 border-slate-600 min-w-[60px] shadow-[4px_0_6px_-2px_rgba(0,0,0,0.2)]">TOTAL</th>
                <th className="bg-slate-800 px-1 py-2 min-w-[28px]"></th>
                {dias.map(dia => {
                  const isWknd = isWeekend(ano, mes, dia);
                  return (
                    <th key={dia} className={`px-0.5 py-1 text-center font-bold min-w-[38px] border-r border-slate-700 ${isWknd ? 'bg-slate-600 text-slate-300' : 'bg-slate-900'}`}>
                      <div>{dia}</div>
                      <div className="text-[9px] text-slate-400 font-normal">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][new Date(ano + 2000, mes - 1, dia).getDay()]}
                      </div>
                    </th>
                  );
                })}
                {renderCompHeaderCells('bg-slate-900')}
              </tr>
              {/* Linha SubHeader */}
              <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-700">
                <th className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 text-center text-xs font-bold text-slate-600 dark:text-slate-400 px-2 py-1.5 border-r border-slate-200 dark:border-slate-700 min-w-[40px]">#</th>
                <th className="sticky left-[40px] z-30 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 px-2 py-1.5 border-r border-slate-200 dark:border-slate-700 min-w-[125px]">Código</th>
                <th className="sticky left-[165px] z-30 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 px-2 py-1.5 border-r border-slate-200 dark:border-slate-700 min-w-[150px]">Descrição</th>
                <th className="sticky left-[315px] z-30 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 px-2 py-1.5 border-r border-slate-200 dark:border-slate-700 min-w-[120px]">Cliente</th>
                <th className="sticky left-[435px] z-30 bg-slate-100 dark:bg-slate-800 text-center text-xs font-bold text-slate-600 dark:text-slate-400 px-2 py-1.5 border-r-2 border-slate-300 dark:border-slate-700 min-w-[60px] shadow-[4px_0_6px_-2px_rgba(0,0,0,0.1)]">Total</th>
                <th className="bg-slate-100 dark:bg-slate-800 px-1 py-1.5 min-w-[28px] text-xs font-bold text-slate-500 dark:text-slate-400 text-center border-r border-slate-200 dark:border-slate-700">P/R/S</th>
                {dias.map(dia => {
                  const isWknd = isWeekend(ano, mes, dia);
                  return (
                    <th key={dia} className={`text-center px-0.5 py-1 min-w-[38px] border-r border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400 ${isWknd ? 'bg-slate-200 dark:bg-slate-700' : ''}`}>
                      {getTotalDia(dia, 'previsto') > 0 ? getTotalDia(dia, 'previsto').toLocaleString() : ''}
                    </th>
                  );
                })}
                {renderCompSubHeaderCells()}
              </tr>
            </thead>
            <tbody>
              {/* OPs Normais */}
              {opsNormais.length === 0 ? (
                <tr>
                  <td colSpan={6 + totalDias + COMP_COLS.length} className="text-center py-12 text-slate-400">
                    Nenhuma OP cadastrada para este mês.{' '}
                    <button className="text-blue-600 underline" onClick={() => setShowNovaOP(true)}>Adicionar OP</button>
                  </td>
                </tr>
              ) : renderOPRows(opsNormais)}

              {/* Total Geral */}
              {opsNormais.length > 0 && (
                <tr className="bg-slate-800 text-white font-bold border-t-2 border-slate-400">
                  <td colSpan={4} className="sticky left-0 z-20 bg-slate-800 px-3 py-2 text-xs">TOTAL GERAL</td>
                  <td className="sticky left-[435px] z-20 bg-slate-800 text-center px-2 text-xs shadow-[4px_0_6px_-2px_rgba(0,0,0,0.3)]">
                    {opsNormais.reduce((s, op) => s + getTotalOP(op.id, 'previsto'), 0).toLocaleString()}
                  </td>
                  <td className="bg-slate-800 px-1"></td>
                  {dias.map(dia => (
                    <td key={dia} className={`text-center px-0.5 py-2 text-xs min-w-[38px] ${isWeekend(ano, mes, dia) ? 'bg-slate-700' : 'bg-slate-800'}`}>
                      {getTotalDia(dia, 'previsto') > 0 ? getTotalDia(dia, 'previsto').toLocaleString() : ''}
                    </td>
                  ))}
                  {renderCompEmptyCells()}
                </tr>
              )}

              {/* Bloco de Atrasos */}
              {opsAtraso.length > 0 && (
                <>
                  <tr>
                    <td colSpan={6 + totalDias + COMP_COLS.length} className="bg-red-700 text-white font-bold text-xs px-4 py-2 sticky left-0">
                      ⚠ ATRASOS
                    </td>
                  </tr>
                  {renderOPRows(opsAtraso)}
                </>
              )}
            </tbody>
          </table>
        </div>
      </PremiumCard>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-12">
        <PremiumCard title="Total Previsto" icon={Target} className="bg-blue-600/5">
          <h3 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">{resumo.totalPrev.toLocaleString()}</h3>
          <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest italic opacity-60 mt-1">planejado mensal</p>
        </PremiumCard>

        <PremiumCard title="Total Realizado" icon={CircleCheck} className="bg-emerald-600/5">
          <h3 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">{resumo.totalReal.toLocaleString()}</h3>
          <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest italic opacity-60 mt-1">coletado no período</p>
        </PremiumCard>

        <PremiumCard
          title="Saldo Mensal"
          icon={resumo.saldoTotal >= 0 ? TrendingUp : TrendingDown}
          className={resumo.saldoTotal >= 0 ? "bg-emerald-600/5" : "bg-rose-600/5"}
        >
          <h3 className={cn(
            "text-2xl font-black italic tracking-tighter leading-none",
            resumo.saldoTotal >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          )}>
            {resumo.saldoTotal >= 0 ? `+${resumo.saldoTotal.toLocaleString()}` : resumo.saldoTotal.toLocaleString()}
          </h3>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic opacity-60 mt-1">balanço de produção</p>
        </PremiumCard>

        <PremiumCard title="Média Diária" icon={Activity} className="bg-indigo-600/5">
          <h3 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">{resumo.mediaDiaria}</h3>
          <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest italic opacity-60 mt-1">produção/dia</p>
        </PremiumCard>

        <PremiumCard
          title="% Atendimento"
          icon={CircleCheck}
          className={Number(resumo.perc) >= 90 ? "bg-emerald-600/5" : Number(resumo.perc) >= 70 ? "bg-amber-600/5" : "bg-rose-600/5"}
        >
          <h3 className={cn(
            "text-2xl font-black italic tracking-tighter leading-none",
            Number(resumo.perc) >= 90 ? "text-emerald-600 dark:text-emerald-400" : Number(resumo.perc) >= 70 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
          )}>
            {resumo.perc}%
          </h3>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic opacity-60 mt-1">eficiência global</p>
        </PremiumCard>

        <PremiumCard title="OPs Ativas" icon={Layers} className="bg-slate-600/5">
          <h3 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">{ops.length}</h3>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic opacity-60 mt-1">no fluxo atual</p>
        </PremiumCard>
      </div>

      {showNovaOP && <PCPNovaOPDialog mes={mes} ano={ano} onClose={() => setShowNovaOP(false)} />}
      {showSimulacao && <PCPSimulacaoPanel mes={mes} ano={ano} ops={opsNormais} producaoMap={producaoMap} dias={dias} onClose={() => setShowSimulacao(false)} />}
      {editingOP && <PCPEditarOPDialog op={editingOP} mes={mes} ano={ano} onClose={() => setEditingOP(null)} />}
      {distribuindoOP && (
        <PCPDistribuirOPDialog
          op={distribuindoOP}
          mes={mes}
          ano={ano}
          producoes={producoes}
          onClose={() => setDistribuindoOP(null)}
        />
      )}
    </div>
  );

  return (
    <PCPSetorGuard action="registrar OPs e produção">
      {content}
    </PCPSetorGuard>
  );
}