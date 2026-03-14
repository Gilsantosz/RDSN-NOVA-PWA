// @ts-nocheck
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Scissors, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function EncurtarLoteDialog({ reserva, open, onOpenChange, onConfirm, isLoading }) {
  const [novoNumeroFinal, setNovoNumeroFinal] = useState(reserva?.numero_final || 0);
  const [observacoes, setObservacoes] = useState('');
  const [error, setError] = useState('');

  const quantidadeLiberada = reserva ? (reserva.numero_final - novoNumeroFinal) : 0;
  const numeroInicialLiberado = novoNumeroFinal + 1;
  const numeroFinalLiberado = reserva?.numero_final || 0;
  const novaQuantidade = reserva ? (novoNumeroFinal - reserva.numero_inicial + 1) : 0;

  const handleSubmit = () => {
    setError('');

    if (novoNumeroFinal < reserva.numero_inicial) {
      setError('O novo número final não pode ser menor que o número inicial');
      return;
    }

    if (novoNumeroFinal >= reserva.numero_final) {
      setError('O novo número final deve ser menor que o atual');
      return;
    }

    if (novaQuantidade < (reserva.quantidade_baixada || 0)) {
      setError('O novo tamanho não pode ser menor que a quantidade já baixada');
      return;
    }

    onConfirm({
      novoNumeroFinal,
      observacoes,
      numeracaoLivre: {
        numero_inicial: numeroInicialLiberado,
        numero_final: numeroFinalLiberado,
        quantidade: quantidadeLiberada
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-2xl dark:bg-slate-900/90 dark:border-white/10 rounded-[2.5rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0">
        <div className="bg-gradient-to-br from-orange-900 to-amber-900 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full -mr-32 -mt-32 blur-3xl" />
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <Scissors className="w-6 h-6 text-orange-300" />
              </span>
              Encurtar <span className="text-orange-300">Lote</span>
            </DialogTitle>
            <p className="text-xs font-bold text-orange-200/60 uppercase tracking-widest mt-1">
              Redução de Escopo • {reserva?.codigo_completo}
            </p>
          </DialogHeader>
        </div>

        <div className="p-0 overflow-y-auto max-h-[70vh]">
          <div className="p-8 space-y-6">
            {/* Informações da Reserva Atual */}
            <div className="bg-slate-50 dark:bg-slate-950/40 p-6 rounded-[1.5rem] border border-slate-200 dark:border-white/5 grid grid-cols-2 gap-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic opacity-70">Identificação</span>
                <p className="font-mono font-black text-slate-900 dark:text-white leading-none tracking-tighter text-lg">{reserva?.codigo_completo}</p>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic opacity-70">Quantidade Total</span>
                <p className="font-black text-slate-900 dark:text-white leading-none text-lg italic">{reserva?.quantidade?.toLocaleString()} UN</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic opacity-70">Range Atual</span>
                <p className="font-mono font-bold text-slate-700 dark:text-slate-300 leading-none">
                  {reserva?.numero_inicial?.toLocaleString()} → {reserva?.numero_final?.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 italic opacity-70">Já Coletado</span>
                <p className="font-black text-emerald-600 dark:text-emerald-400 leading-none italic uppercase">{(reserva?.quantidade_baixada || 0).toLocaleString()} <span className="text-[10px]">Baixado</span></p>
              </div>
            </div>

            {/* Novo Número Final */}
            <div className="space-y-3">
              <Label className="text-slate-700 dark:text-slate-300 font-black uppercase text-[10px] tracking-[0.2em] ml-1">Novo Número Final da Sequência</Label>
              <div className="relative group">
                <Input
                  type="number"
                  value={novoNumeroFinal}
                  onChange={(e) => setNovoNumeroFinal(Number(e.target.value))}
                  min={reserva?.numero_inicial}
                  max={reserva?.numero_final - 1}
                  className="font-mono text-3xl h-20 text-center dark:bg-slate-950 dark:border-white/10 rounded-2xl border-2 transition-all focus:border-orange-500/50"
                />
                <p className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 italic pointer-events-none opacity-40 group-focus-within:opacity-100 transition-opacity">MAX: {reserva?.numero_final - 1}</p>
              </div>
            </div>

            {/* Preview das Mudanças */}
            {novoNumeroFinal >= (reserva?.numero_inicial || 0) && novoNumeroFinal < (reserva?.numero_final || 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-900 dark:text-emerald-400">Novo Lote</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-mono text-lg font-black text-slate-900 dark:text-white leading-none tracking-tight">
                      {reserva?.numero_inicial?.toLocaleString()} <span className="text-slate-400 opacity-40">...</span> {novoNumeroFinal.toLocaleString()}
                    </p>
                    <p className="font-bold text-emerald-700 dark:text-emerald-500/80 italic text-[10px] uppercase tracking-widest">{novaQuantidade.toLocaleString()} UNIDADES TOTAIS</p>
                  </div>
                </div>

                <div className="bg-orange-500/5 border border-orange-500/10 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-900 dark:text-orange-400">Liberados</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-mono text-lg font-black text-slate-900 dark:text-white leading-none tracking-tight">
                      {numeroInicialLiberado.toLocaleString()} <span className="text-slate-400 opacity-40">...</span> {numeroFinalLiberado.toLocaleString()}
                    </p>
                    <p className="font-bold text-orange-700 dark:text-orange-500/80 italic text-[10px] uppercase tracking-widest">{(numeroFinalLiberado - numeroInicialLiberado + 1).toLocaleString()} NÚMEROS LIVRES</p>
                  </div>
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 font-black uppercase text-[10px] tracking-[0.2em] ml-1">Observações do Ajuste</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Descreva o motivo desta alteração estrutural no lote..."
                className="dark:bg-slate-950 dark:border-white/10 rounded-2xl min-h-[100px] resize-none italic leading-relaxed text-sm p-4"
              />
            </div>

            {/* Alertas de Erro */}
            {error && (
              <Alert variant="destructive" className="rounded-2xl border-red-500/30 bg-red-500/10 py-4 animate-in fade-in slide-in-from-top-1">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-black italic uppercase text-[10px] tracking-widest leading-relaxed">{error}</AlertDescription>
              </Alert>
            )}

            {/* Alerta de Sucesso/Informativo */}
            {quantidadeLiberada > 0 && !error && (
              <Alert className="bg-blue-500/5 border-blue-500/20 rounded-2xl py-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <AlertDescription className="text-blue-900 dark:text-blue-400 font-black italic uppercase text-[10px] tracking-[0.1em]">
                    Protocolo irá liberar <strong>{(numeroFinalLiberado - numeroInicialLiberado + 1).toLocaleString()} identificadores</strong>.
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
            className="rounded-xl h-14 font-black uppercase text-[10px] tracking-[0.2em] italic px-8 border-slate-200 dark:border-white/10 dark:hover:bg-white/5"
          >
            Abortar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || (quantidadeLiberada <= 0 && !error)}
            className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-14 font-black uppercase text-[10px] tracking-[0.2em] italic px-10 shadow-2xl shadow-orange-600/20 group border-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                Redimensionando...
              </>
            ) : (
              <>
                <Scissors className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                Efetivar Ajuste
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}