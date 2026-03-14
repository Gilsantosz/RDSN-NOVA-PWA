import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, Mail, Save, Package, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { toast } from "sonner";

export default function ConfigEstoqueMinimo({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['internalUser'],
    queryFn: () => {
      const loggedUser = localStorage.getItem('internalUser');
      return loggedUser ? JSON.parse(loggedUser) : null;
    }
  });

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['config-estoque-minimo', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await rdsn.entities.ConfiguracaoAlerta.filter({ 
        tipo_alerta: 'ESTOQUE_MINIMO',
        usuario_id: user.id 
      });
    },
    enabled: !!user && open
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-ativos'],
    queryFn: () => rdsn.entities.Produto.filter({ ativo: true }),
    enabled: open
  });

  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: () => rdsn.entities.Setor.list(),
    enabled: open
  });

  const criarMutation = useMutation({
    mutationFn: (dados) => rdsn.entities.ConfiguracaoAlerta.create({
      ...dados,
      usuario_id: user.id,
      tipo_alerta: 'ESTOQUE_MINIMO'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-estoque-minimo'] });
      queryClient.invalidateQueries({ queryKey: ['configuracoes-alerta'] });
      toast.success('Configuração de alerta de estoque criada');
      setEditando(null);
    }
  });

  const atualizarMutation = useMutation({
    mutationFn: ({ id, dados }) => rdsn.entities.ConfiguracaoAlerta.update(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-estoque-minimo'] });
      queryClient.invalidateQueries({ queryKey: ['configuracoes-alerta'] });
      toast.success('Configuração atualizada');
      setEditando(null);
    }
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => rdsn.entities.ConfiguracaoAlerta.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-estoque-minimo'] });
      queryClient.invalidateQueries({ queryKey: ['configuracoes-alerta'] });
      toast.success('Configuração removida');
    }
  });

  const handleSalvar = () => {
    if (!editando) return;
    if (editando.id) {
      atualizarMutation.mutate({ id: editando.id, dados: editando });
    } else {
      criarMutation.mutate(editando);
    }
  };

  const novaConfig = () => {
    setEditando({
      ativo: true,
      notificar_inapp: true,
      notificar_email: false,
      produtos_monitorados: [],
      setores_monitorados: [],
      parametros: JSON.stringify({ nivel_alerta: 'minimo' })
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Alertas de Estoque Mínimo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Formulário de edição */}
          {editando && (
            <Card className="border-2 border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {editando.id ? 'Editar Configuração' : 'Nova Configuração'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Bell className="w-4 h-4" /> Notificação In-App
                    </Label>
                    <Switch
                      checked={editando.notificar_inapp}
                      onCheckedChange={(v) => setEditando({ ...editando, notificar_inapp: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Notificação por Email
                    </Label>
                    <Switch
                      checked={editando.notificar_email}
                      onCheckedChange={(v) => setEditando({ ...editando, notificar_email: v })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Produtos Monitorados</Label>
                  <Select
                    value={editando.produtos_monitorados?.length > 0 ? editando.produtos_monitorados[0] : 'all'}
                    onValueChange={(v) => {
                      setEditando({
                        ...editando,
                        produtos_monitorados: v === 'all' ? [] : [v]
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os produtos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os produtos com estoque mínimo</SelectItem>
                      {produtos.filter(p => (p.estoque_minimo || 0) > 0).map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.letra_produto}{p.sufixo} - {p.descricao || p.modelo || ''} (Mín: {p.estoque_minimo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    Selecione um produto específico ou monitore todos
                  </p>
                </div>

                <div>
                  <Label>Setor Monitorado</Label>
                  <Select
                    value={editando.setores_monitorados?.length > 0 ? editando.setores_monitorados[0] : 'all'}
                    onValueChange={(v) => {
                      setEditando({
                        ...editando,
                        setores_monitorados: v === 'all' ? [] : [v]
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os setores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os setores</SelectItem>
                      {setores.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
                  <Button onClick={handleSalvar} disabled={criarMutation.isPending || atualizarMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botão Novo */}
          {!editando && (
            <Button onClick={novaConfig} className="w-full" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Configuração de Alerta
            </Button>
          )}

          {/* Lista de configurações existentes */}
          {isLoading ? (
            <div className="text-center p-4 text-slate-500">Carregando...</div>
          ) : configs.length === 0 && !editando ? (
            <Card className="bg-slate-50">
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-600">Nenhuma configuração de alerta de estoque.</p>
                <p className="text-sm text-slate-500 mt-1">
                  Configure alertas para ser notificado quando produtos atingirem o estoque mínimo.
                </p>
              </CardContent>
            </Card>
          ) : (
            configs.map(config => (
              <Card key={config.id} className={!config.ativo ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={config.ativo ? "default" : "secondary"}>
                          {config.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {config.notificar_inapp && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Bell className="w-3 h-3" /> In-App
                          </Badge>
                        )}
                        {config.notificar_email && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Mail className="w-3 h-3" /> Email
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        {config.produtos_monitorados?.length > 0 
                          ? `Produto: ${produtos.find(p => p.id === config.produtos_monitorados[0])?.letra_produto || ''}${produtos.find(p => p.id === config.produtos_monitorados[0])?.sufixo || ''}`
                          : 'Todos os produtos'}
                        {config.setores_monitorados?.length > 0 
                          ? ` | Setor: ${setores.find(s => s.id === config.setores_monitorados[0])?.nome || ''}`
                          : ' | Todos os setores'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Alertas enviados: {config.total_alertas_enviados || 0}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditando({ ...config })}>
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deletarMutation.mutate(config.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {/* Info sobre automação */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            <strong>ℹ️ Como funciona:</strong> O sistema verifica automaticamente a cada 30 minutos se algum produto 
            está com estoque abaixo do mínimo configurado. Quando detectado, envia notificações conforme suas configurações.
            O nível mínimo de cada produto é definido na edição do próprio produto.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}