import { Check, TrendingUp } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const origemIcons = {
  numeracao_livre: { icon: '📦', label: 'Numeração Livre', descricao: 'Reutiliza números liberados anteriormente, reduzindo fragmentação' },
  sequencia_nova: { icon: '🔢', label: 'Continuação Sequencial', descricao: 'Continua naturalmente após o último número utilizado' },
  gap_entre_reservas: { icon: '🔍', label: 'Lacuna Entre Reservas', descricao: 'Preenche espaços existentes entre reservas ativas' }
};

export default function AlternativasAlocacao({
  alternativas,
  intervaloSelecionado,
  onSelectAlternativa,
  formData,
  className
}) {
  if (!alternativas || alternativas.length === 0) {
    return null;
  }

  const quantidadeReservada = Number(formData?.quantidade) || 0;

  if (alternativas.length <= 1) {
    return null;
  }

  return (
    <div className={cn("space-y-6 bg-slate-100/50 dark:bg-slate-900/30 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-inner", className)}>
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest italic">Análise Preditiva de Alocação</h3>
            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{alternativas.length} ROTAS DISPONÍVEIS</p>
          </div>
        </div>
        <Badge variant="outline" className="hidden sm:flex text-[8px] font-black uppercase tracking-widest text-slate-400 border-slate-200 dark:border-white/10 px-3 py-1 rounded-full">Interruptor de Sequência Ativo</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {alternativas.map((alt, idx) => {
          const origem = origemIcons[alt.origem] || { icon: '❓', label: alt.origem, descricao: 'Alternativa disponível' };
          const isSelected = intervaloSelecionado?.numero_inicial === alt.numero_inicial;
          const desperdicio = alt.quantidadeDisponivel - quantidadeReservada;

          return (
            <div
              key={idx}
              className={cn(
                "p-6 rounded-3xl border-2 transition-all cursor-pointer group relative overflow-hidden",
                isSelected
                  ? "bg-white dark:bg-slate-800 border-blue-500 shadow-2xl shadow-blue-500/10 scale-[1.01] z-10"
                  : "bg-white dark:bg-slate-900/50 border-transparent hover:border-slate-300 dark:hover:border-white/10 hover:shadow-xl transition-all"
              )}
              onClick={() => onSelectAlternativa && onSelectAlternativa(alt)}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner transition-transform group-hover:-rotate-3",
                    isSelected ? "bg-blue-50 dark:bg-blue-900/20" : "bg-slate-50 dark:bg-slate-800"
                  )}>
                    {origem.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <p className={cn(
                        "font-mono text-2xl font-black tracking-tighter leading-none",
                        isSelected ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white"
                      )}>
                        {alt.numero_inicial.toLocaleString()} <span className="opacity-20 mx-1">→</span> {alt.numero_final.toLocaleString()}
                      </p>
                      <div className="flex gap-2">
                        {idx === 0 && (
                          <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-[8px] tracking-widest border-0 py-1">⭐ OPTIMAL</Badge>
                        )}
                        {alt.origem === 'numeracao_livre' && (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[8px] tracking-widest border-0 py-1">♻️ ECO-STOCK</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 truncate">{origem.label}</p>
                      <div className="w-1 h-1 rounded-full bg-slate-300" />
                      <p className="text-[9px] font-bold text-slate-400 italic truncate max-w-md">{alt.motivo}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-100 dark:border-white/10 pt-4 md:pt-0 md:pl-6">
                  {/* Score Circular Simulado */}
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-12 h-12 -rotate-90">
                      <circle cx="24" cy="24" r="20" className="stroke-slate-100 dark:stroke-white/5 fill-none" strokeWidth="4" />
                      <circle
                        cx="24" cy="24" r="20"
                        className={cn(
                          "fill-none transition-all duration-1000 ease-out",
                          alt.score >= 80 ? "stroke-emerald-500" : alt.score >= 50 ? "stroke-blue-500" : "stroke-amber-500"
                        )}
                        strokeWidth="4"
                        strokeDasharray="125.6"
                        strokeDashoffset={125.6 - (125.6 * alt.score) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-black text-slate-900 dark:text-white leading-none">{alt.score}</span>
                  </div>

                  <div className="flex-1 md:flex-none">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-right md:text-left">Fragmentação</p>
                    <Badge className={cn(
                      "font-black text-[9px] px-3 py-1 rounded-lg border-0 shadow-sm float-right md:float-none",
                      desperdicio === 0 ? "bg-emerald-500/10 text-emerald-600" :
                        desperdicio < 100 ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"
                    )}>
                      {desperdicio === 0 ? 'ENCAIXE ZERO' : `+${desperdicio.toLocaleString()} GAP`}
                    </Badge>
                  </div>

                  {isSelected && (
                    <div className="bg-blue-600 text-white rounded-full p-2 shadow-xl shadow-blue-500/40 animate-in zoom-in duration-300">
                      <Check className="w-4 h-4 stroke-[4px]" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-center">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] opacity-40 italic">Sistema RDSN • Algoritmo de Alocação v4.2 Pro Ativo</p>
      </div>
    </div>
  );
}