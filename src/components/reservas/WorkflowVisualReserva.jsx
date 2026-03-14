import React from 'react';
import { motion } from 'framer-motion';
import { CircleCheck, Circle, Clock, Package, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const etapas = [
  { key: 'RESERVADO', label: 'Reservado', icon: Circle },
  { key: 'EM_PRODUCAO', label: 'Em Produção', icon: Clock },
  { key: 'BAIXADO', label: 'Baixado', icon: Package },
  { key: 'PRODUZIDO', label: 'Produzido', icon: CircleCheck }
];

export default function WorkflowVisualReserva({ status, quantidade, quantidadeBaixada }) {
  const statusAtual = status === 'CANCELADO' || status === 'LIBERADO' ? status : 
    (quantidade === quantidadeBaixada && quantidade > 0) ? 'PRODUZIDO' :
    (quantidadeBaixada > 0) ? 'EM_PRODUCAO' : 'RESERVADO';

  const isCancelado = status === 'CANCELADO';
  const isLiberado = status === 'LIBERADO';
  const progressoPercentual = quantidade > 0 ? (quantidadeBaixada / quantidade) * 100 : 0;

  if (isCancelado || isLiberado) {
    return (
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            isCancelado ? "bg-red-100" : "bg-orange-100"
          )}>
            <XCircle className={cn("w-5 h-5", isCancelado ? "text-red-600" : "text-orange-600")} />
          </div>
          <div>
            <p className={cn(
              "font-semibold",
              isCancelado ? "text-red-900" : "text-orange-900"
            )}>
              {isCancelado ? 'Reserva Cancelada' : 'Reserva Liberada'}
            </p>
            <p className="text-xs text-slate-600">
              {isCancelado 
                ? 'Esta reserva foi cancelada e a numeração liberada'
                : 'Numeração disponível para reutilização'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 border border-slate-200">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Progresso da Produção</span>
          <span className="text-sm font-bold text-slate-900">
            {quantidadeBaixada} / {quantidade} unidades
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
            initial={{ width: 0 }}
            animate={{ width: `${progressoPercentual}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">{Math.round(progressoPercentual)}% concluído</p>
      </div>

      <div className="relative">
        <div className="flex justify-between items-center">
          {etapas.map((etapa, idx) => {
            const isAtual = etapa.key === statusAtual;
            const indexAtual = etapas.findIndex(e => e.key === statusAtual);
            const isConcluido = idx < indexAtual;
            const Icon = etapa.icon;

            return (
              <div key={etapa.key} className="flex-1 flex flex-col items-center relative">
                {/* Linha conectora */}
                {idx < etapas.length - 1 && (
                  <div className="absolute top-5 left-[50%] w-full h-0.5 bg-slate-200 -z-10">
                    <motion.div 
                      className="h-full bg-blue-600"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: isConcluido || (isAtual && idx < indexAtual) ? '100%' : '0%' 
                      }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                )}

                {/* Ícone da etapa */}
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: isAtual ? 1.1 : 1 }}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-sm mb-2",
                    isConcluido ? "bg-blue-600 border-blue-600" :
                    isAtual ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-200" :
                    "bg-white border-slate-200"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5",
                    isConcluido || isAtual ? "text-white" : "text-slate-400"
                  )} />
                </motion.div>

                {/* Label */}
                <p className={cn(
                  "text-xs font-medium text-center",
                  isAtual ? "text-blue-900" : isConcluido ? "text-slate-700" : "text-slate-400"
                )}>
                  {etapa.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}