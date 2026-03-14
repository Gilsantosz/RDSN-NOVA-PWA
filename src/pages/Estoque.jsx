// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { Package, TrendingUp, TrendingDown, AlertCircle, Plus, Minus, ScanLine, Bell, Activity } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { PremiumCard } from '@/components/ui/PremiumCard';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
// KPICard removed (unused)
import ScannerEstoque from '../components/estoque/ScannerEstoque';
import ConfigEstoqueMinimo from '../components/estoque/ConfigEstoqueMinimo';
import ProdutoDetalheModal from '../components/estoque/ProdutoDetalheModal';
import SetorReadonlyBanner, { useSetorReadonly } from '@/components/pcp/SetorReadonlyBanner';

export default function Estoque() {
  const queryClient = useQueryClient();
  const { setorAtivo, isAdmin } = useSetor();
  const isReadonly = useSetorReadonly();
  const [showAjuste, setShowAjuste] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showConfigAlertas, setShowConfigAlertas] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [ajuste, setAjuste] = useState({
    produto_id: '',
    tipo: 'ENTRADA',
    quantidade: '',
    observacao: ''
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.Produto.list();
      }
      return await rdsn.entities.Produto.filter({ setor_id: setorAtivo });
    },
    enabled: !!setorAtivo
  });

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ['movimentacoes-recentes', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.MovimentacaoEstoque.list('-created_at', 50);
      }
      const produtos = await rdsn.entities.Produto.filter({ setor_id: setorAtivo });
      const produtoIds = produtos.map(p => p.id);
      const todas = await rdsn.entities.MovimentacaoEstoque.list('-created_at', 50);
      return todas.filter(m => produtoIds.includes(m.produto_id));
    },
    enabled: !!setorAtivo
  });

  const ajustarEstoqueMutation = useMutation({
    mutationFn: async (data) => {
      const produto = produtos.find(p => p.id === data.produto_id);
      if (!produto) throw new Error('Produto não encontrado');

      const quantidadeAnterior = produto.estoque_atual || 0;
      const quantidadeMovimento = parseInt(data.quantidade);
      const quantidadeNova = data.tipo === 'ENTRADA'
        ? quantidadeAnterior + quantidadeMovimento
        : quantidadeAnterior - quantidadeMovimento;

      if (quantidadeNova < 0) {
        throw new Error('Estoque não pode ficar negativo');
      }

      // Atualizar estoque do produto
      await rdsn.entities.Produto.update(data.produto_id, {
        estoque_atual: quantidadeNova
      });

      // Criar movimentação
      await rdsn.entities.MovimentacaoEstoque.create({
        produto_id: data.produto_id,
        tipo: data.tipo === 'ENTRADA' ? 'ENTRADA' : 'SAIDA',
        quantidade: quantidadeMovimento,
        quantidade_anterior: quantidadeAnterior,
        quantidade_nova: quantidadeNova,
        observacao: data.observacao
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-recentes'] });
      setShowAjuste(false);
      setAjuste({ produto_id: '', tipo: 'ENTRADA', quantidade: '', observacao: '' });
      toast.success('Estoque ajustado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao ajustar estoque: ' + error.message);
    }
  });

  const estoqueBaixo = produtos.filter(p =>
    (p.estoque_atual || 0) < (p.estoque_minimo || 0) && (p.estoque_minimo || 0) > 0
  );

  const estoqueTotal = produtos.reduce((acc, p) => acc + (p.estoque_atual || 0), 0);
  const produtosAtivos = produtos.filter(p => p.ativo).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        <SetorReadonlyBanner />
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(37,99,235,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-indigo-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all hover:scale-105 active:scale-95 group border border-blue-400/20">
                <Package className="w-8 h-8 sm:w-10 sm:h-10 text-white group-hover:rotate-12 transition-transform duration-500" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Gestão de <span className="text-blue-600 dark:text-blue-400">Estoque</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                  Inventory Intelligence • Logística Direta
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 w-full xl:w-auto">
              <Button
                variant="outline"
                onClick={() => setShowScanner(true)}
                className="h-12 px-6 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 backdrop-blur-xl transition-all text-xs font-black uppercase tracking-widest gap-2 text-slate-900 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10"
              >
                <ScanLine className="w-4 h-4" /> Scanner
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowConfigAlertas(true)}
                className="h-12 px-6 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 backdrop-blur-xl transition-all text-xs font-black uppercase tracking-widest gap-2 text-slate-900 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10"
              >
                <Bell className="w-4 h-4" /> Parâmetros
              </Button>
              {!isReadonly && (
                <Button
                  onClick={() => setShowAjuste(true)}
                  className="h-12 px-6 rounded-2xl bg-slate-900 dark:bg-blue-600 text-white font-black uppercase text-xs tracking-widest gap-2 shadow-xl hover:scale-[1.02] active:scale-95 transition-all border-0 shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4" /> Ajustar Lote
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PremiumCard title="Cotejamento Total" icon={Package} iconColor="#3b82f6">
            <h3 className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter">{estoqueTotal.toLocaleString()}</h3>
            <p className="text-[10px] text-blue-400 font-bold italic uppercase mt-2 opacity-80">Unidades em Almoxarifado</p>
          </PremiumCard>

          <PremiumCard title="Portfólio Ativo" icon={TrendingUp} iconColor="#6366f1">
            <h3 className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter">{produtosAtivos}</h3>
            <p className="text-[10px] text-indigo-400 font-bold italic uppercase mt-2 opacity-80">Produtos Cadastrados</p>
          </PremiumCard>

          <PremiumCard
            title="Nível de Ruptura"
            icon={AlertCircle}
            iconColor={estoqueBaixo.length > 0 ? "#f43f5e" : "#10b981"}
            className={estoqueBaixo.length > 0 ? "bg-rose-950/40" : "bg-slate-900/40"}
          >
            <h3 className={cn("text-4xl font-black italic tracking-tighter", estoqueBaixo.length > 0 ? "text-rose-400" : "text-emerald-400")}>
              {estoqueBaixo.length}
            </h3>
            <p className={cn("text-[10px] font-bold italic uppercase mt-2 opacity-80", estoqueBaixo.length > 0 ? "text-rose-400/80" : "text-emerald-400/80")}>
              {estoqueBaixo.length > 0 ? "Abaixo do Mínimo" : "Estoque Nominal"}
            </p>
          </PremiumCard>
        </div>

        {estoqueBaixo.length > 0 && (
          <PremiumCard
            title="Produtos com Estoque Crítico"
            icon={AlertCircle}
            iconColor="#f43f5e"
            className="bg-rose-950/10"
            badge={<Badge className="bg-red-600 text-white font-black">{estoqueBaixo.length}</Badge>}
            noPadding
          >
            <div className="divide-y divide-red-100 dark:divide-red-900/20 max-h-[300px] overflow-y-auto">
              {estoqueBaixo.map(produto => (
                <div key={produto.id} className="flex items-center justify-between p-4 sm:p-5 hover:bg-red-100/50 dark:hover:bg-red-900/10 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex items-center justify-center font-black">
                      {produto.letra_produto}
                    </div>
                    <div>
                      <span className="font-black text-slate-900 dark:text-slate-100 tracking-tight">
                        {produto.letra_produto}{produto.sufixo}
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{produto.descricao}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-black text-slate-400 mb-1">Atual / Mín</div>
                    <Badge className="bg-red-600 text-white font-black text-xs px-2 shadow-sm">
                      {produto.estoque_atual || 0} / {produto.estoque_minimo}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </PremiumCard>
        )}

        <PremiumCard title="Inventário Industrial" icon={Package} iconColor="#3b82f6" noPadding>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/10">
            {produtos.filter(p => p.ativo).map(produto => {
              const baixo = (produto.estoque_atual || 0) < (produto.estoque_minimo || 0) && (produto.estoque_minimo || 0) > 0;

              return (
                <div
                  key={produto.id}
                  onClick={() => setProdutoSelecionado(produto)}
                  className={cn(
                    "flex items-center justify-between p-6 sm:p-10 cursor-pointer transition-all group relative overflow-hidden",
                    baixo ? "bg-rose-500/5 hover:bg-rose-500/10" : "hover:bg-blue-600/5"
                  )}
                >
                  <div className={cn(
                    "absolute top-0 left-0 w-1.5 h-0 group-hover:h-full transition-all duration-500",
                    baixo ? "bg-rose-500" : "bg-blue-600"
                  )} />

                  <div className="flex items-center gap-6 sm:gap-10">
                    <div className={cn(
                      "w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] flex items-center justify-center font-black text-3xl shadow-2xl transition-all group-hover:scale-110",
                      baixo ? "bg-rose-600 text-white" : "bg-slate-950 dark:bg-white text-white dark:text-slate-900"
                    )}>
                      {produto.letra_produto}
                    </div>
                    <div className="space-y-2">
                      <div className="font-black text-slate-900 dark:text-white text-2xl tracking-tighter uppercase italic leading-none">
                        {produto.letra_produto}{produto.sufixo}
                      </div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic opacity-70">
                        {produto.descricao}
                      </div>
                      {produto.categoria && (
                        <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-0 font-black text-[9px] uppercase tracking-[0.2em] px-3 py-1 rounded-full italic">
                          {produto.categoria}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className={cn(
                      "text-5xl font-black tracking-tighter italic leading-none",
                      baixo ? "text-rose-500" : "text-slate-900 dark:text-white"
                    )}>
                      {(produto.estoque_atual || 0).toLocaleString()}
                    </div>
                    {produto.estoque_minimo > 0 && (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Meta de Segurança</span>
                        <Badge className={cn(
                          "border-0 font-black text-[10px] px-2.5",
                          baixo ? "bg-rose-500/20 text-rose-500" : "bg-emerald-500/20 text-emerald-500"
                        )}>
                          {produto.estoque_minimo} UN
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </PremiumCard>

        <PremiumCard title="Log de Movimentações" icon={Activity} iconColor="#6366f1" noPadding badge={<p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest italic opacity-70">Últimas 20 operações • Sincronizado</p>}>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/10">
            {movimentacoes.slice(0, 20).map(mov => {
              const produto = produtos.find(p => p.id === mov.produto_id);
              const isEntrada = mov.tipo === 'ENTRADA' || mov.tipo === 'PRODUCAO';

              return (
                <div key={mov.id} className="flex items-center justify-between p-6 sm:p-8 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group relative">
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-transform group-hover:rotate-6",
                      isEntrada ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                    )}>
                      {isEntrada ? <TrendingUp className="w-7 h-7" /> : <TrendingDown className="w-7 h-7" />}
                    </div>
                    <div className="space-y-1.5">
                      <div className="font-black text-slate-900 dark:text-white text-lg tracking-tighter uppercase italic leading-none">
                        {produto ? `${produto.letra_produto}${produto.sufixo}` : 'UNIT_ID_LOST'}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={cn(
                          "border-0 font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md italic",
                          isEntrada ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                        )}>
                          {mov.tipo}
                        </Badge>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic opacity-60">
                          {new Date(mov.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {mov.observacao && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 italic opacity-80 pl-2 border-l-2 border-slate-200 dark:border-white/10 mt-2">
                          “{mov.observacao}”
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-1.5">
                    <div className={cn(
                      "text-3xl font-black tracking-tighter italic leading-none",
                      isEntrada ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {isEntrada ? '+' : '-'}{mov.quantidade.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic flex items-center justify-end gap-2 leading-none">
                      <span className="opacity-50">SALDO</span>
                      <span className="text-slate-700 dark:text-slate-300">{mov.quantidade_anterior}</span>
                      <Activity className="w-3 h-3 opacity-30" />
                      <span className="text-slate-900 dark:text-white">{mov.quantidade_nova}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </PremiumCard>

        {/* Modal Detalhes do Produto */}
        <ProdutoDetalheModal
          produto={produtoSelecionado}
          open={!!produtoSelecionado}
          onOpenChange={(v) => { if (!v) setProdutoSelecionado(null); }}
        />

        {/* Scanner de Produto */}
        <ScannerEstoque
          produtos={produtos}
          open={showScanner}
          onOpenChange={setShowScanner}
          onProdutoEncontrado={(produto) => {
            // Pré-selecionar o produto no ajuste
            setAjuste(prev => ({ ...prev, produto_id: produto.id }));
          }}
        />

        {/* Config Alertas Estoque Mínimo */}
        <ConfigEstoqueMinimo
          open={showConfigAlertas}
          onOpenChange={setShowConfigAlertas}
        />

        {/* Dialog Ajuste */}
        <Dialog open={showAjuste} onOpenChange={setShowAjuste}>
          <DialogContent className="dark:bg-slate-900 dark:border-slate-800 rounded-2xl max-w-md">
            <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <DialogTitle className="dark:text-slate-100 font-black text-xl flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
                Ajustar Inventário
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-300 font-bold ml-1 uppercase text-[10px] tracking-widest text-slate-500">Produto Alvo</Label>
                <Select
                  value={ajuste.produto_id}
                  onValueChange={(v) => setAjuste({ ...ajuste, produto_id: v })}
                >
                  <SelectTrigger className="dark:border-slate-800 dark:bg-slate-950 h-11 rounded-xl focus:ring-blue-500/20">
                    <SelectValue placeholder="Selecione o produto no catálogo" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-800 rounded-xl shadow-2xl">
                    {produtos.filter(p => p.ativo).map(produto => (
                      <SelectItem key={produto.id} value={produto.id} className="dark:hover:bg-slate-800 py-3 border-b dark:border-slate-800/50 last:border-0">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 dark:text-slate-100 leading-none">{produto.letra_produto}{produto.sufixo}</span>
                          <span className="text-[10px] text-slate-500 mt-1 uppercase font-bold truncate max-w-[250px]">{produto.descricao}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-300 font-bold ml-1 uppercase text-[10px] tracking-widest text-slate-500">Fluxo</Label>
                  <Select
                    value={ajuste.tipo}
                    onValueChange={(v) => setAjuste({ ...ajuste, tipo: v })}
                  >
                    <SelectTrigger className="dark:border-slate-800 dark:bg-slate-950 h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800 rounded-xl">
                      <SelectItem value="ENTRADA" className="font-black text-emerald-600 dark:text-emerald-400 py-3">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          ENTRADA (+)
                        </div>
                      </SelectItem>
                      <SelectItem value="SAIDA" className="font-black text-rose-600 dark:text-rose-400 py-3">
                        <div className="flex items-center gap-2">
                          <Minus className="w-4 h-4" />
                          SAÍDA (-)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="dark:text-slate-300 font-bold ml-1 uppercase text-[10px] tracking-widest text-slate-500">Qtd.</Label>
                  <Input
                    type="number"
                    value={ajuste.quantidade}
                    onChange={(e) => setAjuste({ ...ajuste, quantidade: e.target.value })}
                    placeholder="0"
                    className="dark:bg-slate-950 dark:border-slate-800 h-11 rounded-xl text-lg font-black text-center"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="dark:text-slate-300 font-bold ml-1 uppercase text-[10px] tracking-widest text-slate-500">Observações Estratégicas</Label>
                <Textarea
                  value={ajuste.observacao}
                  onChange={(e) => setAjuste({ ...ajuste, observacao: e.target.value })}
                  placeholder="Descreva o motivo desta movimentação..."
                  rows={3}
                  className="dark:bg-slate-950 dark:border-slate-800 rounded-xl resize-none min-h-[90px] text-sm italic"
                />
              </div>

              <div className="flex gap-3 pt-6 border-t dark:border-slate-800">
                <Button variant="outline" onClick={() => setShowAjuste(false)} className="flex-1 h-12 rounded-xl dark:border-slate-800 dark:hover:bg-slate-800 font-black uppercase text-[11px] tracking-widest">
                  Cancelar
                </Button>
                <Button
                  onClick={() => ajustarEstoqueMutation.mutate(ajuste)}
                  disabled={!ajuste.produto_id || !ajuste.quantidade || ajustarEstoqueMutation.isPending}
                  className="flex-1 h-12 rounded-xl bg-slate-900 dark:bg-blue-600 text-white dark:hover:bg-blue-700 font-black uppercase text-[11px] tracking-widest shadow-xl shadow-blue-500/10"
                >
                  {ajustarEstoqueMutation.isPending ? 'Ajustando...' : 'Confirmar Ajuste'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}