import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function SearchBar({
  value,
  onChange,
  searchTerm,
  onSearchChange,
  placeholder = "Buscar...",
  resultCount,
  showResultCount = true,
  className = "",
  disabled = false
}) {
  const currentSearchTerm = value !== undefined ? value : searchTerm;
  const currentOnChange = onChange || onSearchChange;

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
        <Input
          type="text"
          placeholder={placeholder}
          value={currentSearchTerm || ''}
          onChange={(e) => currentOnChange?.(e.target.value)}
          className="h-14 pl-12 pr-12 rounded-2xl bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10 shadow-xl focus:ring-blue-500/20 text-base"
          disabled={disabled}
          autoComplete="off"
        />
        {currentSearchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 h-10 w-10 text-slate-400 hover:text-slate-600 rounded-xl"
            onClick={() => currentOnChange?.('')}
            title="Limpar busca"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>
      {showResultCount && searchTerm && resultCount !== undefined && (
        <p className="text-xs text-slate-500 mt-1">
          {resultCount} resultado{resultCount !== 1 ? 's' : ''} encontrado{resultCount !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}