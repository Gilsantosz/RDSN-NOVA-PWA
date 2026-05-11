/**
 * RDSN NOVA — Connection Manager
 * Detecta falhas de conexão com Supabase, implementa retry automático
 * e mantém o estado de conectividade para o UI.
 */

type ConnectionStatus = 'online' | 'offline' | 'reconnecting' | 'paused';

type Listener = (status: ConnectionStatus) => void;

const RETRY_DELAYS = [2000, 5000, 10000, 20000, 30000]; // backoff progressivo
const HEALTH_CHECK_INTERVAL = 30000; // checa a cada 30s quando offline
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://saczzyiofmlvygsopfws.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_vJ6z25g7TcVrhrsmHIESiA_EOr9lYVr';

class ConnectionManagerClass {
  private _status: ConnectionStatus = 'online';
  private _listeners: Set<Listener> = new Set();
  private _retryCount = 0;
  private _healthTimer: ReturnType<typeof setTimeout> | null = null;
  private _checkInProgress = false;

  get status(): ConnectionStatus { return this._status; }
  get isOnline(): boolean { return this._status === 'online'; }

  private setStatus(s: ConnectionStatus) {
    if (this._status === s) return;
    this._status = s;
    this._listeners.forEach(fn => fn(s));
    console.log(`[RDSN Connection] Status: ${s}`);
  }

  subscribe(fn: Listener): () => void {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /** Chamado pelo supabaseClient quando uma query falha */
  async reportError(error: any): Promise<void> {
    const isNetworkError = this.isNetworkError(error);
    const isPaused = this.isPausedError(error);

    if (isPaused) {
      this.setStatus('paused');
      this.scheduleHealthCheck(5000);
    } else if (isNetworkError) {
      this.setStatus('offline');
      this.scheduleHealthCheck(RETRY_DELAYS[Math.min(this._retryCount, RETRY_DELAYS.length - 1)]);
      this._retryCount++;
    }
  }

  /** Chamado quando uma query tem sucesso */
  reportSuccess(): void {
    this._retryCount = 0;
    if (this._status !== 'online') {
      this.setStatus('online');
      if (this._healthTimer) {
        clearTimeout(this._healthTimer);
        this._healthTimer = null;
      }
    }
  }

  private isNetworkError(error: any): boolean {
    if (!error) return false;
    const msg = (error.message || '').toLowerCase();
    return (
      msg.includes('enotfound') ||
      msg.includes('econnrefused') ||
      msg.includes('network') ||
      msg.includes('fetch') ||
      msg.includes('failed to fetch') ||
      msg.includes('load failed') ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED'
    );
  }

  private isPausedError(error: any): boolean {
    if (!error) return false;
    const msg = (error.message || '').toLowerCase();
    const code = error.code || '';
    return (
      msg.includes('project is paused') ||
      msg.includes('503') ||
      code === '503' ||
      error.status === 503
    );
  }

  private scheduleHealthCheck(delay: number) {
    if (this._healthTimer) clearTimeout(this._healthTimer);
    this._healthTimer = setTimeout(() => this.healthCheck(), delay);
  }

  async healthCheck(): Promise<boolean> {
    if (this._checkInProgress) return false;
    this._checkInProgress = true;
    this.setStatus('reconnecting');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/UsuarioInterno?limit=1&select=id`,
        {
          signal: controller.signal,
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );
      clearTimeout(timeout);

      if (res.ok || res.status === 406) {
        // 406 = tabela não autorizada mas projeto online
        this.reportSuccess();
        this._checkInProgress = false;
        return true;
      }

      if (res.status === 503) {
        this.setStatus('paused');
        this.scheduleHealthCheck(10000);
      } else {
        this.setStatus('offline');
        this.scheduleHealthCheck(RETRY_DELAYS[Math.min(this._retryCount, RETRY_DELAYS.length - 1)]);
        this._retryCount++;
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        this.setStatus('offline');
      }
      this.scheduleHealthCheck(RETRY_DELAYS[Math.min(this._retryCount, RETRY_DELAYS.length - 1)]);
      this._retryCount++;
    }

    this._checkInProgress = false;
    return false;
  }

  /** Força tentativa imediata de reconexão */
  async retryNow(): Promise<boolean> {
    this._retryCount = 0;
    return this.healthCheck();
  }
}

export const ConnectionManager = new ConnectionManagerClass();

// Escuta eventos nativos do browser
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[RDSN Connection] Browser online event');
    ConnectionManager.retryNow();
  });
  window.addEventListener('offline', () => {
    console.log('[RDSN Connection] Browser offline event');
  });
}
