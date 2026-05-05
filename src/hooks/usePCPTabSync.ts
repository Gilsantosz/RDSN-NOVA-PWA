/**
 * usePCPTabSync.ts
 *
 * Hook que escuta mensagens de sincronização cross-tab e invalida
 * as queries afetadas no React Query cache desta aba.
 *
 * Uso: adicione `usePCPTabSync()` em qualquer página PCP que precise
 * se manter sincronizada com outras abas.
 *
 * @example
 * // Em PCPProgramacaoMensal.tsx
 * export default function PCPProgramacaoMensal() {
 *   usePCPTabSync();
 *   // ...resto do componente
 * }
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PCP_SYNC_CHANNEL, type PCPSyncEvent } from '@/lib/pcpTabSync';

export function usePCPTabSync(): void {
  const qc = useQueryClient();

  useEffect(() => {
    let ch: BroadcastChannel | null = null;

    try {
      ch = new BroadcastChannel(PCP_SYNC_CHANNEL);

      ch.onmessage = (e: MessageEvent<PCPSyncEvent>) => {
        if (e.data?.type !== 'query-invalidated') return;

        // Invalida cada query key recebida — o React Query vai refetch automaticamente
        // se algum componente estiver mounted e observando aquela query
        e.data.queryKeys.forEach(queryKey => {
          qc.invalidateQueries({ queryKey });
        });
      };

      ch.onmessageerror = () => {
        // Mensagem malformada: ignorar silenciosamente
      };
    } catch {
      // BroadcastChannel não suportado: sem crash, sem sincronização
    }

    return () => {
      try { ch?.close(); } catch { /* sem crash no cleanup */ }
    };
  }, [qc]); // qc é estável (referência do QueryClient), então só registra 1x
}
