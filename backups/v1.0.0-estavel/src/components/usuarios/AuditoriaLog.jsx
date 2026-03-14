import React, { useState } from 'react';
import { base44 } from '@/api/supabaseClient';
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
} from 'lucide-react';
import { cn } from "@/lib/utils";

const tipoAcaoConfig = {
  CRIACAO_USUARIO: { label: 'Criação de Usuário', color: 'bg-green-100 text-green-800', icon: UserPlus },
  EDICAO_USUARIO: { label: 'Edição de Usuário', color: 'bg-blue-100 text-blue-800', icon: UserCheck },
  RESET_SENHA: { label: 'Reset de Senha', color: 'bg-yellow-100 text-yellow-800', icon: Key },
  ALTERACAO_STATUS: { label: 'Alteração de Status', color: 'bg-purple-100 text-purple-800', icon: Shield },
  ALTERACAO_PERMISSOES: { label: 'Alteração de Permissões', color: 'bg-orange-100 text-orange-800', icon: Shield },
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
      
      return base44.entities.AuditoriaUsuarios.filter(query, '-created_at', 100);
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
      <Card>
        <CardHeader>
          <CardTitle>Log de Auditoria</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Log de Auditoria</CardTitle>
            <CardDescription>Histórico detalhado de ações realizadas</CardDescription>
          </div>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              <SelectItem value="CRIACAO_USUARIO">Criação</SelectItem>
              <SelectItem value="EDICAO_USUARIO">Edição</SelectItem>
              <SelectItem value="RESET_SENHA">Reset de Senha</SelectItem>
              <SelectItem value="ALTERACAO_STATUS">Status</SelectItem>
              <SelectItem value="ALTERACAO_PERMISSOES">Permissões</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {auditorias.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Nenhum registro de auditoria encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Usuário Afetado</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditorias.map((audit) => {
                  const config = tipoAcaoConfig[audit.tipo_acao] || {
                    label: audit.tipo_acao || 'Ação Desconhecida',
                    color: 'bg-gray-100 text-gray-800',
                    icon: Shield
                  };
                  const isExpanded = expandedRows.has(audit.id);
                  const Icon = config.icon;

                  return (
                    <React.Fragment key={audit.id}>
                      <TableRow
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => toggleRowExpanded(audit.id)}
                      >
                        <TableCell>
                          <ChevronDown
                            className={cn(
                              "w-4 h-4 transition-transform",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {format(new Date(audit.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {audit.usuario_admin_nome}
                        </TableCell>
                        <TableCell className="text-sm">
                          {audit.usuario_afetado_nome || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge className={config.color}>
                            <Icon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                          {audit.descricao}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-slate-50">
                          <TableCell colSpan="6" className="p-4">
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs font-semibold text-slate-700 mb-2">Descrição Completa:</p>
                                <p className="text-sm text-slate-600 bg-white p-2 rounded border border-slate-200">
                                  {audit.descricao}
                                </p>
                              </div>
                              {audit.ip_address && (
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 mb-1">IP:</p>
                                  <p className="text-sm text-slate-600 font-mono">{audit.ip_address}</p>
                                </div>
                              )}
                              {audit.dados_antes && (
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 mb-2">Estado Anterior:</p>
                                  <pre className="text-xs bg-white p-2 rounded border border-slate-200 overflow-auto max-h-32 text-slate-600">
                                    {JSON.stringify(JSON.parse(audit.dados_antes), null, 2)}
                                  </pre>
                                </div>
                              )}
                              {audit.dados_depois && (
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 mb-2">Estado Posterior:</p>
                                  <pre className="text-xs bg-white p-2 rounded border border-slate-200 overflow-auto max-h-32 text-slate-600">
                                    {JSON.stringify(JSON.parse(audit.dados_depois), null, 2)}
                                  </pre>
                                </div>
                              )}
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
      </CardContent>
    </Card>
  );
}