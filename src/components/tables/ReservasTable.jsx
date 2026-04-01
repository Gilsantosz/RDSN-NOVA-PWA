import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowDown, ArrowUp, MoreHorizontal, ScanLine, XCircle, Unlock, Eye, History, Scissors, Split, RefreshCw, FileText, ArrowDownNarrowWide } from "lucide-react";
import StatusBadge from '../dashboard/StatusBadge';
import ReservasTableMobile from './ReservasTableMobile';
import IntervaloBadge from '../ui/intervalo-badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { PremiumCard } from '@/components/ui/PremiumCard';

const FormatPrefixo = ({ codigo, letra, sufixo: sufixoProp }) => {
  const renderBadge = (l, s) => (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 dark:border-blue-400/20 group transition-all duration-300">
      <span className="font-mono font-black text-slate-900 dark:text-white text-base tracking-tight leading-none">
        {l}
      </span>
      {s && (
        <span className="text-blue-500 dark:text-blue-400 font-mono font-black text-[15px] italic border-l border-blue-500/20 dark:border-blue-400/20 pl-1.5 group-hover:pl-2 transition-all duration-300">
          {s}
        </span>
      )}
    </div>
  );

  // Se temos letra e sufixo explixitos, usamos diretamente
  if (letra) {
    return renderBadge(letra, sufixoProp || '');
  }

  if (!codigo) return <span className="text-slate-400 text-xs font-mono">-</span>;

  // Tenta extrair de codigo_completo: formato LETRA[ano]SUFIXO (ex: A26LM)
  const match = codigo.match(/^([A-Z])(\d+)?([A-Z]+)$/i);
  if (match) {
    const [, l, , s] = match;
    return renderBadge(l.toUpperCase(), s?.toUpperCase());
  }

  // Fallback: mostra o codigo como está
  return (
    <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
      <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
        {codigo}
      </span>
    </div>
  );
};

