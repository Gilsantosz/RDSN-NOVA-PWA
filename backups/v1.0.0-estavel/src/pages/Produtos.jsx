// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
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
    ativo: true
  });

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['produtos-all'],
    queryFn: () => base44.entities.Produto.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Produto.create(data),
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
    mutationFn: (data) => base44.entities.Cliente.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes-all'] });
      setShowClienteForm(false);
      setProdutoRecemCriado(null);
      handleCloseForm();
      toast.success('Cliente criado automaticamente!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Produto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      handleCloseForm();
      toast.success('Produto atualizado!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Produto.delete(id),
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
        ativo: produto.ativo ?? true
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
      ativo: true
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

        {/* Table */}
        <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-xl overflow-hidden transition-all duration-300">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              Lista de Produtos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="rounded-2xl dark:bg-slate-900 dark:border-slate-800">
            <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-blue-600 flex items-center justify-center transition-colors">
                  <Package className="w-4 h-4 text-white" />
                </span>
                {editingProduto ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Letra do Produto *</Label>
                  <Input
                    value={formData.letra_produto}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      letra_produto: e.target.value.toUpperCase().slice(0, 1)
                    }))}
                    placeholder="A"
                    maxLength={1}
                    className="font-mono text-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Sufixo *</Label>
                  <Input
                    value={formData.sufixo}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      sufixo: e.target.value.toUpperCase()
                    }))}
                    placeholder="LM"
                    maxLength={5}
                    className="font-mono bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Modelo</Label>
                <Input
                  value={formData.modelo}
                  onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                  placeholder="Modelo do produto"
                  list="modelos-list"
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-100"
                />
                <datalist id="modelos-list">
                  {[...new Set(produtos.map(p => p.modelo).filter(Boolean))].map(modelo => (
                    <option key={modelo} value={modelo} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label className="dark:text-slate-300">Descrição</Label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição do produto"
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label className="dark:text-slate-300">Categoria</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, categoria: v }))}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                    <SelectItem value="Lacre" className="dark:text-slate-100">Lacre</SelectItem>
                    <SelectItem value="Mostrador" className="dark:text-slate-100">Mostrador</SelectItem>
                    <SelectItem value="Componente" className="dark:text-slate-100">Componente</SelectItem>
                    <SelectItem value="Outro" className="dark:text-slate-100">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="dark:text-slate-300">Prefixo Padrão</Label>
                <Input
                  value={formData.prefixo_padrao}
                  onChange={(e) => setFormData(prev => ({ ...prev, prefixo_padrao: e.target.value.toUpperCase() }))}
                  placeholder="Ex: LM, HYD..."
                  maxLength={10}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label className="dark:text-slate-300">Células Permitidas (separadas por vírgula)</Label>
                <Input
                  value={(formData.celulas_permitidas || []).join(', ')}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    celulas_permitidas: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  }))}
                  placeholder="Ex: Célula 1, Linha A, Setor B..."
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label className="dark:text-slate-300">Estoque Mínimo</Label>
                <Input
                  type="number"
                  value={formData.estoque_minimo}
                  onChange={(e) => setFormData(prev => ({ ...prev, estoque_minimo: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800 transition-colors">
                <Label className="dark:text-slate-300 font-medium">Produto Ativo</Label>
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                />
              </div>
              <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={handleCloseForm} className="dark:border-slate-700 dark:hover:bg-slate-800">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 font-bold">
                  {editingProduto ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog - Criar Cliente Automático */}
        <Dialog open={showClienteForm} onOpenChange={setShowClienteForm}>
          <DialogContent className="max-w-md sm:max-w-[90vw] md:max-w-md rounded-2xl dark:bg-slate-900 dark:border-slate-800">
            <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">Criar Cliente Vinculado</DialogTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Dados pré-preenchidos do produto. Edite conforme necessário.
              </p>
            </DialogHeader>
            <div className="bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200/50 dark:border-blue-800/50 mb-4 transition-colors">
              <p className="text-sm text-blue-900 dark:text-blue-300 flex items-center gap-2">
                <Package className="w-4 h-4" />
                <strong>Produto:</strong> {produtoRecemCriado?.letra_produto}{produtoRecemCriado?.sufixo}
              </p>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              createClienteMutation.mutate(clienteData);
            }} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Nome do Cliente *</Label>
                <Input
                  value={clienteData.nome}
                  onChange={(e) => setClienteData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome do cliente"
                  required
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label className="dark:text-slate-300">Modelo</Label>
                <Input
                  value={clienteData.modelo}
                  onChange={(e) => setClienteData(prev => ({ ...prev, modelo: e.target.value }))}
                  placeholder="Ex: Hidrômetro DN15"
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label className="dark:text-slate-300">Código do Produto</Label>
                <Input
                  value={clienteData.codigo_produto}
                  onChange={(e) => setClienteData(prev => ({ ...prev, codigo_produto: e.target.value }))}
                  placeholder="Ex: HYD-DN15-01"
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800 transition-colors">
                <Label className="dark:text-slate-300 font-medium">Cliente Ativo</Label>
                <Switch
                  checked={clienteData.ativo}
                  onCheckedChange={(checked) => setClienteData(prev => ({ ...prev, ativo: checked }))}
                />
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => {
                  setShowClienteForm(false);
                  setProdutoRecemCriado(null);
                }} className="dark:border-slate-700 dark:hover:bg-slate-800">
                  Pular
                </Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 font-bold" disabled={createClienteMutation.isPending}>
                  Criar Cliente
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}