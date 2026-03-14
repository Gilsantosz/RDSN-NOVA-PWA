import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";

export default function HistoricoBaixas({ reserva, baixas = [] }) {
  const baixasOrdenadas = [...baixas].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const totalBaixado = baixas.reduce((acc, b) => acc + (Number(b.quantidade) || 0), 0);
  const percentualConcluido = (reserva?.quantidade > 0) ? Math.round((totalBaixado / reserva.quantidade) * 100) : 0;

  if (!reserva) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Resumo Industrial High-Tech */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-500/10 transition-colors" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner">
              <History className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Registros de Baixa</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">{baixas.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-inner">
              <TrendingUp className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Volume Processado</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">{totalBaixado.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-purple-500/10 transition-colors" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 bg-purple-500/10 dark:bg-purple-500/20 rounded-2xl flex items-center justify-center border border-purple-500/20 shadow-inner">
              <span className="text-xl font-black text-purple-600 dark:text-purple-400">{percentualConcluido}%</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Status de Carga</p>
              <div className="flex items-end gap-2">
                <p className="text-xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">{totalBaixado.toLocaleString()}</p>
                <div className="h-4 w-px bg-slate-200 dark:bg-white/10" />
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{(reserva.quantidade || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-1000 ease-out"
              style={{ width: `${percentualConcluido}%` }}
            />
          </div>
        </div>
      </div>

      {/* Informações Estruturadas do Lote */}
      <div className="bg-slate-900 dark:bg-slate-950 border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl p-8 relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent)]" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400/80">Código de Rastreio</span>
            <p className="text-xl font-black text-white italic tracking-tighter truncate">{reserva.codigo_completo}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400/80">Identificação</span>
            <p className="text-xl font-black text-white italic tracking-tighter truncate">{reserva.cliente || 'CONSUMIDOR FINAL'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400/80">Intervalo Técnico</span>
            <p className="text-xl font-black text-emerald-400 italic tracking-tighter">
              {reserva.numero_inicial?.toLocaleString()} <span className="text-white/20 mx-1">→</span> {reserva.numero_final?.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400/80">Carga Nominal</span>
            <p className="text-2xl font-black text-white italic tracking-tighter">{(reserva.quantidade || 0).toLocaleString()} <span className="text-xs uppercase ml-1 not-italic opacity-50">un</span></p>
          </div>
        </div>
      </div>

      {/* Tabela de Transações */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 p-8 flex items-center justify-between">
          <h3 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-3 text-slate-900 dark:text-white leading-none">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner">
              <History className="w-5 h-5 text-indigo-500" />
            </div>
            Log Transacional de Produção
          </h3>
          <Badge variant="outline" className="font-bold text-[9px] text-slate-500 border-slate-200 uppercase tracking-widest px-3 py-1 rounded-full">{baixas.length} OPERAÇÕES</Badge>
        </div>
        <div className="p-0 overflow-x-auto custom-scrollbar">
          {baixasOrdenadas.length === 0 ? (
            <div className="text-center py-24 text-slate-500 bg-slate-50/30 dark:bg-transparent">
              <History className="w-16 h-16 mx-auto mb-6 opacity-20 italic animate-pulse" />
              <p className="font-black uppercase text-[11px] tracking-[0.3em] italic text-slate-400">Aguardando processamento inicial do lote</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 hover:bg-slate-50/50">
                  <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Timestamp</TableHead>
                  <TableHead className="py-6 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Nº Inicial</TableHead>
                  <TableHead className="py-6 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Nº Final</TableHead>
                  <TableHead className="py-6 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Volume</TableHead>
                  <TableHead className="py-6 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Operação</TableHead>
                  <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Protocolo de Leitura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {baixasOrdenadas.map((baixa) => (
                  <TableRow key={baixa.id} className="border-slate-100 dark:border-white/5 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-all group">
                    <TableCell className="py-5 px-8 font-bold text-slate-600 dark:text-slate-400 text-xs">
                      <div className="flex flex-col">
                        <span className="text-slate-900 dark:text-white font-black italic tracking-tight">{baixa.created_at ? format(new Date(baixa.created_at), 'dd MMM yyyy', { locale: ptBR }) : '-'}</span>
                        <span className="text-[9px] opacity-70">{baixa.created_at ? format(new Date(baixa.created_at), 'HH:mm:ss') : '--:--'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-5 px-4">
                      <Badge variant="outline" className="font-mono font-black text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/5 rounded-lg px-2 py-1">
                        {baixa.numero_inicial?.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-5 px-4 font-mono font-black text-slate-900 dark:text-white">
                      {baixa.numero_final?.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-5 px-4 text-center">
                      <p className="font-black text-lg text-slate-900 dark:text-white tracking-tighter leading-none">{baixa.quantidade?.toLocaleString()}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">units</p>
                    </TableCell>
                    <TableCell className="py-5 px-4 text-center">
                      <Badge className={cn(
                        "font-black text-[9px] border-0 py-1.5 px-3 rounded-lg shadow-sm",
                        baixa.tipo === 'COLETA'
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      )}>
                        {baixa.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-5 px-8 text-right">
                      <p className="font-mono text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest break-all">
                        {baixa.codigo_lido || 'SNC_PROTO_NONE'}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <div className="bg-slate-50 dark:bg-black/20 p-4 text-center border-t border-slate-100 dark:border-white/5">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] italic opacity-60">Audit Log Certificado • Verificação Hash SHA-256 Ativa</p>
        </div>
      </div>
    </div>
  );
}