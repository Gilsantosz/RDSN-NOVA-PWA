import React from 'react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

/**
 * PremiumDashboardCell Component
 * Specialized for dashboard key metrics and small charts with advanced motion and glassmorphism.
 */
export function PremiumDashboardCell({
    title,
    value,
    subValue,
    icon: Icon,
    trend = null,
    trendType = 'up', // 'up', 'down', 'neutral'
    color = 'blue',
    className = "",
    children = null,
    delay = 0,
    onClick = null
}) {
    const colorVariants = {
        blue: {
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            text: 'text-blue-500',
            glow: 'shadow-blue-500/10',
            gradient: 'from-blue-500/20 to-indigo-500/5'
        },
        emerald: {
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
            text: 'text-emerald-500',
            glow: 'shadow-emerald-500/10',
            gradient: 'from-emerald-500/20 to-teal-500/5'
        },
        amber: {
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            text: 'text-amber-500',
            glow: 'shadow-amber-500/10',
            gradient: 'from-amber-500/20 to-orange-500/5'
        },
        rose: {
            bg: 'bg-rose-500/10',
            border: 'border-rose-500/20',
            text: 'text-rose-500',
            glow: 'shadow-rose-500/10',
            gradient: 'from-rose-500/20 to-red-500/5'
        },
        slate: {
            bg: 'bg-slate-500/10',
            border: 'border-slate-500/20',
            text: 'text-slate-500',
            glow: 'shadow-slate-500/10',
            gradient: 'from-slate-500/20 to-slate-700/5'
        }
    };

    const theme = colorVariants[color] || colorVariants.blue;

    return (
        <motion.div
            onClick={onClick}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
                duration: 0.8, 
                delay, 
                ease: [0.16, 1, 0.3, 1] 
            }}
            whileHover={{ y: -4 }}
            className={cn(
                "group relative p-6 rounded-[2.5rem] overflow-hidden transition-all duration-500",
                "bg-white dark:bg-slate-900/40 backdrop-blur-3xl border border-slate-200 dark:border-white/5",
                "shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-none hover:shadow-[0_24px_48px_rgba(0,0,0,0.1)] dark:hover:shadow-blue-500/5",
                onClick && "cursor-pointer",
                className
            )}
        >
            {/* Hover Glow Effect */}
            <div className={cn(
                "absolute -top-24 -right-24 w-48 h-48 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000",
                theme.bg
            )} />

            <div className="relative z-10 space-y-4">
                <div className="flex items-start justify-between">
                    <div className={cn(
                        "p-4 rounded-[1.25rem] ring-1 ring-inset shadow-lg",
                        theme.bg,
                        theme.border,
                        theme.text
                    )}>
                        <Icon size={24} strokeWidth={2.5} />
                    </div>
                    
                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-wider",
                            trendType === 'up' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                            trendType === 'down' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                            "bg-slate-500/10 border-slate-500/20 text-slate-500"
                        )}>
                            <span>{trend}</span>
                        </div>
                    )}
                </div>

                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 mb-1">
                        {title}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
                            {value}
                        </h3>
                        {subValue && (
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                                {subValue}
                            </span>
                        )}
                    </div>
                </div>

                {children && (
                    <div className="pt-2">
                        {children}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
