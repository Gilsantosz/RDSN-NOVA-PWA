import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function SearchBar({ 
  searchTerm, 
  onSearchChange, 
  placeholder = "Buscar...",
  resultCount,
  showResultCount = true,
  className = "",
  disabled = false
}) {
  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
          disabled={disabled}
          autoComplete="off"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 h-8 w-8"
            onClick={() => onSearchChange('')}
            title="Limpar busca"
          >
            <X className="w-4 h-4" />
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