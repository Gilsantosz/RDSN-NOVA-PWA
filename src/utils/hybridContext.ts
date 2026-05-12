/**
 * Utility for Hybrid Application (Electron + PWA)
 * Safely isolates logic between browser and desktop environments.
 */

declare global {
  interface Window {
    process?: any;
    require?: any;
  }
  interface Navigator {
    standalone?: boolean;
  }
}

export const isElectron = (): boolean => {
  if (typeof window !== 'undefined' && window.process?.type === 'renderer') return true;
  if (typeof process !== 'undefined' && !!(process as any).versions?.electron) return true;
  if (typeof navigator === 'object' && navigator.userAgent?.includes('Electron')) return true;
  return false;
};

export const isPWA = (): boolean => {
  return !isElectron() && (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (typeof navigator !== 'undefined' && (navigator as any).standalone === true)
  );
};

export interface SafeIpcRenderer {
  on: (channel: string, listener: (...args: any[]) => void) => void;
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  removeListener: (channel: string, listener: (...args: any[]) => void) => void;
}

export const safeIpcRenderer = (): SafeIpcRenderer => {
  if (isElectron() && typeof window !== 'undefined' && window.require) {
    try {
      return window.require('electron').ipcRenderer;
    } catch (e) {
      console.warn('[HybridCtx] ipcRenderer unavailable:', e);
    }
  }
  // No-op fallback para PWA/Web
  return {
    on: () => {},
    send: () => {},
    invoke: async () => {},
    removeListener: () => {},
  };
};

export interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isDesktop: boolean;
}

/**
 * Retorna as variáveis de ambiente Supabase.
 * Prioridade única: import.meta.env (Vite injeta em dev e build).
 * Sem fallback para secure_vault — credenciais vêm APENAS do .env.
 */
export const getEnvConfig = (): EnvConfig => {
  const isDesk = isElectron();

  // Suporta tanto VITE_SUPABASE_URL quanto variantes com prefixo por ambiente
  const url =
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.VITE_RDSN_SUPABASE_URL ||
    (isDesk ? import.meta.env.VITE_ELECTRON_SUPABASE_URL : import.meta.env.VITE_PWA_SUPABASE_URL) ||
    '';

  const key =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_RDSN_SUPABASE_ANON_KEY ||
    (isDesk ? import.meta.env.VITE_ELECTRON_SUPABASE_ANON_KEY : import.meta.env.VITE_PWA_SUPABASE_ANON_KEY) ||
    '';

  if (!url || !key) {
    console.error(
      '[HybridCtx] ⚠️  Supabase URL/Key não configuradas!\n' +
      'Verifique o arquivo .env: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios.'
    );
  }

  return { supabaseUrl: url, supabaseAnonKey: key, isDesktop: isDesk };
};
