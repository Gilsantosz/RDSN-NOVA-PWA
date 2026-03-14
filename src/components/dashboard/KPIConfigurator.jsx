import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { rdsn } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Plus, Trash2, Edit3, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function KPIConfigurator({ setorId }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingKPI, setEditingKPI] = useState(null);

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'producao_diaria',
    meta_valor: 0,
    limite_inferior: 0,
    limite_superior: 0,
    notificar_quando_fora_meta: false,
    cor_display: '#3b82f6',
    ativo: true
  });

  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: () => rdsn.entities.Setor.list()
  });

  const { data: kpis = [] } = useQuery({
    queryKey: ['kpis-config', setorId],
    queryFn: async () => {
      const todosKPIs = await rdsn.entities.ConfiguracaoKPI.list();
      return setorId ? todosKPIs.filter(k => k.setor_id === setorId) : todosKPIs;
    }
  });

  const criarKPIMutation = useMutation({
    mutationFn: (data) => rdsn.entities.ConfiguracaoKPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis-config'] });
      setShowDialog(false);
      resetForm();
      toast.success('KPI criado com sucesso!');
    }
  });

  const editarKPIMutation = useMutation({
    mutationFn: ({ id, data }) => rdsn.entities.ConfiguracaoKPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis-config'] });
      setShowDialog(false);
      resetForm();
      toast.success('KPI atualizado!');
    }
  });

  const excluirKPIMutation = useMutation({
    mutationFn: (id) => rdsn.entities.ConfiguracaoKPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis-config'] });
      toast.success('KPI excluído!');
    }
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      tipo: 'producao_diaria',
      meta_valor: 0,
      limite_inferior: 0,
      limite_superior: 0,
      notificar_quando_fora_meta: false,
      cor_display: '#3b82f6',
      ativo: true
    });
    setEditingKPI(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleOpenEdit = (kpi) => {
    setEditingKPI(kpi);
    setFormData({
      nome: kpi.nome,
      descricao: kpi.descricao || '',
      tipo: kpi.tipo,
      meta_valor: kpi.meta_valor || 0,
      limite_inferior: kpi.limite_inferior || 0,
      limite_superior: kpi.limite_superior || 0,
      notificar_quando_fora_meta: kpi.notificar_quando_fora_meta || false,
      cor_display: kpi.cor_display || '#3b82f6',
      ativo: kpi.ativo ?? true
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.nome) {
      toast.error('Digite um nome para o KPI');
      return;
    }

    const dataToSend = {
      ...formData,
      setor_id: setorId
    };

    if (editingKPI) {
      editarKPIMutation.mutate({ id: editingKPI.id, data: dataToSend });
    } else {
      criarKPIMutation.mutate(dataToSend);
    }
  };

  const tiposKPI = [
    { value: 'producao_diaria', label: 'Produção Diária' },
    { value: 'taxa_eficiencia', label: 'Taxa de Eficiência' },
    { value: 'estoque_disponivel', label: 'Estoque Disponível' },
    { value: 'reservas_ativas', label: 'Reservas Ativas' },
    { value: 'alertas_pendentes', label: 'Alertas Pendentes' },
    { value: 'custom', label: 'Customizado' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configuração de KPIs
        </h3>
        <Button onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo KPI
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.id} className={!kpi.ativo ? 'opacity-50' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: kpi.cor_display }}
                    />
                    {kpi.nome}
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    {tiposKPI.find(t => t.value === kpi.tipo)?.label}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => handleOpenEdit(kpi)}
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-600"
                    onClick={() => excluirKPIMutation.mutate(kpi.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {kpi.meta_valor > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span>Meta: {kpi.meta_valor}</span>
                </div>
              )}
              {kpi.notificar_quando_fora_meta && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Notificações ativas</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {kpis.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-slate-500">Nenhum KPI configurado ainda</p>
            <Button onClick={handleOpenCreate} className="mt-4">
              Criar Primeiro KPI
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Criação/Edição */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingKPI ? 'Editar KPI' : 'Novo KPI'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do KPI *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Produção Diária de Lacres"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição do KPI"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de KPI</Label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposKPI.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cor de Exibição</Label>
                <Input
                  type="color"
                  value={formData.cor_display}
                  onChange={(e) => setFormData(prev => ({ ...prev, cor_display: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Meta</Label>
                <Input
                  type="number"
                  value={formData.meta_valor}
                  onChange={(e) => setFormData(prev => ({ ...prev, meta_valor: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Limite Inferior</Label>
                <Input
                  type="number"
                  value={formData.limite_inferior}
                  onChange={(e) => setFormData(prev => ({ ...prev, limite_inferior: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Limite Superior</Label>
                <Input
                  type="number"
                  value={formData.limite_superior}
                  onChange={(e) => setFormData(prev => ({ ...prev, limite_superior: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <Label>Notificar quando fora da meta</Label>
                <p className="text-xs text-slate-500">Enviar alertas automáticos</p>
              </div>
              <Switch
                checked={formData.notificar_quando_fora_meta}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, notificar_quando_fora_meta: v }))}
              />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <Label>KPI Ativo</Label>
              <Switch
                checked={formData.ativo}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, ativo: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingKPI ? 'Salvar Alterações' : 'Criar KPI'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}