import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Unlock, TrendingDown, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const motivoConfig = {
  ENCURTAMENTO: { label: 'Encurtamento', color: 'bg-orange-100 text-orange-800' },
  QUEBRA: { label: 'Quebra', color: 'bg-purple-100 text-purple-800' },
  CANCELAMENTO: { label: 'Cancelamento', color: 'bg-red-100 text-red-800' }
};

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function NumeracoesLivres({ produtos = [], sequencias = [], onReservaCreated }) {
  const { setorAtivo } = useSetor();
  const [showForm, setShowForm] = useState(false);
  const [numeracaoSelecionada, setNumeracaoSelecionada] = useState(null);

  const { data: numeracoesLivres = [], isLoading, refetch } = useQuery({
    queryKey: ['numeracoes-livres', setorAtivo],
    queryFn: async () => {
      if (!setorAtivo) return [];
      
      // Buscar APENAS numerações com disponivel=true
      const disponiveis = await base44.entities.NumeracaoLivre.filter({ 
        disponivel: true,
        setor_id: setorAtivo 
      }, '-created_at', 100);
      
      console.log('Numerações livres carregadas:', disponiveis.length, disponiveis);
      return disponiveis;
    },
    enabled: !!setorAtivo,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true
  });

  const totalDisponivel = numeracoesLivres.reduce((acc, num) => acc + (num.quantidade || 0), 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-slate-500">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  const handleAbrirFormulario = (numeracao) => {
    setNumeracaoSelecionada(numeracao);
    setShowForm(true);
  };

  const handleReservaCreated = async (numeracao) => {
    // Aguardar um momento para garantir que o backend processou
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Refetch imediato
    await refetch();
    
    setShowForm(false);
    setNumeracaoSelecionada(null);
    
    // Callback final
    if (onReservaCreated) {
      await onReservaCreated();
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Unlock className="w-5 h-5 text-blue-600" />
              Numerações Livres
            </CardTitle>
            <Badge className="bg-blue-100 text-blue-800 text-lg px-3 py-1">
              {totalDisponivel.toLocaleString()} disponíveis
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Números liberados por encurtamento ou quebra de lotes - Clique em uma numeração para criar reserva
          </p>
        </CardHeader>
        <CardContent>
          {numeracoesLivres.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <TrendingDown className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Nenhuma numeração livre no momento</p>
            </div>
          ) : (
            <div className="space-y-2">
              {numeracoesLivres.map((num) => {
                const config = motivoConfig[num.motivo] || motivoConfig.CANCELAMENTO;
                return (
                  <div
                    key={num.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all group cursor-pointer"
                    onClick={() => handleAbrirFormulario(num)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-blue-900">
                          {num.letra_produto}{num.ano}
                        </span>
                        <span className="font-mono text-sm text-blue-700">
                          {num.numero_inicial?.toLocaleString()} - {num.numero_final?.toLocaleString()}
                        </span>
                        <Badge className={config.color} variant="outline">
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span>{format(new Date(num.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</span>
                        {num.observacoes && (
                          <span className="italic">{num.observacoes}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-900">
                          {num.quantidade?.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">unidades</div>
                      </div>
                      <Button
                        size="icon"
                        className="bg-blue-600 hover:bg-blue-700 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAbrirFormulario(num);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para criar reserva */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl sm:max-w-[90vw] md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Criar Reserva - Reutilizar Numeração Livre
            </DialogTitle>
          </DialogHeader>
          {numeracaoSelecionada && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
              <p className="text-sm text-blue-900">
                <strong>Numeração Selecionada:</strong> {numeracaoSelecionada.letra_produto}{numeracaoSelecionada.ano} 
                ({numeracaoSelecionada.numero_inicial?.toLocaleString()} - {numeracaoSelecionada.numero_final?.toLocaleString()}) 
                - {numeracaoSelecionada.quantidade?.toLocaleString()} unidades
              </p>
            </div>
          )}
          <ReservaFormNumeracaoLivre
            produtos={produtos}
            numeracao={numeracaoSelecionada}
            onSubmit={handleReservaCreated}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReservaFormSimples({ numeracao, produtos, onSubmit, isLoading, setorAtivo }) {
  const [formData, setFormData] = useState({
    cliente: '',
    modelo: '',
    codigo_produto: '',
    mes_producao: meses[new Date().getMonth()],
    data_prevista: new Date().toISOString().split('T')[0]
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', numeracao.letra_produto],
    queryFn: async () => {
      const todos = await base44.entities.Cliente.list();
      return todos.filter(c => c.letra_produto === numeracao.letra_produto);
    }
  });

  if (!numeracao) return null;

  const produto = produtos.find(p => p.letra_produto === numeracao.letra_produto);
  const sufixo = produto?.sufixo || 'LM';

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    await onSubmit({
      letra_produto: numeracao.letra_produto,
      ano: numeracao.ano,
      codigo_completo: `${numeracao.letra_produto}${numeracao.ano}${sufixo}`,
      cliente: formData.cliente,
      modelo: formData.modelo,
      codigo_produto: formData.codigo_produto,
      mes_producao: formData.mes_producao,
      data_prevista: formData.data_prevista
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-slate-600">Código:</span>
            <p className="font-mono font-bold">{numeracao.letra_produto}{numeracao.ano}{sufixo}</p>
          </div>
          <div>
            <span className="text-slate-600">Nº Inicial:</span>
            <p className="font-mono font-bold text-green-700">{numeracao.numero_inicial.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-slate-600">Nº Final:</span>
            <p className="font-mono font-bold text-green-700">{numeracao.numero_final.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-slate-600">Quantidade:</span>
            <p className="font-bold">{numeracao.quantidade.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Cliente *</Label>
        <Select value={formData.cliente} onValueChange={(v) => setFormData(p => ({ ...p, cliente: v }))}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o cliente" />
          </SelectTrigger>
          <SelectContent>
            {clientes.map(c => (
              <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Código do Produto</Label>
        <Input
          value={formData.codigo_produto}
          onChange={(e) => setFormData(p => ({ ...p, codigo_produto: e.target.value }))}
          placeholder="Código técnico"
        />
      </div>

      <div className="space-y-2">
        <Label>Modelo</Label>
        <Input
          value={formData.modelo}
          onChange={(e) => setFormData(p => ({ ...p, modelo: e.target.value }))}
          placeholder="Modelo do produto"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Mês de Produção *</Label>
          <Select value={formData.mes_producao} onValueChange={(v) => setFormData(p => ({ ...p, mes_producao: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meses.map(mes => (
                <SelectItem key={mes} value={mes}>{mes}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Data Prevista *</Label>
          <Input
            type="date"
            value={formData.data_prevista}
            onChange={(e) => setFormData(p => ({ ...p, data_prevista: e.target.value }))}
          />
        </div>
      </div>

      <Button type="submit" disabled={isLoading || !formData.cliente} className="w-full">
        {isLoading ? 'Criando...' : 'Criar Reserva'}
      </Button>
    </form>
  );
}

function ReservaFormNumeracaoLivre({ produtos, numeracao, onSubmit }) {
  const { setorAtivo } = useSetor();
  const [loading, setLoading] = useState(false);

  const handleSubmitWrapper = async (data) => {
    setLoading(true);
    try {
      console.log('🔒 Marcando numeração livre como indisponível:', numeracao.id);
      
      // PASSO 1: Marcar como indisponível IMEDIATAMENTE
      const updatedNum = await base44.entities.NumeracaoLivre.update(numeracao.id, { 
        disponivel: false 
      });
      
      console.log('✅ Numeração atualizada:', updatedNum);

      // PASSO 2: Criar a reserva
      const reserva = await base44.entities.ReservaLote.create({
        letra_produto: data.letra_produto,
        ano: data.ano,
        codigo_completo: data.codigo_completo,
        cliente: data.cliente,
        modelo: data.modelo,
        codigo_produto: data.codigo_produto,
        mes_producao: data.mes_producao,
        data_prevista: data.data_prevista,
        setor_id: setorAtivo,
        numero_inicial: numeracao.numero_inicial,
        numero_final: numeracao.numero_final,
        quantidade: numeracao.quantidade,
        quantidade_baixada: 0,
        status: 'RESERVADO'
      });

      console.log('✅ Reserva criada:', reserva.id);

      // PASSO 3: Criar auditoria
      await base44.entities.Auditoria.create({
        entidade: 'NumeracaoLivre',
        entidade_id: numeracao.id,
        acao: 'RESERVA_CRIADA',
        letra_produto: data.letra_produto,
        ano: data.ano,
        numero_inicial: numeracao.numero_inicial,
        numero_final: numeracao.numero_final,
        codigo_produto: data.codigo_produto,
        detalhes: JSON.stringify({ 
          cliente: data.cliente,
          reserva_id: reserva.id,
          numeracao_livre_usada: numeracao.id,
          numeracao_agora_indisponivel: true,
          motivo_liberacao_original: numeracao.motivo
        })
      });
      
      console.log('✅ Auditoria criada');
      
      // PASSO 4: Verificar se realmente foi marcada como indisponível
      const verificacao = await base44.entities.NumeracaoLivre.filter({ id: numeracao.id });
      console.log('🔍 Verificação final da numeração:', verificacao[0]);
      
      // Sucesso - chamar callback
      await onSubmit(numeracao);
    } catch (error) {
      console.error('❌ Erro ao criar reserva:', error);
      // Reverter marcação se houver erro
      try {
        await base44.entities.NumeracaoLivre.update(numeracao.id, { disponivel: true });
        console.log('↩️ Numeração revertida para disponível');
      } catch (revertError) {
        console.error('❌ Erro ao reverter numeração:', revertError);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <ReservaFormSimples
      numeracao={numeracao}
      produtos={produtos}
      onSubmit={handleSubmitWrapper}
      isLoading={loading}
      setorAtivo={setorAtivo}
    />
  );
}