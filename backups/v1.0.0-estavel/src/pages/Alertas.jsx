// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { Bell, CircleCheck, XCircle, AlertTriangle, TrendingDown, Package, Activity, Info, CheckCircle, Trash2, ExternalLink, Clock, MessageSquare, BarChart3 } from 'lucide-react';
import PCPAlertasPanel from '@/components/alertas/PCPAlertasPanel';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { cn } from "@/lib/utils";


const severidadeConfig = {
  BAIXA: { label: 'Baixa', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Activity },
  MEDIA: { label: 'Média', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: AlertTriangle },
  ALTA: { label: 'Alta', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertTriangle },
  CRITICA: { label: 'Crítica', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle }
};

const tipoConfig = {
  PROGRESSO_BAIXO: { label: 'Progresso Baixo', icon: TrendingDown },
  RESERVA_CANCELADA: { label: 'Reserva Cancelada', icon: XCircle },
  GARGALO: { label: 'Gargalo Detectado', icon: AlertTriangle },
  ANO_ENCERRADO: { label: 'Ano Encerrado', icon: CircleCheck },
  ESTOQUE_BAIXO: { label: 'Estoque Baixo', icon: Package }
};

const notifTipoIconMap = {
  INFO: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  ALERTA: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  ERRO: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  SUCESSO: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }
};

const notifPrioridadeConfig = {
  CRITICA: { label: 'Crítica', color: 'bg-red-600', pulse: true },
  ALTA: { label: 'Alta', color: 'bg-orange-500', pulse: false },
  MEDIA: { label: 'Média', color: 'bg-blue-500', pulse: false },
  BAIXA: { label: 'Baixa', color: 'bg-slate-400', pulse: false },
};

