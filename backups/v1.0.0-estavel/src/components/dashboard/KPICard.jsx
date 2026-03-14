import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendUp,
  variant = 'default'
}) {
  const variants = {
    default: 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm hover:shadow-xl',
    primary: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-white/5 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 shadow-2xl',
    success: 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 dark:from-emerald-950 dark:to-slate-900 dark:border-emerald-800/30',
    warning: 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 dark:from-amber-950 dark:to-slate-900 dark:border-amber-800/30',
    danger: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 dark:from-red-950 dark:to-slate-900 dark:border-red-800/30',
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
      variants[variant]
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className={cn(
              "text-xs font-black tracking-widest uppercase mb-1",
              variant === 'primary' ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'
            )}>
              {title}
            </p>
            <p className={cn(
              "text-4xl font-black tracking-tighter transition-all",
              variant === 'primary' ? 'text-white' : 'text-slate-900 dark:text-slate-50'
            )}>
              {value}
            </p>
            {subtitle && (
              <p className={cn(
                "text-sm",
                variant === 'primary' ? 'text-slate-400' : 'text-slate-500'
              )}>
                {subtitle}
              </p>
            )}
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium",
                trendUp ? 'text-emerald-600' : 'text-red-600'
              )}>
                <span>{trendUp ? '↑' : '↓'}</span>
                <span>{trend}</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn(
              "p-3 rounded-2xl transition-transform group-hover:scale-110",
              variant === 'primary'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            )}>
              <Icon className="w-8 h-8" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}