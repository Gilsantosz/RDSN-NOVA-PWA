// @ts-nocheck
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, ScanLine, XCircle, Unlock, Eye, History, Scissors, Split, RefreshCw, Calendar, Package } from "lucide-react";
import StatusBadge from '../dashboard/StatusBadge';
import IntervaloBadge from '../ui/intervalo-badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  if (letra) {
    return renderBadge(letra, sufixoProp || '');
  }

  if (!codigo) return <span className="text-slate-400 text-xs font-mono">-</span>;

  const match = codigo.match(/^([A-Z])(\d+)?([A-Z]+)$/i);
  if (match) {
    const [, l, , s] = match;
    return renderBadge(l.toUpperCase(), s?.toUpperCase());
  }

  return (
    <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
      <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
        {codigo}
      </span>
    </div>
  );
};

export default function ReservasTableMobile({
  reservas = [],
  onDetalhes,
  onHistorico,
  onBaixa,
  onEncurtar,
  onQuebrar,
  onCancelar,
  onLiberar,
  onSincronizar,
  integracoesAtivas = false,
  isLoading
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin opacity-40" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Sincronizando Dados...</p>
      </div>
    );
  }

  if (reservas.length === 0) {
    return (
      <div className="text-center py-20">
        <Package className="w-12 h-12 text-slate-300 dark:text-slate-700 italic mx-auto mb-4" />
        <p className="text-sm font-black text-slate-400 uppercase italic tracking-widest text-[10px]">Nenhuma reserva no sistema</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-1 pb-6">
      {reservas.map((reserva) => (
        <Card key={reserva.id} className="relative group overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 rounded-[2rem] shadow-xl transition-all hover:shadow-2xl">
          {/* Subtle Glow Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/5 to-cyan-600/5 rounded-[2rem] blur opacity-0 group-hover:opacity-100 transition duration-500"></div>

          <CardContent className="relative p-5">
            <div className="space-y-4">
              {/* Header: Prefixo + Ações */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <FormatPrefixo
                    codigo={reserva.codigo_completo}
                    letra={reserva.letra_produto}
                    sufixo={reserva.sufixo}
                  />
                  <div className="max-w-[70vw]">
                    <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase italic tracking-tight truncate leading-tight">
                      {reserva.cliente}
                    </h3>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 shadow-sm border border-slate-200/50 dark:border-white/5">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-2 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-[1.5rem] shadow-2xl backdrop-blur-xl">
                    <DropdownMenuItem onClick={() => onDetalhes(reserva)} className="h-12 rounded-xl focus:bg-blue-500/10 dark:focus:bg-blue-500/20 group">
                      <Eye className="w-4 h-4 mr-3 text-blue-500 group-hover:scale-110 transition-transform" />
                      <span className="font-black uppercase text-[10px] tracking-widest text-slate-600 dark:text-slate-400">Ver Detalhes</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onHistorico(reserva)} className="h-12 rounded-xl focus:bg-indigo-500/10 dark:focus:bg-indigo-500/20 group">
                      <History className="w-4 h-4 mr-3 text-indigo-500 group-hover:scale-110 transition-transform" />
                      <span className="font-black uppercase text-[10px] tracking-widest text-slate-600 dark:text-slate-400">Histórico</span>
                    </DropdownMenuItem>
                    
                    {(reserva.status === 'RESERVADO' || reserva.status === 'EM_PRODUCAO') && (
                      <DropdownMenuItem onClick={() => onBaixa(reserva)} className="h-12 rounded-xl focus:bg-emerald-500/10 dark:focus:bg-emerald-500/20 group">
                        <ScanLine className="w-4 h-4 mr-3 text-emerald-500 group-hover:scale-110 transition-transform" />
                        <span className="font-black uppercase text-[10px] tracking-widest text-emerald-600 dark:text-emerald-400">Registrar Baixa</span>
                      </DropdownMenuItem>
                    )}

                    <div className="h-px bg-slate-100 dark:bg-white/5 my-2 mx-1" />

                    {reserva.status !== 'CANCELADO' && reserva.status !== 'PRODUZIDO' && (
                      <>
                        <DropdownMenuItem onClick={() => onEncurtar(reserva)} className="h-12 rounded-xl">
                          <Scissors className="w-4 h-4 mr-3 text-slate-400" />
                          <span className="font-black uppercase text-[10px] tracking-widest text-slate-600 dark:text-slate-400">Encurtar Lote</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onQuebrar(reserva)} className="h-12 rounded-xl">
                          <Split className="w-4 h-4 mr-3 text-slate-400" />
                          <span className="font-black uppercase text-[10px] tracking-widest text-slate-600 dark:text-slate-400">Dividir Lote</span>
                        </DropdownMenuItem>
                      </>
                    )}

                    {reserva.status === 'RESERVADO' && (
                      <>
                        <DropdownMenuItem onClick={() => onCancelar(reserva)} className="h-12 rounded-xl focus:bg-rose-500/10">
                          <XCircle className="w-4 h-4 mr-3 text-rose-500" />
                          <span className="font-black uppercase text-[10px] tracking-widest text-rose-600">Cancelar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onLiberar(reserva)} className="h-12 rounded-xl focus:bg-blue-500/10 font-bold">
                          <Unlock className="w-4 h-4 mr-3 text-blue-500" />
                          <span className="font-black uppercase text-[10px] tracking-widest text-blue-600">Liberar Lote</span>
                        </DropdownMenuItem>
                      </>
                    )}

                    {integracoesAtivas && onSincronizar && (
                      <DropdownMenuItem onClick={() => onSincronizar(reserva)} className="h-12 rounded-xl border-t border-slate-100 dark:border-white/5 mt-2">
                        <RefreshCw className="w-4 h-4 mr-3 text-blue-400" />
                        <span className="font-black uppercase text-[10px] tracking-widest text-blue-400">Sincronizar Digital</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Status & Data */}
              <div className="flex items-center justify-between py-2 border-y border-slate-100 dark:border-white/5">
                <StatusBadge status={reserva.status} />
                <div className="flex items-center gap-1.5 opacity-60">
                  <Calendar className="w-3 h-3" />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {reserva.created_at && format(new Date(reserva.created_at), "dd MMM yy", { locale: ptBR })}
                  </span>
                </div>
              </div>

              {/* Detalhes Técnicos: Intervalo e Carga */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Intervalo Técnico</span>
                  <IntervaloBadge
                    inicio={reserva.numero_inicial}
                    fim={reserva.numero_final}
                    variant="primary"
                    size="sm"
                  />
                </div>
                <div className="space-y-0.5 text-right">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Carga Total</span>
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-xl font-black text-slate-900 dark:text-slate-100 italic tracking-tighter leading-none">
                      {reserva.quantidade?.toLocaleString()}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">un</span>
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}