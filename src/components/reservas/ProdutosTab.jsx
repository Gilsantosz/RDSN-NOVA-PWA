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
    ordem_numeracao: 'CRESCENTE',
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
    queryKey: ['clientes-pcp', setorAtivo],
    queryFn: () => {
      if (!setorAtivo || setorAtivo === 'ALL') {
        return rdsn.entities.PCPCliente.list();
      }
      return rdsn.entities.PCPCliente.filter({ setor_id: setorAtivo });
    },
    enabled: !!setorAtivo
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
        ordem_numeracao: produto.ordem_numeracao || (produto.ordem_baixa === 'decrescente' ? 'DECRESCENTE' : 'CRESCENTE'),
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
        ordem_numeracao: 'CRESCENTE',
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
                        <p className="text-[9px] font-black uppercase tracking-widest leading-none mt-1">
                        {produto.ordem_numeracao === 'DECRESCENTE' ? (
                          <span className="text-purple-600 dark:text-purple-400">↓ Ordem Reversa</span>
                        ) : (
                          <span className="text-blue-600 dark:text-blue-400">↑ Ordem Sequencial</span>
                        )}
                      </p>
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
        <DialogContent className="max-w-3xl sm:max-w-[90vw] md:max-w-4xl dark:bg-slate-900/90 dark:border-white/10 rounded-[2.5rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0">
          <div className="bg-gradient-to-br from-blue-900 to-indigo-900 p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full -mr-32 -mt-32 blur-3xl" />
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-300" />
                </span>
                {editingProduto ? 'Editar' : 'Novo'} <span className="text-blue-300">Produto</span>
              </DialogTitle>
              <p className="text-xs font-bold text-blue-200/60 uppercase tracking-widest mt-1">
                {editingProduto ? 'Atualização de Cadastro no Catálogo' : 'Inclusão de Novo Produto no Catálogo'}
              </p>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="p-0 overflow-y-auto max-h-[70vh] custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
            <div className="p-6 md:p-8 space-y-8">
              
              {/* Identificação */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border border-blue-200 dark:border-blue-800/50 flex-shrink-0">
                    <span className="text-blue-600 dark:text-blue-400 font-black text-xs">1</span>
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                    Identificação Inicial
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5 bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Letra do Produto *</Label>
                    <Input
                      value={formData.letra_produto}
                      onChange={(e) => handleLetraOrSufixoChange(e.target.value.toUpperCase().slice(0, 1), undefined)}
                      placeholder="Ex: A"
                      maxLength={1}
                      required
                      className="h-11 dark:bg-slate-900 dark:border-white/10 rounded-xl border-2 transition-all focus:border-blue-500/50 font-bold"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Sufixo *</Label>
                    <Input
                      value={formData.sufixo}
                      onChange={(e) => handleLetraOrSufixoChange(undefined, e.target.value.toUpperCase())}
                      placeholder="Ex: LM"
                      maxLength={5}
                      required
                      className="h-11 dark:bg-slate-900 dark:border-white/10 rounded-xl border-2 transition-all focus:border-blue-500/50 font-bold"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center justify-between">
                      Prefixo Padrão {!editingProduto && <span className="text-[9px] opacity-60 normal-case tracking-normal">(Auto gerado)</span>}
                    </Label>
                    <Input
                      value={formData.prefixo_padrao}
                      onChange={(e) => setFormData(prev => ({ ...prev, prefixo_padrao: e.target.value.toUpperCase() }))}
                      placeholder={generatePrefixo(formData.letra_produto, formData.sufixo) || "A26LM"}
                      maxLength={10}
                      className="h-11 dark:bg-slate-900 dark:border-white/10 rounded-xl border-2 transition-all focus:border-blue-500/50 font-mono text-blue-600 dark:text-blue-400 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Detalhes do Produto */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center border border-orange-200 dark:border-orange-800/50 flex-shrink-0">
                    <span className="text-orange-600 dark:text-orange-400 font-black text-xs">2</span>
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                    Detalhes e Relacionamentos
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm">
                  <div className="space-y-3 relative">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Código do Produto (PCP)</Label>
                    <Input
                      value={formData.codigo_produto}
                      onChange={(e) => handleCodigoProdutoChange(e.target.value)}
                      placeholder="Ex: GA3030"
                      className="h-11 dark:bg-slate-900 dark:border-white/10 rounded-xl border-2 transition-all focus:border-orange-500/50 uppercase font-bold"
                    />
                    {formData.codigo_produto && clientesPCP.find(c => c.codigo?.toUpperCase().trim() === formData.codigo_produto.toUpperCase().trim()) && (
                      <p className="absolute -bottom-5 right-0 text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">
                        ✨ PCP Identificado
                      </p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Empresa / Nome do Cliente</Label>
                    <Input
                      value={formData.nome_cliente || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome_cliente: e.target.value }))}
                      placeholder="Nome amigável ou razão social..."
                      className="h-11 dark:bg-slate-900 dark:border-white/10 rounded-xl border-2 transition-all focus:border-orange-500/50 font-bold"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Modelo Comercial</Label>
                    <Input
                      value={formData.modelo}
                      onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                      placeholder="Ex: Molde Especial Alpha"
                      list="modelos-list"
                      className="h-11 dark:bg-slate-900 dark:border-white/10 rounded-xl border-2 transition-all focus:border-orange-500/50 font-bold"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Categoria de Fabricação</Label>
                    <Select value={formData.categoria} onValueChange={(v) => setFormData(prev => ({ ...prev, categoria: v }))}>
                      <SelectTrigger className="h-11 dark:bg-slate-900 dark:border-white/10 rounded-xl border-2 transition-all focus:border-orange-500/50 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-900 dark:border-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <SelectItem value="Lacre">Lacre de Segurança</SelectItem>
                        <SelectItem value="Mostrador">Mostrador / Painel</SelectItem>
                        <SelectItem value="Componente">Componente Interno</SelectItem>
                        <SelectItem value="Outro">Outro Produto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Descrição Adicional Opcional</Label>
                    <Input
                      value={formData.descricao}
                      onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Breve descrição, observações sobre o molde ou informações extras..."
                      className="h-11 dark:bg-slate-900 dark:border-white/10 rounded-xl border-2 transition-all focus:border-orange-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Parâmetros Operacionais */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center border border-purple-200 dark:border-purple-800/50 flex-shrink-0">
                    <span className="text-purple-600 dark:text-purple-400 font-black text-xs">3</span>
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                    Parâmetros Operacionais
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 p-5 bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm">
                  <div className="space-y-3 lg:col-span-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Estoque Min. (Alerta)</Label>
                    <Input
                      type="number"
                      value={formData.estoque_minimo}
                      onChange={(e) => setFormData(prev => ({ ...prev, estoque_minimo: parseInt(e.target.value) || 0 }))}
                      className="h-11 dark:bg-slate-900 dark:border-white/10 rounded-xl border-2 transition-all focus:border-purple-500/50 text-center font-bold"
                    />
                  </div>
                  <div className="space-y-3 lg:col-span-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Setor Alocado</Label>
                    <Select value={formData.setor_id} onValueChange={(v) => setFormData(prev => ({ ...prev, setor_id: v }))}>
                      <SelectTrigger className="h-11 dark:bg-slate-900 dark:border-white/10 rounded-xl border-2 transition-all focus:border-purple-500/50 font-bold">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-900 dark:border-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <SelectItem value={null}>Nenhum setor</SelectItem>
                        {setores.filter(s => s.ativo).map(setor => (
                          <SelectItem key={setor.id} value={setor.id}>{setor.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3 lg:col-span-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 whitespace-nowrap">Ordem de Baixa Num.</Label>
                    <Select value={formData.ordem_numeracao || 'CRESCENTE'} onValueChange={(v) => setFormData(prev => ({ ...prev, ordem_numeracao: v }))}>
                      <SelectTrigger className="h-11 dark:bg-slate-900 dark:border-white/10 rounded-xl border-2 transition-all focus:border-purple-500/50 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-900 dark:border-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <SelectItem value="CRESCENTE" className="text-blue-600 dark:text-blue-400">↑ SEQUENCIAL</SelectItem>
                        <SelectItem value="DECRESCENTE" className="text-purple-600 dark:text-purple-400">↓ REVERSA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3 lg:col-span-1 flex flex-col justify-end pb-1 h-full">
                    <div className="flex w-full items-center justify-between gap-3 bg-slate-100 dark:bg-slate-900 px-3 h-11 rounded-xl border border-slate-200 dark:border-slate-800">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer">Ativo</Label>
                      <Switch
                        checked={formData.ativo}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="p-5 md:p-6 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-white/5 flex flex-wrap justify-end gap-3 sticky bottom-0 z-10 w-full rounded-b-[2.5rem]">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseForm}
                className="rounded-xl px-8 h-12 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-xl px-8 h-12 bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                {editingProduto ? 'Salvar Alterações' : 'Cadastrar Produto'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}