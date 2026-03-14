import React, { useState } from 'react';
import { rdsn } from '@/api/supabaseClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RotateCcw, Loader2, Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function RestaurarBackup({ backups = [] }) {
  const queryClient = useQueryClient();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [backupSelecionado, setBackupSelecionado] = useState(null);
  const [previewDados, setPreviewDados] = useState(null);
  const [carregandoPreview, setCarregandoPreview] = useState(false);

  const restaurarMutation = useMutation({
    mutationFn: (arquivo_url) => rdsn.functions.invoke('restaurarBackup', { arquivo_url }),
    onSuccess: (response) => {
      toast.success(response.data.mensagem);
      queryClient.invalidateQueries();
      setDialogAberto(false);
      setPreviewDados(null);
      setBackupSelecionado(null);
    },
    onError: (error) => {
      toast.error('Erro ao restaurar: ' + (error.response?.data?.error || error.message));
    }
  });

  const carregarPreview = async (url) => {
    setCarregandoPreview(true);
    try {
      const response = await fetch(url);
      const data = await response.json();
      setPreviewDados(data);
    } catch (err) {
      toast.error('Erro ao carregar preview do backup');
    }
    setCarregandoPreview(false);
  };

  const handleSelecionarBackup = async (backup) => {
    setBackupSelecionado(backup);
    setDialogAberto(true);
    await carregarPreview(backup.arquivo_url);
  };

  const handleUploadArquivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { file_url } = await rdsn.integrations.Core.UploadFile({ file });
      setBackupSelecionado({ arquivo_url: file_url, tipo: 'UPLOAD' });
      setDialogAberto(true);
      await carregarPreview(file_url);
    } catch (err) {
      toast.error('Erro ao fazer upload: ' + err.message);
    }
  };

  const handleRestaurar = () => {
    if (!backupSelecionado?.arquivo_url) return;
    restaurarMutation.mutate(backupSelecionado.arquivo_url);
  };

  const entidadesTransacionais = ['reservas', 'baixas', 'sequencias', 'numeracoes', 'bloqueios',
    'movimentacoes', 'auditorias', 'alertas', 'notificacoes', 'producao_dia', 'producao_dia_lotes'];

  return (
    <>
      <Card className="border-blue-200 dark:border-blue-500/20 bg-blue-50/30 dark:bg-blue-500/5 backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-xl">
        <CardHeader className="border-b border-blue-100 dark:border-blue-500/10 pb-4">
          <CardTitle className="flex items-center gap-3 text-blue-800 dark:text-blue-400 font-black uppercase tracking-tighter italic">
            <span className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </span>
            Restaurar Backup
          </CardTitle>
          <CardDescription className="dark:text-blue-300/60 font-medium">
            Restaure dados transacionais a partir de um backup existente ou arquivo JSON
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {backups.filter(b => b.status === 'SUCESSO' && b.arquivo_url).length > 0 ? (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 ml-1">Snapshots Disponíveis:</p>
              {backups.filter(b => b.status === 'SUCESSO' && b.arquivo_url).slice(0, 5).map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-4 rounded-2xl border border-blue-200 dark:border-blue-500/20 bg-white/60 dark:bg-blue-950/40 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors group"
                >
                  <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100 italic">
                        {new Date(backup.data_backup || backup.created_at).toLocaleString('pt-BR')}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                        {backup.total_registros?.toLocaleString()} registros • {backup.tipo}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelecionarBackup(backup)}
                    className="h-10 rounded-xl border-blue-300 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-black uppercase text-[10px] tracking-widest px-4 shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-2" />
                    Restaurar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Alert className="bg-amber-50/50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20 rounded-2xl">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 italic">
                Nenhum backup disponível no histórico automatizado.
              </AlertDescription>
            </Alert>
          )}

          <div className="border-t border-blue-100 dark:border-blue-500/10 pt-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 ml-1">Upload de Manuscrito:</p>
            <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-blue-200 dark:border-blue-500/20 rounded-[1.5rem] cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-all group">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-blue-700 dark:text-blue-400">Importar arquivo JSON externo</span>
              <p className="text-[9px] font-bold text-slate-400 italic">Formatos aceitos: *.json</p>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleUploadArquivo}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-lg dark:bg-slate-900 dark:border-white/10 rounded-[2rem]">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </span>
              Confirmar Restauração
            </DialogTitle>
            <DialogDescription className="font-medium">
              A restauração irá mesclar os dados do backup ao banco de dados atual.
            </DialogDescription>
          </DialogHeader>

          {carregandoPreview ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Analisando Estrutura...</p>
            </div>
          ) : previewDados ? (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-4 border dark:border-white/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 italic">Origem do Snapshot</p>
                <p className="text-sm font-black text-slate-900 dark:text-white italic leading-none">
                  {new Date(previewDados.data_backup).toLocaleString('pt-BR')}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/5 text-[8px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">VERSÃO {previewDados.versao}</div>
                </div>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl p-5 border border-blue-100 dark:border-blue-500/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400 mb-3 ml-1 italic leading-none">Dicionário de dados detectado:</p>
                <div className="grid grid-cols-2 gap-2">
                  {entidadesTransacionais.map(key => {
                    const dados = previewDados.dados?.[key];
                    const count = Array.isArray(dados) ? dados.length : 0;
                    if (count === 0) return null;
                    return (
                      <div key={key} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900/50 rounded-xl border border-blue-100 dark:border-blue-500/10 shadow-sm">
                        <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase truncate">
                          {key}: <strong className="text-blue-600 dark:text-blue-400">{count}</strong>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Alert className="bg-amber-500/10 border-amber-500/20 rounded-2xl">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-900 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest italic ml-1 leading-relaxed">
                  Os dados NÃO serão substituídos. Os registros do backup serão anexados à base existente (Upsert).
                </AlertDescription>
              </Alert>
            </div>
          ) : null}

          <DialogFooter className="mt-8 gap-3">
            <Button variant="outline" onClick={() => setDialogAberto(false)} className="rounded-xl h-12 font-bold uppercase text-[10px] tracking-widest px-6">
              Cancelar
            </Button>
            <Button
              onClick={handleRestaurar}
              disabled={restaurarMutation.isPending || !previewDados}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 font-black uppercase text-[10px] tracking-widest px-8 shadow-xl shadow-blue-600/20"
            >
              {restaurarMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Injetando Dados...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Confirmar Restauração
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}