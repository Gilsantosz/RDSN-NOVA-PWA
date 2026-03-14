import React, { useState, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export default function BuscaLoteProducao({ reservas = [], onSelect, lotesJaAbertos = [] }) {
  const [busca, setBusca] = useState('');
  const [open, setOpen] = useState(false);

  const resultados = useMemo(() => {
    if (!busca || busca.length < 2) return [];
    const termo = busca.toLowerCase();

    return reservas
      .filter(r => {
        // Apenas lotes reservados ou em produção, não totalmente baixados
        if (!['RESERVADO', 'EM_PRODUCAO'].includes(r.status)) return false;
        const restante = (r.quantidade || 0) - (r.quantidade_baixada || 0);
        if (restante <= 0) return false;
        // Não mostrar lotes já abertos em sessões ativas
        if (lotesJaAbertos.includes(r.id)) return false;

        // Buscar por cliente, código, letra, numeração
        return (
          r.cliente?.toLowerCase().includes(termo) ||
          r.codigo_produto?.toLowerCase().includes(termo) ||
          r.codigo_completo?.toLowerCase().includes(termo) ||
          r.letra_produto?.toLowerCase().includes(termo) ||
          r.modelo?.toLowerCase().includes(termo) ||
          String(r.numero_inicial).includes(termo) ||
          String(r.numero_final).includes(termo)
        );
      })
      .slice(0, 10);
  }, [busca, reservas, lotesJaAbertos]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por cliente, código, letra, numeração..."
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className="pl-10 pr-8"
        />
        {busca && (
          <button
            onClick={() => { setBusca(''); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && resultados.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto mt-1">
          {resultados.map(r => {
            const restante = (r.quantidade || 0) - (r.quantidade_baixada || 0);
            return (
              <button
                key={r.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(r);
                  setBusca('');
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-100 last:border-0 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-lg flex-shrink-0">
                      {r.letra_produto}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{r.cliente || 'Sem cliente'}</p>
                      <p className="text-xs text-slate-500">
                        {r.codigo_completo} · {r.codigo_produto} · {r.modelo}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Restante</p>
                    <p className="font-bold text-slate-900">{restante.toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {r.numero_inicial?.toLocaleString()} — {r.numero_final?.toLocaleString()}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {open && busca.length >= 2 && resultados.length === 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl z-50 mt-1 p-4 text-center text-sm text-slate-500">
          Nenhum lote encontrado
        </div>
      )}
    </div>
  );
}