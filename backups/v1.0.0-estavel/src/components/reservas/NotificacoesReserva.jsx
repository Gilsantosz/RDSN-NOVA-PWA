import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Check, X, AlertTriangle, Info, CheckCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificacoesReserva({ userId }) {
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const queryClient = useQueryClient();

  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ['notificacoes-reserva', userId],
    queryFn: async () => {
      const todas = await base44.entities.Notificacao.filter(
        { usuario_id: userId },
        '-created_at',
        50
      );
      return todas;
    },
    enabled: !!userId,
    refetchInterval: 30000
  });

  const marcarLidaMutation = useMutation({
    mutationFn: async (notificacaoId) => {
      await base44.entities.Notificacao.update(notificacaoId, { lida: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes-reserva'] });
    }
  });

  const marcarTodasLidasMutation = useMutation({
    mutationFn: async () => {
      const naoLidas = notificacoes.filter(n => !n.lida);
      await Promise.all(
        naoLidas.map(n => base44.entities.Notificacao.update(n.id, { lida: true }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes-reserva'] });
      toast.success('Todas as notificações marcadas como lidas');
    }
  });

  const arquivarMutation = useMutation({
    mutationFn: async (notificacaoId) => {
      await base44.entities.Notificacao.update(notificacaoId, { arquivada: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes-reserva'] });
    }
  });

  const naoLidas = notificacoes.filter(n => !n.lida && !n.arquivada);
  const exibir = mostrarTodas ? notificacoes.filter(n => !n.arquivada) : naoLidas;

  const getIconByType = (tipo) => {
    switch (tipo) {
      case 'ERRO': return AlertTriangle;
      case 'ALERTA': return AlertTriangle;
      case 'SUCESSO': return CheckCircle;
      default: return Info;
    }
  };

  const getColorByType = (tipo) => {
    switch (tipo) {
      case 'ERRO': return 'text-red-600 bg-red-50 border-red-200';
      case 'ALERTA': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'SUCESSO': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-slate-500">
            <Bell className="w-4 h-4 animate-pulse" />
            <span className="text-sm">Carregando notificações...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificações de Reservas
            {naoLidas.length > 0 && (
              <Badge className="bg-red-500 text-white ml-2">
                {naoLidas.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMostrarTodas(!mostrarTodas)}
            >
              {mostrarTodas ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </Button>
            {naoLidas.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => marcarTodasLidasMutation.mutate()}
                disabled={marcarTodasLidasMutation.isPending}
              >
                <Check className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {exibir.length === 0 ? (
          <div className="text-center py-8">
            <BellOff className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {mostrarTodas ? 'Nenhuma notificação' : 'Sem notificações não lidas'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {exibir.map((notif) => {
                const Icon = getIconByType(notif.tipo);
                const colorClass = getColorByType(notif.tipo);

                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={cn(
                      "border rounded-lg p-4 transition-all",
                      notif.lida ? "bg-slate-50 border-slate-200" : colorClass
                    )}
                  >
                    <div className="flex gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        notif.lida ? "bg-slate-200" : ""
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className={cn(
                              "font-semibold text-sm",
                              notif.lida ? "text-slate-700" : ""
                            )}>
                              {notif.titulo}
                            </h4>
                            <p className={cn(
                              "text-sm mt-1",
                              notif.lida ? "text-slate-600" : "text-current opacity-90"
                            )}>
                              {notif.mensagem}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(notif.created_at).toLocaleString('pt-BR')}
                              </span>
                              {notif.prioridade && (
                                <Badge variant="outline" className="text-xs">
                                  {notif.prioridade}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {!notif.lida && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => marcarLidaMutation.mutate(notif.id)}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => arquivarMutation.mutate(notif.id)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}