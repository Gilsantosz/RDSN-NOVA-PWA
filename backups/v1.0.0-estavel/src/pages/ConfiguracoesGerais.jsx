import React, { useState } from 'react';
import { base44 } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Save, Package, Shield, Bell, Info, Database, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import GerenciadorBackups from '@/components/admin/GerenciadorBackups';
import RestaurarBackup from '@/components/admin/RestaurarBackup';
import RedefinirParaCopia from '@/components/admin/RedefinirParaCopia';

function RestaurarBackupSection() {
  const { data: backups = [] } = useQuery({
    queryKey: ['backup-historico-restaurar'],
    queryFn: () => base44.entities.BackupHistorico.list('-created_at', 10),
  });
  return <RestaurarBackup backups={backups.map(b => ({ ...b, ...b.data || b }))} />;
}

export default function ConfiguracoesGerais() {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState({});

  const { data: configuracoes = [], isLoading } = useQuery({
    queryKey: ['configuracoes-gerais'],
    queryFn: () => base44.entities.ConfiguracaoGeral.list()
  });

  // Inicializar configurações padrão se não existirem
  const { data: configsInicializadas } = useQuery({
    queryKey: ['configs-inicializadas'],
    queryFn: async () => {
      const configs = await base44.entities.ConfiguracaoGeral.list();

      if (configs.length === 0) {
        const configsPadrao = [
          // Estoque
          {
            chave: 'estoque_minimo_alerta',
            categoria: 'ESTOQUE',
            nome: 'Limite de Estoque Mínimo',
            descricao: 'Quantidade mínima em estoque antes de gerar alerta',
            valor: '100',
            tipo_valor: 'numero',
            valor_padrao: '100',
            unidade: 'unidades'
          },
          {
            chave: 'estoque_critico',
            categoria: 'ESTOQUE',
            nome: 'Estoque Crítico',
            descricao: 'Nível de estoque considerado crítico',
            valor: '50',
            tipo_valor: 'numero',
            valor_padrao: '50',
            unidade: 'unidades'
          },
          {
            chave: 'alertas_estoque_ativos',
            categoria: 'ESTOQUE',
            nome: 'Alertas de Estoque Ativos',
            descricao: 'Ativar ou desativar alertas automáticos de estoque',
            valor: 'true',
            tipo_valor: 'booleano',
            valor_padrao: 'true'
          },

          // Auditoria
          {
            chave: 'retencao_auditoria_dias',
            categoria: 'AUDITORIA',
            nome: 'Período de Retenção de Auditoria',
            descricao: 'Número de dias para manter registros de auditoria',
            valor: '365',
            tipo_valor: 'numero',
            valor_padrao: '365',
            unidade: 'dias'
          },
          {
            chave: 'auditoria_detalhada',
            categoria: 'AUDITORIA',
            nome: 'Auditoria Detalhada',
            descricao: 'Registrar detalhes completos em todas as operações',
            valor: 'true',
            tipo_valor: 'booleano',
            valor_padrao: 'true'
          },

          // Notificações
          {
            chave: 'notificacoes_email_ativas',
            categoria: 'NOTIFICACOES',
            nome: 'Notificações por Email',
            descricao: 'Enviar notificações por email',
            valor: 'true',
            tipo_valor: 'booleano',
            valor_padrao: 'true'
          },
          {
            chave: 'template_alerta_estoque',
            categoria: 'NOTIFICACOES',
            nome: 'Template de Alerta de Estoque',
            descricao: 'Template de mensagem para alertas de estoque baixo',
            valor: 'ATENÇÃO: O produto {{produto}} está com estoque baixo ({{quantidade}} unidades).',
            tipo_valor: 'texto',
            valor_padrao: 'ATENÇÃO: O produto {{produto}} está com estoque baixo ({{quantidade}} unidades).'
          },
          {
            chave: 'template_notificacao_baixa',
            categoria: 'NOTIFICACOES',
            nome: 'Template de Notificação de Baixa',
            descricao: 'Template para notificações de baixa registrada',
            valor: 'Baixa registrada: {{quantidade}} unidades do lote {{codigo}}.',
            tipo_valor: 'texto',
            valor_padrao: 'Baixa registrada: {{quantidade}} unidades do lote {{codigo}}.'
          },

          // Sistema
          {
            chave: 'max_resultados_pagina',
            categoria: 'SISTEMA',
            nome: 'Resultados por Página',
            descricao: 'Número máximo de resultados exibidos por página',
            valor: '50',
            tipo_valor: 'numero',
            valor_padrao: '50',
            unidade: 'registros'
          }
        ];

        await Promise.all(
          configsPadrao.map(cfg => base44.entities.ConfiguracaoGeral.create(cfg))
        );

        queryClient.invalidateQueries({ queryKey: ['configuracoes-gerais'] });
      }

      return true;
    }
  });

  const atualizarMutation = useMutation({
    mutationFn: ({ id, dados }) => base44.entities.ConfiguracaoGeral.update(id, dados),
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
      <Card key={config.id} className="border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-lg transition-all duration-300 overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base font-bold dark:text-slate-100">{config.nome}</CardTitle>
              <CardDescription className="text-xs mt-1 dark:text-slate-400">{config.descricao}</CardDescription>
            </div>
            {foiEditado && (
              <Button
                size="sm"
                onClick={() => handleSalvar(config)}
                disabled={atualizarMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-white font-bold"
              >
                <Save className="w-3 h-3 mr-1" />
                Salvar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {config.tipo_valor === 'booleano' ? (
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {valorAtual === 'true' ? 'Ativado' : 'Desativado'}
                </Label>
                <Switch
                  checked={valorAtual === 'true'}
                  onCheckedChange={(checked) => handleChange(config.id, checked ? 'true' : 'false')}
                />
              </div>
            ) : config.tipo_valor === 'texto' && config.valor.length > 100 ? (
              <Textarea
                value={valorAtual}
                onChange={(e) => handleChange(config.id, e.target.value)}
                className="min-h-[100px] text-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                placeholder={config.valor_padrao}
              />
            ) : (
              <div className="flex gap-2">
                <Input
                  type={config.tipo_valor === 'numero' ? 'number' : 'text'}
                  value={valorAtual}
                  onChange={(e) => handleChange(config.id, e.target.value)}
                  placeholder={config.valor_padrao}
                  className="flex-1 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
                {config.unidade && (
                  <div className="flex items-center px-4 bg-slate-100 dark:bg-slate-800 rounded-md text-sm font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {config.unidade}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500 italic">
              <Info className="w-3.5 h-3.5" />
              <span>Configuração padrão: <strong>{config.valor_padrao} {config.unidade || ''}</strong></span>
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
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
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

        <Alert className="mb-6 dark:bg-slate-900 dark:border-slate-800">
          <Info className="h-4 w-4" />
          <AlertDescription className="dark:text-slate-300">
            As alterações nas configurações afetarão o comportamento do sistema. Revise cuidadosamente antes de salvar.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="ESTOQUE" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border dark:border-slate-800">
            <TabsTrigger value="ESTOQUE" className="flex items-center gap-2 rounded-lg transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
              <Package className="w-4 h-4" />
              Estoque
            </TabsTrigger>
            <TabsTrigger value="AUDITORIA" className="flex items-center gap-2 rounded-lg transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
              <Shield className="w-4 h-4" />
              Auditoria
            </TabsTrigger>
            <TabsTrigger value="NOTIFICACOES" className="flex items-center gap-2 rounded-lg transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
              <Bell className="w-4 h-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="BACKUP" className="flex items-center gap-2 rounded-lg transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
              <Database className="w-4 h-4" />
              Backups
            </TabsTrigger>
            <TabsTrigger value="SISTEMA" className="flex items-center gap-2 rounded-lg transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
              <Settings className="w-4 h-4" />
              Sistema
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ESTOQUE" className="space-y-4">
            {configsPorCategoria.ESTOQUE.map(renderConfiguracao)}
          </TabsContent>

          <TabsContent value="AUDITORIA" className="space-y-4">
            {configsPorCategoria.AUDITORIA.map(renderConfiguracao)}
          </TabsContent>

          <TabsContent value="NOTIFICACOES" className="space-y-4">
            {configsPorCategoria.NOTIFICACOES.map(renderConfiguracao)}
          </TabsContent>

          <TabsContent value="BACKUP" className="space-y-4">
            <GerenciadorBackups />
            <RestaurarBackupSection />
            <RedefinirParaCopia />
          </TabsContent>

          <TabsContent value="SISTEMA" className="space-y-4">
            {configsPorCategoria.SISTEMA.map(renderConfiguracao)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}