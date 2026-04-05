// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Package,
  AlertCircle,
  User,
  Zap,
  Save,
  RefreshCw,
  Fingerprint,
  ShieldCheck,
  Play,
  Square
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { rdsn } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import AlternativasAlocacao from './AlternativasAlocacao';
import { cn } from "@/lib/utils";

export default function ReservaForm({ onSubmit, isLoading, produtos = [], pcpOps = [], hideHeader }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Estados
  const [setores, setSetores] = useState([]);
  const [setorAtivo, setSetorAtivo] = useState(null);
  const [formData, setFormData] = useState({
    cliente: '',
    letra_produto: '',
    sufixo: '',
    ano: new Date().getFullYear().toString().slice(-2),
    codigo_produto: '',
    mes_producao: format(new Date(), 'MMMM', { locale: ptBR }).toUpperCase(),
    quantidade: '',
    setor_id: null,
    manual: false,
    sequencia_decrescente: false,
    numero_inicial: '',
    numero_final: '',
    unidade: 'UNIDADE 1'
  });

  const [preview, setPreview] = useState(null);
  const [isAllocating, setIsAllocating] = useState(false);
  const [error, setError] = useState('');
  const [showDuplicataDialog, setShowDuplicataDialog] = useState(false);
  const [permitirDuplicata, setPermitirDuplicata] = useState(false);
  const [lacunasSugeridas, setLacunasSugeridas] = useState([]);

  const [produtoSearch, setProdutoSearch] = useState('');
  const [showProdutoSuggestions, setShowProdutoSuggestions] = useState(false);

  // Carregar setores e configurar estado inicial
  useEffect(() => {
    const fetchSetores = async () => {
      try {
        const data = await rdsn.entities.Setor.list();
        setSetores(data || []);

        if (data?.length > 0) {
          const inicial = isAdmin ? 'ALL' : data[0].id;
          setSetorAtivo(inicial);
          if (inicial !== 'ALL') {
            setFormData(prev => ({ ...prev, setor_id: inicial }));
          }
        }
      } catch (err) {
        console.error("Erro ao carregar setores:", err);
      }
    };
    fetchSetores();
  }, [isAdmin]);

  // Unificar produtos cadastrados (PCPCliente) com itens da programação (pcpOps)
  const produtosUnificados = useMemo(() => {
    // 'produtos' agora vem do PCPCliente em Reservas.jsx
    const list = [...(Array.isArray(produtos) ? produtos : [])];
    const ops = Array.isArray(pcpOps) ? pcpOps : [];

    // Adicionar OPs que não estão na lista de clientes (ex: códigos novos ou temporários)
    ops.forEach(op => {
      const codeToUse = op.codigo_produto || op.codigo_op;
      if (codeToUse && !list.find(p => p.codigo === codeToUse)) {
        list.push({
          codigo: codeToUse,
          nome: op.descricao || op.produto_nome || 'PLANEJAMENTO MENSAL',
          setor_id: op.setor_id,
          letra_padrao: op.letra_produto || '',
          sufixo: op.sufixo || '',
          prefixo_padrao: op.prefixo_padrao || '',
          origem: 'pcp_mapa'
        });
      }
    });

    return list.map(item => {
      // Cruzar dado com pcpOps para saber se tem programação no mês
      const temProgramacao = ops.some(op => op.codigo_produto === item.codigo || op.codigo_op === item.codigo);
      return { ...item, tem_programacao: temProgramacao };
    });
  }, [produtos, pcpOps]);

  // Filtrar produtos pelo setor ativo
  const produtosFiltrados = useMemo(() => {
    if (isAdmin && setorAtivo === 'ALL') return produtosUnificados;
    return produtosUnificados.filter(p => p.setor_id === setorAtivo);
  }, [produtosUnificados, setorAtivo, isAdmin]);

  // Auto-alocacao com debounce ao digitar quantidade
  useEffect(() => {
    const qtd = Number(formData.quantidade);
    const letra = formData.letra_produto;
    const ano = Number(formData.ano);

    // Não disparar se manual, faltam dados essenciais, ou setores ainda não carregaram
    if (formData.manual || !qtd || !letra || !ano || formData.quantidade === '') return;

    // Resolver setor aqui para garantir que está disponível
    const setorResolvido = (setorAtivo && setorAtivo !== 'ALL')
      ? setorAtivo
      : formData.setor_id || setores[0]?.id;

    // Aguardar setores carregarem (evita race condition)
    if (!setorResolvido) {
      console.log('[AutoAlloc] Aguardando setores carregarem...');
      return;
    }

    const timer = setTimeout(async () => {
      // 1) Detectar lacunas: reservas CANCELADAS ou LIBERADAS para o mesmo produto e ano
      try {
        const todas = await rdsn.entities.ReservaLote.filter({
          letra_produto: letra,
          ano: ano,
          setor_id: setorResolvido
        });
        const lacunas = (todas || []).filter(r =>
          (r.status === 'CANCELADO' || r.status === 'LIBERADO') && Number(r.quantidade) === qtd
        );
        setLacunasSugeridas(lacunas);
      } catch {
        setLacunasSugeridas([]);
      }

      // 2) Disparar alocacao automatica com o setor já resolvido
      handleAlocarAutomatico(letra, qtd, setorResolvido);
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.quantidade, formData.letra_produto, formData.ano, formData.manual, setorAtivo, formData.setor_id, setores]); // setores adicionado para reagir quando carregarem

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      const parseInputNumber = (val) => {
        if (typeof val === 'number') return val;
        return Number(String(val || '').replace(',', '.'));
      };

      // Cálculo automático no Modo Manual: Final = Início + Quantidade - 1
      const isManual = field === 'manual' ? value : prev.manual;
      if (isManual && (field === 'numero_inicial' || field === 'quantidade' || field === 'manual')) {
        const inicio = parseInputNumber(field === 'numero_inicial' ? value : prev.numero_inicial);
        const qtd = parseInputNumber(field === 'quantidade' ? value : prev.quantidade);
        
        if (inicio > 0 && qtd > 0) {
          const fimCalculado = inicio + qtd - 1;
          // Usar toFixed ou formatar para evitar dízimas de ponto flutuante se necessário, 
          // mas String() costuma ser ok para poucos decimais.
          newData.numero_final = String(Number(fimCalculado.toFixed(4))); 
        }
      }

      // Ao ATIVAR modo manual, sugerir próximo número disponível como ponto de partida
      if (field === 'manual' && value === true) {
        const letra = prev.letra_produto;
        const qtd = Number(prev.quantidade);
        const ano = Number(prev.ano);
        const s_id = prev.setor_id || (setorAtivo !== 'ALL' ? setorAtivo : null) || setores[0]?.id;
        if (letra && qtd > 0 && ano && s_id) {
          // Dispara de forma async sem bloquear o setState
          setTimeout(() => handleAlocarAutomatico(letra, qtd, s_id), 0);
        }
      }
      
      return newData;
    });
    
    setError('');

    if (['letra_produto', 'sufixo', 'ano', 'quantidade', 'codigo_produto'].includes(field)) {
      setPreview(null);
    }
  };

  const handleCodigoProdutoChange = (codigo) => {
    if (!codigo) return;

    // Buscar nas duas fontes
    const pArray = produtosFiltrados;
    const produto = pArray.find(p => p.codigo === codigo);

    // Buscar todas as OPs relacionadas (suporta duplicados e atrasos)
    const opsArray = Array.isArray(pcpOps) ? pcpOps : [];
    const opsRelacionadas = opsArray.filter(op =>
      op.codigo_produto === codigo || op.codigo_op === codigo
    );
    const temProgramacao = opsRelacionadas.length > 0;

    const fetchAnteriores = async () => {
      try {
        // Filtrar reservas existentes pelo código e pelo ano atual do formulário
        const rArray = await rdsn.entities.ReservaLote.filter({
          codigo_produto: codigo,
          ano: parseInt(formData.ano), // Filtro por ano para garantir saldo isolado
          status: { $ne: 'CANCELADO' }
        });

        const parseInputNumber = (val) => {
          if (typeof val === 'number') return val;
          return Number(String(val || '').replace(',', '.'));
        };

        const qtdJaReservada = (rArray || []).reduce((acc, r) => acc + (parseInputNumber(r.quantidade) || 0), 0);

        // Somar demanda de todas as OPs encontradas
        const qtdPCPTotal = opsRelacionadas.reduce((acc, op) => acc + (parseInputNumber(op.quantidade_total) || 0), 0);
        const qtdFaltante = Math.max(0, qtdPCPTotal - qtdJaReservada);

        // Pegar dados da OP mais recente ou da primeira para preenchimento
        const opPrincipal = opsRelacionadas[0];

        // Calcular os valores finais para alocação automática ANTES de setFormData
        // Prioridade: cadastro técnico > OP principal > estado atual do formulário
        const letraFinal = produto?.letra_padrao || produto?.letra_produto || opPrincipal?.letra_produto || formData.letra_produto;
        const qtdFinal = qtdFaltante > 0 ? qtdFaltante : (qtdPCPTotal > 0 && qtdJaReservada === 0 ? qtdPCPTotal : Number(formData.quantidade));
        const setorFinal = opPrincipal?.setor_id || produto?.setor_id || formData.setor_id
          || (setorAtivo && setorAtivo !== 'ALL' ? setorAtivo : null)
          || setores[0]?.id;

        // Resolver sufixo: cadastro técnico > extrair do prefixo_padrao > OP > estado atual
        const sufixoFinal = produto?.sufixo
          || produto?.prefixo_padrao?.replace(/^[A-Z]/i, '')
          || opPrincipal?.sufixo
          || '';

        setFormData(prev => {
          const newData = {
            ...prev,
            codigo_produto: codigo,
            modelo: opPrincipal?.descricao || produto?.modelo || produto?.nome || 'PRODUTO',
            // Prioridade absoluta para a letra do cadastro técnico/cliente, fallback para OP
            letra_produto: letraFinal,
            sufixo: sufixoFinal || prev.sufixo || '',
            cliente: opPrincipal?.cliente_nome || produto?.nome || prev.cliente,
            setor_id: setorFinal
          };

          // Autopreencher quantidade apenas se houver saldo no PCP agregado
          if (qtdFaltante > 0) {
            newData.quantidade = String(qtdFaltante);
          } else if (qtdPCPTotal > 0 && qtdJaReservada === 0) {
            newData.quantidade = String(qtdPCPTotal);
          } else {
            newData.quantidade = String(qtdFinal); // Usar o valor já calculado
          }

          return newData;
        });

        if (!temProgramacao) {
          toast.warning("Registrado no cadastro geral, mas sem programação mensal.", {
            description: "Você pode prosseguir, mas este lote não abaterá saldo do mapa mensal."
          });
        } else {
          // Checar se as OPs casam com o mês atual (prevenindo falso-positivo de atrasos remotos)
          const mesAtual = new Date().getMonth() + 1;
          const temAtraso = opsRelacionadas.some(op => (op.mes || op.j_data?.mes) !== mesAtual);

          toast.success(`Demanda Consolidada!`, {
            description: `Saldo Total: ${qtdFaltante} ${temAtraso ? "(inclui atrasos)" : ""} | ${opsRelacionadas.length} OP(s) encontradas.`
          });
        }

        // Tenta alocação automática se tiver os dados necessários
        if (letraFinal && qtdFinal > 0 && !formData.manual) {
          handleAlocarAutomatico(letraFinal, qtdFinal, setorFinal);
        }
      } catch (err) {
        console.error("Erro ao buscar reservas anteriores:", err);
      }
    };

    fetchAnteriores();
  };

  const handleInputCodigoBlur = () => {
    const val = (produtoSearch || formData.codigo_produto || '').toUpperCase();
    const pArray = Array.isArray(produtos) ? produtos : [];
    const produtoMatch = pArray.find(p => p.codigo === val);

    if (produtoMatch) {
      // Forçar atualização mesmo que o código seja o mesmo, para garantir que os dados de OPs foram puxados
      handleCodigoProdutoChange(val);
    }

    // Usar timeout para permitir que o clique no botão de sugestão ocorra
    setTimeout(() => setShowProdutoSuggestions(false), 200);
  };

  const handleAlocarAutomatico = async (overrideLetra, overrideQtd, overrideSetorId) => {
    const parseInputNumber = (val) => {
      if (typeof val === 'number') return val;
      return Number(String(val || '').replace(',', '.'));
    };

    const letra = overrideLetra || formData.letra_produto;
    const qtd = parseInputNumber(overrideQtd || formData.quantidade);
    const ano = parseInputNumber(formData.ano);
    // Resolução robusta do setor: prioridade ao override, depois form, depois tab ativa, depois primeiro da lista
    const s_id = overrideSetorId
      || formData.setor_id
      || (setorAtivo && setorAtivo !== 'ALL' ? setorAtivo : null)
      || setores[0]?.id;

    console.log('[AutoAlloc] Tentando alocar:', { letra, qtd, ano, s_id, setorAtivo, formSetor: formData.setor_id });

    if (!letra || !ano || !qtd || !s_id) {
      const motivo = !letra ? 'letra' : !ano ? 'ano' : !qtd ? 'quantidade' : 'setor';
      console.warn(`[AutoAlloc] Abortado: campo '${motivo}' ausente`);
      if (!overrideLetra) setError(`Preencha o campo '${motivo}' para alocação automática`);
      return;
    }

    setIsAllocating(true);
    setPreview(null);
    setError('');

    try {
      const resp = await rdsn.functions.invoke('alocarNumerosAutomatico', {
        letra_produto: letra,
        ano: ano,
        quantidade: qtd,
        setor_id: s_id
      });

      // A resposta vem encapsulada em 'data' se for via simulator ou fetch real
      const result = resp?.data || resp;

      if (!result) throw new Error('Resposta vazia do serviço de alocação');
      if (result.error) throw new Error(result.error);
      if (!result.intervalo) throw new Error('Nenhum intervalo disponível encontrado');

      console.log('[AutoAlloc] Sucesso:', result.intervalo);
      setPreview(result);
      setFormData(prev => ({
        ...prev,
        numero_inicial: result.intervalo.numero_inicial,
        numero_final: result.intervalo.numero_final
      }));
    } catch (err) {
      console.error('[AutoAlloc] Erro:', err);
      setError(err.message || 'Falha na alocação automática');
    } finally {
      setIsAllocating(false);
    }
  };

  const handleSelecionarAlternativa = (alt) => {
    setFormData(p => ({
      ...p,
      numero_inicial: alt.numero_inicial,
      numero_final: alt.numero_final
    }));
    setPreview(p => ({
      ...p,
      numero_inicial: alt.numero_inicial,
      numero_final: alt.numero_final,
      codigo_completo: alt.codigo_completo
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.cliente || !formData.quantidade || !formData.numero_inicial) {
      setError('Dados incompletos para registro');
      return;
    }

    // Validação de número inicial > final removida para permitir wrap-around RDSN (ex: 900-100)

    if (Number(formData.quantidade) <= 0) {
      toast.error("A quantidade deve ser maior que zero.");
      return;
    }



    if (!permitirDuplicata) {
      try {
        const existentes = await rdsn.entities.ReservaLote.list();
        const eArray = Array.isArray(existentes) ? existentes : [];
        const duplicada = eArray.find(r =>
          r.cliente === formData.cliente &&
          r.codigo_produto === formData.codigo_produto &&
          r.status !== 'CANCELADO'
        );

        if (duplicada) {
          setShowDuplicataDialog(true);
          return;
        }
      } catch (err) {
        console.error("Erro verificação duplicata:", err);
      }
    }

    const parseInputNumber = (val) => {
      if (typeof val === 'number') return val;
      return Number(String(val || '').replace(',', '.'));
    };

    const dadosFinal = {
      ...formData,
      ano: parseInputNumber(formData.ano),
      quantidade: parseInputNumber(formData.quantidade),
      numero_inicial: parseInputNumber(formData.numero_inicial),
      numero_final: parseInputNumber(formData.numero_final),
      codigo_completo: preview?.codigo_completo || `${formData.letra_produto}${formData.ano}${formData.sufixo || ''}`
    };

    onSubmit(dadosFinal);
    setPendingSubmission(null);
  };

  const temProgramacao = useMemo(() => {
    if (!formData.codigo_produto) return false;
    const prod = produtosUnificados.find(p => p.codigo === formData.codigo_produto);
    return prod?.tem_programacao || false;
  }, [produtosUnificados, formData.codigo_produto]);

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 max-w-4xl mx-auto pb-10">
      {!hideHeader && (
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Novo Registro de Lote</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Sistema de Alocação Certificada de Numeração</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border-2 border-rose-500/20 p-5 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-4">
          <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center border border-rose-500/20">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-rose-500 tracking-widest leading-none mb-1">Inconsistência Identificada</p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Step 1: Contexto e Cliente */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 border border-slate-200 dark:border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />

          <div className="flex items-center gap-3 mb-10 border-b border-slate-100 dark:border-white/5 pb-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] italic leading-tight">Módulo 01</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Identificação Comercial</h3>
            </div>
          </div>

          <div className="space-y-6 relative z-10">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 italic">Entidade Cliente</Label>
              <Input
                value={formData.cliente}
                onChange={(e) => handleChange('cliente', e.target.value.toUpperCase())}
                placeholder="EX: NOME DO CLIENTE OU OPERAÇÃO"
                className="h-16 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 text-lg font-black uppercase italic tracking-tighter focus:bg-white dark:focus:bg-slate-800 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 italic">Unidade de Produção (PCP)</Label>
              <div className="flex gap-4">
                {['UNIDADE 1', 'UNIDADE 2'].map((u) => (
                  <Button
                    key={u}
                    type="button"
                    onClick={() => handleChange('unidade', u)}
                    variant={formData.unidade === u ? 'default' : 'outline'}
                    className={cn(
                      "flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all",
                      formData.unidade === u 
                        ? "bg-blue-600 text-white shadow-lg scale-[1.02] border-0" 
                        : "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 opacity-60 hover:opacity-100"
                    )}
                  >
                    {u}
                  </Button>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-500">
                <Label className="text-[10px) font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 italic">Unidade Operacional Responsável</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Button
                    type="button"
                    variant={setorAtivo === 'ALL' ? 'default' : 'outline'}
                    onClick={() => { setSetorAtivo('ALL'); handleChange('setor_id', null); }}
                    className={cn(
                      "h-14 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all",
                      setorAtivo === 'ALL' ? "bg-slate-900 text-white shadow-xl" : "border-slate-100 dark:border-white/5 opacity-60 hover:opacity-100"
                    )}
                  >
                    <span className="rotate-[-10deg] mr-2 text-xs">🌐</span> Todos Setores
                  </Button>
                  {setores.map(setor => (
                    <Button
                      key={setor.id}
                      type="button"
                      variant={setorAtivo === setor.id ? 'default' : 'outline'}
                      onClick={() => { setSetorAtivo(setor.id); handleChange('setor_id', setor.id); }}
                      className={cn(
                        "h-14 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all border-0",
                        setorAtivo === setor.id ? "text-white shadow-xl" : "bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100"
                      )}
                      style={setorAtivo === setor.id ? { backgroundColor: setor.cor || '#3b82f6' } : {}}
                    >
                      {setor.nome}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Detalhes Técnicos */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 border border-slate-200 dark:border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full -ml-32 -mt-32 blur-3xl" />

          <div className="flex items-center gap-3 mb-10 border-b border-slate-100 dark:border-white/5 pb-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner">
              <Package className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] italic leading-tight">Módulo 02</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Configuração Técnica do Lote</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-50">
            <div className="space-y-2 relative">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 italic">Código SKU / Produto</Label>
              <div className="relative group">
                <Input
                  value={produtoSearch || formData.codigo_produto}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setProdutoSearch(val);
                    handleChange('codigo_produto', val);
                    setShowProdutoSuggestions(true);
                  }}
                  onFocus={() => setShowProdutoSuggestions(true)}
                  onBlur={handleInputCodigoBlur}
                  placeholder="DIGITE OU SELECIONE O PRODUTO..."
                  className="h-16 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 text-lg font-black uppercase italic tracking-tighter focus:bg-white dark:focus:bg-slate-800 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-indigo-500/10">
                  <Package className="w-5 h-5 text-indigo-500" />
                </div>
              </div>

              {showProdutoSuggestions && produtosFiltrados.length > 0 && (
                <div className="absolute z-[200] w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/10 rounded-2xl shadow-2xl mt-2 max-h-60 overflow-y-auto overflow-x-hidden backdrop-blur-xl p-2 animate-in fade-in zoom-in-95 duration-200">
                  {produtosFiltrados
                    .filter(p => {
                      if (!produtoSearch) return true;
                      const search = produtoSearch.toUpperCase();
                      const codigoMatch = p.codigo?.toUpperCase().includes(search);
                      const nomeMatch = p.nome?.toUpperCase().includes(search);
                      return codigoMatch || nomeMatch;
                    })
                    .map(p => (
                      <button
                        key={p.codigo}
                        type="button"
                        onMouseDown={() => {
                          setProdutoSearch(p.codigo);
                          handleCodigoProdutoChange(p.codigo);
                          setShowProdutoSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 rounded-xl border-b border-slate-50 dark:border-white/5 last:border-0 transition-all group/item"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 dark:text-white text-sm group-hover/item:text-indigo-600 transition-colors uppercase">{p.nome || p.modelo || 'SEM NOME'}</span>
                            <span className="text-[10px] font-mono font-bold text-slate-400 group-hover/item:text-slate-500">{p.codigo}</span>
                          </div>
                          {p.tem_programacao ? (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-0 font-black text-[9px] uppercase shrink-0">Mapa Mensal</Badge>
                          ) : (
                            <Badge variant="outline" className="font-black text-[9px] text-slate-400 border-slate-200 uppercase shrink-0">Cadastro Geral</Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  {produtosFiltrados.filter(p => {
                    if (!produtoSearch) return true;
                    const search = produtoSearch.toUpperCase();
                    const codigoMatch = p.codigo?.toUpperCase().includes(search);
                    const nomeMatch = p.nome?.toUpperCase().includes(search);
                    return codigoMatch || nomeMatch;
                  }).length === 0 && (
                      <div className="p-4 text-center">
                        <p className="text-[10px] font-black uppercase text-slate-400 italic">Nenhum produto correspondente</p>
                      </div>
                    )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic">Volume de Carga</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    value={formData.quantidade}
                    onChange={(e) => handleChange('quantidade', e.target.value)}
                    className="h-16 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 text-2xl font-black italic tracking-tighter focus:bg-white dark:focus:bg-slate-800 transition-all text-blue-600 dark:text-blue-400"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase tracking-widest">UNIDADES</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic">Safra Operacional</Label>
                <Input
                  value={formData.mes_producao}
                  onChange={(e) => handleChange('mes_producao', e.target.value.toUpperCase())}
                  className="h-16 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 text-lg font-black uppercase italic tracking-tighter focus:bg-white dark:focus:bg-slate-800 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="mt-10 p-6 md:p-8 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 flex flex-wrap items-center gap-8 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-white/5 shadow-sm">
                <span className="text-xl">🔠</span>
              </div>
              <div>
                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic block mb-1">Letra / Sufixo de Série</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={formData.letra_produto}
                    onChange={(e) => handleChange('letra_produto', e.target.value.toUpperCase().slice(0, 1))}
                    placeholder="A"
                    className="w-14 h-10 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white/5 rounded-lg text-center font-black text-lg focus:border-indigo-500 transition-all"
                  />
                  <span className="text-slate-300 dark:text-slate-600 font-black text-sm">+</span>
                  <Input
                    value={formData.sufixo}
                    onChange={(e) => handleChange('sufixo', e.target.value.toUpperCase().slice(0, 4))}
                    placeholder="LM"
                    className="w-20 h-10 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white/5 rounded-lg text-center font-black text-base italic text-blue-500 dark:text-blue-400 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 border-l border-slate-200 dark:border-white/10 pl-8">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-white/5 shadow-sm">
                <span className="text-xl">📅</span>
              </div>
              <div>
                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic block mb-1">Ano Safra</Label>
                <div className="flex items-center gap-1 font-black text-xl text-slate-300">
                  20
                  <Input
                    value={formData.ano}
                    onChange={(e) => handleChange('ano', e.target.value.slice(0, 2))}
                    className="w-20 h-10 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white/5 rounded-lg text-center font-black text-lg focus:border-indigo-500 transition-all text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 border-l border-slate-200 dark:border-white/10 pl-8">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-white/5 shadow-sm">
                <span className="text-xl">🏭</span>
              </div>
              <div>
                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic block mb-1">Unidade Fiscal</Label>
                <div className="flex items-center gap-2">
                  <select
                    value={formData.unidade}
                    onChange={(e) => handleChange('unidade', e.target.value)}
                    className="h-10 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white/5 rounded-lg px-2 font-black text-[11px] uppercase tracking-tighter italic text-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  >
                    <option value="UNIDADE 1">Unidade 1</option>
                    <option value="UNIDADE 2">Unidade 2</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Alocação Digital */}
        <div className="bg-slate-900 dark:bg-black rounded-[2.5rem] p-8 md:p-12 border-4 border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.1)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full -mr-48 -mt-48 blur-3xl" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/20">
                <Zap className="w-8 h-8 text-white animate-pulse" />
              </div>
              <div>
                <p className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em] leading-tight mb-1">Módulo de Atribuição</p>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Sequenciamento de Numeração</h3>
              </div>
            </div>

            <div className="flex items-center gap-6 bg-white/5 p-2 px-4 rounded-2xl border border-white/5 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Sequência Decrescente</span>
                <Switch
                  checked={formData.sequencia_decrescente}
                  onCheckedChange={(val) => handleChange('sequencia_decrescente', val)}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>

              <div className="w-[1px] h-8 bg-white/10" />

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Atribuição Manual</span>
                <Switch
                  checked={formData.manual}
                  onCheckedChange={(val) => handleChange('manual', val)}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
            </div>
          </div>

          {formData.manual ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center border border-green-500/30">
                    <Play className="w-4 h-4 text-green-400 fill-current" />
                  </div>
                  <Label className="text-xs font-black uppercase tracking-tighter text-white/40">Início da Faixa</Label>
                </div>
                <Input
                  id="reserva-inicio-manual"
                  type="number"
                  step="any"
                  placeholder="0"
                  value={formData.numero_inicial}
                  onChange={(e) => handleChange('numero_inicial', e.target.value)}
                  className="h-24 bg-white/10 border-2 border-white/20 rounded-[2rem] px-10 text-4xl font-black text-white italic tracking-tighter focus:border-blue-500 focus:bg-white/20 transition-all shadow-2xl"
                />
                <span className="text-[10px] font-bold text-blue-400/60 ml-4 uppercase tracking-widest">Definição Manual</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center border border-red-500/30">
                    <Square className="w-4 h-4 text-red-500 fill-current" />
                  </div>
                  <Label className="text-xs font-black uppercase tracking-tighter text-white/40">Final da Faixa</Label>
                </div>
                <Input
                  id="reserva-fim-manual"
                  type="number"
                  step="any"
                  placeholder="0"
                  value={formData.numero_final}
                  onChange={(e) => handleChange('numero_final', e.target.value)}
                  className="h-24 bg-red-950/20 border-2 border-red-500/20 rounded-[2rem] px-10 text-4xl font-black text-red-100 italic tracking-tighter focus:border-red-500 focus:bg-red-900/40 transition-all shadow-2xl"
                />
                <span className="text-[10px] font-bold text-red-400/60 ml-4 uppercase tracking-widest">Encerramento da Reserva</span>
              </div>
            </div>
          ) : (
            <div className="space-y-10 relative z-10">
              {/* Banner: reaproveitamento de lacunas */}
              {lacunasSugeridas.length > 0 && !preview && (
                <div className="animate-in slide-in-from-top-4 duration-500 mb-2">
                  <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <span className="text-lg">♻️</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Reaproveitamento Numérico Disponível</p>
                      <p className="text-xs text-amber-200/80 font-semibold">
                        {lacunasSugeridas.length} lote(s) cancelado(s)/liberado(s) com {formData.quantidade} unidades foram encontrados.
                        O sistema alocará automaticamente a melhor lacuna disponível.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {lacunasSugeridas.slice(0, 3).map((l, i) => (
                          <span key={i} className="text-[9px] font-black text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg font-mono">
                            #{l.numero_inicial?.toLocaleString()} – #{l.numero_final?.toLocaleString()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!preview ? (
                <div className="text-center py-10">
                  {isAllocating ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-[2rem] bg-white/10 border-2 border-white/10 flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
                      </div>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest animate-pulse">Calculando melhor intervalo...</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col items-center gap-3 opacity-40">
                        <Fingerprint className="w-10 h-10 text-slate-400" />
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">
                          {formData.quantidade ? 'Aguardando...' : 'Digite a quantidade para alocar automaticamente'}
                        </p>
                      </div>
                      {formData.quantidade && formData.letra_produto && (
                        <Button
                          type="button"
                          onClick={handleAlocarAutomatico}
                          className="mt-6 h-12 px-8 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                        >
                          Alocar Manualmente
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-8 animate-in zoom-in duration-500">
                  <div className="bg-white/10 rounded-[2.5rem] p-10 border-2 border-white/10 backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                    </div>
                    <div className="text-center space-y-4">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] italic mb-4">Intervalo Certificado</p>
                      <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                        <div className="text-center md:text-right flex-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">INÍCIO</p>
                          <p className="text-5xl font-black text-white tracking-tighter italic">{preview.numero_inicial?.toLocaleString()}</p>
                        </div>
                        <div className="hidden md:block h-16 w-px bg-white/20 shrink-0" />
                        <div className="text-center md:text-left flex-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">FIM</p>
                          <p className="text-5xl font-black text-white tracking-tighter italic">{preview.numero_final?.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="pt-8 border-t border-white/5 mt-6">
                        <Badge className="bg-white/10 text-white font-black uppercase text-xs px-5 py-2 border-white/10 backdrop-blur-xl rounded-xl flex items-center gap-3">
                          <span>LOTE: {preview.codigo_completo}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          <span>VOL: {formData.quantidade?.toLocaleString()} UN</span>
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {preview.alternativas?.length > 1 && (
                    <AlternativasAlocacao
                      alternativas={preview.alternativas}
                      intervaloSelecionado={{ numero_inicial: formData.numero_inicial, numero_final: formData.numero_final }}
                      onSelectAlternativa={handleSelecionarAlternativa}
                      formData={formData}
                    />
                  )}

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setPreview(null)}
                      className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                    >
                      Refazer Alocação Inteligente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="pt-10 flex flex-col md:flex-row gap-6 items-center border-t border-slate-100 dark:border-white/5">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 italic">
            <ShieldCheck className="w-4 h-4 text-emerald-500/50" />
            Validação de integridade em tempo real (Supabase Edge)
          </p>
          <div className="flex-1" />
          <Button
            type="submit"
            disabled={isLoading || (!preview && !formData.manual)}
            className="w-full md:w-auto h-20 px-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-y-0 left-0 w-2 bg-blue-600 transition-all group-hover:w-full group-hover:opacity-10 z-0" />
            <span className="relative z-10 flex items-center">
              {isLoading ? <RefreshCw className="w-5 h-5 animate-spin mr-3" /> : <Save className="w-5 h-5 mr-3" />}
              {temProgramacao ? 'Confirmar Distribuição Mensal' : 'Confirmar e Gerar Lote Operacional'}
            </span>
          </Button>
        </div>
      </form>

      {/* Dialog Duplicata */}
      <Dialog open={showDuplicataDialog} onOpenChange={setShowDuplicataDialog}>
        <DialogContent className="max-w-xl p-0 bg-white dark:bg-slate-950 border-0 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="bg-amber-600 p-10 flex items-center justify-between">
            <div className="space-y-1 text-left">
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Alerta de Duplicidade</h3>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Protocolo de Segurança Ativo</p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center border border-white/20">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="p-10 space-y-8">
            <div className="p-6 bg-amber-500/5 rounded-3xl border border-amber-500/10 space-y-4">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed text-center">
                Identificamos uma reserva <span className="text-amber-600 font-black">IDÊNTICA</span> para este cliente e produto no sistema.
                Deseja prosseguir com o registro de um lote secundário?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() => setShowDuplicataDialog(false)}
                className="h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2"
              >
                Abortar Operação
              </Button>
              <Button
                className="h-16 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-amber-600/20"
                onClick={() => {
                  setPermitirDuplicata(true);
                  setShowDuplicataDialog(false);
                  setTimeout(() => handleSubmit(), 100);
                }}
              >
                Ignorar e Registar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}