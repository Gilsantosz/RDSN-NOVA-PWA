import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Save, Plus, Trash2, Shield, Copy, Eye, Edit3 } from 'lucide-react';
import { MODULOS_PERMISSOES } from '@/components/hooks/usePermissoes';

export default function PermissoesManager() {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [permissoes, setPermissoes] = useState({});
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showDuplicar, setShowDuplicar] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles-permissoes'],
    queryFn: async () => {
      return await base44.entities.PermissaoRole.list('-created_at');
    },
  });

  const selectedRole = useMemo(() => roles.find(r => r.id === selectedRoleId), [roles, selectedRoleId]);

  // Ao selecionar um role, carrega suas permissões
  const handleSelectRole = (role) => {
    setSelectedRoleId(role.id);
    setPermissoes(role.permissoes || {});
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoleId) return;
      return base44.entities.PermissaoRole.update(selectedRoleId, { permissoes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-permissoes'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissoes'] });
      toast.success('Permissões salvas com sucesso!');
    },
    onError: (error) => toast.error('Erro: ' + error.message),
  });

  const createRoleMutation = useMutation({
    mutationFn: async ({ nome, descricao, permissoesBase }) => {
      const existing = await base44.entities.PermissaoRole.filter({ role: nome });
      if (existing.length > 0) throw new Error('Já existe um papel com esse nome');
      return base44.entities.PermissaoRole.create({
        role: nome,
        descricao,
        is_custom: true,
        permissoes: permissoesBase || {},
        ativo: true,
      });
    },
    onSuccess: (newRole) => {
      queryClient.invalidateQueries({ queryKey: ['roles-permissoes'] });
      setShowCreateRole(false);
      setShowDuplicar(false);
      setNewRoleName('');
      setNewRoleDesc('');
      handleSelectRole(newRole);
      toast.success('Papel criado com sucesso!');
    },
    onError: (error) => toast.error('Erro: ' + error.message),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.PermissaoRole.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-permissoes'] });
      setSelectedRoleId(null);
      setPermissoes({});
      toast.success('Papel excluído!');
    },
    onError: (error) => toast.error('Erro: ' + error.message),
  });

  const handleToggle = (key, value) => {
    setPermissoes(prev => ({ ...prev, [key]: value }));
  };

  const handleModuloToggle = (modulo, ativar) => {
    const novas = { ...permissoes };
    modulo.acoes.forEach(a => { novas[a.key] = ativar; });
    setPermissoes(novas);
  };

  const isModuloCompleto = (modulo) => modulo.acoes.every(a => permissoes[a.key] === true);
  const isModuloParcial = (modulo) => modulo.acoes.some(a => permissoes[a.key] === true) && !isModuloCompleto(modulo);

  const totalPermsAtivas = Object.values(permissoes).filter(v => v === true).length;
  const totalPermsDisponiveis = MODULOS_PERMISSOES.reduce((acc, m) => acc + m.acoes.length, 0);

  const handleMarcarTodos = (ativar) => {
    const novas = {};
    MODULOS_PERMISSOES.forEach(m => m.acoes.forEach(a => { novas[a.key] = ativar; }));
    setPermissoes(novas);
  };

  if (isLoading) {
    return (
      <Card><CardContent className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Gerenciador de Papéis e Permissões
          </h2>
          <p className="text-slate-500 text-sm mt-1">Crie papéis customizados com permissões granulares por módulo</p>
        </div>
        <Button onClick={() => setShowCreateRole(true)} className="bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-2" />
          Criar Novo Papel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lista de Roles */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Papéis Disponíveis</p>
          {roles.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">Nenhum papel criado ainda.</p>
          )}
          {roles.map(role => {
            const isSelected = selectedRoleId === role.id;
            const permsCount = role.permissoes ? Object.values(role.permissoes).filter(v => v === true).length : 0;
            return (
              <button
                key={role.id}
                onClick={() => handleSelectRole(role)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{role.role}</span>
                  {role.is_custom && (
                    <Badge variant="outline" className={`text-[10px] ${isSelected ? 'border-white/50 text-white/80' : ''}`}>
                      Custom
                    </Badge>
                  )}
                </div>
                {role.descricao && (
                  <p className={`text-xs mt-1 ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                    {role.descricao}
                  </p>
                )}
                <p className={`text-xs mt-1 ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
                  {permsCount} permissões ativas
                </p>
              </button>
            );
          })}
        </div>

        {/* Editor de Permissões */}
        <div className="lg:col-span-3">
          {!selectedRole ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Shield className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">Selecione um papel para editar suas permissões</p>
                <p className="text-slate-400 text-sm mt-1">Ou crie um novo papel com o botão acima</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {selectedRole.role}
                      {selectedRole.is_custom && <Badge variant="outline" className="text-xs">Custom</Badge>}
                    </CardTitle>
                    <CardDescription>
                      {totalPermsAtivas} de {totalPermsDisponiveis} permissões ativas
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleMarcarTodos(true)}>
                      Marcar Todos
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleMarcarTodos(false)}>
                      Desmarcar Todos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewRoleName(selectedRole.role + ' (cópia)');
                        setNewRoleDesc(selectedRole.descricao || '');
                        setShowDuplicar(true);
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Duplicar
                    </Button>
                    {selectedRole.is_custom && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (confirm(`Excluir o papel "${selectedRole.role}"?`)) {
                            deleteRoleMutation.mutate(selectedRole.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {MODULOS_PERMISSOES.map((modulo) => {
                  const completo = isModuloCompleto(modulo);
                  const parcial = isModuloParcial(modulo);
                  return (
                    <div key={modulo.modulo} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-800">{modulo.label}</span>
                          {completo && <Badge className="bg-green-100 text-green-800 text-[10px]">Completo</Badge>}
                          {parcial && <Badge className="bg-amber-100 text-amber-800 text-[10px]">Parcial</Badge>}
                        </div>
                        <Switch checked={completo} onCheckedChange={(v) => handleModuloToggle(modulo, v)} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-3">
                        {modulo.acoes.map((acao) => (
                          <label
                            key={acao.key}
                            className="flex items-center justify-between p-2 rounded-md border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {acao.label.includes('Visualizar') && <Eye className="w-3 h-3 text-slate-400" />}
                              {(acao.label.includes('Editar') || acao.label.includes('Registrar') || acao.label.includes('Fechar') || acao.label.includes('Configurar') || acao.label.includes('Gerenciar') || acao.label.includes('Ajustar')) && <Edit3 className="w-3 h-3 text-blue-400" />}
                              {(acao.label.includes('Criar') || acao.label.includes('Exportar')) && <Plus className="w-3 h-3 text-green-400" />}
                              {(acao.label.includes('Excluir') || acao.label.includes('Cancelar')) && <Trash2 className="w-3 h-3 text-red-400" />}
                              <span className="text-xs text-slate-700">{acao.label}</span>
                            </div>
                            <Switch
                              checked={permissoes[acao.key] === true}
                              onCheckedChange={(v) => handleToggle(acao.key, v)}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
              <div className="p-4 border-t border-slate-200 flex justify-end">
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Permissões
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog: Criar Novo Papel */}
      <Dialog open={showCreateRole} onOpenChange={setShowCreateRole}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Papel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Papel *</Label>
              <Input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Ex: Supervisor de Qualidade"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                placeholder="Breve descrição do papel"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateRole(false)}>Cancelar</Button>
            <Button
              onClick={() => createRoleMutation.mutate({ nome: newRoleName, descricao: newRoleDesc, permissoesBase: {} })}
              disabled={!newRoleName.trim() || createRoleMutation.isPending}
            >
              Criar Papel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Duplicar Papel */}
      <Dialog open={showDuplicar} onOpenChange={setShowDuplicar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar Papel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Novo Papel *</Label>
              <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicar(false)}>Cancelar</Button>
            <Button
              onClick={() => createRoleMutation.mutate({ nome: newRoleName, descricao: newRoleDesc, permissoesBase: permissoes })}
              disabled={!newRoleName.trim() || createRoleMutation.isPending}
            >
              Duplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}