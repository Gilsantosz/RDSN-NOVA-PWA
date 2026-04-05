import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

export default function FilterBar({ 
  filters, 
  setFilters, 
  letras = [],
  anos = [],
  showStatus = true,
  onClear 
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-3 p-4 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-white/5 backdrop-blur-xl shadow-sm">
      <div className="flex items-center gap-2 flex-1 min-w-full lg:min-w-[200px]">
        <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        <Input
          placeholder="Buscar cliente..."
          value={filters.search || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="border-0 shadow-none focus-visible:ring-0 px-0 bg-transparent dark:text-white dark:placeholder:text-slate-500"
        />
      </div>

      <div className="grid grid-cols-2 lg:flex gap-3">
        <Select 
          value={filters.letra || 'all'} 
          onValueChange={(v) => setFilters(prev => ({ ...prev, letra: v === 'all' ? '' : v }))}
        >
          <SelectTrigger className="w-full lg:w-[120px] bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/10 dark:text-slate-300 rounded-xl">
            <SelectValue placeholder="Letra" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 shadow-2xl bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-xl">
            <SelectItem value="all" className="rounded-lg cursor-pointer">Todas</SelectItem>
            {letras.map(l => (
              <SelectItem key={l} value={l} className="rounded-lg cursor-pointer">{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={filters.ano ? String(filters.ano) : 'all'} 
          onValueChange={(v) => setFilters(prev => ({ ...prev, ano: v === 'all' ? '' : v }))}
        >
          <SelectTrigger className="w-full lg:w-[120px] bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/10 dark:text-slate-300 rounded-xl">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 shadow-2xl bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-xl">
            <SelectItem value="all" className="rounded-lg cursor-pointer">Todos</SelectItem>
            {anos.map(a => (
              <SelectItem key={a} value={String(a)} className="rounded-lg cursor-pointer">20{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showStatus && (
          <Select 
            value={filters.status || 'all'} 
            onValueChange={(v) => setFilters(prev => ({ ...prev, status: v === 'all' ? '' : v }))}
          >
            <SelectTrigger className="w-full lg:w-[140px] col-span-2 bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/10 dark:text-slate-300 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 shadow-2xl bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-xl">
              <SelectItem value="all" className="rounded-lg cursor-pointer">Todos</SelectItem>
              <SelectItem value="RESERVADO" className="rounded-lg cursor-pointer">Reservado</SelectItem>
              <SelectItem value="EM_PRODUCAO" className="rounded-lg cursor-pointer">Em Produção</SelectItem>
              <SelectItem value="PRODUZIDO" className="rounded-lg cursor-pointer">Produzido</SelectItem>
              <SelectItem value="CANCELADO" className="rounded-lg cursor-pointer">Cancelado</SelectItem>
              <SelectItem value="LIBERADO" className="rounded-lg cursor-pointer">Liberado</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onClear}
        className="text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 w-full lg:w-auto rounded-xl transition-colors"
      >
        <X className="w-4 h-4 mr-1" />
        Limpar
      </Button>
    </div>
  );
}