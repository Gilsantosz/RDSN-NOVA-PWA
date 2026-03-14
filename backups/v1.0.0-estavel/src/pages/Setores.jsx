// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Setores() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingSetor, setEditingSetor] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    descricao: '',
    responsavel: '',
    cor: '#3b82f6',
    ativo: true,
    senha_troca: ''
  });

  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: () => base44.entities.Setor.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Setor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setores'] });
      resetForm();
      toast.success('Setor criado com sucesso!');
    },
    onError: (error) => toast.error('Erro ao criar setor: ' + error.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Setor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setores'] });
      resetForm();
      toast.success('Setor atualizado com sucesso!');
    },
    onError: (error) => toast.error('Erro ao atualizar setor: ' + error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Setor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setores'] });
      toast.success('Setor removido com sucesso!');
    },
    onError: (error) => toast.error('Erro ao remover setor: ' + error.message)
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      codigo: '',
      descricao: '',
      responsavel: '',
      cor: '#3b82f6',
      ativo: true
    });
    setEditingSetor(null);
    setShowForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingSetor) {
      updateMutation.mutate({ id: editingSetor.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (setor) => {
    setEditingSetor(setor);
    setFormData({
      nome: setor.nome,
      codigo: setor.codigo,
      descricao: setor.descricao || '',
      responsavel: setor.responsavel || '',
      cor: setor.cor || '#3b82f6',
      ativo: setor.ativo !== false,
      senha_troca: setor.senha_troca || ''
    });
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(16,185,129,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-600 to-teal-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 group border border-emerald-400/20">
                <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-white group-hover:rotate-12 transition-transform duration-500" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Setores <span className="text-emerald-600 dark:text-emerald-400">Produtivos</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                  Gestão de Áreas • Centros de Custo • Operações
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center">
              <Button
                onClick={() => setShowForm(true)}
                className="h-12 px-6 rounded-2xl bg-slate-900 dark:bg-emerald-600 text-white font-black uppercase text-xs tracking-widest gap-2 shadow-xl hover:scale-[1.02] active:scale-95 transition-all border-0 shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" /> Novo Setor
              </Button>
            </div>
          </div>
        </div>

        {/* Lista de Setores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {setores.map(setor => (
            <Card key={setor.id} className="dark:bg-slate-900 dark:border-slate-800 hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <CardHeader className="pb-3 border-b border-transparent group-hover:border-slate-100 dark:group-hover:border-slate-800 transition-colors bg-slate-50/30 dark:bg-slate-900/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
                      style={{ backgroundColor: setor.cor || '#3b82f6' }}
                    >
                      <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold dark:text-slate-100 tracking-tight">{setor.nome}</CardTitle>
                      <p className="text-sm font-mono text-slate-500 dark:text-slate-400 mt-1">Centro de Custo: <span className="font-bold text-slate-900 dark:text-slate-300">{setor.codigo}</span></p>
                    </div>
                  </div>
                  <Badge variant={setor.ativo ? "default" : "secondary"} className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${setor.ativo ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                    {setor.ativo ? 'ATIVO' : 'INATIVO'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {setor.descricao && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed min-h-[40px] italic">"{setor.descricao}"</p>
                )}
                {setor.responsavel && (
                  <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{setor.responsavel.charAt(0)}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      <span className="font-semibold dark:text-slate-400 tracking-wide uppercase text-[9px]">Responsável:</span><br />
                      <span className="font-bold dark:text-slate-200">{setor.responsavel}</span>
                    </p>
                  </div>
                )}
                <div className="flex gap-2 pt-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(setor)}
                    className="flex-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-bold text-[11px] uppercase tracking-wider"
                  >
                    <Edit className="w-3.5 h-3.5 mr-2" />
                    Editar Setor
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Deseja remover o setor ${setor.nome}?`)) {
                        deleteMutation.mutate(setor.id);
                      }
                    }}
                    className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:border-slate-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-md sm:max-w-[90vw] md:max-w-md dark:bg-slate-900 dark:border-slate-800 rounded-2xl">
            <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <DialogTitle className="text-xl font-bold dark:text-slate-100 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-blue-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                {editingSetor ? 'Editar Setor' : 'Novo Setor'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="nome" className="dark:text-slate-300 font-medium ml-1">Nome do Setor *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-100 h-10 rounded-lg focus:ring-2 focus:ring-blue-500/20"
                    required
                    placeholder="Ex: Montagem Final"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="codigo" className="dark:text-slate-300 font-medium ml-1">Centro de Custo *</Label>
                    <Input
                      id="codigo"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      maxLength={10}
                      className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-100 font-mono h-10 rounded-lg"
                      required
                      placeholder="Ex: 11300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="responsavel" className="dark:text-slate-300 font-medium ml-1">Responsável</Label>
                    <Input
                      id="responsavel"
                      value={formData.responsavel}
                      onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                      className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-100 h-10 rounded-lg"
                      placeholder="Nome do responsável"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao" className="dark:text-slate-300 font-medium ml-1">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-100 rounded-lg resize-none min-h-[80px]"
                    rows={3}
                    placeholder="Breve descrição das atividades deste setor..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cor" className="dark:text-slate-300 font-medium ml-1">Cor de Identificação</Label>
                  <div className="flex gap-2">
                    <div className="relative w-12 h-10 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                      <input
                        id="cor"
                        type="color"
                        value={formData.cor}
                        onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                        className="absolute inset-0 w-full h-full cursor-pointer scale-150"
                      />
                    </div>
                    <Input
                      value={formData.cor}
                      onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                      className="flex-1 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-100 font-mono h-10 rounded-lg"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senha_troca" className="dark:text-slate-300 font-medium ml-1">Senha para Troca de Setor</Label>
                  <Input
                    id="senha_troca"
                    type="password"
                    value={formData.senha_troca}
                    onChange={(e) => setFormData({ ...formData, senha_troca: e.target.value })}
                    placeholder="Senha usada para selecionar este setor"
                    className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-100 h-10 rounded-lg"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">Se deixado em branco, o sistema utilizará a senha mestre configurada.</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
                  <div className="space-y-0.5">
                    <Label htmlFor="ativo" className="dark:text-slate-300 font-bold text-sm">Setor Ativo</Label>
                    <p className="text-[10px] text-slate-500">Define se o setor está visível para novas operações</p>
                  </div>
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="w-5 h-5 accent-blue-600 dark:accent-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1 h-11 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-300 font-bold uppercase text-[10px] tracking-widest">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 h-11 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-all font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-black/20">
                  {editingSetor ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}