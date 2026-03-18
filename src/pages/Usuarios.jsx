// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';

import { rdsn } from '@/api/supabaseClient';
import { Plus, Edit2, UserX, UserCheck, Shield, Users as UsersIcon, Key, Trash } from 'lucide-react';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AuditoriaLog from '@/components/usuarios/AuditoriaLog';
import PermissoesManager from '@/components/usuarios/PermissoesManager';
import PermissoesUsuario from '@/components/usuarios/PermissoesUsuario';
import LimparDadosProducao from '@/components/admin/LimparDadosProducao';

const defaultRoleConfig = {
  Admin: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: Shield },
  Operador: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: UsersIcon },
  Visualizador: { color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: UsersIcon }
};

const customRoleColors = [
  'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
];

export default function Usuarios() {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [createData, setCreateData] = useState({
    username: '',
    password: '',
    full_name: '',
    role_custom: 'Operador',
    setores_permitidos: [],
    permissoes_customizadas: {}
  });

  const [editData, setEditData] = useState({
    full_name: '',
    role_custom: 'Operador',
    setores_permitidos: [],
    permissoes_customizadas: {},
    ativo: true
  });

  const { user: currentUser } = useAuth();

  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: () => rdsn.entities.Setor.list()
  });

  const { data: rolesDB = [] } = useQuery({
    queryKey: ['roles-permissoes'],
    queryFn: () => rdsn.entities.PermissaoRole.list(),
  });

  const roleOptions = React.useMemo(() => {
    const defaults = ['Admin', 'Operador', 'Visualizador'];
    const fromDB = rolesDB.map(r => r.role).filter(r => !defaults.includes(r));
    return [...defaults, ...fromDB];
  }, [rolesDB]);

  const getRoleConfig = (roleName) => {
    if (defaultRoleConfig[roleName]) return defaultRoleConfig[roleName];
    const idx = roleOptions.indexOf(roleName) % customRoleColors.length;
    return { color: customRoleColors[idx] || 'bg-slate-100 text-slate-600', icon: UsersIcon };
  };

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const usuarios = await rdsn.entities.UsuarioInterno.list('-created_at');
      return usuarios || [];
    },
    enabled: !!currentUser
  });

  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      // Verificar se username já existe
      const existing = await rdsn.entities.UsuarioInterno.filter({ username: data.username });
      if (existing.length > 0) {
        throw new Error('Nome de usuário já existe');
      }

      // Hash da senha
      const passwordHash = btoa(data.password);

      // Criar usuário
      const newUser = await rdsn.entities.UsuarioInterno.create({
        username: data.username,
        password_hash: passwordHash,
        full_name: data.full_name,
        email: data.email || '',
        role_custom: data.role_custom,
        setores_permitidos: data.setores_permitidos || [],
        permissoes_customizadas: data.permissoes_customizadas || {},
        ativo: true
      });

      // Registrar auditoria
      await rdsn.entities.AuditoriaUsuarios.create({
        usuario_admin_id: currentUser.id,
        usuario_admin_nome: currentUser.full_name,
        usuario_afetado_id: newUser.id,
        usuario_afetado_nome: newUser.full_name,
        tipo_acao: 'CRIACAO_USUARIO',
        descricao: `Novo usuário ${newUser.full_name} (${newUser.username}) criado com função ${newUser.role_custom}`,
        dados_depois: JSON.stringify({
          username: newUser.username,
          full_name: newUser.full_name,
          role_custom: newUser.role_custom,
          setores_permitidos: newUser.setores_permitidos
        })
      });

      return { success: true, user: newUser };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['internalUser'] });
      setShowCreateForm(false);
      setCreateData({ username: '', password: '', full_name: '', role_custom: 'Operador', setores_permitidos: [], permissoes_customizadas: {} });
      toast.success('Usuário criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar usuário: ' + error.message);
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const userBefore = await rdsn.entities.UsuarioInterno.filter({ id });
      await rdsn.entities.UsuarioInterno.update(id, data);

      // Registrar auditoria
      if (userBefore.length > 0) {
        await rdsn.entities.AuditoriaUsuarios.create({
          usuario_admin_id: currentUser.id,
          usuario_admin_nome: currentUser.full_name,
          usuario_afetado_id: id,
          usuario_afetado_nome: userBefore[0].full_name,
          tipo_acao: 'EDICAO_USUARIO',
          descricao: `Dados do usuário ${userBefore[0].full_name} foram atualizados`,
          dados_antes: JSON.stringify({
            full_name: userBefore[0].full_name,
            role_custom: userBefore[0].role_custom,
            setores_permitidos: userBefore[0].setores_permitidos,
            ativo: userBefore[0].ativo
          }),
          dados_depois: JSON.stringify(data)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setShowEditForm(false);
      setEditingUser(null);
      toast.success('Usuário atualizado!');
    }
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ id, ativo }) => {
      const userBefore = await rdsn.entities.UsuarioInterno.filter({ id });
      await rdsn.entities.UsuarioInterno.update(id, { ativo });

      // Registrar auditoria
      if (userBefore.length > 0) {
        await rdsn.entities.AuditoriaUsuarios.create({
          usuario_admin_id: currentUser.id,
          usuario_admin_nome: currentUser.full_name,
          usuario_afetado_id: id,
          usuario_afetado_nome: userBefore[0].full_name,
          tipo_acao: 'ALTERACAO_STATUS',
          descricao: `Status do usuário ${userBefore[0].full_name} alterado para ${ativo ? 'Ativo' : 'Inativo'}`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Status atualizado!');
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }) => {
      const passwordHash = btoa(newPassword);
      const user = await rdsn.entities.UsuarioInterno.filter({ id });
      await rdsn.entities.UsuarioInterno.update(id, { password_hash: passwordHash });

      // Registrar auditoria
      if (user.length > 0) {
        await rdsn.entities.AuditoriaUsuarios.create({
          usuario_admin_id: currentUser.id,
          usuario_admin_nome: currentUser.full_name,
          usuario_afetado_id: id,
          usuario_afetado_nome: user[0].full_name,
          tipo_acao: 'RESET_SENHA',
          descricao: `Senha do usuário ${user[0].full_name} (${user[0].username}) foi redefinida`
        });
      }
    },
    onSuccess: () => {
      toast.success('Senha redefinida com sucesso!');
    }
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (createData.password.length < 4) {
      toast.error('A senha deve ter pelo menos 4 caracteres');
      return;
    }
    createUserMutation.mutate(createData);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateUserMutation.mutate({ id: editingUser.id, data: editData });
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditData({
      full_name: user.full_name,
      role_custom: user.role_custom || 'Operador',
      setores_permitidos: user.setores_permitidos || [],
      permissoes_customizadas: user.permissoes_customizadas || {},
      ativo: user.ativo ?? true
    });
    setShowEditForm(true);
  };

  const handleResetPassword = (user) => {
    const newPassword = prompt('Digite a nova senha para ' + user.username + ':');
    if (newPassword && newPassword.length >= 4) {
      resetPasswordMutation.mutate({ id: user.id, newPassword });
    } else if (newPassword) {
      toast.error('A senha deve ter pelo menos 4 caracteres');
    }
  };

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      const user = await rdsn.entities.UsuarioInterno.filter({ id: userId });
      await rdsn.entities.UsuarioInterno.delete(userId);

      // Registrar auditoria
      if (user.length > 0) {
        await rdsn.entities.AuditoriaUsuarios.create({
          usuario_admin_id: currentUser.id,
          usuario_admin_nome: currentUser.full_name,
          usuario_afetado_id: userId,
          usuario_afetado_nome: user[0].full_name,
          tipo_acao: 'EXCLUSAO_USUARIO',
          descricao: `Usuário ${user[0].full_name} (${user[0].username}) foi excluído do sistema`,
          dados_antes: JSON.stringify({
            username: user[0].username,
            full_name: user[0].full_name,
            role_custom: user[0].role_custom
          })
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário excluído!');
    }
  });

  const handleDeleteUser = (user) => {
    if (confirm(`Tem certeza que deseja excluir o usuário ${user.full_name}?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const isAdmin = currentUser?.role_custom === 'Admin';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Tabs Navigation */}
        <Tabs defaultValue="usuarios" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-100/50 dark:bg-white/[0.02] border dark:border-white/5 rounded-[1.5rem] p-1.5 backdrop-blur-xl mb-6">
            <TabsTrigger value="usuarios" className="rounded-xl transition-all dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100 font-black uppercase text-[10px] tracking-widest italic">Usuários</TabsTrigger>
            {isAdmin && <TabsTrigger value="permissoes" className="rounded-lg transition-all dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100">Permissões</TabsTrigger>}
            {isAdmin && <TabsTrigger value="auditoria" className="rounded-lg transition-all dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100">Auditoria</TabsTrigger>}
            {isAdmin && <TabsTrigger value="limpeza" className="rounded-lg transition-all dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100">Limpeza</TabsTrigger>}
          </TabsList>
          <TabsContent value="usuarios" className="space-y-6">
            {/* Header Premium */}
            <div className="relative overflow-hidden rounded-[3rem] bg-white dark:bg-slate-950/40 backdrop-blur-3xl p-8 sm:p-12 shadow-2xl border border-slate-200 dark:border-white/5 mb-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(147,51,234,0.1),transparent)] pointer-events-none" />
              <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                <div className="flex items-center gap-6 sm:gap-8">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-600 to-indigo-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(147,51,234,0.3)] transition-all hover:scale-105 active:scale-95 group border border-purple-400/20 cursor-pointer">
                    <UsersIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white group-hover:rotate-12 transition-transform duration-500" />
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                      Gestão de <span className="text-purple-600 dark:text-purple-400">Usuários</span>
                    </h1>
                    <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                      Controle de Acesso • Permissões • Auditoria
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center">
                  {isAdmin && (
                    <Button
                      onClick={() => setShowCreateForm(true)}
                      className="h-14 px-8 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black uppercase text-[10px] tracking-[0.2em] italic gap-3 shadow-xl shadow-purple-500/20 active:scale-95 border-b-4 border-purple-800"
                    >
                      <Plus className="w-4 h-4" /> Criar Usuário
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total de Usuários', value: usuarios.length, icon: UsersIcon, color: '#9333ea' },
                { label: 'Administradores', value: usuarios.filter(u => u.role_custom === 'Admin').length, icon: Shield, color: '#6366f1' },
                { label: 'Papéis Ativos', value: rolesDB.length, icon: Key, color: '#3b82f6' },
                { label: 'Ativos', value: usuarios.filter(u => u.ativo !== false).length, icon: UserCheck, color: '#10b981' },
              ].map((item, i) => (
                <PremiumCard key={i} title={item.label} icon={item.icon} iconColor={item.color}>
                  <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{item.value}</p>
                </PremiumCard>
              ))}
            </div>

            <PremiumCard title="Lista de Usuários" icon={UsersIcon} iconColor="#9333ea" noPadding>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 border-b dark:border-slate-800">
                    <TableHead className="text-slate-600 dark:text-slate-400">Nome</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Usuário</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Email</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Função</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Setores</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400">Último Acesso</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : usuarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        Nenhum usuário cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuarios.map((usuario) => {
                      const roleInfo = getRoleConfig(usuario.role_custom);
                      const RoleIcon = roleInfo.icon;

                      return (
                        <TableRow key={usuario.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 transition-colors">
                          <TableCell className="py-4">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-700 dark:to-slate-900 text-white rounded-2xl flex items-center justify-center text-xs font-black shadow-lg shadow-black/10 transition-transform group-hover:scale-105">
                                  {usuario.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                                </div>
                                {usuario.ativo !== false && (
                                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-950 rounded-full shadow-sm" />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{usuario.full_name || 'Usuário Sem Nome'}</span>
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{usuario.username}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400 font-mono text-xs">{usuario.email || '-'}</TableCell>
                          <TableCell>
                            <Badge className={`${roleInfo.color} border-0 text-[10px] font-black uppercase tracking-wider py-1 px-3 shadow-none rounded-full`}>
                              <RoleIcon className="w-3 h-3 mr-1.5 opacity-70" />
                              {usuario.role_custom || 'Operador'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {usuario.setores_permitidos && usuario.setores_permitidos.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {usuario.setores_permitidos.slice(0, 2).map(setorId => {
                                  const setor = setores.find(s => s.id === setorId);
                                  return setor ? (
                                    <div key={setorId} className="px-2 py-0.5 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-md text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                                      {setor.codigo}
                                    </div>
                                  ) : null;
                                })}
                                {usuario.setores_permitidos.length > 2 && (
                                  <div className="px-2 py-0.5 bg-slate-200 dark:bg-white/[0.1] rounded-md text-[9px] font-black text-slate-700 dark:text-slate-300">
                                    +{usuario.setores_permitidos.length - 2}
                                  </div>
                                )}
                              </div>
                            ) : (
                               <span className="text-[10px] text-slate-300 dark:text-slate-700 font-black italic">SEM ACESSO</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                               <div className={cn(
                                 "w-1.5 h-1.5 rounded-full shadow-[0_0_8px]",
                                 usuario.ativo !== false ? "bg-green-500 shadow-green-500/50" : "bg-red-500 shadow-red-500/50"
                               )} />
                               <span className={cn(
                                 "text-[10px] font-black uppercase tracking-widest",
                                 usuario.ativo !== false ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                               )}>
                                 {usuario.ativo !== false ? 'Ativo' : 'Inativo'}
                               </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-400 dark:text-slate-600 text-[10px] font-bold uppercase">
                            {usuario.ultimo_acesso
                              ? format(new Date(usuario.ultimo_acesso), 'dd/MM/yy HH:mm', { locale: ptBR })
                              : 'Nunca'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 opacity-20 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                              {isAdmin && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenEdit(usuario)}
                                    className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-blue-500/10 hover:text-blue-500 dark:hover:text-blue-400 transition-all"
                                    title="Editar usuário"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleResetPassword(usuario)}
                                    className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-amber-500/10 hover:text-amber-500 dark:hover:text-amber-400 transition-all"
                                    title="Redefinir senha"
                                  >
                                    <Key className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => toggleUserStatusMutation.mutate({
                                      id: usuario.id,
                                      ativo: !(usuario.ativo !== false)
                                    })}
                                    className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-500/10 transition-all"
                                    title={usuario.ativo !== false ? "Desativar" : "Ativar"}
                                  >
                                    {usuario.ativo !== false ? (
                                      <UserX className="w-3.5 h-3.5 text-red-500" />
                                    ) : (
                                      <UserCheck className="w-3.5 h-3.5 text-green-500" />
                                    )}
                                  </Button>
                                </>
                              )}
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(usuario)}
                                  title="Excluir usuário"
                                  className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-all"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </PremiumCard>

            {/* Create User Dialog */}
            <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
              <DialogContent className="max-w-3xl dark:bg-slate-950/90 dark:border-white/5 rounded-[2.5rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0">
                <div className="relative overflow-hidden">
                  {/* Premium Mesh Gradient Header */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-indigo-700 to-slate-900 opacity-95" />
                  <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/20 rounded-full -mr-40 -mt-40 blur-[80px] animate-pulse" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full -ml-32 -mb-32 blur-[60px]" />
                  
                  <div className="relative z-10 p-10 text-white">
                    <DialogHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                            Novo <span className="text-purple-300">Usuário</span>
                          </DialogTitle>
                          <p className="text-[10px] font-black text-purple-200/50 uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                             Credenciamento Operacional <span className="w-1 h-1 rounded-full bg-purple-400/30" /> Gestão de Identidade
                          </p>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center shadow-2xl rotate-3">
                          <Plus className="w-8 h-8 text-purple-200" />
                        </div>
                      </div>
                    </DialogHeader>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>

                <form onSubmit={handleCreateSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nome Completo *</Label>
                      <Input
                        value={createData.full_name}
                        onChange={(e) => setCreateData(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Ex: João da Silva"
                        className="h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl font-bold"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Identificador (Username) *</Label>
                      <Input
                        value={createData.username}
                        onChange={(e) => setCreateData(prev => ({ ...prev, username: e.target.value.toLowerCase() }))}
                        placeholder="joao.silva"
                        required
                        className="h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                        Senha de Acesso *
                        <Badge variant="outline" className="text-[8px] font-bold border-red-500/30 text-red-500">Mín. 4 Chars</Badge>
                      </Label>
                      <Input
                        type="password"
                        value={createData.password}
                        onChange={(e) => setCreateData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="••••••••"
                        required
                        minLength={4}
                        className="h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Hierarquia / Role *</Label>
                      <Select
                        value={createData.role_custom}
                        onValueChange={(v) => setCreateData(prev => ({ ...prev, role_custom: v }))}
                      >
                        <SelectTrigger className="h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-white/10 backdrop-blur-xl">
                          {roleOptions.map(role => {
                            const dbRole = rolesDB.find(r => r.role === role);
                            const desc = dbRole?.descricao ? ` - ${dbRole.descricao}` : '';
                            return (
                              <SelectItem key={role} value={role} className="font-bold">
                                {role}{desc}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1 flex items-center gap-2">
                      Zonas de Operação Permitidas
                      <div className="h-[1px] flex-1 bg-slate-100 dark:bg-white/5" />
                    </Label>
                    <div className="border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-5 bg-slate-50 dark:bg-white/[0.02] grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-64 overflow-y-auto custom-scrollbar shadow-inner">
                      {setores.filter(s => s.ativo).map(setor => (
                        <label key={setor.id} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-white/5 cursor-pointer group hover:border-purple-500/30 transition-all shadow-sm dark:shadow-none backdrop-blur-sm">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={createData.setores_permitidos.includes(setor.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCreateData(prev => ({
                                    ...prev,
                                    setores_permitidos: [...prev.setores_permitidos, setor.id]
                                  }));
                                } else {
                                  setCreateData(prev => ({
                                    ...prev,
                                    setores_permitidos: prev.setores_permitidos.filter(id => id !== setor.id)
                                  }));
                                }
                              }}
                              className="w-6 h-6 rounded-lg accent-purple-600 dark:accent-purple-500 cursor-pointer border-2 border-slate-200 dark:border-slate-700"
                            />
                          </div>
                          <div className="flex flex-1 items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black dark:text-slate-200 group-hover:text-purple-400 transition-colors uppercase tracking-tight">{setor.nome}</span>
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{setor.codigo}</span>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                              <Shield className="w-3 h-3 text-slate-400" />
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {createData.role_custom !== 'Admin' && (
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Matriz de Permissões Granulares</Label>
                      <div className="border border-slate-200 dark:border-white/5 rounded-2xl p-6 bg-slate-50 dark:bg-white/5">
                        <PermissoesUsuario
                          permissoes={createData.permissoes_customizadas}
                          onChange={(novasPermissoes) => setCreateData(prev => ({
                            ...prev,
                            permissoes_customizadas: novasPermissoes
                          }))}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4 sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md py-4 mt-8 border-t dark:border-white/5">
                    <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)} className="flex-1 h-14 border-slate-200 dark:border-white/10 dark:hover:bg-white/5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all">
                      Abortar
                    </Button>
                    <Button type="submit" className="flex-[1.5] h-14 bg-slate-900 dark:bg-purple-600 text-white hover:bg-slate-800 dark:hover:bg-purple-500 transition-all font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-xl shadow-purple-500/10 border-0" disabled={createUserMutation.isPending}>
                      {createUserMutation.isPending ? 'Sincronizando...' : 'Efetivar Cadastro'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
              <DialogContent className="max-w-3xl dark:bg-slate-950/90 dark:border-white/5 rounded-[2.5rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0">
                <div className="relative overflow-hidden">
                  {/* Premium Mesh Gradient Header */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 opacity-95" />
                  <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full -mr-40 -mt-40 blur-[80px] animate-pulse" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full -ml-32 -mb-32 blur-[60px]" />
                  
                  <div className="relative z-10 p-10 text-white">
                    <DialogHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                            Editar <span className="text-blue-300">Usuário</span>
                          </DialogTitle>
                          <p className="text-[10px] font-black text-blue-200/50 uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                             Refinamento de Credencial <span className="w-1 h-1 rounded-full bg-blue-400/30" /> {editData.full_name}
                          </p>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center shadow-2xl -rotate-3">
                          <Edit2 className="w-8 h-8 text-blue-200" />
                        </div>
                      </div>
                    </DialogHeader>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>

                <form onSubmit={handleEditSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nome Completo *</Label>
                      <Input
                        value={editData.full_name}
                        onChange={(e) => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                        className="h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl font-bold"
                        placeholder="João Silva"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Hierarquia Corporativa *</Label>
                      <Select
                        value={editData.role_custom}
                        onValueChange={(v) => setEditData(prev => ({ ...prev, role_custom: v }))}
                      >
                        <SelectTrigger className="h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-white/10 backdrop-blur-xl">
                          {roleOptions.map(role => {
                            const dbRole = rolesDB.find(r => r.role === role);
                            const desc = dbRole?.descricao ? ` - ${dbRole.descricao}` : '';
                            return (
                              <SelectItem key={role} value={role} className="font-bold">
                                {role}{desc}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1 flex items-center gap-2">
                      Privilégios de Acesso por Setor
                      <div className="h-[1px] flex-1 bg-slate-100 dark:bg-white/5" />
                    </Label>
                    <div className="border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-5 bg-slate-50 dark:bg-white/[0.02] grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-64 overflow-y-auto custom-scrollbar shadow-inner text-white">
                      {setores.filter(s => s.ativo).map(setor => (
                        <label key={setor.id} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-white/5 cursor-pointer group hover:border-blue-500/30 transition-all shadow-sm dark:shadow-none backdrop-blur-sm">
                          <div className="relative text-white">
                            <input
                              type="checkbox"
                              checked={editData.setores_permitidos?.includes(setor.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditData(prev => ({
                                    ...prev,
                                    setores_permitidos: [...(prev.setores_permitidos || []), setor.id]
                                  }));
                                } else {
                                  setEditData(prev => ({
                                    ...prev,
                                    setores_permitidos: (prev.setores_permitidos || []).filter(id => id !== setor.id)
                                  }));
                                }
                              }}
                              className="w-6 h-6 rounded-lg accent-blue-600 dark:accent-blue-500 cursor-pointer border-2 border-slate-200 dark:border-slate-700"
                            />
                          </div>
                          <div className="flex flex-1 items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black dark:text-slate-200 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{setor.nome}</span>
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{setor.codigo}</span>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                              <Shield className="w-3 h-3 text-slate-400" />
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {editData.role_custom !== 'Admin' && (
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Ajustes de Permissões</Label>
                      <div className="border border-slate-200 dark:border-white/5 rounded-2xl p-6 bg-slate-50 dark:bg-white/5">
                        <PermissoesUsuario
                          permissoes={editData.permissoes_customizadas || {}}
                          onChange={(novasPermissoes) => setEditData(prev => ({
                            ...prev,
                            permissoes_customizadas: novasPermissoes
                          }))}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                    <div className="space-y-0.5">
                      <Label htmlFor="ativo-edit" className="text-slate-900 dark:text-slate-100 font-black uppercase text-[11px] tracking-widest italic flex items-center gap-2">
                        Status da Credencial
                        <div className={cn("w-2 h-2 rounded-full", editData.ativo ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                      </Label>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Habilitar ou suspender acesso do usuário ao sistema</p>
                    </div>
                    <input
                      type="checkbox"
                      id="ativo-edit"
                      checked={editData.ativo}
                      onChange={(e) => setEditData({ ...editData, ativo: e.target.checked })}
                      className="w-6 h-6 rounded-lg accent-blue-600 dark:accent-blue-500 cursor-pointer shadow-sm"
                    />
                  </div>

                  <div className="flex gap-4 pt-4 sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md py-4 mt-8 border-t dark:border-white/5">
                    <Button type="button" variant="outline" onClick={() => setShowEditForm(false)} className="flex-1 h-14 border-slate-200 dark:border-white/10 dark:hover:bg-white/5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all">
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-[1.5] h-14 bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-all font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-500/10 border-0" disabled={updateUserMutation.isPending}>
                      {updateUserMutation.isPending ? 'Sincronizando...' : 'Salvar Alterações'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="permissoes" className="space-y-6">
              <PermissoesManager />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="auditoria" className="space-y-6">
              <AuditoriaLog />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="limpeza" className="space-y-6">
              <LimparDadosProducao />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}