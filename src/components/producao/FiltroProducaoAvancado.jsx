import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, X, Calendar as CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function FiltroProducaoAvancado({ 
  filters, 
  setFilters, 
  reservas = [],
  onClear 
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  // Extrair sugestões únicas dos dados
  const sugestoes = useMemo(() => ({
    clientes: [...new Set(reservas.map(r => r.cliente).filter(Boolean))].sort(),
    codigos: [...new Set(reservas.map(r => r.codigo_produto).filter(Boolean))].sort(),
    modelos: [...new Set(reservas.map(r => r.modelo).filter(Boolean))].sort(),
  }), [reservas]);

  // Filtrar sugestões conforme digita
  const clientesFiltrados = filters.cliente 
    ? sugestoes.clientes.filter(c => c.toLowerCase().includes(filters.cliente.toLowerCase()))
    : sugestoes.clientes;

  const codigosFiltrados = filters.codigoProduto
    ? sugestoes.codigos.filter(c => c.toLowerCase().includes(filters.codigoProduto.toLowerCase()))
    : sugestoes.codigos;

  const modelosFiltrados = filters.modelo
    ? sugestoes.modelos.filter(m => m.toLowerCase().includes(filters.modelo.toLowerCase()))
    : sugestoes.modelos;

  const AutocompleteField = ({ value, onChange, suggestions, placeholder, fieldKey }) => (
    <div className="relative flex-1 min-w-[200px]">
      <input
        type="text"
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => {
          onChange(e.target.value);
          setOpenDropdown(e.target.value ? fieldKey : null);
        }}
        onFocus={() => setOpenDropdown(fieldKey)}
        onBlur={() => setTimeout(() => setOpenDropdown(null), 150)}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pr-8"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {openDropdown === fieldKey && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto mt-1">
          {suggestions.slice(0, 50).map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                onChange(item);
                setOpenDropdown(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm text-slate-700 border-b border-slate-100 last:border-b-0"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const hasActiveFilters = filters.cliente || filters.codigoProduto || filters.modelo || 
    filters.status || filters.dataInicio || filters.dataFim;

  return (
    <div className="space-y-3">
      {/* Barra Principal */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <AutocompleteField
            value={filters.cliente}
            onChange={(v) => setFilters(prev => ({ ...prev, cliente: v }))}
            suggestions={clientesFiltrados}
            placeholder="Buscar por cliente..."
            fieldKey="cliente"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={showAdvanced ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex-shrink-0"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros Avançados
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-slate-500 flex-shrink-0"
            >
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Filtros Avançados */}
      {showAdvanced && (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
          {/* Linha 1: Código e Modelo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Código do Produto</label>
              <AutocompleteField
                value={filters.codigoProduto}
                onChange={(v) => setFilters(prev => ({ ...prev, codigoProduto: v }))}
                suggestions={codigosFiltrados}
                placeholder="Ex: A26LM, A26L..."
                fieldKey="codigo"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Modelo</label>
              <AutocompleteField
                value={filters.modelo}
                onChange={(v) => setFilters(prev => ({ ...prev, modelo: v }))}
                suggestions={modelosFiltrados}
                placeholder="Filtrar por modelo..."
                fieldKey="modelo"
              />
            </div>
          </div>

          {/* Linha 2: Status e Datas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
              <Select 
                value={filters.status || 'all'} 
                onValueChange={(v) => setFilters(prev => ({ ...prev, status: v === 'all' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="RESERVADO">Reservado</SelectItem>
                  <SelectItem value="EM_PRODUCAO">Em Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Data Criação (Início)</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dataInicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dataInicio ? format(new Date(filters.dataInicio), "dd/MM/yyyy", { locale: ptBR }) : "Selecione..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dataInicio ? new Date(filters.dataInicio) : undefined}
                    onSelect={(date) => setFilters(prev => ({ 
                      ...prev, 
                      dataInicio: date ? date.toISOString().split('T')[0] : '' 
                    }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Data Criação (Fim)</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dataFim && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dataFim ? format(new Date(filters.dataFim), "dd/MM/yyyy", { locale: ptBR }) : "Selecione..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dataFim ? new Date(filters.dataFim) : undefined}
                    onSelect={(date) => setFilters(prev => ({ 
                      ...prev, 
                      dataFim: date ? date.toISOString().split('T')[0] : '' 
                    }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Resumo de Filtros Ativos */}
          {hasActiveFilters && (
            <div className="pt-3 border-t border-slate-200">
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-medium text-slate-600">Filtros ativos:</span>
                {filters.cliente && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-md">
                    Cliente: {filters.cliente}
                    <button onClick={() => setFilters(prev => ({ ...prev, cliente: '' }))} className="hover:text-emerald-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.codigoProduto && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-md">
                    Código: {filters.codigoProduto}
                    <button onClick={() => setFilters(prev => ({ ...prev, codigoProduto: '' }))} className="hover:text-emerald-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.modelo && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-md">
                    Modelo: {filters.modelo}
                    <button onClick={() => setFilters(prev => ({ ...prev, modelo: '' }))} className="hover:text-emerald-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.status && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-md">
                    Status: {filters.status}
                    <button onClick={() => setFilters(prev => ({ ...prev, status: '' }))} className="hover:text-emerald-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {(filters.dataInicio || filters.dataFim) && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-md">
                    Data: {filters.dataInicio ? format(new Date(filters.dataInicio), "dd/MM/yy") : '...'} - {filters.dataFim ? format(new Date(filters.dataFim), "dd/MM/yy") : '...'}
                    <button onClick={() => setFilters(prev => ({ ...prev, dataInicio: '', dataFim: '' }))} className="hover:text-emerald-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}