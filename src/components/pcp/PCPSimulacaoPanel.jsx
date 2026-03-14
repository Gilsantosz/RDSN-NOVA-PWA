// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Zap, TrendingUp, TrendingDown, Calculator, Target, Activity, ShieldAlert, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { cn } from "@/lib/utils";

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

  const statColor = (val) => val >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl dark:bg-slate-900/90 dark:border-white/10 rounded-[2.5rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0">
        <div className="bg-gradient-to-br from-amber-600 to-orange-700 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-amber-200" />
              </span>
              Motor de <span className="text-amber-200">Simulação</span>
            </DialogTitle>
            <p className="text-xs font-bold text-amber-100/60 uppercase tracking-widest mt-1 italic">
              Projeção de Cenários • PCP Analítico
            </p>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Cenário Base */}
          <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" /> Situação Atual (Real)
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Demanda Prevista</p>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">{baseStats.totalPrev.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Coleta Realizada</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">{baseStats.totalReal.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Parâmetros */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 italic flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Vetores de Simulação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { key: 'percAumento', label: 'Crescimento Demanda', icon: Target, hint: 'Ajuste percentual da carga' },
                { key: 'opsExtra', label: 'Ordens Adicionais', icon: Plus, hint: 'Unidades extras (milhar)' },
                { key: 'percReducao', label: 'Perda de Eficiência', icon: TrendingDown, hint: 'Impacto negativo no fluxo' },
                { key: 'percCapacidade', label: 'Ganho Capacidade', icon: TrendingUp, hint: 'Aumento de braço produtivo' },
              ].map(({ key, label, icon: Icon, hint }) => (
                <div key={key} className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 ml-1">
                    <Icon className="w-3 h-3" /> {label}
                  </Label>
                  <div className="relative group">
                    <Input
                      type="number"
                      value={params[key]}
                      onChange={e => set(key, e.target.value)}
                      className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl font-black text-right pr-10"
                      min={0}
                      max={200}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 opacity-40 group-focus-within:opacity-100 transition-opacity">%</span>
                  </div>
                  <p className="text-[9px] text-slate-400 italic px-1">{hint}</p>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={calcular}
            className="w-full h-14 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest gap-2 shadow-xl shadow-orange-600/20 hover:scale-[1.01] active:scale-95 transition-all border-0"
          >
            <Calculator className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            Processar Projeção
          </Button>

          {/* Resultado */}
          {resultado && (
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16" />

              <div className="flex items-center justify-between mb-6 relative z-10 text-white">
                <h4 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2 italic">
                  <Activity className="w-4 h-4 text-amber-500" /> Outcome de Engenharia
                </h4>
                <Badge className="bg-amber-600 border-0 text-white font-black italic rounded-lg">SIMULADO</Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 relative z-10">
                {[
                  { label: 'Demanda Projetada', value: resultado.novoPrevisto, icon: Target, color: 'text-blue-400' },
                  { label: 'Entrega Projetada', value: resultado.novoRealizado, icon: CheckCircle2, color: 'text-emerald-400' },
                  { label: 'Saldo de Produção', value: (resultado.novoSaldo >= 0 ? `+${resultado.novoSaldo}` : resultado.novoSaldo), icon: Activity, color: statColor(resultado.novoSaldo) },
                  { label: 'Nível de Atendimento', value: `${resultado.percAtendimento}%`, icon: Zap, color: Number(resultado.percAtendimento) >= 90 ? 'text-emerald-400' : 'text-rose-400' },
                  { label: 'Vazão Diária (Média)', value: resultado.mediaDiaria, icon: SlidersHorizontal, color: 'text-slate-400' },
                  { label: 'Ponto Crítico / Gargalo', value: resultado.gargalo, icon: ShieldAlert, color: 'text-orange-400', special: true }
                ].map((stat, i) => (
                  <div key={i} className={cn("space-y-1", stat.special && "col-span-1 md:col-span-1")}>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                    <p className={cn("text-base font-black italic tracking-tight", stat.color)}>
                      {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md border-t dark:border-white/5 flex gap-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-12 rounded-xl border-slate-200 dark:border-white/10 font-black uppercase text-[10px] tracking-widest transition-all"
          >
            Fechar
          </Button>
          <Button
            onClick={handleAplicar}
            className="flex-[1.5] h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-600/20 transition-all border-0"
          >
            Confirmar e Injetar Dados
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}