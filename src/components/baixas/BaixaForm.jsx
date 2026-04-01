// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, ScanLine, Camera, RefreshCw, Save, History, ShieldCheck } from "lucide-react";
import { formatarNumeracao, extrairPrefixo } from '../formatacao/FormatacaoNumeracao';
import { validarIntervaloBaixa } from '@/core/numeracaoService';
import BarcodeScanner from '@/components/scanner/BarcodeScanner';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function BaixaForm({
  reserva,
  setorInfo,
  onSubmit,
  isLoading,
  onCancel
}) {
  const { setorAtivo } = useSetor();

  const { data: usuarioLogado } = useQuery({
    queryKey: ['usuario-logado'],
    queryFn: async () => {
      const user = localStorage.getItem('internalUser');
      return user ? JSON.parse(user) : null;
    }
  });

  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: () => rdsn.entities.Setor.list()
  });

  const { data: produtoInfo } = useQuery({
    queryKey: ['produto-info', reserva?.codigo_produto],
    queryFn: async () => {
      if (!reserva?.codigo_produto) return null;
      const produtos = await rdsn.entities.Produto.filter({ codigo_produto: reserva.codigo_produto });
      return produtos.length > 0 ? produtos[0] : null;
    },
    enabled: !!reserva?.codigo_produto
  });

  const [formData, setFormData] = useState({
    numero_inicial: '',
    numero_final: '',
    tipo: 'MANUAL',
    de_setor: '151',
    para_setor: '842',
    setor_producao: '',
    local: 'S11',
    local_destino: 'S31',
    descricao_item: '',
    operador: '',
    cliente: '',
    codigo_lido: '',
    consultor: '',
    setor: '',
    requisicao: '',
    pedido: '',
    op: '',
    chassi: ''
  });

  const [calculatedQty, setCalculatedQty] = useState(0);
  const [error, setError] = useState('');
  const [ordemIniciada, setOrdemIniciada] = useState(false);
  const [ordemDecrescente, setOrdemDecrescente] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerTarget, setScannerTarget] = useState(null);
  const [automaticScanCount, setAutomaticScanCount] = useState(0);

  useEffect(() => {
    if (produtoInfo && !ordemIniciada) {
      const isDecrescente = reserva.sequencia_decrescente ?? (produtoInfo.ordem_numeracao === 'DECRESCENTE' || setorInfo?.sequencia_decrescente);
      setOrdemDecrescente(!!isDecrescente);
      setOrdemIniciada(true);
    }
  }, [produtoInfo, ordemIniciada, setorInfo]);

  useEffect(() => {
    if (reserva || usuarioLogado || produtoInfo) {
      const baixada = reserva.quantidade_baixada || 0;
      const proximoNormalInicial = reserva.numero_inicial + baixada;
      const proximoDecrescenteInicial = reserva.numero_final - baixada;

      const setorProd = setores.find((s) => s.id === setorAtivo)?.nome || '';
      const operadorNome = usuarioLogado?.full_name || '';
      const descricaoAutomatica = produtoInfo?.descricao || '';
      const clienteNome = reserva.cliente || '';

      setFormData((prev) => ({
        ...prev,
        numero_inicial: ordemDecrescente ? proximoDecrescenteInicial.toString() : proximoNormalInicial.toString(),
        setor_producao: setorProd,
        operador: operadorNome,
        descricao_item: descricaoAutomatica,
        cliente: clienteNome,
        consultor: reserva.consultor || '',
        setor: reserva.setor || '',
        requisicao: reserva.requisicao || '',
        pedido: reserva.pedido || '',
        op: reserva.op || '',
        chassi: reserva.chassi || ''
      }));
    }
  }, [reserva, usuarioLogado, setores, produtoInfo, ordemDecrescente, setorAtivo]);

  useEffect(() => {
    if (formData.numero_inicial && formData.numero_final) {
      const { valida, erro, quantidade } = validarIntervaloBaixa(
        formData.numero_inicial,
        formData.numero_final,
        reserva.numero_inicial,
        reserva.numero_final,
        ordemDecrescente
      );

      setCalculatedQty(quantidade || 0);
      setError(valida ? '' : erro);
      
      // Se for válido mas tiver uma mensagem (como aviso de fora da reserva), 
      // o erro original permitia prosseguir mas exibia o aviso.
      // No BaixaForm original, o erro bloqueava o submit. 
      // Nossa validarSequencia retorna erro para fora dos limites mas permite calculatedQty.
      // Ajustamos para manter o comportamento de aviso vira erro de bloqueio se houver string de erro.
      if (erro) setError(erro);
    } else {
      setCalculatedQty(0);
      setError('');
    }
  }, [formData.numero_inicial, formData.numero_final, reserva, ordemDecrescente]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (error || calculatedQty <= 0) return;

    const ini = Number(formData.numero_inicial);
    const fim = Number(formData.numero_final);

    onSubmit({
      reserva_id: reserva.id,
      numero_inicial: ini,
      numero_final: fim,
      quantidade: ordemDecrescente ? (ini - fim + 1) : (fim - ini + 1),
      tipo: formData.tipo,
      de_setor: formData.de_setor,
      para_setor: formData.para_setor,
      setor_producao: formData.setor_producao,
      local: formData.local,
      local_destino: formData.local_destino,
      descricao_item: formData.descricao_item,
      operador: formData.operador,
      cliente: formData.cliente,
      consultor: formData.consultor,
      setor: formData.setor,
      requisicao: formData.requisicao,
      pedido: formData.pedido,
      op: formData.op,
      chassi: formData.chassi
    });
  };

  const quantidadeRestante = reserva.quantidade - (reserva.quantidade_baixada || 0);

  const handleScanCode = (code) => {
    const codeStr = code.trim();
    const prefixoReserva = extrairPrefixo(reserva.codigo_completo);
    const matchComPrefixo = codeStr.match(/^([A-Z]\d{2}[A-Z]{0,5})(\d+)$/);
    const matchSemPrefixo = codeStr.match(/^(\d+)$/);

    let numero = null;
    let prefixo = null;

    if (matchComPrefixo) {
      prefixo = matchComPrefixo[1];
      numero = parseInt(matchComPrefixo[2]);
    } else if (matchSemPrefixo) {
      numero = parseInt(matchSemPrefixo[1]);
    }

    if (numero !== null) {
      if (prefixo && prefixo !== prefixoReserva) {
        toast.warning(`Conflito de Prefixo: ${prefixo} ≠ ${prefixoReserva}`);
        return;
      }

      if (scannerTarget === 'inicial') {
        setFormData(prev => ({ ...prev, numero_inicial: numero.toString() }));
        toast.success(`Início definido: ${numero}`);
      } else if (scannerTarget === 'final') {
        setFormData(prev => ({ ...prev, numero_final: numero.toString() }));
        toast.success(`Fim definido: ${numero}`);
      } else if (scannerTarget === 'automatic') {
        if (automaticScanCount === 0 || automaticScanCount === 2) {
          // Iniciar novo ciclo ou reiniciar
          setFormData(prev => ({ 
            ...prev, 
            numero_inicial: numero.toString(),
            numero_final: '' 
          }));
          setAutomaticScanCount(1);
          toast.success(`[Automatic] Início: ${numero}`);
        } else {
          // Fechar ciclo (segunda leitura)
          setFormData(prev => ({ ...prev, numero_final: numero.toString() }));
          setAutomaticScanCount(2);
          toast.success(`[Automatic] Fim: ${numero}`);
        }
      } else if (scannerTarget === 'codigo') {
        setFormData(prev => ({ ...prev, codigo_lido: codeStr }));
        if (formData.numero_inicial) {
          setFormData(prev => ({ ...prev, numero_final: numero.toString() }));
        } else {
          setFormData(prev => ({ ...prev, numero_inicial: numero.toString() }));
        }
      }
      setShowScanner(false);
      setScannerTarget(null);
    } else {
      if (scannerTarget === 'codigo') {
        setFormData(prev => ({ ...prev, codigo_lido: codeStr }));
        setShowScanner(false);
      } else {
        toast.error('Código inválido para este campo');
      }
    }
  };

  const handleInputChange = (field, val) => {
    const codeStr = val.toUpperCase().trim();
    if (!codeStr) {
      setFormData(p => ({ ...p, [field]: '' }));
      return;
    }

    const prefixoReserva = extrairPrefixo(reserva?.codigo_completo || '');
    const matchComPrefixo = codeStr.match(/^([A-Z]\d{2}[A-Z]{0,5})(\d+)$/);

    if (matchComPrefixo) {
      const prefixObj = matchComPrefixo[1];
      const numObj = parseInt(matchComPrefixo[2], 10);
      
      if (prefixoReserva && prefixObj !== prefixoReserva) {
        toast.warning(`Atenção: Prefixo lido (${prefixObj}) é diferente do lote (${prefixoReserva})`);
      }
      setFormData(p => ({ ...p, [field]: numObj.toString() }));
      return;
    }

    const digitsOnly = codeStr.replace(/\D/g, '');
    setFormData(p => ({ 
      ...p, 
      [field]: digitsOnly ? parseInt(digitsOnly, 10).toString() : '' 
    }));
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showScanner && (
          <BarcodeScanner
            onScan={handleScanCode}
            onClose={() => { setShowScanner(false); setScannerTarget(null); }}
            placeholder="Aponte para a identificação do item"
          />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Lado Esquerdo: Contexto do Lote */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-slate-950 dark:bg-black rounded-[2rem] p-6 border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16" />
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-tight mb-4">Contexto Operacional</p>

            <div className="space-y-4 relative z-10">
              <div>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Entidade</span>
                <p className="text-sm font-black text-white uppercase italic truncate">{reserva.cliente || 'CONSUMIDOR'}</p>
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Estrutura</span>
                <p className="text-sm font-black text-blue-400 uppercase italic truncate">{reserva.modelo}</p>
              </div>
              <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Lote</span>
                  <p className="text-xl font-black text-white italic tracking-tighter">{reserva.quantidade}</p>
                </div>
                <div>
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Pendente</span>
                  <p className="text-xl font-black text-emerald-400 italic tracking-tighter">{quantidadeRestante}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
              <div className="flex items-center justify-between text-[8px] font-black uppercase text-slate-500">
                <span>Performance</span>
                <span className="text-white">{Math.round((reserva.quantidade_baixada / reserva.quantidade) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_10px_rgba(37,99,235,0.5)]" style={{ width: `${(reserva.quantidade_baixada / reserva.quantidade) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200 dark:border-white/5 shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Estratégia</Label>
              <Switch checked={ordemDecrescente} onCheckedChange={setOrdemDecrescente} className="data-[state=checked]:bg-purple-600" />
            </div>
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                ordemDecrescente ? "bg-purple-500/10 text-purple-600" : "bg-blue-500/10 text-blue-600"
              )}>
                <ScanLine className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-900 dark:text-white leading-none uppercase italic">Sentido de Processo</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{ordemDecrescente ? 'Decrescente (Invertido)' : 'Crescente (Sequencial)'}</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-500/5 dark:bg-amber-500/10 rounded-[2rem] p-6 border border-amber-500/20 shadow-xl transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500 italic">Condições de Uso</h3>
            </div>
            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed italic">
              "O operador declara sob as penas da lei que o consumo aqui registrado é verdadeiro e confere com os itens em posse e de uso do setor. Qualquer divergência deve ser comunicada e registrada na aba de ocorrências imediatamente."
            </p>
          </div>
        </div>

        {/* Lado Direito: Formulário de Coleta */}
        <div className="md:col-span-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6 bg-slate-50 dark:bg-white/5 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-inner">
            
            {/* Leitura Industrial Automática */}
            <div className="relative group overflow-hidden bg-slate-900 rounded-3xl p-6 border-2 border-blue-500/20 hover:border-blue-500/40 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <ScanLine className="w-24 h-24 text-white" />
              </div>
              
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-white font-black italic uppercase tracking-wider text-lg flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Leitura Industrial Automática
                  </h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                    {automaticScanCount === 0 ? "Aguardando leitura inicial..." : 
                     automaticScanCount === 1 ? "Pronto para leitura terminal..." : 
                     "Ciclo completo. Reinicie para nova sequência."}
                  </p>
                </div>

                <div className="flex gap-3">
                  {automaticScanCount > 0 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setAutomaticScanCount(0);
                        setFormData(p => ({ ...p, numero_inicial: '', numero_final: '' }));
                      }}
                      className="rounded-2xl border-white/10 text-white hover:bg-white/10"
                    >
                      Reset
                    </Button>
                  )}
                  <Button 
                    type="button"
                    onClick={() => { setScannerTarget('automatic'); setShowScanner(true); }}
                    className="h-14 px-8 bg-blue-600 hover:bg-blue-50 text-white hover:text-blue-900 rounded-2xl font-black uppercase italic tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center gap-3"
                  >
                    <Camera className="w-6 h-6" />
                    Acionar Scanner
                  </Button>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="mt-6 grid grid-cols-2 gap-2">
                <div className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  automaticScanCount >= 1 ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-white/10"
                )} />
                <div className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  automaticScanCount >= 2 ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-white/10"
                )} />
              </div>

              <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1 italic">
                <div className="flex items-center gap-2">
                  <History className="w-3 h-3 text-blue-500" />
                  <span>Log: {formData.numero_final ? `Fim ${formData.numero_final}` : formData.numero_inicial ? `Início ${formData.numero_inicial}` : 'Nenhuma leitura detectada'}</span>
                </div>
                <span>{automaticScanCount}/2 Coletas</span>
              </div>
            </div>

            {/* Intervalo de Numeração */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">{ordemDecrescente ? 'Terminal Partida' : 'Terminal Inicial'}</Label>
                  <button type="button" onClick={() => { setScannerTarget('inicial'); setShowScanner(true); }} className="text-blue-600 hover:scale-110 transition-transform"><Camera className="w-4 h-4" /></button>
                </div>
                <Input
                  value={formData.numero_inicial}
                  onChange={(e) => handleInputChange('numero_inicial', e.target.value)}
                  className="h-20 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-white/5 rounded-3xl px-8 text-4xl font-black italic tracking-tighter text-blue-600 dark:text-blue-400 focus:border-blue-500 transition-all shadow-sm"
                />
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 italic">
                  Offset: {reserva.codigo_completo}{formatarNumeracao(Number(formData.numero_inicial), extrairPrefixo(reserva.codigo_completo), setores.find(s => s.id === reserva.setor_id)?.nome)}
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">{ordemDecrescente ? 'Terminal Final' : 'Terminal Encerramento'}</Label>
                  <button type="button" onClick={() => { setScannerTarget('final'); setShowScanner(true); }} className="text-blue-600 hover:scale-110 transition-transform"><Camera className="w-4 h-4" /></button>
                </div>
                <div className="relative">
                  <Input
                    value={formData.numero_final}
                    onChange={(e) => handleInputChange('numero_final', e.target.value)}
                    className="h-20 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-white/5 rounded-3xl px-8 text-4xl font-black italic tracking-tighter text-blue-600 dark:text-blue-400 focus:border-blue-500 transition-all shadow-sm pr-20"
                  />
                  {formData.numero_final && (!error || calculatedQty > 0) && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-end pointer-events-none">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-none">Qtd</span>
                      <Badge className={cn("text-white font-black text-sm px-2 py-0.5 rounded-lg shadow-md", error ? "bg-rose-500" : "bg-emerald-500")}>
                        {error ? "—" : calculatedQty}
                      </Badge>
                    </div>
                  )}
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 italic">
                  Offset: {reserva.codigo_completo}{formatarNumeracao(Number(formData.numero_final), extrairPrefixo(reserva.codigo_completo), setores.find(s => s.id === reserva.setor_id)?.nome)}
                </p>
              </div>
            </div>

            {/* Logística */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Origem</Label>
                <Input value={formData.de_setor} onChange={e => setFormData(p => ({ ...p, de_setor: e.target.value }))} className="h-12 bg-slate-50 dark:bg-black font-black text-center text-lg italic border-0" />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">L. Interno</Label>
                <Input value={formData.local} onChange={e => setFormData(p => ({ ...p, local: e.target.value }))} className="h-12 bg-slate-50 dark:bg-black font-black text-center text-lg italic border-0 uppercase" />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Destino</Label>
                <Input value={formData.para_setor} onChange={e => setFormData(p => ({ ...p, para_setor: e.target.value }))} className="h-12 bg-slate-50 dark:bg-black font-black text-center text-lg italic border-0" />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">L. Destino</Label>
                <Input value={formData.local_destino} onChange={e => setFormData(p => ({ ...p, local_destino: e.target.value }))} className="h-12 bg-slate-50 dark:bg-black font-black text-center text-lg italic border-0 uppercase" />
              </div>
            </div>

            {/* Responsável */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic ml-2">Agente Responsável pela Coleta</Label>
              <Input
                value={formData.operador}
                onChange={e => setFormData(p => ({ ...p, operador: e.target.value.toUpperCase() }))}
                placeholder="CERTIFICAÇÃO DO AGENTE"
                disabled={true}
                className="h-14 bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-white/5 rounded-2xl px-6 font-black italic uppercase tracking-tighter opacity-70 cursor-not-allowed"
              />
            </div>

            {/* Campos Adicionais Solicitados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Consultor</Label>
                <Input 
                  value={formData.consultor} 
                  onChange={e => setFormData(p => ({ ...p, consultor: e.target.value.toUpperCase() }))} 
                  className="h-12 bg-slate-50 dark:bg-black font-black text-lg italic border-0" 
                  placeholder="NOME DO CONSULTOR"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Setor Destino</Label>
                <Select 
                  value={formData.setor} 
                  onValueChange={value => setFormData(p => ({ ...p, setor: value }))}
                >
                  <SelectTrigger className="h-12 bg-slate-50 dark:bg-black font-black text-lg italic border-0">
                    <SelectValue placeholder="SELECIONE O SETOR" />
                  </SelectTrigger>
                  <SelectContent>
                    {setores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Requisição</Label>
                <Input 
                  value={formData.requisicao} 
                  onChange={e => setFormData(p => ({ ...p, requisicao: e.target.value.toUpperCase() }))} 
                  className="h-12 bg-slate-50 dark:bg-black font-black text-lg italic border-0" 
                  placeholder="Nº REQUISIÇÃO"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Pedido</Label>
                <Input 
                  value={formData.pedido} 
                  onChange={e => setFormData(p => ({ ...p, pedido: e.target.value.toUpperCase() }))} 
                  className="h-12 bg-slate-50 dark:bg-black font-black text-lg italic border-0" 
                  placeholder="Nº PEDIDO"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">OP (Ordem de Produção)</Label>
                <Input 
                  value={formData.op} 
                  onChange={e => setFormData(p => ({ ...p, op: e.target.value.toUpperCase() }))} 
                  className="h-12 bg-slate-50 dark:bg-black font-black text-lg italic border-0" 
                  placeholder="Nº OP"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Chassi</Label>
                <Input 
                  value={formData.chassi} 
                  onChange={e => setFormData(p => ({ ...p, chassi: e.target.value.toUpperCase() }))} 
                  className="h-12 bg-slate-50 dark:bg-black font-black text-lg italic border-0" 
                  placeholder="IDENTIFICAÇÃO CHASSI"
                />
              </div>
            </div>

            {/* Validação de Carga */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
              {calculatedQty > 0 && !error ? (
                <div className="bg-emerald-500/10 border-2 border-emerald-500/20 p-5 rounded-3xl flex items-center justify-between animate-in zoom-in duration-500">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <Check className="w-6 h-6 text-white stroke-[4px]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Carga Calculada</p>
                      <p className="text-2xl font-black text-emerald-700 italic tracking-tighter">{calculatedQty.toLocaleString()} UNIDADES</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500 text-white font-black uppercase italic text-[9px] px-3 py-1 rounded-lg">✓ CONFLUENTE</Badge>
                </div>
              ) : error ? (
                <div className="bg-rose-500/10 border-2 border-rose-500/20 p-5 rounded-3xl flex items-center gap-4 animate-[shake_0.5s_ease-in-out]">
                  <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest leading-none">Erro de Validação</p>
                    <p className="text-xs font-bold text-rose-700 leading-tight mt-1">{error}</p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Botões */}
            <div className="flex gap-4 pt-4">
              <Button type="button" variant="ghost" onClick={onCancel} className="h-16 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-rose-500 transition-colors">Voltar</Button>
              <Button
                type="submit"
                disabled={isLoading || error || calculatedQty <= 0}
                className="flex-1 h-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:grayscale overflow-hidden relative"
              >
                <div className="absolute inset-y-0 left-0 w-2 bg-blue-600" />
                {isLoading ? <RefreshCw className="w-5 h-5 animate-spin mr-3" /> : <Save className="w-5 h-5 mr-3" />}
                Confirmar Registro Industrial
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}