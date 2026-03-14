// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { Plus, Edit2, Trash2, Send, Download, Activity, CheckCircle2, XCircle, Clock, Info, RefreshCw, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSetor } from '@/components/context/SetorContext';

export default function Integracoes() {
  const queryClient = useQueryClient();
  const { setorAtivo } = useSetor();
  const [showForm, setShowForm] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showLogs, setShowLogs] = useState(null);
  const [editingIntegracao, setEditingIntegracao] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'ERP',
    url_base: '',
    tipo_autenticacao: 'API Key',
    chave_api: '',
    url_webhook: '',
    eventos_habilitados: [],
    formato_exportacao: 'JSON',
    ativa: true
  });

  const { data: integracoes = [] } = useQuery({
    queryKey: ['integracoes'],
    queryFn: () => base44.entities.IntegracaoExterna.list()
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['logs-integracao', showLogs],
    queryFn: () => showLogs ? base44.entities.LogIntegracao.filter({ integracao_id: showLogs }) : [],
    enabled: !!showLogs
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.IntegracaoExterna.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integracoes'] });
      setShowForm(false);
      resetForm();
      toast.success('Integração criada com sucesso!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.IntegracaoExterna.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integracoes'] });
      setShowForm(false);
      resetForm();
      toast.success('Integração atualizada!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.IntegracaoExterna.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integracoes'] });
      toast.success('Integração removida!');
    }
  });

  const testarConexaoMutation = useMutation({
    mutationFn: async (integracao) => {
      const response = await base44.functions.invoke('enviarWebhook', {
        integracao_id: integracao.id,
        evento: 'TESTE_CONEXAO',
        dados: { teste: true, timestamp: new Date().toISOString() }
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Conexão testada com sucesso!');
      } else {
        toast.error('Falha ao testar conexão: ' + data.mensagem);
      }
    }
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo: 'ERP',
      url_base: '',
      tipo_autenticacao: 'API Key',
      chave_api: '',
      url_webhook: '',
      eventos_habilitados: [],
      formato_exportacao: 'JSON',
      ativa: true
    });
    setEditingIntegracao(null);
  };

  const handleOpenForm = (integracao = null, template = null) => {
    if (integracao) {
      setEditingIntegracao(integracao);
      setFormData(integracao);
    } else if (template === 'SIRC') {
      setFormData({
        nome: 'SIRC',
        tipo: 'ERP',
        url_base: 'https://api.sirc.exemplo.com',
        tipo_autenticacao: 'API Key',
        chave_api: '',
        url_webhook: 'https://api.sirc.exemplo.com/webhooks/producao',
        eventos_habilitados: ['PRODUCAO_CONFIRMADA', 'LOTE_FINALIZADO', 'RESERVA_CRIADA', 'RESERVA_CANCELADA'],
        formato_exportacao: 'JSON',
        ativa: true
      });
    }
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingIntegracao) {
      updateMutation.mutate({ id: editingIntegracao.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleExportar = async (formato) => {
    try {
      const response = await base44.functions.invoke('exportarProducao', {
        formato,
        setor_id: setorAtivo
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `producao_${Date.now()}.${formato.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success(`Dados exportados em ${formato}!`);
      setShowExport(false);
    } catch (error) {
      toast.error('Erro ao exportar: ' + error.message);
    }
  };

  const eventosDisponiveis = [
    { value: 'PRODUCAO_CONFIRMADA', label: 'Produção Confirmada' },
    { value: 'LOTE_FINALIZADO', label: 'Lote Finalizado' },
    { value: 'ALERTA_ESTOQUE_BAIXO', label: 'Alerta Estoque Baixo' },
    { value: 'DEFEITO_REGISTRADO', label: 'Defeito Registrado' },
    { value: 'RETRABALHO_CRIADO', label: 'Retrabalho Criado' },
    { value: 'RESERVA_CRIADA', label: 'Reserva Criada' },
    { value: 'RESERVA_CANCELADA', label: 'Reserva Cancelada' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-indigo-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all hover:scale-105 active:scale-95 group">
                <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 text-white group-hover:rotate-180 transition-transform duration-700" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Conexões <span className="text-blue-600 dark:text-blue-400">Externas</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80">
                  ERP • SIRC • Webhooks • Data Sync
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 w-full xl:w-auto">
              <Button asChild variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 backdrop-blur-xl hover:bg-slate-50 dark:hover:bg-white/10">
                <Link to={createPageUrl('LogsIntegracao')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Logs
                </Link>
              </Button>
              <Button onClick={() => setShowExport(true)} variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 backdrop-blur-xl hover:bg-slate-50 dark:hover:bg-white/10">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Button onClick={() => handleOpenForm(null, 'SIRC')} variant="outline" className="h-12 px-6 rounded-2xl border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 dark:bg-blue-500/10 backdrop-blur-xl hover:bg-blue-50 dark:hover:bg-blue-500/20">
                <Plus className="w-4 h-4 mr-2" />
                Configurar SIRC
              </Button>
              <Button onClick={() => handleOpenForm()} className="h-12 px-8 rounded-2xl bg-slate-900 dark:bg-blue-600 text-white font-bold uppercase text-[10px] tracking-widest gap-2 shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                <Plus className="w-4 h-4" />
                Nova Integração
              </Button>
            </div>
          </div>
        </div>

        {/* Documentação dos Dados Disponíveis */}
        <Card className="border-slate-200 bg-white col-span-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-600" />
              <CardTitle className="text-lg text-slate-900">Dados Disponíveis para Integração SIRC</CardTitle>
            </div>
            <p className="text-sm text-slate-600 mt-2">
              Estrutura completa dos dados exportados pelo sistema de Reserva de Numeração
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Estrutura de Dados de Reservas */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2 border-b pb-2">
                📦 Dados de Reservas de Lotes
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-x-auto">
                <pre className="text-xs text-slate-700">
                  {`{
  "codigo_lote": "A26LM",              // Código completo do lote
  "cliente": "SANEPAR",                // Nome do cliente
  "modelo": "DN15",                    // Modelo do produto
  "codigo_produto": "123456",          // Código técnico
  "quantidade_reservada": 5000,        // Quantidade total reservada
  "quantidade_produzida": 3200,        // Quantidade já produzida
  "status": "EM_PRODUCAO",             // Status: RESERVADO/EM_PRODUCAO/BAIXADO/PRODUZIDO/CANCELADO
  "data_reserva": "2026-01-15T10:30:00Z",
  "numero_inicial": 1,                 // Número inicial da sequência
  "numero_final": 5000,                // Número final da sequência
  "mes_producao": "Janeiro",           // Mês planejado
  "data_prevista": "2026-01-30",       // Data prevista
  "setor_id": "setor-lacres",          // ID do setor responsável
  "ano": 26                            // Ano da numeração
}`}
                </pre>
              </div>
            </div>

            {/* Estrutura de Baixas */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2 border-b pb-2">
                ✅ Dados de Baixas/Produção
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-x-auto">
                <pre className="text-xs text-slate-700">
                  {`{
  "reserva_id": "abc123",              // ID da reserva relacionada
  "numero_inicial": 1,                 // Número inicial da baixa
  "numero_final": 1000,                // Número final da baixa
  "quantidade": 1000,                  // Quantidade baixada
  "tipo": "MANUAL",                    // Tipo: MANUAL ou COLETA
  "codigo_lido": "A26LM-001-1000",     // Código lido (se coleta)
  "de_setor": "Montagem",              // Setor de origem
  "para_setor": "Expedição",           // Setor destino
  "setor_producao": "setor-lacres",    // Setor de produção
  "local": "Célula A",                 // Local físico origem
  "local_destino": "Estoque",          // Local físico destino
  "descricao_item": "Lacre tipo LM",   // Descrição do item
  "operador": "João Silva",            // Nome do operador
  "data": "2026-01-16T14:20:00Z"
}`}
                </pre>
              </div>
            </div>

            {/* Estrutura de Produtos */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2 border-b pb-2">
                📋 Dados de Produtos/Estoque
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-x-auto">
                <pre className="text-xs text-slate-700">
                  {`{
  "letra_produto": "A",                // Letra identificadora
  "sufixo": "LM",                      // Sufixo técnico
  "codigo_produto": "123456",          // Código técnico
  "modelo": "DN15",                    // Modelo
  "descricao": "Lacre tipo LM",        // Descrição
  "categoria": "Lacre",                // Categoria: Lacre/Mostrador/Componente
  "estoque_atual": 15000,              // Quantidade em estoque
  "estoque_minimo": 5000,              // Estoque mínimo
  "setor_id": "setor-lacres",          // Setor responsável
  "celulas_permitidas": ["A", "B"],    // Células de produção
  "ativo": true
}`}
                </pre>
              </div>
            </div>

            {/* Formato de Exportação Completo */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2 border-b pb-2">
                📤 Formato de Exportação Completo (JSON)
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-x-auto">
                <pre className="text-xs text-slate-700">
                  {`{
  "exportacao": {
    "data_geracao": "2026-01-19T15:30:00Z",
    "usuario": "admin@empresa.com",
    "total_registros": 150,
    "dados": [
      {
        "codigo_lote": "A26LM",
        "cliente": "SANEPAR",
        "modelo": "DN15",
        "quantidade_reservada": 5000,
        "quantidade_produzida": 3200,
        "status": "EM_PRODUCAO",
        "data_reserva": "2026-01-15T10:30:00Z",
        "numero_inicial": 1,
        "numero_final": 5000,
        "mes_producao": "Janeiro",
        "baixas": [
          {
            "quantidade": 1000,
            "tipo": "MANUAL",
            "data": "2026-01-16T14:20:00Z",
            "operador": "João Silva"
          }
        ]
      }
      // ... mais registros
    ]
  }
}`}
                </pre>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => setShowExport(true)}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Dados Agora
              </Button>
              <Button
                onClick={() => handleOpenForm(null, 'SIRC')}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Configurar Webhook Automático
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
              <strong>💡 Dica:</strong> Use "Exportar Dados Agora" para gerar um arquivo com todos os dados atuais, ou configure o webhook para envio automático ao SIRC quando eventos ocorrerem.
            </div>
          </CardContent>
        </Card>

        {/* Lista de Integrações */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integracoes.map(integracao => (
            <Card key={integracao.id} className="border-slate-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{integracao.nome}</CardTitle>
                    <Badge variant="outline" className="mt-2">{integracao.tipo}</Badge>
                  </div>
                  <Switch
                    checked={integracao.ativa}
                    onCheckedChange={(checked) =>
                      updateMutation.mutate({
                        id: integracao.id,
                        data: { ...integracao, ativa: checked }
                      })
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">{integracao.formato_exportacao}</span>
                  </div>
                  {integracao.ultima_sincronizacao && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        {new Date(integracao.ultima_sincronizacao).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                  {integracao.erros_consecutivos > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {integracao.erros_consecutivos} erros
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => testarConexaoMutation.mutate(integracao)}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Testar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowLogs(integracao.id)}
                  >
                    Logs
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenForm(integracao)}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(integracao.id)}
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Dialog - Nova/Editar Integração */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingIntegracao ? 'Editar Integração' : 'Nova Integração'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: SIRC, SAP ERP"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ERP">ERP</SelectItem>
                      <SelectItem value="MES">MES</SelectItem>
                      <SelectItem value="API">API</SelectItem>
                      <SelectItem value="Webhook">Webhook</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>URL Base *</Label>
                <Input
                  value={formData.url_base}
                  onChange={(e) => setFormData({ ...formData, url_base: e.target.value })}
                  placeholder="https://api.sirc.exemplo.com"
                  required
                />
                <p className="text-xs text-slate-500">Exemplo SIRC: https://api.sirc.exemplo.com</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Autenticação</Label>
                  <Select
                    value={formData.tipo_autenticacao}
                    onValueChange={(v) => setFormData({ ...formData, tipo_autenticacao: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="API Key">API Key</SelectItem>
                      <SelectItem value="Bearer Token">Bearer Token</SelectItem>
                      <SelectItem value="Basic Auth">Basic Auth</SelectItem>
                      <SelectItem value="OAuth2">OAuth2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Chave de API / Token</Label>
                  <Input
                    type="password"
                    value={formData.chave_api}
                    onChange={(e) => setFormData({ ...formData, chave_api: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <Input
                  value={formData.url_webhook}
                  onChange={(e) => setFormData({ ...formData, url_webhook: e.target.value })}
                  placeholder="https://api.sirc.exemplo.com/webhooks/producao"
                />
                <p className="text-xs text-slate-500">URL para notificações de eventos</p>
                <p className="text-xs text-slate-500">Exemplo SIRC: https://api.sirc.exemplo.com/webhooks/producao</p>
              </div>

              <div className="space-y-2">
                <Label>Eventos para Webhook</Label>
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-lg">
                  {eventosDisponiveis.map(evento => (
                    <div key={evento.value} className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.eventos_habilitados?.includes(evento.value)}
                        onCheckedChange={(checked) => {
                          const novos = checked
                            ? [...(formData.eventos_habilitados || []), evento.value]
                            : formData.eventos_habilitados.filter(e => e !== evento.value);
                          setFormData({ ...formData, eventos_habilitados: novos });
                        }}
                      />
                      <label className="text-sm">{evento.label}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Formato de Exportação</Label>
                <Select
                  value={formData.formato_exportacao}
                  onValueChange={(v) => setFormData({ ...formData, formato_exportacao: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JSON">JSON</SelectItem>
                    <SelectItem value="CSV">CSV</SelectItem>
                    <SelectItem value="XML">XML</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Integração Ativa</Label>
                <Switch
                  checked={formData.ativa}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
                  {editingIntegracao ? 'Salvar' : 'Criar Integração'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog - Exportar Dados */}
        <Dialog open={showExport} onOpenChange={setShowExport}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Exportar Dados de Produção</DialogTitle>
              <p className="text-sm text-slate-500 mt-2">
                Selecione o formato de exportação desejado
              </p>
            </DialogHeader>
            <div className="space-y-3">
              <Button
                className="w-full justify-start h-auto p-4"
                variant="outline"
                onClick={() => handleExportar('JSON')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">{ }</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">JSON</div>
                    <div className="text-xs text-slate-500">Formato estruturado para APIs</div>
                  </div>
                </div>
              </Button>
              <Button
                className="w-full justify-start h-auto p-4"
                variant="outline"
                onClick={() => handleExportar('CSV')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-bold text-sm">CSV</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">CSV</div>
                    <div className="text-xs text-slate-500">Planilha compatível com Excel</div>
                  </div>
                </div>
              </Button>
              <Button
                className="w-full justify-start h-auto p-4"
                variant="outline"
                onClick={() => handleExportar('XML')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-orange-600 font-bold text-sm">XML</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">XML</div>
                    <div className="text-xs text-slate-500">Formato padrão para ERP/MES</div>
                  </div>
                </div>
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog - Logs */}
        <Dialog open={!!showLogs} onOpenChange={() => setShowLogs(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Logs de Integração</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {logs.slice(0, 50).map(log => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {log.status === 'SUCESSO' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{log.evento}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(log.created_at).toLocaleString('pt-BR')} •
                          {log.tempo_resposta_ms}ms
                        </p>
                      </div>
                    </div>
                    <Badge variant={log.status === 'SUCESSO' ? 'default' : 'destructive'}>
                      {log.codigo_resposta}
                    </Badge>
                  </div>
                  {log.mensagem_erro && (
                    <p className="text-xs text-red-600 mt-2">{log.mensagem_erro}</p>
                  )}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}