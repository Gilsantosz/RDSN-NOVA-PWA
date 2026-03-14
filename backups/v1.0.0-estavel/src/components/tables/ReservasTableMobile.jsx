import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, ScanLine, XCircle, Unlock, Eye, History, Scissors, Split } from "lucide-react";
import StatusBadge from '../dashboard/StatusBadge';
import IntervaloBadge from '../ui/intervalo-badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ReservasTableMobile({
  reservas,
  onDetalhes,
  onHistorico,
  onBaixa,
  onCancelar,
  onLiberar,
  onEncurtar,
  onQuebrar,
  isLoading
}) {
  if (isLoading) {
    return (
      <div className="text-center py-8 text-slate-500">
        Carregando...
      </div>
    );
  }

  if (reservas.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        Nenhuma reserva encontrada
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reservas.map((reserva) => (
        <Card key={reserva.id} className="border-slate-200 dark:border-slate-800 overflow-hidden dark:bg-slate-900 shadow-sm">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-mono font-bold text-lg text-slate-900 dark:text-slate-100">
                    {reserva.codigo_completo}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    {reserva.cliente}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onDetalhes(reserva)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onHistorico(reserva)}>
                      <History className="w-4 h-4 mr-2" />
                      Histórico
                    </DropdownMenuItem>
                    {(reserva.status === 'RESERVADO' || reserva.status === 'EM_PRODUCAO') && (
                      <DropdownMenuItem onClick={() => onBaixa(reserva)}>
                        <ScanLine className="w-4 h-4 mr-2" />
                        Registrar Baixa
                      </DropdownMenuItem>
                    )}
                    {reserva.status !== 'CANCELADO' && reserva.status !== 'PRODUZIDO' && (
                      <>
                        <DropdownMenuItem onClick={() => onEncurtar(reserva)}>
                          <Scissors className="w-4 h-4 mr-2" />
                          Encurtar Lote
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onQuebrar(reserva)}>
                          <Split className="w-4 h-4 mr-2" />
                          Quebrar em Dois
                        </DropdownMenuItem>
                      </>
                    )}
                    {reserva.status === 'RESERVADO' && (
                      <>
                        <DropdownMenuItem onClick={() => onCancelar(reserva)}>
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancelar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onLiberar(reserva)}>
                          <Unlock className="w-4 h-4 mr-2" />
                          Liberar
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <StatusBadge status={reserva.status} />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {reserva.created_at && format(new Date(reserva.created_at), "dd/MM/yy", { locale: ptBR })}
                </span>
              </div>

              {/* Intervalo e Quantidade */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Intervalo</div>
                  <IntervaloBadge
                    inicio={reserva.numero_inicial}
                    fim={reserva.numero_final}
                    variant="primary"
                    size="default"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Quantidade</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {reserva.quantidade?.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Progresso */}
              {reserva.quantidade_baixada > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                    <span>Baixado</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {Math.round((reserva.quantidade_baixada / reserva.quantidade) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all dark:bg-emerald-600"
                      style={{ width: `${(reserva.quantidade_baixada / reserva.quantidade) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}