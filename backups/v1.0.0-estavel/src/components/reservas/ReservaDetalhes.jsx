import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingUp, CheckCircle, Clock, ScanLine } from 'lucide-react';
import IntervaloBadge from '../ui/intervalo-badge';
import WorkflowVisualReserva from './WorkflowVisualReserva';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig = {
  RESERVADO: { label: 'Reservado', color: 'bg-blue-100 text-blue-800', icon: Clock },
  EM_PRODUCAO: { label: 'Em Produção', color: 'bg-amber-100 text-amber-800', icon: TrendingUp },
  PRODUZIDO: { label: 'Produzido', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  BAIXADO: { label: 'Baixado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  CANCELADO: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: Clock },
  LIBERADO: { label: 'Liberado', color: 'bg-slate-100 text-slate-800', icon: Clock }
};

export default function ReservaDetalhes({ reserva, baixas, onBaixa }) {
  const quantidadeBaixada = reserva.quantidade_baixada || 0;
  const percentualConcluido = Math.round((quantidadeBaixada / reserva.quantidade) * 100);
  const quantidadeRestante = reserva.quantidade - quantidadeBaixada;
  
  const config = statusConfig[reserva.status] || statusConfig.RESERVADO;
  const StatusIcon = config.icon;

  return (
    <div className="space-y-6">
      {/* Status e Progresso */}
      <Card className="border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">{reserva.codigo_completo}</h3>
              <p className="text-sm text-slate-500 mt-1">
                Criado em {format(new Date(reserva.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            <Badge className={config.color}>
              <StatusIcon className="w-4 h-4 mr-1" />
              {config.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Visual */}
      <WorkflowVisualReserva 
        status={reserva.status}
        quantidade={reserva.quantidade}
        quantidadeBaixada={quantidadeBaixada}
      />

      {/* Informações Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Cliente</p>
                <p className="font-semibold text-slate-900">{reserva.cliente || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Modelo</p>
                <p className="font-semibold text-slate-900">{reserva.modelo || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-xs text-slate-500 mb-2">Intervalo de Numeração</p>
              <IntervaloBadge 
                inicio={reserva.numero_inicial} 
                fim={reserva.numero_final}
                variant="primary"
                size="lg"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-xs text-slate-500">Quantidade Total</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {reserva.quantidade.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes Adicionais */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">Código do Produto</p>
              <p className="font-mono text-sm text-slate-900 mt-1">{reserva.codigo_produto || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Mês de Produção</p>
              <p className="text-sm text-slate-900 mt-1">{reserva.mes_producao || '-'}</p>
            </div>
            {reserva.data_prevista && (
              <div>
                <p className="text-xs text-slate-500">Data Prevista</p>
                <p className="text-sm text-slate-900 mt-1">
                  {format(new Date(reserva.data_prevista), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Últimas Baixas */}
      {baixas.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold text-slate-900 mb-3">Últimas Baixas</h4>
            <div className="space-y-2">
              {baixas.slice(0, 3).map(baixa => (
                <div key={baixa.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-blue-600">
                        {baixa.numero_inicial} - {baixa.numero_final}
                      </span>
                      <Badge variant="outline" className="text-xs">{baixa.tipo}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(baixa.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <span className="font-semibold text-slate-900">{baixa.quantidade}</span>
                </div>
              ))}
            </div>
            {baixas.length > 3 && (
              <p className="text-xs text-slate-500 mt-2 text-center">
                +{baixas.length - 3} baixas anteriores
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      {reserva.status !== 'PRODUZIDO' && reserva.status !== 'CANCELADO' && quantidadeRestante > 0 && (
        <div className="flex justify-end">
          <Button onClick={onBaixa} className="bg-emerald-600 hover:bg-emerald-700">
            <ScanLine className="w-4 h-4 mr-2" />
            Registrar Baixa
          </Button>
        </div>
      )}
    </div>
  );
}