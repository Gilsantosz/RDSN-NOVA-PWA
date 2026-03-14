// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Pencil, Users, X, Factory } from 'lucide-react';
import PCPSetorGuard, { usePCPSetor } from '@/components/pcp/PCPSetorGuard';
import SetorReadonlyBanner, { useSetorReadonly } from '@/components/pcp/SetorReadonlyBanner';

const ESTADOS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

function ClienteForm({ cliente, onSave, onClose }) {
  const [form, setForm] = useState({
    codigo: '', nome: '', cnpj: '', cidade: '', estado: 'SP', contato: '', telefone: '', email: '', status: 'Ativo',
    descricao_produto: '', kit: '', carcaca: '', plaqueta: '', turbina: '',
    ...(cliente || {})
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Código *</Label>
          <Input value={form.codigo} onChange={e => set('codigo', e.target.value)} required className="h-8 text-sm mt-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-100" placeholder="CLI001" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 dark:text-slate-400">Status</Label>
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger className="h-8 text-sm mt-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-100"><SelectValue /></SelectTrigger>
            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
              <SelectItem value="Ativo" className="dark:text-slate-100">Ativo</SelectItem>
              <SelectItem value="Inativo" className="dark:text-slate-100">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Nome *</Label>
          <Input value={form.nome} onChange={e => set('nome', e.target.value)} required className="h-8 text-sm mt-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-100" placeholder="Razão Social" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">CNPJ</Label>
          <Input value={form.cnpj} onChange={e => set('cnpj', e.target.value)} className="h-8 text-sm mt-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-100" placeholder="00.000.000/0000-00" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Contato</Label>
          <Input value={form.contato} onChange={e => set('contato', e.target.value)} className="h-8 text-sm mt-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-100" placeholder="Nome do responsável" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cidade</Label>
          <Input value={form.cidade} onChange={e => set('cidade', e.target.value)} className="h-8 text-sm mt-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-100" placeholder="Cidade" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Estado</Label>
          <Select value={form.estado} onValueChange={v => set('estado', v)}>
            <SelectTrigger className="h-8 text-sm mt-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-100"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-40 dark:bg-slate-900 dark:border-slate-800">
              {ESTADOS.map(uf => <SelectItem key={uf} value={uf} className="dark:text-slate-100">{uf}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Telefone</Label>
          <Input value={form.telefone} onChange={e => set('telefone', e.target.value)} className="h-8 text-sm mt-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-100" placeholder="(11) 9999-9999" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Email</Label>
          <Input value={form.email} onChange={e => set('email', e.target.value)} type="email" className="h-8 text-sm mt-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-100" placeholder="email@empresa.com" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Descrição do Produto</Label>
          <Input value={form.descricao_produto} onChange={e => set('descricao_produto', e.target.value)} className="h-8 text-sm mt-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-100" placeholder="Descrição do produto" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Kit</Label>
          <Input value={form.kit} onChange={e => set('kit', e.target.value)} className="h-8 text-sm mt-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-100" placeholder="Código/descrição do kit" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Carcaça</Label>
          <Input value={form.carcaca} onChange={e => set('carcaca', e.target.value)} className="h-8 text-sm mt-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-100" placeholder="Código/descrição da carcaça" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Plaqueta</Label>
          <Input value={form.plaqueta} onChange={e => set('plaqueta', e.target.value)} className="h-8 text-sm mt-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-100" placeholder="Código/descrição da plaqueta" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Turbina</Label>
          <Input value={form.turbina} onChange={e => set('turbina', e.target.value)} className="h-8 text-sm mt-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-100" placeholder="Código/descrição da turbina" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800">Salvar</Button>
      </div>
    </form>
  );
}

export default function PCPCadastroClientes() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCliente, setEditCliente] = useState(null);
  const qc = useQueryClient();
  const { bloqueado, nomeSetor, setorAtivo } = usePCPSetor();
  const isReadonly = useSetorReadonly();

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['pcp-clientes', setorAtivo],
    queryFn: () => {
      if (!setorAtivo || setorAtivo === 'ALL') return base44.entities.PCPCliente.list('nome', 500);
      return base44.entities.PCPCliente.filter({ setor_id: setorAtivo }, 'nome', 500);
    }
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, setor_id: setorAtivo };
      return editCliente
        ? base44.entities.PCPCliente.update(editCliente.id, payload)
        : base44.entities.PCPCliente.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pcp-clientes'] });
      setShowForm(false);
      setEditCliente(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PCPCliente.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pcp-clientes'] })
  });

  const filtered = clientes.filter(c =>
    c.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    c.cidade?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (c) => { setEditCliente(c); setShowForm(true); };
  const handleNew = () => { setEditCliente(null); setShowForm(true); };
  const handleSave = (data) => saveMutation.mutate(data);

  return (
    <PCPSetorGuard action="cadastrar clientes PCP">
      <div className="p-4 md:p-6 min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-indigo-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all hover:scale-105 active:scale-95 group border border-blue-400/20">
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white group-hover:rotate-6 transition-transform duration-500" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Gestão de <span className="text-blue-600 dark:text-blue-400">Clientes</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                  {clientes.length} Cadastros Ativos • Setor: <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 font-black"><Factory className="w-3.5 h-3.5" />{nomeSetor}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center">
              <Button
                onClick={handleNew}
                disabled={bloqueado || isReadonly}
                className="h-12 px-6 rounded-2xl bg-slate-900 dark:bg-blue-600 text-white font-black uppercase text-xs tracking-widest gap-2 shadow-xl hover:scale-[1.02] active:scale-95 transition-all border-0 shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" /> Novo Cliente
              </Button>
            </div>
          </div>
        </div>

        <SetorReadonlyBanner />
        <div className="relative mb-4 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por código, nome ou cidade..."
            className="pl-9 h-9 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 dark:bg-slate-950 text-white">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider">Código</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider hidden md:table-cell">CNPJ</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider hidden lg:table-cell">Cidade/UF</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider hidden lg:table-cell">Contato</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400 italic">Carregando clientes...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400 italic">
                  {clientes.length === 0 ? 'Nenhum cliente cadastrado.' : 'Nenhum resultado encontrado.'}
                </td></tr>
              ) : filtered.map((c, i) => (
                <tr key={c.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30 dark:bg-slate-800/10'}`}>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600 dark:text-slate-400">{c.codigo}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{c.nome}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 hidden md:table-cell">{c.cnpj || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 hidden lg:table-cell">{c.cidade ? `${c.cidade}/${c.estado}` : '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 hidden lg:table-cell">{c.contato || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={c.status === 'Ativo' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0 font-bold' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-0 font-bold'}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {!isReadonly && (
                        <>
                          <button onClick={() => handleEdit(c)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => confirm('Excluir este cliente?') && deleteMutation.mutate(c.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors shadow-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditCliente(null); } }}>
          <DialogContent className="max-w-lg dark:bg-slate-900 dark:border-slate-800">
            <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <DialogTitle className="flex items-center gap-2 dark:text-slate-100">
                {editCliente ? 'Editar Cliente' : 'Novo Cliente'}
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-medium border border-amber-200 dark:border-amber-800">
                  <Factory className="w-3 h-3" /> {nomeSetor}
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="pt-4">
              <ClienteForm cliente={editCliente} onSave={handleSave} onClose={() => { setShowForm(false); setEditCliente(null); }} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PCPSetorGuard>
  );
}