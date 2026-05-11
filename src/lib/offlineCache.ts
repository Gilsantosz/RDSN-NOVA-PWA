/**
 * RDSN NOVA — Offline Cache System
 * Garante funcionamento do app mesmo sem conexão com Supabase.
 * Usa localStorage com TTL inteligente por entidade.
 */

const CACHE_PREFIX = 'rdsn_cache_';
const DEFAULT_TTL_MS = 1000 * 60 * 30; // 30 minutos

// TTL específico por entidade (dados que mudam menos ficam mais tempo)
const ENTITY_TTL: Record<string, number> = {
  Setor: 1000 * 60 * 60 * 24,       // 24h — setores raramente mudam
  Produto: 1000 * 60 * 60 * 4,      // 4h
  UsuarioInterno: 1000 * 60 * 60 * 2, // 2h
  ConfiguracaoGeral: 1000 * 60 * 60 * 12, // 12h
  ReservaLote: 1000 * 60 * 15,      // 15min — reservas mudam com frequência
  BaixaLote: 1000 * 60 * 15,        // 15min
  Alerta: 1000 * 60 * 10,           // 10min
  Notificacao: 1000 * 60 * 10,      // 10min
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  entity: string;
}

export class OfflineCache {
  private static getKey(entity: string, qualifier?: string): string {
    return `${CACHE_PREFIX}${entity}${qualifier ? '_' + qualifier : ''}`;
  }

  static set<T>(entity: string, data: T, qualifier?: string): void {
    try {
      const ttl = ENTITY_TTL[entity] ?? DEFAULT_TTL_MS;
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        entity,
      };
      localStorage.setItem(this.getKey(entity, qualifier), JSON.stringify(entry));
    } catch (e) {
      // localStorage cheio — limpar entradas expiradas
      this.pruneExpired();
    }
  }

  static get<T>(entity: string, qualifier?: string): T | null {
    try {
      const raw = localStorage.getItem(this.getKey(entity, qualifier));
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      const age = Date.now() - entry.timestamp;
      if (age > entry.ttl) {
        // Expirado — mas mantém por até 2x o TTL em modo offline
        if (!navigator.onLine && age < entry.ttl * 2) {
          return entry.data; // Dados stale OK quando offline
        }
        localStorage.removeItem(this.getKey(entity, qualifier));
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  }

  static invalidate(entity: string, qualifier?: string): void {
    localStorage.removeItem(this.getKey(entity, qualifier));
  }

  static invalidateAll(): void {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  }

  static pruneExpired(): void {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(key => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const entry: CacheEntry<any> = JSON.parse(raw);
        if (Date.now() - entry.timestamp > entry.ttl * 2) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    });
  }

  static isStale(entity: string, qualifier?: string): boolean {
    try {
      const raw = localStorage.getItem(this.getKey(entity, qualifier));
      if (!raw) return true;
      const entry: CacheEntry<any> = JSON.parse(raw);
      return Date.now() - entry.timestamp > entry.ttl;
    } catch {
      return true;
    }
  }
}
