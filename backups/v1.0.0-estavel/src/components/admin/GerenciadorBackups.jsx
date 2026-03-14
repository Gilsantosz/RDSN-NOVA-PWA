import React, { useState } from 'react';
import { base44 } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Download, Clock, CheckCircle, XCircle, Loader2, Play, FileSpreadsheet } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';
import ExcelJS from 'exceljs';

export default function GerenciadorBackups() {
  const queryClient = useQueryClient();
  const [executando, setExecutando] = useState(false);

  // Buscar configurações de backup
  const { data: configs = [] } = useQuery({
    queryKey: ['configs-backup'],
    queryFn: async () => {
      const todas = await base44.entities.ConfiguracaoGeral.list();
      return todas.filter(c => c.categoria === 'BACKUP');
    }
  });

  // Buscar histórico de backups (últimos 10)
  const { data: historico = [], isLoading } = useQuery({
    queryKey: ['backup-historico'],
    queryFn: async () => {
      const todos = await base44.entities.BackupHistorico.list('-created_at', 10);
      return todos;
    },
    refetchInterval: 30000 // Atualizar a cada 30s
  });

  // Inicializar configurações de backup
  const { data: configsInicializadas } = useQuery({
    queryKey: ['configs-backup-inicializadas'],
    queryFn: async () => {
      const existentes = await base44.entities.ConfiguracaoGeral.filter({ categoria: 'BACKUP' });
      
      if (existentes.length === 0) {
        const configsPadrao = [
          {
            chave: 'backup_ativo',
            categoria: 'BACKUP',
            nome: 'Backup Automático Ativo',
            descricao: 'Ativar ou desativar backups automáticos',
            valor: 'true',
            tipo_valor: 'booleano',
            valor_padrao: 'true'
          },
          {
            chave: 'backup_frequencia',
            categoria: 'BACKUP',
            nome: 'Frequência de Backup',
            descricao: 'Frequência dos backups automáticos',
            valor: 'diario',
            tipo_valor: 'texto',
            valor_padrao: 'diario'
          },
          {
            chave: 'backup_horario',
            categoria: 'BACKUP',
            nome: 'Horário do Backup',
            descricao: 'Horário para execução do backup (formato HH:MM)',
            valor: '02:00',
            tipo_valor: 'texto',
            valor_padrao: '02:00'
          },
          {
            chave: 'backup_retencao_dias',
            categoria: 'BACKUP',
            nome: 'Período de Retenção',
            descricao: 'Número de dias para manter backups',
            valor: '7',
            tipo_valor: 'numero',
            valor_padrao: '7',
            unidade: 'dias'
          }
        ];
        
        await Promise.all(
          configsPadrao.map(cfg => base44.entities.ConfiguracaoGeral.create(cfg))
        );
        
        queryClient.invalidateQueries({ queryKey: ['configs-backup'] });
      }
      
      return true;
    }
  });

  const atualizarConfigMutation = useMutation({
    mutationFn: ({ id, dados }) => base44.entities.ConfiguracaoGeral.update(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs-backup'] });
      toast.success('Configuração atualizada');
    }
  });

  const executarBackupMutation = useMutation({
    mutationFn: () => base44.functions.invoke('backupDados', {}),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['backup-historico'] });
      toast.success(`Backup realizado: ${response.data.total_registros} registros, ${response.data.tamanho_mb} MB`);
      setExecutando(false);
    },
    onError: (error) => {
      toast.error('Erro ao executar backup: ' + error.message);
      setExecutando(false);
    }
  });

  const handleExecutarBackup = () => {
    setExecutando(true);
    executarBackupMutation.mutate();
  };

  const getConfig = (chave) => configs.find(c => c.chave === chave);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const ultimoBackup = historico[0];
  const backupsSucesso = historico.filter(b => b.status === 'SUCESSO').length;

  const exportarBackupExcel = async (backup) => {
    try {
      toast.info('Baixando dados do backup...');
      const response = await fetch(backup.arquivo_url);
      const data = await response.json();

      const entidades = Object.entries(data.dados || {}).filter(([, v]) => Array.isArray(v) && v.length > 0);
      
      if (entidades.length === 0) {
        toast.error('Backup sem dados para exportar');
        return;
      }

      for (const [entidade, registros] of entidades) {
        const allKeys = [...new Set(registros.flatMap(r => Object.keys(r)))];
        
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(entidade);
        
        sheet.columns = allKeys.map(k => ({ header: k, key: k, width: 18 }));
        
        const headerRow = sheet.getRow(1);
        headerRow.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e293b' } };
        });
        
        registros.forEach(r => {
          const rowData = {};
          allKeys.forEach(k => {
            const val = r[k];
            rowData[k] = val === null || val === undefined ? '' : 
                         typeof val === 'object' ? JSON.stringify(val) : val;
          });
          sheet.addRow(rowData);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${entidade}_${format(new Date(backup.created_at), 'yyyy-MM-dd')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast.success('Backup exportado com sucesso!');
    } catch (err) {
      toast.error('Erro ao exportar backup: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status e Ação Rápida */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Status dos Backups
          </CardTitle>
          <CardDescription>
            Gerencie e execute backups dos dados do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="text-xs text-slate-600 mb-1">Último Backup</div>
              {ultimoBackup ? (
                <>
                  <div className="text-lg font-bold text-slate-900">
                    {format(new Date(ultimoBackup.created_at), 'dd/MM/yyyy HH:mm')}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {ultimoBackup.status === 'SUCESSO' ? (
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-600" />
                    )}
                    <span className={`text-xs ${ultimoBackup.status === 'SUCESSO' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {ultimoBackup.status}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-500">Nenhum backup realizado</div>
              )}
            </div>

            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
              <div className="text-xs text-emerald-700 mb-1">Taxa de Sucesso</div>
              <div className="text-lg font-bold text-emerald-900">
                {historico.length > 0 ? Math.round((backupsSucesso / historico.length) * 100) : 0}%
              </div>
              <div className="text-xs text-emerald-700 mt-1">
                {backupsSucesso} de {historico.length} backups
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-xs text-blue-700 mb-1">Espaço Total</div>
              <div className="text-lg font-bold text-blue-900">
                {formatBytes(historico.reduce((acc, b) => acc + (b.tamanho_bytes || 0), 0))}
              </div>
              <div className="text-xs text-blue-700 mt-1">
                {historico.length} arquivos armazenados
              </div>
            </div>
          </div>

          <Button
            onClick={handleExecutarBackup}
            disabled={executando || executarBackupMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {executando || executarBackupMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Executando Backup...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Executar Backup Agora
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Configurações */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Configurações de Backup Automático</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {configs.map(config => (
            <div key={config.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div className="flex-1">
                <Label className="text-sm font-medium">{config.nome}</Label>
                <p className="text-xs text-slate-500 mt-1">{config.descricao}</p>
              </div>
              <div className="w-48">
                {config.chave === 'backup_frequencia' ? (
                  <Select
                    value={config.valor}
                    onValueChange={(valor) => atualizarConfigMutation.mutate({ id: config.id, dados: { ...config, valor } })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diario">Diário</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                ) : config.tipo_valor === 'booleano' ? (
                  <Button
                    variant={config.valor === 'true' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => atualizarConfigMutation.mutate({
                      id: config.id,
                      dados: { ...config, valor: config.valor === 'true' ? 'false' : 'true' }
                    })}
                  >
                    {config.valor === 'true' ? 'Ativo' : 'Inativo'}
                  </Button>
                ) : (
                  <Input
                    type={config.tipo_valor === 'numero' ? 'number' : 'text'}
                    value={config.valor}
                    onChange={(e) => atualizarConfigMutation.mutate({ id: config.id, dados: { ...config, valor: e.target.value } })}
                  />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Histórico de Backups
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Carregando...</div>
          ) : historico.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Nenhum backup registrado</div>
          ) : (
            <div className="space-y-2">
              {historico.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {backup.status === 'SUCESSO' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : backup.status === 'FALHA' ? (
                      <XCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    )}
                    <div>
                      <div className="font-medium text-sm">
                        {format(new Date(backup.created_at), "dd/MM/yyyy 'às' HH:mm")}
                      </div>
                      <div className="text-xs text-slate-500">
                        {backup.total_registros?.toLocaleString()} registros · {formatBytes(backup.tamanho_bytes)} · {backup.duracao_ms}ms
                      </div>
                    </div>
                  </div>
                  {backup.arquivo_url && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <a href={backup.arquivo_url} download>
                          <Download className="w-3 h-3 mr-1" />
                          JSON
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportarBackupExcel(backup)}
                      >
                        <FileSpreadsheet className="w-3 h-3 mr-1" />
                        Excel
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          Os backups são armazenados de forma segura e incluem todos os dados operacionais do sistema. 
          Configure backups automáticos para garantir a segurança dos dados.
        </AlertDescription>
      </Alert>
    </div>
  );
}