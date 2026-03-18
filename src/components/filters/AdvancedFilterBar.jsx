import React, { useState, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, X, Calendar as CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function AdvancedFilterBar({
  filters,
  setFilters,
  reservas = [],
  letras = [],
  anos = [],
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
          setOpenDropdown(fieldKey);
        }}
        onFocus={() => setOpenDropdown(fieldKey)}
        onBlur={() => {
          setTimeout(() => {
            if (!document.activeElement?.closest('.suggestions-container')) {
              setOpenDropdown(null);
            }
          }, 200);
        }}
        className="flex h-10 w-full rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white/50 dark:bg-slate-800/50 px-3 py-2 text-sm shadow-sm transition-all duration-200 placeholder:text-slate-500 dark:placeholder:text-slate-400 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 pr-8"
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
        <div className="absolute top-full left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto mt-2 suggestions-container animate-in fade-in zoom-in-95 duration-200">
          {suggestions.slice(0, 50).map((item, idx) => (
            <button
              key={idx}
              type="button"
              onMouseDown={(e) => {
                // Previne o blur do input antes do click ser processado
                e.preventDefault();
              }}
              onClick={() => {
                onChange(item);
                setOpenDropdown(null);
              }}
              className="w-full text-left px-4 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm text-slate-700 dark:text-slate-300 transition-colors border-b border-slate-100/50 dark:border-slate-800/50 last:border-b-0"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const hasActiveFilters = filters.cliente || filters.codigoProduto || filters.modelo ||
    filters.letra || filters.ano || filters.status || filters.dataInicio || filters.dataFim;

  return (
    <div className="space-y-3">
      {/* Barra Principal */}
      <div className="flex flex-col lg:flex-row gap-3 p-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm transition-all duration-300">
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
            className="flex-shrink-0 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros Avançados
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex-shrink-0"
            >
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Filtros Avançados */}
      {showAdvanced && (
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 backdrop-blur-md rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm transition-all duration-300 space-y-4 animate-in fade-in slide-in-from-top-4">
          {/* Linha 1: Código e Modelo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Código do Produto</label>
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

          {/* Linha 2: Letra, Ano e Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Letra</label>
              <Select
                value={filters.letra || 'all'}
                onValueChange={(v) => setFilters(prev => ({ ...prev, letra: v === 'all' ? '' : v }))}
              >
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                  <SelectItem value="all">Todas</SelectItem>
                  {letras.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Ano</label>
              <Select
                value={filters.ano ? String(filters.ano) : 'all'}
                onValueChange={(v) => setFilters(prev => ({ ...prev, ano: v === 'all' ? '' : v }))}
              >
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                  <SelectItem value="all">Todos</SelectItem>
                  {anos.map(a => (
                    <SelectItem key={a} value={String(a)}>20{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Status</label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(v) => setFilters(prev => ({ ...prev, status: v === 'all' ? '' : v }))}
              >
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="RESERVADO">Reservado</SelectItem>
                  <SelectItem value="EM_PRODUCAO">Em Produção</SelectItem>
                  <SelectItem value="PRODUZIDO">Produzido</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                  <SelectItem value="LIBERADO">Liberado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 3: Intervalo de Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Data de Criação (Início)</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100",
                      !filters.dataInicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dataInicio ? format(new Date(filters.dataInicio), "dd/MM/yyyy", { locale: ptBR }) : "Selecione..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 dark:bg-slate-900 dark:border-slate-800" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dataInicio ? new Date(filters.dataInicio) : undefined}
                    onSelect={(date) => setFilters(prev => ({
                      ...prev,
                      dataInicio: date ? date.toISOString().split('T')[0] : ''
                    }))}
                    className="dark:bg-slate-900"
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Data de Criação (Fim)</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100",
                      !filters.dataFim && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dataFim ? format(new Date(filters.dataFim), "dd/MM/yyyy", { locale: ptBR }) : "Selecione..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 dark:bg-slate-900 dark:border-slate-800" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dataFim ? new Date(filters.dataFim) : undefined}
                    onSelect={(date) => setFilters(prev => ({
                      ...prev,
                      dataFim: date ? date.toISOString().split('T')[0] : ''
                    }))}
                    className="dark:bg-slate-900"
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Resumo de Filtros Ativos */}
          {hasActiveFilters && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Filtros ativos:</span>
                {filters.cliente && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-md">
                    Cliente: {filters.cliente}
                    <button onClick={() => setFilters(prev => ({ ...prev, cliente: '' }))} className="hover:text-blue-900 dark:hover:text-blue-100">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.codigoProduto && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-md">
                    Código: {filters.codigoProduto}
                    <button onClick={() => setFilters(prev => ({ ...prev, codigoProduto: '' }))} className="hover:text-blue-900 dark:hover:text-blue-100">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.modelo && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-md">
                    Modelo: {filters.modelo}
                    <button onClick={() => setFilters(prev => ({ ...prev, modelo: '' }))} className="hover:text-blue-900 dark:hover:text-blue-100">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.letra && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-md">
                    Letra: {filters.letra}
                    <button onClick={() => setFilters(prev => ({ ...prev, letra: '' }))} className="hover:text-blue-900 dark:hover:text-blue-100">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.ano && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-md">
                    Ano: 20{filters.ano}
                    <button onClick={() => setFilters(prev => ({ ...prev, ano: '' }))} className="hover:text-blue-900 dark:hover:text-blue-100">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.status && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-md">
                    Status: {filters.status}
                    <button onClick={() => setFilters(prev => ({ ...prev, status: '' }))} className="hover:text-blue-900 dark:hover:text-blue-100">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {(filters.dataInicio || filters.dataFim) && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-md">
                    Data: {filters.dataInicio ? format(new Date(filters.dataInicio), "dd/MM/yy") : '...'} - {filters.dataFim ? format(new Date(filters.dataFim), "dd/MM/yy") : '...'}
                    <button onClick={() => setFilters(prev => ({ ...prev, dataInicio: '', dataFim: '' }))} className="hover:text-blue-900 dark:hover:text-blue-100">
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