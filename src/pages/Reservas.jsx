// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { rdsn } from '@/api/supabaseClient';
import { useSetor } from '@/components/context/SetorContext';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Package, Eye, History, BarChart3, RefreshCw, ScanLine, Calendar, X } from 'lucide-react';
import { useSearch } from '../components/hooks/useSearch';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReservaForm from '../components/reservas/ReservaForm';
import BaixaForm from '../components/baixas/BaixaForm';
import ReservasTable from '../components/tables/ReservasTable';
import AdvancedFilterBar from '../components/filters/AdvancedFilterBar';
import ExportarRelatorio from '../components/relatorios/ExportarRelatorio';
import { proximoNumero, anteriorNumero, calcularQuantidade, checarSobreposicao, estaContido, eApos } from '../core/numeracaoService';
import ProdutosTab from '../components/reservas/ProdutosTab';
import ReservaDetalhes from '../components/reservas/ReservaDetalhes';
import HistoricoBaixas from '../components/reservas/HistoricoBaixas';
import EncurtarLoteDialog from '../components/reservas/EncurtarLoteDialog';
import QuebrarLoteDialog from '../components/reservas/QuebrarLoteDialog';
import NumeracoesLivres from '../components/reservas/NumeracoesLivres';
import DashboardReservas from '../components/reservas/DashboardReservas';
import SetorReadonlyBanner, { useSetorReadonly } from '@/components/pcp/SetorReadonlyBanner';
import { PremiumCard } from '@/components/ui/PremiumCard';
import SearchBar from '../components/search/SearchBar';
import { PageTransition } from '@/components/ui/page-transition';

import SessionManager from '@/lib/sessionManager';

