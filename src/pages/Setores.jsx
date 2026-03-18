// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { PremiumCard } from '@/components/ui/PremiumCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
    senha_troca: '',
    sequencia_decrescente: false
  });

  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: () => rdsn.entities.Setor.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => rdsn.entities.Setor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setores'] });
      resetForm();
      toast.success('Setor criado com sucesso!');
    },
    onError: (error) => toast.error('Erro ao criar setor: ' + error.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => rdsn.entities.Setor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setores'] });
      resetForm();
      toast.success('Setor atualizado com sucesso!');
    },
    onError: (error) => toast.error('Erro ao atualizar setor: ' + error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => rdsn.entities.Setor.delete(id),
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
      ativo: true,
      sequencia_decrescente: false
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
      senha_troca: setor.senha_troca || '',
      sequencia_decrescente: setor.sequencia_decrescente || false
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {setores.map(setor => (
            <PremiumCard
              key={setor.id}
              title={setor.nome}
              icon={Building2}
              iconColor={setor.cor || '#3b82f6'}
              badge={
                <Badge variant={setor.ativo ? "default" : "secondary"} className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${setor.ativo ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                  {setor.ativo ? 'ATIVO' : 'INATIVO'}
                </Badge>
              }
            >
              <div className="space-y-4">
                <p className="text-sm font-mono text-slate-500 dark:text-slate-400">
                  Centro de Custo: <span className="font-bold text-slate-900 dark:text-slate-300">{setor.codigo}</span>
                </p>
                {setor.descricao && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed min-h-[40px] italic">"{setor.descricao}"</p>
                )}
                {setor.responsavel && (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-400 uppercase text-xs">
                      {setor.responsavel.charAt(0)}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      <span className="font-semibold dark:text-slate-400 tracking-wide uppercase text-[9px]">Responsável:</span><br />
                      <span className="font-bold dark:text-slate-200">{setor.responsavel}</span>
                    </p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(setor)}
                    className="flex-1 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-bold text-[11px] uppercase tracking-wider h-10"
                  >
                    <Edit className="w-3.5 h-3.5 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Deseja remover o setor ${setor.nome}?`)) {
                        deleteMutation.mutate(setor.id);
                      }
                    }}
                    className="h-10 w-10 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:border-slate-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </PremiumCard>
          ))}
        </div>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-2xl dark:bg-slate-900/90 dark:border-white/10 rounded-[2rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0">
            <div className="bg-gradient-to-br from-emerald-900 to-teal-900 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
              <DialogHeader className="relative z-10">
                <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-emerald-300" />
                  </span>
                  {editingSetor ? (
                    <>Editar <span className="text-emerald-300">Setor</span></>
                  ) : (
                    <>Novo <span className="text-emerald-300">Setor</span></>
                  )}
                </DialogTitle>
                <p className="text-xs font-bold text-emerald-200/60 uppercase tracking-widest mt-1">
                  Arquitetura Organizacional • {editingSetor ? formData.nome : 'Configuração de Fluxo'}
                </p>
              </DialogHeader>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nome da Unidade *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 font-bold"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codigo" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Centro de Custo *</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    maxLength={10}
                    className="h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 font-mono font-bold rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsavel" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Liderança / Responsável</Label>
                  <Input
                    id="responsavel"
                    value={formData.responsavel}
                    onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                    className="h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cor" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Assinatura Visual</Label>
                  <div className="flex gap-2">
                    <div className="relative w-14 h-12 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
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
                      className="flex-1 h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 font-mono rounded-xl font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Ementa de Atividades</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl resize-none min-h-[100px] p-4 text-sm leading-relaxed italic"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha_troca" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                  Controle de Acesso Biométrico/Senha
                  <Badge variant="outline" className="text-[8px] font-black border-blue-500/30 text-blue-500 uppercase tracking-tighter px-1.5 py-0">Opcional</Badge>
                </Label>
                <Input
                  id="senha_troca"
                  type="password"
                  value={formData.senha_troca}
                  onChange={(e) => setFormData({ ...formData, senha_troca: e.target.value })}
                  placeholder="Token de transição de setor"
                  className="h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl font-mono"
                />
                <p className="text-[9px] font-medium text-slate-400 dark:text-slate-500 ml-1 italic leading-tight">Omissão desta chave resultará na utilização da credencial mestre do sistema.</p>
              </div>

              <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                <div className="space-y-0.5">
                  <Label htmlFor="ativo" className="text-slate-900 dark:text-slate-100 font-black uppercase text-[11px] tracking-widest italic flex items-center gap-2">
                    Status Operacional
                    <div className={cn("w-2 h-2 rounded-full", formData.ativo ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                  </Label>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Habilitar disponibilidade do setor na malha industrial</p>
                </div>
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="w-6 h-6 rounded-lg accent-emerald-600 dark:accent-emerald-500 cursor-pointer shadow-sm"
                />
              </div>

              <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                <div className="space-y-0.5">
                  <Label htmlFor="sequencia_decrescente" className="text-slate-900 dark:text-slate-100 font-black uppercase text-[11px] tracking-widest italic flex items-center gap-2">
                    Sequência Decrescente
                    <div className={cn("w-2 h-2 rounded-full", formData.sequencia_decrescente ? "bg-orange-500 animate-pulse" : "bg-emerald-500")} />
                  </Label>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Baixar etiquetas em ordem decrescente (ex: sucata)</p>
                </div>
                <input
                  type="checkbox"
                  id="sequencia_decrescente"
                  checked={formData.sequencia_decrescente}
                  onChange={(e) => setFormData({ ...formData, sequencia_decrescente: e.target.checked })}
                  className="w-6 h-6 rounded-lg accent-orange-600 dark:accent-orange-500 cursor-pointer shadow-sm"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1 h-14 border-slate-200 dark:border-white/10 dark:hover:bg-white/5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all active:scale-95"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-[1.5] h-14 bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-500 transition-all font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/10 active:scale-95 border-0"
                >
                  {editingSetor ? 'Efetivar Alterações' : 'Confirmar Registro'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}