// @ts-nocheck
import React, { useState } from 'react';
import { rdsn } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Save, Package, Shield, Bell, Info, Database } from 'lucide-react';
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import GerenciadorBackups from '@/components/admin/GerenciadorBackups';
import RestaurarBackup from '@/components/admin/RestaurarBackup';
import RedefinirParaCopia from '@/components/admin/RedefinirParaCopia';

function RestaurarBackupSection() {
  const { data: backups = [] } = useQuery({
    queryKey: ['backup-historico-restaurar'],
    queryFn: () => rdsn.entities.BackupHistorico.list('-created_at', 10),
  });
  return <RestaurarBackup backups={backups.map(b => ({ ...b, ...b.data || b }))} />;
}

export default function ConfiguracoesGerais() {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState({});

  const { data: configuracoes = [], isLoading } = useQuery({
    queryKey: ['configuracoes-gerais'],
    queryFn: () => rdsn.entities.ConfiguracaoGeral.list()
  });

  const atualizarMutation = useMutation({
    mutationFn: (vars) => rdsn.entities.ConfiguracaoGeral.update(vars.id, vars.dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-gerais'] });
      toast.success('Configuração atualizada com sucesso');
      setEditando({});
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    }
  });

  const handleSalvar = (config) => {
    const valorEditado = editando[config.id];
    if (valorEditado !== undefined) {
      atualizarMutation.mutate({
        id: config.id,
        dados: { ...config, valor: valorEditado }
      });
    }
  };

  const handleChange = (configId, valor) => {
    setEditando({ ...editando, [configId]: valor });
  };

  const getValorAtual = (config) => {
    return editando[config.id] !== undefined ? editando[config.id] : config.valor;
  };

  const renderConfiguracao = (config) => {
    const valorAtual = getValorAtual(config);
    const foiEditado = editando[config.id] !== undefined;

    return (
      <Card key={config.id} className="border-slate-200 dark:border-white/10 dark:bg-slate-900/40 backdrop-blur-xl shadow-lg transition-all duration-300 overflow-hidden rounded-2xl">
        <CardHeader className="pb-4 border-b border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base font-black uppercase tracking-tighter italic text-slate-800 dark:text-slate-100">{config.nome}</CardTitle>
              <CardDescription className="text-xs mt-1 dark:text-slate-400 font-medium">{config.descricao}</CardDescription>
            </div>
            {foiEditado && (
              <Button
                size="sm"
                onClick={() => handleSalvar(config)}
                disabled={atualizarMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-white font-black uppercase text-[10px] tracking-widest px-4 h-8 rounded-lg shadow-lg shadow-emerald-500/20"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Salvar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {config.tipo_valor === 'booleano' ? (
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-white/5">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                  Estado Atual: <span className={valorAtual === 'true' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>{valorAtual === 'true' ? 'ATIVADO' : 'DESATIVADO'}</span>
                </Label>
                <Switch
                  checked={valorAtual === 'true'}
                  onCheckedChange={(checked) => handleChange(config.id, checked ? 'true' : 'false')}
                />
              </div>
            ) : config.tipo_valor === 'texto' && config.valor.length > 100 ? (
              <div className="relative">
                <Textarea
                  value={valorAtual}
                  onChange={(e) => handleChange(config.id, e.target.value)}
                  className="min-h-[120px] text-sm bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 rounded-xl italic leading-relaxed"
                  placeholder={config.valor_padrao}
                />
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Input
                    type={config.tipo_valor === 'numero' ? 'number' : 'text'}
                    value={valorAtual}
                    onChange={(e) => handleChange(config.id, e.target.value)}
                    placeholder={config.valor_padrao}
                    className="h-11 bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 rounded-xl font-bold px-4"
                  />
                </div>
                {config.unidade && (
                  <div className="flex items-center px-4 bg-slate-100 dark:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5">
                    {config.unidade}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest italic">
                Valor padrão: <strong className="text-slate-600 dark:text-slate-300">{config.valor_padrao} {config.unidade || ''}</strong>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const configsPorCategoria = {
    ESTOQUE: configuracoes.filter(c => c.categoria === 'ESTOQUE'),
    AUDITORIA: configuracoes.filter(c => c.categoria === 'AUDITORIA'),
    NOTIFICACOES: configuracoes.filter(c => c.categoria === 'NOTIFICACOES'),
    SISTEMA: configuracoes.filter(c => c.categoria === 'SISTEMA'),
    BACKUP: configuracoes.filter(c => c.categoria === 'BACKUP')
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-40 bg-slate-200 dark:bg-slate-900 rounded-[2.5rem]"></div>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64 bg-slate-200 dark:bg-slate-900 rounded-2xl"></div>
            <div className="h-64 bg-slate-200 dark:bg-slate-900 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(100,116,139,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-slate-600 to-slate-800 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(100,116,139,0.3)] transition-all hover:scale-105 active:scale-95 group border border-slate-400/20">
                <Settings className="w-8 h-8 sm:w-10 sm:h-10 text-white group-hover:rotate-90 transition-all duration-500" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Configurações <span className="text-slate-600 dark:text-slate-400">Gerais</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80">
                  Sistema • Operações • Parâmetros
                </p>
              </div>
            </div>
          </div>
        </div>

        <Alert className="mb-6 bg-blue-50/50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/20 rounded-2xl">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 dark:text-blue-400 font-bold uppercase text-[10px] tracking-widest italic">
            As alterações nas configurações afetarão o comportamento do sistema. Revise cuidadosamente antes de salvar.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="ESTOQUE" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5 backdrop-blur-xl">
            <TabsTrigger value="ESTOQUE" className="flex items-center gap-2 rounded-xl transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-lg font-bold text-xs uppercase tracking-widest">
              <Package className="w-4 h-4" />
              Estoque
            </TabsTrigger>
            <TabsTrigger value="AUDITORIA" className="flex items-center gap-2 rounded-xl transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-lg font-bold text-xs uppercase tracking-widest">
              <Shield className="w-4 h-4" />
              Auditoria
            </TabsTrigger>
            <TabsTrigger value="NOTIFICACOES" className="flex items-center gap-2 rounded-xl transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-lg font-bold text-xs uppercase tracking-widest">
              <Bell className="w-4 h-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="BACKUP" className="flex items-center gap-2 rounded-xl transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-lg font-bold text-xs uppercase tracking-widest">
              <Database className="w-4 h-4" />
              Backups
            </TabsTrigger>
            <TabsTrigger value="SISTEMA" className="flex items-center gap-2 rounded-xl transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-lg font-bold text-xs uppercase tracking-widest">
              <Settings className="w-4 h-4" />
              Sistema
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ESTOQUE" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {configsPorCategoria.ESTOQUE.map(renderConfiguracao)}
          </TabsContent>

          <TabsContent value="AUDITORIA" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {configsPorCategoria.AUDITORIA.map(renderConfiguracao)}
          </TabsContent>

          <TabsContent value="NOTIFICACOES" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {configsPorCategoria.NOTIFICACOES.map(renderConfiguracao)}
          </TabsContent>

          <TabsContent value="BACKUP" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <GerenciadorBackups />
            <RestaurarBackupSection />
            <RedefinirParaCopia />
          </TabsContent>

          <TabsContent value="SISTEMA" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {configsPorCategoria.SISTEMA.map(renderConfiguracao)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}