export default function Reservas() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setorAtivo, isAdmin } = useSetor();
  const isReadonly = useSetorReadonly();

  // Proteção de autenticação
  useEffect(() => {
    async function checkAuth() {
      try {
        await rdsn.auth.me();
      } catch {
        const internalUser = SessionManager.getUser();
        if (!internalUser) {
          navigate(createPageUrl('GateAuth'));
        }
      }
    }
    checkAuth();
  }, [navigate]);
  const [showForm, setShowForm] = useState(false);
  const [showBaixa, setShowBaixa] = useState(false);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [showEncurtar, setShowEncurtar] = useState(false);
  const [showQuebrar, setShowQuebrar] = useState(false);
  const [showSincronizar, setShowSincronizar] = useState(false);
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [filters, setFilters] = useState({
    cliente: '',
    codigoProduto: '',
    modelo: '',
    letra: '',
    ano: '',
    status: '',
    dataInicio: '',
    dataFim: ''
  });
  const [sortField, setSortField] = useState('numero_inicial');
  const [sortDirection, setSortDirection] = useState('asc');
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: reservas = [], isLoading: loadingReservas } = useQuery({
    queryKey: ['reservas', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.ReservaLote.list('-created_at', 500);
      }
      return await rdsn.entities.ReservaLote.filter({ setor_id: setorAtivo }, '-created_at', 500);
    },
    enabled: !!setorAtivo
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-completo', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];

      let clientes = [];
      let tecnicos = [];

      if (isAdmin && setorAtivo === 'ALL') {
        [clientes, tecnicos] = await Promise.all([
          rdsn.entities.PCPCliente.list(),
          rdsn.entities.Produto.list()
        ]);
      } else {
        [clientes, tecnicos] = await Promise.all([
          rdsn.entities.PCPCliente.filter({ setor_id: setorAtivo }),
          rdsn.entities.Produto.filter({ setor_id: setorAtivo })
        ]);
      }

      // Mapear produtos técnicos (Entity: Produto)
      const listTecnicos = (tecnicos || []).map(p => ({
        ...p,
        nome: p.nome_cliente || p.modelo || p.descricao || 'PRODUTO TÉCNICO',
        codigo: p.codigo_produto,
        letra_padrao: p.letra_produto || '',
        modelo: p.modelo || '',
        origem: 'tecnico'
      }));

      // Mapear clientes PCP (Entity: PCPCliente)
      const listClientes = (clientes || []).map(c => ({
        ...c,
        nome: c.nome,
        codigo: c.codigo,
        letra_padrao: c.letra_produto || '',
        modelo: c.modelo || c.descricao_produto || '',
        origem: 'comercial'
      }));

      // Unificar priorizando o técnico para dados de Letra/Série
      const unified = [...listTecnicos];
      listClientes.forEach(c => {
        const exist = unified.find(u => u.codigo === c.codigo);
        if (!exist) {
          unified.push(c);
        } else if (!exist.letra_padrao && c.letra_produto) {
          exist.letra_padrao = c.letra_produto;
        }
      });

      return unified;
    },
    enabled: !!setorAtivo
  });

  const { data: sequencias = [] } = useQuery({
    queryKey: ['sequencias', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.SequenciaAnual.list();
      }
      return await rdsn.entities.SequenciaAnual.filter({ setor_id: setorAtivo });
    },
    enabled: !!setorAtivo
  });

  const { data: baixas = [] } = useQuery({
    queryKey: ['baixas', setorAtivo, isAdmin],
    queryFn: async () => {
      if (!setorAtivo) return [];
      if (isAdmin && setorAtivo === 'ALL') {
        return await rdsn.entities.BaixaLote.list('-created_at', 1000);
      }
      const todas = await rdsn.entities.BaixaLote.list('-created_at', 1000);
      // Filtrar por reservas do setor
      const reservasDoSetor = await rdsn.entities.ReservaLote.filter({ setor_id: setorAtivo });
      const reservaIds = reservasDoSetor.map(r => r.id);
      return todas.filter(b => reservaIds.includes(b.reserva_id));
    },
    enabled: !!setorAtivo
  });

  const { data: integracoes = [] } = useQuery({
    queryKey: ['integracoes-ativas'],
    queryFn: async () => {
      const todas = await rdsn.entities.IntegracaoExterna.list();
      return todas.filter(i => i.ativa);
    }
  });

  const { data: pcpOps = [] } = useQuery({
    queryKey: ['pcp-ops-all'],
    queryFn: () => rdsn.entities.PCPOrdemProducao.filter({ status: 'Ativo' })
  });

  const sincronizarMutation = useMutation({
    mutationFn: async ({ reserva_id, integracao_id }) => {
      return await rdsn.functions.invoke('sincronizarReserva', {
        reserva_id,
        integracao_id
      });
    },
    onSuccess: () => {
      setShowSincronizar(false);
      setSelectedReserva(null);
      toast.success('Reserva sincronizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao sincronizar: ' + error.message);
    }
  });

  const createReservaMutation = useMutation({
    mutationFn: async (data) => {
      // Validar intervalos antes de criar
      const validacao = await rdsn.functions.invoke('validarIntervalosNumeracao', {
        letra_produto: data.letra_produto,
        ano: data.ano,
        numero_inicial: data.numero_inicial,
        numero_final: data.numero_final,
        setor_id: setorAtivo
      });

      if (!validacao.data.valido) {
        throw new Error(`Conflito de numeração: ${validacao.data.conflitos.map(c => c.intervalo).join(', ')}`);
      }

      let seq = sequencias.find(s => s.letra_produto === data.letra_produto && s.ano === data.ano);

      if (!seq) {
        seq = await rdsn.entities.SequenciaAnual.create({
          letra_produto: data.letra_produto,
          ano: data.ano,
          setor_id: setorAtivo,
          ultimo_numero: 0,
          encerrado: false
        });
      }

      // Verificar se alguma numeração livre foi totalmente usada
      const numeracoesLivres = await rdsn.entities.NumeracaoLivre.filter({
        letra_produto: data.letra_produto,
        ano: data.ano,
        setor_id: setorAtivo,
        disponivel: true
      });

      for (const livre of numeracoesLivres) {
        const temSobreposicao = checarSobreposicao(
          data.numero_inicial, 
          data.numero_final, 
          livre.numero_inicial, 
          livre.numero_final
        );

        if (temSobreposicao) {
          const iniRes = Number(data.numero_inicial);
          const fimRes = Number(data.numero_final);
          const iniLiv = Number(livre.numero_inicial);
          const fimLiv = Number(livre.numero_final);

          // CASO 1: Reserva usa EXATAMENTE toda a numeração livre ou a ENGLOBA
          const reservaContemLivre = estaContido(iniLiv, iniRes, fimRes) && estaContido(fimLiv, iniRes, fimRes);
          
          if (reservaContemLivre) {
            await rdsn.entities.NumeracaoLivre.update(livre.id, { disponivel: false });
          }
          // CASO 2: Reserva usa parte do início da numeração livre
          else if (iniRes === iniLiv) {
            const novoInicio = proximoNumero(fimRes);
            await rdsn.entities.NumeracaoLivre.update(livre.id, {
              numero_inicial: novoInicio,
              quantidade: calcularQuantidade(novoInicio, fimLiv)
            });
          }
          // CASO 3: Reserva usa parte do final da numeração livre
          else if (fimRes === fimLiv) {
            const novoFim = anteriorNumero(iniRes);
            await rdsn.entities.NumeracaoLivre.update(livre.id, {
              numero_final: novoFim,
              quantidade: calcularQuantidade(iniLiv, novoFim)
            });
          }
          // CASO 4: Reserva usa o MEIO - DIVIDIR em duas partes
          else {
            // Parte 1: antes da reserva
            const novoFimParte1 = anteriorNumero(iniRes);
            await rdsn.entities.NumeracaoLivre.update(livre.id, {
              numero_final: novoFimParte1,
              quantidade: calcularQuantidade(iniLiv, novoFimParte1)
            });
            // Parte 2: depois da reserva (criar novo registro)
            const novoInicioParte2 = proximoNumero(fimRes);
            await rdsn.entities.NumeracaoLivre.create({
              letra_produto: livre.letra_produto,
              ano: livre.ano,
              setor_id: livre.setor_id,
              numero_inicial: novoInicioParte2,
              numero_final: fimLiv,
              quantidade: calcularQuantidade(novoInicioParte2, fimLiv),
              reserva_original_id: livre.reserva_original_id,
              motivo: livre.motivo,
              disponivel: true,
              observacoes: `Dividido ao criar reserva ${data.codigo_completo}`
            });
          }
        }
      }

      const reserva = await rdsn.entities.ReservaLote.create({
        ...data,
        setor_id: setorAtivo,
        status: 'RESERVADO',
        quantidade_baixada: 0
      });

      const novoFinal = Number(data.numero_final);
      if (eApos(novoFinal, seq.ultimo_numero)) {
        await rdsn.entities.SequenciaAnual.update(seq.id, {
          ultimo_numero: novoFinal
        });
      }

      await rdsn.entities.Auditoria.create({
        entidade: 'ReservaLote',
        entidade_id: reserva.id,
        acao: 'RESERVA_CRIADA',
        letra_produto: data.letra_produto,
        ano: data.ano,
        numero_inicial: data.numero_inicial,
        numero_final: data.numero_final,
        codigo_produto: data.codigo_produto,
        detalhes: JSON.stringify({ cliente: data.cliente, quantidade: data.quantidade })
      });

      return reserva;
    },
    onSuccess: async () => {
      // Invalidar e refazer queries IMEDIATAMENTE
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reservas'] }),
        queryClient.invalidateQueries({ queryKey: ['sequencias'] }),
        queryClient.invalidateQueries({ queryKey: ['numeracoes-livres'] })
      ]);

      // Remover cache completamente para forçar refetch
      queryClient.removeQueries({ queryKey: ['numeracoes-livres'] });

      setShowForm(false);
      toast.success('Reserva criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar reserva: ' + error.message);
    }
  });

  const createBaixaMutation = useMutation({
    mutationFn: async (data) => {
      const baixa = await rdsn.entities.BaixaLote.create(data);

      const reserva = reservas.find(r => r.id === data.reserva_id);
      const novaBaixada = (reserva.quantidade_baixada || 0) + data.quantidade;
      const novoStatus = novaBaixada >= reserva.quantidade ? 'PRODUZIDO' : 'EM_PRODUCAO';

      await rdsn.entities.ReservaLote.update(data.reserva_id, {
        quantidade_baixada: novaBaixada,
        status: novoStatus
      });

      await rdsn.entities.Auditoria.create({
        entidade: 'BaixaLote',
        entidade_id: baixa.id,
        acao: 'BAIXA_REGISTRADA',
        letra_produto: reserva.letra_produto,
        ano: reserva.ano,
        numero_inicial: data.numero_inicial,
        numero_final: data.numero_final,
        codigo_produto: reserva.codigo_produto,
        detalhes: JSON.stringify({ quantidade: data.quantidade, tipo: data.tipo })
      });

      return baixa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      setShowBaixa(false);
      setSelectedReserva(null);
      toast.success('Baixa registrada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar baixa: ' + error.message);
    }
  });

  const encurtarLoteMutation = useMutation({
    mutationFn: async ({ reserva, novoNumeroFinal, observacoes, numeracaoLivre }) => {
      // Validar que a numeração livre não conflita
      const validacao = await rdsn.functions.invoke('validarIntervalosNumeracao', {
        letra_produto: reserva.letra_produto,
        ano: reserva.ano,
        numero_inicial: numeracaoLivre.numero_inicial,
        numero_final: numeracaoLivre.numero_final,
        reserva_id_ignorar: reserva.id
      });

      if (!validacao.data.valido) {
        throw new Error(`Conflito: numeração a ser liberada já está em uso`);
      }

      await rdsn.entities.ReservaLote.update(reserva.id, {
        numero_final: novoNumeroFinal,
        quantidade: calcularQuantidade(reserva.numero_inicial, novoNumeroFinal, reserva.sequencia_decrescente)
      });

      await rdsn.entities.NumeracaoLivre.create({
        letra_produto: reserva.letra_produto,
        ano: reserva.ano,
        setor_id: setorAtivo || reserva.setor_id,
        numero_inicial: numeracaoLivre.numero_inicial,
        numero_final: numeracaoLivre.numero_final,
        quantidade: numeracaoLivre.quantidade,
        reserva_original_id: reserva.id,
        motivo: 'ENCURTAMENTO',
        disponivel: true,
        observacoes
      });

      await rdsn.entities.Auditoria.create({
        entidade: 'ReservaLote',
        entidade_id: reserva.id,
        acao: 'RESERVA_CRIADA',
        letra_produto: reserva.letra_produto,
        ano: reserva.ano,
        numero_inicial: reserva.numero_inicial,
        numero_final: novoNumeroFinal,
        codigo_produto: reserva.codigo_produto,
        detalhes: JSON.stringify({
          acao: 'ENCURTAMENTO',
          numeracao_liberada: numeracaoLivre,
          observacoes
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      queryClient.invalidateQueries({ queryKey: ['numeracoes-livres'] });
      setShowEncurtar(false);
      setSelectedReserva(null);
      toast.success('Lote encurtado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao encurtar lote: ' + error.message);
    }
  });

  const quebrarLoteMutation = useMutation({
    mutationFn: async ({ reserva, quantidadePorLote, observacoes, lotes }) => {
      // Atualizar o lote original (primeiro lote)
      await rdsn.entities.ReservaLote.update(reserva.id, {
        numero_final: lotes[0].numero_final,
        quantidade: lotes[0].quantidade
      });

      // Criar novos lotes para os demais
      const novasReservas = [];
      for (let i = 1; i < lotes.length; i++) {
        const lote = lotes[i];
        const novaReserva = await rdsn.entities.ReservaLote.create({
          // Identidade herdada do lote pai
          letra_produto: reserva.letra_produto,
          sufixo: reserva.sufixo || '',                     // FIX: herda o prefixo/sufixo
          prefixo_personalizado: reserva.prefixo_personalizado || '',
          ano: reserva.ano,
          codigo_completo: reserva.codigo_completo,
          cliente: reserva.cliente,
          modelo: reserva.modelo,
          codigo_produto: reserva.codigo_produto,
          mes_producao: reserva.mes_producao,
          data_prevista: reserva.data_prevista,
          setor_id: reserva.setor_id,                       // FIX: herda o setor do pai (não setorAtivo do filtro)
          // Dados específicos deste fragmento
          quantidade: lote.quantidade,
          numero_inicial: lote.numero_inicial,
          numero_final: lote.numero_final,
          quantidade_baixada: 0,
          status: 'RESERVADO',
          lote_pai_id: reserva.id                           // Rastreabilidade: referência ao lote original
        });
        novasReservas.push(novaReserva.id);
      }

      await rdsn.entities.Auditoria.create({
        entidade: 'ReservaLote',
        entidade_id: reserva.id,
        acao: 'RESERVA_CRIADA',
        letra_produto: reserva.letra_produto,
        ano: reserva.ano,
        numero_inicial: reserva.numero_inicial,
        numero_final: lotes[0].numero_final,
        codigo_produto: reserva.codigo_produto,
        detalhes: JSON.stringify({
          acao: 'QUEBRA_LOTE_MULTIPLO',
          quantidade_por_lote: quantidadePorLote,
          total_lotes: lotes.length,
          novas_reservas_ids: novasReservas,
          observacoes
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      setShowQuebrar(false);
      setSelectedReserva(null);
      toast.success('Lote quebrado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao quebrar lote: ' + error.message);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, acao }) => {
      const reserva = reservas.find(r => r.id === id);
      await rdsn.entities.ReservaLote.update(id, { status });

      await rdsn.entities.Auditoria.create({
        entidade: 'ReservaLote',
        entidade_id: id,
        acao: acao,
        letra_produto: reserva.letra_produto,
        ano: reserva.ano,
        numero_inicial: reserva.numero_inicial,
        numero_final: reserva.numero_final,
        codigo_produto: reserva.codigo_produto,
        detalhes: JSON.stringify({ status_anterior: reserva.status, status_novo: status })
      });

      if (acao === 'RESERVA_CANCELADA') {
        // Criar numeração livre com os números não utilizados
        const quantidadeNaoUsada = reserva.quantidade - (reserva.quantidade_baixada || 0);
        if (quantidadeNaoUsada > 0) {
          const prodInfo = produtos.find(p => p.letra_produto === reserva.letra_produto);
          const isDecrescente = prodInfo?.ordem_numeracao === 'DECRESCENTE';
          const numeroInicialLivre = isDecrescente 
            ? reserva.numero_inicial - (reserva.quantidade_baixada || 0)
            : reserva.numero_inicial + (reserva.quantidade_baixada || 0);
          const numeroFinalLivre = reserva.numero_final;

          await rdsn.entities.NumeracaoLivre.create({
            letra_produto: reserva.letra_produto,
            ano: reserva.ano,
            setor_id: reserva.setor_id,
            numero_inicial: numeroInicialLivre,
            numero_final: numeroFinalLivre,
            quantidade: quantidadeNaoUsada,
            reserva_original_id: reserva.id,
            motivo: 'CANCELAMENTO',
            disponivel: true,
            observacoes: `Lote cancelado - ${reserva.codigo_completo}`
          });
        }

        await rdsn.entities.Alerta.create({
          tipo: 'RESERVA_CANCELADA',
          severidade: 'MEDIA',
          titulo: `Reserva ${reserva.codigo_completo} cancelada`,
          descricao: `A reserva ${reserva.codigo_completo} do cliente ${reserva.cliente || 'N/A'} foi cancelada com ${reserva.quantidade_baixada || 0} de ${reserva.quantidade} unidades produzidas.`,
          entidade_tipo: 'ReservaLote',
          entidade_id: id,
          dados_extras: JSON.stringify({
            codigo: reserva.codigo_completo,
            cliente: reserva.cliente,
            quantidade_perdida: quantidadeNaoUsada
          })
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      queryClient.invalidateQueries({ queryKey: ['numeracoes-livres'] });
      toast.success('Status atualizado!');
    }
  });

  // Hook de busca avançada (APÓS o query de reservas)
  const { searchTerm, handleSearch, results: searchResults } = useSearch(
    reservas,
    ['codigo_completo', 'cliente', 'modelo', 'codigo_produto', 'letra_produto']
  );

  const filteredReservas = useMemo(() => {
    // Usar resultados da busca como base
    let result = searchTerm ? [...searchResults] : [...reservas];

    if (filters.cliente) {
      const search = filters.cliente.toLowerCase();
      result = result.filter(r => r.cliente?.toLowerCase().includes(search));
    }

    if (filters.codigoProduto) {
      const search = filters.codigoProduto.toLowerCase();
      result = result.filter(r => r.codigo_produto?.toLowerCase().includes(search));
    }

    if (filters.modelo) {
      const search = filters.modelo.toLowerCase();
      result = result.filter(r => r.modelo?.toLowerCase().includes(search));
    }

    if (filters.letra) {
      result = result.filter(r => r.letra_produto === filters.letra);
    }

    if (filters.ano) {
      result = result.filter(r => String(r.ano) === String(filters.ano));
    }

    if (filters.status) {
      result = result.filter(r => r.status === filters.status);
    }

    if (filters.dataInicio) {
      const dataInicio = new Date(filters.dataInicio);
      result = result.filter(r => new Date(r.created_at) >= dataInicio);
    }

    if (filters.dataFim) {
      const dataFim = new Date(filters.dataFim);
      dataFim.setHours(23, 59, 59, 999); // Fim do dia
      result = result.filter(r => new Date(r.created_at) <= dataFim);
    }

    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const direction = sortDirection === 'asc' ? 1 : -1;

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === 'string') return aVal.localeCompare(String(bVal)) * direction;
      return (Number(aVal) - Number(bVal)) * direction;
    });

    return result;
  }, [reservas, searchTerm, searchResults, filters, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const exportData = useMemo(() => {
    return filteredReservas.map(r => ({
      ...r,
      prefixo: r.codigo_completo ? r.codigo_completo.replace(/[0-9]/g, '').trim() : (r.letra_produto || '-'),
      intervalo: `${r.numero_inicial || ''} - ${r.numero_final || ''}`,
      data_criacao: r.created_at ? format(new Date(r.created_at), 'dd/MM/yyyy') : '-',
    }));
  }, [filteredReservas]);

  const colunasExport = useMemo(() => [
    { key: 'unidade', label: 'Unidade', width: 14 },
    { key: 'cliente', label: 'Cliente', width: 22 },
    { key: 'prefixo', label: 'Prefixo', width: 10 },
    { key: 'ano', label: 'Ano', width: 8 },
    { key: 'codigo_completo', label: 'Código', width: 14 },
    { key: 'intervalo', label: 'Intervalo', width: 18 },
    { key: 'quantidade', label: 'Qtd', width: 10, tipo: 'numero' },
    { key: 'quantidade_baixada', label: 'Baixado', width: 10, tipo: 'numero' },
    { key: 'status', label: 'Status', width: 14 },
    { key: 'data_criacao', label: 'Data', width: 14 },
    { key: 'codigo_produto', label: 'Cód. Produto', width: 16 },
    { key: 'modelo', label: 'Modelo', width: 16 },
    { key: 'letra_produto', label: 'Letra', width: 8 },
    { key: 'numero_inicial', label: 'Nº Inicial', width: 12, tipo: 'numero' },
    { key: 'numero_final', label: 'Nº Final', width: 12, tipo: 'numero' },
    { key: 'unidade', label: 'Unidade', width: 14 },
    { key: 'mes_producao', label: 'Mês Produção', width: 14 },
    { key: 'data_prevista', label: 'Data Prevista', width: 14 },
  ], []);

  const resumoExport = useMemo(() => {
    const total = filteredReservas.length;
    const totalQtd = filteredReservas.reduce((s, r) => s + (r.quantidade || 0), 0);
    const totalBaixada = filteredReservas.reduce((s, r) => s + (r.quantidade_baixada || 0), 0);
    const reservados = filteredReservas.filter(r => r.status === 'RESERVADO').length;
    const emProducao = filteredReservas.filter(r => r.status === 'EM_PRODUCAO').length;
    const produzidos = filteredReservas.filter(r => r.status === 'PRODUZIDO').length;
    const cancelados = filteredReservas.filter(r => r.status === 'CANCELADO').length;
    return {
      'Total de Lotes': total,
      'Quantidade Total': totalQtd,
      'Total Baixada': totalBaixada,
      'Reservados': reservados,
      'Em Produção': emProducao,
      'Produzidos': produzidos,
      'Cancelados': cancelados,
    };
  }, [filteredReservas]);

  const filtrosExport = useMemo(() => {
    const f = {};
    if (filters.cliente) f['Cliente'] = filters.cliente;
    if (filters.codigoProduto) f['Cód. Produto'] = filters.codigoProduto;
    if (filters.modelo) f['Modelo'] = filters.modelo;
    if (filters.letra) f['Letra'] = filters.letra;
    if (filters.ano) f['Ano'] = filters.ano;
    if (filters.status) f['Status'] = filters.status;
    if (filters.dataInicio) f['Data Início'] = filters.dataInicio;
    if (filters.dataFim) f['Data Fim'] = filters.dataFim;
    return f;
  }, [filters]);

  const letras = [...new Set(produtos.map(p => p.letra_produto))].sort();
  const anos = [...new Set(sequencias.map(s => s.ano))].sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all hover:scale-105 active:scale-95 group border border-blue-400/20">
                <Package className="w-8 h-8 sm:w-10 sm:h-10 text-white group-hover:rotate-12 transition-transform duration-500" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Gestão de <span className="text-blue-600 dark:text-blue-400">Reservas</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                  Lotes • Produção • Sincronização
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center">
              <SetorReadonlyBanner />

              <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['reservas'] });
                    queryClient.invalidateQueries({ queryKey: ['sequencias'] });
                    queryClient.invalidateQueries({ queryKey: ['numeracoes-livres'] });
                    queryClient.invalidateQueries({ queryKey: ['movimentacoes-dashboard'] });
                    queryClient.invalidateQueries({ queryKey: ['auditoria-dashboard'] });
                    toast.success('Sync finalizado com êxito!');
                  }}
                  className="w-10 h-10 rounded-xl hover:bg-white dark:hover:bg-slate-700 transition-all text-slate-500 hover:text-blue-500 active:rotate-180 duration-500"
                >
                  <RefreshCw className="w-5 h-5" />
                </Button>

                <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-1" />

                <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/50 dark:border-white/5">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <Select value={filters.ano || 'all'} onValueChange={(v) => setFilters(prev => ({ ...prev, ano: v === 'all' ? '' : v }))}>
                    <SelectTrigger className="w-[110px] bg-transparent border-0 focus:ring-0 font-black uppercase text-[10px] tracking-widest h-7 px-0">
                      <SelectValue placeholder="Safra" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-white/10 backdrop-blur-xl">
                      <SelectItem value="all" className="font-bold uppercase text-[10px]">Todas</SelectItem>
                      {anos.map(ano => (
                        <SelectItem key={ano} value={String(ano)} className="font-bold uppercase text-[10px]">20{ano}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ExportarRelatorio
                dados={exportData}
                colunas={colunasExport}
                titulo="Relatório de Reservas"
                resumo={resumoExport}
                filtrosAplicados={filtrosExport}
              />
              {!isReadonly && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="h-12 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white font-black uppercase text-xs tracking-widest gap-2 shadow-xl hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all border-0 ring-1 ring-white/20"
                >
                  <Plus className="w-4 h-4" /> Nova Reserva
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="inline-flex gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl shadow-inner">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-md data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="reservas" className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-md data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              <Eye className="w-4 h-4" />
              Reservas
            </TabsTrigger>
            <TabsTrigger value="produtos" className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-md data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              <Package className="w-4 h-4" />
              Produtos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <PageTransition>
              <DashboardReservas
                filtroAno={filters.ano ? Number(filters.ano) : null}
                setFiltroAno={(ano) => setFilters(prev => ({ ...prev, ano: ano?.toString() || '' }))}
                sequencias={sequencias}
                setActiveTab={setActiveTab}
                setFilters={setFilters}
              />
            </PageTransition>
          </TabsContent>

          <TabsContent value="reservas" className="space-y-6">
            <PageTransition className="space-y-6">
              <NumeracoesLivres
                produtos={produtos}
                sequencias={sequencias}
                onReservaCreated={async () => {
                  queryClient.removeQueries({ queryKey: ['numeracoes-livres'] });
                  await queryClient.invalidateQueries({ queryKey: ['reservas'] });
                }}
              />

              {/* Barra de Busca Global */}
              <PremiumCard noPadding className="mb-6" title="Busca Rápida" icon={Plus}>
                <div className="p-4">
                  <SearchBar
                    value={searchTerm}
                    onChange={handleSearch}
                    placeholder="Buscar por código, cliente, modelo, produto..."
                    resultCount={filteredReservas.length}
                    showResultCount={searchTerm !== ''}
                  />
                </div>
              </PremiumCard>

              <AdvancedFilterBar
                filters={filters}
                setFilters={setFilters}
                reservas={reservas}
                letras={letras}
                anos={anos}
                onClear={() => setFilters({
                  cliente: '',
                  codigoProduto: '',
                  modelo: '',
                  letra: '',
                  ano: '',
                  status: '',
                  dataInicio: '',
                  dataFim: ''
                })}
              />

              <ReservasTable
                reservas={filteredReservas}
                isLoading={loadingReservas}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                onDetalhes={(reserva) => {
                  setSelectedReserva(reserva);
                  setShowDetalhes(true);
                }}
                onHistorico={(reserva) => {
                  setSelectedReserva(reserva);
                  setShowHistorico(true);
                }}
                onBaixa={(reserva) => {
                  setSelectedReserva(reserva);
                  setShowBaixa(true);
                }}
                onCancelar={(reserva) => updateStatusMutation.mutate({
                  id: reserva.id,
                  status: 'CANCELADO',
                  acao: 'RESERVA_CANCELADA'
                })}
                onLiberar={(reserva) => updateStatusMutation.mutate({
                  id: reserva.id,
                  status: 'LIBERADO',
                  acao: 'RESERVA_LIBERADA'
                })}
                onEncurtar={(reserva) => {
                  setSelectedReserva(reserva);
                  setShowEncurtar(true);
                }}
                onQuebrar={(reserva) => {
                  setSelectedReserva(reserva);
                  setShowQuebrar(true);
                }}
                onSincronizar={(reserva) => {
                  setSelectedReserva(reserva);
                  setShowSincronizar(true);
                }}
                integracoesAtivas={integracoes.length > 0}
              />
            </PageTransition>
          </TabsContent>

          <TabsContent value="produtos">
            <PageTransition>
              <ProdutosTab />
            </PageTransition>
          </TabsContent>
        </Tabs>

        {/* Nova Reserva Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl dark:bg-slate-900/90 dark:border-white/10 rounded-[2.5rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0">
            <div className="bg-gradient-to-br from-blue-700 to-indigo-800 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
              <DialogHeader className="relative z-10">
                <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-blue-200" />
                  </span>
                  Nova <span className="text-blue-200">Reserva</span> de Lote
                </DialogTitle>
                <p className="text-[10px] font-black text-blue-100/60 uppercase tracking-[0.2em] mt-2 italic">
                  Alocação de Sequência • Planejamento Industrial
                </p>
              </DialogHeader>
            </div>
            <div className="p-0 overflow-y-auto max-h-[75vh]">
              <div className="p-8">
                <ReservaForm
                  key={String(showForm)}
                  produtos={produtos}
                  sequencias={sequencias}
                  pcpOps={pcpOps}
                  onSubmit={(data) => createReservaMutation.mutate(data)}
                  isLoading={createReservaMutation.isPending}
                  hideHeader
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Baixa Dialog */}
        <Dialog open={showBaixa} onOpenChange={setShowBaixa}>
          <DialogContent className="max-w-[70rem] h-[90vh] md:h-[85vh] p-0 flex flex-col bg-white dark:bg-slate-900 border-0 rounded-[2.5rem] overflow-hidden shadow-2xl dark:shadow-emerald-900/20">
            <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-800 p-8 sm:p-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
              <DialogHeader className="relative z-10">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shadow-lg shadow-emerald-900/20">
                    <ScanLine className="w-6 h-6 text-emerald-200" />
                  </div>
                  <DialogTitle className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">
                    Registrar <span className="text-emerald-200">Baixa</span>
                  </DialogTitle>
                </div>
                <p className="text-[10px] font-black text-emerald-100/60 uppercase tracking-[0.3em] flex items-center gap-2 italic">
                  Entrada de Produção Realizada • Lote {selectedReserva?.codigo_completo}
                </p>
              </DialogHeader>

              <Button
                variant="ghost"
                onClick={() => setShowBaixa(false)}
                className="absolute top-8 right-8 text-emerald-200/50 hover:text-white hover:bg-white/10 rounded-full w-12 h-12 p-0 transition-all"
              >
                <X className="w-8 h-8" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
              <div className="p-6 sm:p-10">
                {selectedReserva && (
                  <BaixaForm
                    reserva={selectedReserva}
                    onSubmit={(data) => createBaixaMutation.mutate(data)}
                    isLoading={createBaixaMutation.isPending}
                    onCancel={() => {
                      setShowBaixa(false);
                      setSelectedReserva(null);
                    }}
                  />
                )}
              </div>
            </div>

            <div className="px-10 py-4 shrink-0 bg-slate-50 dark:bg-black/40 border-t border-slate-100 dark:border-white/5 flex items-center justify-center gap-2 opacity-30">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Sistema de Rastreabilidade RDSN Ativo</span>
            </div>
          </DialogContent>
        </Dialog>

        {/* Detalhes da Reserva Dialog */}
        <Dialog open={showDetalhes} onOpenChange={setShowDetalhes}>
          <DialogContent className="md:max-w-5xl dark:bg-slate-900/90 dark:border-white/10 rounded-[2.5rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0">
            <div className="bg-slate-900 p-8 text-white relative overflow-hidden border-b border-white/5">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full -mr-48 -mt-48 blur-[80px]" />
              <DialogHeader className="relative z-10">
                <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-4">
                  <span className="w-14 h-14 rounded-3xl bg-blue-600/20 flex items-center justify-center border border-blue-500/20 shadow-lg">
                    <Eye className="w-7 h-7 text-blue-400" />
                  </span>
                  Visão Geral <span className="text-blue-400">da Reserva</span>
                </DialogTitle>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 opacity-80">
                  Monitoramento de Fluxo • Auditoria de Lote • {selectedReserva?.codigo_completo}
                </p>
              </DialogHeader>
            </div>
            <div className="p-0 overflow-y-auto max-h-[75vh]">
              <div className="p-6 md:p-8">
                {selectedReserva && (
                  <ReservaDetalhes
                    reserva={selectedReserva}
                    baixas={baixas.filter(b => b.reserva_id === selectedReserva.id)}
                    onBaixa={() => {
                      setShowDetalhes(false);
                      setShowBaixa(true);
                    }}
                  />
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Histórico de Baixas Dialog */}
        <Dialog open={showHistorico} onOpenChange={setShowHistorico}>
          <DialogContent className="md:max-w-6xl dark:bg-slate-900/90 dark:border-white/10 rounded-[2.5rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0">
            <div className="bg-slate-950 p-10 text-white relative overflow-hidden border-b border-white/5">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full -mr-48 -mt-48 blur-[100px]" />
              <DialogHeader className="relative z-10">
                <DialogTitle className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-5">
                  <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-white/10 shadow-2xl">
                    <History className="w-8 h-8 text-indigo-400" />
                  </div>
                  Linha do Tempo <span className="text-indigo-400">de Produção</span>
                </DialogTitle>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mt-3 italic opacity-70">
                  Log Transacional Consolidado • Lote Industrial {selectedReserva?.codigo_completo}
                </p>
              </DialogHeader>
            </div>
            <div className="p-0 overflow-y-auto max-h-[70vh]">
              <div className="p-6 md:p-10">
                {selectedReserva && (
                  <HistoricoBaixas
                    reserva={selectedReserva}
                    baixas={baixas.filter(b => b.reserva_id === selectedReserva.id)}
                  />
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Encurtar Lote Dialog */}
        {selectedReserva && (
          <EncurtarLoteDialog
            reserva={selectedReserva}
            open={showEncurtar}
            onOpenChange={setShowEncurtar}
            onConfirm={(data) => encurtarLoteMutation.mutate({ reserva: selectedReserva, ...data })}
            isLoading={encurtarLoteMutation.isPending}
          />
        )}

        {/* Quebrar Lote Dialog */}
        {selectedReserva && (
          <QuebrarLoteDialog
            reserva={selectedReserva}
            open={showQuebrar}
            onOpenChange={setShowQuebrar}
            onConfirm={(data) => quebrarLoteMutation.mutate({ reserva: selectedReserva, ...data })}
            isLoading={quebrarLoteMutation.isPending}
          />
        )}

        {/* Sincronizar com SIRC Dialog */}
        <Dialog open={showSincronizar} onOpenChange={setShowSincronizar}>
          <DialogContent className="max-w-md dark:bg-slate-900/95 dark:border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl border-0">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white relative border-b border-white/5 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <DialogHeader className="relative z-10">
                <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/20 shadow-lg">
                    <RefreshCw className="w-5 h-5 text-blue-400" />
                  </div>
                  Sincronização <span className="text-blue-400">Externa</span>
                </DialogTitle>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 italic opacity-60">Ponte Digital • Hub Integrador</p>
              </DialogHeader>
            </div>
            <div className="p-0 overflow-y-auto max-h-[75vh]">
              <div className="p-8">
                {selectedReserva && (
                  <div className="space-y-6 text-white">
                    <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Origem RDSN</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white italic leading-none truncate">{selectedReserva.codigo_completo}</p>
                      <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-tight truncate">{selectedReserva.cliente}</p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-1">Canais de Integração Ativos:</p>
                      {integracoes.length === 0 ? (
                        <div className="p-6 text-center bg-slate-50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-300 dark:border-white/10">
                          <p className="text-xs font-black text-slate-400 dark:text-slate-500 italic uppercase tracking-widest">Sem conexões disponíveis</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {integracoes.map(int => (
                            <Button
                              key={int.id}
                              variant="outline"
                              className="w-full h-14 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-900/20 justify-between group transition-all"
                              onClick={() => sincronizarMutation.mutate({
                                reserva_id: selectedReserva.id,
                                integracao_id: int.id
                              })}
                              disabled={sincronizarMutation.isPending}
                            >
                              <span className="font-black uppercase text-xs tracking-widest">{int.nome}</span>
                              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:rotate-180 transition-transform duration-500">
                                <RefreshCw className={cn("w-4 h-4", sincronizarMutation.isPending ? 'animate-spin' : '')} />
                              </div>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-black/20 text-center border-t dark:border-white/5">
              <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em]">AES-256 Encrypted Communication Tunnel</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}