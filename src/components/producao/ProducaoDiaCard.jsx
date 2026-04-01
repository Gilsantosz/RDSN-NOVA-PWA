// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Play, Loader2 } from "lucide-react";
import { formatarNumeracao, extrairPrefixo } from '../formatacao/FormatacaoNumeracao';
import { estaContido, calcularQuantidade } from '../../core/numeracaoService';

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
  produtos = [],
  setorInfo
}) {
  const [numFinal, setNumFinal] = useState('');
  const [erro, setErro] = useState('');
  const [showFechar, setShowFechar] = useState(false);

  // Detectar ordem do produto (hook deve vir antes de qualquer return condicional)
  const produtoInfo = useMemo(() => {
    if (!reserva) return null;
    return produtos.find(p => p.codigo_produto === reserva.codigo_produto)
      || produtos.find(p => p.letra_produto === reserva.letra_produto && !p.codigo_produto);
  }, [produtos, reserva?.codigo_produto, reserva?.letra_produto]);

  const ordemPadrao = useMemo(() => {
    return lote?.sequencia_decrescente ?? lote?.reserva_original?.sequencia_decrescente ?? reserva?.sequencia_decrescente ?? (produtoInfo?.ordem_numeracao === 'DECRESCENTE' || setorInfo?.sequencia_decrescente) ?? false;
  }, [lote?.sequencia_decrescente, lote?.reserva_original?.sequencia_decrescente, reserva?.sequencia_decrescente, produtoInfo, setorInfo]);
  
  const [ordemDecrescente, setOrdemDecrescente] = useState(ordemPadrao);

  useEffect(() => {
    setOrdemDecrescente(ordemPadrao);
  }, [ordemPadrao]);

  if (!reserva) return null;

  const prefixo = extrairPrefixo(reserva.codigo_completo);
  const numInicialFormatado = formatarNumeracao(lote.numeracao_inicial, prefixo, setorNome);
  const restanteLote = (reserva.quantidade || 0) - (reserva.quantidade_baixada || 0);

  // Progresso geral do lote (real, baseado em baixas)
  const totalBaixado = reserva.quantidade_baixada || 0;
  const progressoGeral = reserva.quantidade > 0
    ? Math.round((totalBaixado / reserva.quantidade) * 100)
    : 0;

  // Extrai o número puro do valor digitado, aceitando:
  // - número puro: "8" → 8
  // - código completo: "A26LM0000008" → 8 (se o prefixo bater com reserva.codigo_completo)
  const extrairNumeroPuro = (valor) => {
    const codigoLote = (reserva.codigo_completo || '').toUpperCase().trim();
    const valorUpper = valor.toUpperCase().trim();

    // Se começa com o código do lote, extrai a parte numérica após ele
    if (codigoLote && valorUpper.startsWith(codigoLote)) {
      const parteNumerica = valorUpper.slice(codigoLote.length);
      const num = Number(parteNumerica);
      if (!isNaN(num) && parteNumerica.length > 0) return { num, prefixoErrado: false };
      return { num: NaN, prefixoErrado: false };
    }

    // Se tem letras mas não começa com o código correto → prefixo errado
    if (/[a-zA-Z]/.test(valor)) {
      return { num: NaN, prefixoErrado: true };
    }

    // Número puro
    const num = Number(valor);
    return { num, prefixoErrado: false };
  };

  const handleValidarFinal = (valor) => {
    setNumFinal(valor);
    setErro('');
    if (!valor) return;

    const ini = Number(lote.numeracao_inicial) || 0;
    const { num: fim, prefixoErrado } = extrairNumeroPuro(valor);

    if (prefixoErrado) {
      setErro(`Prefixo inválido. Use ${reserva.codigo_completo} ou apenas o número final`);
      return;
    }
    if (isNaN(fim)) {
      setErro('Informe um número válido');
      return;
    }
    // Validação circular do intervalo (conforme regras RDSN)
    if (!estaContido(fim, reserva.numero_inicial, reserva.numero_final, ordemDecrescente)) {
      setErro(`Fora do intervalo (${reserva.numero_inicial.toLocaleString()} - ${reserva.numero_final.toLocaleString()})`);
      return;
    }

    // Calcula a quantidade de forma circular (conforme regras RDSN)
    const qty = calcularQuantidade(ini, fim, ordemDecrescente);

    if (qty > restanteLote) {
      setErro(`Quantidade (${qty.toLocaleString()}) excede restante (${restanteLote.toLocaleString()})`);
      return;
    }
  };

  const numFinalPuro = numFinal && !erro ? extrairNumeroPuro(numFinal).num : NaN;
  const iniSafe = Number(lote.numeracao_inicial) || 0;
  const quantidadeCalculada = numFinal && !erro && !isNaN(numFinalPuro)
    ? calcularQuantidade(iniSafe, numFinalPuro, ordemDecrescente)
    : 0;

  const isFechado = lote.status === 'FECHADO';
  const isCancelado = lote.status === 'CANCELADO';
  const isAberto = lote.status === 'ABERTO';

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
              {ordemDecrescente ? 'Numeração de Partida (↓)' : 'Numeração de Partida (↑)'}
            </span>
            <p className="text-sm font-black text-blue-500 dark:text-blue-400 tracking-tight">
              {reserva.codigo_completo}{numInicialFormatado}
            </p>
          </div>
          <div className="bg-white/40 dark:bg-slate-950/40 p-4 space-y-1">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic leading-none">Ponto de Término</span>
            {isFechado ? (
              <p className="text-sm font-black text-emerald-500 tracking-tight">
                {reserva.codigo_completo}{formatarNumeracao(lote.numeracao_final, prefixo, setorNome)}
              </p>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-500 opacity-60">
                <Clock className="w-3.5 h-3.5 animate-[spin_4s_linear_infinite]" />
                <p className="text-[10px] font-black uppercase tracking-widest italic">Processando...</p>
              </div>
            )}
          </div>
          <div className="bg-white/40 dark:bg-slate-950/40 p-4 space-y-1">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic leading-none">Unidades Coletadas</span>
            {isFechado ? (
              <p className="text-sm font-black text-emerald-500 tracking-tight">{lote.quantidade_calculada?.toLocaleString()} UN</p>
            ) : (
              <p className="text-sm font-black text-slate-300 dark:text-slate-800">——</p>
            )}
          </div>
        </div>

        {/* Barra de Progresso High-End */}
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
                <Button
                  onClick={() => setShowFechar(true)}
                  className="flex-1 h-14 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-xl transition-all active:scale-95 group"
                >
                  <CheckCircle className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                  Concluir Operação
                </Button>
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest italic">Coleta de Numeração Final</Label>
                    <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-lg">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setOrdemDecrescente(false); setNumFinal(''); setErro(''); }}
                        className={`h-6 px-2 text-[10px] font-bold rounded-md transition-all ${!ordemDecrescente ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        CRESCENTE
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setOrdemDecrescente(true); setNumFinal(''); setErro(''); }}
                        className={`h-6 px-2 text-[10px] font-bold rounded-md transition-all ${ordemDecrescente ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        DECRESCENTE
                      </Button>
                    </div>
                  </div>
                  <div className="relative">
                    <Input
                      value={numFinal}
                      onChange={(e) => handleValidarFinal(e.target.value)}
                      placeholder={ordemDecrescente ? `Terminal Min: ${Math.min(reserva.numero_inicial, reserva.numero_final)}` : `Terminal Max: ${Math.max(reserva.numero_inicial, reserva.numero_final)}`}
                      className="h-16 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 rounded-2xl text-2xl font-black text-center text-slate-900 dark:text-white tracking-widest placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      autoFocus
                    />
                    <div className="absolute top-1/2 -translate-y-1/2 right-4 pointer-events-none opacity-30">
                      <Play className="w-6 h-6 text-blue-500 rotate-90" />
                    </div>
                  </div>
                </div>

                {numFinal && !erro && !isNaN(numFinalPuro) && (
                  <div className="bg-white dark:bg-slate-950/40 rounded-2xl p-4 border border-blue-100 dark:border-blue-500/10 flex justify-between items-center italic">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Confirmação de Range</span>
                    <p className="text-sm font-black text-slate-800 dark:text-blue-400 tracking-tighter">
                      {reserva.codigo_completo}{formatarNumeracao(numFinalPuro, prefixo, setorNome)}
                    </p>
                  </div>
                )}

                {erro && (
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 animate-bounce">
                    <XCircle className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">{erro}</p>
                  </div>
                )}

                {quantidadeCalculada > 0 && !erro && (
                  <div className="bg-emerald-500/10 dark:bg-emerald-500/10 rounded-2xl p-5 text-center border border-emerald-500/20 animate-in zoom-in-95 duration-300">
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] italic block mb-1 leading-none">Cotejamento Industrial</span>
                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-500 italic tracking-tighter">
                      {quantidadeCalculada.toLocaleString()} <span className="text-sm">UNIDADES</span>
                    </p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => { setShowFechar(false); setNumFinal(''); setErro(''); }}
                    className="flex-1 h-12 rounded-xl border-slate-200 dark:border-white/10 dark:hover:bg-white/5 font-black uppercase text-[10px] tracking-widest transition-all"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={() => onFechar(lote, numFinalPuro)}
                    disabled={!numFinal || !!erro || isClosing}
                    className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 disabled:grayscale"
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