// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Produtos() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [editingProduto, setEditingProduto] = useState(null);
  const [produtoRecemCriado, setProdutoRecemCriado] = useState(null);
  const [clienteData, setClienteData] = useState({
    nome: '',
    letra_produto: '',
    modelo: '',
    codigo_produto: '',
    ativo: true
  });
  const [formData, setFormData] = useState({
    letra_produto: '',
    sufixo: '',
    modelo: '',
    descricao: '',
    categoria: 'Outro',
    celulas_permitidas: [],
    prefixo_padrao: '',
    estoque_minimo: 0,
    ativo: true,
    ordem_numeracao: 'CRESCENTE'
  });

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['produtos-all'],
    queryFn: () => rdsn.entities.Produto.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => rdsn.entities.Produto.create(data),
    onSuccess: (produto) => {
      queryClient.invalidateQueries({ queryKey: ['produtos-all'] });
      setProdutoRecemCriado(produto);
      setClienteData({
        nome: '',
        letra_produto: produto.letra_produto,
        modelo: produto.modelo || '',
        codigo_produto: produto.codigo_produto || '',
        ativo: true
      });
      setShowForm(false);
      setShowClienteForm(true);
      toast.success('Produto cadastrado! Agora crie um cliente.');
    }
  });

  const createClienteMutation = useMutation({
    mutationFn: (data) => rdsn.entities.Cliente.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes-all'] });
      setShowClienteForm(false);
      setProdutoRecemCriado(null);
      handleCloseForm();
      toast.success('Cliente criado automaticamente!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => rdsn.entities.Produto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      handleCloseForm();
      toast.success('Produto atualizado!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => rdsn.entities.Produto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Produto removido!');
    }
  });

  const handleOpenForm = (produto = null) => {
    if (produto) {
      setEditingProduto(produto);
      setFormData({
        letra_produto: produto.letra_produto,
        sufixo: produto.sufixo,
        modelo: produto.modelo || '',
        descricao: produto.descricao || '',
        categoria: produto.categoria || 'Outro',
        celulas_permitidas: produto.celulas_permitidas || [],
        prefixo_padrao: produto.prefixo_padrao || '',
        estoque_minimo: produto.estoque_minimo || 0,
        ativo: produto.ativo ?? true,
        ordem_numeracao: produto.ordem_numeracao || 'CRESCENTE'
      });
    } else {
      setEditingProduto(null);
      setFormData({
        letra_produto: '',
        sufixo: '',
        modelo: '',
        descricao: '',
        categoria: 'Outro',
        celulas_permitidas: [],
        prefixo_padrao: '',
        estoque_minimo: 0,
        ativo: true
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProduto(null);
    setFormData({
      letra_produto: '',
      sufixo: '',
      modelo: '',
      descricao: '',
      categoria: 'Outro',
      celulas_permitidas: [],
      prefixo_padrao: '',
      estoque_minimo: 0,
      ativo: true,
      ordem_numeracao: 'CRESCENTE'
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingProduto) {
      updateMutation.mutate({ id: editingProduto.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(16,185,129,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-600 to-teal-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 group border border-emerald-400/20">
                <Package className="w-8 h-8 sm:w-10 sm:h-10 text-white group-hover:rotate-12 transition-transform duration-500" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Catálogo de <span className="text-emerald-600 dark:text-emerald-400">Produtos</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                  Gestão • Prefixos • Modelos
                </p>
              </div>
            </div>

            <div className="flex gap-3 w-full xl:w-auto">
              <Button
                onClick={() => handleOpenForm()}
                className="h-12 px-8 rounded-2xl bg-slate-900 dark:bg-emerald-600 text-white font-black uppercase text-xs tracking-widest gap-2 shadow-xl hover:scale-[1.02] active:scale-95 transition-all border-0 shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" /> Novo Produto
              </Button>
            </div>
          </div>
        </div>

        <PremiumCard title="Lista de Produtos" icon={Package} iconColor="#3b82f6" noPadding>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/30 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <TableHead className="text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">Código</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">Letra</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">Sufixo</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">Descrição</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">Status</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500 italic">
                    Carregando produtos...
                  </TableCell>
                </TableRow>
              ) : produtos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500 italic">
                    Nenhum produto cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                produtos.map((produto) => (
                  <TableRow key={produto.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <TableCell className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {produto.letra_produto}{produto.sufixo}
                    </TableCell>
                    <TableCell>
                      <div className="w-8 h-8 bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-200 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm">
                        {produto.letra_produto}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-slate-600 dark:text-slate-400 font-medium">{produto.sufixo}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400 text-xs">{produto.descricao || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${produto.ativo ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                        {produto.ativo ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenForm(produto)}
                          className="h-8 w-8 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirm('Excluir este produto?') && deleteMutation.mutate(produto.id)}
                          className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </PremiumCard>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-3xl dark:bg-slate-900/90 dark:border-white/10 rounded-[2.5rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0">
            <div className="bg-gradient-to-br from-emerald-900 to-teal-900 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
              <DialogHeader className="relative z-10">
                <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Package className="w-6 h-6 text-emerald-300" />
                  </span>
                  {editingProduto ? (
                    <>Editar <span className="text-emerald-300">Produto</span></>
                  ) : (
                    <>Novo <span className="text-emerald-300">Produto</span></>
                  )}
                </DialogTitle>
                <p className="text-xs font-bold text-emerald-200/60 uppercase tracking-widest mt-1">
                  Engenharia de SKU • {editingProduto ? `${formData.letra_produto}${formData.sufixo}` : 'Parametrização de Catálogo'}
                </p>
              </DialogHeader>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Letra de Identificação *</Label>
                  <Input
                    value={formData.letra_produto}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      letra_produto: e.target.value.toUpperCase().slice(0, 1)
                    }))}
                    placeholder="Ex: A"
                    maxLength={1}
                    className="h-14 font-mono text-2xl font-black bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl text-center"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Sufixo de Modelo *</Label>
                  <Input
                    value={formData.sufixo}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      sufixo: e.target.value.toUpperCase()
                    }))}
                    placeholder="Ex: LM"
                    maxLength={5}
                    className="h-14 font-mono text-xl font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Designação / Modelo</Label>
                  <Input
                    value={formData.modelo}
                    onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                    placeholder="Modelo comercial"
                    list="modelos-list"
                    className="h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl font-bold"
                  />
                  <datalist id="modelos-list">
                    {[...new Set(produtos.map(p => p.modelo).filter(Boolean))].map(modelo => (
                      <option key={modelo} value={modelo} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Categoria de Inventário</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, categoria: v }))}
                  >
                    <SelectTrigger className="h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-white/10 backdrop-blur-xl">
                      <SelectItem value="Lacre" className="font-bold">Lacre</SelectItem>
                      <SelectItem value="Mostrador" className="font-bold">Mostrador</SelectItem>
                      <SelectItem value="Componente" className="font-bold">Componente</SelectItem>
                      <SelectItem value="Outro" className="font-bold">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Descrição Técnica</Label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Detalhamento do item no sistema"
                  className="h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl font-bold italic"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                    Prefixo de Controle
                    <Badge variant="outline" className="text-[8px] font-black border-blue-500/30 text-blue-500 px-1.5 py-0">AUTO</Badge>
                  </Label>
                  <Input
                    value={formData.prefixo_padrao}
                    onChange={(e) => setFormData(prev => ({ ...prev, prefixo_padrao: e.target.value.toUpperCase() }))}
                    placeholder="Ex: LM"
                    maxLength={10}
                    className="h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl font-mono font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Estoque Mínimo (Safety Stock)</Label>
                  <Input
                    type="number"
                    value={formData.estoque_minimo}
                    onChange={(e) => setFormData(prev => ({ ...prev, estoque_minimo: parseInt(e.target.value) || 0 }))}
                    className="h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Linhas / Células Vinculadas</Label>
                <Input
                  value={(formData.celulas_permitidas || []).join(', ')}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    celulas_permitidas: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  }))}
                  placeholder="Ex: Célula 1, Montagem A, Bancada X..."
                  className="h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl font-bold"
                />
              </div>

              <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                <div className="space-y-0.5">
                  <Label htmlFor="ativo-prod" className="text-slate-900 dark:text-slate-100 font-black uppercase text-[11px] tracking-widest italic flex items-center gap-2">
                    Ativo no Dashboard
                    <div className={cn("w-2 h-2 rounded-full", formData.ativo ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                  </Label>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Habilitar utilização deste produto em Reservas e Ordens</p>
                </div>
                <Switch
                  id="ativo-prod"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>

              {/* Sentido da Sequência de Numeração */}
              <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                <div className="space-y-0.5">
                  <Label htmlFor="ordem-prod" className="text-slate-900 dark:text-slate-100 font-black uppercase text-[11px] tracking-widest italic flex items-center gap-2">
                    Ordem de Numeração
                    <div className={cn("w-2 h-2 rounded-full", formData.ordem_numeracao === 'DECRESCENTE' ? "bg-orange-500 animate-pulse" : "bg-emerald-500")} />
                  </Label>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    {formData.ordem_numeracao === 'DECRESCENTE'
                      ? 'Emissão do maior para o menor número (↓ Decrescente)'
                      : 'Emissão do menor para o maior número (↑ Crescente)'}
                  </p>
                </div>
                <Select
                  value={formData.ordem_numeracao}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, ordem_numeracao: v }))}
                >
                  <SelectTrigger id="ordem-prod" className="w-[180px] h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl font-bold text-xs uppercase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-white/10 backdrop-blur-xl">
                    <SelectItem value="CRESCENTE" className="font-bold text-xs uppercase">↑ Crescente</SelectItem>
                    <SelectItem value="DECRESCENTE" className="font-bold text-xs uppercase">↓ Decrescente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4 pt-4 border-t dark:border-white/5 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseForm}
                  className="flex-1 h-14 border-slate-200 dark:border-white/10 dark:hover:bg-white/5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-[1.5] h-14 bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-500 transition-all font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/10 border-0"
                >
                  {editingProduto ? 'Efetivar Alterações' : 'Cadastrar na Base'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog - Criar Cliente Automático */}
        <Dialog open={showClienteForm} onOpenChange={setShowClienteForm}>
          <DialogContent className="max-w-2xl dark:bg-slate-900/90 dark:border-white/10 rounded-[2.5rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0">
            <div className="bg-gradient-to-br from-blue-900 to-indigo-900 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
              <DialogHeader className="relative z-10">
                <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-blue-300" />
                  </span>
                  Vincular <span className="text-blue-300">Cliente</span>
                </DialogTitle>
                <p className="text-xs font-bold text-blue-200/60 uppercase tracking-widest mt-1">
                  Provisionamento Automático • Step 2/2
                </p>
              </DialogHeader>
            </div>

            <div className="px-8 pt-8">
              <div className="bg-blue-600/10 border border-blue-500/20 p-5 rounded-2xl flex justify-between items-center shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/20">
                    <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-900 dark:text-blue-400 italic leading-none mb-1">Produto Gerador</p>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-tighter">{produtoRecemCriado?.letra_produto}{produtoRecemCriado?.sufixo} • {produtoRecemCriado?.modelo}</p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              createClienteMutation.mutate(clienteData);
            }} className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Razão Social / Nome do Cliente *</Label>
                <Input
                  value={clienteData.nome}
                  onChange={(e) => setClienteData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Entidade receptora da produção"
                  required
                  className="h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Modelo de Referência</Label>
                  <Input
                    value={clienteData.modelo}
                    onChange={(e) => setClienteData(prev => ({ ...prev, modelo: e.target.value }))}
                    placeholder="Ex: Padrão ABNT"
                    className="h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl font-bold italic"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Cód. Produto no Cliente</Label>
                  <Input
                    value={clienteData.codigo_produto}
                    onChange={(e) => setClienteData(prev => ({ ...prev, codigo_produto: e.target.value }))}
                    placeholder="ID externo opcional"
                    className="h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 dark:text-slate-100 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                <div className="space-y-0.5">
                  <Label htmlFor="ativo-cli" className="text-slate-900 dark:text-slate-100 font-black uppercase text-[11px] tracking-widest italic flex items-center gap-2">
                    Cliente Ativo
                    <div className={cn("w-2 h-2 rounded-full", clienteData.ativo ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                  </Label>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Habilitar vínculo comercial para este item</p>
                </div>
                <Switch
                  id="ativo-cli"
                  checked={clienteData.ativo}
                  onCheckedChange={(checked) => setClienteData(prev => ({ ...prev, ativo: checked }))}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowClienteForm(false);
                    setProdutoRecemCriado(null);
                  }}
                  className="flex-1 h-14 border-slate-200 dark:border-white/10 dark:hover:bg-white/5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all"
                >
                  Pular Vínculo
                </Button>
                <Button
                  type="submit"
                  className="flex-[1.5] h-14 bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-all font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-500/10 border-0"
                  disabled={createClienteMutation.isPending}
                >
                  Confirmar Vínculo
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}