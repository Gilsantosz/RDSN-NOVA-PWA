import React from 'react';

const STATUS_LABELS = {
  // Numéricos (dashboard genérico)
  1: 'Ativo',
  2: 'Pendente',
  3: 'Concluído',
  4: 'Cancelado',
  'ativo': 'Ativo',
  'pendente': 'Pendente',
  'concluido': 'Concluído',
  'cancelado': 'Cancelado',
  'concluído': 'Concluído',
  // Status RDSN
  'reservado': 'Reservado',
  'em_producao': 'Em Produção',
  'produzido': 'Produzido',
  'baixado': 'Baixado',
  'liberado': 'Liberado',
  'em_andamento': 'Em Andamento',
};

const getThemeClasses = (status) => {
  const s = String(status).toLowerCase();

  switch(s) {
    // ── AMARELO: Reservado (aguardando produção) ──
    case 'reservado':
      return {
        badge: 'bg-amber-400/20 border-amber-400/40 text-amber-700 dark:text-amber-300 hover:bg-amber-400/30 hover:border-amber-400/60',
        dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]',
      };

    // ── AZUL: Em Produção ──
    case 'em_producao':
    case 'em_andamento':
    case '3':
    case 'concluido':
    case 'concluído':
      return {
        badge: 'bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-500/25 hover:border-blue-500/50',
        dot: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.9)]',
      };

    // ── VERDE: Produzido / Baixado ──
    case 'produzido':
    case 'baixado':
    case '1':
    case 'ativo':
      return {
        badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-500/50',
        dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]',
      };

    // ── VERMELHO: Cancelado ──
    case 'cancelado':
    case '4':
      return {
        badge: 'bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-300 hover:bg-red-500/25 hover:border-red-500/50',
        dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]',
      };

    // ── ROXO: Liberado ──
    case 'liberado':
      return {
        badge: 'bg-violet-500/15 border-violet-500/30 text-violet-700 dark:text-violet-300 hover:bg-violet-500/25 hover:border-violet-500/50',
        dot: 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.9)]',
      };

    // ── AMARELO SUAVE: Pendente (genérico) ──
    case '2':
    case 'pendente':
      return {
        badge: 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/40',
        dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
      };

    default:
      return {
        badge: 'bg-gray-500/15 border-gray-500/30 text-gray-700 dark:text-gray-400 hover:bg-gray-500/20 hover:border-gray-500/40',
        dot: 'bg-gray-500 shadow-[0_0_8px_rgba(107,114,128,0.8)]',
      };
  }
};


const StatusBadge = ({ status, className = '' }) => {
  if (!status) return null;
  
  const rawStatus = typeof status === 'string' ? status.toLowerCase() : String(status);
  
  const label = STATUS_LABELS[rawStatus] || 
                (typeof status === 'string' ? status.charAt(0).toUpperCase() + status.slice(1) : status);

  const theme = getThemeClasses(rawStatus);

  return (
    <div 
      className={`group relative inline-flex items-center px-2.5 py-1 rounded-full border text-[0.75rem] font-semibold tracking-wide uppercase overflow-hidden backdrop-blur-sm shadow-sm transition-all duration-300 hover:-translate-y-[1px] hover:shadow-md ${theme.badge} ${className}`}
    >
      <div className="absolute -left-full top-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent -skew-x-[20deg] transition-all duration-700 ease-in-out group-hover:left-[200%] z-0 pointer-events-none" />
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block shrink-0 animate-pulse z-10 ${theme.dot}`} />
      <span className="z-10 relative drop-shadow-[0_1px_1px_rgba(255,255,255,0.2)] dark:drop-shadow-none">{label}</span>
    </div>
  );
};

export default StatusBadge;