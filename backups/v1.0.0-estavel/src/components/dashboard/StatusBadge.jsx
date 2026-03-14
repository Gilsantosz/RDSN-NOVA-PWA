import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  RESERVADO: {
    label: 'Reservado',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50'
  },
  EM_PRODUCAO: {
    label: 'Em Produção',
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50'
  },
  BAIXADO: {
    label: 'Baixado',
    className: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50'
  },
  PRODUZIDO: {
    label: 'Produzido',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50'
  },
  CANCELADO: {
    label: 'Cancelado',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'
  },
  LIBERADO: {
    label: 'Liberado',
    className: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
  },
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const config = statusConfig[status] || statusConfig.RESERVADO;

  return (
    <Badge
      variant="outline"
      className={cn("font-black uppercase text-[10px] tracking-widest px-2.5 py-0.5 border-0 shadow-sm", config.className)}
    >
      {config.label}
    </Badge>
  );
}