// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Loader2, Settings2, CheckCircle2, ArrowUpDown } from "lucide-react";
import { formatarNumeracao, extrairPrefixo } from '../formatacao/FormatacaoNumeracao';
import { estaContido, calcularQuantidade } from '../../core/numeracaoService';
import { cn } from "@/lib/utils";
import { useSetorReadonly } from '@/components/pcp/SetorReadonlyBanner';

const statusColors = {
  ABERTO: 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_15px_rgba(56,189,248,0.1)]',
  FECHADO: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
  CANCELADO: 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]',
};

const statusLabels = {
  ABERTO: 'EM OPERAÇÃO',
  FECHADO: 'FINALIZADO',
  CANCELADO: 'CANCELADO',
};

export default function ProducaoDiaCard({
  lote,
  reserva,
  setorNome,
  onFechar,
  onCancelar,
  isClosing,
  isSupervisor,
  produtos: _produtos = [],
  setorInfo: _setorInfo
}) {
  const [numInicial, setNumInicial] = useState(lote.numeracao_inicial?.toString() || '');
  const [numFinal, setNumFinal] = useState('');
  const [erro, setErro] = useState('');
  const [showFechar, setShowFechar] = useState(false);
  const [isEditingPartida, setIsEditingPartida] = useState(false);
  const [numPartidaEdit, setNumPartidaEdit] = useState('');
  const isReadonly = useSetorReadonly();

  // Detectar ordem do produto removido - mantendo lógica simplificada

  const ordemPadrao = useMemo(() => {
    return lote?.sequencia_decrescente ?? lote?.reserva_original?.sequencia_decrescente ?? reserva?.sequencia_decrescente ?? false;
  }, [lote?.sequencia_decrescente, lote?.reserva_original?.sequencia_decrescente, reserva?.sequencia_decrescente]);
  
  const [ordemDecrescente, setOrdemDecrescente] = useState(ordemPadrao);

  useEffect(() => {
    setOrdemDecrescente(ordemPadrao);
  }, [ordemPadrao]);

  // Fechar o painel de baixa quando o lote for finalizado
  useEffect(() => {
    if (lote.status === 'FECHADO') {
      setShowFechar(false);
      setNumFinal('');
      setErro('');
    }
  }, [lote.status]);

  const prefixo = extrairPrefixo(reserva?.codigo_completo || '');
  const restanteLote = (reserva?.quantidade || 0) - (reserva?.quantidade_baixada || 0);

  // Progresso geral do lote
  const totalBaixado = reserva?.quantidade_baixada || 0;
  const progressoGeral = (reserva?.quantidade || 0) > 0
    ? Math.round((totalBaixado / reserva.quantidade) * 100)
    : 0;

  const extrairNumeroPuro = (valor) => {
    if (!valor) return { num: NaN, prefixoErrado: false };
    const codigoLote = (reserva?.codigo_completo || '').toUpperCase().trim();
    const valorUpper = valor.toString().toUpperCase().trim();

    if (codigoLote && valorUpper.startsWith(codigoLote)) {
      const parteNumerica = valorUpper.slice(codigoLote.length);
      const num = Number(parteNumerica);
      if (!isNaN(num) && parteNumerica.length > 0) return { num, prefixoErrado: false };
      return { num: NaN, prefixoErrado: false };
    }

    if (/[a-zA-Z]/.test(valorUpper)) {
      return { num: NaN, prefixoErrado: true };
    }

    const num = Number(valorUpper);
    return { num, prefixoErrado: false };
  };

  const validarCampos = (iniVal, fimVal) => {
    if (!iniVal || !fimVal) return { valid: false, qty: 0 };
    
    const { num: ini, prefixoErrado: prefIni } = extrairNumeroPuro(iniVal);
    const { num: fim, prefixoErrado: prefFim } = extrairNumeroPuro(fimVal);

    if (prefIni || prefFim) {
      setErro(`Prefixo inválido. Use ${reserva?.codigo_completo} ou apenas o número`);
      return { valid: false, qty: 0 };
    }

    if (isNaN(ini) || isNaN(fim)) {
      return { valid: false, qty: 0 };
    }

    if (!estaContido(ini, reserva.numero_inicial, reserva.numero_final)) {
      setErro(`Partida fora do intervalo original (${reserva.numero_inicial} - ${reserva.numero_final})`);
      return { valid: false, qty: 0 };
    }
    if (!estaContido(fim, reserva?.numero_inicial, reserva?.numero_final)) {
      setErro(`Término fora do intervalo original (${reserva.numero_inicial} - ${reserva.numero_final})`);
      return { valid: false, qty: 0 };
    }

    const qty = calcularQuantidade(ini, fim, ordemDecrescente);
    if (qty <= 0) {
      setErro(ordemDecrescente ? "Término deve ser menor que Partida" : "Término deve ser maior que Partida");
      return { valid: false, qty: 0 };
    }

    if (qty > restanteLote) {
      setErro(`Quantidade (${qty}) excede o restante (${restanteLote})`);
      return { valid: false, qty: 0 };
    }

    setErro('');
    return { valid: true, qty };
  };

  const { qty: quantidadeCalculada } = useMemo(() => {
    return validarCampos(numInicial, numFinal);
  }, [numInicial, numFinal, ordemDecrescente]);

  const numInicialPuro = useMemo(() => extrairNumeroPuro(numInicial).num, [numInicial]);
  const numFinalPuro = useMemo(() => extrairNumeroPuro(numFinal).num, [numFinal]);

  const numInicialFormatado = formatarNumeracao(numInicialPuro || 0, prefixo, setorNome);

  const isFechado = lote.status === 'FECHADO';
  const isCancelado = lote.status === 'CANCELADO';
  const isAberto = lote.status === 'ABERTO';

  const handleToggleOrdemInCard = (novaOrdem) => {
    setOrdemDecrescente(novaOrdem);
    setErro('');
    
    // Inteligência: Se a partida estiver em um extremo, move para o outro
    const rangeMin = Math.min(reserva?.numero_inicial || 0, reserva?.numero_final || 0);
    const rangeMax = Math.max(reserva?.numero_inicial || 0, reserva?.numero_final || 0);
    const iniPuro = extrairNumeroPuro(numInicial).num;

    if (novaOrdem && iniPuro === rangeMin) {
      setNumInicial(rangeMax.toString());
    } else if (!novaOrdem && iniPuro === rangeMax) {
      setNumInicial(rangeMin.toString());
    }
  };

  const handleSalvarPartida = () => {
    const { num, prefixoErrado } = extrairNumeroPuro(numPartidaEdit);
    if (prefixoErrado || isNaN(num)) {
      toast.error('Número de partida inválido');
      return;
    }
    if (!estaContido(num, reserva.numero_inicial, reserva.numero_final)) {
      toast.error('Número fora do intervalo da reserva');
      return;
    }
    setNumInicial(num.toString());
    setIsEditingPartida(false);
  };

  if (!reserva) return null;

  return (
    <Card className={`relative overflow-hidden transition-all duration-500 border-0 rounded-[2rem] group ${isFechado ? 'bg-emerald-500/5 dark:bg-emerald-500/5 shadow-inner' :
      isCancelado ? 'bg-rose-500/5 dark:bg-rose-500/5 opacity-60 grayscale-[0.5]' :
        'bg-white dark:bg-slate-900/40 backdrop-blur-xl shadow-2xl hover:shadow-blue-500/10'
      }`}>
      {/* Indicador Lateral Premium */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-500 ${isFechado ? 'bg-emerald-500' :
        isCancelado ? 'bg-rose-500' :
          'bg-blue-600 group-hover:w-2'
        }`} />

      <CardContent className="p-6 sm:p-8 space-y-6">
        {/* Header: Cliente + Status Premium */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-slate-950 dark:bg-white text-white dark:text-slate-900 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl transition-transform group-hover:scale-110 group-hover:rotate-3">
              {reserva.letra_produto}
            </div>
            <div>
              <p className="text-lg font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                {reserva.cliente || 'OCASIONAL'}
              </p>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest italic mt-1 opacity-70">
                {reserva.codigo_produto} • {reserva.modelo}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className={`font-black text-[9px] tracking-[0.2em] rounded-full px-3 py-1 uppercase italic ${statusColors[lote.status]}`}>
              {statusLabels[lote.status]}
            </Badge>
            {ordemDecrescente && isAberto && (
              <Badge className="bg-indigo-500 text-white border-0 font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-md italic">
                ↓ INVERTIDA
              </Badge>
            )}
          </div>
        </div>

        {/* Info Grid Futurista */}
        <div className="grid grid-cols-2 gap-px bg-slate-200 dark:bg-white/5 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 shadow-inner">
          <div className="bg-white/40 dark:bg-slate-950/40 p-4 space-y-1">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic leading-none">ID do Lote</span>
            <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{reserva.codigo_completo}</p>
          </div>
          <div className="bg-white/40 dark:bg-slate-950/40 p-4 space-y-1">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic leading-none">
              {ordemDecrescente ? 'Partida Atual (↓)' : 'Partida Atual (↑)'}
            </span>
            <div className="flex items-center justify-between">
              <div className="text-sm font-black text-blue-500 dark:text-blue-400 tracking-tight flex items-center gap-2">
                {isEditingPartida ? (
                  <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                    <Input
                      type="text"
                      value={numPartidaEdit}
                      onChange={e => setNumPartidaEdit(e.target.value)}
                      className="h-7 w-28 text-[10px] font-black p-1 text-center bg-white dark:bg-slate-900 border-blue-500/50"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-500" onClick={handleSalvarPartida}><CheckCircle2 className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-500" onClick={() => setIsEditingPartida(false)}><XCircle className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <>
                    {reserva.codigo_completo}{numInicialFormatado}
                    {isAberto && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-500"
                        onClick={() => { setNumPartidaEdit(numInicial); setIsEditingPartida(true); }}
                      >
                        <Settings2 className="w-3 h-3" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white/40 dark:bg-slate-950/40 p-4 space-y-1">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic leading-none">Último Término</span>
            {isFechado ? (
              <p className="text-sm font-black text-emerald-500 tracking-tight">
                {reserva.codigo_completo}{formatarNumeracao(lote.numeracao_final, prefixo, setorNome)}
              </p>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-500 opacity-60">
                <Clock className="w-3.5 h-3.5 animate-[spin_4s_linear_infinite]" />
                <p className="text-[10px] font-black uppercase tracking-widest italic">Aguardando...</p>
              </div>
            )}
          </div>
          <div className="bg-white/40 dark:bg-slate-950/40 p-4 space-y-1">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic leading-none">Unidades Previstas</span>
            {isFechado ? (
              <p className="text-sm font-black text-emerald-500 tracking-tight">{lote.quantidade_calculada?.toLocaleString()} UN</p>
            ) : (
              <p className={cn("text-xl font-black tracking-tight", quantidadeCalculada > 0 ? "text-blue-500" : "text-slate-300 dark:text-slate-800")}>
                {quantidadeCalculada > 0 ? `${quantidadeCalculada.toLocaleString()} UN` : '——'}
              </p>
            )}
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic leading-none">Fluxo de Integridade do Lote</span>
            <span className="text-lg font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">{progressoGeral}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-white/5 relative">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isFechado ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' :
                progressoGeral >= 75 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' :
                  progressoGeral >= 40 ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]' :
                    progressoGeral > 0 ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]' :
                      'bg-slate-300 dark:bg-slate-800'
                } ${isAberto && progressoGeral < 100 ? 'animate-pulse' : ''}`}
              style={{ width: `${Math.max(progressoGeral, isAberto ? 3 : 0)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest italic">
            <span className="text-slate-400">{totalBaixado.toLocaleString()} PROCESSADOS</span>
            <span className="text-slate-400">{reserva.quantidade?.toLocaleString()} REQUERIDOS</span>
          </div>
        </div>

        {/* Painel de Ações Industriais */}
        {isAberto && (
          <div className="pt-6 border-t border-slate-200 dark:border-white/5">
            {!showFechar ? (
              <div className="flex gap-4">
                {(() => {
                  if (isReadonly) return (
                    <div className="flex-1 h-14 flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-center px-4">
                        Selecione um setor específico para registrar baixa
                      </p>
                    </div>
                  );

                  return (
                    <Button
                      onClick={() => setShowFechar(true)}
                      className="flex-1 h-14 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-xl transition-all active:scale-95 group"
                    >
                      <CheckCircle className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                      Concluir Operação
                    </Button>
                  );
                })()}
                {isSupervisor && (
                  <Button
                    variant="outline"
                    onClick={() => onCancelar(lote)}
                    className="w-14 h-14 flex items-center justify-center p-0 rounded-2xl border-rose-200 dark:border-rose-500/20 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all active:scale-95"
                  >
                    <XCircle className="w-5 h-5" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6 bg-blue-500/5 dark:bg-blue-600/5 p-6 rounded-3xl border border-blue-200/50 dark:border-blue-500/10 animate-in fade-in zoom-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-blue-500" />
                    <Label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest italic">Configuração do Intervalo</Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleOrdemInCard(!ordemDecrescente)}
                    className="h-8 px-3 text-[10px] font-black rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-blue-100 dark:border-white/5 text-blue-600 dark:text-blue-400 flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-slate-800"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    {ordemDecrescente ? 'DECRESCENTE (↓)' : 'CRESCENTE (↑)'}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black text-slate-500 uppercase ml-2">Ponto de Partida</Label>
                    <Input
                      value={numInicial}
                      onChange={(e) => { setNumInicial(e.target.value); setErro(''); }}
                      placeholder="Início"
                      className="h-14 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 rounded-2xl text-lg font-black text-center text-slate-900 dark:text-white tracking-widest"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black text-slate-500 uppercase ml-2">Ponto de Término</Label>
                    <Input
                      value={numFinal}
                      onChange={(e) => { setNumFinal(e.target.value); setErro(''); }}
                      placeholder="Fim"
                      className={cn(
                        "h-14 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 rounded-2xl text-lg font-black text-center text-slate-900 dark:text-white tracking-widest",
                        erro ? "border-rose-500 text-rose-500 ring-rose-500/10" : (quantidadeCalculada > 0 ? "border-emerald-500 ring-emerald-500/10" : "")
                      )}
                      autoFocus
                    />
                  </div>
                </div>

                {quantidadeCalculada > 0 && !erro && (
                  <div className="bg-emerald-500/10 rounded-2xl p-4 text-center border border-emerald-500/20 animate-in zoom-in-95">
                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest italic block mb-1">Cotejamento Industrial</span>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500 italic tracking-tighter">
                      {quantidadeCalculada.toLocaleString()} <span className="text-xs uppercase">Unidades</span>
                    </p>
                  </div>
                )}

                {erro && (
                  <div className="flex items-center justify-center gap-2 text-rose-500 animate-in slide-in-from-bottom-2">
                    <XCircle className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">{erro}</p>
                  </div>
                )}

                <div className="flex gap-4 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => { setShowFechar(false); setNumFinal(''); setErro(''); }}
                    className="flex-1 h-12 rounded-xl text-slate-500 font-black uppercase text-[10px] tracking-widest"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={() => onFechar(lote, numInicialPuro, numFinalPuro, ordemDecrescente, quantidadeCalculada)}
                    disabled={!numFinal || !!erro || isClosing}
                    className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl shadow-lg shadow-emerald-500/20 disabled:grayscale"
                  >
                    {isClosing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Validar Baixa
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}