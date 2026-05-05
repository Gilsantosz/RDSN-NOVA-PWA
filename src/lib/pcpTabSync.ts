/**
 * pcpTabSync.ts
 *
 * Utilitário de sincronização cross-tab usando BroadcastChannel API.
 * Permite que mutações em uma aba invalidem queries em todas as outras
 * abas abertas na mesma origin — sem WebSocket, sem polling, sem dependências extras.
 *
 * Degradação graciosa: se BroadcastChannel não estiver disponível (ex.: Safari antigo),
 * as funções simplesmente não fazem nada e a app continua funcionando normalmente.
 */

export const PCP_SYNC_CHANNEL = 'rdsn-pcp-sync';

export type PCPSyncEvent = {
  type: 'query-invalidated';
  /** Array de queryKeys para invalidar — cada item é uma queryKey do React Query */
  queryKeys: (string | number | null | undefined)[][];
  /** Timestamp para debug */
  ts: number;
};

/**
 * Transmite invalidações de query para todas as outras abas abertas.
 * Chame isso no `onSuccess` de qualquer mutation que altere dados PCP.
 *
 * @example
 * onSuccess: () => {
 *   broadcastPCPInvalidate([
 *     ['pcp-ops', mes, ano, setorAtivo],
 *     ['pcp-producoes', mes, ano, setorAtivo],
 *   ]);
 * }
 */
export function broadcastPCPInvalidate(
  queryKeys: (string | number | null | undefined)[][]
): void {
  try {
    const ch = new BroadcastChannel(PCP_SYNC_CHANNEL);
    const event: PCPSyncEvent = {
      type: 'query-invalidated',
      queryKeys,
      ts: Date.now(),
    };
    ch.postMessage(event);
    ch.close(); // fecha imediatamente — não precisamos manter aberto
  } catch {
    // BroadcastChannel não suportado: sem sincronização, sem crash
  }
}
