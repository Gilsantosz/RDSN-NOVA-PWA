import React, { useState } from 'react';
import { base44 } from '@/api/supabaseClient';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Trash2, Loader2, Shield, CheckCircle } from 'lucide-react';
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function RedefinirParaCopia() {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [codigoConfirmacao, setCodigoConfirmacao] = useState('');
  const [etapa, setEtapa] = useState(1); // 1 = aviso, 2 = confirmação

  const redefinirMutation = useMutation({
    mutationFn: () => base44.functions.invoke('redefinirParaCopia', { confirmar_codigo: codigoConfirmacao }),
    onSuccess: (response) => {
      toast.success(response.data.mensagem);
      setDialogAberto(false);
      setEtapa(1);
      setCodigoConfirmacao('');
    },
    onError: (error) => {
      toast.error('Erro: ' + (error.response?.data?.error || error.message));
    }
  });

  const handleAbrir = () => {
    setDialogAberto(true);
    setEtapa(1);
    setCodigoConfirmacao('');
  };

  const handleConfirmar = () => {
    if (codigoConfirmacao !== 'REDEFINIR-SISTEMA') {
      toast.error('Código incorreto. Digite exatamente: REDEFINIR-SISTEMA');
      return;
    }
    redefinirMutation.mutate();
  };

  return (
    <>
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <Trash2 className="w-5 h-5" />
            Redefinir Sistema para Cópia
          </CardTitle>
          <CardDescription className="text-red-700">
            Remove todos os dados transacionais mantendo apenas Clientes, Produtos, Setores e Clientes PCP.
            Use apenas quando for replicar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-red-100 rounded-lg p-3 border border-red-200">
                <p className="font-semibold text-red-800 mb-1">Será removido:</p>
                <ul className="text-red-700 space-y-0.5 text-xs">
                  <li>• Reservas e Baixas</li>
                  <li>• Sequências anuais</li>
                  <li>• Numerações livres</li>
                  <li>• Produções do dia</li>
                  <li>• Alertas e Notificações</li>
                  <li>• Auditorias e Logs</li>
                  <li>• Etiquetas e Backups</li>
                </ul>
              </div>
              <div className="bg-emerald-100 rounded-lg p-3 border border-emerald-200">
                <p className="font-semibold text-emerald-800 mb-1">Será mantido:</p>
                  <ul className="text-emerald-700 space-y-0.5 text-xs">
                    <li>• Clientes</li>
                    <li>• Produtos</li>
                    <li>• Setores</li>
                    <li>• Clientes PCP</li>
                    <li>• Usuários internos</li>
                    <li>• Configurações gerais</li>
                    <li>• Permissões e Roles</li>
                  </ul>
              </div>
            </div>

            <Alert className="border-amber-300 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-xs">
                Um backup de segurança será feito automaticamente antes da limpeza.
                Esta ação é irreversível após execução.
              </AlertDescription>
            </Alert>

            <Button
              variant="destructive"
              className="w-full"
              onClick={handleAbrir}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Redefinir Sistema para Cópia
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Redefinir Sistema
            </DialogTitle>
            <DialogDescription>
              {etapa === 1 
                ? 'Esta operação removerá todos os dados transacionais. Um backup será criado antes.' 
                : 'Digite o código de confirmação para prosseguir.'
              }
            </DialogDescription>
          </DialogHeader>

          {etapa === 1 ? (
            <div className="space-y-4">
              <Alert className="border-red-300 bg-red-50">
                <Shield className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 text-sm">
                   <strong>ATENÇÃO:</strong> Todos os dados de reservas, baixas, produções, sequências, 
                   alertas e logs serão permanentemente removidos. Apenas dados cadastrais 
                   (Clientes, Produtos, Setores e Clientes PCP) serão mantidos.
                </AlertDescription>
              </Alert>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogAberto(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={() => setEtapa(2)}>
                  Entendi, continuar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-2">
                  Digite <strong className="text-red-700">REDEFINIR-SISTEMA</strong> para confirmar:
                </p>
                <Input
                  value={codigoConfirmacao}
                  onChange={(e) => setCodigoConfirmacao(e.target.value.toUpperCase())}
                  placeholder="REDEFINIR-SISTEMA"
                  className="font-mono text-center"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setEtapa(1); setCodigoConfirmacao(''); }}>
                  Voltar
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleConfirmar}
                  disabled={codigoConfirmacao !== 'REDEFINIR-SISTEMA' || redefinirMutation.isPending}
                >
                  {redefinirMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Executando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Confirmar Redefinição
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}