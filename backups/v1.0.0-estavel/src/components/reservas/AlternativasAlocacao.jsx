import React from 'react';
import { Check, AlertCircle, Zap, TrendingUp } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  // Mostrar apenas se houver mais de uma alternativa (não mostrar se só tem a opção padrão)
  if (alternativas.length <= 1) {
    return null;
  }

  return (
    <div className={cn("space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          Outras Opções de Numeração ({alternativas.length})
        </h3>
        <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded">👆 Clique para alterar</span>
      </div>

      <div className="space-y-2">
        {alternativas.map((alt, idx) => {
          const origem = origemIcons[alt.origem] || { icon: '❓', label: alt.origem, descricao: 'Alternativa disponível' };
          const isSelected = intervaloSelecionado?.numero_inicial === alt.numero_inicial;
          const quantidadeIntervalo = alt.numero_final - alt.numero_inicial + 1;
          const desperdicio = alt.quantidadeDisponivel - quantidadeReservada;

          return (
            <div
              key={idx}
              className={cn(
                "p-4 rounded-lg border-2 transition-all cursor-pointer group",
                isSelected
                  ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 shadow-md"
                  : "bg-slate-50 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30"
              )}
              onClick={() => onSelectAlternativa && onSelectAlternativa(alt)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
               <div className="flex items-center gap-3 flex-1">
                 <span className="text-2xl">{origem.icon}</span>
                 <div className="flex-1">
                   <div className="flex items-center gap-2 mb-1 flex-wrap">
                     <p className="font-bold text-lg text-slate-900">
                       {alt.numero_inicial.toLocaleString()} - {alt.numero_final.toLocaleString()}
                     </p>
                     {idx === 0 && (
                       <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                         ⭐ Melhor Opção
                       </Badge>
                     )}
                     {alt.origem === 'numeracao_livre' && (
                       <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                         ♻️ Reutilização
                       </Badge>
                     )}
                   </div>
                   <p className="text-sm font-semibold text-slate-700">{origem.label}</p>
                   <p className="text-xs text-slate-500 mt-0.5">{origem.descricao}</p>
                 </div>
               </div>
               <div className="flex items-center gap-2 flex-col flex-shrink-0">
                 {isSelected && (
                   <div className="bg-emerald-100 rounded-full p-1">
                     <Check className="w-5 h-5 text-emerald-600" />
                   </div>
                 )}
                 <Badge className={cn(
                   "font-bold text-base px-3 py-1",
                   alt.score >= 80 ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white" :
                   alt.score >= 60 ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white" :
                   alt.score >= 40 ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white" :
                   "bg-slate-300 text-slate-700"
                 )}>
                   {alt.score}
                 </Badge>
               </div>
              </div>

              {/* Detalhes */}
              <div className="space-y-2 text-xs">
                <p className="text-slate-600 italic">{alt.motivo}</p>
                
                {/* Grid comparativo de indicadores */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  {/* Eficiência */}
                  <div className="bg-white px-2 py-1.5 rounded border border-slate-200">
                    <p className="text-xs text-slate-500 mb-0.5">Eficiência</p>
                    <div className="flex items-center gap-1">
                      <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-green-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, (alt.score / 100) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">{alt.score}%</span>
                    </div>
                  </div>

                  {/* Desperdício */}
                  <div className="bg-white px-2 py-1.5 rounded border border-slate-200">
                    <p className="text-xs text-slate-500 mb-0.5">Aproveitamento</p>
                    <p className={cn(
                      "text-xs font-semibold",
                      desperdicio === 0 ? "text-green-600" :
                      desperdicio < quantidadeReservada * 0.2 ? "text-emerald-600" :
                      desperdicio < quantidadeReservada * 0.5 ? "text-amber-600" :
                      "text-orange-600"
                    )}>
                      {desperdicio === 0 ? '✓ Perfeito' : 
                       desperdicio < quantidadeReservada * 0.2 ? '✓ Ótimo' :
                       desperdicio < quantidadeReservada * 0.5 ? '⚠ Bom' :
                       `⚠ +${desperdicio.toLocaleString()}`
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}