// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock } from "lucide-react";
import { toast } from "sonner";

import ProducaoDiaCard from './ProducaoDiaCard';
import NovaProducaoDiaDialog from './NovaProducaoDiaDialog';

export default function ModoProducaoDia({ reservas, produtos, setorInfo }) {
  const queryClient = useQueryClient();
  const { setorAtivo, isAdmin, currentUser } = useSetor();
  const [showNova, setShowNova] = useState(false);

  const isSupervisor = currentUser?.role_custom === 'Admin' || currentUser?.role_custom === 'Supervisor';

  // Buscar setores
  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: () => rdsn.entities.Setor.list()
  });

  const setorNome = useMemo(() => {
    const setor = setores.find(s => s.id === setorAtivo);
    return setor?.nome || '';
  }, [setores, setorAtivo]);

  // Buscar sessões de produção abertas
  const { data: sessoesAbertas = [], isLoading: loadingSessoes } = useQuery({
    queryKey: ['producao-dia', setorAtivo],
    queryFn: async () => {
      if (!setorAtivo) return [];
      const filtro = isAdmin && setorAtivo === 'ALL'
        ? { status: { $in: ['ABERTA', 'EM_PRODUCAO', 'AGUARDANDO_BAIXA'] } }
        : { status: { $in: ['ABERTA', 'EM_PRODUCAO', 'AGUARDANDO_BAIXA'] }, setor_id: setorAtivo };
      return await rdsn.entities.ProducaoDia.filter(filtro, '-created_at', 20);
    },
    placeholderData: keepPreviousData,
    enabled: !!setorAtivo
  });

  // Buscar lotes das sessões abertas
  const sessaoIds = useMemo(() => sessoesAbertas.map(s => s.id), [sessoesAbertas]);
  const { data: lotesAbertos = [], isLoading: loadingLotes } = useQuery({
    queryKey: ['producao-dia-lotes', sessaoIds],
    queryFn: async () => {
      if (sessaoIds.length === 0) return [];
      const todosLotes = await Promise.all(
        sessaoIds.map(id => rdsn.entities.ProducaoDiaLote.filter({ producao_dia_id: id }))
      );
      return todosLotes.flat();
    },
    enabled: sessaoIds.length > 0,
    placeholderData: keepPreviousData
  });

  // Buscar baixas para sugestão de numeração
  const { data: baixas = [] } = useQuery({
    queryKey: ['baixas-producao-dia'],
    queryFn: () => rdsn.entities.BaixaLote.list('-created_at', 500),
  });

  const baixasPorReserva = useMemo(() => {
    const map = {};
    baixas.forEach(b => {
      if (!map[b.reserva_id]) map[b.reserva_id] = [];
      map[b.reserva_id].push(b);
    });
    return map;
  }, [baixas]);

  // IDs de lotes já em sessões abertas
  const lotesJaAbertosIds = useMemo(() => {
    return lotesAbertos.filter(l => l.status === 'ABERTO').map(l => l.reserva_id);
  }, [lotesAbertos]);

  const lotesAtivos = lotesAbertos.filter(l => l.status === 'ABERTO');

  // Reservas indexadas por ID
  const reservasMap = useMemo(() => {
    const m = {};
    reservas.forEach(r => m[r.id] = r);
    return m;
  }, [reservas]);

  // Mutation: Criar nova sessão + lotes
  const iniciarProducaoMutation = useMutation({
    mutationFn: async (lotes) => {
      const hoje = new Date().toISOString().split('T')[0];

      // Criar sessão
      const sessao = await rdsn.entities.ProducaoDia.create({
        data_producao: hoje,
        usuario_id: currentUser?.id || '',
        usuario_nome: currentUser?.full_name || '',
        setor_id: setorAtivo === 'ALL' ? lotes[0].reserva.setor_id : setorAtivo,
        status: 'ABERTA'
      });

      // Criar lotes na sessão
      await Promise.all(lotes.map(l =>
        rdsn.entities.ProducaoDiaLote.create({
          producao_dia_id: sessao.id,
          reserva_id: l.reserva_id,
          letra_produto: l.reserva.letra_produto,
          codigo_completo: l.reserva.codigo_completo,
          cliente: l.reserva.cliente,
          codigo_produto: l.reserva.codigo_produto,
          modelo: l.reserva.modelo,
          numeracao_inicial: l.numeracao_inicial,
          sequencia_decrescente: l.sequencia_decrescente,
          status: 'ABERTO',
          setor_id: l.reserva.setor_id
        })
      ));

      // Log de auditoria
      await rdsn.entities.Auditoria.create({
        entidade: 'ProducaoDia',
        entidade_id: sessao.id,
        acao: 'RESERVA_CRIADA',
        detalhes: JSON.stringify({
          tipo_evento: 'ABERTURA_PRODUCAO_DIA',
          lotes: lotes.map(l => ({
            reserva_id: l.reserva_id,
            codigo: l.reserva.codigo_completo,
            numeracao_inicial: l.numeracao_inicial
          })),
          operador: currentUser?.full_name
        })
      });

      return sessao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producao-dia'] });
      queryClient.invalidateQueries({ queryKey: ['producao-dia-lotes'] });
      setShowNova(false);
      toast.success('Produção do dia iniciada!');
    },
    onError: (err) => {
      toast.error('Erro ao iniciar produção: ' + err.message);
    }
  });

  // Mutation: Fechar lote (gerar baixa automática)
  const fecharLoteMutation = useMutation({
    mutationFn: async ({ lote, numFinal }) => {
      const reserva = reservasMap[lote.reserva_id];
      if (!reserva) throw new Error('Reserva não encontrada');

      const ini = Number(lote.numeracao_inicial) || 0;
      const fim = Number(numFinal) || 0;
      const quantidade = Math.abs(fim - ini) + 1;
      const numInicialBaixa = Math.min(ini, fim);
      const numFinalBaixa = Math.max(ini, fim);

      // Buscar descrição do produto
      const produtoInfo = produtos.find(p => p.letra_produto === reserva.letra_produto);
      const descricaoItem = produtoInfo?.descricao || '';

      // Criar baixa (mesmo fluxo do sistema atual, com todos os campos)
      const baixa = await rdsn.entities.BaixaLote.create({
        reserva_id: reserva.id,
        numero_inicial: numInicialBaixa,
        numero_final: numFinalBaixa,
        quantidade,
        tipo: 'MANUAL',
        de_setor: '151',
        para_setor: '842',
        local: 'S11',
        local_destino: 'S31',
        setor_producao: setorNome,
        descricao_item: descricaoItem,
        operador: currentUser?.full_name || ''
      });

      // Atualizar reserva
      const novaBaixada = (reserva.quantidade_baixada || 0) + quantidade;
      const novoStatus = novaBaixada >= reserva.quantidade ? 'PRODUZIDO' : 'EM_PRODUCAO';
      await rdsn.entities.ReservaLote.update(reserva.id, {
        quantidade_baixada: novaBaixada,
        status: novoStatus
      });

      // Atualizar estoque
      const produto = produtos.find(p => p.letra_produto === reserva.letra_produto);
      if (produto) {
        const estoqueAnterior = produto.estoque_atual || 0;
        const estoqueNovo = estoqueAnterior + quantidade;
        await rdsn.entities.Produto.update(produto.id, { estoque_atual: estoqueNovo });
        await rdsn.entities.MovimentacaoEstoque.create({
          produto_id: produto.id,
          tipo: 'PRODUCAO',
          quantidade,
          quantidade_anterior: estoqueAnterior,
          quantidade_nova: estoqueNovo,
          referencia_id: baixa.id,
          referencia_tipo: 'BaixaLote',
          observacao: `Produção do dia - Lote ${reserva.codigo_completo}`,
          operador: currentUser?.full_name || ''
        });
      }

      // Atualizar lote da sessão
      await rdsn.entities.ProducaoDiaLote.update(lote.id, {
        numeracao_final: numFinal,
        quantidade_calculada: quantidade,
        status: 'FECHADO',
        baixa_id: baixa.id
      });

      // Auditoria
      await rdsn.entities.Auditoria.create({
        entidade: 'BaixaLote',
        entidade_id: baixa.id,
        acao: 'BAIXA_REGISTRADA',
        letra_produto: reserva.letra_produto,
        ano: reserva.ano,
        numero_inicial: numInicialBaixa,
        numero_final: numFinalBaixa,
        detalhes: JSON.stringify({
          tipo_evento: 'BAIXA_AUTOMATICA_DIA',
          quantidade,
          producao_dia_lote_id: lote.id,
          operador: currentUser?.full_name
        })
      });

      // Verificar se todos os lotes da sessão foram fechados
      const todosLotesSessao = await rdsn.entities.ProducaoDiaLote.filter({ producao_dia_id: lote.producao_dia_id });
      const todosAbertos = todosLotesSessao.filter(l => l.status === 'ABERTO');
      if (todosAbertos.length === 0) {
        await rdsn.entities.ProducaoDia.update(lote.producao_dia_id, {
          status: 'FECHADA',
          closed_at: new Date().toISOString()
        });
        // Auditoria de fechamento
        await rdsn.entities.Auditoria.create({
          entidade: 'ProducaoDia',
          entidade_id: lote.producao_dia_id,
          acao: 'RESERVA_CRIADA',
          detalhes: JSON.stringify({
            tipo_evento: 'FECHAMENTO_PRODUCAO_DIA',
            operador: currentUser?.full_name
          })
        });
      }

      return baixa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producao-dia'] });
      queryClient.invalidateQueries({ queryKey: ['producao-dia-lotes'] });
      queryClient.invalidateQueries({ queryKey: ['reservas-producao'] });
      queryClient.invalidateQueries({ queryKey: ['baixas-producao-dia'] });
      toast.success('Baixa registrada com sucesso!');
    },
    onError: (err) => {
      toast.error('Erro ao fechar: ' + err.message);
    }
  });

  // Fechar lote sem baixa (clicando no X) (apenas supervisor)
  const cancelarLoteMutation = useMutation({
    mutationFn: async (lote) => {
      await rdsn.entities.ProducaoDiaLote.update(lote.id, { status: 'FECHADO' });
      // Verificar se sessão deve fechar
      const todosLotesSessao = await rdsn.entities.ProducaoDiaLote.filter({ producao_dia_id: lote.producao_dia_id });
      const abertos = todosLotesSessao.filter(l => l.status === 'ABERTO' && l.id !== lote.id);
      if (abertos.length === 0) {
        await rdsn.entities.ProducaoDia.update(lote.producao_dia_id, {
          status: 'FECHADA',
          closed_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producao-dia'] });
      queryClient.invalidateQueries({ queryKey: ['producao-dia-lotes'] });
      toast.success('Lote fechado');
    }
  });

  const handleFechar = (lote, numFinal) => {
    fecharLoteMutation.mutate({ lote, numFinal });
  };

  const handleCancelar = (lote) => {
    if (confirm('Tem certeza que deseja cancelar este lote? Esta ação não pode ser desfeita.')) {
      cancelarLoteMutation.mutate(lote);
    }
  };

  const isLoading = loadingSessoes || (sessaoIds.length > 0 && loadingLotes);

  return (
    <div className="space-y-8">
      {/* Header do modo Premium */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-blue-500/5 dark:bg-blue-600/5 p-6 rounded-[2rem] border border-blue-200/50 dark:border-blue-500/10 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <Clock className="w-6 h-6 text-white animate-[pulse_2s_infinite]" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Modo Produção do Dia</h2>
              <Badge className="bg-blue-600 text-white border-0 font-black text-[10px] rounded-full px-2.5">
                {lotesAtivos.length} ATIVOS
              </Badge>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest italic opacity-70">Operação Simplificada • {setorNome || 'Todos Setores'}</p>
          </div>
        </div>
        <Button
          onClick={() => setShowNova(true)}
          className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-[0.2em] gap-3 shadow-xl transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nova Produção
        </Button>
      </div>

      {/* Cards de produção ativa */}
      {isLoading ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-black uppercase text-xs tracking-widest italic animate-pulse">Sincronizando Terminal...</p>
        </div>
      ) : lotesAbertos.length === 0 ? (
        <div className="relative group overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-xl border-2 border-dashed border-slate-200 dark:border-white/5 p-16 text-center transition-all hover:border-blue-500/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.03),transparent)] pointer-events-none" />
          <div className="relative space-y-6">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-950/60 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner group-hover:scale-110 transition-transform">
              <Clock className="w-12 h-12 text-slate-300 dark:text-slate-700" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Nenhuma produção ativa</p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest italic opacity-60">Aguardando abertura de nova sessão operacional</p>
            </div>
            <Button
              onClick={() => setShowNova(true)}
              variant="outline"
              className="rounded-2xl px-8 h-12 border-slate-200 dark:border-white/10 dark:hover:bg-white/5 font-black uppercase text-[10px] tracking-widest"
            >
              Iniciar agora
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {lotesAbertos
            .sort((a, b) => {
              // Abertos primeiro, depois fechados
              if (a.status === 'ABERTO' && b.status !== 'ABERTO') return -1;
              if (a.status !== 'ABERTO' && b.status === 'ABERTO') return 1;
              return 0;
            })
            .map(lote => (
              <ProducaoDiaCard
                key={lote.id}
                lote={lote}
                reserva={reservasMap[lote.reserva_id]}
                setorNome={setorNome}
                onFechar={handleFechar}
                onCancelar={handleCancelar}
                isClosing={fecharLoteMutation.isPending}
                isSupervisor={isSupervisor}
                produtos={produtos}
                setorInfo={setorInfo}
              />
            ))
          }
        </div>
      )}

      {/* Dialog para nova produção */}
      <NovaProducaoDiaDialog
        open={showNova}
        onOpenChange={setShowNova}
        reservas={reservas}
        lotesJaAbertos={lotesJaAbertosIds}
        baixasPorReserva={baixasPorReserva}
        setorNome={setorNome}
        onIniciar={(lotes) => iniciarProducaoMutation.mutate(lotes)}
        isLoading={iniciarProducaoMutation.isPending}
        produtos={produtos}
        setorInfo={setorInfo}
      />
    </div>
  );
}