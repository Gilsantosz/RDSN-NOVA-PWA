import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * PremiumCard Component
 * Implements the system's premium industrial design language.
 */
export function PremiumCard({
    title,
    icon: Icon,
    badge = null,
    action = null,
    children,
    className = "",
    headerClassName = "",
    contentClassName = "",
    noPadding = false,
    iconColor = "#3b82f6"
}) {
    return (
        <Card className={cn(
            "border border-slate-200 dark:border-0 shadow-2xl bg-white dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem]",
            className
        )}>
            {(title || Icon) && (
                <CardHeader className={cn(
                    "bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-white/5 p-4 sm:p-5 flex flex-row items-center justify-between",
                    headerClassName
                )}>
                    <div className="flex items-center gap-3">
                        {Icon && (
                            <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-inner transition-transform"
                                style={{
                                    backgroundColor: `${iconColor}15`, // 15 = ~8% opacity
                                    borderColor: `${iconColor}30` // 30 = ~20% opacity
                                }}
                            >
                                <Icon className="w-4 h-4" style={{ color: iconColor }} />
                            </div>
                        )}
                        {title && (
                            <CardTitle className="text-sm font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">
                                {title}
                            </CardTitle>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {badge}
                        {action}
                    </div>
                </CardHeader>
            )}
            <CardContent className={cn(noPadding ? "p-0" : "p-6", contentClassName)}>
                {children}
            </CardContent>
        </Card>
    );
}
