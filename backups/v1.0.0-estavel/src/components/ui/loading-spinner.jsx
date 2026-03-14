import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ size = 'default', className, message }) {
  const sizes = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <Loader2 className={cn("animate-spin text-slate-600", sizes[size])} />
      {message && (
        <p className="text-sm text-slate-600 animate-pulse">{message}</p>
      )}
    </div>
  );
}

export function LoadingPage({ message = "Carregando..." }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="absolute inset-0 blur-xl bg-gradient-to-r from-blue-400 to-cyan-400 opacity-20 animate-pulse" />
          <Loader2 className="relative w-16 h-16 animate-spin text-slate-700 mx-auto" />
        </div>
        <p className="text-lg font-medium text-slate-700">{message}</p>
      </div>
    </div>
  );
}

export function LoadingOverlay({ message = "Processando..." }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-4 max-w-sm mx-4">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
        <p className="text-center font-medium text-slate-900">{message}</p>
      </div>
    </div>
  );
}