import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Split, AlertTriangle, Package } from 'lucide-react';

export default function QuebrarLoteDialog({ reserva, open, onOpenChange, onConfirm, isLoading }) {
  const [quantidadePorLote, setQuantidadePorLote] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [error, setError] = useState('');

  // Calcular lotes baseado na quantidade
  const calcularLotes = () => {
    if (!quantidadePorLote || quantidadePorLote <= 0) return [];

    const qtdPorLote = Number(quantidadePorLote);
    const totalQuantidade = reserva.quantidade;
    const lotes = [];

    let numeroAtual = reserva.numero_inicial;
    let quantidadeRestante = totalQuantidade;

    while (quantidadeRestante > 0) {
      const quantidadeLote = Math.min(qtdPorLote, quantidadeRestante);
      const numeroFinal = numeroAtual + quantidadeLote - 1;

      lotes.push({
        numero_inicial: numeroAtual,
        numero_final: numeroFinal,
        quantidade: quantidadeLote
      });

      numeroAtual = numeroFinal + 1;
      quantidadeRestante -= quantidadeLote;
    }

    return lotes;
  };

  const lotes = calcularLotes();

  const handleSubmit = () => {
    setError('');

    if (!quantidadePorLote || quantidadePorLote <= 0) {
      setError('Digite uma quantidade válida');
      return;
    }

    if (Number(quantidadePorLote) >= reserva.quantidade) {
      setError('A quantidade por lote deve ser menor que o total');
      return;
    }

    if (lotes.length < 2) {
      setError('Deve gerar pelo menos 2 lotes');
      return;
    }

    onConfirm({
      quantidadePorLote: Number(quantidadePorLote),
      observacoes,
      lotes
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="w-5 h-5 text-purple-600" />
            Quebrar Lote por Quantidade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações da Reserva Original */}
          <div className="bg-slate-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Código:</span>
              <span className="font-mono font-bold">{reserva?.codigo_completo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Intervalo Atual:</span>
              <span className="font-mono font-semibold">
                {reserva?.numero_inicial?.toLocaleString()} - {reserva?.numero_final?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Quantidade Total:</span>
              <span className="font-bold">{reserva?.quantidade?.toLocaleString()}</span>
            </div>
          </div>

          {/* Quantidade por Lote */}
          <div className="space-y-2">
            <Label>Quantidade por Lote *</Label>
            <Input
              type="number"
              value={quantidadePorLote}
              onChange={(e) => setQuantidadePorLote(e.target.value)}
              min={1}
              max={reserva?.quantidade - 1}
              className="font-mono text-lg"
              placeholder="Ex: 2000"
            />
            <p className="text-xs text-slate-500">
              Digite o tamanho desejado para cada lote. O sistema criará automaticamente múltiplos lotes.
            </p>
          </div>

          {/* Preview dos Lotes */}
          {lotes.length > 0 && (
            <>
              <div className="bg-purple-50 border-2 border-purple-200 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-purple-900">Resultado da Divisão</span>
                  </div>
                  <Badge className="bg-purple-600 text-white">
                    {lotes.length} lote(s)
                  </Badge>
                </div>
                <div className="text-sm text-purple-800">
                  {lotes.length === 1 ? (
                    <p>⚠️ Quantidade muito grande. Deve gerar pelo menos 2 lotes.</p>
                  ) : (
                    <p>Serão criados <strong>{lotes.length} lotes</strong> com quantidades de <strong>{quantidadePorLote}</strong> unidades cada.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {lotes.map((lote, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border-2 ${idx === 0
                        ? 'bg-green-50 border-green-200'
                        : idx === lotes.length - 1 && lote.quantidade < Number(quantidadePorLote)
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium text-slate-600 mb-1">
                          Lote {idx + 1} {idx === 0 ? '(Original)' : '(Novo)'}
                        </div>
                        <div className="font-mono text-sm font-semibold">
                          {lote.numero_inicial.toLocaleString()} - {lote.numero_final.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {lote.quantidade.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">unidades</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Motivo da quebra, informações adicionais..."
              rows={3}
            />
          </div>

          {/* Alertas */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {lotes.length > 1 && (
            <Alert className="bg-purple-50 border-purple-200">
              <AlertTriangle className="w-4 h-4 text-purple-600" />
              <AlertDescription className="text-purple-900">
                O lote original será mantido com o primeiro intervalo. {lotes.length - 1} novo(s) lote(s) será(ão) criado(s).
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || lotes.length < 2}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? 'Processando...' : `Criar ${lotes.length} Lote(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}