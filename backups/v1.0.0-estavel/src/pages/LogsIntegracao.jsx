// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { RefreshCw, CheckCircle2, XCircle, Clock, Search } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import moment from 'moment';
import { cn } from "@/lib/utils";

export default function LogsIntegracao() {
  const queryClient = useQueryClient();
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [filtroIntegracao, setFiltroIntegracao] = useState('TODAS');
  const [busca, setBusca] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['logs-integracao'],
    queryFn: () => base44.entities.LogIntegracao.list('-created_at'),
    refetchInterval: 10000
  });

  const { data: integracoes = [] } = useQuery({
    queryKey: ['integracoes'],
    queryFn: () => base44.entities.IntegracaoExterna.list()
  });

  const retryMutation = useMutation({
    mutationFn: async (logId) => {
      const log = logs.find(l => l.id === logId);
      if (!log) throw new Error('Log não encontrado');

      const integracao = integracoes.find(i => i.id === log.integracao_id);
      if (!integracao) throw new Error('Integração não encontrada');

      return await base44.functions.invoke('enviarWebhook', {
        integracao_id: integracao.id,
        evento: log.evento,
        payload: log.payload
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs-integracao'] });
      toast.success('Webhook reenviado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao reenviar: ' + error.message);
    }
  });

  const logsFiltrados = logs.filter(log => {
    const matchStatus = filtroStatus === 'TODOS' || log.status === filtroStatus;
    const matchIntegracao = filtroIntegracao === 'TODAS' || log.integracao_id === filtroIntegracao;
    const matchBusca = !busca ||
      log.evento.toLowerCase().includes(busca.toLowerCase()) ||
      log.mensagem_erro?.toLowerCase().includes(busca.toLowerCase());
    return matchStatus && matchIntegracao && matchBusca;
  });

  const stats = {
    total: logs.length,
    sucesso: logs.filter(l => l.status === 'SUCESSO').length,
    falha: logs.filter(l => l.status === 'FALHA').length,
    pendente: logs.filter(l => l.status === 'PENDENTE').length
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-indigo-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all hover:scale-105 active:scale-95 group border border-blue-400/20">
                <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 text-white group-hover:rotate-180 transition-transform duration-700" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Logs de <span className="text-blue-600 dark:text-blue-400">Integração</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                  Histórico • Webhooks • Conectividade
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas Premium */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total de Envios', value: stats.total, icon: RefreshCw, color: 'blue' },
            { label: 'Sucessos', value: stats.sucesso, icon: CheckCircle2, color: 'emerald' },
            { label: 'Falhas', value: stats.falha, icon: XCircle, color: 'rose' },
            { label: 'Pendentes', value: stats.pendente, icon: Clock, color: 'amber' },
          ].map((item, i) => (
            <Card key={i} className="relative overflow-hidden group border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 backdrop-blur-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80">{item.label}</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{item.value}</p>
                  </div>
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6",
                    item.color === 'blue' ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20" :
                      item.color === 'emerald' ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20" :
                        item.color === 'rose' ? "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20" :
                          "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20"
                  )}>
                    <item.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
              <div className={cn(
                "absolute bottom-0 left-0 h-1 bg-gradient-to-r opacity-50 transition-all duration-500 group-hover:h-1.5",
                item.color === 'blue' ? "from-blue-600 to-blue-400 w-full" :
                  item.color === 'emerald' ? "from-emerald-600 to-emerald-400 w-full" :
                    item.color === 'rose' ? "from-rose-600 to-rose-400 w-full" :
                      "from-amber-600 to-amber-400 w-full"
              )} />
            </Card>
          ))}
        </div>

        {/* Filtros */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por evento ou erro..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  icon={<Search className="w-4 h-4" />}
                />
              </div>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos Status</SelectItem>
                  <SelectItem value="SUCESSO">Sucesso</SelectItem>
                  <SelectItem value="FALHA">Falha</SelectItem>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroIntegracao} onValueChange={setFiltroIntegracao}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Integração" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas</SelectItem>
                  {integracoes.map(int => (
                    <SelectItem key={int.id} value={int.id}>{int.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Logs */}
        <div className="space-y-3">
          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center text-slate-500">
                Carregando logs...
              </CardContent>
            </Card>
          ) : logsFiltrados.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-slate-500">
                Nenhum log encontrado
              </CardContent>
            </Card>
          ) : (
            logsFiltrados.map((log) => {
              const integracao = integracoes.find(i => i.id === log.integracao_id);
              const statusConfig = {
                SUCESSO: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
                FALHA: { color: 'bg-red-100 text-red-800', icon: XCircle },
                PENDENTE: { color: 'bg-yellow-100 text-yellow-800', icon: Clock }
              }[log.status];

              const StatusIcon = statusConfig.icon;

              return (
                <Card key={log.id} className="dark:bg-slate-900 dark:border-slate-800 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {log.status}
                          </Badge>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{log.evento}</span>
                          {integracao && (
                            <span className="text-sm text-slate-500">→ {integracao.nome}</span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Data:</span>
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {moment(log.created_at).format('DD/MM/YY HH:mm')}
                            </div>
                          </div>
                          {log.codigo_resposta && (
                            <div>
                              <span className="text-slate-500">Código:</span>
                              <div className="font-mono font-medium text-slate-900 dark:text-slate-100">
                                {log.codigo_resposta}
                              </div>
                            </div>
                          )}
                          {log.tempo_resposta_ms && (
                            <div>
                              <span className="text-slate-500">Tempo:</span>
                              <div className="font-medium text-slate-900 dark:text-slate-100">
                                {log.tempo_resposta_ms}ms
                              </div>
                            </div>
                          )}
                        </div>

                        {log.mensagem_erro && (
                          <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-800">
                            <strong>Erro:</strong> {log.mensagem_erro}
                          </div>
                        )}

                        {log.payload && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-slate-600 hover:text-slate-900">
                              Ver payload
                            </summary>
                            <pre className="mt-2 bg-slate-100 p-2 rounded overflow-x-auto">
                              {typeof log.payload === 'string' ? log.payload : JSON.stringify(JSON.parse(log.payload), null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>

                      {log.status === 'FALHA' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryMutation.mutate(log.id)}
                          disabled={retryMutation.isPending}
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
                          Reenviar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}