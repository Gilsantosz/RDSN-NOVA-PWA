import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PCPDoDia({ date }) {
  const queryClient = useQueryClient();
  const dia = date.getDate();
  const mes = date.getMonth() + 1;
  const ano = date.getFullYear() % 100;

  const { data: ops = [] } = useQuery({
    queryKey: ['pcp-ops-dia', mes, ano],
    queryFn: () => rdsn.entities.PCPOrdemProducao.filter({ mes, ano, status: 'Ativo' }, 'item_num', 100)
  });

  const { data: producoes = [] } = useQuery({
    queryKey: ['pcp-producoes-dia', mes, ano, dia],
    queryFn: () => rdsn.entities.PCPProducaoDiaria.filter({ mes, ano, dia }, null, 500),
    enabled: ops.length > 0
  });

  const updateMutation = useMutation({
    mutationFn: async ({ op_id, campo, valor }) => {
      const existing = producoes.find(p => p.op_id === op_id && p.dia === dia);
      if (existing) {
        return rdsn.entities.PCPProducaoDiaria.update(existing.id, { [campo]: Number(valor) || 0 });
      } else {
        return rdsn.entities.PCPProducaoDiaria.create({ op_id, mes, ano, dia, [campo]: Number(valor) || 0 });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pcp-producoes-dia', mes, ano, dia] })
  });

  const [editing, setEditing] = React.useState(null);
  const [editVal, setEditVal] = React.useState('');

  const getVal = (op_id, campo) => producoes.find(p => p.op_id === op_id)?.[campo] || 0;

  const opsNormais = ops.filter(op => op.tipo === 'Normal');

  const totalPrevisto = opsNormais.reduce((s, op) => s + getVal(op.id, 'previsto'), 0);
  const totalRealizado = opsNormais.reduce((s, op) => s + getVal(op.id, 'realizado'), 0);
  const saldo = totalRealizado - totalPrevisto;

  const handleClick = (op_id, campo) => {
    setEditing(`${op_id}-${campo}`);
    setEditVal(String(getVal(op_id, campo) || ''));
  };

  const handleBlur = (op_id, campo) => {
    updateMutation.mutate({ op_id, campo, valor: editVal });
    setEditing(null);
  };

  if (opsNormais.length === 0) {
    return (
      <Card className="border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 backdrop-blur-xl shadow-sm">
        <CardContent className="p-6 text-center text-slate-400 dark:text-slate-500">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Nenhuma OP PCP para {format(date, 'MMMM yyyy', { locale: ptBR })}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 backdrop-blur-xl shadow-lg">
      <CardHeader className="border-b border-slate-100 dark:border-white/5 bg-amber-50/50 dark:bg-amber-900/10 pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            Produção PCP — {format(date, "dd 'de' MMMM", { locale: ptBR })}
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-0">Prev: {totalPrevisto.toLocaleString()}</Badge>
            <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-0">Real: {totalRealizado.toLocaleString()}</Badge>
            <Badge className={saldo >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-0' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-0'}>
              {saldo > 0 ? <TrendingUp className="w-3 h-3 inline mr-1" /> : saldo < 0 ? <TrendingDown className="w-3 h-3 inline mr-1" /> : <Minus className="w-3 h-3 inline mr-1" />}
              Saldo: {saldo > 0 ? `+${saldo}` : saldo}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">#</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Código OP</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Descrição</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Cliente</th>
                <th className="text-center px-3 py-2 font-semibold text-blue-600 dark:text-blue-400">Previsto</th>
                <th className="text-center px-3 py-2 font-semibold text-green-600 dark:text-green-400">Realizado</th>
                <th className="text-center px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {opsNormais.map((op, idx) => {
                const prev = getVal(op.id, 'previsto');
                const real = getVal(op.id, 'realizado');
                const sal = real - prev;
                return (
                  <tr key={op.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{op.item_num || idx + 1}</td>
                    <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">{op.codigo_op}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400 max-w-[140px] truncate">{op.descricao || '-'}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400 max-w-[120px] truncate">{op.cliente_nome || '-'}</td>
                    <td className="px-3 py-2 text-center cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      onClick={() => handleClick(op.id, 'previsto')}>
                      {editing === `${op.id}-previsto` ? (
                        <input autoFocus className="w-16 text-center text-xs border border-blue-300 dark:border-blue-600 rounded p-0.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          value={editVal} onChange={e => setEditVal(e.target.value)}
                          onBlur={() => handleBlur(op.id, 'previsto')}
                          onKeyDown={e => e.key === 'Enter' && handleBlur(op.id, 'previsto')} />
                      ) : (
                        <span className="text-blue-700 dark:text-blue-400 font-medium">{prev > 0 ? prev.toLocaleString() : <span className="text-slate-300 dark:text-slate-600">—</span>}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                      onClick={() => handleClick(op.id, 'realizado')}>
                      {editing === `${op.id}-realizado` ? (
                        <input autoFocus className="w-16 text-center text-xs border border-green-300 dark:border-green-600 rounded p-0.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          value={editVal} onChange={e => setEditVal(e.target.value)}
                          onBlur={() => handleBlur(op.id, 'realizado')}
                          onKeyDown={e => e.key === 'Enter' && handleBlur(op.id, 'realizado')} />
                      ) : (
                        <span className="text-green-700 dark:text-green-400 font-medium">{real > 0 ? real.toLocaleString() : <span className="text-slate-300 dark:text-slate-600">—</span>}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {sal !== 0 && (
                        <span className={`font-semibold ${sal > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                          {sal > 0 ? `+${sal}` : sal}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}