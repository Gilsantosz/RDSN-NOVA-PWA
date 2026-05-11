import { useEffect, useState, useCallback } from 'react';
import { Download, RefreshCw, CheckCircle2, AlertCircle, ArrowUpCircle } from 'lucide-react';

type UpdateStatus =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'up-to-date' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; percent: number }
  | { status: 'downloaded'; version: string }
  | { status: 'error'; message: string }
  | { status: 'pwa-ready' }; // Service Worker PWA

// ── Hook PWA (Service Worker) ──────────────────────
function usePWAUpdate() {
  const [pwaReady, setPwaReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      setRegistration(reg);

      // Verifica se já existe um SW esperando
      if (reg.waiting) {
        setPwaReady(true);
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setPwaReady(true);
          }
        });
      });
    });

    // Detecta quando o SW controlador muda (após skipWaiting)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }, []);

  const applyPWAUpdate = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [registration]);

  return { pwaReady, applyPWAUpdate };
}

// ── Componente Principal ───────────────────────────
export function AppUpdateBanner() {
  const [updateState, setUpdateState] = useState<UpdateStatus>({ status: 'idle' });
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
  const { pwaReady, applyPWAUpdate } = usePWAUpdate();

  // Electron: escuta eventos IPC
  useEffect(() => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;

    api.onUpdateStatus((payload: any) => {
      setUpdateState(payload);
    });
  }, [isElectron]);

  // PWA: mostra banner quando SW está pronto
  useEffect(() => {
    if (!isElectron && pwaReady) {
      setUpdateState({ status: 'pwa-ready' });
    }
  }, [pwaReady, isElectron]);

  const handleInstall = async () => {
    if (isElectron && updateState.status === 'downloaded') {
      await (window as any).electronAPI.installUpdate();
    } else if (!isElectron && updateState.status === 'pwa-ready') {
      applyPWAUpdate();
    }
  };

  // ── Nada a mostrar ──
  if (updateState.status === 'idle' || updateState.status === 'up-to-date') return null;

  // ── Config visual por estado ──
  const config: Record<string, { bg: string; icon: React.ComponentType<any>; text: string; cta?: string; spin?: boolean }> = {
    checking: {
      bg: 'bg-slate-700/95',
      icon: RefreshCw,
      text: 'Verificando atualizações...',
      spin: true,
    },
    available: {
      bg: 'bg-blue-600/95',
      icon: ArrowUpCircle,
      text: `Nova versão ${(updateState as any).version} disponível — baixando automaticamente`,
    },
    downloading: {
      bg: 'bg-blue-700/95',
      icon: Download,
      text: `Baixando atualização ${(updateState as any).percent ?? 0}%`,
      spin: true,
    },
    downloaded: {
      bg: 'bg-emerald-600/95',
      icon: CheckCircle2,
      text: `Versão ${(updateState as any).version} pronta — reinicie para aplicar`,
      cta: 'Reiniciar agora',
    },
    'pwa-ready': {
      bg: 'bg-emerald-600/95',
      icon: CheckCircle2,
      text: 'Nova versão disponível para o app instalado',
      cta: 'Atualizar agora',
    },
    error: {
      bg: 'bg-red-700/95',
      icon: AlertCircle,
      text: 'Falha ao verificar atualização',
    },
  };

  const cfg = config[updateState.status] ?? config.checking;
  const Icon = cfg.icon;

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-[9998]
        flex items-center gap-3 px-4 py-3
        rounded-2xl shadow-2xl text-white text-sm font-semibold
        backdrop-blur-md border border-white/10
        transition-all duration-500 animate-in slide-in-from-bottom-4
        max-w-sm
        ${cfg.bg}
      `}
    >
      <Icon size={18} className={cfg.spin ? 'animate-spin' : ''} aria-hidden />

      <span className="flex-1 leading-tight">{cfg.text}</span>

      {cfg.cta && (
        <button
          onClick={handleInstall}
          className="ml-2 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-xs font-bold whitespace-nowrap"
        >
          {cfg.cta}
        </button>
      )}

      {updateState.status !== 'downloaded' && updateState.status !== 'pwa-ready' && (
        <button
          onClick={() => setUpdateState({ status: 'idle' })}
          className="ml-1 text-white/50 hover:text-white/90 text-lg leading-none font-light"
          aria-label="Fechar"
        >
          ×
        </button>
      )}
    </div>
  );
}
