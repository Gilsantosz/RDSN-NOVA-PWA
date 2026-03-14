// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Factory, Package, Clock, ChevronLeft, ChevronRight, GripVertical, BarChart3, AlertTriangle, LineChart } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import PeriodAnalysis from '@/components/agendamento/PeriodAnalysis';
import PCPDoDia from '@/components/agendamento/PCPDoDia';



export default function Agendamento() {
  const queryClient = useQueryClient();
  const { setorAtivo, isAdmin } = useSetor();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { locale: ptBR }));
  const [viewMode, setViewMode] = useState('week');
  const [selectedDay, setSelectedDay] = useState(new Date());

  // Fetch all reservas (including filtered ones) for PeriodAnalysis
  const { data: todasReservas = [] } = useQuery({
    queryKey: ['todasReservas', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await base44.entities.ReservaLote.list();
      }
      return await base44.entities.ReservaLote.filter({ setor_id: setorAtivo });
    },
    enabled: !!setorAtivo
  });

  const { data: reservas = [] } = useQuery({
    queryKey: ['reservas', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        const todas = await base44.entities.ReservaLote.list();
        return todas.filter(r => ['RESERVADO', 'EM_PRODUCAO'].includes(r.status));
      }
      const todas = await base44.entities.ReservaLote.filter({ setor_id: setorAtivo });
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
          return await base44.entities.Produto.list();
        }
        return await base44.entities.Produto.filter({ setor_id: setorAtivo });
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        return [];
      }
    },
    enabled: !!setorAtivo
  });

  const updateReservaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ReservaLote.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      toast.success('Agendamento atualizado!');
    }
  });

  useEffect(() => {
    const unsubscribe = base44.entities.ReservaLote.subscribe((_event) => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
    });
    return unsubscribe;
  }, [queryClient]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const getReservasPorData = (date) => {
    return reservas.filter(r => {
      if (!r.data_prevista) return false;
      return isSameDay(new Date(r.data_prevista), date);
    });
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
    return reservas.filter(r => {
      const produto = produtos.find(p => p.letra_produto === r.letra_produto);
      return produto?.celulas_permitidas?.includes(celula);
    });
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

    const reservaId = result.draggableId;
    const reserva = reservas.find(r => r.id === reservaId);
    if (!reserva) return;

    const dest = result.destination.droppableId;

    if (dest === 'sem-data') {
      updateReservaMutation.mutate({
        id: reservaId,
        data: { data_prevista: null }
      });
    } else if (dest.startsWith('timeline-')) {
      const parts = dest.split('-');
      const data = parts[parts.length - 1];
      updateReservaMutation.mutate({
        id: reservaId,
        data: { data_prevista: data }
      });
    } else {
      updateReservaMutation.mutate({
        id: reservaId,
        data: { data_prevista: dest }
      });
    }
  };

  const ReservaCard = ({ reserva, index, compact = false }) => {
    const produto = produtos.find(p => p.letra_produto === reserva.letra_produto);
    const progresso = ((reserva.quantidade_baixada || 0) / reserva.quantidade) * 100;

    return (
      <Draggable draggableId={reserva.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              "group relative overflow-hidden rounded-2xl border-2 transition-all active:scale-95",
              compact ? 'p-3 mb-2' : 'p-4 mb-3',
              snapshot.isDragging
                ? "shadow-2xl rotate-3 scale-105 border-blue-500 bg-white dark:bg-slate-800 z-50"
                : "shadow-sm hover:shadow-md border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900/40 backdrop-blur-xl",
              reserva.status === 'RESERVADO' ? "hover:border-blue-500/50" :
                reserva.status === 'EM_PRODUCAO' ? "hover:border-amber-500/50" :
                  "hover:border-emerald-500/50"
            )}
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-start gap-3 relative z-10">
              <div className="mt-1 flex flex-col items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                <GripVertical className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={cn(
                    "font-black tracking-tighter italic uppercase truncate",
                    compact ? 'text-[11px]' : 'text-sm',
                    "text-slate-900 dark:text-white"
                  )}>
                    {reserva.codigo_completo}
                  </span>
                  {!compact && (
                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                      reserva.status === 'RESERVADO' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                        reserva.status === 'EM_PRODUCAO' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                          "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    )}>
                      {reserva.status === 'RESERVADO' ? 'Reservado' :
                        reserva.status === 'EM_PRODUCAO' ? 'Em Produção' : 'Concluído'}
                    </div>
                  )}
                </div>

                {!compact && (
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate mb-3 italic opacity-80">
                    {reserva.cliente || 'Sem Cliente'}
                  </p>
                )}

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                      <Package className="w-3 h-3 text-slate-500" />
                    </div>
                    <span className={cn(
                      "font-black italic flex items-baseline gap-0.5",
                      compact ? 'text-[10px]' : 'text-[11px]',
                      "text-slate-700 dark:text-slate-300"
                    )}>
                      {reserva.quantidade.toLocaleString()} <span className="text-[8px] font-bold opacity-50 uppercase not-italic">un</span>
                    </span>
                  </div>

                  {produto?.celulas_permitidas?.length > 0 && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                        <Factory className="w-3 h-3 text-slate-500" />
                      </div>
                      <span className={cn(
                        "font-black italic uppercase",
                        compact ? 'text-[10px]' : 'text-[11px]',
                        "text-slate-700 dark:text-slate-300"
                      )}>
                        {produto.celulas_permitidas[0]}
                      </span>
                    </div>
                  )}
                </div>

                {(!compact || progresso > 0) && progresso > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Fluxo de Baixa</span>
                      <span className="text-[9px] font-black italic text-emerald-500">{Math.round(progresso)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700 rounded-full"
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
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-600 to-violet-400 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all hover:scale-105 active:scale-95 group">
                <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-white group-hover:rotate-6 transition-transform" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Reservadas', value: reservas.filter(r => r.status === 'RESERVADO').length, icon: Clock, color: 'blue' },
            { label: 'Em Produção', value: reservas.filter(r => r.status === 'EM_PRODUCAO').length, icon: Factory, color: 'amber' },
            { label: 'Sem Data', value: getReservasSemData().length, icon: Calendar, color: 'slate' },
            { label: 'Total Unidades', value: reservas.reduce((sum, r) => sum + r.quantidade, 0).toLocaleString(), icon: Package, color: 'emerald' },
          ].map((item, i) => (
            <Card key={i} className="relative overflow-hidden group border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 backdrop-blur-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic">{item.label}</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{item.value}</p>
                  </div>
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6",
                    item.color === 'blue' ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20" :
                      item.color === 'amber' ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20" :
                        item.color === 'emerald' ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20" :
                          "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 border border-slate-500/20"
                  )}>
                    <item.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
              <div className={cn(
                "absolute bottom-0 left-0 h-1 bg-gradient-to-r transition-all duration-500 group-hover:h-1.5",
                item.color === 'blue' ? "from-blue-600 to-indigo-500 w-[40%]" :
                  item.color === 'amber' ? "from-amber-600 to-orange-500 w-[60%]" :
                    item.color === 'emerald' ? "from-emerald-600 to-teal-500 w-[80%]" :
                      "from-slate-600 to-slate-400 w-[20%]"
              )} />
            </Card>
          ))}
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
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
                {weekDays.map((day) => {
                  const reservasDay = getReservasPorData(day);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <Droppable key={day.toISOString()} droppableId={format(day, 'yyyy-MM-dd')}>
                      {(provided, snapshot) => (
                        <Card className={`${snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-300 dark:border-blue-800' : 'dark:bg-slate-900 dark:border-slate-800'} ${isToday ? 'ring-2 ring-slate-900 dark:ring-slate-100' : ''} ${isSameDay(day, selectedDay) ? 'ring-2 ring-amber-400' : ''}`}>
                          <CardHeader className="p-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer" onClick={() => setSelectedDay(day)}>
                            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {format(day, 'EEE', { locale: ptBR })}
                              <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                                {format(day, 'dd/MM', { locale: ptBR })}
                              </span>
                            </CardTitle>
                            <Badge variant="outline" className="mt-1 text-xs dark:text-slate-400 dark:border-slate-700">{reservasDay.length}</Badge>
                          </CardHeader>
                          <CardContent ref={provided.innerRef} {...provided.droppableProps} className="p-3 min-h-[300px]">
                            {reservasDay.map((reserva, index) => (
                              <ReservaCard key={reserva.id} reserva={reserva} index={index} />
                            ))}
                            {provided.placeholder}
                          </CardContent>
                        </Card>
                      )}
                    </Droppable>
                  );
                })}

                <Droppable droppableId="sem-data">
                  {(provided, snapshot) => (
                    <Card className={snapshot.isDraggingOver ? 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700' : 'dark:bg-slate-900 dark:border-slate-800'}>
                      <CardHeader className="p-3 border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Sem Data
                          <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">Não agendadas</span>
                        </CardTitle>
                        <Badge variant="outline" className="mt-1 text-xs dark:text-slate-400 dark:border-slate-700">{getReservasSemData().length}</Badge>
                      </CardHeader>
                      <CardContent ref={provided.innerRef} {...provided.droppableProps} className="p-3 min-h-[300px]">
                        {getReservasSemData().map((reserva, index) => (
                          <ReservaCard key={reserva.id} reserva={reserva} index={index} />
                        ))}
                        {provided.placeholder}
                      </CardContent>
                    </Card>
                  )}
                </Droppable>
              </div>
            </DragDropContext>
          </>
        )}

        {viewMode === 'cells' && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getCelulasUnicas().length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="p-8 text-center text-slate-500">
                    <Factory className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>Nenhuma célula de produção configurada</p>
                    <p className="text-sm mt-1">Configure células nos produtos para usar esta visualização</p>
                  </CardContent>
                </Card>
              ) : (
                getCelulasUnicas().map((celula) => {
                  const reservasCelula = getReservasPorCelula(celula);
                  const carga = getCargaCelula(celula);

                  return (
                    <Droppable key={celula} droppableId={`celula-${celula}`}>
                      {(provided, snapshot) => (
                        <Card className={snapshot.isDraggingOver ? 'ring-2 ring-blue-300 dark:ring-blue-800' : 'dark:bg-slate-900 dark:border-slate-800'}>
                          <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <Factory className="w-5 h-5" />
                                {celula}
                              </CardTitle>
                              {carga.percentual > 80 && <AlertTriangle className="w-5 h-5 text-red-500" />}
                            </div>
                            <Badge variant="outline" className="mt-2 dark:border-slate-700 dark:text-slate-400">
                              {reservasCelula.length} reservas • {carga.total.toLocaleString()} un.
                            </Badge>
                            <div className="mt-3">
                              <CargaIndicator celula={celula} />
                            </div>
                          </CardHeader>
                          <CardContent ref={provided.innerRef} {...provided.droppableProps} className="p-4 space-y-2 min-h-[300px]">
                            {reservasCelula.length === 0 ? (
                              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                                Arraste reservas para esta célula
                              </p>
                            ) : (
                              reservasCelula.map((reserva, index) => (
                                <ReservaCard key={reserva.id} reserva={reserva} index={index} />
                              ))
                            )}
                            {provided.placeholder}
                          </CardContent>
                        </Card>
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
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-semibold text-slate-900">
                {format(currentWeekStart, 'dd MMM', { locale: ptBR })} - {format(addDays(currentWeekStart, 6), 'dd MMM yyyy', { locale: ptBR })}
              </h2>
              <Button variant="outline" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="space-y-4">
                {getCelulasUnicas().map((celula) => (
                  <Card key={celula} className="dark:bg-slate-900 dark:border-slate-800">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Factory className="w-4 h-4" />
                          {celula}
                        </CardTitle>
                        <CargaIndicator celula={celula} />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-7 gap-2">
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
                                  className={`min-h-[120px] p-2 rounded-lg border-2 ${snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-300 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                                    } ${isToday ? 'ring-2 ring-slate-900 dark:ring-slate-100' : ''}`}
                                >
                                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    {format(day, 'EEE dd', { locale: ptBR })}
                                  </div>
                                  {reservasDay.map((reserva, index) => (
                                    <ReservaCard key={reserva.id} reserva={reserva} index={index} compact />
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
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