export default function ReservasTable({
  reservas = [],
  onDetalhes,
  onHistorico,
  onBaixa,
  onCancelar,
  onLiberar,
  onEncurtar,
  onQuebrar,
  onSincronizar,
  integracoesAtivas = false,
  isLoading,
  sortField,
  sortDirection,
  onSort
}) {
  // Inferência de sufixo: lotes filhos gerados sem sufixo herdam do irmão que tem.
  // Agrupa por (codigo_completo + ano + letra_produto) e propaga o sufixo do que tiver.
  const sufixoMap = React.useMemo(() => {
    const map = {};
    reservas.forEach(r => {
      if (r.sufixo) {
        const key = `${r.codigo_completo || ''}|${r.ano || ''}|${r.letra_produto || ''}`;
        if (!map[key]) map[key] = r.sufixo;
      }
    });
    return map;
  }, [reservas]);

  const getSufixo = (reserva) => {
    if (reserva.sufixo) return reserva.sufixo;
    const key = `${reserva.codigo_completo || ''}|${reserva.ano || ''}|${reserva.letra_produto || ''}`;
    return sufixoMap[key] || '';
  };
  const SortButton = ({ field, children }) => {
    const isActive = sortField === field;
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSort(field)}
        className={cn(
          "h-8 flex gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 -ml-2 font-black uppercase text-[10px] tracking-widest transition-all",
          isActive ? "text-blue-600 dark:text-blue-400 bg-blue-500/5" : "text-slate-500"
        )}
      >
        {children}
        {isActive && (
          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 animate-bounce" /> : <ArrowDown className="w-3 h-3 animate-bounce" />
        )}
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Mobile View */}
      <div className="lg:hidden">
        <ReservasTableMobile
          reservas={reservas}
          onDetalhes={onDetalhes}
          onHistorico={onHistorico}
          onBaixa={onBaixa}
          onCancelar={onCancelar}
          onLiberar={onLiberar}
          onEncurtar={onEncurtar}
          onQuebrar={onQuebrar}
          onSincronizar={onSincronizar}
          integracoesAtivas={integracoesAtivas}
          isLoading={isLoading}
        />
      </div>

      {/* Desktop View Premium */}
      <div className="hidden lg:block relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <PremiumCard noPadding className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-white/5 backdrop-blur-md hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <TableHead className="py-6 px-6"><SortButton field="cliente">Cliente</SortButton></TableHead>
                  <TableHead className="py-6 px-3"><SortButton field="unidade">Unid.</SortButton></TableHead>
                  <TableHead className="py-6 px-3"><SortButton field="codigo_completo">Prefixo</SortButton></TableHead>
                  <TableHead className="py-6 px-3 text-center"><SortButton field="ano">Ano</SortButton></TableHead>
                  <TableHead className="py-6 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Código</TableHead>
                  <TableHead className="py-6 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Intervalo Técnico</TableHead>
                  <TableHead className="py-6 px-3 text-right"><SortButton field="quantidade">Carga</SortButton></TableHead>
                  <TableHead className="py-6 px-3 text-right pr-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Realizado</TableHead>
                  <TableHead className="py-6 px-3"><SortButton field="status">Status</SortButton></TableHead>
                  <TableHead className="py-6 px-3"><SortButton field="created_at">Registro</SortButton></TableHead>
                  <TableHead className="py-6 px-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                {isLoading ? (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <TableCell colSpan={11} className="text-center py-20">
                      <div className="flex flex-col items-center gap-4">
                        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin opacity-20" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Sincronizando Banco de Dados...</p>
                      </div>
                    </TableCell>
                  </motion.tr>
                ) : reservas.length === 0 ? (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <TableCell colSpan={11} className="text-center py-20">
                      <div className="flex flex-col items-center gap-4">
                        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 italic" />
                        <p className="text-sm font-black text-slate-400 uppercase italic tracking-widest">Nenhuma reserva encontrada no sistema</p>
                      </div>
                    </TableCell>
                  </motion.tr>
                ) : (
                  reservas.map((reserva, index) => (
                    <motion.tr
                      key={reserva.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="group/row hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-all border-b border-slate-100 dark:border-white/5"
                    >
                      <TableCell className="py-5 px-6">
                        <p className="font-black text-sm text-slate-900 dark:text-white uppercase italic tracking-tighter truncate max-w-[15rem] leading-none">{reserva.cliente}</p>
                      </TableCell>
                      <TableCell className="py-5 px-3">
                        <div className="flex flex-col gap-1">
                          <p className="font-black text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{reserva.unidade || '-'}</p>
                          {reserva.sequencia_decrescente && (
                            <div className="flex items-center gap-1 text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20 w-fit">
                              <ArrowDownNarrowWide className="w-2.5 h-2.5" />
                              Decrescente
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-5 px-3">
                        <FormatPrefixo
                          codigo={reserva.codigo_completo}
                          letra={reserva.letra_produto}
                          sufixo={getSufixo(reserva)}
                        />
                      </TableCell>
                      <TableCell className="py-5 px-3 text-center">
                        <span className="font-bold text-[10px] text-slate-500 dark:text-slate-400 tracking-widest uppercase">20{reserva.ano}</span>
                      </TableCell>
                      <TableCell className="py-5 px-3">
                        <p className="font-mono text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-tighter">
                          {reserva.codigo_produto || '---'}
                        </p>
                      </TableCell>
                      <TableCell className="py-5 px-3">
                        <IntervaloBadge
                          inicio={(reserva.numero_inicial > reserva.numero_final || reserva.sequencia_decrescente) 
                            ? reserva.numero_inicial - (reserva.quantidade_baixada || 0)
                            : reserva.numero_inicial + (reserva.quantidade_baixada || 0)}
                          fim={reserva.numero_final}
                          size="sm"
                          variant="secondary"
                        />
                      </TableCell>
                      <TableCell className="py-5 px-3 text-right">
                        <p className="font-black text-lg text-slate-900 dark:text-slate-100 italic tracking-tighter leading-none">{reserva.quantidade?.toLocaleString()}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">un</p>
                      </TableCell>
                      <TableCell className="py-5 px-3 text-right pr-6">
                        <span className="font-black text-xl text-emerald-600 dark:text-emerald-400 italic tracking-tighter leading-none">
                          {(reserva.quantidade_baixada || 0).toLocaleString()}
                        </span>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">un</p>
                      </TableCell>
                      <TableCell className="py-5 px-3">
                        <StatusBadge status={reserva.status} />
                      </TableCell>
                      <TableCell className="py-5 px-3">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-tight">
                          {reserva.created_at && format(new Date(reserva.created_at), "dd MMM yy", { locale: ptBR })}
                        </p>
                      </TableCell>
                      <TableCell className="py-5 px-6 text-right">
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-blue-500 transition-all shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-white/10">
                                <MoreHorizontal className="w-5 h-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-2 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-[1.5rem] shadow-2xl backdrop-blur-xl">
                              <DropdownMenuItem
                                onClick={() => onDetalhes(reserva)}
                                className="h-11 rounded-xl focus:bg-blue-500/10 dark:focus:bg-blue-500/20 group cursor-pointer"
                              >
                                <Eye className="w-4 h-4 mr-3 text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="font-black uppercase text-[9px] tracking-widest text-slate-600 dark:text-slate-400">Ver Detalhes</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => onHistorico(reserva)}
                                className="h-11 rounded-xl focus:bg-indigo-500/10 dark:focus:bg-indigo-500/20 group cursor-pointer"
                              >
                                <History className="w-4 h-4 mr-3 text-indigo-500 group-hover:scale-110 transition-transform" />
                                <span className="font-black uppercase text-[9px] tracking-widest text-slate-600 dark:text-slate-400">Histórico de Baixas</span>
                              </DropdownMenuItem>

                              {(reserva.status === 'RESERVADO' || reserva.status === 'EM_PRODUCAO') && (
                                <DropdownMenuItem
                                  onClick={() => onBaixa(reserva)}
                                  className="h-11 rounded-xl focus:bg-emerald-500/10 dark:focus:bg-emerald-500/20 group cursor-pointer"
                                >
                                  <ScanLine className="w-4 h-4 mr-3 text-emerald-500 group-hover:scale-110 transition-transform" />
                                  <span className="font-black uppercase text-[9px] tracking-widest text-emerald-600 dark:text-emerald-400 font-black">Registrar Baixa</span>
                                </DropdownMenuItem>
                              )}

                              <div className="h-px bg-slate-100 dark:bg-white/5 my-2 mx-1" />

                              {reserva.status !== 'CANCELADO' && reserva.status !== 'PRODUZIDO' && (
                                <>
                                  {(reserva.quantidade_baixada || 0) > 0 && (
                                    <DropdownMenuItem
                                      onClick={() => onEncurtar(reserva)}
                                      className="h-11 rounded-xl focus:bg-slate-100 dark:focus:bg-white/5 group cursor-pointer"
                                    >
                                      <Scissors className="w-4 h-4 mr-3 text-slate-400" />
                                      <span className="font-black uppercase text-[9px] tracking-widest text-slate-600 dark:text-slate-400">Encurtar Lote</span>
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => onQuebrar(reserva)}
                                    className="h-11 rounded-xl focus:bg-slate-100 dark:focus:bg-white/5 group cursor-pointer"
                                  >
                                    <Split className="w-4 h-4 mr-3 text-slate-400" />
                                    <span className="font-black uppercase text-[9px] tracking-widest text-slate-600 dark:text-slate-400">Quebrar em Dois</span>
                                  </DropdownMenuItem>
                                </>
                              )}

                              {reserva.status === 'RESERVADO' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => onCancelar(reserva)}
                                    className="h-11 rounded-xl focus:bg-rose-500/10 dark:focus:bg-rose-500/20 group cursor-pointer"
                                  >
                                    <XCircle className="w-4 h-4 mr-3 text-rose-500" />
                                    <span className="font-black uppercase text-[9px] tracking-widest text-rose-600">Cancelar Reserva</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => onLiberar(reserva)}
                                    className="h-11 rounded-xl focus:bg-blue-500/10 dark:focus:bg-blue-500/20 group cursor-pointer"
                                  >
                                    <Unlock className="w-4 h-4 mr-3 text-blue-500" />
                                    <span className="font-black uppercase text-[9px] tracking-widest text-blue-600 font-bold">Liberar Lote</span>
                                  </DropdownMenuItem>
                                </>
                              )}

                              {integracoesAtivas && onSincronizar && (
                                <DropdownMenuItem
                                  onClick={() => onSincronizar(reserva)}
                                  className="h-11 rounded-xl focus:bg-blue-500/10 group cursor-pointer border-t border-slate-100 dark:border-white/5 mt-2"
                                >
                                  <RefreshCw className="w-4 h-4 mr-3 text-blue-400" />
                                  <span className="font-black uppercase text-[9px] tracking-widest text-blue-400">Sincronização Digital</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}