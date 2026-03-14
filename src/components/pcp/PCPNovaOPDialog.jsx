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
import { Factory } from 'lucide-react';
import { usePCPSetor } from '@/components/pcp/PCPSetorGuard';
import { cn } from "@/lib/utils";

export default function PCPNovaOPDialog({ mes, ano, onClose }) {
  const [form, setForm] = useState({
    codigo_op: '', descricao: '', cliente_id: '', cliente_nome: '',
    codigo_produto: '', quantidade_total: '', tipo: 'Normal', item_num: '', status: 'Ativo'
  });
  const [clienteSearch, setClienteSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCodigoSuggestions, setShowCodigoSuggestions] = useState(false);
  const qc = useQueryClient();
  const { nomeSetor, setorAtivo, bloqueado } = usePCPSetor();

  const { data: clientes = [] } = useQuery({
    queryKey: ['pcp-clientes'],
    queryFn: () => rdsn.entities.PCPCliente.list('nome', 500)
  });

  const { data: opsExistentes = [] } = useQuery({
    queryKey: ['pcp-ops', mes, ano],
    queryFn: () => rdsn.entities.PCPOrdemProducao.filter({ mes, ano }, 'item_num', 100)
  });

  const { data: reservas = [] } = useQuery({
    queryKey: ['reservas-lote'],
    queryFn: () => rdsn.entities.ReservaLote.filter({ status: { $in: ['RESERVADO', 'EM_PRODUCAO'] } }, '-created_at', 2000)
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const qtd = Number(data.quantidade_total) || 0;
      const maxQtd = opsExistentes.filter(o => o.tipo === 'Normal').reduce((m, o) => Math.max(m, o.quantidade_total || 0), 0);
      const itemNum = data.item_num ? Number(data.item_num) : (qtd >= maxQtd ? 1 : opsExistentes.length + 1);
      return rdsn.entities.PCPOrdemProducao.create({
        ...data, mes, ano,
        item_num: itemNum,
        quantidade_total: qtd,
        codigo_produto: data.codigo_produto || '',
        setor_id: setorAtivo || ''
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pcp-ops', mes, ano] });
      onClose();
    }
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const codigosFiltrados = (() => {
    const filtered = clientes.filter(c =>
      c.status === 'Ativo' && c.codigo && (
        !form.codigo_op ||
        c.codigo.toLowerCase().includes(form.codigo_op.toLowerCase()) ||
        c.nome?.toLowerCase().includes(form.codigo_op.toLowerCase()) ||
        c.descricao_produto?.toLowerCase().includes(form.codigo_op.toLowerCase())
      )
    );
    const seen = new Set();
    return filtered.filter(c => {
      if (seen.has(c.codigo)) return false;
      seen.add(c.codigo);
      return true;
    });
  })();

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

  const getQtdReservas = (codigoProduto) => {
    if (!codigoProduto) return 0;
    const cod = codigoProduto.toLowerCase();
    return reservas
      .filter(r =>
        (r.status === 'RESERVADO' || r.status === 'EM_PRODUCAO' || r.status === 'LIBERADO') &&
        (r.codigo_produto?.toLowerCase() === cod || r.codigo_completo?.toLowerCase().includes(cod))
      )
      .reduce((s, r) => s + (r.quantidade || 0), 0);
  };

  const handleCodigoOPChange = (val) => {
    set('codigo_op', val);
    if (!val) return;
    const match = clientes.find(c =>
      c.codigo?.toLowerCase() === val.toLowerCase() ||
      c.descricao_produto?.toLowerCase().includes(val.toLowerCase())
    );
    if (match && match.status === 'Ativo') {
      const qtdReservada = getQtdReservas(val);
      const reservaMatch = reservas.find(r =>
        r.cliente === match.nome || r.codigo_produto?.toLowerCase().includes(val.toLowerCase())
      );
      setForm(f => ({
        ...f,
        codigo_op: val,
        cliente_id: match.id,
        cliente_nome: match.nome,
        descricao: f.descricao || match.descricao_produto || '',
        quantidade_total: qtdReservada > 0 ? String(qtdReservada) : f.quantidade_total,
        codigo_produto: f.codigo_produto || reservaMatch?.codigo_produto || '',
      }));
      setClienteSearch(match.nome);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl dark:bg-slate-900/90 dark:border-white/10 rounded-[2.5rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0 flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-br from-amber-600 to-orange-700 p-8 text-white relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <Factory className="w-6 h-6 text-amber-200" />
              </span>
              Nova <span className="text-amber-200">Ordem</span> de Produção
            </DialogTitle>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-[10px] font-black text-amber-100/60 uppercase tracking-[0.2em] italic">Engenharia de Processos • {mes}/{ano}</p>
              {!bloqueado && (
                <Badge variant="outline" className="bg-white/10 text-white border-white/20 font-black italic uppercase text-[8px] tracking-widest px-2 py-0">
                  {nomeSetor}
                </Badge>
              )}
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar flex flex-col">
          <div className="flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative group">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1 block">Código Identificador *</Label>
                <Input
                  value={form.codigo_op}
                  onChange={e => { handleCodigoOPChange(e.target.value); setShowCodigoSuggestions(true); }}
                  onFocus={() => setShowCodigoSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCodigoSuggestions(false), 150)}
                  required
                  className="h-14 font-mono font-black text-lg dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl px-6 focus:ring-amber-500/20 transition-all"
                  placeholder="EX: OP-24-001"
                  autoComplete="off"
                />
                {showCodigoSuggestions && codigosFiltrados.length > 0 && (
                  <div className="absolute z-[60] w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl mt-2 max-h-60 overflow-y-auto overflow-x-hidden backdrop-blur-xl p-1 animate-in fade-in zoom-in-95 duration-200">
                    {codigosFiltrados.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => {
                          handleCodigoOPChange(c.codigo);
                          setShowCodigoSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-amber-500/5 dark:hover:bg-amber-500/10 rounded-lg border-b border-slate-100 dark:border-white/5 last:border-0 transition-all group/item"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-black text-slate-900 dark:text-white text-sm group-hover/item:text-amber-600 transition-colors">{c.codigo}</span>
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase truncate max-w-[120px]">{c.nome}</span>
                        </div>
                        {c.descricao_produto && <div className="text-[10px] text-slate-400 mt-1 italic truncate opacity-70">{c.descricao_produto}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1 block">Posição na Fila</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={form.item_num}
                    onChange={e => set('item_num', e.target.value)}
                    className="h-14 text-center font-black dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl text-lg"
                    placeholder={opsExistentes.length + 1}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase pointer-events-none">#</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Descrição Comercial do Lote</Label>
              <Input
                value={form.descricao}
                onChange={e => set('descricao', e.target.value)}
                className="h-14 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl px-6 font-bold italic"
                placeholder="Ex: Produção Mensal - Lotes Prioritários"
              />
            </div>

            <div className="relative space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Cliente / Destinatário Final</Label>
              <Input
                value={clienteSearch}
                onChange={e => {
                  setClienteSearch(e.target.value);
                  set('cliente_id', '');
                  set('cliente_nome', '');
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="h-14 font-black dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl px-6"
                placeholder="Pesquisar na base de clientes..."
              />
              {form.cliente_id && (
                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-in slide-in-from-top-2 duration-300">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                    <Factory className="w-3 h-3" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Vínculo Ativo: {form.cliente_nome}</span>
                </div>
              )}
              {showSuggestions && clienteSearch && !form.cliente_id && clientesFiltrados.length > 0 && (
                <div className="absolute z-[60] w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl mt-2 max-h-52 overflow-y-auto backdrop-blur-xl p-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  {clientesFiltrados.slice(0, 10).map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCliente(c)}
                      className="w-full text-left px-4 py-3 hover:bg-amber-500/5 dark:hover:bg-amber-500/10 rounded-lg border-b border-slate-100 dark:border-white/5 last:border-0 transition-all group/cli"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[9px] font-black text-slate-400 dark:text-slate-500 group-hover/cli:text-amber-500 transition-colors uppercase">{c.code || c.codigo}</span>
                        <span className="font-black text-slate-900 dark:text-white text-sm uppercase">{c.nome}</span>
                      </div>
                      {c.descricao_produto && <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 italic truncate opacity-70">{c.descricao_produto}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                SKU do Produto
                <span className="text-slate-400 italic font-normal">(Vínculo transacional)</span>
              </Label>
              <Input
                value={form.codigo_produto}
                onChange={e => set('codigo_produto', e.target.value)}
                className="h-14 font-mono text-sm font-black dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl px-6"
                placeholder="EX: V8IIPIC310EC"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Meta de Unidades</Label>
                <Input
                  type="number"
                  value={form.quantidade_total}
                  onChange={e => set('quantidade_total', e.target.value)}
                  className="h-14 text-center text-2xl font-black dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Prioridade Operacional</Label>
                <Select value={form.tipo} onValueChange={v => set('tipo', v)}>
                  <SelectTrigger className="h-14 font-black uppercase tracking-widest dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl px-6">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-white/10 rounded-xl">
                    <SelectItem value="Normal" className="font-black uppercase text-[10px] tracking-widest">Plano Normal</SelectItem>
                    <SelectItem value="Atraso" className="font-black uppercase text-[10px] tracking-widest text-red-500">⚠️ Contingência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

          </div>

          <div className="flex gap-4 pt-6 border-t dark:border-white/5 mt-auto sticky bottom-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm -mx-8 -mb-8 p-8 rounded-b-[2.5rem]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-14 border-slate-200 dark:border-white/10 dark:hover:bg-white/5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all"
            >
              Descartar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-[1.5] h-14 bg-slate-950 dark:bg-amber-600 text-white hover:bg-slate-800 dark:hover:bg-amber-500 transition-all font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-xl shadow-amber-600/20 border-0"
            >
              {createMutation.isPending ? 'Sincronizando...' : 'Publicar Ordem'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}