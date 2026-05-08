// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bell, Mail, AlertTriangle, Clock, Activity,
  Package, Plus, Trash2, Save, Settings, AlertCircle
} from 'lucide-react';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TIPOS_ALERTA = [
  {
    tipo: 'ESTOQUE_MINIMO',
    nome: 'Estoque Mínimo Atingido',
    descricao: 'Alerta quando um produto atinge o nível mínimo de estoque configurado',
    icon: Package,
    cor: 'red',
    parametros: [
      {
        key: 'nivel_alerta', label: 'Nível de Alerta', type: 'select', options: [
          { value: 'minimo', label: 'No mínimo' },
          { value: 'proximo', label: '10% acima do mínimo' }
        ], default: 'minimo'
      }
    ]
  },
  {
    tipo: 'RESERVA_ESGOTAMENTO',
    nome: 'Reserva Próxima ao Esgotamento',
    descricao: 'Alerta quando uma reserva atinge certo percentual de produção',
    icon: Package,
    cor: 'orange',
    parametros: [
      { key: 'percentual', label: 'Percentual de Utilização (%)', type: 'number', default: 85, min: 50, max: 100 }
    ]
  },
  {
    tipo: 'PRODUCAO_PARADA',
    nome: 'Produção Parada',
    descricao: 'Alerta quando lote em produção fica X dias sem movimentação',
    icon: Clock,
    cor: 'red',
    parametros: [
      { key: 'dias', label: 'Dias Sem Movimento', type: 'number', default: 3, min: 1, max: 30 }
    ]
  },
  {
    tipo: 'PROBLEMA_AUDITORIA',
    nome: 'Problema Crítico na Auditoria',
    descricao: 'Alerta quando problemas críticos são detectados na numeração',
    icon: AlertTriangle,
    cor: 'red',
    parametros: []
  },
  {
    tipo: 'BAIXA_FORA_PADRAO',
    nome: 'Baixa Manual Fora do Padrão',
    descricao: 'Alerta quando baixas manuais excedem quantidade limite',
    icon: Activity,
    cor: 'amber',
    parametros: [
      { key: 'quantidade_maxima', label: 'Quantidade Máxima por Baixa', type: 'number', default: 1000, min: 100, max: 10000 }
    ]
  }
];

// Garante parse seguro — suporta string, object ou null
const safeParseParams = (parametros) => {
  if (!parametros) return {};
  if (typeof parametros === 'object' && !Array.isArray(parametros)) return parametros;
  try { return JSON.parse(parametros); } catch { return {}; }
};

