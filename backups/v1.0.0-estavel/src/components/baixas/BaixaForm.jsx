import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Check, ScanLine, Camera } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatarNumeracao, extrairPrefixo } from '../formatacao/FormatacaoNumeracao';
import BarcodeScanner from '@/components/scanner/BarcodeScanner';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

export default function BaixaForm({
  reserva,
  onSubmit,
  isLoading,
  onCancel
}) {
  const { setorAtivo } = useSetor();

  // Buscar operador logado
  const { data: usuarioLogado } = useQuery({
    queryKey: ['usuario-logado'],
    queryFn: async () => {
      const user = localStorage.getItem('internalUser');
      return user ? JSON.parse(user) : null;
    }
  });

  // Buscar setores disponíveis
  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: () => base44.entities.Setor.list()
  });

  // Buscar descrição do produto
  const { data: produtoInfo } = useQuery({
    queryKey: ['produto-info', reserva?.codigo_produto],
    queryFn: async () => {
      if (!reserva?.codigo_produto) return null;
      const produtos = await base44.entities.Produto.filter({ codigo_produto: reserva.codigo_produto });
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
    codigo_lido: ''
  });

  const [calculatedQty, setCalculatedQty] = useState(0);
  const [error, setError] = useState('');
  const [ordemIniciada, setOrdemIniciada] = useState(false);
  const [ordemDecrescente, setOrdemDecrescente] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerTarget, setScannerTarget] = useState(null); // 'inicial', 'final', ou 'codigo'

  // Auto-detectar ordem de baixa do produto
  useEffect(() => {
    if (produtoInfo && !ordemIniciada) {
      const ordemProduto = produtoInfo.ordem_baixa === 'decrescente';
      setOrdemDecrescente(ordemProduto);
      setOrdemIniciada(true);
    }
  }, [produtoInfo, ordemIniciada]);

  // Preencher automaticamente números, setor de produção, operador, descrição e cliente
  useEffect(() => {
    if (reserva || usuarioLogado || produtoInfo) {
      const baixada = reserva.quantidade_baixada || 0;
      // Ordem crescente: começa do menor e avança
      const proximoNormalInicial = reserva.numero_inicial + baixada;
      // Ordem decrescente: começa do maior e recua
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
        cliente: clienteNome
      }));
    }
  }, [reserva, usuarioLogado, setores, produtoInfo, ordemDecrescente]);

  useEffect(() => {
    if (formData.numero_inicial && formData.numero_final) {
      const ini = Number(formData.numero_inicial);
      const fim = Number(formData.numero_final);

      if (ordemDecrescente) {
        // Decrescente: ini = maior número, fim = menor número
        if (fim >= ini) {
          setCalculatedQty(0);
          setError('Em ordem decrescente, o número inicial deve ser maior que o final');
          return;
        }
        setCalculatedQty(ini - fim + 1);
        // Validar se está dentro do intervalo da reserva (ini <= numero_final e fim >= numero_inicial)
        if (ini > reserva.numero_final || fim < reserva.numero_inicial) {
          setError(`Intervalo fora da reserva (${reserva.numero_inicial.toLocaleString()} - ${reserva.numero_final.toLocaleString()})`);
        } else {
          setError('');
        }
      } else {
        // Crescente: ini = menor número, fim = maior número
        if (fim >= ini) {
          setCalculatedQty(fim - ini + 1);

          if (ini < reserva.numero_inicial || fim > reserva.numero_final) {
            setError(`Intervalo fora da reserva (${reserva.numero_inicial.toLocaleString()} - ${reserva.numero_final.toLocaleString()})`);
          } else {
            setError('');
          }
        } else {
          setCalculatedQty(0);
          setError('Número final deve ser maior ou igual ao inicial');
        }
      }
    } else {
      setCalculatedQty(0);
    }
  }, [formData.numero_inicial, formData.numero_final, reserva, ordemDecrescente]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (error) return;

    const ini = Number(formData.numero_inicial);
    const fim = Number(formData.numero_final);

    // Sempre salvar numero_inicial como o MENOR e numero_final como o MAIOR independente da ordem de baixa
    const numMin = Math.min(ini, fim);
    const numMax = Math.max(ini, fim);

    onSubmit({
      reserva_id: reserva.id,
      numero_inicial: numMin,
      numero_final: numMax,
      quantidade: numMax - numMin + 1,
      tipo: formData.tipo,
      de_setor: formData.de_setor,
      para_setor: formData.para_setor,
      setor_producao: formData.setor_producao,
      local: formData.local,
      local_destino: formData.local_destino,
      descricao_item: formData.descricao_item,
      operador: formData.operador,
      cliente: formData.cliente
    });
  };

  const quantidadeRestante = reserva.quantidade - (reserva.quantidade_baixada || 0);

  const handleScanCode = React.useCallback((code) => {
    const codigoCompleto = code.trim();
    const prefixoReserva = extrairPrefixo(reserva.codigo_completo);

    // Tentar extrair número (com ou sem prefixo)
    const matchComPrefixo = codigoCompleto.match(/^([A-Z]\d{2}[A-Z]{0,5})(\d+)$/);
    const matchSemPrefixo = codigoCompleto.match(/^(\d+)$/);

    let numeroEscaneado = null;
    let prefixoEscaneado = null;

    if (matchComPrefixo) {
      prefixoEscaneado = matchComPrefixo[1];
      numeroEscaneado = parseInt(matchComPrefixo[2]);
    } else if (matchSemPrefixo) {
      numeroEscaneado = parseInt(matchSemPrefixo[1]);
    }

    console.log('OCR: Scanner target atual:', scannerTarget);
    console.log('OCR: Número escaneado:', numeroEscaneado);
    console.log('OCR: Código completo:', codigoCompleto);

    // Se escaneou um número válido
    if (numeroEscaneado !== null) {
      // Verificar prefixo se foi escaneado com prefixo
      if (prefixoEscaneado && prefixoEscaneado !== prefixoReserva) {
        toast.warning(`Prefixo ${prefixoEscaneado} não corresponde à reserva ${prefixoReserva}`);
        return;
      }

      // Decidir onde inserir baseado no target do scanner
      if (scannerTarget === 'inicial') {
        setFormData(prev => ({ ...prev, numero_inicial: numeroEscaneado.toString() }));
        toast.success(`✓ Número inicial definido: ${numeroEscaneado}`);
        setShowScanner(false);
        setScannerTarget(null);
      } else if (scannerTarget === 'final') {
        setFormData(prev => ({ ...prev, numero_final: numeroEscaneado.toString() }));
        toast.success(`✓ Número final definido: ${numeroEscaneado}`);
        setShowScanner(false);
        setScannerTarget(null);
      } else if (scannerTarget === 'codigo') {
        // Scanner do campo código lido
        setFormData(prev => ({ ...prev, codigo_lido: codigoCompleto }));

        // Tentar preencher automaticamente se possível
        if (formData.numero_inicial && formData.numero_inicial !== '') {
          const numInicial = parseInt(formData.numero_inicial);

          if (numeroEscaneado >= numInicial) {
            setFormData(prev => ({
              ...prev,
              numero_final: numeroEscaneado.toString(),
              codigo_lido: codigoCompleto
            }));
            const qtd = numeroEscaneado - numInicial + 1;
            toast.success(`✓ Baixa de ${qtd} peças! (${numInicial} até ${numeroEscaneado})`);
          } else {
            setOrdemDecrescente(true);
            setFormData(prev => ({
              ...prev,
              numero_final: numeroEscaneado.toString(),
              codigo_lido: codigoCompleto
            }));
            const qtd = numInicial - numeroEscaneado + 1;
            toast.success(`✓ Baixa de ${qtd} peças! (${numInicial} até ${numeroEscaneado})`);
          }
        } else {
          setFormData(prev => ({
            ...prev,
            numero_inicial: numeroEscaneado.toString(),
            codigo_lido: codigoCompleto
          }));
          toast.success(`✓ Número inicial: ${numeroEscaneado}`);
        }
        setShowScanner(false);
        setScannerTarget(null);
      } else {
        // Fallback: sem target definido
        toast.info('Código detectado, mas sem campo alvo definido');
      }
    } else {
      // Código não reconhecido como número
      if (scannerTarget === 'codigo') {
        setFormData(prev => ({ ...prev, codigo_lido: codigoCompleto }));
        toast.success('✓ Código armazenado');
        setShowScanner(false);
        setScannerTarget(null);
      } else {
        toast.error('Código não reconhecido como número válido');
      }
    }
  }, [scannerTarget, formData.numero_inicial, reserva]);

  return (
    <>
      <AnimatePresence>
        {showScanner && (
          <BarcodeScanner
            onScan={handleScanCode}
            onClose={() => {
              setShowScanner(false);
              setScannerTarget(null);
            }}
            placeholder={
              scannerTarget === 'inicial' ? "Escaneie o número inicial" :
                scannerTarget === 'final' ? "Escaneie o número final" :
                  "Aponte para o código do lote"
            }
          />
        )}
      </AnimatePresence>

      <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900 transition-colors">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100">
            Registrar Baixa
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 sm:p-4 md:p-5 mb-4 sm:mb-6 border border-blue-100 dark:border-blue-900/30 transition-colors">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">Código:</span>
                <p className="font-bold text-blue-900 dark:text-blue-100 mt-1">{reserva.codigo_produto || reserva.codigo_completo}</p>
              </div>
              <div>
                <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">Cliente:</span>
                <p className="font-bold text-blue-900 dark:text-blue-100 mt-1">{reserva.cliente || 'N/A'}</p>
              </div>
              <div>
                <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">Intervalo:</span>
                <p className="font-bold text-blue-900 dark:text-blue-100 mt-1 break-all">
                  {(() => {
                    const setor = setores.find((s) => s.id === reserva.setor_id);
                    const setorNome = setor?.nome || '';
                    const prefixo = extrairPrefixo(reserva.codigo_completo);
                    const numInicial = formatarNumeracao(reserva.numero_inicial, prefixo, setorNome);
                    const numFinal = formatarNumeracao(reserva.numero_final, prefixo, setorNome);
                    return `${reserva.codigo_completo}${numInicial} - ${reserva.codigo_completo}${numFinal}`;
                  })()}
                </p>
              </div>
              <div>
                <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">Total:</span>
                <p className="font-bold text-blue-900 dark:text-blue-100 mt-1">{reserva.quantidade.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">Restante:</span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-1">{quantidadeRestante.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Toggle Ordem Decrescente - DESTAQUE */}
            <div className={cn(
              "flex items-center justify-between p-4 rounded-lg border-2 transition-all",
              ordemDecrescente
                ? 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-400 dark:border-purple-800 shadow-md'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            )}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${ordemDecrescente ? 'bg-purple-500' : 'bg-slate-300'
                  }`}>
                  <span className="text-white font-bold text-lg">{ordemDecrescente ? '↓' : '↑'}</span>
                </div>
                <div>
                  <Label htmlFor="ordem" className="text-base font-bold text-slate-800 dark:text-slate-100 cursor-pointer block">
                    Ordem Decrescente
                  </Label>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {ordemDecrescente ? 'Baixa do maior para o menor número' : 'Baixa do menor para o maior número'}
                  </p>
                </div>
              </div>
              <Switch
                id="ordem"
                checked={ordemDecrescente}
                onCheckedChange={setOrdemDecrescente}
                className="scale-125"
              />
            </div>

            {/* Números */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{ordemDecrescente ? 'Número Inicial (Maior) *' : 'Número Inicial (Menor) *'}</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.numero_inicial}
                    onChange={(e) => {
                      const valor = e.target.value;
                      const match = valor.match(/^[A-Z]\d{2}[A-Z]{0,5}(\d+)$/);
                      const numero = match ? match[1] : valor;
                      setFormData((prev) => ({ ...prev, numero_inicial: numero }));
                    }}
                    placeholder={reserva.numero_inicial.toString()}
                    className="flex-1 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setScannerTarget('inicial');
                      setShowScanner(true);
                    }}
                    className="border-2 border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                  >
                    <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </Button>
                </div>

                {formData.numero_inicial &&
                  <p className="text-slate-950 dark:text-slate-100 mt-1 text-base font-medium">
                    Numeração: {reserva.codigo_completo}{(() => {
                      const setor = setores.find((s) => s.id === reserva.setor_id);
                      const setorNome = setor?.nome || '';
                      const prefixo = extrairPrefixo(reserva.codigo_completo);
                      return formatarNumeracao(Number(formData.numero_inicial), prefixo, setorNome);
                    })()}
                  </p>
                }
              </div>

              <div className="space-y-2">
                <Label>{ordemDecrescente ? 'Número Final (Menor) *' : 'Número Final (Maior) *'}</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.numero_final}
                    onChange={(e) => {
                      const valor = e.target.value;
                      const match = valor.match(/^[A-Z]\d{2}[A-Z]{0,5}(\d+)$/);
                      const numero = match ? match[1] : valor;
                      setFormData((prev) => ({ ...prev, numero_final: numero }));
                    }}
                    placeholder={reserva.numero_final.toString()}
                    className="flex-1 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setScannerTarget('final');
                      setShowScanner(true);
                    }}
                    className="border-2 border-blue-500 hover:bg-blue-50"
                  >
                    <Camera className="w-4 h-4 text-blue-600" />
                  </Button>
                </div>

                {formData.numero_final &&
                  <p className="text-slate-950 dark:text-slate-100 mt-1 text-base font-medium">
                    Numeração: {reserva.codigo_completo}{(() => {
                      const setor = setores.find((s) => s.id === reserva.setor_id);
                      const setorNome = setor?.nome || '';
                      const prefixo = extrairPrefixo(reserva.codigo_completo);
                      return formatarNumeracao(Number(formData.numero_final), prefixo, setorNome);
                    })()}
                  </p>
                }
              </div>
            </div>

            {/* Layout: De Setor/Local | Para Setor/Local */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 sm:p-4 md:pr-5 md:pb-2 md:pl-5 rounded-lg grid grid-cols-2 gap-4 sm:gap-6 md:gap-8 border-2 border-slate-300 dark:border-slate-700 transition-colors">
              {/* Coluna Esquerda */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">De Setor</Label>
                  <Input
                    value={formData.de_setor}
                    onChange={(e) => setFormData((prev) => ({ ...prev, de_setor: e.target.value }))}
                    placeholder="151"
                    className="text-2xl font-bold text-center bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" />

                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Local</Label>
                  <Input
                    value={formData.local}
                    onChange={(e) => setFormData((prev) => ({ ...prev, local: e.target.value }))}
                    placeholder="S11"
                    className="text-2xl font-bold text-center bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" />

                </div>
              </div>

              {/* Coluna Direita */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Para Setor</Label>
                  <Input
                    value={formData.para_setor}
                    onChange={(e) => setFormData((prev) => ({ ...prev, para_setor: e.target.value }))}
                    placeholder="842"
                    className="text-2xl font-bold text-center bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" />

                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Local</Label>
                  <Input
                    value={formData.local_destino}
                    onChange={(e) => setFormData((prev) => ({ ...prev, local_destino: e.target.value }))}
                    placeholder="S31"
                    className="text-2xl font-bold text-center bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" />

                </div>
              </div>
            </div>

            {/* Setor de Produção e Descrição */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
              <div className="space-y-2">
                <Label className="text-slate-600 dark:text-slate-400">Setor de Produção</Label>
                <div className="px-3 py-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{formData.setor_producao}</p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Preenchido automaticamente</p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-600 dark:text-slate-400">Descrição do Item</Label>
                <div className="px-3 py-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{formData.descricao_item}</p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Registrada automaticamente</p>
              </div>
            </div>

            {/* Operador */}
            <div className="space-y-2">
              <Label>Operador *</Label>
              <Input
                value={formData.operador}
                onChange={(e) => setFormData((prev) => ({ ...prev, operador: e.target.value }))}
                placeholder="Nome do operador"
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" />

              <p className="text-xs text-slate-500">Preenchido automaticamente - permite edição</p>
            </div>

            {/* Código Lido com Scanner */}
            <div className="space-y-2">
              <Label>Código Lido (Opcional)</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.codigo_lido}
                  onChange={(e) => setFormData(prev => ({ ...prev, codigo_lido: e.target.value }))}
                  placeholder="Digite ou escaneie o código"
                  className="flex-1 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setScannerTarget('codigo');
                    setShowScanner(true);
                  }}
                  className="gap-2 border-2 dark:hover:bg-slate-800"
                >
                  <Camera className="w-4 h-4" />
                  Scanner
                </Button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Use o scanner de câmera para ler códigos de barras/QR codes
              </p>
            </div>

            {calculatedQty > 0 && !error &&
              <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800 transition-colors">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                    Quantidade a baixar: {calculatedQty.toLocaleString()} unidades
                  </span>
                </div>
              </div>
            }

            {error &&
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            }

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onCancel} className="dark:border-slate-800 dark:hover:bg-slate-800">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !!error || calculatedQty === 0}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 dark:text-slate-100">

                <ScanLine className="w-4 h-4 mr-2" />
                Confirmar Baixa
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}