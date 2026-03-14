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
    <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-3 p-4 bg-white rounded-lg border border-slate-200">
      <div className="flex items-center gap-2 flex-1 min-w-full lg:min-w-[200px]">
        <Search className="w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar cliente..."
          value={filters.search || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="border-0 shadow-none focus-visible:ring-0 px-0"
        />
      </div>

      <div className="grid grid-cols-2 lg:flex gap-3">
        <Select 
          value={filters.letra || 'all'} 
          onValueChange={(v) => setFilters(prev => ({ ...prev, letra: v === 'all' ? '' : v }))}
        >
          <SelectTrigger className="w-full lg:w-[120px]">
            <SelectValue placeholder="Letra" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {letras.map(l => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={filters.ano ? String(filters.ano) : 'all'} 
          onValueChange={(v) => setFilters(prev => ({ ...prev, ano: v === 'all' ? '' : v }))}
        >
          <SelectTrigger className="w-full lg:w-[120px]">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {anos.map(a => (
              <SelectItem key={a} value={String(a)}>20{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showStatus && (
          <Select 
            value={filters.status || 'all'} 
            onValueChange={(v) => setFilters(prev => ({ ...prev, status: v === 'all' ? '' : v }))}
          >
            <SelectTrigger className="w-full lg:w-[140px] col-span-2">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="RESERVADO">Reservado</SelectItem>
              <SelectItem value="EM_PRODUCAO">Em Produção</SelectItem>
              <SelectItem value="PRODUZIDO">Produzido</SelectItem>
              <SelectItem value="CANCELADO">Cancelado</SelectItem>
              <SelectItem value="LIBERADO">Liberado</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onClear}
        className="text-slate-500 w-full lg:w-auto"
      >
        <X className="w-4 h-4 mr-1" />
        Limpar
      </Button>
    </div>
  );
}