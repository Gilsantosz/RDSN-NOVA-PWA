import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function IntervaloBadge({ inicio, fim, variant = 'default', size = 'default', className }) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  const variantClasses = {
    default: 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300',
    primary: 'bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-800 dark:to-slate-950 text-white border-slate-800 dark:border-slate-700',
    success: 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/40 border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-300',
    warning: 'bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/40 dark:to-amber-800/40 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300'
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-lg border-2 font-mono font-semibold",
      sizeClasses[size],
      variantClasses[variant],
      className
    )}>
      <span className="tabular-nums">{inicio?.toLocaleString()}</span>
      <ArrowRight className={cn("flex-shrink-0", size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4')} />
      <span className="tabular-nums">{fim?.toLocaleString()}</span>
    </div>
  );
}