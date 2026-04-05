import React, { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Calendar, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { differenceInDays, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { PremiumCard } from '@/components/ui/PremiumCard';

export default function AlertasPrazos({ reservas, userId }) {
  const queryClient = useQueryClient();

  const criarNotificacaoMutation = useMutation({
    mutationFn: async ({ titulo, mensagem, tipo, prioridade, reservaId }) => {
      await rdsn.entities.Notificacao.create({
        usuario_id: userId,
        titulo,
        mensagem,
        tipo,
        prioridade,
        entidade_tipo: 'ReservaLote',
        entidade_id: reservaId,
        lida: false,
        arquivada: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes-reserva'] });
    }
  });

  // Identificar reservas com prazos críticos
  const reservasComPrazo = (reservas || []).filter(r =>
    r.data_prevista &&
    r.status !== 'CANCELADO' &&
    r.status !== 'LIBERADO' &&
    r.status !== 'PRODUZIDO'
  );

  const alertas = reservasComPrazo.map(reserva => {
    const dataPrevista = new Date(reserva.data_prevista);
    const hoje = new Date();
    const dataPrevistaInicio = startOfDay(dataPrevista);
    const hojeInicio = startOfDay(hoje);
    
    // Calcula diferença real de dias ignorando horas
    const diasRestantes = differenceInDays(dataPrevistaInicio, hojeInicio);
    
    // Só está atrasado se for ANTES de hoje
    const atrasado = diasRestantes < 0 && reserva.status !== 'PRODUZIDO';
    
    const progresso = reserva.quantidade > 0 ? ((reserva.quantidade_baixada || 0) / reserva.quantidade) * 100 : 0;

    let severidade = 'BAIXA';
    let tipo = 'INFO';

    if (atrasado) {
      severidade = 'ALTA';
      tipo = 'ALERTA';
    } else if (diasRestantes <= 3 && diasRestantes >= 0) {
      severidade = 'ALTA';
      tipo = 'ALERTA';
    } else if (diasRestantes <= 7 && diasRestantes >= 0) {
      severidade = 'MEDIA';
      tipo = 'ALERTA';
    }

    return {
      reserva,
      diasRestantes,
      atrasado,
      progresso,
      severidade,
      tipo
    };
  }).filter(a => a.atrasado || (a.diasRestantes >= 0 && a.diasRestantes <= 7));

  // Criar notificações automáticas para prazos críticos
  useEffect(() => {
    if (!userId || !alertas.length) return;

    alertas.forEach(alerta => {
      const key = `notif_prazo_${alerta.reserva.id}_${alerta.diasRestantes}`;
      const jaNotificado = localStorage.getItem(key);

      if (!jaNotificado) {
        if (alerta.atrasado) {
          criarNotificacaoMutation.mutate({
            titulo: `⏰ Reserva ${alerta.reserva.codigo_completo} ATRASADA`,
            mensagem: `A reserva ${alerta.reserva.codigo_completo} do cliente ${alerta.reserva.cliente || 'N/A'} está ${Math.abs(alerta.diasRestantes)} dia(s) atrasada. Progresso: ${Math.round(alerta.progresso)}%`,
            tipo: 'ERRO',
            prioridade: 'ALTA',
            reservaId: alerta.reserva.id
          });
          localStorage.setItem(key, 'true');
        } else if (alerta.diasRestantes >= 0 && alerta.diasRestantes <= 3) {
          criarNotificacaoMutation.mutate({
            titulo: `🔔 Prazo urgente - ${alerta.reserva.codigo_completo}`,
            mensagem: `Faltam apenas ${alerta.diasRestantes} dia(s) para a data prevista da reserva ${alerta.reserva.codigo_completo}. Progresso atual: ${Math.round(alerta.progresso)}%`,
            tipo: 'ALERTA',
            prioridade: 'ALTA',
            reservaId: alerta.reserva.id
          });
          localStorage.setItem(key, 'true');
        }
      }
    });
  }, [alertas.length, userId]);

  if (alertas.length === 0) {
    return (
      <PremiumCard
        title="Prazos sob controle"
        icon={CheckCircle}
        iconColor="#10b981"
        headerClassName="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-8 text-emerald-600/60 dark:text-emerald-400/60 space-y-4"
        >
          <div className="p-4 rounded-full bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500/10">
            <CheckCircle size={32} className="opacity-50" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Nenhum prazo crítico</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest mt-1 opacity-70">Todas as reservas estão no cronograma</p>
          </div>
        </motion.div>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard
      title="Alertas de Prazos"
      icon={AlertTriangle}
      iconColor="#f59e0b"
      action={<Badge className="bg-yellow-600 text-white shadow-lg shadow-yellow-600/20">{alertas.length}</Badge>}
      headerClassName="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {alertas.map((alerta) => (
          <motion.div
            key={alerta.reserva.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "group relative flex flex-col p-5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border rounded-3xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden",
              alerta.atrasado 
                ? "border-red-200/50 dark:border-red-500/20 hover:border-red-300 dark:hover:border-red-500/40 hover:shadow-red-500/10" 
                : alerta.diasRestantes <= 3 
                  ? "border-orange-200/50 dark:border-orange-500/20 hover:border-orange-300 dark:hover:border-orange-500/40 hover:shadow-orange-500/10" 
                  : "border-yellow-200/50 dark:border-yellow-500/20 hover:border-yellow-300 dark:hover:border-yellow-500/40 hover:shadow-yellow-500/10"
            )}
          >
            {/* Premium glass hover effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className={cn(
              "absolute inset-y-0 left-0 w-1.5 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out",
              alerta.atrasado ? "bg-gradient-to-b from-red-400 to-red-600" :
              alerta.diasRestantes <= 3 ? "bg-gradient-to-b from-orange-400 to-orange-600" :
              "bg-gradient-to-b from-yellow-400 to-yellow-600"
            )} />

            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded-md font-mono text-[10px] font-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5">
                    {alerta.reserva.codigo_completo}
                  </span>
                  {alerta.atrasado && (
                    <Badge className="font-black uppercase tracking-widest text-[9px] px-2 py-0 border-0 bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400">
                      Atrasado
                    </Badge>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                  {alerta.reserva.cliente || 'Sem cliente'}
                </h3>
              </div>
              <div className="flex flex-col items-end">
                <span className={cn(
                  "text-2xl font-black leading-none tracking-tighter",
                  alerta.atrasado ? "text-red-600 dark:text-red-400" :
                  alerta.diasRestantes <= 3 ? "text-orange-600 dark:text-orange-400" :
                  "text-yellow-600 dark:text-yellow-400"
                )}>
                  {alerta.atrasado ? `-${Math.abs(alerta.diasRestantes)}` : alerta.diasRestantes}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">
                  {alerta.atrasado ? "Dias Atraso" : "Dias Rest."}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5 opacity-50" />
                <span>{format(new Date(alerta.reserva.data_prevista), 'dd/MM/yy', { locale: ptBR })}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 justify-end">
                <Package className="w-3.5 h-3.5 opacity-50" />
                <span>{alerta.reserva.quantidade_baixada || 0} / {alerta.reserva.quantidade}</span>
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-slate-200/50 dark:border-white/5">
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Progresso</span>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{Math.round(alerta.progresso)}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden shadow-inner border border-slate-200/50 dark:border-white/5">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-out",
                    alerta.progresso >= 100 ? "bg-emerald-500" :
                    alerta.progresso >= 50 ? "bg-blue-500" :
                    "bg-slate-400 dark:bg-slate-500"
                  )}
                  style={{ width: `${Math.min(alerta.progresso, 100)}%` }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </PremiumCard>
  );
}