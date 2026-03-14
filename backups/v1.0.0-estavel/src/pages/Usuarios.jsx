// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { Plus, Edit2, UserX, UserCheck, Shield, Users as UsersIcon, Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AuditoriaLog from '@/components/usuarios/AuditoriaLog';
import PermissoesManager from '@/components/usuarios/PermissaoesManager';
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

  const { data: currentUser } = useQuery({
    queryKey: ['internalUser'],
    queryFn: () => {
      const user = localStorage.getItem('internalUser');
      return user ? JSON.parse(user) : null;
    }
  });

  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: () => base44.entities.Setor.list()
  });

  const { data: rolesDB = [] } = useQuery({
    queryKey: ['roles-permissoes'],
    queryFn: () => base44.entities.PermissaoRole.list(),
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
      const usuarios = await base44.entities.UsuarioInterno.list('-created_at');
      return usuarios || [];
    },
    enabled: !!currentUser
  });

  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      // Verificar se username já existe
      const existing = await base44.entities.UsuarioInterno.filter({ username: data.username });
      if (existing.length > 0) {
        throw new Error('Nome de usuário já existe');
      }

      // Hash da senha
      const passwordHash = btoa(data.password);

      // Criar usuário
      const newUser = await base44.entities.UsuarioInterno.create({
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
      await base44.entities.AuditoriaUsuarios.create({
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
      const userBefore = await base44.entities.UsuarioInterno.filter({ id });
      await base44.entities.UsuarioInterno.update(id, data);

      // Registrar auditoria
      if (userBefore.length > 0) {
        await base44.entities.AuditoriaUsuarios.create({
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
      const userBefore = await base44.entities.UsuarioInterno.filter({ id });
      await base44.entities.UsuarioInterno.update(id, { ativo });

      // Registrar auditoria
      if (userBefore.length > 0) {
        await base44.entities.AuditoriaUsuarios.create({
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
      const user = await base44.entities.UsuarioInterno.filter({ id });
      await base44.entities.UsuarioInterno.update(id, { password_hash: passwordHash });

      // Registrar auditoria
      if (user.length > 0) {
        await base44.entities.AuditoriaUsuarios.create({
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
      const user = await base44.entities.UsuarioInterno.filter({ id: userId });
      await base44.entities.UsuarioInterno.delete(userId);

      // Registrar auditoria
      if (user.length > 0) {
        await base44.entities.AuditoriaUsuarios.create({
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
          <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-1">
            <TabsTrigger value="usuarios" className="rounded-lg transition-all dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100">Usuários</TabsTrigger>
            {isAdmin && <TabsTrigger value="permissoes" className="rounded-lg transition-all dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100">Permissões</TabsTrigger>}
            {isAdmin && <TabsTrigger value="auditoria" className="rounded-lg transition-all dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100">Auditoria</TabsTrigger>}
            {isAdmin && <TabsTrigger value="limpeza" className="rounded-lg transition-all dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100">Limpeza</TabsTrigger>}
          </TabsList>
          <TabsContent value="usuarios" className="space-y-6">
            {/* Header Premium */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
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

            {/* Stats Premium */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total de Usuários', value: usuarios.length, icon: UsersIcon, color: 'purple' },
                { label: 'Administradores', value: usuarios.filter(u => u.role_custom === 'Admin').length, icon: Shield, color: 'indigo' },
                { label: 'Papéis Ativos', value: rolesDB.length, icon: Key, color: 'blue' },
                { label: 'Ativos', value: usuarios.filter(u => u.ativo !== false).length, icon: UserCheck, color: 'emerald' },
              ].map((item, i) => (
                <Card key={i} className="relative overflow-hidden group border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 backdrop-blur-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80">{item.label}</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{item.value}</p>
                      </div>
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6",
                        item.color === 'purple' ? "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-500/20" :
                          item.color === 'indigo' ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/20" :
                            item.color === 'blue' ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20" :
                              "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20"
                      )}>
                        <item.icon className="w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                  <div className={cn(
                    "absolute bottom-0 left-0 h-1 bg-gradient-to-r opacity-50 transition-all duration-500 group-hover:h-1.5",
                    item.color === 'purple' ? "from-purple-600 to-purple-400 w-full" :
                      item.color === 'indigo' ? "from-indigo-600 to-indigo-400 w-full" :
                        item.color === 'blue' ? "from-blue-600 to-blue-400 w-full" :
                          "from-emerald-600 to-emerald-400 w-full"
                  )} />
                </Card>
              ))}
            </div>

            {/* Table */}
            <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  Lista de Usuários
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
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
                          <TableRow key={usuario.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-b dark:border-slate-800">
                            <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-slate-900 dark:bg-slate-700 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                  {usuario.full_name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                {usuario.full_name || 'Sem nome'}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400 font-mono">{usuario.username}</TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400">{usuario.email || '-'}</TableCell>
                            <TableCell>
                              <Badge className={`${roleInfo.color} border-0`}>
                                <RoleIcon className="w-3 h-3 mr-1" />
                                {usuario.role_custom || 'Operador'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400">
                              {usuario.setores_permitidos && usuario.setores_permitidos.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {usuario.setores_permitidos.slice(0, 2).map(setorId => {
                                    const setor = setores.find(s => s.id === setorId);
                                    return setor ? (
                                      <Badge key={setorId} variant="outline" className="text-xs dark:border-slate-700 dark:text-slate-300">
                                        {setor.codigo}
                                      </Badge>
                                    ) : null;
                                  })}
                                  {usuario.setores_permitidos.length > 2 && (
                                    <Badge variant="outline" className="text-xs dark:border-slate-700 dark:text-slate-300">+{usuario.setores_permitidos.length - 2}</Badge>
                                  )}
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={usuario.ativo !== false ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}>
                                {usuario.ativo !== false ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400 text-sm">
                              {usuario.ultimo_acesso
                                ? format(new Date(usuario.ultimo_acesso), 'dd/MM/yy HH:mm', { locale: ptBR })
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {isAdmin && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleOpenEdit(usuario)}
                                      title="Editar usuário"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleResetPassword(usuario)}
                                      title="Redefinir senha"
                                    >
                                      <Key className="w-4 h-4 text-amber-500" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => toggleUserStatusMutation.mutate({
                                        id: usuario.id,
                                        ativo: !(usuario.ativo !== false)
                                      })}
                                      title={usuario.ativo !== false ? "Desativar" : "Ativar"}
                                    >
                                      {usuario.ativo !== false ? (
                                        <UserX className="w-4 h-4 text-red-500" />
                                      ) : (
                                        <UserCheck className="w-4 h-4 text-green-500" />
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
                                    className="hover:bg-red-50"
                                  >
                                    <UserX className="w-4 h-4 text-red-600" />
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
              </CardContent>
            </Card>

            {/* Create User Dialog */}
            <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
              <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 dark:text-slate-100">
                    <Plus className="w-5 h-5" />
                    Criar Novo Usuário
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="dark:text-slate-300">Nome Completo *</Label>
                      <Input
                        value={createData.full_name}
                        onChange={(e) => setCreateData(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="João Silva"
                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="dark:text-slate-300">Nome de Usuário *</Label>
                      <Input
                        value={createData.username}
                        onChange={(e) => setCreateData(prev => ({ ...prev, username: e.target.value.toLowerCase() }))}
                        placeholder="joao.silva"
                        required
                        className="font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400">Para fazer login no sistema</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="dark:text-slate-300">Senha *</Label>
                      <Input
                        type="password"
                        value={createData.password}
                        onChange={(e) => setCreateData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Mínimo 4 caracteres"
                        required
                        minLength={4}
                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="dark:text-slate-300">Função no Sistema *</Label>
                    <Select
                      value={createData.role_custom}
                      onValueChange={(v) => setCreateData(prev => ({ ...prev, role_custom: v }))}
                    >
                      <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                        {roleOptions.map(role => {
                          const dbRole = rolesDB.find(r => r.role === role);
                          const desc = dbRole?.descricao ? ` - ${dbRole.descricao}` : '';
                          return (
                            <SelectItem key={role} value={role}>
                              {role}{desc}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="dark:text-slate-300">Setores Permitidos *</Label>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-950 space-y-2 max-h-40 overflow-y-auto">
                      {setores.filter(s => s.ativo).map(setor => (
                        <label key={setor.id} className="flex items-center gap-2 cursor-pointer group">
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
                            className="rounded dark:bg-slate-800 dark:border-slate-700 dark:accent-blue-500"
                          />
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: setor.cor || '#3b82f6' }}
                            />
                            <span className="text-sm dark:text-slate-300 group-hover:text-blue-500 transition-colors">{setor.nome} ({setor.codigo})</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {createData.role_custom !== 'Admin' && (
                    <div className="space-y-2">
                      <Label className="dark:text-slate-300">Permissões Específicas</Label>
                      <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50 dark:bg-slate-950 max-h-96 overflow-y-auto">
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

                  <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)} className="dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-300">
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200" disabled={createUserMutation.isPending}>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Usuário
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
              <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader>
                  <DialogTitle className="dark:text-slate-100">Editar Usuário</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="dark:text-slate-300">Nome Completo *</Label>
                    <Input
                      value={editData.full_name}
                      onChange={(e) => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      placeholder="João Silva"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Função no Sistema *</Label>
                    <Select
                      value={editData.role_custom}
                      onValueChange={(v) => setEditData(prev => ({ ...prev, role_custom: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map(role => {
                          const dbRole = rolesDB.find(r => r.role === role);
                          const desc = dbRole?.descricao ? ` - ${dbRole.descricao}` : '';
                          return (
                            <SelectItem key={role} value={role}>
                              {role}{desc}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="dark:text-slate-300">Setores Permitidos *</Label>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-950 space-y-2 max-h-40 overflow-y-auto">
                      {setores.filter(s => s.ativo).map(setor => (
                        <label key={setor.id} className="flex items-center gap-2 cursor-pointer group">
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
                            className="rounded dark:bg-slate-800 dark:border-slate-700 dark:accent-blue-500"
                          />
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: setor.cor || '#3b82f6' }}
                            />
                            <span className="text-sm dark:text-slate-300 group-hover:text-blue-500 transition-colors">{setor.nome} ({setor.codigo})</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {editData.role_custom !== 'Admin' && (
                    <div className="space-y-2">
                      <Label className="dark:text-slate-300">Permissões Específicas</Label>
                      <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50 dark:bg-slate-950 max-h-96 overflow-y-auto">
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

                  <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowEditForm(false)} className="dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-300">
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200" disabled={updateUserMutation.isPending}>
                      Salvar Alterações
                    </Button>
                  </DialogFooter>
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