import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function PaginacaoTabela({ totalItems, paginaAtual, itensPorPagina, onPaginaChange, onItensPorPaginaChange }) {
  const totalPaginas = Math.max(1, Math.ceil(totalItems / itensPorPagina));
  const inicio = totalItems === 0 ? 0 : (paginaAtual - 1) * itensPorPagina + 1;
  const fim = Math.min(paginaAtual * itensPorPagina, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span>Exibindo</span>
        <span className="font-semibold text-slate-900">{inicio}-{fim}</span>
        <span>de</span>
        <span className="font-semibold text-slate-900">{totalItems.toLocaleString()}</span>
        <span>registros</span>
        <span className="text-slate-400 mx-1">|</span>
        <Select value={String(itensPorPagina)} onValueChange={(v) => onItensPorPaginaChange(Number(v))}>
          <SelectTrigger className="w-[80px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-slate-500">por página</span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPaginaChange(1)}
          disabled={paginaAtual <= 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPaginaChange(paginaAtual - 1)}
          disabled={paginaAtual <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="px-3 text-sm font-medium text-slate-700">
          {paginaAtual} / {totalPaginas}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPaginaChange(paginaAtual + 1)}
          disabled={paginaAtual >= totalPaginas}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPaginaChange(totalPaginas)}
          disabled={paginaAtual >= totalPaginas}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}