/**
 * Utility for Hybrid Application (Electron + PWA)
 * safely isolates logic between browser and desktop environments.
 */
import { getSecret } from '../api/secure_vault';

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
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') return true;
  if (typeof process !== 'undefined' && (process as any).versions && !!(process as any).versions.electron) return true;
  if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) return true;
  return false;
};

export const isPWA = (): boolean => {
  return !isElectron() && (
    (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (typeof navigator !== 'undefined' && navigator.standalone === true)
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
      console.warn('Electron ipcRenderer fetch failed', e);
    }
  }
  // Mock fallback para Web/PWA
  return {
    on: () => {},
    send: () => {},
    invoke: async () => {},
    removeListener: () => {}
  };
};

export interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isDesktop: boolean;
}

/**
 * Retorna as variáveis de ambiente baseadas no contexto (Teste Web vs Prod Desktop)
 * Regra: se está rodando no Desktop, procura VITE_ELECTRON_SUPABASE_URL, senão VITE_SUPABASE_URL (ou VITE_RDSN_SUPABASE_URL)
 * Se estiver no PWA/Web, procura VITE_PWA_SUPABASE_URL, e cai para os defaults.
 */
export const getEnvConfig = (): EnvConfig => {
    const isDesk = isElectron();
    
    // Obter as credenciais com fallback lógico dependendo do ambiente
    const url = isDesk 
      ? (import.meta.env.VITE_ELECTRON_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_RDSN_SUPABASE_URL)
      : (import.meta.env.VITE_PWA_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_RDSN_SUPABASE_URL);

    const key = isDesk
      ? (import.meta.env.VITE_ELECTRON_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_RDSN_SUPABASE_ANON_KEY)
      : (import.meta.env.VITE_PWA_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_RDSN_SUPABASE_ANON_KEY);

    return {
        supabaseUrl: url || getSecret('VITE_SUPABASE_URL') || '',
        supabaseAnonKey: key || getSecret('VITE_SUPABASE_ANON_KEY') || '',
        isDesktop: isDesk
    };
};