export default function Alertas() {
  const queryClient = useQueryClient();
  const { setorAtivo, isAdmin } = useSetor();
  const [filtroAlerta, setFiltroAlerta] = useState('todos');
  const [filtroNotif, setFiltroNotif] = useState('todos');
  const [tab, setTab] = useState('pcp');

  // Obter userId do localStorage
  const user = useMemo(() => {
    try {
      const u = localStorage.getItem('internalUser');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  }, []);

  // ===== ALERTAS =====
  const { data: alertas = [], isLoading: loadingAlertas } = useQuery({
    queryKey: ['alertas', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await base44.entities.Alerta.list('-created_at', 200);
      }
      const todas = await base44.entities.Alerta.list('-created_at', 200);
      const reservas = await base44.entities.ReservaLote.filter({ setor_id: setorAtivo });
      const reservaIds = reservas.map(r => r.id);
      return todas.filter(a => reservaIds.includes(a.entidade_id) || !a.entidade_id);
    },
    enabled: !!setorAtivo
  });

  // ===== NOTIFICAÇÕES =====
  const { data: notificacoes = [], isLoading: loadingNotifs } = useQuery({
    queryKey: ['notificacoes-central', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await base44.entities.Notificacao.filter(
        { usuario_id: user.id, arquivada: false },
        '-created_at',
        200
      );
    },
    enabled: !!user?.id
  });

  // Mutations de Alertas
  const marcarLidoMutation = useMutation({
    mutationFn: (id) => base44.entities.Alerta.update(id, { lido: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alertas'] })
  });

  const marcarResolvidoMutation = useMutation({
    mutationFn: (id) => base44.entities.Alerta.update(id, { resolvido: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      toast.success('Alerta resolvido!');
    }
  });

  const marcarTodosAlertasLidos = useMutation({
    mutationFn: async () => {
      const naoLidos = alertas.filter(a => !a.lido);
      await Promise.all(naoLidos.map(a => base44.entities.Alerta.update(a.id, { lido: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      toast.success('Todos os alertas marcados como lidos');
    }
  });

  const excluirTodosAlertasMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(alertasFiltrados.map(a => base44.entities.Alerta.delete(a.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      toast.success('Todos os alertas excluídos!');
    }
  });

  // Mutations de Notificações
  const marcarNotifLida = useMutation({
    mutationFn: (id) => base44.entities.Notificacao.update(id, { lida: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes-central'] })
  });

  const arquivarNotif = useMutation({
    mutationFn: (id) => base44.entities.Notificacao.update(id, { arquivada: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes-central'] });
      toast.success('Notificação arquivada');
    }
  });

  const marcarTodasNotifsLidas = useMutation({
    mutationFn: async () => {
      const naoLidas = notificacoes.filter(n => !n.lida);
      await Promise.all(naoLidas.map(n => base44.entities.Notificacao.update(n.id, { lida: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes-central'] });
      toast.success('Todas as notificações marcadas como lidas');
    }
  });

  const excluirTodasNotifsMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(notifsFiltradas.map(n => base44.entities.Notificacao.delete(n.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes-central'] });
      toast.success('Todas as notificações excluídas!');
    }
  });

  // Filtros Alertas
  const alertasFiltrados = useMemo(() => {
    let result = [...alertas];
    if (filtroAlerta === 'nao_lidos') result = result.filter(a => !a.lido);
    else if (filtroAlerta === 'nao_resolvidos') result = result.filter(a => !a.resolvido);
    else if (filtroAlerta === 'criticos') result = result.filter(a => a.severidade === 'CRITICA' || a.severidade === 'ALTA');
    return result;
  }, [alertas, filtroAlerta]);

  // Filtros Notificações
  const notifsFiltradas = useMemo(() => {
    let result = [...notificacoes];
    if (filtroNotif === 'nao_lidas') result = result.filter(n => !n.lida);
    else if (filtroNotif === 'criticas') result = result.filter(n => n.prioridade === 'CRITICA' || n.prioridade === 'ALTA');
    else if (filtroNotif === 'info') result = result.filter(n => n.tipo === 'INFO');
    else if (filtroNotif === 'alertas') result = result.filter(n => n.tipo === 'ALERTA');
    else if (filtroNotif === 'erros') result = result.filter(n => n.tipo === 'ERRO');
    return result;
  }, [notificacoes, filtroNotif]);

  // Stats
  const statsAlertas = useMemo(() => ({
    total: alertas.length,
    naoLidos: alertas.filter(a => !a.lido).length,
    naoResolvidos: alertas.filter(a => !a.resolvido).length,
    criticos: alertas.filter(a => a.severidade === 'CRITICA').length
  }), [alertas]);

  const statsNotifs = useMemo(() => ({
    total: notificacoes.length,
    naoLidas: notificacoes.filter(n => !n.lida).length,
    criticas: notificacoes.filter(n => n.prioridade === 'CRITICA' || n.prioridade === 'ALTA').length,
    erros: notificacoes.filter(n => n.tipo === 'ERRO').length,
  }), [notificacoes]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(239,68,68,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-600 to-rose-400 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.3)] transition-all hover:scale-105 active:scale-95 group border border-red-400/20">
                <Bell className="w-8 h-8 sm:w-10 sm:h-10 text-white group-hover:rotate-12 transition-transform duration-500" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Central de <span className="text-red-600 dark:text-red-400">Alertas</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                  Monitoramento Crítico • Rastreabilidade • Sistema
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-14 px-6 rounded-2xl bg-slate-100 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center gap-4 shadow-xl">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Sessão Ativa</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white italic tracking-tight">{user?.full_name || 'Operador'}</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-700 overflow-hidden text-slate-500 font-black italic uppercase flex items-center justify-center">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Premium */}
        <Tabs value={tab} onValueChange={setTab} className="space-y-8">
          <TabsList className="bg-white/50 dark:bg-slate-900/60 backdrop-blur-3xl border border-slate-200 dark:border-white/5 p-1.5 rounded-[2rem] shadow-2xl h-16 w-full max-w-2xl mx-auto grid grid-cols-3">
            <TabsTrigger value="pcp" className="gap-3 rounded-[1.5rem] transition-all duration-500 font-bold uppercase tracking-widest text-[10px] italic data-[state=active]:bg-slate-900 dark:data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-2xl">
              <BarChart3 className="w-4 h-4" />
              Alertas PCP
            </TabsTrigger>
            <TabsTrigger value="alertas" className="gap-3 rounded-[1.5rem] transition-all duration-500 font-bold uppercase tracking-widest text-[10px] italic data-[state=active]:bg-slate-900 dark:data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-2xl">
              <AlertTriangle className="w-4 h-4" />
              Incidências
              {statsAlertas.naoLidos > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-white text-slate-900 dark:text-red-600 text-[10px] font-black">
                  {statsAlertas.naoLidos}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="notificacoes" className="gap-3 rounded-[1.5rem] transition-all duration-500 font-bold uppercase tracking-widest text-[10px] italic data-[state=active]:bg-slate-900 dark:data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-2xl">
              <MessageSquare className="w-4 h-4" />
              Notificações
              {statsNotifs.naoLidas > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-white text-slate-900 dark:text-red-600 text-[10px] font-black">
                  {statsNotifs.naoLidas}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ===== TAB PCP ===== */}
          <TabsContent value="pcp" className="mt-4">
            <PCPAlertasPanel />
          </TabsContent>

          {/* ===== TAB ALERTAS ===== */}
          <TabsContent value="alertas" className="space-y-8 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Stats Alertas Premium */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Registrado', value: statsAlertas.total, icon: Bell, color: 'blue' },
                { label: 'Atenção Necessária', value: statsAlertas.naoLidos, icon: Activity, color: 'sky', isAlert: statsAlertas.naoLidos > 0 },
                { label: 'Pendentes de Resolução', value: statsAlertas.naoResolvidos, icon: AlertTriangle, color: 'orange', isAlert: statsAlertas.naoResolvidos > 0 },
                { label: 'Impacto Crítico', value: statsAlertas.criticos, icon: XCircle, color: 'red', isAlert: statsAlertas.criticos > 0 },
              ].map((item, i) => (
                <Card key={i} className="relative overflow-hidden border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-xl transition-all hover:scale-[1.02] group">
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-[0.03] transition-opacity group-hover:opacity-[0.06]",
                    item.color === 'blue' ? "from-blue-600 to-transparent" :
                      item.color === 'sky' ? "from-sky-600 to-transparent" :
                        item.color === 'orange' ? "from-orange-600 to-transparent" :
                          "from-red-600 to-transparent"
                  )} />
                  <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        "w-12 h-12 rounded-[1.25rem] flex items-center justify-center border transition-all duration-500",
                        item.color === 'blue' ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white" :
                          item.color === 'sky' ? "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500 group-hover:text-white" :
                            item.color === 'orange' ? "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white" :
                              "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 group-hover:bg-red-500 group-hover:text-white"
                      )}>
                        <item.icon className="w-6 h-6" />
                      </div>
                      {item.isAlert && (
                        <Badge className="bg-red-500 text-white animate-pulse border-0 px-2 py-0 h-5 text-[9px] font-black uppercase italic">Urgente</Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic mb-1 opacity-70">{item.label}</p>
                      <h3 className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter">{item.value}</h3>
                    </div>
                  </div>
                  {item.isAlert && (
                    <div className={cn(
                      "absolute bottom-0 left-0 h-1.5 transition-all duration-700",
                      item.color === 'orange' ? "bg-orange-500 w-full" : "bg-red-600 w-full"
                    )} />
                  )}
                </Card>
              ))}
            </div>

            {/* Toolbar Premium */}
            <div className="flex flex-wrap items-center justify-between gap-6 p-8 bg-white/50 dark:bg-slate-900/60 backdrop-blur-3xl border border-slate-200 dark:border-white/5 rounded-[2.5rem] shadow-2xl">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col gap-1.5 modal-select-label">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Filtragem Dinâmica</span>
                  <Select value={filtroAlerta} onValueChange={setFiltroAlerta}>
                    <SelectTrigger className="w-[260px] h-12 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest italic shadow-inner">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-white/10 rounded-2xl">
                      <SelectItem value="todos" className="font-bold uppercase text-[10px] tracking-widest">Todos os Alertas</SelectItem>
                      <SelectItem value="nao_lidos" className="font-bold uppercase text-[10px] tracking-widest">Não Lidos</SelectItem>
                      <SelectItem value="nao_resolvidos" className="font-bold uppercase text-[10px] tracking-widest">Não Resolvidos</SelectItem>
                      <SelectItem value="criticos" className="font-bold uppercase text-[10px] tracking-widest text-red-500">Impacto Crítico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => marcarTodosAlertasLidos.mutate()}
                  variant="outline"
                  disabled={statsAlertas.naoLidos === 0}
                  className="h-12 px-6 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 backdrop-blur-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all font-black uppercase text-[10px] tracking-widest italic gap-3 shadow-lg shadow-emerald-500/5 disabled:opacity-40"
                >
                  <CircleCheck className="w-4 h-4 text-emerald-500" />
                  Arquivar Lidos
                </Button>
                {isAdmin && alertasFiltrados.length > 0 && (
                  <Button
                    onClick={() => { if (window.confirm(`Excluir ${alertasFiltrados.length} alerta(s)? Esta ação não pode ser desfeita.`)) excluirTodosAlertasMutation.mutate(); }}
                    variant="outline"
                    className="h-12 px-6 rounded-2xl border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-black uppercase text-[10px] tracking-widest italic gap-3 shadow-lg shadow-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                    Limpar Terminal
                  </Button>
                )}
              </div>
            </div>

            {/* Terminal de Alertas Premium */}
            <Card className="border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-2xl mb-12">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-white/5 p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 shadow-inner">
                    <Activity className="w-7 h-7 text-red-500" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Journal de Incidências</CardTitle>
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest italic mt-2 opacity-70">Monitoramento Terminal • {alertasFiltrados.length} Eventos Ativos</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 sm:p-10">
                {loadingAlertas ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-600 rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic animate-pulse">Sincronizando Terminal...</p>
                  </div>
                ) : alertasFiltrados.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50/50 dark:bg-white/5 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-white/5">
                    <CircleCheck className="w-20 h-20 text-emerald-500/40 mx-auto mb-6 drop-shadow-2xl" />
                    <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Terminal em Conformidade</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Nenhum evento registrado no período selecionado</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {alertasFiltrados.map(alerta => {
                      const sevConfig = severidadeConfig[alerta.severidade] || severidadeConfig.MEDIA;
                      const tipoInfo = tipoConfig[alerta.tipo] || { label: alerta.tipo, icon: Bell };
                      const TipoIcon = tipoInfo.icon;
                      return (
                        <div
                          key={alerta.id}
                          className={cn(
                            "group relative overflow-hidden p-8 rounded-[2rem] border-2 transition-all duration-500 hover:scale-[1.01]",
                            alerta.resolvido
                              ? "bg-slate-50/50 dark:bg-slate-900/20 border-slate-100 dark:border-white/5 opacity-50 outline-none"
                              : cn(
                                "bg-white dark:bg-slate-900/40 backdrop-blur-xl border-slate-200/60 dark:border-white/10 shadow-xl hover:shadow-2xl",
                                alerta.severidade === 'CRITICA' ? "hover:border-red-500/50 shadow-red-500/5" :
                                  alerta.severidade === 'ALTA' ? "hover:border-orange-500/50 shadow-orange-500/5" :
                                    "hover:border-blue-500/50 shadow-blue-500/5"
                              )
                          )}
                          onClick={() => !alerta.lido && marcarLidoMutation.mutate(alerta.id)}
                        >
                          <div className="flex items-start justify-between gap-8 relative z-10">
                            <div className="flex items-start gap-6 flex-1">
                              <div className={cn(
                                "w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl shrink-0 transition-all duration-700 group-hover:rotate-12 group-hover:scale-110",
                                alerta.resolvido ? "bg-slate-100 dark:bg-slate-800 text-slate-400" : sevConfig.color
                              )}>
                                <TipoIcon className="w-8 h-8" />
                              </div>
                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center gap-4">
                                  <h3 className={cn(
                                    "font-black tracking-tighter italic uppercase text-xl leading-none transition-colors",
                                    alerta.resolvido ? "text-slate-400" : "text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400"
                                  )}>
                                    {alerta.titulo}
                                  </h3>
                                  {!alerta.lido && (
                                    <span className="flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 shadow-lg shadow-red-500/50"></span>
                                    </span>
                                  )}
                                </div>
                                <p className={cn(
                                  "text-base font-bold leading-relaxed italic tracking-tight",
                                  alerta.resolvido ? "text-slate-400" : "text-slate-600 dark:text-slate-300"
                                )}>
                                  {alerta.descricao}
                                </p>
                                <div className="flex items-center gap-4 mt-6 flex-wrap">
                                  <Badge className={cn("rounded-xl px-4 py-1.5 font-black text-[10px] uppercase tracking-[0.2em] border-0 shadow-lg", sevConfig.color)}>
                                    {sevConfig.label}
                                  </Badge>
                                  <Badge variant="outline" className="rounded-xl px-4 py-1.5 font-black text-[10px] uppercase tracking-[0.2em] border-slate-200 dark:border-white/10 dark:text-slate-400 bg-slate-50/50 dark:bg-white/5 shadow-sm">
                                    {tipoInfo.label}
                                  </Badge>
                                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">
                                    <Clock className="w-4 h-4" />
                                    {format(new Date(alerta.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 self-center">
                              {!alerta.resolvido ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => { e.stopPropagation(); marcarResolvidoMutation.mutate(alerta.id); }}
                                  className="h-14 px-8 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all font-black uppercase text-[10px] tracking-widest italic gap-3 hover:border-emerald-500/50 hover:text-emerald-600 group/btn shadow-xl active:scale-95"
                                >
                                  <CircleCheck className="w-5 h-5 transition-transform group-hover/btn:scale-125" />
                                  Resolver Evento
                                </Button>
                              ) : (
                                <div className="flex items-center gap-3 px-8 py-4 bg-emerald-500 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest italic shadow-xl shadow-emerald-500/20">
                                  <CheckCircle className="w-5 h-5 leading-none" />
                                  Concluído
                                </div>
                              )}
                            </div>
                          </div>
                          {!alerta.resolvido && (
                            <div className={cn(
                              "absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r opacity-20 transition-all duration-700 group-hover:opacity-100 group-hover:h-2",
                              alerta.severidade === 'CRITICA' ? "from-red-600 to-rose-400" :
                                alerta.severidade === 'ALTA' ? "from-orange-600 to-amber-400" :
                                  "from-blue-600 to-blue-400"
                            )} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== TAB NOTIFICAÇÕES ===== */}
          <TabsContent value="notificacoes" className="space-y-4 mt-4">
            {/* Stats Notificações */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="dark:bg-slate-900 dark:border-slate-800"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500 dark:text-slate-400">Total</p><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{statsNotifs.total}</p></div><MessageSquare className="w-7 h-7 text-slate-400 dark:text-slate-600" /></div></CardContent></Card>
              <Card className="dark:bg-slate-900 dark:border-slate-800"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500 dark:text-slate-400">Não Lidas</p><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{statsNotifs.naoLidas}</p></div><Bell className="w-7 h-7 text-blue-400 dark:text-blue-600" /></div></CardContent></Card>
              <Card className="dark:bg-slate-900 dark:border-slate-800"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500 dark:text-slate-400">Prioridade Alta</p><p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{statsNotifs.criticas}</p></div><AlertTriangle className="w-7 h-7 text-orange-400 dark:text-orange-600" /></div></CardContent></Card>
              <Card className="dark:bg-slate-900 dark:border-slate-800"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500 dark:text-slate-400">Erros</p><p className="text-2xl font-bold text-red-600 dark:text-red-400">{statsNotifs.erros}</p></div><XCircle className="w-7 h-7 text-red-400 dark:text-red-600" /></div></CardContent></Card>
            </div>

            {/* Filtro + Ação */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={filtroNotif} onValueChange={setFiltroNotif}>
                <SelectTrigger className="w-[200px] bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="nao_lidas">Não Lidas</SelectItem>
                  <SelectItem value="criticas">Prioridade Alta/Crítica</SelectItem>
                  <SelectItem value="info">Informativas</SelectItem>
                  <SelectItem value="alertas">Alertas</SelectItem>
                  <SelectItem value="erros">Erros</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => marcarTodasNotifsLidas.mutate()}
                variant="outline"
                size="sm"
                disabled={statsNotifs.naoLidas === 0}
                className="dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-300"
              >
                <CircleCheck className="w-4 h-4 mr-1" />
                Marcar Todas como Lidas
              </Button>
              {notifsFiltradas.length > 0 && (
                <Button
                  onClick={() => { if (window.confirm(`Excluir ${notifsFiltradas.length} notificação(ões)? Esta ação não pode ser desfeita.`)) excluirTodasNotifsMutation.mutate(); }}
                  variant="outline"
                  size="sm"
                  className="border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir Tudo
                </Button>
              )}
            </div>

            {/* Lista de Notificações */}
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-3">
                <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  Notificações ({notifsFiltradas.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                {loadingNotifs ? (
                  <p className="text-center text-slate-500 py-8">Carregando notificações...</p>
                ) : notifsFiltradas.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg">Nenhuma notificação para exibir</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifsFiltradas.map(notif => {
                      const tipoInfo = notifTipoIconMap[notif.tipo] || notifTipoIconMap.INFO;
                      const TipoIcon = tipoInfo.icon;
                      const prioInfo = notifPrioridadeConfig[notif.prioridade] || notifPrioridadeConfig.MEDIA;
                      return (
                        <div
                          key={notif.id}
                          className={`p-4 rounded-lg border transition-all hover:shadow-md ${notif.lida ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800' : `${tipoInfo.bg} dark:bg-slate-900 ${tipoInfo.border} dark:border-slate-800`
                            }`}
                          onClick={() => !notif.lida && marcarNotifLida.mutate(notif.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border ${tipoInfo.bg} dark:bg-slate-800 ${tipoInfo.border} dark:border-slate-700`}>
                              <TipoIcon className={`w-5 h-5 ${tipoInfo.color} dark:text-blue-400`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  <h4 className={`text-sm ${!notif.lida ? 'font-semibold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-600 dark:text-slate-400'}`}>
                                    {notif.titulo}
                                  </h4>
                                  {!notif.lida && <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full flex-shrink-0" />}
                                </div>
                                {notif.prioridade && notif.prioridade !== 'BAIXA' && (
                                  <Badge className={`text-xs px-2 py-0 text-white ${prioInfo.color} ${prioInfo.pulse ? 'animate-pulse' : ''}`}>
                                    {prioInfo.label}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{notif.mensagem}</p>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(notif.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                                </span>
                                <div className="flex items-center gap-1">
                                  {notif.link_relacionado && (
                                    <Link to={notif.link_relacionado}>
                                      <Button variant="ghost" size="sm" className="h-7 text-xs hover:bg-blue-100">
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        Abrir
                                      </Button>
                                    </Link>
                                  )}
                                  {!notif.lida && (
                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); marcarNotifLida.mutate(notif.id); }} className="h-7 text-xs hover:bg-green-100" title="Marcar como lida">
                                      <CheckCircle className="w-3 h-3" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); arquivarNotif.mutate(notif.id); }} className="h-7 text-xs hover:bg-red-100 text-slate-500" title="Arquivar">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}