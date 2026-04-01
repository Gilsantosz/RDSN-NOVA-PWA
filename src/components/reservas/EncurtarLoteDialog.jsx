// @ts-nocheck
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Scissors, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { calcularQuantidade, calcularFim, proximoNumero } from '@/core/numeracaoService';

export default function EncurtarLoteDialog({ reserva, open, onOpenChange, onConfirm, isLoading }) {
  const [observacoes, setObservacoes] = useState('');
  const [error, setError] = useState('');

  const decrescente = reserva?.sequencia_decrescente || false;
  const inicial = reserva?.numero_inicial || 0;
  const finalOriginal = reserva?.numero_final || 0;
  const baixada = reserva?.quantidade_baixada || 0;

  // Calcula o novo final como o último número que já foi baixado.
  const novoNumeroFinal = calcularFim(inicial, baixada, decrescente) || inicial;

  const quantidadeLiberada = calcularQuantidade(proximoNumero(novoNumeroFinal, decrescente), finalOriginal, decrescente);
  const numeroInicialLiberado = proximoNumero(novoNumeroFinal, decrescente);
  const numeroFinalLiberado = finalOriginal;

  const handleSubmit = () => {
    setError('');

    if (baixada === 0) {
      setError('Não é possível encurtar um lote sem nenhuma baixa registrada.');
      return;
    }

    if (novoNumeroFinal === finalOriginal) {
      setError('O lote já foi totalmente produzido (fechado).');
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
      <DialogContent className="md:max-w-xl dark:bg-slate-900/90 dark:border-white/10 rounded-[2.5rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0">
        <div className="bg-gradient-to-br from-orange-900 to-amber-900 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <Scissors className="w-6 h-6 text-orange-300" />
              </span>
              Encurtar <span className="text-orange-300">Lote</span>
            </DialogTitle>
            <p className="text-xs font-bold text-orange-200/60 uppercase tracking-widest mt-1">
              Finalizar Lote Atual • {reserva?.codigo_completo}
            </p>
          </DialogHeader>
        </div>

        <div className="p-0 overflow-y-auto max-h-[70vh]">
          <div className="p-8 space-y-6">
            
            <Alert className="bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-300">
              <AlertDescription className="text-sm font-medium">
                Encurtar este lote significa sinalizar que ele foi finalizado {baixada > 0 ? "já na quantidade baixada" : ""} e liberar o fim da numeração {quantidadeLiberada > 0 ? "para criar outros lotes" : ""}.
              </AlertDescription>
            </Alert>

            {/* Visualização Simples do Divisor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-3xl shadow-sm text-center">
                <div className="flex justify-center mb-2">
                  <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-widest text-emerald-900 dark:text-emerald-500/80 mb-1">
                  Reserva Atualizada (Produzido)
                </p>
                <div className="font-mono text-2xl font-black text-slate-900 dark:text-white">
                  {inicial} <span className="text-emerald-500/50">→</span> {novoNumeroFinal}
                </div>
                <p className="text-xs font-bold text-slate-500 mt-2">
                  Total Final: {baixada} un
                </p>
              </div>

              <div className="bg-orange-500/5 border border-orange-500/20 p-5 rounded-3xl shadow-sm text-center opacity-80">
                <div className="flex justify-center mb-2">
                  <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-widest text-orange-900 dark:text-orange-500/80 mb-1">
                  Retorna p/ Uso (Livre)
                </p>
                <div className="font-mono text-2xl font-black text-slate-900 dark:text-white">
                  {numeroInicialLiberado} <span className="text-orange-500/50">→</span> {numeroFinalLiberado}
                </div>
                <p className="text-xs font-bold text-slate-500 mt-2">
                  Liberados: {quantidadeLiberada} un
                </p>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2 pt-2">
              <Label className="text-slate-700 dark:text-slate-300 font-black uppercase text-[10px] tracking-[0.2em] ml-1">Observações do Encurtamento (Opcional)</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Exemplo: Faltou insumo, cliente pediu menos... etc"
                className="dark:bg-slate-950 dark:border-white/10 rounded-2xl min-h-[100px] resize-none italic leading-relaxed text-sm p-4"
              />
            </div>

            {/* Alertas de Erro */}
            {error && (
              <Alert variant="destructive" className="rounded-2xl border-red-500/30 bg-red-500/10 py-4 animate-in fade-in slide-in-from-top-1">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <AlertDescription className="font-black italic uppercase text-[10px] tracking-widest leading-relaxed ml-2">{error}</AlertDescription>
              </Alert>
            )}

            {baixada === 0 && !error && (
              <Alert variant="destructive" className="rounded-2xl border-red-500/30 bg-red-500/10 py-4 animate-in fade-in slide-in-from-top-1">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <AlertDescription className="font-black italic uppercase text-[10px] tracking-widest leading-relaxed ml-2">Não há baixa registrada para este lote. Não é possível encurtar.</AlertDescription>
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
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || baixada === 0 || quantidadeLiberada <= 0}
            className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-14 font-black uppercase text-[10px] tracking-[0.2em] italic px-10 shadow-2xl shadow-orange-600/20 group border-0 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Scissors className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                Confirmar Encurtamento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}