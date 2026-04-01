// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { ScanLine, Package, CalendarDays, Activity, X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
// Label removed (unused)
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import StatusBadge from '../components/dashboard/StatusBadge';
import BaixaForm from '../components/baixas/BaixaForm';
import FiltroProducaoAvancado from '../components/producao/FiltroProducaoAvancado';
import ModoProducaoDia from '../components/producao/ModoProducaoDia';
import { formatarNumeracao, extrairPrefixo } from '../components/formatacao/FormatacaoNumeracao';
import SetorReadonlyBanner, { useSetorReadonly } from '@/components/pcp/SetorReadonlyBanner';

export default function Producao() {
  const queryClient = useQueryClient();
  const { setorAtivo, isAdmin } = useSetor();
  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: async () => await rdsn.entities.Setor.list()
  });

  const setorInfo = useMemo(() => {
    if (!setorAtivo || setorAtivo === 'ALL') return null;
    return setores.find(s => s.id === setorAtivo);
  }, [setores, setorAtivo]);

  const isReadonly = useSetorReadonly();
  const navigate = useNavigate();
  const [modoProducaoDia, setModoProducaoDia] = useState(() => {
    return localStorage.getItem('modoProducaoDia') === 'true';
  });
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [showBaixa, setShowBaixa] = useState(false);
  const [filters, setFilters] = useState({
    cliente: '',
    codigoProduto: '',
    modelo: '',
    status: '',
    dataInicio: '',
    dataFim: ''
  });

  const { data: reservas = [], isLoading } = useQuery({
    queryKey: ['reservas-producao', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.ReservaLote.filter(
          { status: { $in: ['RESERVADO', 'EM_PRODUCAO'] } },
          '-created_at',
          100
        );
      }
      return await rdsn.entities.ReservaLote.filter(
        { status: { $in: ['RESERVADO', 'EM_PRODUCAO'] }, setor_id: setorAtivo },
        '-created_at',
        100
      );
    },
    placeholderData: keepPreviousData,
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

  const createBaixaMutation = useMutation({
    mutationFn: async (data) => {
      const baixa = await rdsn.entities.BaixaLote.create(data);

      const reserva = reservas.find((r) => r.id === data.reserva_id);
      const novaBaixada = (reserva.quantidade_baixada || 0) + data.quantidade;
      const novoStatus = novaBaixada >= reserva.quantidade ? 'PRODUZIDO' : 'EM_PRODUCAO';

      await rdsn.entities.ReservaLote.update(data.reserva_id, {
        quantidade_baixada: novaBaixada,
        status: novoStatus
      });

      // Atualizar estoque se houver produto associado
      const produto = produtos.find((p) => p.letra_produto === reserva.letra_produto);
      if (produto) {
        const estoqueAnterior = produto.estoque_atual || 0;
        const estoqueNovo = estoqueAnterior + data.quantidade;

        await rdsn.entities.Produto.update(produto.id, {
          estoque_atual: estoqueNovo
        });

        // Registrar movimentação
        await rdsn.entities.MovimentacaoEstoque.create({
          produto_id: produto.id,
          tipo: 'PRODUCAO',
          quantidade: data.quantidade,
          quantidade_anterior: estoqueAnterior,
          quantidade_nova: estoqueNovo,
          referencia_id: baixa.id,
          referencia_tipo: 'BaixaLote',
          observacao: `Baixa de lote ${reserva.codigo_completo}`,
          celula: data.celula || '',
          operador: data.operador || ''
        });
      }

      await rdsn.entities.Auditoria.create({
        entidade: 'BaixaLote',
        entidade_id: baixa.id,
        acao: 'BAIXA_REGISTRADA',
        letra_produto: reserva.letra_produto,
        ano: reserva.ano,
        numero_inicial: data.numero_inicial,
        numero_final: data.numero_final,
        detalhes: JSON.stringify({ quantidade: data.quantidade, tipo: data.tipo })
      });

      return baixa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas-producao'] });
      setShowBaixa(false);
      setSelectedReserva(null);
      toast.success('Baixa registrada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar baixa: ' + error.message);
    }
  });

  const stats = useMemo(() => {
    const emProducao = reservas.filter((r) => r.status === 'EM_PRODUCAO');
    const reservados = reservas.filter((r) => r.status === 'RESERVADO');
    const totalPendente = reservas.reduce((acc, r) => acc + ((r.quantidade || 0) - (r.quantidade_baixada || 0)), 0);

    return {
      emProducao: emProducao.length,
      reservados: reservados.length,
      totalPendente
    };
  }, [reservas]);

  const reservasFiltradas = useMemo(() => {
    let result = [...reservas];

    if (filters.cliente) {
      const search = filters.cliente.toLowerCase();
      result = result.filter((r) => r.cliente?.toLowerCase().includes(search));
    }

    if (filters.codigoProduto) {
      const search = filters.codigoProduto.toLowerCase();
      result = result.filter((r) => r.codigo_produto?.toLowerCase().includes(search));
    }

    if (filters.modelo) {
      const search = filters.modelo.toLowerCase();
      result = result.filter((r) => r.modelo?.toLowerCase().includes(search));
    }

    if (filters.status) {
      result = result.filter((r) => r.status === filters.status);
    }

    if (filters.dataInicio) {
      const dataInicio = new Date(filters.dataInicio);
      result = result.filter((r) => new Date(r.created_at) >= dataInicio);
    }

    if (filters.dataFim) {
      const dataFim = new Date(filters.dataFim);
      dataFim.setHours(23, 59, 59, 999);
      result = result.filter((r) => new Date(r.created_at) <= dataFim);
    }

    // Agrupamento Lógico Contínuo (Plano de Sequência)
    const gruposEmProducao = new Set(
      reservas.filter(r => r.status === 'EM_PRODUCAO').map(r => `${r.cliente || ''}-${r.codigo_completo}`)
    );

    const gruposMap = new Map();
    result.forEach(r => {
      // Criamos a chave única que define o que é uma "Sequência do mesmo cliente e produto"
      const key = `${r.cliente || ''}-${r.codigo_completo}-${r.codigo_produto || ''}`;
      if (!gruposMap.has(key)) {
        gruposMap.set(key, {
          key,
          cliente: r.cliente || '',
          prefixo: r.codigo_completo,
          // Se qualqer item da familia geral do cliente/prefixo estiver em produção na base inteira, prioriza
          temProducao: gruposEmProducao.has(`${r.cliente || ''}-${r.codigo_completo}`),
          itens: []
        });
      }
      gruposMap.get(key).itens.push(r);
    });

    const gruposArray = Array.from(gruposMap.values());

    // 1. Grupos que têm itens já em produção vêm primeiro, depois ordem alfabética Cliente > Prefixo
    gruposArray.sort((a, b) => {
      if (a.temProducao && !b.temProducao) return -1;
      if (!a.temProducao && b.temProducao) return 1;

      if (a.cliente < b.cliente) return -1;
      if (a.cliente > b.cliente) return 1;

      if (a.prefixo < b.prefixo) return -1;
      if (a.prefixo > b.prefixo) return 1;

      return 0;
    });

    // Combina e ordena os itens internamente
    const flattenedResult = [];
    const coresDisponiveis = [
      { bg: "bg-emerald-500 text-white", shadow: "shadow-emerald-500/40", ring: "ring-emerald-500/20" },
      { bg: "bg-blue-500 text-white", shadow: "shadow-blue-500/40", ring: "ring-blue-500/20" },
      { bg: "bg-purple-500 text-white", shadow: "shadow-purple-500/40", ring: "ring-purple-500/20" },
      { bg: "bg-amber-500 text-white", shadow: "shadow-amber-500/40", ring: "ring-amber-500/20" },
      { bg: "bg-pink-500 text-white", shadow: "shadow-pink-500/40", ring: "ring-pink-500/20" },
      { bg: "bg-teal-500 text-white", shadow: "shadow-teal-500/40", ring: "ring-teal-500/20" },
      { bg: "bg-orange-500 text-white", shadow: "shadow-orange-500/40", ring: "ring-orange-500/20" },
    ];

    let colorIndex = 0;
    gruposArray.forEach(g => {
      const colorData = coresDisponiveis[colorIndex % coresDisponiveis.length];
      colorIndex++;

      // Ordena itens do grupo
      g.itens.sort((a, b) => {
        if (a.status === 'EM_PRODUCAO' && b.status !== 'EM_PRODUCAO') return -1;
        if (a.status !== 'EM_PRODUCAO' && b.status === 'EM_PRODUCAO') return 1;

        const isDesc = (produtos.find(p => p.codigo_produto === a.codigo_produto) ||
          produtos.find(p => p.letra_produto === a.letra_produto && !p.codigo_produto))?.ordem_baixa === 'decrescente';

        if (isDesc) return b.numero_final - a.numero_final;
        return a.numero_inicial - b.numero_inicial;
      });

      // Adiciona metadados de UI nos itens
      g.itens.forEach((item, innerIdx) => {
        flattenedResult.push({
          ...item,
          _uiSeqIndex: innerIdx + 1,
          _uiColor: colorData,
          _uiIsFirstOfGroup: innerIdx === 0
        });
      });
    });

    return flattenedResult;
  }, [reservas, filters, produtos]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        <SetorReadonlyBanner />
        {/* Header */}
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(37,99,235,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-indigo-400 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all hover:scale-105 active:scale-95 group cursor-pointer">
                <ScanLine className="w-8 h-8 sm:w-10 sm:h-10 text-white group-hover:rotate-12 transition-transform" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Fluxo de <span className="text-blue-600 dark:text-blue-400">Produção</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80">Industrial Control Hub • Tempo Real</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <div className="flex bg-slate-100 dark:bg-slate-950/60 p-1.5 rounded-[1.5rem] border border-slate-200 dark:border-white/10 backdrop-blur-xl">
                <button
                  onClick={() => { setModoProducaoDia(false); localStorage.setItem('modoProducaoDia', 'false'); }}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                    !modoProducaoDia
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xl transform scale-[1.02]"
                      : "text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                  )}
                >
                  <ScanLine className="w-3.5 h-3.5" />
                  Operação Global
                </button>
                <button
                  onClick={() => { setModoProducaoDia(true); localStorage.setItem('modoProducaoDia', 'true'); }}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                    modoProducaoDia
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 transform scale-[1.02]"
                      : "text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                  )}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  Meta do Dia
                </button>
              </div>
              <Button
                onClick={() => navigate(createPageUrl('Baixas'))}
                className="h-14 px-8 rounded-[1.5rem] bg-slate-950 dark:bg-blue-600 text-white font-black uppercase text-[10px] tracking-[0.2em] gap-3 shadow-2xl transition-all hover:scale-[1.02] active:scale-95 border-0"
              >
                <Activity className="w-4 h-4" />
                Histórico
              </Button>
            </div>
          </div>
        </div>

        {modoProducaoDia ? (
          /* === MODO PRODUÇÃO DO DIA === */
          <ModoProducaoDia reservas={reservas} produtos={produtos} setorInfo={setorInfo} />
        ) : (
          /* === MODO NORMAL === */
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <PremiumCard title="Em Produção" icon={ScanLine} className="bg-blue-600/5">
                <h3 className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">{stats.emProducao}</h3>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic opacity-60 mt-2">lotes ativos na fila</p>
              </PremiumCard>

              <PremiumCard title="Reservados" icon={Package} className="bg-amber-600/5">
                <h3 className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">{stats.reservados}</h3>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic opacity-60 mt-2">lotes aguardando início</p>
              </PremiumCard>

              <PremiumCard title="Total Pendente" icon={Activity} className="bg-emerald-600/5">
                <h3 className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">{stats.totalPendente.toLocaleString()}</h3>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic opacity-60 mt-2">unidades a coletar</p>
              </PremiumCard>
            </div>

            <PremiumCard title="Fila Industrial de Lotes" icon={ScanLine} noPadding>
              <div className="bg-slate-50/50 dark:bg-slate-950/30 p-4 border-b border-slate-200 dark:border-white/5">
                <FiltroProducaoAvancado
                  filters={filters}
                  setFilters={setFilters}
                  reservas={reservas}
                  onClear={() => setFilters({
                    cliente: '',
                    codigoProduto: '',
                    modelo: '',
                    status: '',
                    dataInicio: '',
                    dataFim: ''
                  })} />
              </div>
              {isLoading ?
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">Carregando...</div> :
                reservas.length === 0 ?
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400">Nenhum lote disponível</div> :
                  reservasFiltradas.length === 0 ?
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">Nenhum lote encontrado com os filtros aplicados</div> :

                    <div className="divide-y divide-slate-100 dark:divide-slate-800/10">
                      {reservasFiltradas.map((reserva) => {
                        const restante = (reserva.quantidade || 0) - (reserva.quantidade_baixada || 0);
                        const progresso = reserva.quantidade > 0 ?
                          Math.round((reserva.quantidade_baixada || 0) / reserva.quantidade * 100) :
                          0;

                        return (
                          <React.Fragment key={reserva.id}>
                            {reserva._uiIsFirstOfGroup && (
                              <div className="h-1 w-full bg-slate-100 dark:bg-slate-800/10" />
                            )}
                            <div className="flex relative items-stretch border-b border-slate-100 dark:border-slate-800/10 last:border-0 hover:bg-slate-50 dark:hover:bg-blue-600/5 group">
                              <div className="w-12 sm:w-16 flex-shrink-0 flex flex-col items-center pt-10 sm:pt-14 border-r border-slate-100 dark:border-transparent z-10 transition-colors">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-lg transition-all",
                                  reserva._uiSeqIndex === 1
                                    ? `${reserva._uiColor.bg} ${reserva._uiColor.shadow} ${reserva._uiColor.ring} ring-4 z-20 scale-110`
                                    : reserva._uiSeqIndex <= 3
                                      ? `${reserva._uiColor.bg} ${reserva._uiColor.shadow} z-10`
                                      : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                                )}>
                                  {reserva._uiSeqIndex}º
                                </div>
                              </div>

                              <div className="flex-1 p-6 sm:p-10 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1.5 h-0 group-hover:h-full bg-blue-600 transition-all duration-500" />
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                                  <div className="flex items-start gap-8 flex-1">
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-950 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] flex items-center justify-center font-black text-4xl shadow-2xl transition-all group-hover:rotate-6 group-hover:scale-110">
                                      {reserva.codigo_completo?.substring(0, 1)}
                                    </div>

                                    <div className="flex-1 space-y-5 min-w-0">
                                      <div className="flex flex-wrap items-center gap-4">
                                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none truncate uppercase italic">
                                          {reserva.modelo}
                                        </span>
                                        <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 border-0 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase px-3 py-1 rounded-full tracking-widest">
                                          {reserva.codigo_produto}
                                        </Badge>
                                        <StatusBadge status={reserva.status} />
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Cliente de Destino</p>
                                          <p className="text-lg font-bold text-slate-700 dark:text-slate-300 truncate uppercase tracking-tight">
                                            {reserva.cliente || 'OCASIONAL'}
                                          </p>
                                        </div>

                                        <div className="space-y-1.5">
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Range de Identificação</p>
                                          <div className="flex items-center gap-3">
                                            <div className="px-3 py-1 bg-slate-100 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-white/5">
                                              <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                                                {reserva.codigo_completo}{formatarNumeracao(reserva.numero_inicial, extrairPrefixo(reserva.codigo_completo), setorAtivo)} - {reserva.codigo_completo}{formatarNumeracao(reserva.numero_final, extrairPrefixo(reserva.codigo_completo), setorAtivo)}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-10 lg:gap-16 shrink-0">
                                    <div className="space-y-4">
                                      <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic leading-none">Fluxo de Entrega</span>
                                        <span className="text-2xl font-black text-blue-500 italic tracking-tighter">{progresso}%</span>
                                      </div>
                                      <div className="h-3 w-48 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                                        <div
                                          className="h-full bg-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                                          style={{ width: `${progresso}%` }} />
                                      </div>
                                      <p className="text-[10px] font-black text-center text-slate-500 dark:text-slate-400 uppercase tracking-widest opacity-60">
                                        {(reserva.quantidade_baixada || 0).toLocaleString()} / {reserva.quantidade?.toLocaleString()} UNIDADES
                                      </p>
                                    </div>

                                    <div className="text-right space-y-1.5">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic leading-none">A Produzir</span>
                                      <p className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none italic">{restante.toLocaleString()}</p>
                                    </div>

                                    <div className="flex flex-col gap-3 min-w-[140px]">
                                      {(() => {
                                        const prod = produtos.find(p => p.codigo_produto === reserva.codigo_produto);
                                        const isInvertida = reserva.sequencia_decrescente ?? (prod?.ordem_numeracao === 'DECRESCENTE' || setorInfo?.sequencia_decrescente);
                                        return (
                                          <>
                                            {isInvertida && (
                                              <Badge className="bg-indigo-500/10 text-indigo-500 border-0 font-black text-[9px] uppercase tracking-widest py-1.5 justify-center rounded-xl">
                                                Ordem Decrescente
                                              </Badge>
                                            )}
                                            <Button
                                              onClick={() => {
                                                setSelectedReserva(reserva);
                                                setShowBaixa(true);
                                              }}
                                              disabled={isReadonly}
                                              className="h-14 px-8 rounded-2xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/10 transition-all active:scale-95 disabled:grayscale"
                                            >
                                              <ScanLine className="w-5 h-5 mr-3" />
                                              Coletar Baixa
                                            </Button>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
              }
            </PremiumCard>

            {/* Baixa Dialog Premium Industrial */}
            <Dialog open={showBaixa} onOpenChange={setShowBaixa}>
              <DialogContent className="max-w-5xl h-[95vh] flex flex-col p-0 overflow-hidden border-0 bg-white dark:bg-slate-950 rounded-none sm:rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,0.5)]">

                {/* Header Industrial */}
                <div className="relative bg-slate-950 px-10 py-8 shrink-0 overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] -mr-32 -mt-32" />

                  <DialogHeader className="relative z-10">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <ScanLine className="w-6 h-6 text-white" />
                      </div>
                      <DialogTitle className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">
                        Consumo de <span className="text-blue-500">Numerários</span>
                      </DialogTitle>
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 italic">
                      Terminal de Coleta • Lote {selectedReserva?.codigo_completo}
                    </p>
                  </DialogHeader>

                  <Button
                    variant="ghost"
                    onClick={() => setShowBaixa(false)}
                    className="absolute top-8 right-8 text-slate-500 hover:text-white hover:bg-white/10 rounded-full w-12 h-12 p-0 transition-all"
                  >
                    <X className="w-8 h-8" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                  <div className="p-6 sm:p-10">
                    {selectedReserva && (
                      <BaixaForm
                        reserva={selectedReserva}
                        setorInfo={setorInfo}
                        onSubmit={(data) => createBaixaMutation.mutate(data)}
                        isLoading={createBaixaMutation.isPending}
                        onCancel={() => {
                          setShowBaixa(false);
                          setSelectedReserva(null);
                        }}
                      />
                    )}
                  </div>
                </div>

                <div className="px-10 py-4 shrink-0 bg-slate-50 dark:bg-black/40 border-t border-slate-100 dark:border-white/5 flex items-center justify-center gap-2 opacity-30">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Sistema de Rastreabilidade RDSN Ativo</span>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}