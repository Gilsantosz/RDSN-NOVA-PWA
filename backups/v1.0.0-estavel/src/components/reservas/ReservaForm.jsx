import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { useSetor } from '../context/SetorContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Save, Calculator, Zap, Hand, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import AlternativasAlocacao from './AlternativasAlocacao';

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function ReservaForm({
  produtos,
  sequencias,
  onSubmit,
  isLoading,
  defaultLetra = '',
  defaultAno = null,
  defaultQuantidade = '',
  prefilled = false
}) {
  const { setorAtivo, isAdmin } = useSetor();

  // Clientes agora são derivados dos Produtos (campo nome_cliente)
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-from-produtos', setorAtivo],
    queryFn: async () => {
      const todosProdutos = await base44.entities.Produto.list();
      const filtrados = (isAdmin && setorAtivo === 'TODOS') ? todosProdutos : todosProdutos.filter(p => p.setor_id === setorAtivo);
      return filtrados
        .filter(p => p.nome_cliente && p.ativo)
        .map(p => ({
          id: p.id,
          nome: p.nome_cliente,
          letra_produto: p.letra_produto,
          modelo: p.modelo || '',
          codigo_produto: p.codigo_produto || '',
          setor_id: p.setor_id,
          ativo: p.ativo
        }));
    },
    enabled: !!setorAtivo
  });

  const { data: reservasAnteriores = [] } = useQuery({
    queryKey: ['reservas-historico', setorAtivo],
    queryFn: async () => {
      const todos = await base44.entities.ReservaLote.list('-created_at', 500);
      if (isAdmin && setorAtivo === 'TODOS') return todos;
      return todos.filter(r => r.setor_id === setorAtivo);
    },
    enabled: !!setorAtivo
  });

  const hoje2 = new Date();
  const { data: opsPCP = [] } = useQuery({
    queryKey: ['pcp-ops-reserva', hoje2.getMonth() + 1, hoje2.getFullYear() % 100],
    queryFn: () => base44.entities.PCPOrdemProducao.filter({
      mes: hoje2.getMonth() + 1,
      ano: hoje2.getFullYear() % 100,
      status: 'Ativo'
    }, 'item_num', 200)
  });

  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: () => base44.entities.Setor.list()
  });

  const hoje = new Date();
  const mesAtual = meses[hoje.getMonth()];
  const dataPrevisaoPadrao = hoje.toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    letra_produto: defaultLetra || '',
    ano: defaultAno !== null ? defaultAno : new Date().getFullYear() % 100,
    sufixo: '',
    cliente: '',
    modelo: '',
    codigo_produto: '',
    setor_id: setorAtivo,
    mes_producao: mesAtual,
    data_prevista: dataPrevisaoPadrao,
    quantidade: defaultQuantidade || ''
  });

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [alocacaoAutomatica, setAlocacaoAutomatica] = useState(false);
  const [criterioAlocacao, setCriterioAlocacao] = useState('sequencial');
  const [loadingAlocacao, setLoadingAlocacao] = useState(false);
  const [intervaloSelecionado, setIntervaloSelecionado] = useState(null);
  const [bloqueioAtivo, setBloqueioAtivo] = useState(false);
  const [showDuplicataDialog, setShowDuplicataDialog] = useState(false);
  const [permitirDuplicata, setPermitirDuplicata] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    // Limpar preview quando quantidade mudar para forçar recálculo
    if (field === 'quantidade') {
      setPreview(null);
      setIntervaloSelecionado(null);
    }
  };

  const handleSelecionarAlternativa = (alternativa) => {
    setIntervaloSelecionado(alternativa);
    setPreview({
      codigo_completo: preview.codigo_completo,
      numero_inicial: alternativa.numero_inicial,
      numero_final: alternativa.numero_final,
      quantidade: formData.quantidade,
      alocacao_automatica: true,
      origem: alternativa.origem,
      motivo: alternativa.motivo,
      score: alternativa.score
    });
  };

  const handleBloquearIntervalo = async () => {
    if (!preview || !formData.setor_id) return;

    try {
      const response = await base44.functions.invoke('bloquearIntervalo', {
        letra_produto: formData.letra_produto,
        ano: Number(formData.ano),
        setor_id: formData.setor_id,
        numero_inicial: preview.numero_inicial,
        numero_final: preview.numero_final,
        motivo: 'Bloqueio durante processo de reserva'
      });

      if (response.data.success) {
        setBloqueioAtivo(true);
      }
    } catch (err) {
      setError('Erro ao bloquear intervalo: ' + err.message);
    }
  };

  const handleCodigoProdutoChange = (value) => {
    const codigoLimpo = value.trim();
    setFormData(prev => ({ ...prev, codigo_produto: codigoLimpo }));
    setError('');

    if (!codigoLimpo) {
      // Limpar cliente se código foi apagado
      setFormData(prev => ({ ...prev, cliente: '', modelo: '' }));
      return;
    }

    // Buscar APENAS o primeiro cliente encontrado com este código (evita duplicatas)
    const clienteEncontrado = clientes.find(c =>
      c.ativo &&
      c.codigo_produto &&
      c.codigo_produto.toLowerCase().trim() === codigoLimpo.toLowerCase() &&
      c.setor_id === setorAtivo
    );

    // Buscar quantidade total programada no PCP para este código de produto
    const getPCPQuantidade = (codigo) => {
      if (!codigo || !opsPCP.length) return null;
      const codLower = codigo.toLowerCase().trim();
      // Buscar OP pelo código exato (codigo_op) ou por correspondência na descrição
      const opsRelacionadas = opsPCP.filter(op =>
        op.codigo_op?.toLowerCase().trim() === codLower ||
        op.codigo_op?.toLowerCase().includes(codLower) ||
        op.descricao?.toLowerCase().includes(codLower)
      );
      if (!opsRelacionadas.length) return null;
      // Retornar a quantidade_total da OP com maior quantidade (prioridade) ou somar todas
      const qtd = opsRelacionadas.reduce((sum, op) => sum + (op.quantidade_total || 0), 0);
      return qtd > 0 ? qtd : null;
    };

    // Calcular quantidade já reservada para este código no mês/ano atual (reservas ativas)
    const calcularQuantidadeJaReservada = (codigo) => {
      const mesAtualNome = formData.mes_producao || mesAtual;
      const anoAtual = formData.ano || (new Date().getFullYear() % 100);
      return reservasAnteriores
        .filter(r =>
          r.codigo_produto?.toLowerCase().trim() === codigo.toLowerCase() &&
          r.ano === Number(anoAtual) &&
          r.mes_producao === mesAtualNome &&
          r.setor_id === setorAtivo &&
          !['CANCELADO'].includes(r.status)
        )
        .reduce((sum, r) => sum + (r.quantidade || 0), 0);
    };

    if (clienteEncontrado) {
      const qtdPCP = getPCPQuantidade(codigoLimpo);
      const qtdJaReservada = calcularQuantidadeJaReservada(codigoLimpo);
      const qtdFaltante = qtdPCP ? Math.max(0, qtdPCP - qtdJaReservada) : null;
      setFormData(prev => ({
        ...prev,
        codigo_produto: codigoLimpo,
        letra_produto: clienteEncontrado.letra_produto,
        cliente: clienteEncontrado.nome,
        modelo: clienteEncontrado.modelo || '',
        setor_id: clienteEncontrado.setor_id,
        ...(qtdFaltante !== null && qtdFaltante > 0 ? { quantidade: String(qtdFaltante) } :
          qtdPCP && qtdJaReservada === 0 ? { quantidade: String(qtdPCP) } : {})
      }));
      if (qtdJaReservada > 0 && qtdPCP) {
        if (qtdFaltante === 0) {
          setError(`Quantidade total (${qtdPCP.toLocaleString()}) já está completamente reservada para este código neste mês.`);
        }
      }
      return;
    }

    // Se não encontrar em clientes, buscar em produtos
    const produtoEncontrado = produtos.find(p =>
      p.codigo_produto && p.codigo_produto.toLowerCase().trim() === value.toLowerCase().trim()
    );

    if (produtoEncontrado) {
      const qtdPCP = getPCPQuantidade(codigoLimpo);
      const qtdJaReservada = calcularQuantidadeJaReservada(codigoLimpo);
      const qtdFaltante = qtdPCP ? Math.max(0, qtdPCP - qtdJaReservada) : null;
      setFormData(prev => ({
        ...prev,
        codigo_produto: value,
        letra_produto: produtoEncontrado.letra_produto || prev.letra_produto,
        modelo: produtoEncontrado.modelo || prev.modelo,
        setor_id: produtoEncontrado.setor_id || prev.setor_id,
        ...(qtdFaltante !== null && qtdFaltante > 0 ? { quantidade: String(qtdFaltante) } :
          qtdPCP && qtdJaReservada === 0 ? { quantidade: String(qtdPCP) } : {})
      }));
      return;
    }

    // Por último, buscar em reservas anteriores
    const reservaAnterior = reservasAnteriores.find(r =>
      r.codigo_produto && r.codigo_produto.toLowerCase().trim() === value.toLowerCase().trim()
    );

    if (reservaAnterior) {
      const qtdPCP = getPCPQuantidade(codigoLimpo);
      const qtdJaReservada = calcularQuantidadeJaReservada(codigoLimpo);
      const qtdFaltante = qtdPCP ? Math.max(0, qtdPCP - qtdJaReservada) : null;
      setFormData(prev => ({
        ...prev,
        codigo_produto: value,
        letra_produto: reservaAnterior.letra_produto || prev.letra_produto,
        cliente: reservaAnterior.cliente || prev.cliente,
        modelo: reservaAnterior.modelo || prev.modelo,
        setor_id: reservaAnterior.setor_id || prev.setor_id,
        ...(qtdFaltante !== null && qtdFaltante > 0 ? { quantidade: String(qtdFaltante) } :
          qtdPCP && qtdJaReservada === 0 ? { quantidade: String(qtdPCP) } : {})
      }));
    }
  };

  const handleLetraChange = (letra) => {
    const anoSugerido = Math.max(
      ...sequencias
        .filter(s => s.letra_produto === letra && s.setor_id === setorAtivo)
        .map(s => s.ano),
      new Date().getFullYear() % 100
    );

    handleChange('letra_produto', letra);
    handleChange('ano', String(anoSugerido));
  };

  const calcularAlocacaoAutomatica = async () => {
    if (!formData.letra_produto || !formData.ano || !formData.quantidade || !formData.setor_id) {
      return;
    }

    setLoadingAlocacao(true);
    setError('');

    try {
      // Sempre usar alocação manual para considerar numerações livres, mas priorizar sequencial se não houver switch ativo
      const criterio = alocacaoAutomatica ? criterioAlocacao : 'inteligente';

      const response = await base44.functions.invoke('alocarNumerosAutomatico', {
        letra_produto: formData.letra_produto,
        ano: Number(formData.ano),
        quantidade: Number(formData.quantidade),
        setor_id: formData.setor_id,
        criterio: criterio
      });

      if (response.data.success) {
        const produto = produtos.find(p => p.letra_produto === formData.letra_produto);
        const sufixo = produto?.sufixo || formData.sufixo || 'XX';

        // Ordenar alternativas por score (maior primeiro)
        const alternativasOrdenadas = (response.data.alternativas || []).sort((a, b) => (b.score || 0) - (a.score || 0));

        // Priorizar numeração livre com score mais alto
        const melhorAlternativa = alternativasOrdenadas.find(alt => alt.origem === 'numeracao_livre') || response.data.intervalo;

        setIntervaloSelecionado({
          numero_inicial: melhorAlternativa.numero_inicial,
          numero_final: melhorAlternativa.numero_final,
          origem: melhorAlternativa.origem,
          motivo: melhorAlternativa.motivo,
          score: melhorAlternativa.score
        });

        setPreview({
          codigo_completo: `${formData.letra_produto}${formData.ano}${sufixo}`,
          numero_inicial: melhorAlternativa.numero_inicial,
          numero_final: melhorAlternativa.numero_final,
          quantidade: Number(formData.quantidade),
          alocacao_automatica: alocacaoAutomatica || melhorAlternativa.origem === 'numeracao_livre',
          origem: melhorAlternativa.origem,
          alternativas: alternativasOrdenadas,
          motivo: melhorAlternativa.motivo,
          score: melhorAlternativa.score
        });
      } else {
        setError(response.data.error || 'Erro ao alocar números');
        setPreview(null);
      }
    } catch (err) {
      setError(err.message || 'Erro ao calcular alocação automática');
      setPreview(null);
    } finally {
      setLoadingAlocacao(false);
    }
  };

  useEffect(() => {
    // Se é um formulário pré-preenchido (numeração livre), não recalcular
    if (prefilled) {
      if (formData.letra_produto && formData.ano && formData.quantidade) {
        const produto = produtos.find(p => p.letra_produto === formData.letra_produto);
        const sufixo = produto?.sufixo || 'LM';

        // Usar os números da numeração livre pré-definida
        const numeroInicial = defaultQuantidade ?
          (sequencias.find(s => s.letra_produto === formData.letra_produto && s.ano === Number(formData.ano))?.ultimo_numero || 0) + 1 - Number(defaultQuantidade)
          : 1;

        setPreview({
          codigo_completo: `${formData.letra_produto}${formData.ano}${sufixo}`,
          numero_inicial: numeroInicial,
          numero_final: numeroInicial + Number(formData.quantidade) - 1,
          quantidade: Number(formData.quantidade),
          alocacao_automatica: false
        });
      }
      return;
    }

    if (formData.letra_produto && formData.ano && formData.quantidade && formData.setor_id) {
      const seq = sequencias.find(
        s => s.letra_produto === formData.letra_produto &&
          s.ano === Number(formData.ano) &&
          s.setor_id === formData.setor_id
      );

      if (seq && seq.encerrado) {
        setError('Este ano está encerrado. Não é possível criar novas reservas.');
        setPreview(null);
        return;
      }

      // SEMPRE usar alocação automática para considerar numerações livres
      calcularAlocacaoAutomatica();
    } else {
      setPreview(null);
    }
  }, [formData.letra_produto, formData.ano, formData.quantidade, formData.setor_id, sequencias, produtos, criterioAlocacao, prefilled]);

  const verificarDuplicata = (dados) => {
    // Extrair número do mês (1-12) do nome do mês
    const mesNum = meses.indexOf(dados.mes_producao) + 1;

    // Buscar reservas no mesmo mês, mesmo código, mesma quantidade
    const duplicata = reservasAnteriores.find(r =>
      r.codigo_produto?.toLowerCase() === dados.codigo_produto?.toLowerCase() &&
      r.ano === Number(dados.ano) &&
      r.mes_producao === dados.mes_producao &&
      r.quantidade === Number(dados.quantidade) &&
      r.setor_id === dados.setor_id
    );

    return duplicata ? true : false;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!preview) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    const dadosReserva = {
      ...formData,
      ano: Number(formData.ano),
      quantidade: Number(formData.quantidade),
      codigo_completo: preview.codigo_completo,
      numero_inicial: preview.numero_inicial,
      numero_final: preview.numero_final
    };

    // Verificar duplicata
    if (verificarDuplicata(dadosReserva) && !permitirDuplicata) {
      setShowDuplicataDialog(true);
      return;
    }

    // Se permitir duplicata, reset flag e enviar
    setPermitirDuplicata(false);
    onSubmit(dadosReserva);
  };

  const produtosFiltrados = produtos.filter(p => p.setor_id === setorAtivo);
  const letrasDisponiveis = [...new Set(produtosFiltrados.map(p => p.letra_produto))];

  // Filtrar clientes únicos por código_produto - apenas 1 nome por código
  const clientesFiltrados = useMemo(() => {
    const clientesPorCodigo = new Map();

    clientes
      .filter(c => c.ativo && c.letra_produto === formData.letra_produto && c.setor_id === setorAtivo)
      .forEach(cliente => {
        const codigo = cliente.codigo_produto?.trim();
        if (codigo && !clientesPorCodigo.has(codigo)) {
          clientesPorCodigo.set(codigo, cliente);
        }
      });

    return Array.from(clientesPorCodigo.values());
  }, [clientes, formData.letra_produto, setorAtivo]);

  const handleClienteChange = (clienteNome) => {
    const cliente = clientes.find(c => c.nome === clienteNome);
    if (cliente) {
      setFormData(prev => ({
        ...prev,
        cliente: clienteNome,
        modelo: prev.modelo || cliente.modelo || '',
        codigo_produto: prev.codigo_produto || cliente.codigo_produto || '',
        setor_id: cliente.setor_id || prev.setor_id
      }));
    } else {
      setFormData(prev => ({ ...prev, cliente: clienteNome }));
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-sm transition-colors">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
        <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Nova Reserva de Lote
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors">
            <Label className="text-base font-semibold text-slate-800 dark:text-slate-100">Setor Produtivo *</Label>
            <div className="px-3 py-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: setores.find(s => s.id === setorAtivo)?.cor || '#3b82f6' }}
              />
              <span className="font-medium text-slate-900 dark:text-slate-100">{setores.find(s => s.id === setorAtivo)?.nome}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Setor selecionado - Cada setor possui numeração independente</p>
          </div>

          <div className="space-y-2">
            <Label>Código do Produto</Label>
            <Input
              value={formData.codigo_produto}
              onChange={(e) => handleCodigoProdutoChange(e.target.value)}
              placeholder="Digite o código técnico"
              list="codigos-produtos-list"
              className="font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              disabled={!formData.setor_id}
            />
            <datalist id="codigos-produtos-list">
              {formData.setor_id && [...new Set([
                ...produtos.filter(p => p.setor_id === formData.setor_id).map(p => p.codigo_produto).filter(Boolean),
                ...reservasAnteriores.filter(r => r.setor_id === formData.setor_id).map(r => r.codigo_produto).filter(Boolean)
              ])].map(codigo => (
                <option key={codigo} value={codigo} />
              ))}
            </datalist>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formData.setor_id ? 'Digite ou selecione - preenchimento automático de dados' : 'Selecione primeiro o setor'}
            </p>
          </div>

          {/* Modo de Alocação */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {alocacaoAutomatica ? (
                  <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                ) : (
                  <Hand className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                )}
                <div>
                  <Label className="text-base font-semibold text-slate-800 dark:text-slate-100">
                    {alocacaoAutomatica ? 'Alocação Automática' : 'Alocação Manual'}
                  </Label>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {alocacaoAutomatica
                      ? 'Sistema encontrará o melhor intervalo disponível'
                      : 'Números sequenciais após último número usado'
                    }
                  </p>
                </div>
              </div>
              <Switch
                checked={alocacaoAutomatica}
                onCheckedChange={setAlocacaoAutomatica}
              />
            </div>

            {alocacaoAutomatica && (
              <div className="space-y-2 pt-3 border-t border-purple-200 dark:border-purple-800">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Critério de Alocação</Label>
                <Select value={criterioAlocacao} onValueChange={setCriterioAlocacao}>
                  <SelectTrigger className="bg-white dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                    <SelectItem value="sequencial">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50">Padrão</Badge>
                        Sequencial - Continuação normal
                      </div>
                    </SelectItem>
                    <SelectItem value="menor_intervalo">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-50">Otimizado</Badge>
                        Menor Intervalo - Preenche lacunas pequenas
                      </div>
                    </SelectItem>
                    <SelectItem value="maior_contiguo">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-purple-50">Espaçoso</Badge>
                        Maior Contíguo - Usa maior espaço disponível
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Letra do Produto *</Label>
              <Select
                value={formData.letra_produto}
                onValueChange={handleLetraChange}
              >
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                  {letrasDisponiveis.map(letra => (
                    <SelectItem key={letra} value={letra}>{letra}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ano sugerido automaticamente</p>
            </div>

            <div className="space-y-2">
              <Label>Ano *</Label>
              <Input
                type="number"
                min="24"
                max="99"
                value={formData.ano}
                onChange={(e) => handleChange('ano', e.target.value)}
                placeholder="26"
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold text-slate-700 dark:text-slate-300">Quantidade *</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  value={formData.quantidade}
                  onChange={(e) => handleChange('quantidade', e.target.value)}
                  placeholder="1000"
                  className="text-2xl font-bold text-center bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-200 dark:border-blue-800 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all h-14 placeholder:text-blue-300 dark:placeholder:text-blue-700 dark:text-slate-100"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 dark:text-blue-600 pointer-events-none">
                  <Calculator className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente * <Badge variant="outline" className="ml-2 text-xs">Auto-preenchido</Badge></Label>
              <Input
                value={formData.cliente}
                onChange={(e) => handleChange('cliente', e.target.value)}
                placeholder="Digite o código do produto acima"
                className={cn(
                  "transition-colors",
                  formData.codigo_produto && formData.cliente
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-400 dark:border-green-800 font-semibold dark:text-slate-100'
                    : 'bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100'
                )}
                readOnly={!!formData.codigo_produto && !!formData.cliente}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formData.codigo_produto && formData.cliente
                  ? '✓ Cliente único vinculado ao código ' + formData.codigo_produto
                  : 'Será preenchido automaticamente ao digitar o código'
                }
              </p>
            </div>

            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input
                value={formData.modelo}
                onChange={(e) => handleChange('modelo', e.target.value)}
                placeholder="Modelo do hidrômetro"
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês de Produção *</Label>
              <Select
                value={formData.mes_producao}
                onValueChange={(v) => handleChange('mes_producao', v)}
              >
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                  {meses.map(mes => (
                    <SelectItem key={mes} value={mes}>{mes}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 dark:text-slate-400">Mês atual selecionado automaticamente</p>
            </div>

            <div className="space-y-2">
              <Label>Data Prevista *</Label>
              <Input
                type="date"
                value={formData.data_prevista}
                onChange={(e) => handleChange('data_prevista', e.target.value)}
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">Data de hoje selecionada automaticamente</p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loadingAlocacao && (
            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800 text-center transition-colors">
              <div className="flex items-center justify-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                <span className="text-blue-700 dark:text-blue-300 font-medium">Calculando melhor intervalo disponível...</span>
              </div>
            </div>
          )}

          {preview && !loadingAlocacao && (
            <div className="space-y-4">
              <div className={cn(
                "rounded-lg p-5 border-2 transition-colors",
                preview.alocacao_automatica
                  ? 'bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/20 dark:via-green-950/20 dark:to-teal-950/20 border-emerald-400 dark:border-emerald-800'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              )}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {preview.alocacao_automatica ? (
                      <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Calculator className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    )}
                    <span className="font-semibold text-lg text-slate-800 dark:text-slate-100">
                      {preview.alternativas && preview.alternativas.length > 1 ? 'Opção Selecionada' : 'Prévia da Reserva'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {preview.origem === 'numeracao_livre' && (
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                        ♻️ Reutilização
                      </Badge>
                    )}
                    {preview.score && (
                      <Badge className={cn(
                        "font-bold text-base px-3 py-1",
                        preview.score >= 80 ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white" :
                          preview.score >= 60 ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white" :
                            "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                      )}>
                        Score: {preview.score}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Código:</span>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{preview.codigo_completo}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Nº Inicial:</span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{preview.numero_inicial.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Nº Final:</span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{preview.numero_final.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Quantidade:</span>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{preview.quantidade.toLocaleString()}</p>
                  </div>
                </div>
                {preview.alocacao_automatica && preview.origem && (
                  <div className="space-y-2 pt-3 border-t border-purple-200 dark:border-purple-800">
                    <p className="text-xs text-purple-700 dark:text-purple-400">
                      <strong>Origem:</strong> {
                        preview.origem === 'numeracao_livre' ? '📦 Numeração Livre Reutilizada' :
                          preview.origem === 'sequencia_nova' ? '🔢 Continuação Sequencial' :
                            preview.origem === 'gap_entre_reservas' ? '🔍 Lacuna Entre Reservas' :
                              preview.origem
                      }
                    </p>
                    {preview.motivo && (
                      <p className="text-xs text-purple-600 italic">{preview.motivo}</p>
                    )}
                    {!bloqueioAtivo && preview.alocacao_automatica && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleBloquearIntervalo}
                        className="mt-2 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/10"
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Bloquear Intervalo (24h)
                      </Button>
                    )}
                    {bloqueioAtivo && (
                      <div className="flex items-center gap-2 mt-2 px-2 py-1 bg-green-50 dark:bg-green-900/10 rounded text-xs text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800">
                        <Lock className="w-4 h-4" />
                        Intervalo bloqueado por 24 horas
                      </div>
                    )}
                  </div>
                )}
              </div>

              {preview.alocacao_automatica && preview.alternativas && preview.alternativas.length > 0 && (
                <AlternativasAlocacao
                  alternativas={preview.alternativas}
                  intervaloSelecionado={intervaloSelecionado}
                  onSelectAlternativa={handleSelecionarAlternativa}
                  formData={formData}
                />
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isLoading || !preview}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <Save className="w-4 h-4 mr-2" />
              Criar Reserva
            </Button>
          </div>
        </form>
      </CardContent>

      {/* Dialog de confirmação de duplicata */}
      <Dialog open={showDuplicataDialog} onOpenChange={setShowDuplicataDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-5 h-5" />
              Duplicação de Reserva Detectada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              <strong>Esse cliente com esse código e a mesma quantidade de reserva já foi cadastrada esse mês.</strong>
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
              <p><strong>Código:</strong> {formData.codigo_produto}</p>
              <p><strong>Mês:</strong> {formData.mes_producao}</p>
              <p><strong>Quantidade:</strong> {formData.quantidade}</p>
              <p><strong>Setor:</strong> {setores.find(s => s.id === setorAtivo)?.nome}</p>
            </div>
            <p className="text-sm text-slate-700">
              <strong>Deseja fazer nova reserva mesmo assim?</strong>
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDuplicataDialog(false);
                setPermitirDuplicata(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => {
                setShowDuplicataDialog(false);
                setPermitirDuplicata(true);
                // Reenviar o formulário com duplicata permitida
                const dadosReserva = {
                  ...formData,
                  ano: Number(formData.ano),
                  quantidade: Number(formData.quantidade),
                  codigo_completo: preview.codigo_completo,
                  numero_inicial: preview.numero_inicial,
                  numero_final: preview.numero_final
                };
                onSubmit(dadosReserva);
              }}
            >
              Confirmar Nova Reserva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}