// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { Plus, Lock, Unlock, Calendar, Hash } from 'lucide-react';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function Sequencias() {
  const queryClient = useQueryClient();
  const { setorAtivo, isAdmin } = useSetor();
  const [showForm, setShowForm] = useState(false);
  const [showEncerrar, setShowEncerrar] = useState(false);
  const [selectedSeq, setSelectedSeq] = useState(null);
  const [formData, setFormData] = useState({
    letra_produto: '',
    ano: new Date().getFullYear() % 100 + 1
  });

  const { data: sequencias = [], isLoading } = useQuery({
    queryKey: ['sequencias', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.SequenciaAnual.list('-ano');
      }
      return await rdsn.entities.SequenciaAnual.filter({ setor_id: setorAtivo }, '-ano');
    },
    enabled: !!setorAtivo
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.Produto.list();
      }
      return await rdsn.entities.Produto.filter({ setor_id: setorAtivo });
    },
    enabled: !!setorAtivo
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const existe = sequencias.find(
        s => s.letra_produto === data.letra_produto && s.ano === data.ano && s.setor_id === setorAtivo
      );

      if (existe) {
        throw new Error('Já existe uma sequência para esta letra e ano neste setor');
      }

      const seq = await rdsn.entities.SequenciaAnual.create({
        ...data,
        ordem_baixa: 'normal',
        ativo: true,
        nome_cliente: '',
        setor_id: setorAtivo,
        ultimo_numero: 0,
        encerrado: false
      });

      await rdsn.entities.Auditoria.create({
        entidade: 'SequenciaAnual',
        entidade_id: seq.id,
        acao: 'SEQUENCIA_CRIADA',
        letra_produto: data.letra_produto,
        ano: data.ano,
        numero_inicial: 1,
        numero_final: 0,
        detalhes: JSON.stringify({ ano: data.ano, setor_id: setorAtivo })
      });

      return seq;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequencias'] });
      setShowForm(false);
      setFormData({
        letra_produto: '',
        ano: new Date().getFullYear() % 100 + 1
      });
      toast.success('Sequência criada!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const encerrarMutation = useMutation({
    mutationFn: async (seq) => {
      await rdsn.entities.SequenciaAnual.update(seq.id, { encerrado: true });

      await rdsn.entities.Auditoria.create({
        entidade: 'SequenciaAnual',
        entidade_id: seq.id,
        acao: 'ANO_ENCERRADO',
        letra_produto: seq.letra_produto,
        ano: seq.ano,
        numero_inicial: 1,
        numero_final: seq.ultimo_numero,
        detalhes: JSON.stringify({ ultimo_numero: seq.ultimo_numero })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequencias'] });
      setShowEncerrar(false);
      setSelectedSeq(null);
      toast.success('Ano encerrado com sucesso!');
    }
  });

  const letras = [...new Set(produtos.map(p => p.letra_produto))];
  const sequenciasPorAno = sequencias.reduce((acc, s) => {
    if (!acc[s.ano]) acc[s.ano] = [];
    acc[s.ano].push(s);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(244,63,94,0.15),transparent)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-14 sm:h-14 bg-gradient-to-br from-rose-600 to-pink-500 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.4)] transition-all hover:scale-105 active:scale-95 group border border-rose-400/20">
                <Hash className="w-8 h-8 sm:w-6 sm:h-6 text-white group-hover:rotate-12 transition-transform duration-500" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Controle de <span className="text-rose-600 dark:text-rose-400">Sequências</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                  Gestão Serial • Histórico Anual • Numeração
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 w-full xl:w-auto items-center">
              <div className="h-14 px-6 rounded-2xl bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center gap-4 shadow-xl shadow-black/5">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Última Ref</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white italic tracking-tight">{new Date().getFullYear()}</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                  <Calendar className="w-5 h-5 text-rose-600" />
                </div>
              </div>

              <Button
                onClick={() => setShowForm(true)}
                className="h-14 px-10 rounded-2xl bg-slate-900 dark:bg-rose-600 text-white font-black uppercase text-[10px] tracking-[0.2em] italic gap-3 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all border-b-4 border-rose-800"
              >
                <Plus className="w-5 h-5" /> Nova Sequência
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <PremiumCard title="Séries Cadastradas" icon={Hash} className="bg-rose-600/5">
            <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">{sequencias.length}</h3>
          </PremiumCard>

          <PremiumCard title="Anos em Gestão" icon={Calendar} className="bg-pink-600/5">
            <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">{Object.keys(sequenciasPorAno).length}</h3>
          </PremiumCard>

          <PremiumCard title="Séries Ativas" icon={Unlock} className="bg-emerald-600/5">
            <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">{sequencias.filter(s => !s.encerrado).length}</h3>
          </PremiumCard>
        </div>

        {/* Anos */}
        {isLoading ? (
          <div className="text-center py-8 text-slate-500">Carregando...</div>
        ) : Object.keys(sequenciasPorAno).length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="p-8 text-center text-slate-500">
              Nenhuma sequência cadastrada
            </CardContent>
          </Card>
        ) : (
          Object.entries(sequenciasPorAno)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([ano, seqs]) => (
              <PremiumCard
                key={ano}
                title={`Ciclo Operacional 20${ano}`}
                icon={Calendar}
                className="mb-12"
                noPadding
                badge={<Badge className="bg-slate-950 dark:bg-white text-white dark:text-slate-900 font-black text-[10px] px-3 py-1 rounded-full italic uppercase tracking-widest leading-none">REF_ANNUAL_{ano}</Badge>}
              >
                <div className="divide-y divide-slate-100 dark:divide-slate-800/20">
                  {seqs.map(seq => (
                    <div key={seq.id} className="flex flex-col sm:flex-row items-center justify-between p-8 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group relative gap-8 sm:gap-4">
                      <div className="absolute top-0 left-0 w-1.5 h-0 group-hover:h-full transition-all duration-300 bg-rose-600" />
                      <div className="flex items-center gap-8 w-full sm:w-auto">
                        <div className="w-16 h-16 bg-slate-950 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-xl transition-transform group-hover:rotate-6 active:scale-95 cursor-default select-none border-t border-white/20">
                          {seq.letra_produto}
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-slate-900 dark:text-white text-xl tracking-tighter uppercase italic">{seq.letra_produto} — SERIE 20{seq.ano}</span>
                            {seq.encerrado ? (
                              <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-black text-[9px] px-2.5 py-0.5 rounded-full border-0 uppercase tracking-widest gap-1.5 shadow-sm">
                                <Lock className="w-3 h-3" />
                                Encerrado
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500 text-white font-black text-[9px] px-2.5 py-0.5 rounded-full border-0 uppercase tracking-widest gap-1.5 shadow-lg shadow-emerald-500/20">
                                <Unlock className="w-3 h-3" />
                                Ativo
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest italic opacity-70">
                            <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Ponto de Controle: {seq.ultimo_numero?.toLocaleString() || 0}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                            <span>Alocação Linear Disponível</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 w-full sm:w-auto justify-end">
                        <div className="text-right hidden md:block">
                          <p className="text-3xl font-black text-slate-900 dark:text-white leading-none italic tracking-tighter">#{seq.ultimo_numero?.toLocaleString() || 0}</p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest italic mt-1.5 opacity-60">Última Baixa Sincronizada</p>
                        </div>

                        {!seq.encerrado && (
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => {
                              setSelectedSeq(seq);
                              setShowEncerrar(true);
                            }}
                            className="h-14 px-8 rounded-2xl text-rose-600 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-black uppercase text-[10px] tracking-widest italic gap-2 transition-all active:scale-95 shadow-xl shadow-rose-500/5"
                          >
                            <Lock className="w-4 h-4 mr-1" />
                            Encerrar Ciclo
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </PremiumCard>
            ))
        )}

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-xl dark:bg-slate-900/90 dark:border-white/10 rounded-[2.5rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0">
            <div className="bg-gradient-to-br from-rose-600 to-pink-700 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
              <DialogHeader className="relative z-10">
                <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-rose-200" />
                  </span>
                  Nova <span className="text-rose-200">Sequência</span>
                </DialogTitle>
                <p className="text-[10px] font-black text-rose-100/60 uppercase tracking-[0.2em] mt-2 italic">
                  Injeção de Serial • Ciclo de Produção
                </p>
              </DialogHeader>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                ...formData,
                ano: Number(formData.ano)
              });
            }} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 ml-1">
                    <Plus className="w-3 h-3" /> Letra do Produto
                  </Label>
                  <Select
                    value={formData.letra_produto}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, letra_produto: v }))}
                  >
                    <SelectTrigger className="h-14 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl font-black uppercase tracking-widest px-6">
                      <SelectValue placeholder="SELECIONE" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-white/10 rounded-xl">
                      {letras.map(letra => (
                        <SelectItem key={letra} value={letra} className="font-black uppercase tracking-widest">{letra}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 ml-1">
                    <Calendar className="w-3 h-3" /> Ano de Referência
                  </Label>
                  <div className="relative group">
                    <Input
                      type="number"
                      min="24"
                      max="99"
                      value={formData.ano}
                      onChange={(e) => setFormData(prev => ({ ...prev, ano: e.target.value }))}
                      placeholder="27"
                      className="h-14 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl font-black px-6 text-lg"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 uppercase tracking-tighter pointer-events-none">FUTURO</div>
                  </div>
                </div>
              </div>

              <div className="bg-rose-600/5 p-6 rounded-3xl border border-rose-600/10 flex gap-4 items-start relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-rose-600" />
                <Hash className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 group-hover:rotate-12 transition-transform" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest leading-none">Ponto de Partida Linear</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic leading-relaxed mt-1">
                    A nova sequência iniciará em <b>000001</b>. Certifique-se de que a letra <b>{formData.letra_produto || '?'}</b> já não possua um monitor ativo no ano <b>20{formData.ano || '??'}</b>.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1 h-14 rounded-2xl border-slate-200 dark:border-white/10 uppercase font-black text-[10px] tracking-[0.2em] transition-all">
                  Descartar
                </Button>
                <Button type="submit" className="flex-[1.5] h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-rose-600/20 transition-all active:scale-95 border-0">
                  Ativar Sequenciamento
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Encerrar Dialog */}
        <AlertDialog open={showEncerrar} onOpenChange={setShowEncerrar}>
          <AlertDialogContent className="max-w-md dark:bg-slate-900 border-0 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
            <div className="bg-rose-600 p-8 text-white text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <Lock className="w-12 h-12 text-white/40 mx-auto mb-4" />
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-white">Encerrar Ciclo?</AlertDialogTitle>
                <AlertDialogDescription className="text-rose-100/60 text-xs font-bold uppercase tracking-widest mt-1">
                  Ano: {selectedSeq?.letra_produto}20{selectedSeq?.ano}
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>

            <div className="p-8">
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center italic font-medium leading-relaxed">
                Esta ação bloqueará <strong>permanentemente</strong> novas alocações para este lote anual. Confirma o congelamento da numeração em <span className="text-rose-600 font-bold">#{selectedSeq?.ultimo_numero?.toLocaleString()}</span>?
              </p>

              <div className="flex gap-4 mt-8">
                <AlertDialogCancel className="flex-1 h-12 rounded-xl border-slate-200 dark:border-white/10 font-bold uppercase text-[10px] tracking-widest">Abortar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => encerrarMutation.mutate(selectedSeq)}
                  className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest border-0 shadow-lg shadow-rose-600/20"
                >
                  Sim, Encerrar
                </AlertDialogAction>
              </div>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}