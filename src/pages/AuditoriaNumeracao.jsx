// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Hash, AlertTriangle, CheckCircle, XCircle, Search, Activity, Plus, Settings, Clock, History, Trash2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const severidadeConfig = {
  CRITICA: { color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50', icon: XCircle },
  ALTA: { color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-900/50', icon: AlertTriangle },
  MEDIA: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900/50', icon: AlertTriangle },
  BAIXA: { color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50', icon: Activity }
};

const tiposVerificacao = [
  { value: 'SOBREPOSICAO', label: 'Sobreposição de Números' },
  { value: 'LACUNAS', label: 'Lacunas na Numeração' },
  { value: 'DUPLICIDADE', label: 'Números Duplicados' },
  { value: 'SEQUENCIA_INVALIDA', label: 'Sequência Inválida' },
  { value: 'NUMERACAO_LIVRE_INVALIDA', label: 'Numeração Livre Inválida' }
];

export default function AuditoriaNumeracao() {
  const { setorAtivo, isAdmin } = useSetor();
  const queryClient = useQueryClient();
  const [letraSelecionada, setLetraSelecionada] = useState('');
  const [anoSelecionado, setAnoSelecionado] = useState('');
  const [problemas, setProblemas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dialogRegraOpen, setDialogRegraOpen] = useState(false);
  const [novaRegra, setNovaRegra] = useState({
    nome: '',
    descricao: '',
    tipo_verificacao: 'SOBREPOSICAO',
    severidade: 'MEDIA',
    ativa: true
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos', setorAtivo],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.Produto.list();
      }
      return await rdsn.entities.Produto.filter({ setor_id: setorAtivo });
    },
    enabled: !!setorAtivo
  });

  const { data: sequencias = [] } = useQuery({
    queryKey: ['sequencias', setorAtivo],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.SequenciaAnual.list();
      }
      return await rdsn.entities.SequenciaAnual.filter({ setor_id: setorAtivo });
    },
    enabled: !!setorAtivo
  });

  const { data: reservas = [] } = useQuery({
    queryKey: ['reservas-auditoria', setorAtivo, letraSelecionada, anoSelecionado],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.ReservaLote.list('-created_at', 500);
      }
      return await rdsn.entities.ReservaLote.filter({ setor_id: setorAtivo }, '-created_at', 500);
    },
    enabled: !!letraSelecionada && !!anoSelecionado && !!setorAtivo
  });

  const { data: numeracoesLivres = [] } = useQuery({
    queryKey: ['numeracoes-livres-auditoria', setorAtivo, letraSelecionada, anoSelecionado],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.NumeracaoLivre.list('-created_at', 500);
      }
      return await rdsn.entities.NumeracaoLivre.filter({ setor_id: setorAtivo }, '-created_at', 500);
    },
    enabled: !!letraSelecionada && !!anoSelecionado && !!setorAtivo
  });

  const { data: regras = [] } = useQuery({
    queryKey: ['regras-auditoria'],
    queryFn: () => rdsn.entities.RegraAuditoria.list()
  });

  const { data: historico = [] } = useQuery({
    queryKey: ['historico-auditoria'],
    queryFn: () => rdsn.entities.HistoricoAuditoria.list('-created_at', 50)
  });

  const letras = [...new Set(produtos.map(p => p.letra_produto))];
  const anos = [...new Set(sequencias.map(s => s.ano))];

  const reservasFiltradas = reservas.filter(r =>
    r.letra_produto === letraSelecionada &&
    r.ano === Number(anoSelecionado) &&
    r.status !== 'CANCELADO'
  );

  const livresFiltradas = numeracoesLivres.filter(nl =>
    nl.letra_produto === letraSelecionada &&
    nl.ano === Number(anoSelecionado)
  );

  const criarRegraMutation = useMutation({
    mutationFn: (dados) => rdsn.entities.RegraAuditoria.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-auditoria'] });
      setDialogRegraOpen(false);
      setNovaRegra({
        nome: '',
        descricao: '',
        tipo_verificacao: 'SOBREPOSICAO',
        severidade: 'MEDIA',
        ativa: true
      });
      toast.success('Regra criada com sucesso!');
    }
  });

  const deletarRegraMutation = useMutation({
    mutationFn: (id) => rdsn.entities.RegraAuditoria.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-auditoria'] });
      toast.success('Regra excluída!');
    }
  });

  const toggleRegraMutation = useMutation({
    mutationFn: ({ id, ativa }) => rdsn.entities.RegraAuditoria.update(id, { ativa }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-auditoria'] });
    }
  });

  const handleAnalisar = async () => {
    if (!letraSelecionada || !anoSelecionado) {
      toast.error('Selecione letra e ano');
      return;
    }

    setLoading(true);
    try {
      const response = await rdsn.functions.invoke('executarAuditoriaAutomatica', {
        letra_produto: letraSelecionada,
        ano: Number(anoSelecionado),
        setor_id: setorAtivo === 'ALL' ? null : setorAtivo,
        tipo_execucao: 'MANUAL'
      });

      setProblemas(response.data);
      queryClient.invalidateQueries({ queryKey: ['historico-auditoria'] });

      if (response.data.total_problemas === 0) {
        toast.success('Nenhum problema detectado!');
      } else {
        toast.warning(`${response.data.total_problemas} problema(s) encontrado(s)`);
      }
    } catch (error) {
      toast.error('Erro ao analisar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const executarAuditoriaComRegras = async () => {
    if (!letraSelecionada || !anoSelecionado) {
      toast.error('Selecione letra e ano');
      return;
    }

    const regrasAtivas = regras.filter(r => r.ativa).map(r => r.id);
    if (regrasAtivas.length === 0) {
      toast.error('Nenhuma regra ativa! Crie regras customizadas primeiro.');
      return;
    }

    setLoading(true);
    try {
      const response = await rdsn.functions.invoke('executarAuditoriaAutomatica', {
        letra_produto: letraSelecionada,
        ano: Number(anoSelecionado),
        setor_id: setorAtivo === 'ALL' ? null : setorAtivo,
        regras_ids: regrasAtivas,
        tipo_execucao: 'MANUAL'
      });

      setProblemas(response.data);
      queryClient.invalidateQueries({ queryKey: ['historico-auditoria'] });

      toast.success(`Auditoria concluída! ${response.data.total_problemas} problema(s) encontrado(s)`);
    } catch (error) {
      toast.error('Erro ao executar auditoria: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const construirMapaNumeros = () => {
    if (reservasFiltradas.length === 0 && livresFiltradas.length === 0) return null;

    const todosNumeros = [];

    reservasFiltradas.forEach(r => {
      todosNumeros.push({
        tipo: 'RESERVA',
        inicio: r.numero_inicial,
        fim: r.numero_final,
        dados: r
      });
    });

    livresFiltradas.forEach(nl => {
      todosNumeros.push({
        tipo: 'LIVRE',
        inicio: nl.numero_inicial,
        fim: nl.numero_final,
        dados: nl
      });
    });

    todosNumeros.sort((a, b) => a.inicio - b.inicio);
    return todosNumeros;
  };

  const mapaNumeros = construirMapaNumeros();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(168,85,247,0.15),transparent)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-600 to-fuchsia-500 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all hover:scale-105 active:scale-95 group border border-purple-400/20">
                <Hash className="w-8 h-8 sm:w-10 sm:h-10 text-white group-hover:rotate-12 transition-transform duration-500" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Auditoria de <span className="text-purple-600 dark:text-purple-400">Numeração</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                  Validação Automatizada • Histórico de Alocação
                </p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="analise" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            <TabsTrigger value="analise" className="rounded-lg transition-all dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100">Análise Manual</TabsTrigger>
            <TabsTrigger value="regras" className="rounded-lg transition-all dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100">Regras Customizadas</TabsTrigger>
            <TabsTrigger value="historico" className="rounded-lg transition-all dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="analise" className="space-y-6 mt-6">
            <Card className="border border-slate-200 dark:border-white/5 shadow-2xl bg-white dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-slate-900 dark:text-slate-100">Selecionar Escopo</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Letra do Produto</label>
                    <Select value={letraSelecionada} onValueChange={setLetraSelecionada}>
                      <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                        {letras.map(letra => (
                          <SelectItem key={letra} value={letra}>{letra}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Ano</label>
                    <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
                      <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                        {anos.map(ano => (
                          <SelectItem key={ano} value={String(ano)}>{ano}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleAnalisar}
                    disabled={!letraSelecionada || !anoSelecionado || loading}
                    className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 font-bold"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    {loading ? 'Analisando...' : 'Análise Padrão'}
                  </Button>

                  <Button
                    onClick={executarAuditoriaComRegras}
                    disabled={!letraSelecionada || !anoSelecionado || loading}
                    variant="outline"
                    className="dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Com Regras
                  </Button>
                </div>
              </CardContent>
            </Card>

            {problemas && (
              <Card className={cn(
                "shadow-2xl bg-white dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem]",
                problemas.total_problemas > 0
                  ? "border-2 border-orange-200 dark:border-orange-900/50"
                  : "border-2 border-green-200 dark:border-green-900/50"
              )}>
                <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {problemas.total_problemas === 0 ? (
                        <>
                          <CheckCircle className="w-6 h-6 text-green-600" />
                          Sistema Íntegro
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-6 h-6 text-orange-600" />
                          Problemas Detectados
                        </>
                      )}
                    </CardTitle>
                    <Badge className={
                      problemas.total_problemas === 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }>
                      {problemas.total_problemas} problema(s)
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {problemas.total_problemas === 0 ? (
                    <p className="text-slate-600 dark:text-slate-400">Nenhum problema de integridade detectado para {letraSelecionada}{anoSelecionado}</p>
                  ) : (
                    <div className="space-y-3">
                      {problemas.problemas.map((problema, idx) => {
                        const config = severidadeConfig[problema.severidade];
                        const Icon = config?.icon || AlertTriangle;
                        return (
                          <Alert key={idx} className={`border-2 ${config?.color || 'bg-gray-100'}`}>
                            <Icon className="w-4 h-4" />
                            <AlertDescription>
                              <div className="font-semibold mb-1">{problema.descricao}</div>
                              {problema.regra_nome && (
                                <div className="text-xs text-slate-500 mb-2">Regra: {problema.regra_nome}</div>
                              )}
                              <div className="text-xs bg-white/50 dark:bg-slate-950/50 p-2 rounded mt-2 font-mono dark:text-slate-300">
                                {JSON.stringify(problema.detalhes, null, 2)}
                              </div>
                            </AlertDescription>
                          </Alert>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {mapaNumeros && mapaNumeros.length > 0 && (
              <Card className="border border-slate-200 dark:border-white/5 shadow-2xl bg-white dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-slate-900 dark:text-slate-100">Mapa de Alocação de Números</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    {mapaNumeros.map((item, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border-2",
                          item.tipo === 'RESERVA'
                            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-900/30'
                            : 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900/30'
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className={item.tipo === 'RESERVA' ? 'bg-blue-600' : 'bg-green-600'}>
                              {item.tipo}
                            </Badge>
                            <span className="font-mono font-bold dark:text-slate-200">
                              {item.inicio.toLocaleString()} - {item.fim.toLocaleString()}
                            </span>
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              ({(item.fim - item.inicio + 1).toLocaleString()} números)
                            </span>
                          </div>
                          {item.tipo === 'RESERVA' && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              Cliente: {item.dados.cliente || '-'} | Status: {item.dados.status}
                            </div>
                          )}
                          {item.tipo === 'LIVRE' && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              Motivo: {item.dados.motivo} | Disponível: {item.dados.disponivel ? 'Sim' : 'Não'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="regras" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">Defina regras customizadas para detecção automatizada</p>
              <Dialog open={dialogRegraOpen} onOpenChange={setDialogRegraOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 font-bold">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Regra
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-800">
                  <DialogHeader>
                    <DialogTitle className="dark:text-slate-100">Criar Regra de Auditoria</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="dark:text-slate-300">Nome da Regra</Label>
                      <Input
                        value={novaRegra.nome}
                        onChange={(e) => setNovaRegra({ ...novaRegra, nome: e.target.value })}
                        placeholder="Ex: Verificar sobreposições críticas"
                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <Label className="dark:text-slate-300">Descrição</Label>
                      <Textarea
                        value={novaRegra.descricao}
                        onChange={(e) => setNovaRegra({ ...novaRegra, descricao: e.target.value })}
                        placeholder="Descreva o objetivo desta regra"
                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <Label className="dark:text-slate-300">Tipo de Verificação</Label>
                      <Select value={novaRegra.tipo_verificacao} onValueChange={(v) => setNovaRegra({ ...novaRegra, tipo_verificacao: v })}>
                        <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                          {tiposVerificacao.map(tipo => (
                            <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="dark:text-slate-300">Severidade</Label>
                      <Select value={novaRegra.severidade} onValueChange={(v) => setNovaRegra({ ...novaRegra, severidade: v })}>
                        <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                          <SelectItem value="BAIXA">Baixa</SelectItem>
                          <SelectItem value="MEDIA">Média</SelectItem>
                          <SelectItem value="ALTA">Alta</SelectItem>
                          <SelectItem value="CRITICA">Crítica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={novaRegra.ativa}
                        onCheckedChange={(checked) => setNovaRegra({ ...novaRegra, ativa: checked })}
                      />
                      <Label className="dark:text-slate-300">Regra ativa</Label>
                    </div>

                    <Button
                      onClick={() => criarRegraMutation.mutate(novaRegra)}
                      disabled={!novaRegra.nome || criarRegraMutation.isPending}
                      className="w-full"
                    >
                      Criar Regra
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {regras.map(regra => (
                <Card key={regra.id} className={cn(
                  "border border-slate-200 dark:border-white/5 shadow-2xl bg-white dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem]",
                  !regra.ativa && 'opacity-60'
                )}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg dark:text-slate-100">{regra.nome}</CardTitle>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{regra.descricao}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={regra.ativa}
                          onCheckedChange={(checked) => toggleRegraMutation.mutate({ id: regra.id, ativa: checked })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletarRegraMutation.mutate(regra.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Badge>{tiposVerificacao.find(t => t.value === regra.tipo_verificacao)?.label}</Badge>
                      <Badge className={severidadeConfig[regra.severidade]?.color}>
                        {regra.severidade}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {regras.length === 0 && (
                <Card className="border border-slate-200 dark:border-white/5 shadow-2xl bg-white dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
                  <CardContent className="text-center py-8">
                    <Settings className="w-12 h-12 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
                    <p className="text-slate-600 dark:text-slate-400">Nenhuma regra customizada criada</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Crie regras para automatizar verificações</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="historico" className="space-y-6 mt-6">
            <Card className="border border-slate-200 dark:border-white/5 shadow-2xl bg-white dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2 dark:text-slate-100">
                  <History className="w-5 h-5" />
                  Histórico de Auditorias
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {historico.map(item => (
                    <div key={item.id} className="p-4 border dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={item.tipo_execucao === 'AUTOMATICA' ? 'default' : 'outline'}>
                              {item.tipo_execucao}
                            </Badge>
                            {item.escopo?.letra_produto && (
                              <span className="text-sm font-mono font-bold dark:text-slate-200">
                                {item.escopo.letra_produto}{item.escopo.ano}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                            {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })} • {item.executado_por}
                          </p>
                        </div>
                        <Badge className={item.total_problemas > 0 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}>
                          {item.total_problemas} problema(s)
                        </Badge>
                      </div>
                      {item.total_problemas > 0 && (
                        <div className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                          {item.problemas?.slice(0, 3).map((p, idx) => (
                            <div key={idx} className="text-xs">• {p.descricao}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {historico.length === 0 && (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
                      <p className="text-slate-600 dark:text-slate-400">Nenhuma auditoria executada ainda</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}