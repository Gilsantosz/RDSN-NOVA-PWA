import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const acaoConfig = {
  RESERVA_CRIADA: { label: 'Reserva Criada', color: 'bg-blue-100 text-blue-800' },
  RESERVA_CANCELADA: { label: 'Reserva Cancelada', color: 'bg-red-100 text-red-800' },
  RESERVA_LIBERADA: { label: 'Reserva Liberada', color: 'bg-slate-100 text-slate-800' },
  BAIXA_REGISTRADA: { label: 'Baixa Registrada', color: 'bg-emerald-100 text-emerald-800' },
  ANO_ENCERRADO: { label: 'Ano Encerrado', color: 'bg-purple-100 text-purple-800' },
  SEQUENCIA_CRIADA: { label: 'Sequência Criada', color: 'bg-amber-100 text-amber-800' }
};

export default function AuditoriaTable({ registros, isLoading }) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-lg font-semibold text-slate-800">Histórico de Auditoria</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="text-slate-600">Data/Hora</TableHead>
                <TableHead className="text-slate-600">Ação</TableHead>
                <TableHead className="text-slate-600">Prefixo</TableHead>
                <TableHead className="text-slate-600">Código</TableHead>
                <TableHead className="text-slate-600">Intervalo</TableHead>
                <TableHead className="text-slate-600">Usuário</TableHead>
                <TableHead className="text-slate-600">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : registros.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                registros.map((registro) => {
                  const config = acaoConfig[registro.acao] || { label: registro.acao, color: 'bg-slate-100 text-slate-800' };
                  
                  return (
                    <TableRow key={registro.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-slate-600 text-sm whitespace-nowrap">
                        {registro.created_at && format(new Date(registro.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge className={config.color}>{config.label}</Badge>
                      </TableCell>
                      <TableCell className="font-mono font-medium text-slate-900">
                        {registro.letra_produto}{registro.ano}LM
                      </TableCell>
                      <TableCell className="font-mono text-sm text-slate-600">
                        {registro.codigo_produto || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-slate-600">
                        {registro.numero_inicial?.toLocaleString()} - {registro.numero_final?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-slate-600">{registro.created_by}</TableCell>
                      <TableCell className="text-slate-500 text-sm max-w-xs truncate">
                        {registro.detalhes}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}