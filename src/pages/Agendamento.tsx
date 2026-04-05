// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Factory, Package, Clock, ChevronLeft, ChevronRight, BarChart3, AlertTriangle, LineChart, Target } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import PeriodAnalysis from '@/components/agendamento/PeriodAnalysis';
import PCPDoDia from '@/components/agendamento/PCPDoDia';



export default function Agendamento() {
  const queryClient = useQueryClient();
  const { setorAtivo, isAdmin } = useSetor();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [viewMode, setViewMode] = useState('week');
  const [selectedDay, setSelectedDay] = useState(new Date());

  // --- PCP INTEGRATION QUERIES ---
  const { data: pcpOps = [] } = useQuery({
    queryKey: ['pcp-ops-agendamento', setorAtivo],
    queryFn: async () => {
      if (!setorAtivo || setorAtivo === 'ALL') {
        return rdsn.entities.PCPOrdemProducao.filter({ status: 'Ativo' });
      }
      return rdsn.entities.PCPOrdemProducao.filter({ status: 'Ativo', setor_id: setorAtivo });
    },
    enabled: !!setorAtivo
  });

  const { data: pcpProducoes = [] } = useQuery({
    queryKey: ['pcp-producoes-agendamento', setorAtivo],
    queryFn: async () => {
      if (!setorAtivo || setorAtivo === 'ALL') {
        return rdsn.entities.PCPProducaoDiaria.list(null, 5000);
      }
      return rdsn.entities.PCPProducaoDiaria.filter({ setor_id: setorAtivo }, null, 5000);
    },
    enabled: pcpOps.length > 0
  });

  // Fetch all reservas (including filtered ones) for PeriodAnalysis
  const { data: todasReservas = [] } = useQuery({
    queryKey: ['todasReservas', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.ReservaLote.list();
      }
      return await rdsn.entities.ReservaLote.filter({ setor_id: setorAtivo });
    },
    enabled: !!setorAtivo
  });

  const { data: reservas = [] } = useQuery({
    queryKey: ['reservas', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        const todas = await rdsn.entities.ReservaLote.list();
        return todas.filter(r => ['RESERVADO', 'EM_PRODUCAO'].includes(r.status));
      }
      const todas = await rdsn.entities.ReservaLote.filter({ setor_id: setorAtivo });
      return todas.filter(r => ['RESERVADO', 'EM_PRODUCAO'].includes(r.status));
    },
    enabled: !!setorAtivo
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      try {
        if (isAdmin && setorAtivo === 'ALL') {
          return await rdsn.entities.Produto.list();
        }
        return await rdsn.entities.Produto.filter({ setor_id: setorAtivo });
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        return [];
      }
    },
    enabled: !!setorAtivo
  });

  const updateReservaMutation = useMutation({
    mutationFn: ({ id, data }) => rdsn.entities.ReservaLote.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      toast.success('Agendamento atualizado!');
    }
  });

  const { data: pcpClientes = [] } = useQuery({
    queryKey: ['pcp-clientes-agendamento', setorAtivo],
    queryFn: () => {
      if (!setorAtivo || setorAtivo === 'ALL') {
        return rdsn.entities.PCPCliente.list('nome', 500);
      }
      return rdsn.entities.PCPCliente.filter({ setor_id: setorAtivo }, 'nome', 500);
    },
    enabled: !!setorAtivo
  });

  const clienteMap = useMemo(() => {
    const m = {};
    for (const c of pcpClientes) m[c.id] = c;
    return m;
  }, [pcpClientes]);

  const updatePCPProducaoMutation = useMutation({
    mutationFn: async ({ id, data }) => rdsn.entities.PCPProducaoDiaria.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcp-producoes-agendamento'] });
      toast.success('Programação PCP atualizada!');
    }
  });

  useEffect(() => {
    const unsubscribeRes = rdsn.entities.ReservaLote.subscribe((_event) => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
    });
    const unsubscribePcp = rdsn.entities.PCPProducaoDiaria.subscribe((_event) => {
      queryClient.invalidateQueries({ queryKey: ['pcp-producoes-agendamento'] });
    });
    return () => {
      unsubscribeRes();
      unsubscribePcp();
    };
  }, [queryClient]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // --- TRANSFORMAR PCP PRODUCAO EM CARDS ---
  const getCardsPCP = () => {
    return pcpProducoes
      .filter(p => p.previsto > 0)
      .map(p => {
        const op = pcpOps.find(o => o.id === p.op_id);
        if (!op) return null;

        // Criar estrutura compatível com ReservaCard
        return {
          id: `PCP-${p.id}`,
          isPCP: true,
          pcpId: p.id,
          codigo_completo: op.codigo_op,
          cliente: op.cliente_nome,
          cliente_id: op.cliente_id,
          descricao: op.descricao,
          item_num: op.item_num,
          quantidade: p.previsto,
          quantidade_baixada: p.realizado || 0,
          status: p.realizado >= p.previsto ? 'CONCLUIDO' : p.realizado > 0 ? 'EM_PRODUCAO' : 'RESERVADO',
          data_prevista: new Date(p.ano + 2000, p.mes - 1, p.dia).toISOString(),
          letra_produto: op.letra_produto
        };
      })
      .filter(Boolean);
  };

  const getReservasPorData = (date) => {
    const d = reservas.filter(r => {
      if (!r.data_prevista) return false;
      return isSameDay(new Date(r.data_prevista), date);
    });

    const pcp = getCardsPCP().filter(c => isSameDay(new Date(c.data_prevista), date));

    return [...d, ...pcp];
  };

  const getReservasSemData = () => {
    return reservas.filter(r => !r.data_prevista);
  };

  const getCelulasUnicas = () => {
    const celulas = new Set();
    produtos.forEach(p => {
      if (p.celulas_permitidas) {
        p.celulas_permitidas.forEach(c => celulas.add(c));
      }
    });
    return Array.from(celulas);
  };

  const getReservasPorCelula = (celula) => {
    const res = reservas.filter(r => {
      const produto = produtos.find(p => p.letra_produto === r.letra_produto);
      return produto?.celulas_permitidas?.includes(celula);
    });

    const pcp = getCardsPCP().filter(c => {
      const op = pcpOps.find(o => o.codigo_op === c.codigo_completo);
      return op?.celula === celula; // Se o PCP tiver info de célula
    });

    return [...res, ...pcp];
  };

  const getCargaCelula = (celula) => {
    const reservasCelula = getReservasPorCelula(celula);
    const totalUnidades = reservasCelula.reduce((sum, r) => sum + (r.quantidade - (r.quantidade_baixada || 0)), 0);
    const capacidadeEstimada = 10000;

    return {
      total: totalUnidades,
      percentual: (totalUnidades / capacidadeEstimada) * 100,
      reservas: reservasCelula.length
    };
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const draggableId = result.draggableId;
    const dest = result.destination.droppableId;

    if (draggableId.startsWith('PCP-')) {
      const pcpId = draggableId.replace('PCP-', '');

      // Corrigindo bug de fuso horário: extraindo componentes da string yyyy-MM-dd diretamente
      const parts = dest.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts.map(Number);
        updatePCPProducaoMutation.mutate({
          id: pcpId,
          data: {
            dia: d,
            mes: m,
            ano: y % 100
          }
        });
      }
      return;
    }

    const reserva = reservas.find(r => r.id === draggableId);
    if (!reserva) return;

    if (dest.startsWith('timeline-')) {
      const parts = dest.split('-');
      const data = parts[parts.length - 1];
      updateReservaMutation.mutate({
        id: draggableId,
        data: { data_prevista: data }
      });
    } else {
      updateReservaMutation.mutate({
        id: draggableId,
        data: { data_prevista: dest }
      });
    }
  };

  const ReservaCard = ({ reserva, index }) => {
    const produto = produtos.find(p => p.letra_produto === reserva.letra_produto);
    const progresso = ((reserva.quantidade_baixada || 0) / reserva.quantidade) * 100;
    const isPCP = reserva.isPCP;
    const clientRefCode = (reserva.isPCP && reserva.cliente_id) ? clienteMap[reserva.cliente_id]?.codigo : null;

    return (
      <Draggable draggableId={reserva.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              "group relative overflow-hidden rounded-2xl border-2 transition-all active:scale-95 p-4 mb-3",
              snapshot.isDragging
                ? "shadow-2xl rotate-1 scale-[1.02] border-blue-500 bg-white dark:bg-slate-800 z-50"
                : "shadow-sm hover:shadow-md border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900/60 backdrop-blur-xl",
              isPCP ? "border-amber-400/50 bg-amber-50/10 dark:bg-amber-900/10" :
                reserva.status === 'RESERVADO' ? "border-blue-200 dark:border-blue-900/30" :
                  reserva.status === 'EM_PRODUCAO' ? "border-amber-200 dark:border-amber-900/30" :
                    "border-emerald-200 dark:border-emerald-900/30"
            )}
          >
            {isPCP && (
              <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500" title="Item da Programação Mensal (PCP)" />
            )}

            <div className="flex items-start gap-2 relative z-10">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-sm font-black tracking-tight uppercase truncate text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-slate-200/50 dark:border-white/5">
                    {reserva.codigo_completo}
                  </span>
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0",
                    isPCP ? "bg-amber-500 text-white border-amber-600 shadow-sm" :
                      reserva.status === 'RESERVADO' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                        reserva.status === 'EM_PRODUCAO' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                          "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  )}>
                    {isPCP ? <span className="flex items-center gap-1">PCP</span> :
                      reserva.status === 'RESERVADO' ? 'RESERVA' :
                        reserva.status === 'EM_PRODUCAO' ? 'PROD.' : 'OK'}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1.5">CLIENTE</div>
                  <h3 className="text-[15px] font-black text-slate-900 dark:text-white uppercase italic leading-tight truncate">
                    {reserva.cliente || 'CONSUMO INTERNO'}
                  </h3>

                  <div className="mt-3 p-2.5 rounded-xl bg-slate-100/50 dark:bg-black/30 border border-slate-200/50 dark:border-white/5">
                    <div className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase leading-none mb-1">REFERÊNCIA / PRODUTO</div>
                    <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase leading-tight italic line-clamp-2">
                      {reserva.descricao || (clientRefCode ? `REF: ${clientRefCode}` : 'PRODUTO NÃO IDENTIFICADO')}
                    </p>
                    {reserva.item_num && (
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Item: {reserva.item_num}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200/50 dark:border-white/5">
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 p-2 rounded-xl border border-slate-100 dark:border-white/5">
                    <Package className="w-4 h-4 text-blue-500" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-slate-900 dark:text-white leading-none">
                        {reserva.quantidade.toLocaleString()}
                      </span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase">UNID.</span>
                    </div>
                  </div>

                  {produto?.celulas_permitidas?.length > 0 && (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 p-2 rounded-xl border border-slate-100 dark:border-white/5">
                      <Factory className="w-4 h-4 text-amber-500" />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-900 dark:text-white leading-none">
                          {produto.celulas_permitidas[0]}
                        </span>
                        <span className="text-[8px] font-bold text-slate-500 uppercase">CÉLULA</span>
                      </div>
                    </div>
                  )}
                </div>

                {progresso > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase italic">Produção Realizada</span>
                      <span className="text-[10px] font-black text-emerald-500 italic bg-emerald-500/10 px-1.5 py-0.5 rounded-lg">{Math.round(progresso)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-1000"
                        style={{ width: `${progresso}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  const CargaIndicator = ({ celula }) => {
    const carga = getCargaCelula(celula);
    const cor = carga.percentual > 80 ? 'bg-red-500' : carga.percentual > 50 ? 'bg-amber-500' : 'bg-emerald-500';
    const status = carga.percentual > 80 ? 'Sobrecarga' : carga.percentual > 50 ? 'Normal' : 'Subutilizado';

    return (
      <div className="flex items-center gap-2 text-xs">
        <div className="flex-1">
          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full ${cor} transition-all`} style={{ width: `${Math.min(carga.percentual, 100)}%` }} />
          </div>
        </div>
        <span className="text-slate-600 dark:text-slate-400 w-20 text-right">{status}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-14 sm:h-14 bg-gradient-to-br from-indigo-600 to-violet-400 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all hover:scale-105 active:scale-95 group">
                <Calendar className="w-8 h-8 sm:w-6 sm:h-6 text-white group-hover:rotate-6 transition-transform" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Agendamento <span className="text-indigo-600 dark:text-indigo-400">PCP</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80">
                  Planejamento Cronológico • Carga de Máquina • Drag & Drop
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 bg-slate-100 dark:bg-slate-950/60 p-1.5 rounded-[1.8rem] border border-slate-200 dark:border-white/10 backdrop-blur-xl">
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                onClick={() => setViewMode('week')}
                className={cn(
                  "h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all gap-2",
                  viewMode === 'week'
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xl scale-[1.02]"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                )}
              >
                <Calendar className="w-4 h-4" />
                Semana
              </Button>
              <Button
                variant={viewMode === 'cells' ? 'default' : 'ghost'}
                onClick={() => setViewMode('cells')}
                className={cn(
                  "h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all gap-2",
                  viewMode === 'cells'
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xl scale-[1.02]"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                )}
              >
                <Factory className="w-4 h-4" />
                Células
              </Button>
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                onClick={() => setViewMode('timeline')}
                className={cn(
                  "h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all gap-2",
                  viewMode === 'timeline'
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xl scale-[1.02]"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                )}
              >
                <BarChart3 className="w-4 h-4" />
                Timeline
              </Button>
              <Button
                variant={viewMode === 'periods' ? 'default' : 'ghost'}
                onClick={() => setViewMode('periods')}
                className={cn(
                  "h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all gap-2",
                  viewMode === 'periods'
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-[1.02]"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                )}
              >
                <LineChart className="w-4 h-4" />
                Períodos
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <PremiumCard title="Total Pendente" icon={Clock} iconColor="#3b82f6">
            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{reservas.length}</p>
          </PremiumCard>
          <PremiumCard title="Em Produção" icon={BarChart3} iconColor="#f59e0b">
            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">
              {reservas.filter(r => r.status === 'EM_PRODUCAO').length}
            </p>
          </PremiumCard>
          <PremiumCard title="OPs do Mês (PCP)" icon={Target} iconColor="#6366f1">
            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{pcpOps.length}</p>
          </PremiumCard>
          <PremiumCard title="Itens para Agendar" icon={AlertTriangle} iconColor="#e11d48">
            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{getReservasSemData().length}</p>
          </PremiumCard>
        </div>

        {viewMode === 'week' && (
          <>
            <div className="flex items-center justify-between bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-lg mb-6">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
                className="rounded-xl border-slate-200 dark:border-white/10 dark:hover:bg-slate-800 transition-all active:scale-95"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </Button>
              <div className="flex flex-col items-center">
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                  {format(currentWeekStart, 'dd MMM', { locale: ptBR })} - {format(addDays(currentWeekStart, 6), 'dd MMM yyyy', { locale: ptBR })}
                </h2>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest italic">Cronograma Semanal de Operações</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
                className="rounded-xl border-slate-200 dark:border-white/10 dark:hover:bg-slate-800 transition-all active:scale-95"
              >
                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </Button>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
                {weekDays.map((day) => {
                  const isToday = isSameDay(day, new Date());

                  return (
                    <Droppable key={day.toISOString()} droppableId={format(day, 'yyyy-MM-dd')}>
                      {(provided, snapshot) => (
                        <div className="flex flex-col h-full">
                          <PremiumCard
                            title={`${format(day, 'EEEE', { locale: ptBR }).toUpperCase()} • ${format(day, 'dd/MM')}`}
                            icon={Calendar}
                            className={cn(
                              "h-full transition-all",
                              snapshot.isDraggingOver ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-400' : '',
                              isToday ? 'ring-2 ring-slate-900 dark:ring-slate-100 shadow-xl' : '',
                              isSameDay(day, selectedDay) ? 'ring-2 ring-amber-400 shadow-amber-400/20' : ''
                            )}
                            contentClassName="p-3 min-h-[350px]"
                            headerClassName="cursor-pointer"
                            onClick={() => setSelectedDay(day)}
                          >
                            <div ref={provided.innerRef} {...provided.droppableProps} className="h-full">
                              {getReservasPorData(day).map((reserva, idx) => (
                                <ReservaCard key={reserva.id} reserva={reserva} index={idx} />
                              ))}
                              {provided.placeholder}
                            </div>
                          </PremiumCard>
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            </DragDropContext>
          </>
        )}

        {viewMode === 'cells' && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getCelulasUnicas().length === 0 ? (
                <PremiumCard title="STATUS DAS CÉLULAS" icon={Factory} className="col-span-full">
                  <div className="p-8 text-center text-slate-500">
                    <Factory className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>Nenhuma célula de produção configurada</p>
                    <p className="text-sm mt-1">Configure células nos produtos para usar esta visualização</p>
                  </div>
                </PremiumCard>
              ) : (
                getCelulasUnicas().map((celula) => {
                  const reservasCelula = getReservasPorCelula(celula);
                  const carga = getCargaCelula(celula);

                  return (
                    <Droppable key={celula} droppableId={`celula-${celula}`}>
                      {(provided, snapshot) => (
                        <PremiumCard
                          title={celula}
                          icon={Factory}
                          badge={carga.percentual > 80 ? <Badge className="bg-red-500 text-white border-0 px-2 py-0 h-5 text-[9px] font-black uppercase italic">Sobrecarga</Badge> : null}
                          className={cn(
                            "transition-all",
                            snapshot.isDraggingOver ? 'ring-2 ring-blue-400 dark:ring-blue-800 shadow-2xl' : ''
                          )}
                        >
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                              <span>{reservasCelula.length} reservas</span>
                              <span>{carga.total.toLocaleString()} un.</span>
                            </div>
                            <CargaIndicator celula={celula} />
                            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3 min-h-[150px] mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
                              {reservasCelula.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-8 italic font-bold">Arraste reservas para esta célula</p>
                              ) : (
                                reservasCelula.map((reserva, index) => (
                                  <ReservaCard key={reserva.id} reserva={reserva} index={index} />
                                ))
                              )}
                              {provided.placeholder}
                            </div>
                          </div>
                        </PremiumCard>
                      )}
                    </Droppable>
                  );
                })
              )}
            </div>
          </DragDropContext>
        )}

        {viewMode === 'timeline' && (
          <>
            <div className="flex items-center justify-between bg-white dark:bg-slate-900/40 backdrop-blur-xl p-4 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl">
              <Button variant="ghost" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))} className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </Button>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase italic tracking-[0.2em]">
                {format(currentWeekStart, 'dd MMM', { locale: ptBR })} — {format(addDays(currentWeekStart, 6), 'dd MMM yyyy', { locale: ptBR })}
              </h2>
              <Button variant="ghost" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))} className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5">
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </Button>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="space-y-6">
                {getCelulasUnicas().map((celula) => (
                  <PremiumCard key={celula} title={celula} icon={Factory} contentClassName="p-4">
                    <div className="mb-4">
                      <CargaIndicator celula={celula} />
                    </div>
                    <div className="grid grid-cols-7 gap-3">
                      {weekDays.map((day) => {
                        const reservasDay = getReservasPorData(day).filter(r => {
                          const produto = produtos.find(p => p.letra_produto === r.letra_produto);
                          return produto?.celulas_permitidas?.includes(celula);
                        });
                        const isToday = isSameDay(day, new Date());

                        return (
                          <Droppable
                            key={`${celula}-${day.toISOString()}`}
                            droppableId={`timeline-${celula}-${format(day, 'yyyy-MM-dd')}`}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={cn(
                                  "min-h-[160px] p-2 rounded-2xl border-2 transition-all",
                                  snapshot.isDraggingOver ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-400' : 'bg-slate-50/50 dark:bg-black/20 border-slate-100 dark:border-white/5',
                                  isToday ? 'ring-2 ring-slate-900 dark:ring-slate-100 bg-white dark:bg-slate-900' : ''
                                )}
                              >
                                <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200/50 dark:border-white/5 pb-2">
                                  {format(day, 'EEE dd', { locale: ptBR })}
                                </div>
                                <div className="space-y-2">
                                  {reservasDay.map((reserva, index) => (
                                    <ReservaCard key={reserva.id} reserva={reserva} index={index} compact={true} />
                                  ))}
                                </div>
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        );
                      })}
                    </div>
                  </PremiumCard>
                ))}
              </div>
            </DragDropContext>
          </>
        )}

        {viewMode === 'periods' && (
          <PeriodAnalysis reservas={reservas} produtos={produtos} todasReservas={todasReservas} />
        )}

        {/* Painel PCP do dia — visível nas views de semana e timeline */}
        {(viewMode === 'week' || viewMode === 'timeline') && (
          <PCPDoDia date={selectedDay} />
        )}
      </div>
    </div>
  );
}