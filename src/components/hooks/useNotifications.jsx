import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function useNotifications(userId) {
  const queryClient = useQueryClient();

  // Buscar notificações
  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ['notificacoes', userId],
    queryFn: async () => {
      if (!userId) return [];
      return await rdsn.entities.Notificacao.filter(
        { usuario_id: userId, arquivada: false },
        '-created_at',
        50
      );
    },
    enabled: !!userId,
    refetchInterval: 30000, // Polling de backup — o realtime cuida da atualização imediata
  });

  // Notificações não lidas
  const naoLidas = notificacoes.filter(n => !n.lida);

  // Mutation para marcar como lida
  const marcarComoLidaMutation = useMutation({
    mutationFn: async (notificacaoId) => {
      await rdsn.entities.Notificacao.update(notificacaoId, { lida: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });

  // Mutation para arquivar
  const arquivarMutation = useMutation({
    mutationFn: async (notificacaoId) => {
      await rdsn.entities.Notificacao.update(notificacaoId, { arquivada: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      toast.success('Notificação arquivada');
    },
  });

  // Mutation para marcar todas como lidas
  const marcarTodasComoLidasMutation = useMutation({
    mutationFn: async () => {
      const promises = naoLidas.map(n => 
        rdsn.entities.Notificacao.update(n.id, { lida: true })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      toast.success('Todas as notificações foram marcadas como lidas');
    },
  });

  // Subscribe em tempo real — atualiza o NotificationCenter instantaneamente
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = rdsn.entities.Notificacao.subscribe((event) => {
      const rec = event.new;
      // Só reage a registros deste usuário que não foram arquivados
      if (rec && rec.usuario_id === userId && !rec.arquivada) {
        queryClient.invalidateQueries({ queryKey: ['notificacoes', userId] });
        // Toca o som apenas em INSERTs (notificação nova chegando)
        if (event.eventType === 'INSERT' || event.type === 'INSERT') {
          playNotificationSound(rec.prioridade);
        }
      }
    });
    return () => unsubscribe();
  }, [userId, queryClient]);

  // Reproduzir som para novas notificações detectadas via polling (fallback)
  useEffect(() => {
    if (naoLidas.length > 0) {
      const ultimaNotificacao = naoLidas[0];
      const tempoDesdeNotificacao = Date.now() - new Date(ultimaNotificacao.created_at).getTime();
      if (tempoDesdeNotificacao < 5000) {
        playNotificationSound(ultimaNotificacao.prioridade);
      }
    }
  }, [naoLidas.length]);

  return {
    notificacoes,
    naoLidas,
    isLoading,
    marcarComoLida: marcarComoLidaMutation.mutate,
    arquivar: arquivarMutation.mutate,
    marcarTodasComoLidas: marcarTodasComoLidasMutation.mutate,
  };
}

// Função para reproduzir som de notificação
function playNotificationSound(prioridade) {
  try {
    // Sintetiza o som diretamente via Web Audio API (sem arquivo de áudio externo)
    const context = new (window.AudioContext || window['webkitAudioContext'])();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    // Ajustar frequência baseado na prioridade
    switch (prioridade) {
      case 'CRITICA':
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.3;
        break;
      case 'ALTA':
        oscillator.frequency.value = 600;
        gainNode.gain.value = 0.2;
        break;
      case 'MEDIA':
        oscillator.frequency.value = 450;
        gainNode.gain.value = 0.15;
        break;
      default:
        oscillator.frequency.value = 350;
        gainNode.gain.value = 0.1;
    }
    
    oscillator.type = 'sine';
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.15);
    
    // Vibração para dispositivos móveis
    if (navigator.vibrate && prioridade === 'CRITICA') {
      navigator.vibrate([100, 50, 100]);
    }
  } catch (error) {
    console.log('Som de notificação não disponível:', error);
  }
}

// Hook para criar notificações
export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ titulo, mensagem, tipo = 'INFO', prioridade = 'MEDIA', usuario_id, link_relacionado, entidade_tipo, entidade_id }) => {
      return await rdsn.entities.Notificacao.create({
        titulo,
        mensagem,
        tipo,
        prioridade,
        usuario_id,
        link_relacionado,
        entidade_tipo,
        entidade_id,
        lida: false,
        arquivada: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });
}