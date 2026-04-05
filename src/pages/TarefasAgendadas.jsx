import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { Clock, Plus, Edit2, Trash2, Play, Pause, Calendar, Mail, AlertTriangle, FileText } from 'lucide-react';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const acaoIcons = {
  ENVIAR_EMAIL: Mail,
  CRIAR_ALERTA: AlertTriangle,
  ARQUIVAR_DADOS: FileText,
  GERAR_RELATORIO: FileText
};

export default function TarefasAgendadas() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo_gatilho: 'HORARIO',
    horario_execucao: '',
    dias_semana: [],
    evento_tipo: '',
    acao_tipo: 'ENVIAR_EMAIL',
    parametros: '',
    ativa: true
  });

  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ['tarefas-agendadas'],
    queryFn: () => rdsn.entities.TarefaAgendada.list('-created_at')
  });

  const createMutation = useMutation({
    mutationFn: (data) => rdsn.entities.TarefaAgendada.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas-agendadas'] });
      toast.success('Tarefa criada com sucesso!');
      setShowDialog(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => rdsn.entities.TarefaAgendada.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas-agendadas'] });
      toast.success('Tarefa atualizada!');
      setShowDialog(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => rdsn.entities.TarefaAgendada.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas-agendadas'] });
      toast.success('Tarefa removida!');
    }
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      tipo_gatilho: 'HORARIO',
      horario_execucao: '',
      dias_semana: [],
      evento_tipo: '',
      acao_tipo: 'ENVIAR_EMAIL',
      parametros: '',
      ativa: true
    });
    setEditingTask(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (tarefa) => {
    setEditingTask(tarefa);
    setFormData({
      nome: tarefa.nome,
      descricao: tarefa.descricao || '',
      tipo_gatilho: tarefa.tipo_gatilho,
      horario_execucao: tarefa.horario_execucao || '',
      dias_semana: tarefa.dias_semana || [],
      evento_tipo: tarefa.evento_tipo || '',
      acao_tipo: tarefa.acao_tipo,
      parametros: tarefa.parametros || '',
      ativa: tarefa.ativa ?? true
    });
    setShowDialog(true);
  };

  const toggleDiaSemana = (dia) => {
    setFormData(prev => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(dia)
        ? prev.dias_semana.filter(d => d !== dia)
        : [...prev.dias_semana, dia]
    }));
  };

  const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(100,116,139,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-14 sm:h-14 bg-gradient-to-br from-slate-600 to-slate-800 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(100,116,139,0.3)] transition-all hover:scale-105 active:scale-95 group border border-slate-400/20">
                <Clock className="w-8 h-8 sm:w-6 sm:h-6 text-white group-hover:rotate-12 transition-transform duration-500" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Tarefas <span className="text-slate-500 dark:text-slate-400">Agendadas</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80">
                  Automações • Rotinas • Agendamentos
                </p>
              </div>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <Button onClick={() => setShowDialog(true)} className="h-12 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all active:scale-95 shadow-lg border-0">
                <Plus className="w-4 h-4 mr-2" />
                Nova Tarefa
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PremiumCard title="Total de Tarefas" icon={Clock} iconColor="#64748b">
            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{tarefas.length}</p>
          </PremiumCard>
          <PremiumCard title="Tarefas Ativas" icon={Play} iconColor="#10b981">
            <p className="text-3xl font-black text-green-600 dark:text-green-400 tracking-tighter italic">
              {tarefas.filter(t => t.ativa).length}
            </p>
          </PremiumCard>
          <PremiumCard title="Tarefas Pausadas" icon={Pause} iconColor="#f59e0b">
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tighter italic">
              {tarefas.filter(t => !t.ativa).length}
            </p>
          </PremiumCard>
        </div>

        <PremiumCard title="Lista de Tarefas" icon={Calendar} iconColor="#6366f1" noPadding>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 border-b dark:border-slate-800">
                <TableHead className="dark:text-slate-400">Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Gatilho</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última Execução</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell>
                </TableRow>
              ) : tarefas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Nenhuma tarefa agendada
                  </TableCell>
                </TableRow>
              ) : (
                tarefas.map(tarefa => {
                  const AcaoIcon = acaoIcons[tarefa.acao_tipo] || Clock;
                  return (
                    <TableRow key={tarefa.id} className="border-b dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell className="font-medium">
                        <div>
                          <p>{tarefa.nome}</p>
                          {tarefa.descricao && (
                            <p className="text-xs text-slate-500">{tarefa.descricao}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tarefa.tipo_gatilho === 'HORARIO' ? 'default' : 'outline'}>
                          {tarefa.tipo_gatilho === 'HORARIO' ? (
                            <><Calendar className="w-3 h-3 mr-1" /> Horário</>
                          ) : (
                            <><AlertTriangle className="w-3 h-3 mr-1" /> Evento</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tarefa.tipo_gatilho === 'HORARIO' ? (
                          <span className="font-mono">{tarefa.horario_execucao}</span>
                        ) : (
                          <span className="text-sm">{tarefa.evento_tipo}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AcaoIcon className="w-4 h-4 text-slate-500" />
                          <span className="text-sm">{tarefa.acao_tipo.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={tarefa.ativa ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}>
                          {tarefa.ativa ? 'Ativa' : 'Pausada'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                        {tarefa.ultima_execucao
                          ? format(new Date(tarefa.ultima_execucao), 'dd/MM/yy HH:mm', { locale: ptBR })
                          : 'Nunca'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(tarefa)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateMutation.mutate({
                              id: tarefa.id,
                              data: { ...tarefa, ativa: !tarefa.ativa }
                            })}
                          >
                            {tarefa.ativa ? (
                              <Pause className="w-4 h-4 text-amber-500" />
                            ) : (
                              <Play className="w-4 h-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Deseja realmente remover esta tarefa?')) {
                                deleteMutation.mutate(tarefa.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </PremiumCard>

        <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa Agendada'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Tarefa *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Lembrete de reservas vencidas"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição opcional"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Gatilho *</Label>
                  <Select
                    value={formData.tipo_gatilho}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, tipo_gatilho: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HORARIO">Horário Programado</SelectItem>
                      <SelectItem value="EVENTO">Evento do Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ação a Executar *</Label>
                  <Select
                    value={formData.acao_tipo}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, acao_tipo: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ENVIAR_EMAIL">Enviar Email</SelectItem>
                      <SelectItem value="CRIAR_ALERTA">Criar Alerta</SelectItem>
                      <SelectItem value="ARQUIVAR_DADOS">Arquivar Dados Antigos</SelectItem>
                      <SelectItem value="GERAR_RELATORIO">Gerar Relatório</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.tipo_gatilho === 'HORARIO' && (
                <>
                  <div className="space-y-2">
                    <Label>Horário de Execução *</Label>
                    <Input
                      type="time"
                      value={formData.horario_execucao}
                      onChange={(e) => setFormData(prev => ({ ...prev, horario_execucao: e.target.value }))}
                      required={formData.tipo_gatilho === 'HORARIO'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Dias da Semana</Label>
                    <div className="flex flex-wrap gap-2">
                      {diasSemana.map(dia => (
                        <Button
                          key={dia}
                          type="button"
                          variant={formData.dias_semana.includes(dia) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleDiaSemana(dia)}
                        >
                          {dia.substring(0, 3)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {formData.tipo_gatilho === 'EVENTO' && (
                <div className="space-y-2">
                  <Label>Tipo de Evento *</Label>
                  <Select
                    value={formData.evento_tipo}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, evento_tipo: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um evento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RESERVA_CRIADA">Reserva Criada</SelectItem>
                      <SelectItem value="BAIXA_REGISTRADA">Baixa Registrada</SelectItem>
                      <SelectItem value="ESTOQUE_BAIXO">Estoque Baixo</SelectItem>
                      <SelectItem value="ANO_ENCERRANDO">Ano Encerrando</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Parâmetros (JSON)</Label>
                <Textarea
                  value={formData.parametros}
                  onChange={(e) => setFormData(prev => ({ ...prev, parametros: e.target.value }))}
                  placeholder='{"destinatarios": ["email@exemplo.com"], "mensagem": "..."}'
                  rows={3}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-slate-500">
                  Configure os parâmetros específicos da ação em formato JSON
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.ativa}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativa: checked }))}
                />
                <Label>Tarefa Ativa</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
                  {editingTask ? 'Salvar Alterações' : 'Criar Tarefa'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}