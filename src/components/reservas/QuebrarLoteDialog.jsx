// @ts-nocheck
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Split, AlertTriangle, Package, Loader2 } from 'lucide-react';
import { calcularFim, proximoNumero } from '@/core/numeracaoService';

export default function QuebrarLoteDialog({ reserva, open, onOpenChange, onConfirm, isLoading }) {
  const [quantidadePorLote, setQuantidadePorLote] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [error, setError] = useState('');

  const calcularLotes = () => {
    const qtdNum = Number(quantidadePorLote);
    if (!quantidadePorLote || qtdNum <= 0) return [];

    const decrescente = reserva.sequencia_decrescente;
    const totalQuantidade = reserva.quantidade;
    const resultLotes = [];
    let numeroAtual = reserva.numero_inicial;
    let quantidadeRestante = totalQuantidade;

    while (quantidadeRestante > 0) {
      const quantidadeLote = Math.min(qtdNum, quantidadeRestante);
      const numeroFinal = calcularFim(numeroAtual, quantidadeLote, decrescente);

      resultLotes.push({
        numero_inicial: numeroAtual,
        numero_final: numeroFinal,
        quantidade: quantidadeLote
      });

      numeroAtual = proximoNumero(numeroFinal, decrescente);
      quantidadeRestante -= quantidadeLote;
    }

    return resultLotes;
  };

  const lotes = calcularLotes();

  const handleSubmit = () => {
    setError('');
    const qtdNum = Number(quantidadePorLote);

    if (!quantidadePorLote || qtdNum <= 0) {
      setError('Digite uma quantidade válida');
      return;
    }

    if (qtdNum >= reserva.quantidade) {
      setError('A quantidade por lote deve ser menor que o total');
      return;
    }

    if (lotes.length < 2) {
      setError('Deve gerar pelo menos 2 lotes');
      return;
    }

    onConfirm({
      quantidadePorLote: qtdNum,
      observacoes,
      lotes
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-2xl dark:bg-slate-900/90 dark:border-white/10 rounded-[2.5rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0">
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <Split className="w-6 h-6 text-purple-300" />
              </span>
              Quebrar <span className="text-purple-300">Lote</span>
            </DialogTitle>
            <p className="text-xs font-bold text-purple-200/60 uppercase tracking-widest mt-1">
              Divisão Segmentada • {reserva?.codigo_completo}
            </p>
          </DialogHeader>
        </div>

        <div className="p-0 overflow-y-auto max-h-[70vh]">
          <div className="p-8 space-y-6">
            {/* Informações da Reserva Original */}
            <div className="bg-slate-50 dark:bg-slate-950/40 p-6 rounded-[1.5rem] border border-slate-200 dark:border-white/5 grid grid-cols-2 gap-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic opacity-70">Identificação Base</span>
                <p className="font-mono font-black text-slate-900 dark:text-white leading-none tracking-tighter text-lg">{reserva?.codigo_completo}</p>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic opacity-70">Volume Original</span>
                <p className="font-black text-slate-900 dark:text-white text-lg leading-none tracking-tighter">{reserva?.quantidade} Unid.</p>
              </div>
            </div>

            {/* Input de Quantidade */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 italic">Dividir a cada X etiquetas:</Label>
                <Badge variant="outline" className="rounded-full border-purple-500/30 text-purple-600 dark:text-purple-400 font-bold bg-purple-500/5">
                  Recomendado: 50
                </Badge>
              </div>
              <div className="relative group">
                <Input
                  type="number"
                  value={quantidadePorLote}
                  onChange={(e) => setQuantidadePorLote(e.target.value)}
                  placeholder="Ex: 50"
                  className="h-20 text-3xl font-black tracking-tighter bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-white/10 rounded-[1.5rem] px-8 focus:ring-4 focus:ring-purple-500/20 transition-all group-hover:border-purple-500/40"
                />
                <Package className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 text-slate-300 dark:text-slate-700 pointer-events-none group-focus-within:text-purple-500 transition-colors" />
              </div>
            </div>

            {/* Preview dos Novos Lotes */}
            {lotes.length > 0 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Estrutura Resultante ({lotes.length} lotes)</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {lotes.slice(0, 4).map((lote, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 group hover:border-purple-500/30 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Lote {String(index + 1).padStart(2, '0')}</span>
                        <span className="font-mono text-xs font-black dark:text-purple-300 tabular-nums">{String(lote.numero_inicial).padStart(3, '0')} a {String(lote.numero_final).padStart(3, '0')}</span>
                      </div>
                      <Badge variant="secondary" className="bg-slate-200 dark:bg-white/5 text-[9px] font-black tracking-tighter">{lote.quantidade} UN</Badge>
                    </div>
                  ))}
                  {lotes.length > 4 && (
                    <div className="col-span-1 sm:col-span-2 text-center p-2 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                      <span className="text-[10px] font-bold text-slate-400 uppercase italic">+ {lotes.length - 4} outros lotes com a mesma estrutura</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic px-1">Justificativa da Divisão</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Lote muito grande para os gabinetes atuais..."
                className="min-h-[100px] resize-none rounded-[1.5rem] bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-white/5 focus:ring-4 focus:ring-purple-500/20 italic font-medium p-4"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="rounded-2xl border-red-500/30 bg-red-500/10 py-4 animate-in fade-in slide-in-from-top-1">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-black italic uppercase text-[10px] tracking-widest leading-relaxed">{error}</AlertDescription>
              </Alert>
            )}

            {lotes.length > 1 && !error && (
              <Alert className="bg-purple-600/5 border-purple-500/20 rounded-2xl py-4 transition-all">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-purple-600" />
                  <AlertDescription className="text-purple-900 dark:text-purple-400 font-black italic uppercase text-[10px] tracking-widest leading-tight">
                    ATENÇÃO: Operação irreversível. O sistema irá desmembrar o lote em <strong>{lotes.length} sub-lotes</strong> permanentes.
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter className="p-8 pt-0 gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="rounded-xl h-14 font-black uppercase text-[10px] tracking-[0.2em] italic px-10 border-slate-200 dark:border-white/10 dark:hover:bg-white/5"
          >
            Abortar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || lotes.length < 2}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-14 font-black uppercase text-[10px] tracking-[0.2em] italic px-12 shadow-2xl shadow-purple-600/20 border-0 group"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                Divisão em Curso...
              </>
            ) : (
              <>
                <Split className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                Confirmar Divisão
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}