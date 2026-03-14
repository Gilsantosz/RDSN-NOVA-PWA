import React from 'react';
import { Clock } from 'lucide-react';

/**
 * Placeholder para a visualização de Timeline/Gantt
 */
export default function TimelineView({ items: _items = [] }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center bg-white/50 dark:bg-slate-900/20 backdrop-blur-sm">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 italic">Visualização de Cronograma</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs text-sm">
                A visualização em linha do tempo está sendo otimizada para o novo motor de agendamento.
            </p>
            <div className="mt-6 flex gap-3">
                <div className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest italic shadow-lg">Em Breve</div>
            </div>
        </div>
    );
}
