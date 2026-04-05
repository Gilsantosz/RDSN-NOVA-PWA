// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { cn } from "@/lib/utils";
import { Zap, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, AlertTriangle, Factory } from 'lucide-react';
import PCPSimulacaoPanel from '@/components/pcp/PCPSimulacaoPanel.jsx';
import PCPSetorGuard, { usePCPSetor } from '@/components/pcp/PCPSetorGuard';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function PCPSimulacaoPlano() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear() % 100);
  const [showPanel, setShowPanel] = useState(false);
  const [simulResult, setSimulResult] = useState(null);
  const { bloqueado, nomeSetor, setorAtivo } = usePCPSetor();

  const totalDias = new Date(ano + 2000, mes, 0).getDate();
  const dias = Array.from({ length: totalDias }, (_, i) => i + 1);

  const { data: ops = [] } = useQuery({
    queryKey: ['pcp-ops-sim', mes, ano, setorAtivo],
    queryFn: () => rdsn.entities.PCPOrdemProducao.filter({ mes, ano, status: 'Ativo', setor_id: setorAtivo }, 'item_num', 100),
    enabled: !bloqueado
  });

  const { data: producoes = [] } = useQuery({
    queryKey: ['pcp-prod-sim', mes, ano, setorAtivo],
    queryFn: () => rdsn.entities.PCPProducaoDiaria.filter({ mes, ano, setor_id: setorAtivo }, null, 5000),
    enabled: !bloqueado && ops.length > 0
  });

  const producaoMap = useMemo(() => {
    const m = {};
    for (const p of producoes) m[`${p.op_id}-${p.dia}`] = p;
    return m;
  }, [producoes]);

  const navMes = (dir) => {
    let nm = mes + dir, na = ano;
    if (nm > 12) { nm = 1; na++; }
    if (nm < 1) { nm = 12; na--; }
    setMes(nm); setAno(na);
  };

  const baseStats = useMemo(() => {
    const opsNormais = ops.filter(op => op.tipo === 'Normal');
    let totalPrev = 0, totalReal = 0;
    for (const op of opsNormais) {
      for (const d of dias) {
        totalPrev += producaoMap[`${op.id}-${d}`]?.previsto || 0;
        totalReal += producaoMap[`${op.id}-${d}`]?.realizado || 0;
      }
    }
    const saldo = totalReal - totalPrev;
    const perc = totalPrev > 0 ? ((totalReal / totalPrev) * 100).toFixed(1) : '0.0';
    return { totalPrev, totalReal, saldo, perc, opsCount: opsNormais.length };
  }, [ops, producoes, dias]);

  return (
    <PCPSetorGuard action="simular o planejamento PCP">
      <div className="p-4 md:p-6 min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(245,158,11,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all hover:scale-105 active:scale-95 group border border-amber-400/20">
                <Zap className="w-8 h-8 sm:w-6 sm:h-6 text-white group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Simulação de <span className="text-amber-500 dark:text-amber-400">Planejamento</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                  Análise • Cenários • <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-black leading-none uppercase"><Factory className="w-3.5 h-3.5" />{nomeSetor}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center">
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2 shadow-sm transition-colors">
                <button onClick={() => navMes(-1)} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"><ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" /></button>
                <span className="font-black text-slate-900 dark:text-white min-w-[140px] text-center text-xs uppercase tracking-widest">{MESES[mes - 1]} 20{ano}</span>
                <button onClick={() => navMes(1)} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"><ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" /></button>
              </div>

              <Button
                onClick={() => setShowPanel(true)}
                className="h-12 px-6 rounded-2xl bg-slate-900 dark:bg-amber-600 text-white font-black uppercase text-xs tracking-widest gap-2 shadow-xl hover:scale-[1.02] active:scale-95 transition-all border-0 shadow-amber-500/20"
              >
                <Zap className="w-4 h-4" /> Iniciar Simulação
              </Button>
            </div>
          </div>
        </div>

        {/* Base Atual Premium */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4 ml-2">
            <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600 animate-pulse" />
            <h2 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80">
              Cenário Base — {MESES[mes - 1]} 20{ano}
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            <PremiumCard title="Total Previsto" icon={TrendingUp} iconColor="#3b82f6">
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{baseStats.totalPrev.toLocaleString()}</p>
            </PremiumCard>
            <PremiumCard title="Total Realizado" icon={TrendingUp} iconColor="#10b981">
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{baseStats.totalReal.toLocaleString()}</p>
            </PremiumCard>
            <PremiumCard title="Saldo Mensal" icon={baseStats.saldo >= 0 ? TrendingUp : TrendingDown} iconColor={baseStats.saldo >= 0 ? "#10b981" : "#ef4444"}>
              <p className={cn("text-3xl font-black tracking-tighter italic", baseStats.saldo >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {baseStats.saldo >= 0 ? `+${baseStats.saldo}` : baseStats.saldo.toLocaleString()}
              </p>
            </PremiumCard>
            <PremiumCard title="% Atendimento" icon={AlertTriangle} iconColor={Number(baseStats.perc) >= 90 ? "#10b981" : "#ef4444"}>
              <p className={cn("text-3xl font-black tracking-tighter italic", Number(baseStats.perc) >= 90 ? "text-emerald-600" : "text-rose-600")}>
                {baseStats.perc}%
              </p>
            </PremiumCard>
            <PremiumCard title="OPs Ativas" icon={Zap} iconColor="#6366f1">
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{baseStats.opsCount}</p>
            </PremiumCard>
          </div>
        </div>

        {/* Resultado Simulação Premium */}
        {simulResult && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4 ml-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Resultado da Simulação
              </h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
              <PremiumCard title="Novo Previsto" icon={TrendingUp} iconColor="#3b82f6" className="bg-amber-600/5 border-amber-500/20 shadow-amber-500/5">
                <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{simulResult.novoPrevisto?.toLocaleString()}</p>
              </PremiumCard>
              <PremiumCard title="Novo Realizado" icon={TrendingUp} iconColor="#10b981" className="bg-amber-600/5 border-amber-500/20 shadow-amber-500/5">
                <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{simulResult.novoRealizado?.toLocaleString()}</p>
              </PremiumCard>
              <PremiumCard title="Novo Saldo" icon={simulResult.novoSaldo >= 0 ? TrendingUp : TrendingDown} iconColor={simulResult.novoSaldo >= 0 ? "#10b981" : "#ef4444"} className="bg-amber-600/5 border-amber-500/20 shadow-amber-500/5">
                <p className={cn("text-3xl font-black tracking-tighter italic", simulResult.novoSaldo >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {simulResult.novoSaldo >= 0 ? `+${simulResult.novoSaldo}` : simulResult.novoSaldo?.toLocaleString()}
                </p>
              </PremiumCard>
              <PremiumCard title="% Atendimento" icon={AlertTriangle} iconColor={Number(simulResult.percAtendimento) >= 90 ? "#10b981" : "#ef4444"} className="bg-amber-600/5 border-amber-500/20 shadow-amber-500/5">
                <p className={cn("text-3xl font-black tracking-tighter italic", Number(simulResult.percAtendimento) >= 90 ? "text-emerald-600" : "text-rose-600")}>
                  {simulResult.percAtendimento}%
                </p>
              </PremiumCard>
              <PremiumCard title="Gargalo" icon={Zap} iconColor="#f59e0b" className="bg-amber-600/5 border-amber-500/20 shadow-amber-500/5">
                <p className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tighter italic">{simulResult.gargalo || '-'}</p>
              </PremiumCard>
            </div>
            <div className="mt-4 p-6 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-500/20 rounded-3xl text-xs text-amber-800 dark:text-amber-400/80 transition-colors backdrop-blur-xl shadow-inner italic">
              <strong>Parâmetros de Simulação:</strong> Aumento de demanda: <span className="font-bold">{simulResult.params?.percAumento}%</span> | OPs extra: <span className="font-bold">{simulResult.params?.opsExtra}</span> | Redução eficiência: <span className="font-bold">{simulResult.params?.percReducao}%</span> | Capacidade: <span className="font-bold">{simulResult.params?.percCapacidade}%</span>
            </div>
          </div>
        )}

        {/* Instrução Premium */}
        {!simulResult && (
          <PremiumCard className="border-dashed border-2 border-amber-300 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-900/10 transition-colors py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <Zap className="w-12 h-12 text-amber-400 dark:text-amber-600 mb-4" />
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase italic tracking-tighter">Simule cenários de produção</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md italic font-medium">
                Clique em <strong className="text-amber-600">"Iniciar Simulação"</strong> para abrir o painel de parâmetros e ver como diferentes cenários afetam o planejamento mensal, sem alterar nenhum dado real.
              </p>
            </div>
          </PremiumCard>
        )}

        {showPanel && (
          <PCPSimulacaoPanel
            mes={mes} ano={ano}
            ops={ops.filter(o => o.tipo === 'Normal')}
            producaoMap={producaoMap}
            dias={dias}
            onClose={() => setShowPanel(false)}
            onResult={(r) => { setSimulResult(r); setShowPanel(false); }}
          />
        )}
      </div>
    </PCPSetorGuard>
  );
}