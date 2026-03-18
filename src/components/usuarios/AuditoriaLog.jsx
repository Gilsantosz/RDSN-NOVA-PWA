import React, { useState } from 'react';
import { rdsn } from '@/api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  UserPlus,
  UserCheck,
  Key,
  Shield,
  Loader2,
  Clock,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Fingerprint,
  Activity
} from 'lucide-react';
import { cn } from "@/lib/utils";

const tipoAcaoConfig = {
  CRIACAO_USUARIO: { label: 'Criação', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: UserPlus },
  EDICAO_USUARIO: { label: 'Edição', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: UserCheck },
  RESET_SENHA: { label: 'Password Reset', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', icon: Key },
  ALTERACAO_STATUS: { label: 'Status Change', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Activity },
  ALTERACAO_PERMISSOES: { label: 'Permissions', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: Shield },
};

export default function AuditoriaLog({ usuarioId }) {
  const [filtroTipo, setFiltroTipo] = useState('all');
  const [expandedRows, setExpandedRows] = useState(new Set());

  const { data: auditorias = [], isLoading } = useQuery({
    queryKey: ['auditoria-usuarios', usuarioId, filtroTipo],
    queryFn: async () => {
      let query = {};
      if (usuarioId) query.usuario_afetado_id = usuarioId;
      if (filtroTipo !== 'all') query.tipo_acao = filtroTipo;
      
      return rdsn.entities.AuditoriaUsuarios.filter(query, '-created_at', 100);
    },
  });

  const toggleRowExpanded = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 dark:bg-white/[0.02] p-6 rounded-[2rem] border border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black italic uppercase italic tracking-tighter tabular-nums dark:text-white">Security Timeline</h3>
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Auditoria completa de transações do sistema</p>
          </div>
        </div>
        
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-64 h-12 rounded-xl bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/5 font-black uppercase tracking-widest text-[10px] italic">
            <SelectValue placeholder="Filtrar Eventos" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-white/10 dark:bg-slate-900">
            <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">Todos os Eventos</SelectItem>
            <SelectItem value="CRIACAO_USUARIO" className="text-[10px] font-black uppercase tracking-widest">Criação de Conta</SelectItem>
            <SelectItem value="EDICAO_USUARIO" className="text-[10px] font-black uppercase tracking-widest">Atualizações</SelectItem>
            <SelectItem value="RESET_SENHA" className="text-[10px] font-black uppercase tracking-widest">Resets de Senha</SelectItem>
            <SelectItem value="ALTERACAO_STATUS" className="text-[10px] font-black uppercase tracking-widest">Alterações de Status</SelectItem>
            <SelectItem value="ALTERACAO_PERMISSOES" className="text-[10px] font-black uppercase tracking-widest">Segurança/Permissões</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] border border-slate-200 dark:border-white/5 overflow-hidden">
        {auditorias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Clock className="w-12 h-12 text-slate-300 mb-4 opacity-30" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-400 italic">Vazio no momento</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-white/[0.01]">
                <TableRow className="border-slate-200 dark:border-white/5 hover:bg-transparent">
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-6 pr-4">Timeline Index</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-6">Operador ID</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-6">Payload Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-6 text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditorias.map((audit) => {
                  const config = tipoAcaoConfig[audit.tipo_acao] || {
                    label: audit.tipo_acao || 'UNKNOWN',
                    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
                    icon: Shield
                  };
                  const isExpanded = expandedRows.has(audit.id);
                  const Icon = config.icon;

                  return (
                    <React.Fragment key={audit.id}>
                      <TableRow
                        className={cn(
                          "group transition-all cursor-pointer border-slate-100 dark:border-white/5",
                          isExpanded ? "bg-purple-500/5" : "hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                        )}
                        onClick={() => toggleRowExpanded(audit.id)}
                      >
                        <TableCell>
                          <ChevronDown
                            className={cn(
                              "w-4 h-4 transition-transform duration-300",
                              isExpanded ? "rotate-180 text-purple-500" : "text-slate-300 group-hover:text-slate-500"
                            )}
                          />
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-black dark:text-white italic tabular-nums">
                              {format(new Date(audit.created_at), 'HH:mm:ss', { locale: ptBR })}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400">
                              {format(new Date(audit.created_at), 'dd MMM yyyy', { locale: ptBR })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-[10px] font-black italic">
                              {audit.usuario_admin_nome?.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs font-black uppercase tracking-tight dark:text-slate-200">
                              {audit.usuario_admin_nome}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                           <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 max-w-[200px] truncate italic">
                                {audit.descricao}
                              </span>
                              {audit.usuario_afetado_nome && (
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                  Ref: {audit.usuario_afetado_nome}
                                </span>
                              )}
                           </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={cn("px-4 py-1.5 rounded-full border-2 text-[10px] font-black uppercase tracking-widest italic shadow-sm", config.color)}>
                            <Icon className="w-3 h-3 mr-2" />
                            {config.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="border-none bg-purple-500/5 hover:bg-purple-500/5">
                          <TableCell colSpan="5" className="px-10 py-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
                              <div className="space-y-6">
                                <div className="p-6 rounded-[2rem] bg-white dark:bg-slate-950 border border-purple-500/20 shadow-xl shadow-purple-500/5">
                                  <div className="flex items-center gap-2 mb-4">
                                     <History className="w-4 h-4 text-purple-400" />
                                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Descrição do Evento</p>
                                  </div>
                                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium italic">
                                    "{audit.descricao}"
                                  </p>
                                </div>
                                
                                {audit.ip_address && (
                                  <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-slate-950 text-white italic">
                                    <Fingerprint className="w-5 h-5 text-purple-400" />
                                    <div className="flex flex-col">
                                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Protocolo IP Tracker</span>
                                      <span className="text-sm font-black tabular-nums">{audit.ip_address}</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-4">
                                {audit.dados_antes && (
                                  <div className="group/code relative">
                                    <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                                       <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[8px] font-black uppercase tracking-widest">Estado Anterior</span>
                                    </div>
                                    <pre className="text-[10px] bg-slate-900 text-slate-400 p-8 pt-12 rounded-[2rem] border border-white/5 overflow-auto max-h-48 scrollbar-hide font-mono tabular-nums leading-relaxed">
                                      {JSON.stringify(JSON.parse(audit.dados_antes), null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {audit.dados_depois && (
                                  <div className="group/code relative">
                                     <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                                       <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest focus:ring">Estado Posterior</span>
                                    </div>
                                    <pre className="text-[10px] bg-slate-950 text-white p-8 pt-12 rounded-[2rem] border border-purple-500/30 overflow-auto max-h-48 shadow-2xl shadow-purple-500/10 font-mono tabular-nums leading-relaxed">
                                      {JSON.stringify(JSON.parse(audit.dados_depois), null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}