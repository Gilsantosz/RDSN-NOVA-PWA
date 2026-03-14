import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Scissors, AlertTriangle, CheckCircle } from 'lucide-react';

export default function EncurtarLoteDialog({ reserva, open, onOpenChange, onConfirm, isLoading }) {
  const [novoNumeroFinal, setNovoNumeroFinal] = useState(reserva?.numero_inicial || 0);
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

    const numeroInicialLib = novoNumeroFinal + 1;
    const numeroFinalLib = reserva.numero_final;
    const qtdLib = numeroFinalLib - numeroInicialLib + 1;

    onConfirm({
      novoNumeroFinal,
      observacoes,
      numeracaoLivre: {
        numero_inicial: numeroInicialLib,
        numero_final: numeroFinalLib,
        quantidade: qtdLib
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-orange-600" />
            Encurtar Lote
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações da Reserva Atual */}
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
              <span className="text-sm text-slate-600">Quantidade Atual:</span>
              <span className="font-bold">{reserva?.quantidade?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Já Baixado:</span>
              <span className="font-bold text-green-600">{(reserva?.quantidade_baixada || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Novo Número Final */}
          <div className="space-y-2">
            <Label>Novo Número Final *</Label>
            <Input
              type="number"
              value={novoNumeroFinal}
              onChange={(e) => setNovoNumeroFinal(Number(e.target.value))}
              min={reserva?.numero_inicial}
              max={reserva?.numero_final - 1}
              className="font-mono text-lg"
            />
            <p className="text-xs text-slate-500">
              Digite o novo último número do lote (menor que {reserva?.numero_final?.toLocaleString()})
            </p>
          </div>

          {/* Preview das Mudanças */}
          {novoNumeroFinal >= (reserva?.numero_inicial || 0) && novoNumeroFinal < (reserva?.numero_final || 0) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-900">Lote Encurtado</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-mono">
                    {reserva?.numero_inicial?.toLocaleString()} - {novoNumeroFinal.toLocaleString()}
                  </p>
                  <p className="font-bold text-green-900">{novaQuantidade.toLocaleString()} unidades</p>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-900">Numeração Liberada</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-mono">
                    {numeroInicialLiberado.toLocaleString()} - {numeroFinalLiberado.toLocaleString()}
                  </p>
                  <p className="font-bold text-blue-900">{(numeroFinalLiberado - numeroInicialLiberado + 1).toLocaleString()} unidades disponíveis</p>
                </div>
              </div>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Motivo do encurtamento, informações adicionais..."
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

          {quantidadeLiberada > 0 && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>{(numeroFinalLiberado - numeroInicialLiberado + 1).toLocaleString()} números</strong> (de {numeroInicialLiberado.toLocaleString()} até {numeroFinalLiberado.toLocaleString()}) serão liberados e ficarão disponíveis para reutilização futura.
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
            disabled={isLoading || quantidadeLiberada <= 0}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading ? 'Processando...' : 'Confirmar Encurtamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}