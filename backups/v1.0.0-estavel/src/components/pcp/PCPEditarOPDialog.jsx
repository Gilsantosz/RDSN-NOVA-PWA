import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';

export default function PCPEditarOPDialog({ op, mes, ano, onClose }) {
  const [form, setForm] = useState({
    codigo_op: op.codigo_op || '',
    descricao: op.descricao || '',
    cliente_id: op.cliente_id || '',
    cliente_nome: op.cliente_nome || '',
    quantidade_total: op.quantidade_total || '',
    tipo: op.tipo || 'Normal',
    item_num: op.item_num || '',
    status: op.status || 'Ativo',
  });
  const [clienteSearch, setClienteSearch] = useState(op.cliente_nome || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const qc = useQueryClient();

  const { data: clientes = [] } = useQuery({
    queryKey: ['pcp-clientes'],
    queryFn: () => base44.entities.PCPCliente.list('nome', 500)
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.PCPOrdemProducao.update(op.id, {
      ...data,
      quantidade_total: Number(data.quantidade_total) || 0,
      item_num: Number(data.item_num) || op.item_num
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pcp-ops', mes, ano] });
      onClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.PCPOrdemProducao.update(op.id, { status: 'Cancelado' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pcp-ops', mes, ano] });
      onClose();
    }
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const clientesFiltrados = clientes.filter(c =>
    c.status === 'Ativo' && (
      c.nome?.toLowerCase().includes(clienteSearch.toLowerCase()) ||
      c.codigo?.toLowerCase().includes(clienteSearch.toLowerCase()) ||
      c.descricao_produto?.toLowerCase().includes(clienteSearch.toLowerCase())
    )
  );

  const handleSelectCliente = (c) => {
    setForm(f => ({
      ...f,
      cliente_id: c.id,
      cliente_nome: c.nome,
      descricao: f.descricao || c.descricao_produto || '',
    }));
    setClienteSearch(c.nome);
    setShowSuggestions(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Ordem de Produção</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Cód. OP *</Label>
              <Input value={form.codigo_op} onChange={e => set('codigo_op', e.target.value)} required className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Item Nº</Label>
              <Input type="number" value={form.item_num} onChange={e => set('item_num', e.target.value)} className="h-8 text-sm mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Descrição</Label>
            <Input value={form.descricao} onChange={e => set('descricao', e.target.value)} className="h-8 text-sm mt-1" placeholder="Produto / descrição" />
          </div>

          <div className="relative">
            <Label className="text-xs">Cliente</Label>
            <Input
              value={clienteSearch}
              onChange={e => { setClienteSearch(e.target.value); set('cliente_id', ''); set('cliente_nome', ''); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              className="h-8 text-sm mt-1"
              placeholder="Buscar cliente..."
            />
            {form.cliente_id && (
              <div className="mt-1 px-2 py-1 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                ✓ {form.cliente_nome}
              </div>
            )}
            {showSuggestions && clienteSearch && !form.cliente_id && clientesFiltrados.length > 0 && (
              <div className="border border-slate-200 rounded-lg bg-white shadow-lg mt-1 max-h-40 overflow-y-auto z-50 absolute w-full">
                {clientesFiltrados.slice(0, 8).map(c => (
                  <button key={c.id} type="button" onClick={() => handleSelectCliente(c)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 text-[10px]">{c.codigo}</span>
                      <span className="font-medium text-slate-800">{c.nome}</span>
                    </div>
                    {c.descricao_produto && <div className="text-slate-500 mt-0.5">{c.descricao_produto}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Qtd Total</Label>
              <Input type="number" value={form.quantidade_total} onChange={e => set('quantidade_total', e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.tipo} onValueChange={v => set('tipo', v)}>
                <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Atraso">Atraso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            {!confirmDelete ? (
              <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => setConfirmDelete(true)}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Cancelar OP
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">Confirmar cancelamento?</span>
                <Button type="button" size="sm" variant="destructive" onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}>Sim</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>Não</Button>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
              <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}