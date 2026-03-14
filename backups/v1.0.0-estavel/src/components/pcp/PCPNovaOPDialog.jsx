import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Factory } from 'lucide-react';
import { usePCPSetor } from '@/components/pcp/PCPSetorGuard';

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
    queryFn: () => base44.entities.PCPCliente.list('nome', 500)
  });

  const { data: opsExistentes = [] } = useQuery({
    queryKey: ['pcp-ops', mes, ano],
    queryFn: () => base44.entities.PCPOrdemProducao.filter({ mes, ano }, 'item_num', 100)
  });

  const { data: reservas = [] } = useQuery({
    queryKey: ['reservas-lote'],
    queryFn: () => base44.entities.ReservaLote.filter({ status: { $in: ['RESERVADO', 'EM_PRODUCAO'] } }, '-created_at', 2000)
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      // Calcular item_num: coloca a nova OP no topo se quantidade for a maior
      const qtd = Number(data.quantidade_total) || 0;
      const maxQtd = opsExistentes.filter(o => o.tipo === 'Normal').reduce((m, o) => Math.max(m, o.quantidade_total || 0), 0);
      const itemNum = data.item_num ? Number(data.item_num) : (qtd >= maxQtd ? 1 : opsExistentes.length + 1);
      return base44.entities.PCPOrdemProducao.create({
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
    // Dedupliquear por código — manter apenas a primeira ocorrência
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

  // Calcula quantidade total das reservas ativas para um dado código de produto
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
      // Tentar achar o codigo_produto a partir das reservas do cliente
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
          Nova Ordem de Produção
          {!bloqueado && (
            <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium border border-amber-200">
              <Factory className="w-3 h-3" /> {nomeSetor}
            </span>
          )}
        </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Label className="text-xs">Cód. OP *</Label>
              <Input
                value={form.codigo_op}
                onChange={e => { handleCodigoOPChange(e.target.value); setShowCodigoSuggestions(true); }}
                onFocus={() => setShowCodigoSuggestions(true)}
                onBlur={() => setTimeout(() => setShowCodigoSuggestions(false), 150)}
                required
                className="h-8 text-sm mt-1"
                placeholder="OP-001 ou código do produto"
                autoComplete="off"
              />
              {showCodigoSuggestions && codigosFiltrados.length > 0 && (
                <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {codigosFiltrados.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={() => {
                        handleCodigoOPChange(c.codigo);
                        setShowCodigoSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800">{c.codigo}</span>
                        <span className="text-slate-500">{c.nome}</span>
                      </div>
                      {c.descricao_produto && <div className="text-slate-400 mt-0.5 truncate">{c.descricao_produto}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs">Item Nº</Label>
              <Input type="number" value={form.item_num} onChange={e => set('item_num', e.target.value)} className="h-8 text-sm mt-1" placeholder={opsExistentes.length + 1} />
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
              onChange={e => {
                setClienteSearch(e.target.value);
                set('cliente_id', '');
                set('cliente_nome', '');
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              className="h-8 text-sm mt-1"
              placeholder="Buscar por nome, código ou produto..."
            />
            {form.cliente_id && (
              <div className="mt-1 px-2 py-1 bg-green-50 border border-green-200 rounded text-xs text-green-700 flex items-center gap-1">
                ✓ {form.cliente_nome}
                {clientes.find(c => c.id === form.cliente_id)?.descricao_produto && (
                  <span className="text-slate-500 ml-1">— {clientes.find(c => c.id === form.cliente_id)?.descricao_produto}</span>
                )}
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
            <div>
            <Label className="text-xs">Código do Produto <span className="text-slate-400">(para integração com Baixas)</span></Label>
            <Input value={form.codigo_produto} onChange={e => set('codigo_produto', e.target.value)} className="h-8 text-sm mt-1" placeholder="Ex: V8IIPIC310EC" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Qtd Total</Label>
              <Input type="number" value={form.quantidade_total} onChange={e => set('quantidade_total', e.target.value)} className="h-8 text-sm mt-1" placeholder="0" />
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
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Salvando...' : 'Criar OP'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}