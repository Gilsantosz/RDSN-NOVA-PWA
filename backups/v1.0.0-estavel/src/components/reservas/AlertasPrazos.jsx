import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, Clock, Package, CheckCircle } from 'lucide-react';
import { differenceInDays, format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function AlertasPrazos({ reservas, userId }) {
  const queryClient = useQueryClient();

  const criarNotificacaoMutation = useMutation({
    mutationFn: async ({ titulo, mensagem, tipo, prioridade, reservaId }) => {
      await base44.entities.Notificacao.create({
        usuario_id: userId,
        titulo,
        mensagem,
        tipo,
        prioridade,
        entidade_tipo: 'ReservaLote',
        entidade_id: reservaId,
        lida: false,
        arquivada: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes-reserva'] });
    }
  });

  // Identificar reservas com prazos críticos
  const reservasComPrazo = reservas.filter(r => 
    r.data_prevista && 
    r.status !== 'CANCELADO' && 
    r.status !== 'LIBERADO' &&
    r.status !== 'PRODUZIDO'
  );

  const alertas = reservasComPrazo.map(reserva => {
    const dataPrevista = new Date(reserva.data_prevista);
    const hoje = new Date();
    const diasRestantes = differenceInDays(dataPrevista, hoje);
    const atrasado = isPast(dataPrevista) && reserva.status !== 'PRODUZIDO';
    const progresso = reserva.quantidade > 0 ? (reserva.quantidade_baixada / reserva.quantidade) * 100 : 0;

    let severidade = 'BAIXA';
    let tipo = 'INFO';

    if (atrasado) {
      severidade = 'ALTA';
      tipo = 'ALERTA';
    } else if (diasRestantes <= 3 && diasRestantes >= 0) {
      severidade = 'ALTA';
      tipo = 'ALERTA';
    } else if (diasRestantes <= 7 && diasRestantes >= 0) {
      severidade = 'MEDIA';
      tipo = 'ALERTA';
    }

    return {
      reserva,
      diasRestantes,
      atrasado,
      progresso,
      severidade,
      tipo
    };
  }).filter(a => (a.atrasado && Math.abs(a.diasRestantes) > 0) || (a.diasRestantes > 0 && a.diasRestantes <= 7));

  // Criar notificações automáticas para prazos críticos
  useEffect(() => {
    if (!userId) return;

    alertas.forEach(alerta => {
      const key = `notif_prazo_${alerta.reserva.id}_${alerta.diasRestantes}`;
      const jaNotificado = localStorage.getItem(key);

      if (!jaNotificado) {
        if (alerta.atrasado && Math.abs(alerta.diasRestantes) > 0) {
          criarNotificacaoMutation.mutate({
            titulo: `⏰ Reserva ${alerta.reserva.codigo_completo} ATRASADA`,
            mensagem: `A reserva ${alerta.reserva.codigo_completo} do cliente ${alerta.reserva.cliente || 'N/A'} está ${Math.abs(alerta.diasRestantes)} dia(s) atrasada. Progresso: ${Math.round(alerta.progresso)}%`,
            tipo: 'ERRO',
            prioridade: 'ALTA',
            reservaId: alerta.reserva.id
          });
          localStorage.setItem(key, 'true');
        } else if (alerta.diasRestantes > 0 && alerta.diasRestantes <= 3) {
          criarNotificacaoMutation.mutate({
            titulo: `🔔 Prazo urgente - ${alerta.reserva.codigo_completo}`,
            mensagem: `Faltam apenas ${alerta.diasRestantes} dia(s) para a data prevista da reserva ${alerta.reserva.codigo_completo}. Progresso atual: ${Math.round(alerta.progresso)}%`,
            tipo: 'ALERTA',
            prioridade: 'ALTA',
            reservaId: alerta.reserva.id
          });
          localStorage.setItem(key, 'true');
        }
      }
    });
  }, [alertas.length, userId]);

  if (alertas.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-green-800">
            <CheckCircle className="w-6 h-6" />
            <div>
              <p className="font-semibold">Todos os prazos sob controle</p>
              <p className="text-sm text-green-700">Nenhuma reserva com prazo crítico</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-900">
          <AlertTriangle className="w-5 h-5" />
          Alertas de Prazos
          <Badge className="bg-yellow-600 text-white ml-2">
            {alertas.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alertas.map((alerta) => (
            <motion.div
              key={alerta.reserva.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-4 rounded-lg border bg-white",
                alerta.atrasado ? "border-red-300" : 
                alerta.diasRestantes <= 3 ? "border-orange-300" : "border-yellow-300"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className={cn(
                      "w-4 h-4",
                      alerta.atrasado ? "text-red-600" : "text-yellow-600"
                    )} />
                    <span className="font-semibold text-slate-900">
                      {alerta.reserva.codigo_completo}
                    </span>
                    {alerta.atrasado && (
                      <Badge className="bg-red-600 text-white text-xs">
                        ATRASADO
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-slate-700 mb-2">
                    Cliente: {alerta.reserva.cliente || 'N/A'}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Previsto: {format(new Date(alerta.reserva.data_prevista), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {alerta.reserva.quantidade_baixada} / {alerta.reserva.quantidade}
                    </span>
                  </div>

                  {/* Barra de progresso */}
                  <div className="mt-3">
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all",
                          alerta.progresso >= 100 ? "bg-green-600" :
                          alerta.progresso >= 75 ? "bg-blue-600" :
                          alerta.progresso >= 50 ? "bg-yellow-600" : "bg-red-600"
                        )}
                        style={{ width: `${Math.min(alerta.progresso, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {Math.round(alerta.progresso)}% concluído
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className={cn(
                    "text-2xl font-bold",
                    alerta.atrasado ? "text-red-600" : 
                    alerta.diasRestantes <= 3 ? "text-orange-600" : "text-yellow-600"
                  )}>
                    {alerta.atrasado ? `-${Math.abs(alerta.diasRestantes)}` : alerta.diasRestantes}
                  </div>
                  <p className="text-xs text-slate-600">
                    {alerta.atrasado ? 'dias atraso' : 'dias restantes'}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}