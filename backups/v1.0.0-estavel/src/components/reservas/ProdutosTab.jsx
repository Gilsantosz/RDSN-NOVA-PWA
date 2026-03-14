import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { useSetor } from '../context/SetorContext';
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
    ativo: true,
    nome_cliente: ''
  });

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['produtos', setorAtivo],
    queryFn: async () => {
      const todos = await base44.entities.Produto.list();
      if (isAdmin && setorAtivo === 'TODOS') return todos;
      return todos.filter(p => p.setor_id === setorAtivo);
    },
    enabled: !!setorAtivo
  });

  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: () => base44.entities.Setor.list()
  });

  const { data: clientesPCP = [] } = useQuery({
    queryKey: ['clientes-pcp'],
    queryFn: () => base44.entities.PCPCliente.list()
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
    mutationFn: (data) => base44.entities.Produto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos', setorAtivo] });
      handleCloseForm();
      toast.success('Produto cadastrado com sucesso!');
    }
  });

  const createClienteMutation = useMutation({
    mutationFn: (data) => base44.entities.Cliente.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setShowClienteForm(false);
      setProdutoRecemCriado(null);
      handleCloseForm();
      toast.success('Cliente criado automaticamente!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Produto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos', setorAtivo] });
      handleCloseForm();
      toast.success('Produto atualizado!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Produto.delete(id),
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Produtos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Cadastro de letras e códigos de produto</p>
        </div>
        <Button onClick={() => handleOpenForm()} className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 transition-colors">
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900 transition-colors">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Lista de Produtos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 hover:bg-transparent dark:border-slate-800">
                <TableHead className="text-slate-600 dark:text-slate-400">Letra+Sufixo</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400">Código Produto</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400">Cliente</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400">Descrição</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400">Ordem Baixa</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400">Status</TableHead>
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
              ) : produtos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Nenhum produto cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                produtos.map((produto) => (
                  <TableRow key={produto.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 dark:border-slate-800 transition-colors">
                    <TableCell className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {produto.letra_produto}{produto.sufixo}
                    </TableCell>
                    <TableCell className="font-mono text-slate-600 dark:text-slate-400">
                      {produto.codigo_produto || '-'}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{produto.nome_cliente || '-'}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{produto.descricao || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${produto.ordem_baixa === 'decrescente' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                        {produto.ordem_baixa === 'decrescente' ? '↓ Decrescente' : '↑ Normal'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${produto.ativo ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                        {produto.ativo ? 'Ativo' : 'Inativo'}
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
        </CardContent>
      </Card>

      {/* Dialog - Criar Cliente Automático */}
      <Dialog open={showClienteForm} onOpenChange={setShowClienteForm}>
        <DialogContent className="max-w-md sm:max-w-[90vw] md:max-w-md dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">Criar Cliente - Produto Cadastrado</DialogTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Dados pré-preenchidos do produto. Edite conforme necessário.
            </p>
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
        <DialogContent className="max-w-md sm:max-w-[90vw] md:max-w-md dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">
              {editingProduto ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Letra do Produto *</Label>
                <Input
                  value={formData.letra_produto}
                  onChange={(e) => handleLetraOrSufixoChange(e.target.value.toUpperCase().slice(0, 1), undefined)}
                  placeholder="A"
                  maxLength={1}
                  className="font-mono text-lg"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Sufixo *</Label>
                <Input
                  value={formData.sufixo}
                  onChange={(e) => handleLetraOrSufixoChange(undefined, e.target.value.toUpperCase())}
                  placeholder="LM"
                  maxLength={5}
                  className="font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Código do Produto</Label>
              <Input
                value={formData.codigo_produto}
                onChange={(e) => handleCodigoProdutoChange(e.target.value)}
                placeholder="Ex: GA3030"
                className="font-mono"
              />
              {formData.codigo_produto && clientesPCP.find(c => c.codigo?.toUpperCase().trim() === formData.codigo_produto.toUpperCase().trim()) && (
                <p className="text-xs text-emerald-600 font-medium">✓ Cliente PCP encontrado — dados preenchidos automaticamente</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input
                value={formData.modelo}
                onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                placeholder="Modelo do produto"
                list="modelos-list"
              />
              <datalist id="modelos-list">
                {[...new Set(produtos.map(p => p.modelo).filter(Boolean))].map(modelo => (
                  <option key={modelo} value={modelo} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição do produto"
              />
            </div>

            <div className="space-y-2">
              <Label>Nome do Cliente</Label>
              <Input
                value={formData.nome_cliente || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, nome_cliente: e.target.value }))}
                placeholder="Nome do cliente vinculado"
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={formData.categoria}
                onValueChange={(v) => setFormData(prev => ({ ...prev, categoria: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lacre">Lacre</SelectItem>
                  <SelectItem value="Mostrador">Mostrador</SelectItem>
                  <SelectItem value="Componente">Componente</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prefixo Padrão {!editingProduto && <span className="text-xs text-slate-500 dark:text-slate-400">(auto-gerado)</span>}</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.prefixo_padrao}
                  onChange={(e) => setFormData(prev => ({ ...prev, prefixo_padrao: e.target.value.toUpperCase() }))}
                  placeholder={generatePrefixo(formData.letra_produto, formData.sufixo) || "Preencha letra e sufixo"}
                  maxLength={10}
                  className="font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
                {!editingProduto && formData.letra_produto && formData.sufixo && (
                  <Button
                    type="button"
                    variant="outline"
                    className="px-3 dark:border-slate-700 dark:hover:bg-slate-800"
                    onClick={() => setFormData(prev => ({ ...prev, prefixo_padrao: generatePrefixo(formData.letra_produto, formData.sufixo) }))}
                    title="Regenear prefixo automático"
                  >
                    ↻
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formato: Letra + Ano (2 dígitos) + Sufixo. Ex: A26LM
              </p>
            </div>

            <div className="space-y-2">
              <Label>Estoque Mínimo</Label>
              <Input
                type="number"
                value={formData.estoque_minimo}
                onChange={(e) => setFormData(prev => ({ ...prev, estoque_minimo: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Setor Produtivo</Label>
              <Select
                value={formData.setor_id}
                onValueChange={(v) => setFormData(prev => ({ ...prev, setor_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhum setor</SelectItem>
                  {setores.filter(s => s.ativo).map(setor => (
                    <SelectItem key={setor.id} value={setor.id}>
                      {setor.nome} ({setor.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ordem de Baixa */}
            <div className="space-y-2">
              <Label>Ordem de Baixa Padrão</Label>
              <Select
                value={formData.ordem_baixa || 'normal'}
                onValueChange={(v) => setFormData(prev => ({ ...prev, ordem_baixa: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">
                    <span className="flex items-center gap-2">↑ Normal (crescente)</span>
                  </SelectItem>
                  <SelectItem value="decrescente">
                    <span className="flex items-center gap-2">↓ Decrescente (invertida)</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Define a ordem padrão ao dar baixa neste produto na produção
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label>Produto Ativo</Label>
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseForm} className="dark:border-slate-800 dark:hover:bg-slate-800">
                Cancelar
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 transition-colors">
                {editingProduto ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}