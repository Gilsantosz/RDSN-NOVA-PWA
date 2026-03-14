import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { useSetor } from '../context/SetorContext';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PremiumCard } from '@/components/ui/PremiumCard';

export default function ProdutosTab() {
  const queryClient = useQueryClient();
  const { setorAtivo, isAdmin } = useSetor();
  const [showForm, setShowForm] = useState(false);
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [editingProduto, setEditingProduto] = useState(null);
  const [produtoRecemCriado, setProdutoRecemCriado] = useState(null);
  const [clienteData, setClienteData] = useState({
    nome: '',
    letra_produto: '',
    modelo: '',
    codigo_produto: '',
    setor_id: '',
    ativo: true
  });
  const [formData, setFormData] = useState({
    letra_produto: '',
    sufixo: '',
    codigo_produto: '',
    modelo: '',
    descricao: '',
    categoria: 'Outro',
    celulas_permitidas: [],
    prefixo_padrao: '',
    estoque_minimo: 0,
    setor_id: '',
    ordem_baixa: 'normal',
    ativo: true,
    nome_cliente: ''
  });

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['produtos', setorAtivo],
    queryFn: async () => {
      const todos = await rdsn.entities.Produto.list();
      if (isAdmin && setorAtivo === 'TODOS') return todos;
      return todos.filter(p => p.setor_id === setorAtivo);
    },
    enabled: !!setorAtivo
  });

  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: () => rdsn.entities.Setor.list()
  });

  const { data: clientesPCP = [] } = useQuery({
    queryKey: ['clientes-pcp'],
    queryFn: () => rdsn.entities.PCPCliente.list()
  });

  const handleCodigoProdutoChange = (codigo) => {
    const codigoUpper = codigo.toUpperCase().trim();

    const match = clientesPCP.find(c =>
      c.codigo?.toUpperCase().trim() === codigoUpper
    );

    setFormData(prev => ({
      ...prev,
      codigo_produto: codigo,
      ...(match && {
        nome_cliente: match.nome || prev.nome_cliente,
        descricao: match.descricao_produto || prev.descricao
      })
    }));
  };

  const createMutation = useMutation({
    mutationFn: (data) => rdsn.entities.Produto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos', setorAtivo] });
      handleCloseForm();
      toast.success('Produto cadastrado com sucesso!');
    }
  });

  const createClienteMutation = useMutation({
    mutationFn: (data) => rdsn.entities.Cliente.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setShowClienteForm(false);
      setProdutoRecemCriado(null);
      handleCloseForm();
      toast.success('Cliente criado automaticamente!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => rdsn.entities.Produto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos', setorAtivo] });
      handleCloseForm();
      toast.success('Produto atualizado!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => rdsn.entities.Produto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos', setorAtivo] });
      toast.success('Produto removido!');
    }
  });

  const handleOpenForm = (produto = null) => {
    if (produto) {
      setEditingProduto(produto);
      setFormData({
        letra_produto: produto.letra_produto,
        sufixo: produto.sufixo,
        codigo_produto: produto.codigo_produto || '',
        modelo: produto.modelo || '',
        descricao: produto.descricao || '',
        categoria: produto.categoria || 'Outro',
        celulas_permitidas: produto.celulas_permitidas || [],
        prefixo_padrao: produto.prefixo_padrao || '',
        estoque_minimo: produto.estoque_minimo || 0,
        setor_id: produto.setor_id || '',
        ordem_baixa: produto.ordem_baixa || 'normal',
        ativo: produto.ativo ?? true,
        nome_cliente: produto.nome_cliente || ''
      });
    } else {
      setEditingProduto(null);
      setFormData({
        letra_produto: '',
        sufixo: '',
        codigo_produto: '',
        modelo: '',
        descricao: '',
        categoria: 'Outro',
        celulas_permitidas: [],
        prefixo_padrao: '',
        estoque_minimo: 0,
        setor_id: setorAtivo,
        ordem_baixa: 'normal',
        ativo: true,
        nome_cliente: ''
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
      codigo_produto: '',
      modelo: '',
      descricao: '',
      categoria: 'Outro',
      celulas_permitidas: [],
      prefixo_padrao: '',
      estoque_minimo: 0,
      setor_id: setorAtivo,
      ordem_baixa: 'normal',
      ativo: true,
      nome_cliente: ''
    });
  };

  const generatePrefixo = (letra, sufixo) => {
    if (!letra || !sufixo) return '';
    const ano = new Date().getFullYear().toString().slice(-2);
    return `${letra}${ano}${sufixo}`;
  };

  const handleLetraOrSufixoChange = (letra, sufixo) => {
    const novoLetra = letra !== undefined ? letra : formData.letra_produto;
    const novoSufixo = sufixo !== undefined ? sufixo : formData.sufixo;
    const prefixoGerado = generatePrefixo(novoLetra, novoSufixo);

    setFormData(prev => ({
      ...prev,
      ...(letra !== undefined && { letra_produto: letra }),
      ...(sufixo !== undefined && { sufixo: sufixo }),
      ...(prefixoGerado && !editingProduto && { prefixo_padrao: prefixoGerado })
    }));
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
    <>
      <PremiumCard
        title="Gestão de Produtos e Letras"
        icon={Package}
        iconColor="#3b82f6"
        badge={
          <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span>{produtos.length} Ativos</span>
          </div>
        }
        action={
          <Button
            onClick={() => handleOpenForm()}
            className="bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold gap-2 rounded-xl h-10 px-6 uppercase text-[10px] tracking-widest transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </Button>
        }
        className="border-slate-200 dark:border-white/5 dark:bg-slate-900/60 shadow-xl"
        noPadding
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800">
                <TableHead className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Letra / Prefixo</TableHead>
                <TableHead className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Cod. PCP</TableHead>
                <TableHead className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</TableHead>
                <TableHead className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Descrição</TableHead>
                <TableHead className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Baixa</TableHead>
                <TableHead className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</TableHead>
                <TableHead className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-right pr-6 text-slate-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : produtos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Nenhum produto cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                produtos.map((produto) => (
                  <TableRow key={produto.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 dark:border-slate-800 transition-colors">
                    <TableCell>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 dark:border-blue-400/20 group">
                        <span className="font-mono font-black text-slate-900 dark:text-white text-base tracking-tight leading-none">
                          {produto.letra_produto}
                        </span>
                        <span className="text-blue-500 dark:text-blue-400 font-mono font-black text-[15px] italic border-l border-blue-500/20 pl-1.5 group-hover:pl-2 transition-all">
                          {produto.sufixo}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-white/5 rounded-lg px-2 py-0.5">
                      {produto.codigo_produto || '-'}
                    </TableCell>
                    <TableCell className="text-slate-900 dark:text-slate-200 font-bold text-sm tracking-tight">{produto.nome_cliente || '-'}</TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400 text-xs italic max-w-[200px] truncate">{produto.descricao || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${
                          produto.ordem_baixa === 'decrescente' 
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20' 
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                        }`}>
                          {produto.ordem_baixa === 'decrescente' ? '↓ Decr' : '↑ Norm'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${
                        produto.ativo 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]' 
                          : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                      }`}>
                        {produto.ativo ? 'Ativo' : 'Off'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenForm(produto)}
                          className="hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(produto.id)}
                          className="hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </PremiumCard>

      {/* Dialog - Criar Cliente Automático */}
      <Dialog open={showClienteForm} onOpenChange={setShowClienteForm}>
        <DialogContent className="max-w-md sm:max-w-[90vw] md:max-w-md border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl">
          <DialogHeader className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800/50">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-2">
              <Plus className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                Criar Cliente
              </DialogTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Dados pré-preenchidos do produto recém criado.
              </p>
            </div>
          </DialogHeader>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              <strong>Produto:</strong> {produtoRecemCriado?.letra_produto}{produtoRecemCriado?.sufixo}
            </p>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            createClienteMutation.mutate(clienteData);
          }} className="space-y-4">
            <div className="space-y-2 bg-slate-100 dark:bg-slate-800 p-2 rounded">
              <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold">Letra do Produto</Label>
              <div className="px-3 py-2 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-700 font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
                {clienteData.letra_produto}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome do Cliente *</Label>
              <Input
                value={clienteData.nome}
                onChange={(e) => setClienteData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome do cliente"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input
                value={clienteData.modelo}
                onChange={(e) => setClienteData(prev => ({ ...prev, modelo: e.target.value }))}
                placeholder="Ex: Hidrômetro DN15"
              />
            </div>

            <div className="space-y-2">
              <Label>Código do Produto</Label>
              <Input
                value={clienteData.codigo_produto}
                onChange={(e) => setClienteData(prev => ({ ...prev, codigo_produto: e.target.value }))}
                placeholder="Ex: HYD-DN15-01"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Cliente Ativo</Label>
              <Switch
                checked={clienteData.ativo}
                onCheckedChange={(checked) => setClienteData(prev => ({ ...prev, ativo: checked }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowClienteForm(false);
                setProdutoRecemCriado(null);
              }} className="dark:border-slate-800 dark:hover:bg-slate-800">
                Pular
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 transition-colors" disabled={createClienteMutation.isPending}>
                Criar Cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg sm:max-w-[92vw] p-0 overflow-hidden border-none bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.3)] rounded-[1.5rem]">
          <DialogHeader className="relative p-5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 opacity-90" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]" />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg border border-white/20">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-0.5">
                <DialogTitle className="text-lg font-black tracking-tight text-white uppercase italic">
                  {editingProduto ? 'Editar Produto' : 'Novo Produto'}
                </DialogTitle>
                <p className="text-blue-100/70 text-[8px] font-bold uppercase tracking-[0.2em]">
                  {editingProduto ? 'Refining Excellence' : 'Expanding Catalog'}
                </p>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="p-5 max-h-[72vh] overflow-y-auto custom-scrollbar space-y-4">

              {/* Bloco 1: Identidade do Prefixo */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-3">
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Identidade do Prefixo</p>
                <div className="flex items-end gap-2">
                  <div className="space-y-1 w-16 shrink-0">
                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Letra *</Label>
                    <Input
                      value={formData.letra_produto}
                      onChange={(e) => handleLetraOrSufixoChange(e.target.value.toUpperCase().slice(0, 1), undefined)}
                      placeholder="A"
                      maxLength={1}
                      className="h-9 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-white/5 rounded-lg text-center font-mono font-black text-base"
                      required
                    />
                  </div>
                  <span className="text-slate-300 dark:text-slate-600 font-black text-lg pb-1.5">+</span>
                  <div className="space-y-1 w-24 shrink-0">
                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Sufixo *</Label>
                    <Input
                      value={formData.sufixo}
                      onChange={(e) => handleLetraOrSufixoChange(undefined, e.target.value.toUpperCase())}
                      placeholder="LM"
                      maxLength={5}
                      className="h-9 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-white/5 rounded-lg text-center font-mono text-sm italic text-blue-500 dark:text-blue-400"
                      required
                    />
                  </div>
                  <span className="text-slate-300 dark:text-slate-600 font-black text-sm pb-1.5">=</span>
                  <div className="space-y-1 flex-1">
                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                      Prefixo Padrão {!editingProduto && <span className="text-[8px] opacity-60 font-medium">(auto)</span>}
                    </Label>
                    <Input
                      value={formData.prefixo_padrao}
                      onChange={(e) => setFormData(prev => ({ ...prev, prefixo_padrao: e.target.value.toUpperCase() }))}
                      placeholder={generatePrefixo(formData.letra_produto, formData.sufixo) || "A26LM"}
                      maxLength={10}
                      className="h-9 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-white/5 rounded-lg font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 2: Dados do Produto */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Código do Produto</Label>
                  <Input
                    value={formData.codigo_produto}
                    onChange={(e) => handleCodigoProdutoChange(e.target.value)}
                    placeholder="Ex: GA3030"
                    className="h-9 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/5 rounded-lg font-mono text-sm"
                  />
                  {formData.codigo_produto && clientesPCP.find(c => c.codigo?.toUpperCase().trim() === formData.codigo_produto.toUpperCase().trim()) && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Cliente PCP identificado</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Modelo / Nome do Produto</Label>
                    <Input
                      value={formData.modelo}
                      onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                      placeholder="Ex: Molde Especial Alpha"
                      list="modelos-list"
                      className="h-9 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/5 rounded-lg font-bold text-sm"
                    />
                    <datalist id="modelos-list">
                      {[...new Set(produtos.map(p => p.modelo).filter(Boolean))].map(modelo => (
                        <option key={modelo} value={modelo} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Nome do Cliente</Label>
                    <Input
                      value={formData.nome_cliente || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome_cliente: e.target.value }))}
                      placeholder="Empresa ou cliente..."
                      className="h-9 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/5 rounded-lg text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Categoria</Label>
                    <Select value={formData.categoria} onValueChange={(v) => setFormData(prev => ({ ...prev, categoria: v }))}>
                      <SelectTrigger className="h-9 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/5 rounded-lg text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
                        <SelectItem value="Lacre">Lacre</SelectItem>
                        <SelectItem value="Mostrador">Mostrador</SelectItem>
                        <SelectItem value="Componente">Componente</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Descrição Adicional</Label>
                    <Input
                      value={formData.descricao}
                      onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Breve descrição do produto..."
                      className="h-9 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/5 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 3: Configurações operacionais */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Estoque Mínimo</Label>
                  <Input
                    type="number"
                    value={formData.estoque_minimo}
                    onChange={(e) => setFormData(prev => ({ ...prev, estoque_minimo: parseInt(e.target.value) || 0 }))}
                    className="h-9 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/5 rounded-lg font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Setor Produtivo</Label>
                  <Select value={formData.setor_id} onValueChange={(v) => setFormData(prev => ({ ...prev, setor_id: v }))}>
                    <SelectTrigger className="h-9 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/5 rounded-lg text-sm">
                      <SelectValue placeholder="Setor" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
                      <SelectItem value={null}>Nenhum setor</SelectItem>
                      {setores.filter(s => s.ativo).map(setor => (
                        <SelectItem key={setor.id} value={setor.id}>{setor.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Ordem de Baixa</Label>
                  <Select value={formData.ordem_baixa || 'normal'} onValueChange={(v) => setFormData(prev => ({ ...prev, ordem_baixa: v }))}>
                    <SelectTrigger className="h-9 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/5 rounded-lg text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
                      <SelectItem value="normal">↑ Normal</SelectItem>
                      <SelectItem value="decrescente">↓ Invertida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Toggle Ativo */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                <Label className="text-[10px] font-black text-slate-700 dark:text-white uppercase tracking-widest">Produto Ativo</Label>
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>

            </div>
            <DialogFooter className="px-5 py-4 bg-slate-50/50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseForm}
                className="h-9 px-5 rounded-lg border-slate-200 dark:border-white/10 dark:hover:bg-white/5 font-bold uppercase text-[9px] tracking-widest transition-all"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="h-9 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black uppercase text-[9px] tracking-widest shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-95"
              >
                {editingProduto ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}