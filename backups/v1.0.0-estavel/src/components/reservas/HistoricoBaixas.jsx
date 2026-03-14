import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function HistoricoBaixas({ reserva, baixas }) {
  const baixasOrdenadas = [...baixas].sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );

  const totalBaixado = baixas.reduce((acc, b) => acc + b.quantidade, 0);
  const percentualConcluido = Math.round((totalBaixado / reserva.quantidade) * 100);

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <History className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total de Baixas</p>
                <p className="text-2xl font-bold text-slate-900">{baixas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Quantidade Baixada</p>
                <p className="text-2xl font-bold text-slate-900">{totalBaixado.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-purple-600">{percentualConcluido}%</span>
              </div>
              <div>
                <p className="text-xs text-slate-500">Progresso</p>
                <p className="text-sm font-semibold text-slate-900">
                  {totalBaixado} / {reserva.quantidade}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações da Reserva */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-600">Código:</span>
              <p className="font-bold text-blue-900">{reserva.codigo_completo}</p>
            </div>
            <div>
              <span className="text-blue-600">Cliente:</span>
              <p className="font-bold text-blue-900">{reserva.cliente || '-'}</p>
            </div>
            <div>
              <span className="text-blue-600">Intervalo:</span>
              <p className="font-bold text-blue-900">
                {reserva.numero_inicial.toLocaleString()} - {reserva.numero_final.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-blue-600">Total:</span>
              <p className="font-bold text-blue-900">{reserva.quantidade.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Histórico */}
      <Card>
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico Completo de Baixas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {baixasOrdenadas.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma baixa registrada para esta reserva</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Nº Inicial</TableHead>
                  <TableHead>Nº Final</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Código Lido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {baixasOrdenadas.map((baixa) => (
                  <TableRow key={baixa.id}>
                    <TableCell className="font-medium">
                      {format(new Date(baixa.created_at), 'dd/MM/yy HH:mm:ss', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-blue-600">
                      {baixa.numero_inicial.toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-blue-600">
                      {baixa.numero_final.toLocaleString()}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {baixa.quantidade.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={baixa.tipo === 'COLETA' ? 'default' : 'outline'}>
                        {baixa.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {baixa.codigo_lido || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}