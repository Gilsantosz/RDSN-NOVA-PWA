import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { Search, X, FileText, Users, Package, Loader2, Camera, ScanLine } from 'lucide-react';
import { useSetor } from '@/components/context/SetorContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import BarcodeScanner from '@/components/scanner/BarcodeScanner';
import { AnimatePresence } from 'framer-motion';

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const { setorAtivo, isAdmin } = useSetor();

  const { data: reservas = [] } = useQuery({
    queryKey: ['reservas-search', setorAtivo],
    queryFn: async () => {
      const todas = await base44.entities.ReservaLote.list();
      if (isAdmin && setorAtivo === 'TODOS') return todas;
      return todas.filter(r => r.setor_id === setorAtivo);
    },
    enabled: !!setorAtivo
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-search', setorAtivo],
    queryFn: async () => {
      const todas = await base44.entities.Cliente.list();
      if (isAdmin && setorAtivo === 'TODOS') return todas;
      return todas.filter(c => {
        const produtos = [c.letra_produto];
        return produtos.some(p => p);
      });
    },
    enabled: !!setorAtivo
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-search', setorAtivo],
    queryFn: async () => {
      const todas = await base44.entities.Produto.list();
      if (isAdmin && setorAtivo === 'TODOS') return todas;
      return todas.filter(p => p.setor_id === setorAtivo);
    },
    enabled: !!setorAtivo
  });

  const resultados = useMemo(() => {
    if (!searchTerm.trim()) return { reservas: [], clientes: [], produtos: [] };

    const termo = searchTerm.toLowerCase();

    return {
      reservas: reservas.filter(r =>
        r.codigo_completo?.toLowerCase().includes(termo) ||
        r.cliente?.toLowerCase().includes(termo)
      ).slice(0, 5),
      clientes: clientes.filter(c =>
        c.nome?.toLowerCase().includes(termo)
      ).slice(0, 5),
      produtos: produtos.filter(p =>
        p.codigo_produto?.toLowerCase().includes(termo) ||
        p.descricao?.toLowerCase().includes(termo) ||
        p.modelo?.toLowerCase().includes(termo)
      ).slice(0, 5)
    };
  }, [searchTerm, reservas, clientes, produtos]);

  const totalResultados = resultados.reservas.length + resultados.clientes.length + resultados.produtos.length;

  const handleScanCode = (code) => {
    setSearchTerm(code);
    setShowScanner(false);
  };

  // Atalho CMD/CTRL + K
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <AnimatePresence>
        {showScanner && (
          <BarcodeScanner
            onScan={handleScanCode}
            onClose={() => setShowScanner(false)}
            placeholder="Escaneie código de barras ou QR Code"
          />
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        aria-label="Abrir busca global. Atalho: Command K ou Control K"
      >
        <Search className="w-4 h-4" aria-hidden="true" />
        <span>Buscar...</span>
        <kbd className="ml-auto text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-400" aria-label="Atalho de teclado">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl dark:bg-slate-950 dark:border-slate-800" aria-labelledby="search-title">
          <DialogHeader>
            <DialogTitle id="search-title" className="dark:text-slate-100">Busca Global</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar reservas, clientes, produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input dark:border-slate-800 bg-transparent px-10 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:text-slate-200"
                  autoFocus
                  aria-label="Campo de busca"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowScanner(true)}
                className="w-full gap-2 border-2 border-dashed hover:border-slate-900 dark:hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 dark:border-slate-800"
              >
                <Camera className="w-4 h-4" />
                Escanear Código de Barras
              </Button>
            </div>

            {!searchTerm.trim() ? (
              <div className="text-center py-8 text-slate-500">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Digite para buscar</p>
              </div>
            ) : totalResultados === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <X className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum resultado encontrado</p>
              </div>
            ) : (
              <div className="space-y-6 max-h-[400px] overflow-y-auto">
                {/* Reservas */}
                {resultados.reservas.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      <FileText className="w-4 h-4" />
                      Reservas ({resultados.reservas.length})
                    </div>
                    <div className="space-y-2">
                      {resultados.reservas.map(r => (
                        <Link
                          key={r.id}
                          to={createPageUrl('Reservas')}
                          onClick={() => setOpen(false)}
                          className="block p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                        >
                          <div className="font-medium text-slate-900 dark:text-slate-100">{r.codigo_completo}</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">{r.cliente}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clientes */}
                {resultados.clientes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      <Users className="w-4 h-4" />
                      Clientes ({resultados.clientes.length})
                    </div>
                    <div className="space-y-2">
                      {resultados.clientes.map(c => (
                        <Link
                          key={c.id}
                          to={createPageUrl('Clientes')}
                          onClick={() => setOpen(false)}
                          className="block p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                        >
                          <div className="font-medium text-slate-900 dark:text-slate-100">{c.nome}</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">{c.modelo}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Produtos */}
                {resultados.produtos.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      <Package className="w-4 h-4" />
                      Produtos ({resultados.produtos.length})
                    </div>
                    <div className="space-y-2">
                      {resultados.produtos.map(p => (
                        <Link
                          key={p.id}
                          to={createPageUrl('Produtos')}
                          onClick={() => setOpen(false)}
                          className="block p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                        >
                          <div className="font-medium text-slate-900 dark:text-slate-100">{p.codigo_produto}</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">{p.descricao}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}