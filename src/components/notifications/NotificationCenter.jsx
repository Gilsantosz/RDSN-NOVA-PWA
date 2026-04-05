import React, { useState } from 'react';
import { useNotifications } from '@/components/hooks/useNotifications';
import { Bell, Check, Trash2, AlertCircle, Info, CheckCircle, XCircle, ExternalLink, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const tipoIconMap = {
  INFO: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  ALERTA: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  ERRO: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  SUCESSO: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }
};

const prioridadeConfig = {
  CRITICA: { label: 'Crítica', color: 'bg-red-600', pulse: true },
  ALTA: { label: 'Alta', color: 'bg-orange-500', pulse: false },
  MEDIA: { label: 'Média', color: 'bg-blue-500', pulse: false },
  BAIXA: { label: 'Baixa', color: 'bg-slate-400', pulse: false },
};

export default function NotificationCenter({ userId }) {
  const [open, setOpen] = useState(false);
  const {
    notificacoes,
    naoLidas,
    isLoading,
    marcarComoLida,
    arquivar,
    marcarTodasComoLidas,
  } = useNotifications(userId);

  const unreadCount = naoLidas.length;

  // Agrupar notificações por lida/não lida
  const notificacoesAgrupadas = notificacoes.reduce((acc, notif) => {
    const grupo = notif.lida ? 'lidas' : 'naoLidas';
    if (!acc[grupo]) acc[grupo] = [];
    acc[grupo].push(notif);
    return acc;
  }, { naoLidas: [], lidas: [] });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <motion.button 
          className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label={`Notificações. ${unreadCount > 0 ? `${unreadCount} não lidas` : 'Nenhuma não lida'}`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Bell className={cn(
            "w-5 h-5 transition-colors",
            unreadCount > 0 ? "text-blue-600" : "text-slate-600"
          )} aria-hidden="true" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </PopoverTrigger>

      <PopoverContent className="w-[420px] p-0 shadow-xl" align="end">
        <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Notificações</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-slate-600">{unreadCount} não lida{unreadCount > 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
            {naoLidas.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => marcarTodasComoLidas()}
                className="text-xs hover:bg-white"
              >
                <Check className="w-3 h-3 mr-1" />
                Marcar todas
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[500px]">
          {notificacoes.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bell className="w-8 h-8 opacity-30" />
              </div>
              <p className="font-medium">Nenhuma notificação</p>
              <p className="text-xs mt-1">Você está em dia!</p>
            </div>
          ) : (
            <>
              {/* Notificações Não Lidas */}
              {notificacoesAgrupadas.naoLidas.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                    <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                      Não Lidas ({notificacoesAgrupadas.naoLidas.length})
                    </p>
                  </div>
                  <AnimatePresence>
                    {notificacoesAgrupadas.naoLidas.map((notif) => (
                      <NotificationItem
                        key={notif.id}
                        notif={notif}
                        marcarComoLida={marcarComoLida}
                        arquivar={arquivar}
                        setOpen={setOpen}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Notificações Lidas */}
              {notificacoesAgrupadas.lidas.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Lidas ({notificacoesAgrupadas.lidas.length})
                    </p>
                  </div>
                  {notificacoesAgrupadas.lidas.map((notif) => (
                    <NotificationItem
                      key={notif.id}
                      notif={notif}
                      marcarComoLida={marcarComoLida}
                      arquivar={arquivar}
                      setOpen={setOpen}
                      isRead
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// Componente de Item de Notificação
function NotificationItem({ notif, marcarComoLida, arquivar, setOpen, isRead = false }) {
  const { icon: Icon, color, bg, border } = tipoIconMap[notif.tipo] || tipoIconMap.INFO;
  const prioridadeInfo = prioridadeConfig[notif.prioridade] || prioridadeConfig.MEDIA;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "p-4 border-b border-slate-100 hover:bg-slate-50 transition-all",
        !isRead && "bg-blue-50/30"
      )}
    >
      <div className="flex gap-3">
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center mt-1",
          bg, border, "border"
        )}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={cn(
              "text-sm text-slate-900",
              !isRead ? "font-semibold" : "font-medium"
            )}>
              {notif.titulo}
            </h4>
            {notif.prioridade && notif.prioridade !== 'BAIXA' && (
              <Badge 
                className={cn(
                  "text-xs px-2 py-0 text-white",
                  prioridadeInfo.color,
                  prioridadeInfo.pulse && "animate-pulse"
                )}
              >
                {prioridadeInfo.label}
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-slate-600 mb-2 line-clamp-2">{notif.mensagem}</p>
          
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(notif.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </span>
            
            <div className="flex items-center gap-1">
              {notif.link_relacionado && (
                <Link
                  to={notif.link_relacionado}
                  onClick={() => {
                    setOpen(false);
                    if (!isRead) marcarComoLida(notif.id);
                  }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs hover:bg-blue-100"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Abrir
                  </Button>
                </Link>
              )}
              
              {!isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    marcarComoLida(notif.id);
                  }}
                  className="h-7 text-xs hover:bg-green-100"
                  title="Marcar como lida"
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  arquivar(notif.id);
                }}
                className="h-7 text-xs hover:bg-red-100 text-slate-600"
                title="Arquivar notificação"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}