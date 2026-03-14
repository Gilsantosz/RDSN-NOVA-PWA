import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  RESERVADO: {
    label: 'Reservado',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(59,130,246,0.1)]'
  },
  EM_PRODUCAO: {
    label: 'Em Produção',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/40 backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.15)] animate-pulse-gentle'
  },
  BAIXADO: {
    label: 'Baixado',
    className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(99,102,241,0.1)]'
  },
  PRODUZIDO: {
    label: 'Produzido',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.1)]'
  },
  CANCELADO: {
    label: 'Cancelado',
    className: 'bg-rose-500/10 text-rose-400 border-rose-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(244,63,94,0.1)]'
  },
  LIBERADO: {
    label: 'Liberado',
    className: 'bg-slate-500/10 text-slate-400 border-slate-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(100,116,139,0.1)]'
  },
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const config = statusConfig[status] || statusConfig.RESERVADO;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-black uppercase text-[9px] tracking-[0.15em] px-2.5 py-0.5 transition-all duration-300",
        config.className
      )}
    >
      <span className="relative z-10">{config.label}</span>
    </Badge>
  );
}