import React, { useState } from 'react';
import { base44 } from '@/api/supabaseClient';
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

export default function RestaurarBackup({ backups = [] }) {
  const queryClient = useQueryClient();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [backupSelecionado, setBackupSelecionado] = useState(null);
  const [previewDados, setPreviewDados] = useState(null);
  const [carregandoPreview, setCarregandoPreview] = useState(false);
  const [arquivoUpload, setArquivoUpload] = useState(null);

  const restaurarMutation = useMutation({
    mutationFn: (arquivo_url) => base44.functions.invoke('restaurarBackup', { arquivo_url }),
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
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
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
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <RotateCcw className="w-5 h-5" />
            Restaurar Backup
          </CardTitle>
          <CardDescription>
            Restaure dados transacionais a partir de um backup existente ou arquivo JSON
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {backups.filter(b => b.status === 'SUCESSO' && b.arquivo_url).length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Backups disponíveis:</p>
              {backups.filter(b => b.status === 'SUCESSO' && b.arquivo_url).slice(0, 5).map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(backup.data_backup || backup.created_at).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {backup.total_registros} registros · {backup.tipo}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelecionarBackup(backup)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Restaurar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Nenhum backup disponível no histórico. Faça upload de um arquivo JSON de backup.
              </AlertDescription>
            </Alert>
          )}

          <div className="border-t border-blue-200 pt-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Ou faça upload de um arquivo:</p>
            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
              <Upload className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-700">Selecionar arquivo JSON de backup</span>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-600" />
              Confirmar Restauração
            </DialogTitle>
            <DialogDescription>
              Os dados transacionais serão restaurados a partir do backup selecionado.
            </DialogDescription>
          </DialogHeader>

          {carregandoPreview ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : previewDados ? (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-lg p-3 border">
                <p className="text-xs text-slate-500 mb-1">Backup de</p>
                <p className="text-sm font-semibold">
                  {new Date(previewDados.data_backup).toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-slate-500 mt-1">Versão: {previewDados.versao}</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs font-semibold text-blue-800 mb-2">Dados a restaurar:</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {entidadesTransacionais.map(key => {
                    const dados = previewDados.dados?.[key];
                    const count = Array.isArray(dados) ? dados.length : 0;
                    if (count === 0) return null;
                    return (
                      <div key={key} className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-blue-600" />
                        <span className="text-slate-700">{key}: <strong>{count}</strong></span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {previewDados.estatisticas && (
                <div className="text-xs text-slate-500 text-center">
                  Total: {previewDados.estatisticas.total_reservas || 0} reservas, {previewDados.estatisticas.total_baixas || 0} baixas
                </div>
              )}

              <Alert className="border-amber-300 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-xs">
                  Os dados existentes NÃO serão apagados. Os registros do backup serão adicionados.
                </AlertDescription>
              </Alert>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRestaurar}
              disabled={restaurarMutation.isPending || !previewDados}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {restaurarMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurar Dados
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}