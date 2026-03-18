// @ts-nocheck
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, MapPin, Package, Hash, ArrowRight, FileText, ScanLine } from "lucide-react";
import { formatarNumeracao, extrairPrefixo } from '../formatacao/FormatacaoNumeracao';
import { cn } from "@/lib/utils";

export default function BaixaCard({ baixa, setores }) {
  const reserva = baixa.reserva;
  const setor = setores.find(s => s.id === reserva?.setor_id);
  const setorNome = setor?.nome || '';
  const prefixo = reserva ? extrairPrefixo(reserva.codigo_completo) : '';

  return (
    <Card className="hover:shadow-2xl transition-all duration-300 border-0 bg-white dark:bg-slate-900/40 backdrop-blur-xl group rounded-3xl overflow-hidden hover:scale-[1.01]">
      <div className="absolute top-0 left-0 w-1.5 h-0 group-hover:h-full transition-all duration-500 bg-blue-500 z-10" />
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Coluna 1: Info da Reserva */}
          <div className="flex-1 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20 group-hover:rotate-6 transition-transform">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                    {reserva?.codigo_produto || 'N/A'}
                  </h3>
                  <Badge variant={baixa.tipo === 'MANUAL' ? 'default' : 'secondary'} className={cn(
                    "font-black uppercase tracking-[0.2em] text-[9px] px-2 py-0.5 rounded-full border-0",
                    baixa.tipo === 'MANUAL' ? 'bg-indigo-500 text-white' : 'bg-amber-500 text-slate-950'
                  )}>
                    {baixa.tipo}
                  </Badge>
                </div>
                {reserva?.cliente && (
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest italic">{reserva.cliente}</p>
                )}
              </div>
            </div>

            {/* Intervalo Formatado */}
            <div className="bg-slate-100 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-200 dark:border-white/5 shadow-inner">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 italic">Range Numérico</span>
              </div>
              <div className="font-mono text-lg font-black text-slate-900 dark:text-white tracking-tighter">
                {reserva && (
                  <>
                    <span className="text-blue-600 dark:text-blue-400">{reserva.codigo_completo}</span>{formatarNumeracao(baixa.numero_inicial, prefixo, setorNome)}
                    <span className="text-slate-300 dark:text-slate-600 mx-3">-</span>
                    <span className="text-blue-600 dark:text-blue-400">{reserva.codigo_completo}</span>{formatarNumeracao(baixa.numero_final, prefixo, setorNome)}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Coluna 2: Quantidade e Data */}
          <div className="flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/10 rounded-3xl p-6 min-w-[160px] border border-emerald-200 dark:border-emerald-500/10 shadow-lg group-hover:shadow-emerald-500/10 transition-shadow">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-500 mb-2 italic">Total Baixado</span>
            <span className="text-4xl font-black text-emerald-700 dark:text-white tracking-tighter leading-none">{baixa.quantidade?.toLocaleString()}</span>
            <span className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-500/70 uppercase tracking-widest mt-2">{reserva?.codigo_produto ? 'UNIDADES' : 'ITENS'}</span>
          </div>

          {/* Coluna 3: Movimentação */}
          <div className="flex-1 space-y-4">
            {/* De -> Para */}
            <div className="bg-slate-100 dark:bg-slate-950/50 rounded-2xl p-5 border border-slate-200 dark:border-white/5 shadow-inner">
              <div className="flex items-center gap-4">
                {/* Origem */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center">
                      <MapPin className="w-3 h-3 text-blue-500" />
                    </div>
                    <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase italic">Origem</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-white/5 shadow-sm">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Setor</span>
                      <span className="text-base font-black text-slate-900 dark:text-white tracking-tighter leading-none">{baixa.de_setor}</span>
                    </div>
                    {baixa.local && (
                      <div className="flex justify-between items-end mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Local</span>
                        <span className="text-sm font-black text-blue-600 dark:text-blue-400 tracking-tight">{baixa.local}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Seta */}
                <div className="flex-shrink-0 pt-8 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  </div>
                </div>

                {/* Destino */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center">
                      <MapPin className="w-3 h-3 text-emerald-500" />
                    </div>
                    <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase italic">Destino</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-white/5 shadow-sm">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Setor</span>
                      <span className="text-base font-black text-slate-900 dark:text-white tracking-tighter leading-none">{baixa.para_setor}</span>
                    </div>
                    {baixa.local_destino && (
                      <div className="flex justify-between items-end mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Local</span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{baixa.local_destino}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Informações Adicionais */}
            <div className="grid grid-cols-2 gap-3">
              {baixa.operador && (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/30 rounded-lg py-1.5 px-3 border border-slate-100 dark:border-white/5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate tracking-tight">{baixa.operador}</span>
                </div>
              )}
              {baixa.setor_producao && (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/30 rounded-lg py-1.5 px-3 border border-slate-100 dark:border-white/5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate tracking-tight">{baixa.setor_producao}</span>
                </div>
              )}
              
              {/* Novos Campos Industriais */}
              {baixa.consultor && (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/30 rounded-lg py-1.5 px-3 border border-slate-100 dark:border-white/5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate tracking-tight">
                    <span className="opacity-50 mr-1 uppercase text-[8px]">Cons:</span> {baixa.consultor}
                  </span>
                </div>
              )}
              {baixa.setor && (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/30 rounded-lg py-1.5 px-3 border border-slate-100 dark:border-white/5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate tracking-tight">
                    <span className="opacity-50 mr-1 uppercase text-[8px]">Setor:</span> {baixa.setor}
                  </span>
                </div>
              )}
              {baixa.requisicao && (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/30 rounded-lg py-1.5 px-3 border border-slate-100 dark:border-white/5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate tracking-tight">
                    <span className="opacity-50 mr-1 uppercase text-[8px]">Req:</span> {baixa.requisicao}
                  </span>
                </div>
              )}
              {baixa.pedido && (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/30 rounded-lg py-1.5 px-3 border border-slate-100 dark:border-white/5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate tracking-tight">
                    <span className="opacity-50 mr-1 uppercase text-[8px]">Ped:</span> {baixa.pedido}
                  </span>
                </div>
              )}
              {baixa.op && (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/30 rounded-lg py-1.5 px-3 border border-slate-100 dark:border-white/5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate tracking-tight">
                    <span className="opacity-50 mr-1 uppercase text-[8px]">OP:</span> {baixa.op}
                  </span>
                </div>
              )}
              {baixa.chassi && (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/30 rounded-lg py-1.5 px-3 border border-slate-100 dark:border-white/5">
                  <ScanLine className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate tracking-tight">
                    <span className="opacity-50 mr-1 uppercase text-[8px]">Chassi:</span> {baixa.chassi}
                  </span>
                </div>
              )}

              <div className="flex items-center col-span-2 gap-2 bg-slate-50 dark:bg-slate-950/30 rounded-lg py-1.5 px-3 border border-slate-100 dark:border-white/5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 tracking-tight">
                  <span className="opacity-60 font-medium mr-1 uppercase text-[9px] tracking-widest">Registrado em</span>
                  {new Date(baixa.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            </div>

            {/* Descrição do Item */}
            {baixa.descricao_item && (
              <div className="flex items-start gap-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl p-3 border border-blue-100 dark:border-blue-900/30">
                <FileText className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-medium leading-relaxed text-blue-900 dark:text-blue-200">{baixa.descricao_item}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}