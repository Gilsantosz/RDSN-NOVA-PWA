import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function useNotifications(userId) {
  const queryClient = useQueryClient();

  // Buscar notificações
  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ['notificacoes', userId],
    queryFn: async () => {
      if (!userId) return [];
      return await base44.entities.Notificacao.filter(
        { usuario_id: userId, arquivada: false },
        '-created_at',
        50
      );
    },
    enabled: !!userId,
    refetchInterval: 10000, // Atualiza a cada 10 segundos
  });

  // Notificações não lidas
  const naoLidas = notificacoes.filter(n => !n.lida);

  // Mutation para marcar como lida
  const marcarComoLidaMutation = useMutation({
    mutationFn: async (notificacaoId) => {
      await base44.entities.Notificacao.update(notificacaoId, { lida: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });

  // Mutation para arquivar
  const arquivarMutation = useMutation({
    mutationFn: async (notificacaoId) => {
      await base44.entities.Notificacao.update(notificacaoId, { arquivada: true });
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
        base44.entities.Notificacao.update(n.id, { lida: true })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      toast.success('Todas as notificações foram marcadas como lidas');
    },
  });

  // Reproduzir som para novas notificações
  useEffect(() => {
    if (naoLidas.length > 0) {
      const ultimaNotificacao = naoLidas[0];
      const tempoDesdeNotificacao = Date.now() - new Date(ultimaNotificacao.created_at).getTime();
      
      // Se a notificação foi criada há menos de 5 segundos, é nova
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
    const audio = new Audio();
    // Usar diferentes frequências para diferentes prioridades
    const context = new (window.AudioContext || window.webkitAudioContext)();
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
      return await base44.entities.Notificacao.create({
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