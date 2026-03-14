import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Unlock, TrendingDown, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
      const disponiveis = await rdsn.entities.NumeracaoLivre.filter({
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
      <PremiumCard title="Numerações Livres" icon={Unlock}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Sincronizando dados...</p>
        </div>
      </PremiumCard>
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
      <PremiumCard
        title="Numerações Livres"
        icon={Unlock}
        badge={
          <div className="flex bg-blue-600/10 dark:bg-blue-400/10 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-900/30 shadow-sm">
            <span className="text-blue-600 dark:text-blue-400 font-black text-sm uppercase tracking-tighter">
              {totalDisponivel.toLocaleString()} <span className="text-[10px] opacity-70">disponíveis</span>
            </span>
          </div>
        }
      >
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest italic opacity-80 mb-6">
          Números liberados por encurtamento ou quebra • Clique para reutilizar
        </p>

        {numeracoesLivres.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 relative overflow-hidden bg-white/40 dark:bg-[#0c0c0e]/40 backdrop-blur-md rounded-[2.5rem] border border-dashed border-slate-300 dark:border-white/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] transition-all duration-500 group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:from-blue-500/10 dark:to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="p-6 bg-white/60 dark:bg-white/5 rounded-full mb-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(255,255,255,0.02)] border border-white/50 dark:border-white/5 relative z-10 group-hover:scale-110 transition-transform duration-500 ease-out">
              <TrendingDown className="w-8 h-8 opacity-50 text-slate-500 dark:text-slate-400" />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 relative z-10">Sem numerações liberadas</p>
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-2 relative z-10">Nenhuma numeração por encurtamento no momento</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {numeracoesLivres.map((num) => {
              const config = motivoConfig[num.motivo] || motivoConfig.CANCELAMENTO;
              return (
                <div
                  key={num.id}
                  className="group relative flex flex-col p-6 bg-white/60 dark:bg-[#111116]/80 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.1)] dark:hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:-translate-y-1 transition-all duration-500 cursor-pointer overflow-hidden ring-1 ring-slate-200/50 dark:ring-white/5 hover:ring-blue-500/30 dark:hover:ring-blue-400/30"
                  onClick={() => handleAbrirFormulario(num)}
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-blue-400 to-indigo-600 rounded-l-[2rem] translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />

                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-1 bg-slate-100/80 dark:bg-white/5 rounded-lg font-mono text-[10px] font-black text-slate-600 dark:text-slate-400 block border border-slate-200/50 dark:border-white/5 shadow-sm">
                          {num.letra_produto}{num.ano}
                        </span>
                        <Badge className={cn("font-black uppercase tracking-widest text-[9px] px-2.5 py-1 border-0 shadow-sm", config.color)}>
                          {config.label}
                        </Badge>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none flex items-center gap-1.5">
                        {num.numero_inicial?.toLocaleString()} <span className="text-slate-300 dark:text-slate-600 font-medium font-sans">→</span> {num.numero_final?.toLocaleString()}
                      </h3>
                    </div>
                    <div className="text-right bg-blue-50/50 dark:bg-blue-900/10 px-3 py-2 rounded-xl border border-blue-100/50 dark:border-blue-800/20">
                      <p className="text-2xl font-black text-blue-600 dark:text-blue-400 leading-none tracking-tighter">{num.quantidade?.toLocaleString()}</p>
                      <p className="text-[9px] font-black text-blue-500/70 dark:text-blue-400/70 uppercase tracking-widest mt-1">LIVRES</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-5 border-t border-slate-200/50 dark:border-white/5">
                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest italic opacity-70">
                      <span>{num.created_at ? format(new Date(num.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR }) : 'Data não disponível'}</span>
                    </div>
                    <Button
                      size="sm"
                      className="h-9 w-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white p-0 shadow-lg shadow-blue-500/30 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-4 group-hover:translate-x-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {num.observacoes && (
                    <div className="mt-3 text-[9px] font-medium text-slate-400 italic truncate border-l-2 border-slate-200 dark:border-slate-800 pl-2">
                      {num.observacoes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PremiumCard>

      {/* Modal para criar reserva */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl sm:max-w-[90vw] md:max-w-2xl bg-white/90 dark:bg-[#0c0c0e]/95 backdrop-blur-3xl border border-white/50 dark:border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-8 md:p-10 [&>button]:right-6 [&>button]:top-6 [&>button]:h-10 [&>button]:w-10 [&>button]:rounded-2xl [&>button]:bg-slate-100/50 dark:[&>button]:bg-white/5 [&>button]:backdrop-blur-xl [&>button]:border [&>button]:border-white/50 dark:[&>button]:border-white/10 [&>button]:transition-all hover:[&>button]:scale-110 hover:[&>button]:bg-red-50 hover:[&>button]:text-red-500 hover:[&>button]:border-red-200 dark:hover:[&>button]:bg-red-500/20 dark:hover:[&>button]:border-red-500/30 dark:hover:[&>button]:text-red-400">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_0_20px_rgba(37,99,235,0.3)] text-white rounded-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] bg-[position:-100%_0] group-hover:bg-[position:200%_0] transition-[background-position] duration-700 ease-in-out" />
                <Unlock className="w-6 h-6 relative z-10" />
              </div>
              <div className="flex flex-col">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">Criar Reserva</span>
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium tracking-normal mt-0.5 flex items-center gap-1.5">— Reutilizar Livre</span>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {numeracaoSelecionada && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/5 border border-blue-200/50 dark:border-blue-800/20 mb-8 flex items-center justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
              <div className="relative z-10">
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Cód. & Numeração
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="px-2.5 py-1 bg-white/80 dark:bg-black/40 rounded-lg font-mono text-xs font-black text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-white/10 shadow-sm">
                    {numeracaoSelecionada.letra_produto}{numeracaoSelecionada.ano}
                  </span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tighter">
                    {numeracaoSelecionada.numero_inicial?.toLocaleString()} <span className="text-slate-300 dark:text-slate-600 font-sans font-medium mx-1">→</span> {numeracaoSelecionada.numero_final?.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end relative z-10">
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Quantidade</p>
                <Badge className="bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 text-sm font-black px-4 py-1.5 rounded-xl border border-blue-500/50">
                  {numeracaoSelecionada.quantidade?.toLocaleString()} unid.
                </Badge>
              </div>
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
      const todos = await rdsn.entities.Cliente.list();
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label className="text-[10px] font-black tracking-widest uppercase text-slate-500 dark:text-slate-400">Cliente *</Label>
        <Select value={formData.cliente} onValueChange={(v) => setFormData(p => ({ ...p, cliente: v }))}>
          <SelectTrigger className="h-14 bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 transition-colors border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] px-4">
            <SelectValue placeholder="Selecione o cliente" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 shadow-2xl bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-xl">
            {clientes.map(c => (
              <SelectItem key={c.id} value={c.nome} className="rounded-lg cursor-pointer py-3">{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-black tracking-widest uppercase text-slate-500 dark:text-slate-400">Código do Produto</Label>
          <Input
            value={formData.codigo_produto}
            onChange={(e) => setFormData(p => ({ ...p, codigo_produto: e.target.value }))}
            placeholder="Ex: TQ-1234"
            className="h-14 bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 transition-colors border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] px-4 font-mono text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black tracking-widest uppercase text-slate-500 dark:text-slate-400">Modelo</Label>
          <Input
            value={formData.modelo}
            onChange={(e) => setFormData(p => ({ ...p, modelo: e.target.value }))}
            placeholder="Ex: Padrão"
            className="h-14 bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 transition-colors border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] px-4"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-black tracking-widest uppercase text-slate-500 dark:text-slate-400">Mês de Produção *</Label>
          <Select value={formData.mes_producao} onValueChange={(v) => setFormData(p => ({ ...p, mes_producao: v }))}>
            <SelectTrigger className="h-14 bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 transition-colors border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] px-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 shadow-2xl bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-xl">
              {meses.map(mes => (
                <SelectItem key={mes} value={mes} className="rounded-lg cursor-pointer py-3">{mes}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black tracking-widest uppercase text-slate-500 dark:text-slate-400">Data Prevista *</Label>
          <Input
            type="date"
            value={formData.data_prevista}
            onChange={(e) => setFormData(p => ({ ...p, data_prevista: e.target.value }))}
            className="h-14 bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 transition-colors border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] px-4 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
      </div>

      <div className="pt-6 border-t border-slate-200/50 dark:border-white/10 mt-6">
        <Button 
          type="submit" 
          disabled={isLoading || !formData.cliente} 
          className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 dark:from-blue-600 dark:to-indigo-600 dark:hover:from-blue-500 dark:hover:to-indigo-500 text-white rounded-2xl shadow-[0_8px_16px_-6px_rgba(37,99,235,0.4)] hover:shadow-[0_12px_20px_-6px_rgba(37,99,235,0.6)] hover:-translate-y-0.5 transition-all duration-300 text-base font-bold tracking-wide group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] bg-[position:-100%_0] group-hover:bg-[position:200%_0] transition-[background-position] duration-700 ease-in-out" />
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              'Confirmar Reserva'
            )}
          </span>
        </Button>
      </div>
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
      const updatedNum = await rdsn.entities.NumeracaoLivre.update(numeracao.id, {
        disponivel: false
      });

      console.log('✅ Numeração atualizada:', updatedNum);

      // PASSO 2: Criar a reserva
      const reserva = await rdsn.entities.ReservaLote.create({
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
      await rdsn.entities.Auditoria.create({
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
      const verificacao = await rdsn.entities.NumeracaoLivre.filter({ id: numeracao.id });
      console.log('🔍 Verificação final da numeração:', verificacao[0]);

      // Sucesso - chamar callback
      await onSubmit(numeracao);
    } catch (error) {
      console.error('❌ Erro ao criar reserva:', error);
      // Reverter marcação se houver erro
      try {
        await rdsn.entities.NumeracaoLivre.update(numeracao.id, { disponivel: true });
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