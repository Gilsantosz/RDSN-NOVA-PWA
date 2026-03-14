// @ts-nocheck
import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertTriangle, Check, FileText } from 'lucide-react';

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
    queryFn: () => rdsn.entities.PCPCliente.list('nome', 500)
  });

  const updateMutation = useMutation({
    mutationFn: (data) => rdsn.entities.PCPOrdemProducao.update(op.id, {
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
    mutationFn: () => rdsn.entities.PCPOrdemProducao.update(op.id, { status: 'Cancelado' }),
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
      <DialogContent className="max-w-2xl dark:bg-slate-900/90 dark:border-white/10 rounded-[2.5rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0 flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-200" />
              </span>
              Editar <span className="text-blue-200">Ordem</span>
            </DialogTitle>
            <p className="text-[10px] font-black text-blue-100/60 uppercase tracking-[0.2em] mt-2 italic">
              Ajuste de Planejamento • {op.codigo_op}
            </p>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar flex flex-col">
          <div className="flex-1 space-y-6">
            {/* Identificação Principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Código da OP *</Label>
                <Input
                  value={form.codigo_op}
                  onChange={e => set('codigo_op', e.target.value)}
                  required
                  className="h-14 font-mono font-black text-lg dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl px-6"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Item Sequencial</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={form.item_num}
                    onChange={e => set('item_num', e.target.value)}
                    className="h-14 font-black text-lg dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl text-center"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 pointer-events-none">#</div>
                </div>
              </div>
            </div>

            {/* Descrição e Produto */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Detalhamento Técnico</Label>
              <Input
                value={form.descricao}
                onChange={e => set('descricao', e.target.value)}
                className="h-14 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl px-6 font-bold italic"
                placeholder="Ex: Monitor de Sinais Vitais - Modelo X1"
              />
            </div>

            {/* Cliente */}
            <div className="relative space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Vínculo de Cliente</Label>
              <Input
                value={clienteSearch}
                onChange={e => { setClienteSearch(e.target.value); set('cliente_id', ''); set('cliente_nome', ''); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                className="h-14 font-black dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl px-6"
                placeholder="Pesquisar clientes ativos..."
              />

              {form.cliente_id && (
                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-in slide-in-from-top-2 duration-300">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Atribuído: {form.cliente_nome}</span>
                </div>
              )}

              {showSuggestions && clienteSearch && !form.cliente_id && clientesFiltrados.length > 0 && (
                <div className="absolute z-[60] w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl mt-2 max-h-[280px] overflow-y-auto backdrop-blur-xl p-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  {clientesFiltrados.slice(0, 8).map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCliente(c)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 rounded-lg border-b border-slate-100 dark:border-white/5 last:border-0 transition-all group/cli"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[9px] font-black text-slate-400 dark:text-slate-500 group-hover/cli:text-blue-500 transition-colors uppercase">{c.codigo}</span>
                        <span className="font-black text-slate-900 dark:text-white text-xs uppercase">{c.nome}</span>
                      </div>
                      {c.descricao_produto && <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 italic truncate opacity-70">{c.descricao_produto}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quantidade e Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Meta de Produção</Label>
                <Input
                  type="number"
                  value={form.quantidade_total}
                  onChange={e => set('quantidade_total', e.target.value)}
                  className="h-14 font-black text-2xl dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl text-center"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Prioridade</Label>
                <Select value={form.tipo} onValueChange={v => set('tipo', v)}>
                  <SelectTrigger className="h-14 font-black uppercase tracking-widest dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl px-6">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-white/10 rounded-xl">
                    <SelectItem value="Normal" className="font-black uppercase text-[10px] tracking-widest">Plano Normal</SelectItem>
                    <SelectItem value="Atraso" className="font-black uppercase text-[10px] tracking-widest text-amber-500">Fluxo Atraso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

          </div>

          <div className="pt-6 border-t dark:border-white/5 flex flex-col gap-4 mt-auto sticky bottom-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm -mx-8 -mb-8 p-8 rounded-b-[2.5rem]">
            {!confirmDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full h-11 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl font-bold uppercase text-[10px] tracking-widest group"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2 transition-transform group-hover:scale-110" />
                Deseja cancelar esta operação?
              </Button>
            ) : (
              <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-red-600">
                  <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white animate-pulse">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider leading-tight">Confirmar cancelamento <br /> permanente desta OP?</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    className="h-10 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs px-4 border-0"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                  >
                    Confirmar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 hover:bg-white/10 text-slate-500 dark:text-slate-400 font-bold text-xs"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Abortar
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-14 border-slate-200 dark:border-white/10 dark:hover:bg-white/5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all"
                onClick={onClose}
              >
                Descartar
              </Button>
              <Button
                type="submit"
                className="flex-[1.5] h-14 bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/20 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] border-0 transition-all active:scale-95"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Gravando...' : 'Efetivar Ajustes'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}