import { useEffect, useState } from 'react';
import { ConnectionManager } from '../../lib/connectionManager';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

type Status = 'online' | 'offline' | 'reconnecting' | 'paused';

const STATUS_CONFIG: Record<Status, {
  bg: string;
  icon: React.ComponentType<any>;
  text: string;
  spin?: boolean;
}> = {
  online: {
    bg: 'bg-emerald-500/90',
    icon: Wifi,
    text: 'Conectado ao servidor',
  },
  offline: {
    bg: 'bg-red-500/90',
    icon: WifiOff,
    text: 'Sem conexão — usando dados em cache',
  },
  reconnecting: {
    bg: 'bg-amber-500/90',
    icon: RefreshCw,
    text: 'Reconectando ao servidor...',
    spin: true,
  },
  paused: {
    bg: 'bg-orange-600/90',
    icon: AlertTriangle,
    text: 'Servidor temporariamente indisponível — tentando reconectar',
  },
};

export function ConnectionStatusBar() {
  const [status, setStatus] = useState<Status>(ConnectionManager.status);
  const [visible, setVisible] = useState(false);
  const [showOnline, setShowOnline] = useState(false);

  useEffect(() => {
    const unsub = ConnectionManager.subscribe((s) => {
      setStatus(s);
      if (s !== 'online') {
        setVisible(true);
        setShowOnline(false);
      } else {
        setShowOnline(true);
        setVisible(true);
        // Esconde a barra "online" após 3s
        setTimeout(() => setVisible(false), 3000);
      }
    });
    return unsub;
  }, []);

  if (!visible) return null;

  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2
        px-4 py-2 text-white text-sm font-medium
        backdrop-blur-md shadow-lg transition-all duration-500
        ${cfg.bg}
      `}
      style={{ animationFillMode: 'forwards' }}
    >
      <Icon
        size={15}
        className={cfg.spin ? 'animate-spin' : ''}
        aria-hidden
      />
      <span>{cfg.text}</span>
      {status !== 'online' && status !== 'reconnecting' && (
        <button
          onClick={() => ConnectionManager.retryNow()}
          className="ml-3 px-2 py-0.5 rounded text-xs bg-white/20 hover:bg-white/30 transition-colors flex items-center gap-1"
        >
          <RefreshCw size={11} />
          Tentar agora
        </button>
      )}
    </div>
  );
}
