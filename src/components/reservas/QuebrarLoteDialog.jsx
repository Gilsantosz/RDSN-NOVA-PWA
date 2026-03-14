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
import { cn } from "@/lib/utils";

export default function QuebrarLoteDialog({ reserva, open, onOpenChange, onConfirm, isLoading }) {
  const [quantidadePorLote, setQuantidadePorLote] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [error, setError] = useState('');

  // Calcular lotes baseado na quantidade
  const calcularLotes = () => {
    const qtdNum = Number(quantidadePorLote);
    if (!quantidadePorLote || qtdNum <= 0) return [];

    const totalQuantidade = reserva.quantidade;
    const resultLotes = [];

    let numeroAtual = reserva.numero_inicial;
    let quantidadeRestante = totalQuantidade;

    while (quantidadeRestante > 0) {
      const quantidadeLote = Math.min(qtdNum, quantidadeRestante);
      const numeroFinal = numeroAtual + quantidadeLote - 1;

      resultLotes.push({
        numero_inicial: numeroAtual,
        numero_final: numeroFinal,
        quantidade: quantidadeLote
      });

      numeroAtual = numeroFinal + 1;
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
                <p className="font-black text-slate-900 dark:text-white leading-none text-lg italic">{reserva?.quantidade?.toLocaleString()} UN</p>
              </div>
              <div className="col-span-2 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic opacity-70">Intervalo de Controle</span>
                <p className="font-mono font-bold text-slate-700 dark:text-slate-300 leading-none">
                  {reserva?.numero_inicial?.toLocaleString()} → {reserva?.numero_final?.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Quantidade por Lote */}
            <div className="space-y-3">
              <div className="flex justify-between items-end px-1">
                <Label className="text-slate-700 dark:text-slate-300 font-black uppercase text-[10px] tracking-[0.2em]">Tamanho Máximo por Fragmento</Label>
                <span className="text-[9px] font-black text-slate-400 uppercase italic">Limite: {reserva?.quantidade - 1}</span>
              </div>
              <Input
                type="number"
                value={quantidadePorLote}
                onChange={(e) => setQuantidadePorLote(e.target.value)}
                min={1}
                max={reserva?.quantidade - 1}
                className="font-mono text-3xl h-20 text-center dark:bg-slate-950 dark:border-white/10 rounded-2xl border-2 transition-all focus:border-purple-500/50"
                placeholder="Ex: 1000"
              />
            </div>

            {/* Preview dos Lotes */}
            {lotes.length > 0 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-purple-600/10 border border-purple-500/20 p-5 rounded-2xl flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center border border-purple-500/20">
                      <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-purple-900 dark:text-purple-400 italic">Estratégia de Fragmentação</p>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Distribuição automática em sub-entidades</p>
                    </div>
                  </div>
                  <Badge className="bg-purple-600 hover:bg-purple-600 text-white font-black italic px-4 py-1.5 rounded-full text-xs shadow-lg shadow-purple-600/30">
                    {lotes.length} FRAGMENTOS
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-2 custom-scrollbar p-1">
                  {lotes.map((lote, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-5 rounded-2xl border-2 transition-all relative overflow-hidden group",
                        idx === 0
                          ? 'bg-emerald-500/10 border-emerald-500/20 shadow-sm'
                          : idx === lotes.length - 1 && lote.quantidade < Number(quantidadePorLote)
                            ? 'bg-amber-500/10 border-amber-500/20'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5'
                      )}
                    >
                      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                        <Package className="w-8 h-8 rotate-12" />
                      </div>
                      <div className="flex justify-between items-center relative z-10">
                        <div>
                          <p className={cn(
                            "text-[9px] font-black uppercase tracking-widest mb-1.5 italic",
                            idx === 0 ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500"
                          )}>
                            {idx === 0 ? 'MATRIZ ORIGINAL' : `FRAGMENTO ${idx + 1}`}
                          </p>
                          <p className="font-mono text-xs font-black dark:text-slate-200 tracking-tight leading-none bg-black/5 dark:bg-white/5 px-2 py-1 rounded-lg border border-black/5 dark:border-white/5 inline-block">
                            {lote.numero_inicial.toLocaleString()} <span className="text-slate-400">...</span> {lote.numero_final.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none italic tracking-tighter">{lote.quantidade.toLocaleString()}</p>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">UNIDADES</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 font-black uppercase text-[10px] tracking-[0.2em] ml-1">Justificativa Operacional</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Descreva o motivo desta quebra e o destino dos lotes fragmentados..."
                className="dark:bg-slate-950 dark:border-white/10 rounded-2xl min-h-[100px] resize-none italic leading-relaxed text-sm p-4"
              />
            </div>

            {/* Alertas */}
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