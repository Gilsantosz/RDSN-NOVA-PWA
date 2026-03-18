import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Check, X, AlertTriangle, Info, CheckCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { PremiumCard } from '@/components/ui/PremiumCard';

export default function NotificacoesReserva({ userId }) {
  const queryClient = useQueryClient();
  const [mostrarTodas, setMostrarTodas] = useState(false);

  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ['notificacoes-reserva', userId],
    queryFn: async () => {
      if (!userId) return [];
      return await rdsn.entities.Notificacao.filter({
        usuario_id: userId,
        entidade_tipo: 'ReservaLote',
        arquivada: false
      }, '-created_at', 50);
    },
    enabled: !!userId,
    refetchInterval: 30000 // Atualizar a cada 30s
  });

  const marcarLidaMutation = useMutation({
    mutationFn: (id) => rdsn.entities.Notificacao.update(id, { lida: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes-reserva'] })
  });

  const marcarTodasLidasMutation = useMutation({
    mutationFn: async () => {
      const naoLidas = notificacoes.filter(n => !n.lida);
      for (const n of naoLidas) {
        await rdsn.entities.Notificacao.update(n.id, { lida: true });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes-reserva'] })
  });

  const arquivarMutation = useMutation({
    mutationFn: (id) => rdsn.entities.Notificacao.update(id, { arquivada: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes-reserva'] })
  });

  const naoLidas = notificacoes.filter(n => !n.lida);
  const exibir = mostrarTodas ? notificacoes : naoLidas;

  const getUrgentColor = (prioridade) => {
    switch (prioridade) {
      case 'ALTA': return 'border-red-500/50 bg-red-50/80 dark:bg-red-500/10 shadow-red-500/10';
      case 'MEDIA': return 'border-yellow-500/50 bg-yellow-50/80 dark:bg-yellow-500/10 shadow-yellow-500/10';
      default: return 'border-blue-500/50 bg-blue-50/80 dark:bg-blue-500/10 shadow-blue-500/10';
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'ALERTA': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'ERRO': return <X className="w-5 h-5 text-red-500" />;
      case 'SUCESSO': return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  if (isLoading) {
    return (
      <PremiumCard title="Notificações de Reservas" icon={Bell}>
        <div className="flex items-center gap-2 text-slate-500 py-10 justify-center">
          <Bell className="w-6 h-6 animate-bounce mr-2" />
          <span className="text-sm font-medium">Sincronizando...</span>
        </div>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard
      title="Notificações de Reservas"
      icon={Bell}
      iconColor="#3b82f6"
      action={
        <div className="flex gap-2 items-center">
          {naoLidas.length > 0 && <Badge className="bg-red-500 text-white shadow-lg shadow-red-500/20">{naoLidas.length}</Badge>}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            onClick={() => setMostrarTodas(!mostrarTodas)}
          >
            {mostrarTodas ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </Button>
          {naoLidas.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-emerald-600 transition-colors"
              onClick={() => marcarTodasLidasMutation.mutate()}
              disabled={marcarTodasLidasMutation.isPending}
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {exibir.length === 0 ? (
          <div className="text-center py-8">
            <BellOff className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">Nenhuma notificação {mostrarTodas ? '' : 'não lida'}</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence mode='popLayout'>
              {exibir.map((notif) => (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={cn(
                    "p-4 rounded-3xl border transition-all duration-300 group",
                    notif.lida
                      ? "bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-white/5 opacity-60 hover:opacity-100"
                      : cn("border-l-4 shadow-md backdrop-blur-sm", getUrgentColor(notif.prioridade))
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getTipoIcon(notif.tipo)}
                      </div>
                      <div>
                        <h4 className={cn(
                          "font-bold text-sm tracking-tight",
                          notif.lida ? "text-slate-600 dark:text-slate-400" : "text-slate-900 dark:text-white"
                        )}>
                          {notif.titulo}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                          {notif.mensagem}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] uppercase font-black tracking-widest text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(notif.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notif.lida && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600"
                          onClick={() => marcarLidaMutation.mutate(notif.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                        onClick={() => arquivarMutation.mutate(notif.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PremiumCard>
  );
}