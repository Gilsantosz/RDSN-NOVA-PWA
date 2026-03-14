import React, { useState } from 'react';
import { rdsn } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Download, Clock, CheckCircle, XCircle, Loader2, Play, FileSpreadsheet, RefreshCcw } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';
import ExcelJS from 'exceljs';
import { cn } from "@/lib/utils";

export default function GerenciadorBackups() {
  const queryClient = useQueryClient();
  const [executando, setExecutando] = useState(false);

  // Buscar configurações de backup
  const { data: configs = [] } = useQuery({
    queryKey: ['configs-backup'],
    queryFn: async () => {
      const todas = await rdsn.entities.ConfiguracaoGeral.list();
      return todas.filter(c => c.categoria === 'BACKUP');
    }
  });

  // Buscar histórico de backups (últimos 10)
  const { data: historico = [], isLoading } = useQuery({
    queryKey: ['backup-historico'],
    queryFn: async () => {
      const todos = await rdsn.entities.BackupHistorico.list('-created_at', 10);
      return todos;
    },
    refetchInterval: 30000 // Atualizar a cada 30s
  });

  const atualizarConfigMutation = useMutation({
    mutationFn: (variables) => {
      const { id, dados } = variables;
      return rdsn.entities.ConfiguracaoGeral.update(id, dados);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs-backup'] });
      toast.success('Configuração atualizada');
    }
  });

  const executarBackupMutation = useMutation({
    mutationFn: () => rdsn.functions.invoke('backupDados', {}),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['backup-historico'] });
      // response.data from shim is { success, total_registros, tamanho_bytes, ... }
      const resData = response.data || response;
      const mb = ((resData.total_registros || 0) / (1024 * 1024)).toFixed(2);
      toast.success(`Backup realizado: ${resData.total_registros} registros, ~${mb} MB aproximado`);
      setExecutando(false);
    },
    onError: (error) => {
      toast.error('Erro ao executar backup: ' + error.message);
      setExecutando(false);
    }
  });

  const restaurarBackupMutation = useMutation({
    mutationFn: async (variables) => {
      const response = await rdsn.functions.invoke('restaurarBackup', { backupId: variables.id });
      return response.data;
    },
    onSuccess: (response) => {
      const resData = response.data || response;
      if (resData.success) {
        toast.success(`Sistema restaurado com sucesso: ${resData.total_restaurado} registros`);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error('Erro no processamento da restauração: ' + (resData.error || 'Erro desconhecido'));
      }
    },
    onError: (error) => {
      toast.error('Erro fatal na restauração: ' + error.message);
    }
  });

  const handleRestaurar = (backup) => {
    if (confirm(`DESEJA MESMO RESTAURAR O BACKUP DE ${format(new Date(backup.created_at), 'dd/MM/yyyy HH:mm')}? \n\nISSO SUBSTITUIRÁ TODOS OS DADOS ATUAIS PELOS DADOS DESTE BACKUP. ESTA OPERAÇÃO É IRREVERSÍVEL PARA OS DADOS ATUAIS.`)) {
      restaurarBackupMutation.mutate(backup);
    }
  };

  const handleExecutarBackup = () => {
    setExecutando(true);
    executarBackupMutation.mutate();
  };

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
      <Card className="border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40 backdrop-blur-xl shadow-xl overflow-hidden rounded-[2rem]">
        <CardHeader className="pb-4 border-b border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/20">
          <CardTitle className="flex items-center gap-3 text-slate-800 dark:text-slate-100 font-black uppercase tracking-tighter italic">
            <span className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-500" />
            </span>
            Status dos Backups
          </CardTitle>
          <CardDescription className="dark:text-slate-400 font-medium">
            Gerencie e execute backups dos dados do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-5 border border-slate-100 dark:border-white/5 shadow-sm">
              <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 italic">Último Backup</div>
              {ultimoBackup ? (
                <>
                  <div className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
                    {format(new Date(ultimoBackup.created_at), 'dd/MM/yyyy HH:mm')}
                  </div>
                  <div className="flex items-center gap-2 mt-2.5">
                    {ultimoBackup.status === 'SUCESSO' ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">SUCESSO</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 rounded-full border border-red-500/20">
                        <XCircle className="w-3 h-3 text-red-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">FALHA</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-sm font-bold text-slate-400 italic">Nenhum realizado</div>
              )}
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
              <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-3 italic">Taxa de Sucesso</div>
              <div className="text-3xl font-black text-emerald-900 dark:text-emerald-300 tracking-tighter leading-none">
                {historico.length > 0 ? Math.round((backupsSucesso / historico.length) * 100) : 0}%
              </div>
              <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500/70 mt-3 uppercase tracking-wider">
                {backupsSucesso} de {historico.length} arquivos estáveis
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-500/5 rounded-2xl p-5 border border-blue-100 dark:border-blue-500/20 shadow-sm">
              <div className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-3 italic">Espaço Utilizado</div>
              <div className="text-3xl font-black text-blue-900 dark:text-blue-300 tracking-tighter leading-none">
                {formatBytes(historico.reduce((acc, b) => acc + (b.tamanho_bytes || 0), 0))}
              </div>
              <div className="text-[10px] font-bold text-blue-600 dark:text-blue-500/70 mt-3 uppercase tracking-wider">
                {historico.length} snapshots armazenados
              </div>
            </div>
          </div>

          <Button
            onClick={handleExecutarBackup}
            disabled={executando || executarBackupMutation.isPending}
            className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase text-xs tracking-[0.2em] gap-3 shadow-2xl shadow-slate-900/20 dark:shadow-white/5 hover:scale-[1.01] active:scale-[0.98] transition-all group"
          >
            {executando || executarBackupMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                Processando Criptografia...
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-xl bg-white/10 dark:bg-slate-900/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-4 h-4 fill-current" />
                </div>
                Executar Novo Snapshot de Segurança
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40 backdrop-blur-xl shadow-xl rounded-[2rem] overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/20">
          <CardTitle className="text-base font-black uppercase tracking-tighter italic text-slate-800 dark:text-slate-100">Configurações de Automatização</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 dark:divide-white/5 p-0">
          {configs.map(config => (
            <div key={config.id} className="flex items-center justify-between p-6 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
              <div className="flex-1 pr-8">
                <Label className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">{config.nome}</Label>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 font-bold italic opacity-70 leading-relaxed uppercase tracking-tighter">{config.descricao}</p>
              </div>
              <div className="w-56">
                {config.chave === 'backup_frequencia' ? (
                  <Select
                    value={config.valor}
                    onValueChange={(valor) => atualizarConfigMutation.mutate({ id: config.id, dados: { ...config, valor } })}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/50 font-bold uppercase text-[10px] tracking-widest">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-white/10">
                      <SelectItem value="diario" className="font-bold text-[10px] uppercase">Diário</SelectItem>
                      <SelectItem value="semanal" className="font-bold text-[10px] uppercase">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                ) : config.tipo_valor === 'booleano' ? (
                  <Button
                    variant={config.valor === 'true' ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      "w-full h-11 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all",
                      config.valor === 'true'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-lg shadow-emerald-500/20'
                        : 'border-slate-200 dark:border-white/10 text-slate-400 dark:bg-slate-950/50'
                    )}
                    onClick={() => atualizarConfigMutation.mutate({
                      id: config.id,
                      dados: { ...config, valor: config.valor === 'true' ? 'false' : 'true' }
                    })}
                  >
                    {config.valor === 'true' ? 'ATIVO' : 'INATIVO'}
                  </Button>
                ) : (
                  <div className="relative">
                    <Input
                      type={config.tipo_valor === 'numero' ? 'number' : 'text'}
                      value={config.valor}
                      className="h-11 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/50 text-center font-black"
                      onChange={(e) => atualizarConfigMutation.mutate({ id: config.id, dados: { ...config, valor: e.target.value } })}
                    />
                    {config.unidade && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">{config.unidade}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40 backdrop-blur-xl shadow-xl rounded-[2rem] overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/20">
          <CardTitle className="text-base flex items-center gap-3 font-black uppercase tracking-tighter italic text-slate-800 dark:text-slate-100">
            <Clock className="w-5 h-5 text-emerald-500" />
            Histórico Recente de Operações
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic">Sincronizando Metadados...</p>
            </div>
          ) : historico.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
              <Database className="w-10 h-10 mx-auto text-slate-200 dark:text-slate-800 mb-3" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic opacity-50">Nenhum registro encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historico.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-5 rounded-[1.5rem] border border-slate-100 dark:border-white/5 bg-white dark:bg-white/5 hover:border-blue-500/30 dark:hover:border-blue-400/30 transition-all group shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-all group-hover:rotate-6",
                      backup.status === 'SUCESSO'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600'
                        : backup.status === 'FALHA'
                          ? 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-600'
                          : 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 text-blue-600'
                    )}>
                      {backup.status === 'SUCESSO' ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : backup.status === 'FALHA' ? (
                        <XCircle className="w-6 h-6" />
                      ) : (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      )}
                    </div>
                    <div>
                      <div className="font-black text-sm uppercase tracking-tighter italic text-slate-800 dark:text-slate-100 mb-0.5">
                        {format(new Date(backup.created_at), "dd 'de' MMMM 'às' HH:mm")}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 opacity-70 italic uppercase">
                          {backup.total_registros?.toLocaleString()} registros
                        </span>
                        <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 opacity-70 italic uppercase">
                          {formatBytes(backup.tamanho_bytes)}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 italic uppercase">
                          {backup.duracao_ms}ms
                        </span>
                      </div>
                    </div>
                  </div>
                  {backup.arquivo_url && (
                    <div className="flex gap-3 h-10">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestaurar(backup)}
                        disabled={restaurarBackupMutation.isPending}
                        className="h-full rounded-xl border-amber-200 dark:border-amber-500/10 dark:hover:bg-amber-500/10 text-[10px] font-black uppercase tracking-widest px-4 text-amber-600"
                      >
                        {restaurarBackupMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCcw className="w-3.5 h-3.5 mr-2" />
                        )}
                        Restaurar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="h-full rounded-xl border-slate-200 dark:border-white/10 dark:hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest px-4"
                      >
                        <a href={backup.arquivo_url} download>
                          <Download className="w-3.5 h-3.5 mr-2 text-blue-500" />
                          JSON
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportarBackupExcel(backup)}
                        className="h-full rounded-xl border-slate-200 dark:border-white/10 dark:hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest px-4"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 mr-2 text-emerald-500" />
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

      <Alert className="bg-amber-50/50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20 rounded-2xl">
        <Database className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-900 dark:text-amber-400 font-bold uppercase text-[10px] tracking-widest italic leading-relaxed">
          Os backups são armazenados de forma isolada e incluem todas as tabelas transacionais do sistema (reservas, baixas, sequências).
          Configure a frequência automática para garantir a integridade dos dados em caso de falhas críticas.
        </AlertDescription>
      </Alert>
    </div>
  );
}