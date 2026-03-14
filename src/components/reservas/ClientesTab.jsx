import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { useSetor } from '../context/SetorContext';
import { Plus, Edit2, Trash2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ClientesTab() {
  const queryClient = useQueryClient();
  const { setorAtivo, isAdmin } = useSetor();
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    letra_produto: '',
    modelo: '',
    codigo_produto: '',
    setor_id: '',
    ativo: true
  });

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes', setorAtivo],
    queryFn: async () => {
      const todos = await rdsn.entities.Cliente.list();
      if (isAdmin && setorAtivo === 'TODOS') return todos;
      return todos.filter(c => c.setor_id === setorAtivo);
    },
    enabled: !!setorAtivo
  });

  const { data: produtos = [] } = useQuery({
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

  const createMutation = useMutation({
    mutationFn: (data) => rdsn.entities.Cliente.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      handleCloseForm();
      toast.success('Cliente cadastrado!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => rdsn.entities.Cliente.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      handleCloseForm();
      toast.success('Cliente atualizado!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => rdsn.entities.Cliente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente removido!');
    }
  });

  const handleOpenForm = (cliente = null) => {
    if (cliente) {
      setEditingCliente(cliente);
      setFormData({
        nome: cliente.nome,
        letra_produto: cliente.letra_produto,
        modelo: cliente.modelo || '',
        codigo_produto: cliente.codigo_produto || '',
        setor_id: cliente.setor_id || '',
        ativo: cliente.ativo ?? true
      });
    } else {
      setEditingCliente(null);
      setFormData({
        nome: '',
        letra_produto: '',
        modelo: '',
        codigo_produto: '',
        setor_id: setorAtivo,
        ativo: true
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
   setShowForm(false);
   setEditingCliente(null);
   setFormData({ nome: '', letra_produto: '', modelo: '', codigo_produto: '', setor_id: setorAtivo, ativo: true });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCliente) {
      updateMutation.mutate({ id: editingCliente.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Clientes</h2>
          <p className="text-sm text-slate-500">Cadastro de clientes e modelos</p>
        </div>
        <Button onClick={() => handleOpenForm()} className="bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Lista de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="text-slate-600">Cliente</TableHead>
                <TableHead className="text-slate-600">Letra</TableHead>
                <TableHead className="text-slate-600">Modelo</TableHead>
                <TableHead className="text-slate-600">Código</TableHead>
                <TableHead className="text-slate-600">Status</TableHead>
                <TableHead className="text-slate-600 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : clientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhum cliente cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                clientes.map((cliente) => (
                  <TableRow key={cliente.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-900">
                      {cliente.nome}
                    </TableCell>
                    <TableCell>
                      <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                        {cliente.letra_produto}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{cliente.modelo || '-'}</TableCell>
                    <TableCell className="font-mono text-slate-600">{cliente.codigo_produto || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        cliente.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {cliente.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleOpenForm(cliente)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteMutation.mutate(cliente.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md sm:max-w-[90vw] md:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Cliente *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome do cliente"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Letra do Produto *</Label>
              <Select 
                value={formData.letra_produto} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, letra_produto: v }))}
                required
              >
                <SelectTrigger className="font-mono text-lg">
                  <SelectValue placeholder="Selecione a letra" />
                </SelectTrigger>
                <SelectContent>
                   {[...new Set(produtos.filter(p => p.ativo).map(p => p.letra_produto))].sort().map(letra => (
                     <SelectItem key={letra} value={letra} className="font-mono text-lg">
                       {letra}
                     </SelectItem>
                   ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Letras disponíveis: {[...new Set(produtos.filter(p => p.ativo).map(p => p.letra_produto))].sort().join(', ')}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input
                value={formData.modelo}
                onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                placeholder="Ex: Hidrômetro DN15"
              />
            </div>

            <div className="space-y-2">
              <Label>Código do Produto</Label>
              <Input
                value={formData.codigo_produto}
                onChange={(e) => setFormData(prev => ({ ...prev, codigo_produto: e.target.value }))}
                placeholder="Ex: HYD-DN15-01"
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

            <div className="flex items-center justify-between">
              <Label>Cliente Ativo</Label>
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
                {editingCliente ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}