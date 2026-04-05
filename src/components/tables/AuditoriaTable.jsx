import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History } from 'lucide-react';

const acaoConfig = {
  RESERVA_CRIADA: { label: 'Reserva Criada', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-0' },
  RESERVA_CANCELADA: { label: 'Reserva Cancelada', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0' },
  RESERVA_LIBERADA: { label: 'Reserva Liberada', color: 'bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-300 border-0' },
  BAIXA_REGISTRADA: { label: 'Baixa Registrada', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-0' },
  ANO_ENCERRADO: { label: 'Ano Encerrado', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0' },
  SEQUENCIA_CRIADA: { label: 'Sequência Criada', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0' }
};

export default function AuditoriaTable({ registros, isLoading }) {
  return (
    <Card className="border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-[2rem] shadow-lg overflow-hidden">
      <CardHeader className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
        <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <History className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          Histórico de Auditoria
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-white/[0.03] border-b border-slate-200 dark:border-white/5 hover:bg-transparent dark:hover:bg-transparent">
                <TableHead className="text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Data/Hora</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Ação</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Prefixo</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Código</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Intervalo</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Usuário</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-bold uppercase tracking-widest">Carregando...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : registros.length === 0 ? (
                <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 flex items-center justify-center">
                        <History className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Nenhum registro encontrado</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                registros.map((registro) => {
                  const config = acaoConfig[registro.acao] || { label: registro.acao, color: 'bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-300 border-0' };
                  
                  return (
                    <TableRow key={registro.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.03] border-b border-slate-100 dark:border-white/5 transition-colors">
                      <TableCell className="text-slate-600 dark:text-slate-400 text-sm whitespace-nowrap">
                        {registro.created_at && format(new Date(registro.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge className={config.color}>{config.label}</Badge>
                      </TableCell>
                      <TableCell className="font-mono font-medium text-slate-900 dark:text-white">
                        {registro.letra_produto}{registro.ano}LM
                      </TableCell>
                      <TableCell className="font-mono text-sm text-slate-600 dark:text-slate-400">
                        {registro.codigo_produto || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-slate-600 dark:text-slate-400">
                        {registro.numero_inicial?.toLocaleString()} - {registro.numero_final?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">{registro.created_by}</TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-500 text-sm max-w-xs truncate">
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