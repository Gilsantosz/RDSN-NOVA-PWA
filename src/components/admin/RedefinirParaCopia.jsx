import React, { useState } from 'react';
import { rdsn } from '@/api/supabaseClient';
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
  const [etapa, setEtapa] = useState(1);

  const redefinirMutation = useMutation({
    mutationFn: () => rdsn.functions.invoke('redefinirParaCopia', { confirmar_codigo: codigoConfirmacao }),
    onSuccess: (response) => {
      const data = response.data?.data || response.data;

      if (data.success) {
        toast.success(data.mensagem || 'Sistema redefinido com sucesso');
        setDialogAberto(false);
        setEtapa(1);
        setCodigoConfirmacao('');
        // Forçar recarga total para limpar cache e estados da UI
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error('Falha na redefinição: ' + (data.error || 'Erro desconhecido'));
      }
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
      <Card className="border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5 backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-xl">
        <CardHeader className="border-b border-red-100 dark:border-red-500/10 pb-4">
          <CardTitle className="flex items-center gap-3 text-red-800 dark:text-red-400 font-black uppercase tracking-tighter italic">
            <span className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </span>
            Hard Reset PCP
          </CardTitle>
          <CardDescription className="dark:text-red-300/60 font-medium">
            Remover todos os registros operacionais para início de novo ciclo de produção.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 px-6 pb-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-red-100/50 dark:bg-red-950/20 rounded-2xl p-5 border border-red-200 dark:border-red-500/20 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                <p className="text-[10px] font-black text-red-800 dark:text-red-400 uppercase tracking-widest mb-3 italic">Será Eliminado:</p>
                <ul className="space-y-1.5 list-none">
                  {['Reservas e Baixas', 'Sequências anuais', 'Produções diárias', 'Auditorias e Logs', 'Backups antigos'].map(item => (
                    <li key={item} className="flex items-center gap-2 text-[10px] font-bold text-red-700 dark:text-red-300 uppercase tracking-tighter">
                      <div className="w-1 h-1 rounded-full bg-red-400 dark:bg-red-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-emerald-100/50 dark:bg-emerald-950/20 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-500/20 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest mb-3 italic">Será Preservado:</p>
                <ul className="space-y-1.5 list-none">
                  {['Clientes & Produtos', 'Dicionário Setores', 'Clientes PCP', 'Configurações', 'Usuários & Roles'].map(item => (
                    <li key={item} className="flex items-center gap-2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-tighter">
                      <div className="w-1 h-1 rounded-full bg-emerald-400 dark:bg-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Alert className="bg-amber-500/10 border-amber-500/20 rounded-2xl py-4">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-900 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest italic leading-relaxed ml-1">
                A limpeza de base é irreversível. Um backup autômato será gerado instantaneamente antes da execução final.
              </AlertDescription>
            </Alert>

            <Button
              variant="destructive"
              className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 dark:bg-red-900/60 dark:hover:bg-red-800 text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-red-600/20 border-0"
              onClick={handleAbrir}
            >
              <Trash2 className="w-5 h-5 mr-3" />
              Iniciar Purga de Dados
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-white/10 rounded-[2rem]">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-3 text-red-600">
              <span className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </span>
              Protocolo de Redefinição
            </DialogTitle>
            <DialogDescription className="font-medium italic">
              {etapa === 1
                ? 'Confirmação nível 1: Entendimento dos riscos operacionais.'
                : 'Confirmação nível 2: Autenticação de comando sistêmico.'
              }
            </DialogDescription>
          </DialogHeader>

          {etapa === 1 ? (
            <div className="space-y-6">
              <div className="p-5 bg-red-500/10 rounded-2xl border border-red-500/20">
                <div className="flex items-start gap-4">
                  <Shield className="w-5 h-5 text-red-600 mt-1 shrink-0" />
                  <p className="text-xs font-black uppercase tracking-widest text-red-900 dark:text-red-400 leading-relaxed italic">
                    ATENÇÃO CRÍTICA: <span className="underline decoration-red-500/50 underline-offset-4">TODOS</span> os dados transacionais (reservas, baixas, produções) serão deletados para sempre.
                  </p>
                </div>
              </div>
              <DialogFooter className="gap-3">
                <Button variant="outline" onClick={() => setDialogAberto(false)} className="rounded-xl h-12 font-bold uppercase text-[10px] tracking-widest px-6">
                  Abortar Missão
                </Button>
                <Button variant="destructive" onClick={() => setEtapa(2)} className="bg-red-600 hover:bg-red-700 rounded-xl h-12 font-black uppercase text-[10px] tracking-widest px-8 shadow-xl shadow-red-600/20">
                  Continuar Protocolo
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Para confirmar, digite a frase secreta:</p>
                <div className="relative">
                  <Input
                    value={codigoConfirmacao}
                    onChange={(e) => setCodigoConfirmacao(e.target.value.toUpperCase())}
                    placeholder="REDEFINIR-SISTEMA"
                    className="h-14 font-mono font-black text-center text-red-600 dark:text-red-400 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border-2 border-red-200 dark:border-red-500/30 text-lg tracking-widest"
                  />
                </div>
              </div>
              <DialogFooter className="gap-3">
                <Button variant="outline" onClick={() => { setEtapa(1); setCodigoConfirmacao(''); }} className="rounded-xl h-12 font-bold uppercase text-[10px] tracking-widest px-6">
                  Voltar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmar}
                  disabled={codigoConfirmacao !== 'REDEFINIR-SISTEMA' || redefinirMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 rounded-xl h-12 font-black uppercase text-[10px] tracking-widest px-8 shadow-xl shadow-red-600/20"
                >
                  {redefinirMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Expurgando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5 mr-3" />
                      Executar Redefinição
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