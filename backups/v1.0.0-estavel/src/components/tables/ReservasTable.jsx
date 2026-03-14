import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, MoreHorizontal, ScanLine, XCircle, Unlock, Eye, History, Scissors, Split, RefreshCw } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import StatusBadge from '../dashboard/StatusBadge';
import ReservasTableMobile from './ReservasTableMobile';
import IntervaloBadge from '../ui/intervalo-badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ReservasTable({
  reservas,
  onDetalhes,
  onHistorico,
  onBaixa,
  onCancelar,
  onLiberar,
  onEncurtar,
  onQuebrar,
  onSincronizar,
  integracoesAtivas,
  sortField,
  sortDirection,
  onSort,
  isLoading
}) {
  const SortButton = ({ field, children }) => (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:text-slate-900 transition-colors"
    >
      {children}
      {sortField === field && (
        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      )}
    </button>
  );

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden">
        <ReservasTableMobile
          reservas={reservas}
          onDetalhes={onDetalhes}
          onHistorico={onHistorico}
          onBaixa={onBaixa}
          onCancelar={onCancelar}
          onLiberar={onLiberar}
          onEncurtar={onEncurtar}
          onQuebrar={onQuebrar}
          isLoading={isLoading}
        />
      </div>

      {/* Desktop View */}
      <Card className="border-slate-200 dark:border-slate-800 hidden lg:block dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">Reservas de Lotes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800">
                  <TableHead className="text-slate-600 dark:text-slate-400">
                    <SortButton field="cliente">Cliente</SortButton>
                  </TableHead>
                  <TableHead className="text-slate-600">
                    <SortButton field="codigo_completo">Prefixo</SortButton>
                  </TableHead>
                  <TableHead className="text-slate-600">
                    <SortButton field="ano">Ano</SortButton>
                  </TableHead>
                  <TableHead className="text-slate-600">Código</TableHead>
                  <TableHead className="text-slate-600">Intervalo</TableHead>
                  <TableHead className="text-slate-600 text-right">
                    <SortButton field="quantidade">Qtd</SortButton>
                  </TableHead>
                  <TableHead className="text-slate-600 text-right">Baixado</TableHead>
                  <TableHead className="text-slate-600">
                    <SortButton field="status">Status</SortButton>
                  </TableHead>
                  <TableHead className="text-slate-600">
                    <SortButton field="created_at">Data</SortButton>
                  </TableHead>
                  <TableHead className="text-slate-600 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : reservas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                      Nenhuma reserva encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  reservas.map((reserva) => (
                    <TableRow key={reserva.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors border-slate-200 dark:border-slate-800">
                      <TableCell className="text-slate-700 dark:text-slate-300 font-medium">{reserva.cliente}</TableCell>
                      <TableCell className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {reserva.codigo_completo}
                      </TableCell>
                      <TableCell className="font-bold text-slate-700 dark:text-slate-300">
                        20{reserva.ano}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-slate-600 dark:text-slate-400">
                        {reserva.codigo_produto || '-'}
                      </TableCell>
                      <TableCell>
                        <IntervaloBadge
                          inicio={reserva.numero_inicial}
                          fim={reserva.numero_final}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-900 dark:text-slate-100">
                        {reserva.quantidade?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-emerald-600 font-medium">
                          {(reserva.quantidade_baixada || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={reserva.status} />
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {reserva.created_at && format(new Date(reserva.created_at), "dd/MM/yy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onDetalhes(reserva)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onHistorico(reserva)}>
                              <History className="w-4 h-4 mr-2" />
                              Histórico de Baixas
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
                            {integracoesAtivas && onSincronizar && (
                              <DropdownMenuItem onClick={() => onSincronizar(reserva)}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Sincronizar com SIRC
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}