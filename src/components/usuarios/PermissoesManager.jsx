import React, { useState, useMemo } from 'react';
import { rdsn } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { 
  Loader2, Save, Trash, Shield, Copy, 
  ChevronRight, Search, PlusCircle, Layers
} from 'lucide-react';
import { MODULOS_PERMISSOES } from '@/components/hooks/usePermissoes';
import { cn } from '@/lib/utils';
import PermissoesUsuario from './PermissoesUsuario';

export default function PermissoesManager() {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [permissoes, setPermissoes] = useState({});
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showDuplicar, setShowDuplicar] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles-permissoes'],
    queryFn: async () => {
      return await rdsn.entities.PermissaoRole.list('-created_at');
    },
  });

  const selectedRole = useMemo(() => roles.find(r => r.id === selectedRoleId), [roles, selectedRoleId]);

  const filteredRoles = roles.filter(r => 
    r.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.descricao && r.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectRole = (role) => {
    setSelectedRoleId(role.id);
    setPermissoes(role.permissoes || {});
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoleId) return;
      return rdsn.entities.PermissaoRole.update(selectedRoleId, { permissoes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-permissoes'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissoes'] });
      toast.success('Alterações salvas no banco central de acesso.');
    },
    onError: (error) => toast.error('Critico: Falha ao persistir permissões. ' + error.message),
  });

  const createRoleMutation = useMutation({
    mutationFn: async ({ nome, descricao, permissoesBase }) => {
      const existing = await rdsn.entities.PermissaoRole.filter({ role: nome });
      if (existing.length > 0) throw new Error('Identificador de papel já em uso.');
      return rdsn.entities.PermissaoRole.create({
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
      toast.success('Novo protocolo de acesso gerado com sucesso.');
    },
    onError: (error) => toast.error('Falha na criação: ' + error.message),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id) => {
      return rdsn.entities.PermissaoRole.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-permissoes'] });
      setSelectedRoleId(null);
      setPermissoes({});
      toast.success('Papel removido do sistema de segurança.');
    },
    onError: (error) => toast.error('Bloqueado: ' + error.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Premium */}
      <div className="relative p-10 rounded-[3rem] bg-slate-900 border border-white/10 overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full -mr-64 -mt-64 blur-[120px] transition-all" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full -ml-40 -mb-40 blur-[100px]" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
              <Shield className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] uppercase font-black tracking-widest text-purple-100">Segurança de Acesso</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter">
              PERMISSION <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">VAULT</span>
            </h1>
            <p className="max-w-xl text-slate-400 font-medium">
              Gestão centralizada de direitos de acesso, protocolos de segurança e hierarquias modulares.
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateRole(true)} 
            className="h-16 px-8 bg-white hover:bg-slate-100 text-slate-950 rounded-2xl shadow-xl shadow-white/5 group relative overflow-hidden shrink-0"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
            <div className="relative flex items-center gap-3">
              <PlusCircle className="w-5 h-5" />
              <span className="font-black uppercase tracking-widest italic">Novo Papel</span>
            </div>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Role List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar papéis..."
              className="h-14 pl-12 rounded-2xl bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/5 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-4 space-y-2 min-h-[400px]">
            {filteredRoles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                <Layers className="w-10 h-10 text-slate-600 mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest text-slate-500 italic">Nenhum resultado</p>
              </div>
            ) : (
              filteredRoles.map(role => {
                const isSelected = selectedRoleId === role.id;
                const permsCount = role.permissoes ? Object.values(role.permissoes).filter(v => v === true).length : 0;
                
                return (
                  <button
                    key={role.id}
                    onClick={() => handleSelectRole(role)}
                    className={cn(
                      "w-full text-left p-6 rounded-[1.8rem] transition-all relative overflow-hidden group/item",
                      isSelected 
                        ? "bg-slate-950 text-white shadow-2xl scale-[1.02] border-transparent z-10" 
                        : "bg-transparent hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
                    )}
                    
                    <div className="relative z-10 flex items-center justify-between mb-2">
                       <span className={cn(
                        "font-black tracking-tight italic uppercase text-lg",
                        isSelected ? "text-white" : "text-slate-900 dark:text-slate-100"
                      )}>
                        {role.role}
                      </span>
                      {role.is_custom && (
                        <Badge className={cn(
                          "text-[8px] font-black uppercase tracking-widest rounded-full",
                          isSelected ? "bg-white/20 text-white border-white/20" : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-transparent"
                        )}>
                          Custom
                        </Badge>
                      )}
                    </div>
                    
                    <p className={cn(
                      "text-xs line-clamp-1 mb-4",
                      isSelected ? "text-slate-400" : "text-slate-500"
                    )}>
                      {role.descricao || 'Sem descrição definida.'}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          permsCount > 0 ? "bg-emerald-500" : "bg-slate-400"
                        )} />
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          isSelected ? "text-slate-500" : "text-slate-400"
                        )}>
                          {permsCount} Pontos de Acesso
                        </span>
                      </div>
                      <ChevronRight className={cn(
                        "w-4 h-4 transition-transform group-hover/item:translate-x-1",
                        isSelected ? "text-purple-400" : "text-slate-300"
                      )} />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Content Section: Editor */}
        <div className="lg:col-span-8">
          {!selectedRole ? (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-12 bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-[3rem] text-center backdrop-blur-3xl shadow-inner">
               <div className="w-24 h-24 rounded-[2rem] bg-slate-100 dark:bg-white/[0.03] flex items-center justify-center mb-6">
                <Shield className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-400">Aguardando Seleção</h3>
              <p className="text-slate-500 max-w-xs mt-2 font-medium">Escolha um papel de acesso na lista ao lado para editar suas diretrizes de segurança.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Card Summary */}
              <div className="bg-white dark:bg-slate-950 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8">
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl border-slate-200 dark:border-white/10 dark:bg-white/5"
                      onClick={() => {
                        setNewRoleName(selectedRole.role + ' (copy)');
                        setNewRoleDesc(selectedRole.descricao || '');
                        setShowDuplicar(true);
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicar
                    </Button>
                    {selectedRole.is_custom && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                        onClick={() => {
                          if (confirm(`Excluir o papel "${selectedRole.role}" do sistema?`)) {
                            deleteRoleMutation.mutate(selectedRole.id);
                          }
                        }}
                      >
                        <Trash className="w-4 h-4 mr-2" />
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 rounded-[2rem] bg-slate-950 flex items-center justify-center text-white shadow-2xl">
                    <Shield className="w-10 h-10" />
                  </div>
                  <div className="pt-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black italic uppercase tracking-tighter tabular-nums">{selectedRole.role}</h2>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-black uppercase tracking-[0.2em] px-3">Ativo</Badge>
                    </div>
                    <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-[10px]">{selectedRole.descricao || 'Sem descrição detalhada.'}</p>
                    
                    <div className="flex items-center gap-6 mt-6">
                       <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cobertura do Sistema</p>
                        <div className="flex lg:w-48 h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="bg-purple-500 h-full rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-1000" 
                            style={{ width: `${(Object.values(permissoes).filter(v => v === true).length / MODULOS_PERMISSOES.reduce((acc, m) => acc + m.acoes.length, 0)) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black italic">{(Object.values(permissoes).filter(v => v === true).length)}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ativações</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Permissoes Grid */}
              <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] border border-slate-200 dark:border-white/5 p-8 relative">
                 <div className="flex items-center justify-between mb-8">
                   <h3 className="text-xl font-black italic uppercase italic tracking-tighter flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-purple-500 rounded-full" />
                    Modulo Central
                   </h3>
                   <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5" onClick={() => {
                        const all = {};
                        MODULOS_PERMISSOES.forEach(m => m.acoes.forEach(a => all[a.key] = true));
                        setPermissoes(all);
                      }}>Full Access</Button>
                      <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-500" onClick={() => {
                        setPermissoes({});
                      }}>Revoke All</Button>
                   </div>
                 </div>

                 <div className="max-h-[800px] overflow-y-auto pr-2 space-y-6 scrollbar-hide">
                    <PermissoesUsuario permissoes={permissoes} onChange={setPermissoes} />
                 </div>

                 <div className="sticky bottom-0 left-0 right-0 pt-8 mt-4 border-t border-slate-200 dark:border-white/5 bg-gradient-to-t from-white/90 dark:from-slate-950/90 to-transparent pb-4 flex justify-end">
                    <Button 
                      size="lg" 
                      onClick={() => saveMutation.mutate()} 
                      disabled={saveMutation.isPending} 
                      className="h-16 px-10 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-2xl shadow-2xl font-black uppercase tracking-widest italic transition-all active:scale-95 gap-3"
                    >
                      {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Confirmar Alterações
                    </Button>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs Style: Premium */}
      <Dialog open={showCreateRole} onOpenChange={setShowCreateRole}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-white/10 bg-slate-900 text-white p-8">
          <DialogHeader className="mb-6">
            <Shield className="w-10 h-10 text-purple-400 mb-4" />
            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter">New Protocol</DialogTitle>
             <DialogDescription className="text-slate-400">Defina o identificador e objetivo deste novo papel de segurança.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Identificador</Label>
              <Input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Ex: AUDITOR_QUALIDADE"
                className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-purple-500 placeholder:opacity-30"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Objetivo/Diferencial</Label>
              <Input
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                placeholder="Descreva a finalidade deste nível..."
                className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-purple-500 placeholder:opacity-30"
              />
            </div>
          </div>
          <DialogFooter className="mt-10 sm:justify-start">
            <Button 
              className="flex-1 h-14 bg-white text-slate-950 hover:bg-slate-100 rounded-xl font-black uppercase tracking-widest italic"
              onClick={() => createRoleMutation.mutate({ nome: newRoleName, descricao: newRoleDesc, permissoesBase: {} })}
              disabled={!newRoleName.trim() || createRoleMutation.isPending}
            >
              Gerar Papel
            </Button>
            <Button variant="ghost" onClick={() => setShowCreateRole(false)} className="h-14 rounded-xl text-slate-500 font-bold uppercase tracking-widest">Abortar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDuplicar} onOpenChange={setShowDuplicar}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-white/10 bg-slate-950 text-white p-8">
           <DialogHeader className="mb-6">
            <Copy className="w-10 h-10 text-blue-400 mb-4" />
            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter">Clonar Protocolo</DialogTitle>
             <DialogDescription className="text-slate-400">Criar uma ramificação das permissões atuais para um novo papel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Novo Identificador</Label>
              <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-purple-500" />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nova Descrição</Label>
              <Input value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-purple-500" />
            </div>
          </div>
          <DialogFooter className="mt-10">
             <Button 
              className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest italic"
              onClick={() => createRoleMutation.mutate({ nome: newRoleName, descricao: newRoleDesc, permissoesBase: permissoes })}
              disabled={!newRoleName.trim() || createRoleMutation.isPending}
            >
              Finalizar Clone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}