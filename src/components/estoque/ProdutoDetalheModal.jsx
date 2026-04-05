import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertCircle, Save, 
  Pencil, X, Clock 
} from 'lucide-react';
import { toast } from "sonner";

function MovimentacaoItem({ mov }) {
  const isEntrada = mov.tipo === 'ENTRADA' || mov.tipo === 'PRODUCAO';
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-md ${isEntrada ? 'bg-green-100' : 'bg-red-100'}`}>
          {isEntrada 
            ? <TrendingUp className="w-3.5 h-3.5 text-green-600" /> 
            : <TrendingDown className="w-3.5 h-3.5 text-red-600" />}
        </div>
        <div>
          <div className="text-sm font-medium text-slate-800">{mov.tipo}</div>
          <div className="text-xs text-slate-500">
            {new Date(mov.created_at).toLocaleString('pt-BR')}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-bold ${isEntrada ? 'text-green-600' : 'text-red-600'}`}>
          {isEntrada ? '+' : '-'}{mov.quantidade}
        </div>
        <div className="text-xs text-slate-400">{mov.quantidade_anterior} → {mov.quantidade_nova}</div>
      </div>
    </div>
  );
}

export default function ProdutoDetalheModal({ produto, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});

  const { data: movimentacoes = [], isLoading: loadingMov } = useQuery({
    queryKey: ['mov-produto', produto?.id],
    queryFn: async () => {
      const todas = await rdsn.entities.MovimentacaoEstoque.list('-created_at', 100);
      return todas.filter(m => m.produto_id === produto.id);
    },
    enabled: !!produto?.id && open
  });

  const { data: alertas = [], isLoading: loadingAlertas } = useQuery({
    queryKey: ['alertas-produto', produto?.id],
    queryFn: async () => {
      return await rdsn.entities.Alerta.filter({ 
        entidade_id: produto.id, 
        resolvido: false 
      });
    },
    enabled: !!produto?.id && open
  });

  const { data: setor } = useQuery({
    queryKey: ['setor-produto', produto?.setor_id],
    queryFn: () => rdsn.entities.Setor.filter({ id: produto.setor_id }),
    enabled: !!produto?.setor_id && open,
    select: (data) => data?.[0] || null
  });

  const updateMutation = useMutation({
    mutationFn: (data) => rdsn.entities.Produto.update(produto.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Produto atualizado');
      setEditMode(false);
    },
    onError: (e) => toast.error('Erro: ' + e.message)
  });

  const startEdit = () => {
    setEditData({
      estoque_atual: produto.estoque_atual || 0,
      estoque_minimo: produto.estoque_minimo || 0,
      descricao: produto.descricao || '',
      codigo_produto: produto.codigo_produto || ''
    });
    setEditMode(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      estoque_atual: Number(editData.estoque_atual),
      estoque_minimo: Number(editData.estoque_minimo),
      descricao: editData.descricao,
      codigo_produto: editData.codigo_produto
    });
  };

  if (!produto) return null;

  const baixo = (produto.estoque_atual || 0) < (produto.estoque_minimo || 0) && (produto.estoque_minimo || 0) > 0;

  // Calcular estatísticas das movimentações
  const ultimos30dias = movimentacoes.filter(m => {
    const diff = Date.now() - new Date(m.created_at).getTime();
    return diff < 30 * 24 * 60 * 60 * 1000;
  });
  const entradas30d = ultimos30dias.filter(m => m.tipo === 'ENTRADA' || m.tipo === 'PRODUCAO').reduce((s, m) => s + (m.quantidade || 0), 0);
  const saidas30d = ultimos30dias.filter(m => m.tipo === 'SAIDA' || m.tipo === 'BAIXA').reduce((s, m) => s + (m.quantidade || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setEditMode(false); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
              baixo ? 'bg-red-100 text-red-700' : 'bg-slate-900 text-white'
            }`}>
              {produto.letra_produto}
            </div>
            <div>
              <div className="text-xl">{produto.letra_produto}{produto.sufixo}</div>
              <div className="text-sm font-normal text-slate-500">{produto.descricao || produto.modelo || ''}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Alertas ativos */}
          {alertas.length > 0 && (
            <div className="space-y-2">
              {alertas.map(a => (
                <div key={a.id} className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-red-800">{a.titulo}</div>
                    <div className="text-xs text-red-600">{a.descricao}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Informações e edição rápida */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 text-sm">Informações do Produto</h3>
                {!editMode ? (
                  <Button variant="ghost" size="sm" onClick={startEdit} className="h-7 text-xs">
                    <Pencil className="w-3 h-3 mr-1" /> Editar
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditMode(false)} className="h-7 text-xs">
                      <X className="w-3 h-3 mr-1" /> Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="h-7 text-xs">
                      <Save className="w-3 h-3 mr-1" /> Salvar
                    </Button>
                  </div>
                )}
              </div>

              {editMode ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Estoque Atual</Label>
                    <Input type="number" value={editData.estoque_atual}
                      onChange={e => setEditData({...editData, estoque_atual: e.target.value})} />
                  </div>
                  <div>
                    <Label className="text-xs">Estoque Mínimo</Label>
                    <Input type="number" value={editData.estoque_minimo}
                      onChange={e => setEditData({...editData, estoque_minimo: e.target.value})} />
                  </div>
                  <div>
                    <Label className="text-xs">Descrição</Label>
                    <Input value={editData.descricao}
                      onChange={e => setEditData({...editData, descricao: e.target.value})} />
                  </div>
                  <div>
                    <Label className="text-xs">Código Técnico</Label>
                    <Input value={editData.codigo_produto}
                      onChange={e => setEditData({...editData, codigo_produto: e.target.value})} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <InfoBlock label="Estoque Atual" value={(produto.estoque_atual || 0).toLocaleString()} 
                    highlight={baixo ? 'red' : null} />
                  <InfoBlock label="Estoque Mínimo" value={(produto.estoque_minimo || 0).toLocaleString()} />
                  <InfoBlock label="Categoria" value={produto.categoria || 'N/A'} />
                  <InfoBlock label="Código Técnico" value={produto.codigo_produto || 'N/A'} />
                  <InfoBlock label="Modelo" value={produto.modelo || 'N/A'} />
                  <InfoBlock label="Setor" value={setor?.nome || 'N/A'} />
                  <InfoBlock label="Prefixo" value={produto.prefixo_padrao || 'N/A'} />
                  <InfoBlock label="Status" value={produto.ativo ? 'Ativo' : 'Inativo'} 
                    highlight={produto.ativo ? 'green' : 'gray'} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* KPIs de movimentação 30 dias */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-xs text-slate-500 mb-1">Movimentações (30d)</div>
                <div className="text-xl font-bold text-slate-900">{ultimos30dias.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-xs text-slate-500 mb-1">Entradas (30d)</div>
                <div className="text-xl font-bold text-green-600">+{entradas30d.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-xs text-slate-500 mb-1">Saídas (30d)</div>
                <div className="text-xl font-bold text-red-600">-{saidas30d.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Histórico de Movimentações */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-slate-800 text-sm">Histórico de Movimentações</h3>
                <Badge variant="secondary" className="ml-auto text-xs">{movimentacoes.length}</Badge>
              </div>
              {loadingMov ? (
                <div className="text-center py-4 text-sm text-slate-500">Carregando...</div>
              ) : movimentacoes.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-400">
                  Nenhuma movimentação registrada
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {movimentacoes.slice(0, 20).map(mov => (
                    <MovimentacaoItem key={mov.id} mov={mov} />
                  ))}
                  {movimentacoes.length > 20 && (
                    <div className="text-center py-2 text-xs text-slate-400">
                      +{movimentacoes.length - 20} movimentações anteriores
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoBlock({ label, value, highlight }) {
  const colorMap = {
    red: 'text-red-600 font-bold',
    green: 'text-green-600 font-medium',
    gray: 'text-slate-400'
  };
  return (
    <div className="bg-slate-50 rounded-lg p-2.5">
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className={`text-sm font-medium ${highlight ? colorMap[highlight] : 'text-slate-900'}`}>
        {value}
      </div>
    </div>
  );
}