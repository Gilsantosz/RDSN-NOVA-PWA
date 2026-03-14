import React from 'react';
import { Activity } from 'lucide-react';

/**
 * Placeholder para a visualização de carga por célula
 */
export default function CellLoadAnalysis({ ops: _ops = [], producoes: _producoes = [] }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center bg-white/50 dark:bg-slate-900/20 backdrop-blur-sm">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                <Activity className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 italic">Análise de Carga</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs text-sm">
                O sistema de análise de capacidade por terminal de coleta está em fase de implementação.
            </p>
            <div className="mt-6 flex gap-3">
                <div className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest italic shadow-lg">Integridade Alpha</div>
            </div>
        </div>
    );
}