export default function ConfiguracaoAlertas() {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(null);
  const [novoAlerta, setNovoAlerta] = useState(null);

  // FIX: usa rdsn.auth.me() que já trata Supabase + SessionManager (fallback local)
  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => rdsn.auth.me(),
    retry: false,
    staleTime: 60_000,
  });

  const { data: configuracoes = [], isLoading, isError, error } = useQuery({
    queryKey: ['configuracoes-alerta', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await rdsn.entities.ConfiguracaoAlerta.filter({ usuario_id: user.id });
    },
    enabled: !loadingUser,
    retry: 1,
  });

  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: () => rdsn.entities.Setor.list(),
  });

  // FIX: invalidateQueries com sintaxe React Query v5 ({ queryKey: [...] })
  const QUERY_KEY = { queryKey: ['configuracoes-alerta', user?.id] };

  const criarMutation = useMutation({
    mutationFn: (dados) => rdsn.entities.ConfiguracaoAlerta.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries(QUERY_KEY);
      toast.success('Configuração de alerta criada');
      setNovoAlerta(null);
    },
    onError: (err) => toast.error(`Erro ao criar configuração: ${err?.message || ''}`)
  });

  const atualizarMutation = useMutation({
    mutationFn: ({ id, dados }) => rdsn.entities.ConfiguracaoAlerta.update(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries(QUERY_KEY);
      toast.success('Configuração atualizada');
      setEditando(null);
    },
    onError: (err) => toast.error(`Erro ao atualizar: ${err?.message || ''}`)
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => rdsn.entities.ConfiguracaoAlerta.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(QUERY_KEY);
      toast.success('Configuração removida');
    },
    onError: (err) => toast.error(`Erro ao remover: ${err?.message || ''}`)
  });

  const getConfigTipo = (tipo) => TIPOS_ALERTA.find(t => t.tipo === tipo);

  const handleSalvar = (config) => {
    if (config.id) {
      atualizarMutation.mutate({ id: config.id, dados: config });
    } else {
      criarMutation.mutate({ ...config, usuario_id: user.id });
    }
  };

  const renderFormulario = (config, onChange) => {
    const tipoConfig = getConfigTipo(config.tipo_alerta);
    // FIX: parse seguro — suporta string, objeto ou null vindos do Supabase JSONB
    const parametros = safeParseParams(config.parametros);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tipoConfig && <tipoConfig.icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">{tipoConfig?.nome}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">{tipoConfig?.descricao}</p>
            </div>
          </div>
          <Badge variant={config.ativo ? "default" : "secondary"}>
            {config.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <Label>Status</Label>
            <Switch
              checked={!!config.ativo}
              onCheckedChange={(v) => onChange({ ...config, ativo: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <Label>Notificação In-App</Label>
            </div>
            <Switch
              checked={!!config.notificar_inapp}
              onCheckedChange={(v) => onChange({ ...config, notificar_inapp: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <Label>Notificação por Email</Label>
            </div>
            <Switch
              checked={!!config.notificar_email}
              onCheckedChange={(v) => onChange({ ...config, notificar_email: v })}
            />
          </div>
        </div>

        {tipoConfig?.parametros.map(param => (
          <div key={param.key}>
            <Label>{param.label}</Label>
            {param.type === 'select' ? (
              <Select
                value={String(parametros[param.key] ?? param.default)}
                onValueChange={(v) => {
                  const novosParams = { ...parametros, [param.key]: v };
                  onChange({ ...config, parametros: novosParams });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {param.options?.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={param.type}
                min={param.min}
                max={param.max}
                value={parametros[param.key] ?? param.default}
                onChange={(e) => {
                  const novosParams = { ...parametros, [param.key]: Number(e.target.value) };
                  // FIX: armazena como objeto (não string) — Supabase JSONB preserva nativamente
                  onChange({ ...config, parametros: novosParams });
                }}
              />
            )}
          </div>
        ))}

        <div>
          <Label>Setores Monitorados</Label>
          <Select
            value={config.setores_monitorados?.[0] || 'all'}
            onValueChange={(v) => {
              onChange({
                ...config,
                setores_monitorados: v === 'all' ? [] : [v]
              });
            }}
          >
            <SelectTrigger><SelectValue placeholder="Todos os setores" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {setores.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.nome || s.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => { setEditando(null); setNovoAlerta(null); }}>
            Cancelar
          </Button>
          <Button
            onClick={() => handleSalvar(config)}
            disabled={criarMutation.isPending || atualizarMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {criarMutation.isPending || atualizarMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    );
  };

  if (loadingUser) {
    return <div className="p-6 dark:text-slate-100">Carregando...</div>;
  }

  if (!user) {
    return (
      <div className="p-6 flex items-center gap-3 text-amber-600">
        <AlertCircle className="w-5 h-5" />
        <span>Usuário não autenticado. Faça login para gerenciar alertas.</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(251,191,36,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-500 to-orange-400 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all hover:scale-105 active:scale-95 group">
                <Settings className="w-8 h-8 sm:w-6 sm:h-6 text-white group-hover:rotate-90 transition-transform duration-500" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Gestão de <span className="text-amber-500 dark:text-amber-400">Regras</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80">
                  Configuração de Alertas Automáticos • Monitoramento
                </p>
              </div>
            </div>

            <Button
              onClick={() => setNovoAlerta({ tipo_alerta: '', ativo: true, notificar_inapp: true, notificar_email: false })}
              className="h-14 px-8 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white transition-all font-black uppercase text-[10px] tracking-[0.2em] italic gap-3 shadow-xl shadow-amber-500/20 active:scale-95 border-b-4 border-amber-700"
            >
              <Plus className="w-4 h-4" />
              Novo Alerta
            </Button>
          </div>
        </div>

        {/* Novo Alerta */}
        {novoAlerta && (
          <Card className="border-2 border-blue-500">
            <CardHeader>
              <CardTitle>Criar Nova Configuração de Alerta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tipo de Alerta</Label>
                <Select
                  value={novoAlerta.tipo_alerta}
                  onValueChange={(v) => {
                    const tipoConfig = getConfigTipo(v);
                    const defaultParams = {};
                    tipoConfig?.parametros.forEach(p => { defaultParams[p.key] = p.default; });
                    setNovoAlerta({ ...novoAlerta, tipo_alerta: v, parametros: defaultParams });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_ALERTA.map(tipo => (
                      <SelectItem key={tipo.tipo} value={tipo.tipo}>{tipo.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {novoAlerta.tipo_alerta && renderFormulario(novoAlerta, setNovoAlerta)}
            </CardContent>
          </Card>
        )}

        {/* FIX: trata estado de erro explicitamente */}
        {isError && (
          <Card className="border-red-300">
            <CardContent className="p-6 flex items-center gap-3 text-red-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold">Erro ao carregar configurações</p>
                <p className="text-sm text-red-500">{error?.message || 'Verifique se a tabela ConfiguracaoAlerta existe no banco.'}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Configurações */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center text-slate-500">
              Carregando configurações...
            </CardContent>
          </Card>
        ) : !isError && configuracoes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-600">Nenhuma configuração de alerta criada.</p>
              <p className="text-sm text-slate-500 mt-1">Clique em "Novo Alerta" para começar.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {TIPOS_ALERTA.map(tipoAlerta => {
              const configs = configuracoes.filter(c => c.tipo_alerta === tipoAlerta.tipo);
              if (configs.length === 0) return null;

              return (
                <Card key={tipoAlerta.tipo}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <tipoAlerta.icon className={cn("w-5 h-5", `text-${tipoAlerta.cor}-600`)} />
                      <CardTitle className="text-lg">{tipoAlerta.nome}</CardTitle>
                      <Badge variant="secondary" className="ml-auto">{configs.length}</Badge>
                    </div>
                    <CardDescription>{tipoAlerta.descricao}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {configs.map(config => (
                      <Card key={config.id} className={cn("border", !config.ativo && "bg-slate-50 dark:bg-slate-900/30")}>
                        <CardContent className="p-4">
                          {editando?.id === config.id ? (
                            renderFormulario(editando, setEditando)
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant={config.ativo ? "default" : "secondary"}>
                                      {config.ativo ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                    {config.notificar_inapp && (
                                      <Badge variant="outline" className="gap-1">
                                        <Bell className="w-3 h-3" /> In-App
                                      </Badge>
                                    )}
                                    {config.notificar_email && (
                                      <Badge variant="outline" className="gap-1">
                                        <Mail className="w-3 h-3" /> Email
                                      </Badge>
                                    )}
                                  </div>
                                  {config.parametros && (
                                    <div className="text-sm text-slate-600 dark:text-slate-400">
                                      {Object.entries(safeParseParams(config.parametros))
                                        .map(([k, v]) => `${k}: ${v}`)
                                        .join(', ')}
                                    </div>
                                  )}
                                  {config.setores_monitorados?.length > 0 && (
                                    <div className="text-sm text-slate-600 dark:text-slate-400">
                                      Setores: {config.setores_monitorados
                                        .map(sid => setores.find(s => s.id === sid)?.nome || sid)
                                        .join(', ')}
                                    </div>
                                  )}
                                  <div className="text-xs text-slate-500">
                                    Alertas enviados: {config.total_alertas_enviados || 0}
                                  </div>
                                </div>
                                <div className="flex gap-2 ml-3 shrink-0">
                                  <Button variant="outline" size="sm" onClick={() => setEditando(config)}>
                                    Editar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={deletarMutation.isPending}
                                    onClick={() => deletarMutation.mutate(config.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}