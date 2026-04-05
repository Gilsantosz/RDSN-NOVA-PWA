// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { Plus, Search, Pencil, Users, X, Factory, User, Phone, Mail, FileText, Package } from 'lucide-react';
import PCPSetorGuard, { usePCPSetor } from '@/components/pcp/PCPSetorGuard';
import SetorReadonlyBanner, { useSetorReadonly } from '@/components/pcp/SetorReadonlyBanner';

const ESTADOS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

// Definido FORA do ClienteForm para evitar remount a cada keystroke (perda de foco)
function Field({ label, icon: Icon, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 ml-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </Label>
      {children}
    </div>
  );
}

function ClienteForm({ cliente, onSave, onClose }) {
  const [form, setForm] = useState({
    codigo: '', nome: '', cnpj: '', cidade: '', estado: 'SP', contato: '', telefone: '', email: '', status: 'Ativo',
    descricao_produto: '', kit: '', carcaca: '', plaqueta: '', turbina: '', letra_produto: '',
    ...(cliente || {})
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };



  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Identificação Unívoca" icon={Users}>
          <div className="relative group">
            <Input
              value={form.codigo}
              onChange={e => set('codigo', e.target.value)}
              required
              className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl font-bold uppercase"
              placeholder="Ex: CLI001"
            />
          </div>
        </Field>

        <Field label="Status Operacional">
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-900 dark:border-white/10 rounded-xl">
              <SelectItem value="Ativo" className="font-bold">✓ Ativo</SelectItem>
              <SelectItem value="Inativo" className="font-bold">✕ Inativo</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="md:col-span-2">
          <Field label="Razão Social / Nome Fantasia" icon={Users}>
            <Input
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
              required
              className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl font-black italic"
              placeholder="Nome completo da empresa ou cliente"
            />
          </Field>
        </div>

        <Field label="CNPJ / CPF" icon={FileText}>
          <Input value={form.cnpj} onChange={e => set('cnpj', e.target.value)} className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl font-mono" placeholder="00.000.000/0000-00" />
        </Field>

        <Field label="Ponto de Contato" icon={User}>
          <Input value={form.contato} onChange={e => set('contato', e.target.value)} className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl font-bold" placeholder="Nome do representante" />
        </Field>

        <div className="grid grid-cols-2 gap-4 md:col-span-2">
          <Field label="Município">
            <Input value={form.cidade} onChange={e => set('cidade', e.target.value)} className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl font-bold" placeholder="Cidade" />
          </Field>
          <Field label="UF">
            <Select value={form.estado} onValueChange={v => set('estado', v)}>
              <SelectTrigger className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl font-bold"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-40 dark:bg-slate-900 dark:border-white/10 rounded-xl">
                {ESTADOS.map(uf => <SelectItem key={uf} value={uf} className="font-bold">{uf}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Telefone Fixo / Mobile" icon={Phone}>
          <Input value={form.telefone} onChange={e => set('telefone', e.target.value)} className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl font-mono" placeholder="(11) 9999-9999" />
        </Field>

        <Field label="Canal Digital" icon={Mail}>
          <Input value={form.email} onChange={e => set('email', e.target.value)} type="email" className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl font-medium" placeholder="email@empresa.com" />
        </Field>

        <div className="md:col-span-2 border-t dark:border-white/5 pt-6 mt-2">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2 italic">
            <Package className="w-3.5 h-3.5" />
            Especificações Técnicas Padrão
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Field label="Descrição Base do Produto">
                <Input value={form.descricao_produto} onChange={e => set('descricao_produto', e.target.value)} className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl" placeholder="Ex: Hidrômetro Multijato 1/2 DN15" />
              </Field>
            </div>
            <Field label="Kit Acessórios">
              <Input value={form.kit} onChange={e => set('kit', e.target.value)} className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl" placeholder="Código do Kit" />
            </Field>
            <Field label="Carcaca / Corpo">
              <Input value={form.carcaca} onChange={e => set('carcaca', e.target.value)} className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl" placeholder="Código Carcaça" />
            </Field>
            <Field label="Plaqueta de Identificação">
              <Input value={form.plaqueta} onChange={e => set('plaqueta', e.target.value)} className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl" placeholder="Modelo Plaqueta" />
            </Field>
            <Field label="Inserção / Turbina">
              <Input value={form.turbina} onChange={e => set('turbina', e.target.value)} className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl" placeholder="Código Turbina" />
            </Field>
            <Field label="Letra Padrão">
              <Input value={form.letra_produto} onChange={e => set('letra_produto', e.target.value)} className="h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl font-bold uppercase" placeholder="Ex: G" maxLength={1} />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t dark:border-white/5">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-12 px-8 rounded-xl border-slate-200 dark:border-white/10 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="h-12 px-10 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all border-0"
        >
          Efetivar Cadastro
        </Button>
      </div>
    </form>
  );
}

export default function PCPCadastroClientes() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCliente, setEditCliente] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const qc = useQueryClient();
  const { bloqueado, nomeSetor, setorAtivo } = usePCPSetor();
  const isReadonly = useSetorReadonly();

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['pcp-clientes', setorAtivo],
    queryFn: () => {
      if (!setorAtivo || setorAtivo === 'ALL') return rdsn.entities.PCPCliente.list('nome', 500);
      return rdsn.entities.PCPCliente.filter({ setor_id: setorAtivo }, 'nome', 500);
    }
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, setor_id: setorAtivo };
      return editCliente
        ? rdsn.entities.PCPCliente.update(editCliente.id, payload)
        : rdsn.entities.PCPCliente.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pcp-clientes'] });
      setShowForm(false);
      setEditCliente(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => rdsn.entities.PCPCliente.delete(id),
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
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-600 to-indigo-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all hover:scale-105 active:scale-95 group border border-blue-400/20">
                <Users className="w-8 h-8 sm:w-6 sm:h-6 text-white group-hover:rotate-6 transition-transform duration-500" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
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

        <PremiumCard title="Lista de Clientes" icon={Users} iconColor="#3b82f6" noPadding>
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
                      <button onClick={() => handleEdit(c)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {confirmDeleteId === c.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => { deleteMutation.mutate(c.id); setConfirmDeleteId(null); }} className="px-2 py-1 text-[10px] font-black bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                            Confirmar
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 text-[10px] font-black bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition-colors">
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(c.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors shadow-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </PremiumCard>

        <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditCliente(null); } }}>
          <DialogContent className="max-w-xl dark:bg-slate-900/90 dark:border-white/10 rounded-[2.5rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0">
            <div className="bg-gradient-to-br from-blue-900 to-indigo-900 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
              <DialogHeader className="relative z-10">
                <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-300" />
                  </span>
                  {editCliente ? 'Editar' : 'Novo'} <span className="text-blue-300">Cliente</span>
                </DialogTitle>
                <p className="text-xs font-bold text-blue-200/60 uppercase tracking-widest mt-1">
                  Cadastro de Entidade • {nomeSetor}
                </p>
              </DialogHeader>
            </div>

            <div className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <ClienteForm
                cliente={editCliente}
                onSave={handleSave}
                onClose={() => { setShowForm(false); setEditCliente(null); }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PCPSetorGuard>
  );
}