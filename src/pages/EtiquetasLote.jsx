// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, ArrowLeft, ChevronDown, Loader2, ChevronsDown, ChevronsUp } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
// import { createPageUrl } from '../utils';
import { useNavigate } from 'react-router-dom';
import { useSetor } from '@/components/context/SetorContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { proximoNumero, anteriorNumero, calcularQuantidade, calcularFim, estaContido } from '../core/numeracaoService';

export default function EtiquetasLotePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reservaId = searchParams.get('reservaId');
  const queryClient = useQueryClient();
  const { setorAtivo, isAdmin } = useSetor();

  const [quantidadePorCaixa, setQuantidadePorCaixa] = useState('');
  const [quantidadePorPallet, setQuantidadePorPallet] = useState('');
  const [pallets, setPallets] = useState([]);
  const [expandedPallets, setExpandedPallets] = useState({});
  const [busca, setBusca] = useState('');
  const [buscaPallets, setBuscaPallets] = useState('');
  const [numeroCaixaInicial, setNumeroCaixaInicial] = useState('');
  const [ordemDecrescente, setOrdemDecrescente] = useState(false);
  const [ordemAutomatica, setOrdemAutomatica] = useState(false);


  const [lotesSelecionados, setLotesSelecionados] = useState({});

  // Buscar todas as reservas ativas (não canceladas) se não houver reservaId
  const { data: reservas = [] } = useQuery({
    queryKey: ['reservasParaEtiquetas', setorAtivo],
    queryFn: async () => {
      let todasReservas;
      if (isAdmin && setorAtivo === 'ALL') {
        todasReservas = await rdsn.entities.ReservaLote.list('-created_at');
      } else {
        todasReservas = await rdsn.entities.ReservaLote.filter({ setor_id: setorAtivo }, '-created_at');
      }

      // Buscar produtos para join de sequencia_decrescente
      const todosProdutos = await rdsn.entities.Produto.list();
      const prodMapByLetra = {};
      todosProdutos.forEach(p => {
        // Mapeia por letra + sufixo (codigo_completo sem ano)
        if (p.letra_produto) {
          if (!prodMapByLetra[p.letra_produto]) prodMapByLetra[p.letra_produto] = {};
          if (p.sufixo) prodMapByLetra[p.letra_produto][p.sufixo] = p;
        }
      });

      // Enriquecer cada reserva com sequencia_decrescente do produto
      todasReservas = todasReservas.map(r => {
        const letraMap = prodMapByLetra[r.letra_produto];
        // Extrai sufixo do codigo_completo (formato: ALETRAANO + sufixo)
        let produto = null;
        if (letraMap) {
          // Tenta por sufixo direto
          const sufixo = r.codigo_completo?.replace(/^[A-Z]\d{2}/, '');
          if (sufixo && letraMap[sufixo]) {
            produto = letraMap[sufixo];
          } else {
            // Fallback: pega o primeiro produto da letra
            produto = Object.values(letraMap)[0];
          }
        }
        return {
          ...r,
          sequencia_decrescente: produto?.ordem_numeracao === 'DECRESCENTE'
        };
      });

      // Buscar todas as baixas para verificar progresso
      const todasBaixas = await rdsn.entities.BaixaLote.list();

      // Filtrar apenas reservas com números ainda pendentes de registrar etiquetas
      return todasReservas.filter(r => {
        // Rejeitar canceladas e liberadas
        if (r.status === 'CANCELADO' || r.status === 'LIBERADO') {
          return false;
        }

        // Manter se houver quantidade pendente
        const quantidadeRestante = r.quantidade - (r.quantidade_baixada || 0);
        if (quantidadeRestante <= 0) {
          return false;
        }

        // Validar progresso de baixas reais no banco (redundância de segurança)
        const baixasDele = todasBaixas.filter(b => b.reserva_id === r.id);
        if (baixasDele.length === 0) return true;

        const sumBaixadoCircular = baixasDele.reduce((sum, b) => {
          return sum + calcularQuantidade(b.numero_inicial, b.numero_final, r.sequencia_decrescente);
        }, 0);

        return sumBaixadoCircular < r.quantidade;
      });
    },
    enabled: !reservaId && !!setorAtivo
  });

  const reservasFiltradas = React.useMemo(() => {
    if (!busca.trim()) return reservas;
    const termo = busca.toLowerCase().trim();
    const termoNum = termo.replace(/[^0-9]/g, '');
    return reservas.filter(r => {
      if (r.cliente?.toLowerCase().includes(termo)) return true;
      if (r.codigo_completo?.toLowerCase().includes(termo)) return true;
      // Busca por número dentro do intervalo
      if (termoNum) {
        const n = parseInt(termoNum);
        if (!isNaN(n) && estaContido(n, r.numero_inicial, r.numero_final, r.sequencia_decrescente)) return true;
        // Busca por início/fim do intervalo
        if (String(r.numero_inicial).includes(termoNum)) return true;
        if (String(r.numero_final).includes(termoNum)) return true;
      }
      return false;
    });
  }, [reservas, busca]);

  // Agrupar reservas por cliente e código, e subdividir em blocos sequenciais
  const reservasAgrupadas = React.useMemo(() => {
    const baseGrupos = {};

    // Primeiro agrupa por cliente + código
    reservasFiltradas.forEach(r => {
      const chaveBase = `${r.cliente}_${r.codigo_completo}`;
      if (!baseGrupos[chaveBase]) baseGrupos[chaveBase] = [];
      baseGrupos[chaveBase].push(r);
    });

    const gruposFinais = {};

    Object.entries(baseGrupos).forEach(([chaveBase, itens]) => {
      // Ordena por número inicial
      // Encontrar a "Cabeça" (item que não tem predecessor no grupo)
      const itemInicial = itens.find(x => 
        !itens.some(y => proximoNumero(y.numero_final, x.sequencia_decrescente) === x.numero_inicial)
      ) || itens[0];

      const baseNum = itemInicial.numero_inicial;
      const isDec = itemInicial.sequencia_decrescente;

      const ordenados = [...itens].sort((a, b) => {
        const distA = calcularQuantidade(baseNum, a.numero_inicial, isDec);
        const distB = calcularQuantidade(baseNum, b.numero_inicial, isDec);
        return distA - distB;
      });

      let blocoAtual = [ordenados[0]];
      let indexBloco = 0;

      for (let i = 1; i < ordenados.length; i++) {
        const anterior = ordenados[i - 1];
        const atual = ordenados[i];

        // Se for sequencial (fim do anterior + 1 = início do atual), continua o bloco
        if (proximoNumero(anterior.numero_final) === atual.numero_inicial) {
          blocoAtual.push(atual);
        } else {
          // Senão, fecha o bloco atual e começa um novo
          gruposFinais[`${chaveBase}_bloco_${indexBloco}`] = blocoAtual;
          indexBloco++;
          blocoAtual = [atual];
        }
      }
      // Adiciona o último bloco
      gruposFinais[`${chaveBase}_bloco_${indexBloco}`] = blocoAtual;
    });

    return gruposFinais;
  }, [reservasFiltradas]);

  // Detectar se reservas são sequenciais
  const saoSequenciais = (reservas) => {
    if (!reservas || reservas.length <= 1) return false;
    // Como os grupos já vêm quebrados por sequência no useMemo, 
    // se o array tem mais de 1 item, ele É sequencial.
    return true;
  };

  // Buscar contexto da etiqueta (múltiplos ou único)
  const { data: contexto, isLoading: loadingContexto, error: erroContexto } = useQuery({
    queryKey: ['contextoEtiqueta', reservaId],
    queryFn: async () => {
      try {
        // Se reservaId contém vírgula, são múltiplas reservas
        if (reservaId.includes(',')) {
          const ids = reservaId.split(',');

          // Buscar todas as reservas
          const reservasCompletas = await Promise.all(
            ids.map(id => rdsn.entities.ReservaLote.filter({ id }))
          );
          const reservasFlat = reservasCompletas.flat();

          // Verificar se são do mesmo cliente e letra+ano
          const primeiraReserva = reservasFlat[0];
          const mesmoCliente = reservasFlat.every(r => r.cliente === primeiraReserva.cliente);
          const mesmaLetraAno = reservasFlat.every(r =>
            r.letra_produto === primeiraReserva.letra_produto && r.ano === primeiraReserva.ano
          );

          if (!mesmoCliente || !mesmaLetraAno) {
            throw new Error('As reservas devem ser do mesmo cliente e letra/ano');
          }

          // Ordenar de forma circular a partir da cabeça da corrente
          const itemInicial = reservasFlat.find(x => 
            !reservasFlat.some(y => proximoNumero(y.numero_final, x.sequencia_decrescente) === x.numero_inicial)
          ) || reservasFlat[0];

          const baseNum = itemInicial.numero_inicial;
          const isDec = itemInicial.sequencia_decrescente;

          reservasFlat.sort((a, b) => {
            const distA = calcularQuantidade(baseNum, a.numero_inicial, isDec);
            const distB = calcularQuantidade(baseNum, b.numero_inicial, isDec);
            return distA - distB;
          });

          // Buscar produto para obter descrição e sufixo
          const produtos = await rdsn.entities.Produto.filter({
            letra_produto: primeiraReserva.letra_produto
          });
          const produto = produtos.find(p => p.sufixo === primeiraReserva.codigo_completo?.substring(3)) || produtos[0];

          // Montar contexto unificado
          return {
            reservaIds: ids,
            cliente: primeiraReserva.cliente,
            codigoProduto: primeiraReserva.codigo_produto,
            codigoCompleto: primeiraReserva.codigo_completo,
            descricao: produto?.descricao || primeiraReserva.modelo || '',
            numeroLoteInicial: reservasFlat[0].numero_inicial,
            numeroLoteFinal: reservasFlat[reservasFlat.length - 1].numero_final,
            quantidade: reservasFlat.reduce((sum, r) => sum + r.quantidade, 0),
            prefixo: primeiraReserva.codigo_completo,
            isMultiple: true,
            reservas: reservasFlat,
            sequenciaDecrescente: produto?.ordem_numeracao === 'DECRESCENTE'
          };
        } else {
          // Reserva única
          const reservas = await rdsn.entities.ReservaLote.filter({ id: reservaId });
          if (reservas.length === 0) {
            throw new Error('Reserva não encontrada');
          }
          const reserva = reservas[0];

          const produtos = await rdsn.entities.Produto.filter({
            codigo_produto: reserva.codigo_produto
          });
          const produto = produtos[0];

          return {
            reservaIds: [reservaId],
            cliente: reserva.cliente,
            codigoProduto: reserva.codigo_produto,
            codigoCompleto: reserva.codigo_completo,
            descricao: produto?.descricao || reserva.modelo || '',
            numeroLoteInicial: reserva.numero_inicial,
            numeroLoteFinal: reserva.numero_final,
            quantidade: reserva.quantidade,
            prefixo: reserva.codigo_completo,
            isMultiple: false,
            reservas: [reserva],
            sequenciaDecrescente: produto?.ordem_numeracao === 'DECRESCENTE'
          };
        }
      } catch (err) {
        console.error('Erro ao carregar contexto:', err);
        throw err;
      }
    },
    enabled: !!reservaId,
    retry: 1
  });

  // Buscar etiquetas já registradas
  const { data: etiquetas = [] } = useQuery({
    queryKey: ['etiquetasReserva', reservaId],
    queryFn: async () => {
      if (reservaId.includes(',')) {
        // Múltiplas reservas - buscar de todas
        const ids = reservaId.split(',');
        const todasEtiquetas = [];
        for (const id of ids) {
          const etqs = await rdsn.entities.Etiqueta.filter({ reserva_id: id });
          todasEtiquetas.push(...etqs);
        }
        // Ordenar por cliente e depois por número da caixa
        return todasEtiquetas.sort((a, b) => {
          const clienteA = (a.cliente || '').toLowerCase();
          const clienteB = (b.cliente || '').toLowerCase();
          if (clienteA !== clienteB) return clienteA.localeCompare(clienteB);
          return a.numero_caixa - b.numero_caixa;
        });
      }
      const etqs = await rdsn.entities.Etiqueta.filter({ reserva_id: reservaId });
      // Ordenar por número da caixa para reserva única
      return etqs.sort((a, b) => a.numero_caixa - b.numero_caixa);
    },
    enabled: !!reservaId
  });

  // Sincronizar ordem decrescente com o produto
  useEffect(() => {
    if (contexto?.sequenciaDecrescente !== undefined) {
      setOrdemDecrescente(contexto.sequenciaDecrescente);
      setOrdemAutomatica(true);
    }
  }, [contexto?.sequenciaDecrescente]);

  // Mutation para registrar etiqueta
  const registrarMutation = useMutation({
    mutationFn: async (dados) => {
      const response = await rdsn.functions.invoke('registrarEtiqueta', dados);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['etiquetasReserva', reservaId] });
      toast.success('✅ Etiquetas registradas com sucesso!', {
        description: `${variables.caixas.length} caixas registradas no ${variables.pallet > 1 ? `Pallet ${variables.pallet}` : 'lote'}`
      });
      setQuantidadePorCaixa('');
      setQuantidadePorPallet('');
      setPallets([]);
    },
    onError: (error) => {
      toast.error('❌ Erro ao registrar etiquetas', {
        description: error.message || 'Tente novamente mais tarde'
      });
    }
  });

  const calcularDistribuicao = () => {
    if (!quantidadePorCaixa || !contexto) {
      toast.warning('⚠️ Preencha a quantidade por caixa');
      return;
    }

    const qtdCaixa = parseInt(quantidadePorCaixa);
    const qtdPallet = quantidadePorPallet ? parseInt(quantidadePorPallet) : null;
    const totalQuantidade = contexto.quantidade ||
      calcularQuantidade(contexto.numeroLoteInicial, contexto.numeroLoteFinal);

    if (isNaN(qtdCaixa) || qtdCaixa <= 0) {
      toast.error('❌ Quantidade por caixa inválida');
      return;
    }

    // Calcular quantidade de caixas
    const totalCaixas = Math.ceil(totalQuantidade / qtdCaixa);

    // Calcular pallets se quantidade por pallet foi informada
    let palletsList = [];

    const caixaOffset = numeroCaixaInicial ? parseInt(numeroCaixaInicial) - 1 : 0;

    if (qtdPallet && qtdPallet > 0) {
      const caixasPorPallet = Math.ceil(qtdPallet / qtdCaixa);
      let serieAtual = ordemDecrescente ? contexto.numeroLoteFinal : contexto.numeroLoteInicial;
      let numeroCaixa = 1 + caixaOffset;

      for (let p = 1; p <= Math.ceil(totalCaixas / caixasPorPallet); p++) {
        const caixasNestePallet = Math.min(caixasPorPallet, totalCaixas - ((p - 1) * caixasPorPallet));
        const caixas = [];

        for (let c = 0; c < caixasNestePallet; c++) {
          let serieInicial, serieFinal, qtdAtual;

          if (ordemDecrescente) {
            serieFinal = serieAtual;
            serieInicial = calcularFim(serieAtual, qtdCaixa, true);
            if (!estaContido(serieInicial, contexto.numeroLoteInicial, contexto.numeroLoteFinal)) {
              serieInicial = contexto.numeroLoteInicial;
            }
            qtdAtual = calcularQuantidade(serieInicial, serieFinal);
          } else {
            serieInicial = serieAtual;
            serieFinal = calcularFim(serieAtual, qtdCaixa);
            if (!estaContido(serieFinal, contexto.numeroLoteInicial, contexto.numeroLoteFinal)) {
              serieFinal = contexto.numeroLoteFinal;
            }
            qtdAtual = calcularQuantidade(serieInicial, serieFinal);
          }

          caixas.push({
            numeroCaixa,
            serieInicial,
            serieFinal,
            quantidade: qtdAtual
          });

          serieAtual = ordemDecrescente ? anteriorNumero(caixas[caixas.length - 1].serieInicial) : proximoNumero(serieFinal);
          numeroCaixa = numeroCaixa + 1;

          if (ordemDecrescente ? serieAtual < contexto.numeroLoteInicial : serieAtual > contexto.numeroLoteFinal) break;
        }

        const totalPallet = caixas.reduce((sum, c) => sum + c.quantidade, 0);
        palletsList.push({
          numero: p,
          caixas,
          totalQuantidade: totalPallet,
          serieInicial: caixas[0].serieInicial,
          serieFinal: caixas[caixas.length - 1].serieFinal
        });

        if (serieAtual > contexto.numeroLoteFinal) break;
      }
    } else {
      // Sem pallet, mostrar apenas distribuição por caixa
      let serieAtual = ordemDecrescente ? contexto.numeroLoteFinal : contexto.numeroLoteInicial;
      const caixas = [];
      let numeroCaixa = 1 + caixaOffset;

      for (let c = 1; c <= totalCaixas; c++) {
        let serieInicial, serieFinal, qtdAtual;

        if (ordemDecrescente) {
          serieFinal = serieAtual;
          serieInicial = calcularFim(serieAtual, qtdCaixa, true);
          if (!estaContido(serieInicial, contexto.numeroLoteInicial, contexto.numeroLoteFinal)) {
            serieInicial = contexto.numeroLoteInicial;
          }
          qtdAtual = calcularQuantidade(serieInicial, serieFinal);
        } else {
          serieInicial = serieAtual;
          serieFinal = calcularFim(serieAtual, qtdCaixa);
          if (!estaContido(serieFinal, contexto.numeroLoteInicial, contexto.numeroLoteFinal)) {
            serieFinal = contexto.numeroLoteFinal;
          }
          qtdAtual = calcularQuantidade(serieInicial, serieFinal);
        }

        caixas.push({
          numeroCaixa: numeroCaixa,
          serieInicial,
          serieFinal,
          quantidade: qtdAtual
        });

        serieAtual = ordemDecrescente ? anteriorNumero(caixas[caixas.length - 1].serieInicial) : proximoNumero(serieFinal);
        numeroCaixa = numeroCaixa + 1;

        if (ordemDecrescente ? serieAtual < contexto.numeroLoteInicial : serieAtual > contexto.numeroLoteFinal) break;
      }

      palletsList = [{
        numero: 1,
        caixas,
        totalQuantidade: totalQuantidade,
        serieInicial: caixas[0].serieInicial,
        serieFinal: caixas[caixas.length - 1].serieFinal,
        isSinglePallet: true
      }];
    }

    setPallets(palletsList);
    setExpandedPallets(palletsList.reduce((acc, p) => ({ ...acc, [p.numero]: false }), {}));
    toast.success('✅ Distribuição calculada com sucesso!', {
      description: `${palletsList.length} ${palletsList.length > 1 ? 'pallets' : 'pallet'} com ${palletsList.reduce((sum, p) => sum + p.caixas.length, 0)} caixas`
    });
  };

  const formatarSerie = (numero) => {
    return `${contexto.prefixo}${String(numero).padStart(7, '0')}`;
  };

  const filtrarPallets = () => {
    if (!buscaPallets.trim()) return pallets;

    const termo = buscaPallets.toLowerCase().trim();

    return pallets.map(pallet => {
      const caixasFiltradas = pallet.caixas.filter(caixa => {
        const matchCaixa = String(caixa.numeroCaixa).includes(termo);
        const matchSerie = formatarSerie(caixa.serieInicial).toLowerCase().includes(termo) ||
          formatarSerie(caixa.serieFinal).toLowerCase().includes(termo);
        return matchCaixa || matchSerie;
      });

      if (caixasFiltradas.length > 0 || String(pallet.numero).includes(termo)) {
        return { ...pallet, caixas: caixasFiltradas.length > 0 ? caixasFiltradas : pallet.caixas };
      }
      return null;
    }).filter(Boolean);
  };

  const handleRegistrarPallet = (pallet) => {
    registrarMutation.mutate({
      reservaId: contexto?.isMultiple ? contexto.reservaIds[0] : reservaId,
      reservaIds: contexto?.isMultiple ? contexto.reservaIds : [reservaId],
      pallet: pallet.numero,
      caixas: pallet.caixas,
      quantidadePorCaixa: parseInt(quantidadePorCaixa),
      quantidadePorPallet: quantidadePorPallet ? parseInt(quantidadePorPallet) : null,
      isMultiple: contexto?.isMultiple || false
    });
  };

  const handleSelecionarMultiplos = (grupo) => {
    // Garantir que os IDs estejam em ordem sequencial de numeração
    const ids = [...grupo]
      .sort((a, b) => a.numero_inicial - b.numero_inicial)
      .map(r => r.id)
      .join(',');
    navigate(`?reservaId=${ids}`);
  };

  const handleSelecionarLotesCustom = (chaveGrupo) => {
    const selecionados = Object.entries(lotesSelecionados)
      .filter(([key, value]) => key.startsWith(chaveGrupo + '_') && value)
      .map(([key]) => key.split('_')[1]);

    if (selecionados.length === 0) {
      toast.warning('⚠️ Selecione pelo menos um lote');
      return;
    }

    const todosIds = selecionados.join(',');
    navigate(`?reservaId=${todosIds}`);
  };

  const toggleLoteSelecionado = (chaveGrupo, reservaId) => {
    const key = `${chaveGrupo}_${reservaId}`;
    setLotesSelecionados(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleTodosLotes = (chaveGrupo, grupo) => {
    const todosJaSelecionados = grupo.every(r => lotesSelecionados[`${chaveGrupo}_${r.id}`]);
    const novosLotes = {};
    grupo.forEach(r => {
      novosLotes[`${chaveGrupo}_${r.id}`] = !todosJaSelecionados;
    });
    setLotesSelecionados(prev => ({ ...prev, ...novosLotes }));
  };

  const contarSelecionadosGrupo = (chaveGrupo) => {
    return Object.entries(lotesSelecionados).filter(
      ([key, value]) => key.startsWith(chaveGrupo + '_') && value
    ).length;
  };

  if (!reservaId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Premium */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(234,179,8,0.15),transparent)] pointer-events-none" />
            <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-16 h-16 sm:w-14 sm:h-14 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-all hover:scale-105 active:scale-95 group border border-yellow-400/20">
                  <CheckCircle2 className="w-8 h-8 sm:w-6 sm:h-6 text-white group-hover:rotate-12 transition-transform duration-500" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                    Gerar <span className="text-yellow-600 dark:text-yellow-500">Etiquetas</span>
                  </h1>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                    Lotes Individuais • Múltiplos Sequenciais
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Card className="border border-slate-200 dark:border-white/5 shadow-2xl bg-white dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
            <CardContent className="p-6">
              <Input
                placeholder="Buscar por cliente ou código..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="mb-4 dark:bg-slate-950 dark:border-slate-800"
              />

              {reservasFiltradas.length === 0 ? (
                <p className="text-center py-12 text-slate-500 dark:text-slate-400">Nenhuma reserva encontrada</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(reservasAgrupadas)
                    .sort(([, grupoA], [, grupoB]) => {
                      const clienteA = (grupoA[0]?.cliente || '').toLowerCase();
                      const clienteB = (grupoB[0]?.cliente || '').toLowerCase();
                      return clienteA.localeCompare(clienteB);
                    })
                    .map(([chaveGrupo, grupo]) => {
                    const ehSequencial = grupo.length > 1 && saoSequenciais(grupo);
                    const totalGrupo = grupo.reduce((sum, r) => sum + calcularQuantidade(r.numero_inicial, r.numero_final), 0);
                    const numSelecionados = contarSelecionadosGrupo(chaveGrupo);
                    const ehDecrescenteGrupo = grupo[0]?.sequencia_decrescente === true;

                    return (
                      <div key={chaveGrupo}>
                        {ehSequencial ? (
                          <div className="border-2 border-green-200 dark:border-green-900/30 rounded-lg p-4 bg-green-50/30 dark:bg-green-950/20">
                            <div className="mb-3">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <Badge className="bg-green-600 dark:bg-green-700 text-white">
                                  🔗 {grupo.length} Lotes Sequenciais
                                </Badge>
                                <span className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide",
                                  ehDecrescenteGrupo
                                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                )}>
                                  {ehDecrescenteGrupo ? <ChevronsDown className="w-3 h-3" /> : <ChevronsUp className="w-3 h-3" />}
                                  {ehDecrescenteGrupo ? 'Decrescente' : 'Crescente'}
                                </span>
                              </div>
                              <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">{grupo[0].cliente}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{grupo[0].codigo_completo}</p>
                              <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 mt-1">
                                {grupo[0].numero_inicial.toLocaleString('pt-BR')} → {grupo[grupo.length - 1].numero_final.toLocaleString('pt-BR')}
                                <span className="ml-1.5 text-slate-400 dark:text-slate-500">({totalGrupo.toLocaleString('pt-BR')} pçs)</span>
                              </p>
                            </div>

                            <div className="flex gap-2 mb-3">
                              <Button
                                onClick={() => handleSelecionarMultiplos(grupo)}
                                className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white"
                              >
                                ✨ Todos os {grupo.length} lotes
                              </Button>
                              <Button
                                onClick={() => toggleTodosLotes(chaveGrupo, grupo)}
                                variant="outline"
                                className="border-green-600 text-green-700 dark:border-green-700 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30"
                              >
                                {grupo.every(r => lotesSelecionados[`${chaveGrupo}_${r.id}`]) ? 'Desmarcar' : 'Marcar'} Todos
                              </Button>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-green-200 dark:border-green-900/30">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Selecione os lotes:</p>
                                {numSelecionados > 0 && (
                                  <Button
                                    onClick={() => handleSelecionarLotesCustom(chaveGrupo)}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white h-7 text-xs"
                                  >
                                    Gerar ({numSelecionados})
                                  </Button>
                                )}
                              </div>
                              {grupo.map((reserva) => {
                                const isChecked = lotesSelecionados[`${chaveGrupo}_${reserva.id}`] || false;
                                return (
                                  <div
                                    key={reserva.id}
                                    className={cn(
                                      "flex items-center gap-3 px-3 py-2.5 rounded border transition-all text-sm",
                                      isChecked
                                        ? "bg-blue-50 border-blue-300 dark:bg-blue-950/20 dark:border-blue-800 shadow-sm"
                                        : "bg-white border-slate-200 dark:bg-slate-950 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleLoteSelecionado(chaveGrupo, reserva.id)}
                                      className="w-4 h-4 text-blue-600 dark:text-blue-500 rounded focus:ring-blue-500 cursor-pointer"
                                    />
                                    <div
                                      className="flex-1 flex justify-between items-center cursor-pointer"
                                      onClick={() => toggleLoteSelecionado(chaveGrupo, reserva.id)}
                                    >
                                      <span className={cn("text-slate-700 dark:text-slate-300 font-medium", isChecked && "text-blue-900 dark:text-blue-400")}>
                                        {reserva.codigo_completo}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={cn("text-slate-600 dark:text-slate-400", isChecked && "border-blue-400 text-blue-700 dark:border-blue-700 dark:text-blue-500")}
                                      >
                                        {reserva.numero_inicial} - {reserva.numero_final}
                                      </Badge>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`?reservaId=${reserva.id}`);
                                      }}
                                      className="text-xs text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline whitespace-nowrap"
                                    >
                                      Individual →
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          grupo.map((reserva) => {
                            const ehDecrescente = reserva.sequencia_decrescente === true;
                            return (
                              <button
                                key={reserva.id}
                                onClick={() => navigate(`?reservaId=${reserva.id}`)}
                                className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:shadow-md dark:bg-slate-950"
                              >
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{reserva.cliente}</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">{reserva.codigo_completo}</p>
                                    {/* Intervalo de numeração bem visível */}
                                    <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                      {reserva.numero_inicial.toLocaleString('pt-BR')} → {reserva.numero_final.toLocaleString('pt-BR')}
                                      <span className="ml-1.5 text-slate-400 dark:text-slate-500">({reserva.quantidade?.toLocaleString('pt-BR')} pçs)</span>
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 font-mono">
                                      {reserva.numero_inicial} – {reserva.numero_final}
                                    </Badge>
                                    {/* Badge de sequência crescente/decrescente */}
                                    <span className={cn(
                                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide",
                                      ehDecrescente
                                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    )}>
                                      {ehDecrescente ? <ChevronsDown className="w-3 h-3" /> : <ChevronsUp className="w-3 h-3" />}
                                      {ehDecrescente ? 'Reversa' : 'Sequencial'}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loadingContexto) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Carregando dados do lote...</span>
        </div>
      </div>
    );
  }

  if (erroContexto || !contexto) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center">
        <Card className="border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 max-w-md">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-500">Erro</h3>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">Não foi possível carregar os dados do lote</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(234,179,8,0.15),transparent)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-4 sm:gap-5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </Button>
              <div className="w-16 h-16 sm:w-14 sm:h-14 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-all hover:scale-105 active:scale-95 group border border-yellow-400/20">
                <CheckCircle2 className="w-8 h-8 sm:w-6 sm:h-6 text-white group-hover:rotate-12 transition-transform duration-500" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Gerar <span className="text-yellow-600 dark:text-yellow-500">Lote</span>
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80">
                    {contexto.cliente} • {contexto.codigoProduto}
                  </p>
                  {contexto.isMultiple && (
                    <Badge className="bg-emerald-500 text-white font-black text-[9px] px-2.5 py-0.5 rounded-full border-0 uppercase tracking-widest gap-1.5 shadow-lg shadow-emerald-500/20">
                      🔗 {contexto.reservas.length} Lotes Unificados
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Formulário */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <Card className="border border-slate-200 dark:border-white/5 shadow-2xl bg-white dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem] lg:sticky lg:top-6">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 dark:border-slate-800">
                <CardTitle className="text-lg dark:text-slate-100">Configuração</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-400">Cliente</Label>
                  <p className="text-slate-900 dark:text-slate-100 font-semibold mt-1">{contexto.cliente}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-400">Código</Label>
                  <p className="text-slate-900 dark:text-slate-100 font-semibold mt-1">{contexto.codigoProduto}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-400">Descrição</Label>
                  <p className="text-slate-700 dark:text-slate-300 text-xs mt-1">{contexto.descricao}</p>
                </div>

                <div className="pt-4 border-t dark:border-slate-800 space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-400">Total do Lote</Label>
                    <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">
                      {contexto.numeroLoteInicial} a {contexto.numeroLoteFinal}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="qtdCaixa" className="text-sm font-medium text-slate-700 dark:text-slate-400">
                      Quantidade por Caixa *
                    </Label>
                    <Input
                      id="qtdCaixa"
                      type="number"
                      min="1"
                      value={quantidadePorCaixa}
                      onChange={(e) => setQuantidadePorCaixa(e.target.value)}
                      placeholder="Ex: 10"
                      className="mt-2 dark:bg-slate-950 dark:border-slate-800"
                    />
                  </div>

                  <div>
                    <Label htmlFor="qtdPallet" className="text-sm font-medium text-slate-700 dark:text-slate-400">
                      Quantidade por Pallet (opcional)
                    </Label>
                    <Input
                      id="qtdPallet"
                      type="number"
                      min="1"
                      value={quantidadePorPallet}
                      onChange={(e) => setQuantidadePorPallet(e.target.value)}
                      placeholder="Ex: 400"
                      className="mt-2 dark:bg-slate-950 dark:border-slate-800"
                    />
                  </div>

                  <div>
                    <Label htmlFor="numCaixa" className="text-sm font-medium text-slate-700 dark:text-slate-400">
                      Número da Caixa Inicial (opcional)
                    </Label>
                    <Input
                      id="numCaixa"
                      type="number"
                      min="1"
                      value={numeroCaixaInicial}
                      onChange={(e) => setNumeroCaixaInicial(e.target.value)}
                      placeholder="Ex: 1"
                      className="mt-2 dark:bg-slate-950 dark:border-slate-800"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Define o número da primeira caixa</p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <Label htmlFor="ordem" className="text-sm font-medium text-slate-700 dark:text-slate-400 cursor-pointer flex items-center gap-2">
                        NUMERAÇÃO REVERSA
                        {ordemAutomatica && (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] px-1.5 py-0 border-0 h-4">
                            Automático
                          </Badge>
                        )}
                      </Label>
                    </div>
                    <Switch
                      id="ordem"
                      checked={ordemDecrescente}
                      onCheckedChange={(val) => {
                        setOrdemDecrescente(val);
                        setOrdemAutomatica(false);
                      }}
                    />
                  </div>
                </div>

                <Button
                  onClick={calcularDistribuicao}
                  disabled={!quantidadePorCaixa}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-black font-semibold"
                >
                  Calcular
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Distribuição */}
          <div className="lg:col-span-3 space-y-4 order-1 lg:order-2">
            {pallets.length > 0 && (
              <>
                <Card className="border border-slate-200 dark:border-white/5 shadow-2xl bg-white dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Input
                        placeholder="🔍 Buscar por pallet, caixa ou número de peça..."
                        value={buscaPallets}
                        onChange={(e) => setBuscaPallets(e.target.value)}
                        className="flex-1 dark:bg-slate-950 dark:border-slate-800"
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          const todosExpandidos = Object.values(expandedPallets).every(v => v);
                          setExpandedPallets(pallets.reduce((acc, p) => ({ ...acc, [p.numero]: !todosExpandidos }), {}));
                        }}
                        className="whitespace-nowrap dark:border-slate-800 dark:hover:bg-slate-800"
                      >
                        {Object.values(expandedPallets).every(v => v) ? (
                          <>
                            <ChevronsUp className="w-4 h-4 mr-2" />
                            Recolher Todos
                          </>
                        ) : (
                          <>
                            <ChevronsDown className="w-4 h-4 mr-2" />
                            Expandir Todos
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="border border-slate-200 dark:border-white/5 shadow-2xl bg-slate-900/80 dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem] text-white">
                    <CardContent className="p-4 sm:p-6 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-slate-300">Numeração Total</p>
                          <p className="text-xl font-bold mt-1">
                            {formatarSerie(pallets[0].serieInicial)} — {formatarSerie(pallets[pallets.length - 1].serieFinal)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-300">Distribuição</p>
                          <p className="text-xl font-bold mt-1">
                            {pallets.length > 1
                              ? `${pallets.length} pallets × ${quantidadePorPallet || 'variável'}`
                              : `${pallets[0].caixas.length} caixas × ${quantidadePorCaixa}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-300">Total de Peças</p>
                          <p className="text-xl font-bold mt-1">
                            {pallets.reduce((sum, p) => sum + p.totalQuantidade, 0)}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-slate-700 pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-slate-300">Etiquetas Individuais</p>
                          <p className="text-2xl font-bold mt-1 text-yellow-400">
                            {pallets.reduce((sum, p) => sum + p.caixas.length, 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-300">Primeira Etiqueta</p>
                          <p className="text-lg font-mono text-green-400 mt-1">
                            {ordemDecrescente
                              ? `${formatarSerie(pallets[0].caixas[0].serieFinal)} — ${formatarSerie(pallets[0].caixas[0].serieInicial)}`
                              : `${formatarSerie(pallets[0].caixas[0].serieInicial)} — ${formatarSerie(pallets[0].caixas[0].serieFinal)}`
                            }
                          </p>
                          <p className="text-xs text-slate-400 mt-1">{pallets[0].caixas[0].quantidade} peças</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-300">Última Etiqueta</p>
                          <p className="text-lg font-mono text-orange-400 mt-1">
                            {ordemDecrescente
                              ? `${formatarSerie(pallets[pallets.length - 1].caixas[pallets[pallets.length - 1].caixas.length - 1].serieFinal)} — ${formatarSerie(pallets[pallets.length - 1].caixas[pallets[pallets.length - 1].caixas.length - 1].serieInicial)}`
                              : `${formatarSerie(pallets[pallets.length - 1].caixas[pallets[pallets.length - 1].caixas.length - 1].serieInicial)} — ${formatarSerie(pallets[pallets.length - 1].caixas[pallets[pallets.length - 1].caixas.length - 1].serieFinal)}`
                            }
                          </p>
                          <p className="text-xs text-slate-400 mt-1">{pallets[pallets.length - 1].caixas[pallets[pallets.length - 1].caixas.length - 1].quantidade} peças</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Pallets */}
                {filtrarPallets().length === 0 ? (
                  <Card className="border border-slate-200 dark:border-white/5 shadow-2xl bg-white dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
                    <CardContent className="p-6 text-center text-slate-500 dark:text-slate-400">
                      Nenhum pallet, caixa ou peça encontrada
                    </CardContent>
                  </Card>
                ) : (
                  filtrarPallets().map((pallet, index) => (
                    <motion.div
                      key={pallet.numero}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="border border-slate-200 dark:border-white/5 shadow-2xl bg-white dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
                        <div
                          className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 cursor-pointer hover:from-slate-800 hover:to-slate-700 transition-all"
                          onClick={() => setExpandedPallets(prev => ({
                            ...prev,
                            [pallet.numero]: !prev[pallet.numero]
                          }))}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base sm:text-lg font-bold truncate">
                                {pallet.isSinglePallet ? 'Distribuição' : `Pallet ${pallet.numero}`}: {formatarSerie(pallet.serieInicial)} a {formatarSerie(pallet.serieFinal)}
                              </h3>
                              <p className="text-sm text-slate-300 mt-1">
                                {pallet.caixas.length} caixas × {pallet.totalQuantidade} peças
                              </p>
                            </div>
                            <motion.div
                              animate={{ rotate: expandedPallets[pallet.numero] ? 180 : 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-white hover:bg-white/20 flex-shrink-0"
                              >
                                <ChevronDown className="w-5 h-5" />
                              </Button>
                            </motion.div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {expandedPallets[pallet.numero] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <CardContent className="p-4 sm:p-6">
                                <div className="space-y-2 mb-6">
                                  {pallet.caixas.map((caixa, idx) => (
                                    <motion.div
                                      key={caixa.numeroCaixa}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: idx * 0.05 }}
                                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                                    >
                                      <div className="flex-1">
                                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 mb-1">
                                          Caixa #{String(caixa.numeroCaixa).padStart(4, '0')}
                                        </Badge>
                                        <p className="text-xs sm:text-sm font-mono text-slate-600 dark:text-slate-400 break-all">
                                          {ordemDecrescente
                                            ? `${formatarSerie(caixa.serieFinal)} — ${formatarSerie(caixa.serieInicial)}`
                                            : `${formatarSerie(caixa.serieInicial)} — ${formatarSerie(caixa.serieFinal)}`
                                          }
                                        </p>
                                      </div>
                                      <Badge className="bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 w-fit">
                                        {caixa.quantidade} peças
                                      </Badge>
                                    </motion.div>
                                  ))}
                                </div>

                                <Button
                                  onClick={() => handleRegistrarPallet(pallet)}
                                  disabled={registrarMutation.isPending}
                                  className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                                >
                                  {registrarMutation.isPending ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Registrando...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      Registrar {pallet.isSinglePallet ? 'Distribuição' : `Pallet ${pallet.numero}`}
                                    </>
                                  )}
                                </Button>
                              </CardContent>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    </motion.div>
                  ))
                )}
              </>
            )}

            {/* Histórico */}
            <Card className="border border-slate-200 dark:border-white/5 shadow-2xl bg-white dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 dark:border-slate-800">
                <CardTitle className="text-lg dark:text-slate-100">Etiquetas Registradas ({etiquetas.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {etiquetas.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 dark:text-slate-400">Nenhuma etiqueta registrada ainda</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    <AnimatePresence>
                      {etiquetas.map((etq, index) => (
                        <motion.div
                          key={etq.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-green-50/50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900/30"
                        >
                          <div className="flex-1">
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500 mb-1">
                              Caixa #{String(etq.numero_caixa).padStart(4, '0')}
                            </Badge>
                            <p className="text-xs sm:text-sm font-mono text-slate-600 dark:text-slate-400 mt-1 break-all">
                              {etq.numero_serie_inicial > etq.numero_serie_final
                                ? `${formatarSerie(etq.numero_serie_inicial)} — ${formatarSerie(etq.numero_serie_final)}`
                                : `${formatarSerie(etq.numero_serie_inicial)} — ${formatarSerie(etq.numero_serie_final)}`
                              }
                            </p>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-500" />
                            {new Date(etq.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}