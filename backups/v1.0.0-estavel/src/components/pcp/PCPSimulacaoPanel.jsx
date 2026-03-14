import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Zap, TrendingUp, TrendingDown } from 'lucide-react';

export default function PCPSimulacaoPanel({ mes, ano, ops, producaoMap, dias, onClose, onResult }) {
  const [params, setParams] = useState({
    percAumento: 0,
    opsExtra: 0,
    percReducao: 0,
    percCapacidade: 0
  });
  const [resultado, setResultado] = useState(null);

  const set = (k, v) => setParams(p => ({ ...p, [k]: Number(v) || 0 }));

  const baseStats = useMemo(() => {
    let totalPrev = 0, totalReal = 0;
    for (const op of ops) {
      for (const d of dias) {
        totalPrev += producaoMap[`${op.id}-${d}`]?.previsto || 0;
        totalReal += producaoMap[`${op.id}-${d}`]?.realizado || 0;
      }
    }
    return { totalPrev, totalReal };
  }, [ops, producaoMap, dias]);

  const calcular = () => {
    const { percAumento, opsExtra, percReducao, percCapacidade } = params;
    const fatorDemanda = 1 + percAumento / 100;
    const fatorEficiencia = 1 - percReducao / 100;
    const fatorCapacidade = 1 + percCapacidade / 100;

    const novoPrevisto = Math.round(baseStats.totalPrev * fatorDemanda + opsExtra * 1000);
    const novoRealizado = Math.round(baseStats.totalReal * fatorEficiencia * fatorCapacidade);
    const novoSaldo = novoRealizado - novoPrevisto;
    const percAtendimento = novoPrevisto > 0 ? ((novoRealizado / novoPrevisto) * 100).toFixed(1) : '0.0';
    const mediaDiaria = dias.length > 0 ? Math.round(novoRealizado / dias.length) : 0;
    const gargalo = novoSaldo < 0 ? `${Math.abs(novoSaldo).toLocaleString()} un` : 'Sem gargalo';

    const res = { novoPrevisto, novoRealizado, novoSaldo, percAtendimento, mediaDiaria, gargalo, params };
    setResultado(res);
    return res;
  };

  const handleAplicar = () => {
    const res = calcular();
    if (onResult) onResult(res);
  };

  const statColor = (val) => val >= 0 ? 'text-green-600' : 'text-red-500';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-sm bg-white h-full shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span className="font-bold">Simulação de Produção</span>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Base */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Cenário Base</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-slate-400">Total Previsto</p>
                <p className="text-lg font-bold text-blue-600">{baseStats.totalPrev.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Total Realizado</p>
                <p className="text-lg font-bold text-green-600">{baseStats.totalReal.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Parâmetros */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Parâmetros da Simulação</p>
            {[
              { key: 'percAumento', label: '% Aumento de Demanda', hint: 'Ex: 10 = +10% na demanda' },
              { key: 'opsExtra', label: 'OPs Extra (x1000 un)', hint: 'Novas ordens de produção' },
              { key: 'percReducao', label: '% Redução de Eficiência', hint: 'Ex: 5 = 5% menos eficiente' },
              { key: 'percCapacidade', label: '% Ajuste de Capacidade', hint: 'Ex: 10 = +10% capacidade' },
            ].map(({ key, label, hint }) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <p className="text-[10px] text-slate-400 mb-1">{hint}</p>
                <div className="flex items-center gap-2">
                  <Input type="number" value={params[key]} onChange={e => set(key, e.target.value)}
                    className="h-8 text-sm" min={0} max={200} />
                  <span className="text-xs text-slate-400">%</span>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={calcular} variant="outline" className="w-full gap-1">
            <Zap className="w-4 h-4" /> Calcular
          </Button>

          {/* Resultado */}
          {resultado && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-700 uppercase">Resultado Simulado</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] text-slate-400">Novo Previsto</p>
                  <p className="font-bold text-blue-600">{resultado.novoPrevisto?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Novo Realizado</p>
                  <p className="font-bold text-green-600">{resultado.novoRealizado?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Novo Saldo</p>
                  <p className={`font-bold ${statColor(resultado.novoSaldo)}`}>
                    {resultado.novoSaldo >= 0 ? `+${resultado.novoSaldo}` : resultado.novoSaldo}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">% Atendimento</p>
                  <p className={`font-bold ${Number(resultado.percAtendimento) >= 90 ? 'text-green-600' : 'text-red-500'}`}>
                    {resultado.percAtendimento}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Média Diária</p>
                  <p className="font-bold text-slate-700">{resultado.mediaDiaria?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Gargalo</p>
                  <p className="font-bold text-orange-500 text-xs">{resultado.gargalo}</p>
                </div>
              </div>
            </div>
          )}

          <Button onClick={handleAplicar} className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-1">
            <Zap className="w-4 h-4" /> Aplicar e Ver Resultado
          </Button>
        </div>
      </div>
    </div>
  );
}