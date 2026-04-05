import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import SessionManager from '@/lib/sessionManager';
import { useSetor } from '@/components/context/SetorContext';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  TrendingDown, AlertTriangle, Zap, CheckCircle2, RefreshCw,
  Plus, TrendingUp, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const hoje = new Date();

// ─── Regras automáticas de detecção ──────────────────────────────────────────
function detectarAlertasPCP(ops, producoes, baixasPorDia) {
  const alertas = [];

  for (const op of ops) {
    const prods = producoes.filter(p => p.op_id === op.id);
    const prev = op.quantidade_total > 0
      ? op.quantidade_total
      : prods.reduce((s, p) => s + (p.previsto || 0), 0);
    const real = prods.reduce((s, p) => s + (p.realizado || 0), 0);
    const perc = prev > 0 ? (real / prev) * 100 : 0;

    // OP em atraso: realizado < previsto e há produção prevista
    if (prev > 0 && real < prev) {
      const deficit = prev - real;
      alertas.push({
        id: `op-atraso-${op.id}`,
        tipo: 'OP_ATRASO',
        severidade: perc < 30 ? 'CRITICA' : perc < 60 ? 'ALTA' : 'MEDIA',
        op_codigo: op.codigo_op,
        cliente: op.cliente_nome || '-',
        titulo: `OP em atraso: ${op.codigo_op}`,
        descricao: `Realizado ${real.toLocaleString()} de ${prev.toLocaleString()} (${perc.toFixed(1)}%). Déficit de ${deficit.toLocaleString()} unidades.`,
        perc,
      });
    }

    // Baixo % de atendimento (< 70%)
    if (prev > 0 && perc < 70 && perc > 0) {
      alertas.push({
        id: `op-atend-${op.id}`,
        tipo: 'BAIXO_ATENDIMENTO',
        severidade: perc < 40 ? 'ALTA' : 'MEDIA',
        op_codigo: op.codigo_op,
        cliente: op.cliente_nome || '-',
        titulo: `Atendimento baixo: ${op.codigo_op}`,
        descricao: `Taxa de atendimento em ${perc.toFixed(1)}% (meta: 70%). Cliente: ${op.cliente_nome || '-'}.`,
        perc,
      });
    }
  }

  // Picos e quedas anormais na produção diária
  const vals = Object.values(baixasPorDia).filter(v => v > 0);
  if (vals.length >= 3) {
    const media = vals.reduce((s, v) => s + v, 0) / vals.length;
    const desvio = Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - media, 2), 0) / vals.length);
    const limSup = media + 2 * desvio;
    const limInf = Math.max(0, media - 2 * desvio);

    for (const [dia, qtd] of Object.entries(baixasPorDia)) {
      if (qtd > limSup && media > 0) {
        alertas.push({
          id: `pico-${dia}`,
          tipo: 'PICO_PRODUCAO',
          severidade: 'BAIXA',
          op_codigo: null,
          cliente: null,
          titulo: `Pico de produção — Dia ${dia}`,
          descricao: `${qtd.toLocaleString()} unidades produzidas (média: ${Math.round(media).toLocaleString()}, +${Math.round(((qtd - media) / media) * 100)}%). Verifique se é correto.`,
          perc: null,
        });
      }
      if (qtd < limInf && media > 100) {
        alertas.push({
          id: `queda-${dia}`,
          tipo: 'QUEDA_PRODUCAO',
          severidade: 'MEDIA',
          op_codigo: null,
          cliente: null,
          titulo: `Queda anormal — Dia ${dia}`,
          descricao: `Apenas ${qtd.toLocaleString()} unidades (média: ${Math.round(media).toLocaleString()}, -${Math.round(((media - qtd) / media) * 100)}%). Possível parada ou falha.`,
          perc: null,
        });
      }
    }
  }

  return alertas;
}

const TIPO_CONFIG = {
  OP_ATRASO: { label: 'OP em Atraso', icon: TrendingDown, color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-900/30' },
  BAIXO_ATENDIMENTO: { label: 'Baixo Atendimento', icon: AlertTriangle, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-300 dark:border-orange-900/30' },
  PICO_PRODUCAO: { label: 'Pico de Produção', icon: TrendingUp, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300 dark:border-blue-900/30' },
  QUEDA_PRODUCAO: { label: 'Queda Produção', icon: TrendingDown, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 border-amber-300 dark:border-amber-900/30' },
  OPERACIONAL: { label: 'Alerta Operacional', icon: Zap, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 border-purple-300 dark:border-purple-900/30' },
};

const SEV_CONFIG = {
  CRITICA: 'bg-red-600 text-white',
  ALTA: 'bg-orange-500 text-white',
  MEDIA: 'bg-yellow-500 text-white',
  BAIXA: 'bg-slate-400 text-white',
};

// ─── Formulário de alerta operacional manual ─────────────────────────────────
function NovoAlertaDialog({ ops, clientes, onClose, onSalvar }) {
  const [form, setForm] = useState({
    titulo: '', descricao: '', severidade: 'MEDIA', op_codigo: '', cliente: ''
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.titulo) return;
    onSalvar({ ...form, tipo: 'OPERACIONAL', id: `manual-${Date.now()}` });
    onClose();
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Novo Alerta Operacional
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Título *</Label>
            <Input value={form.titulo} onChange={e => set('titulo', e.target.value)} required className="h-8 text-sm mt-1" placeholder="Ex: Priorizar OP V8II..." />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <textarea
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              className="w-full mt-1 rounded-md border border-input px-3 py-2 text-sm min-h-[70px] focus:outline-none focus:ring-1 focus:ring-ring bg-background"
              placeholder="Detalhes do alerta..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Severidade</Label>
              <Select value={form.severidade} onValueChange={v => set('severidade', v)}>
                <SelectTrigger className="h-8 text-sm mt-1 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAIXA">Baixa</SelectItem>
                  <SelectItem value="MEDIA">Média</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="CRITICA">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">OP (opcional)</Label>
              <Select value={form.op_codigo} onValueChange={v => set('op_codigo', v)}>
                <SelectTrigger className="h-8 text-sm mt-1 bg-background"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhuma</SelectItem>
                  {ops.map(op => <SelectItem key={op.id} value={op.codigo_op}>{op.codigo_op}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Cliente (opcional)</Label>
            <Select value={form.cliente} onValueChange={v => set('cliente', v)}>
              <SelectTrigger className="h-8 text-sm mt-1 bg-background"><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Nenhum</SelectItem>
                {clientes.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" size="sm" className="bg-purple-700 hover:bg-purple-800">Criar Alerta</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PCPAlertasPanel() {
  const { setorAtivo, nomeSetor, isAdmin } = useSetor();
  const userLocal = SessionManager.getUser();
  const isAdminUser = isAdmin || userLocal?.role_custom === 'Admin';

  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear() % 100);
  const [alertasManuais, setAlertasManuais] = useState([]);
  const [resolvidos, setResolvidos] = useState(new Set());
  const [showNovoAlerta, setShowNovoAlerta] = useState(false);
  const [executando, setExecutando] = useState(false);
  const [filtro, setFiltro] = useState('todos');
  const queryClient = useQueryClient();

  const { data: ops = [] } = useQuery({
    queryKey: ['pcp-ops-alertas', mes, ano, setorAtivo],
    queryFn: () => {
      const f = { mes, ano, status: 'Ativo' };
      if (setorAtivo && setorAtivo !== 'ALL') f.setor_id = setorAtivo;
      return rdsn.entities.PCPOrdemProducao.filter(f, null, 200);
    }
  });

  const { data: producoes = [] } = useQuery({
    queryKey: ['pcp-producoes-alertas', mes, ano, setorAtivo],
    queryFn: () => {
      const f = { mes, ano };
      if (setorAtivo && setorAtivo !== 'ALL') f.setor_id = setorAtivo;
      return rdsn.entities.PCPProducaoDiaria.filter(f, null, 5000);
    },
    enabled: ops.length > 0
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['pcp-clientes-alertas', setorAtivo],
    queryFn: () => {
      if (!setorAtivo || setorAtivo === 'ALL') {
        return rdsn.entities.PCPCliente.list('nome', 300);
      }
      return rdsn.entities.PCPCliente.filter({ setor_id: setorAtivo }, 'nome', 300);
    },
    enabled: !!setorAtivo
  });

  const { data: baixas = [] } = useQuery({
    queryKey: ['baixas-alertas', mes, ano],
    queryFn: async () => {
      const anoCompleto = 2000 + ano;
      const inicio = new Date(anoCompleto, mes - 1, 1).toISOString();
      const fim = new Date(anoCompleto, mes, 0, 23, 59, 59).toISOString();
      const all = await rdsn.entities.BaixaLote.list('-created_at', 2000);
      return all.filter(b => b.created_at >= inicio && b.created_at <= fim);
    }
  });

  const baixasPorDia = useMemo(() => {
    const m = {};
    for (const b of baixas) {
      const d = new Date(b.created_at).getDate();
      m[d] = (m[d] || 0) + (b.quantidade || 0);
    }
    return m;
  }, [baixas]);

  const alertasAutoDetectados = useMemo(() =>
    detectarAlertasPCP(ops, producoes, baixasPorDia),
    [ops, producoes, baixasPorDia]
  );

  const todosAlertas = useMemo(() => {
    return [...alertasAutoDetectados, ...alertasManuais].filter(a => !resolvidos.has(a.id));
  }, [alertasAutoDetectados, alertasManuais, resolvidos]);

  const alertasFiltrados = useMemo(() => {
    if (filtro === 'criticos') return todosAlertas.filter(a => a.severidade === 'CRITICA' || a.severidade === 'ALTA');
    if (filtro === 'atraso') return todosAlertas.filter(a => a.tipo === 'OP_ATRASO');
    if (filtro === 'operacional') return todosAlertas.filter(a => a.tipo === 'OPERACIONAL');
    if (filtro === 'producao') return todosAlertas.filter(a => a.tipo === 'PICO_PRODUCAO' || a.tipo === 'QUEDA_PRODUCAO');
    return todosAlertas;
  }, [todosAlertas, filtro]);

  const stats = useMemo(() => ({
    total: todosAlertas.length,
    criticos: todosAlertas.filter(a => a.severidade === 'CRITICA').length,
    altos: todosAlertas.filter(a => a.severidade === 'ALTA').length,
    opsEmAtraso: todosAlertas.filter(a => a.tipo === 'OP_ATRASO').length,
  }), [todosAlertas]);

  // Executar sincronização + re-análise
  const handleAnalisar = async () => {
    setExecutando(true);
    try {
      await rdsn.functions.invoke('sincronizarBaixasComPCP', { mes, ano });
      await queryClient.invalidateQueries({ queryKey: ['pcp-producoes-alertas', mes, ano] });
      await queryClient.invalidateQueries({ queryKey: ['baixas-alertas', mes, ano] });
      toast.success('Análise concluída! Alertas atualizados.');
    } catch (e) {
      toast.error('Erro ao analisar: ' + e.message);
    } finally {
      setExecutando(false);
    }
  };

  const handleResolver = (id) => {
    setResolvidos(prev => new Set([...prev, id]));
    toast.success('Alerta marcado como resolvido.');
  };

  const handleSalvarAlerta = (alerta) => {
    setAlertasManuais(prev => [alerta, ...prev]);
    toast.success('Alerta operacional criado!');
  };

  // Salvar alertas críticos/altos no banco para notificação no sistema
  const handleSalvarNoBanco = async () => {
    const criticos = todosAlertas.filter(a => a.severidade === 'CRITICA' || a.severidade === 'ALTA');
    if (criticos.length === 0) { toast.info('Nenhum alerta crítico/alto para salvar.'); return; }
    try {
      await Promise.all(criticos.map(a =>
        rdsn.entities.Alerta.create({
          tipo: 'PROGRESSO_BAIXO',
          severidade: a.severidade,
          titulo: a.titulo,
          descricao: a.descricao,
          entidade_tipo: 'PCPOrdemProducao',
        })
      ));
      toast.success(`${criticos.length} alertas salvos no sistema!`);
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
    } catch (e) {
      toast.error('Erro ao salvar alertas: ' + e.message);
    }
  };

  const navMes = (dir) => {
    let nm = mes + dir, na = ano;
    if (nm > 12) { nm = 1; na++; }
    if (nm < 1) { nm = 12; na--; }
    setMes(nm); setAno(na);
  };

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-background border rounded-lg px-2 py-1 shadow-sm">
            <button onClick={() => navMes(-1)} className="p-1 hover:bg-muted rounded">‹</button>
            <span className="font-semibold text-foreground min-w-[120px] text-center text-sm">
              {MESES[mes - 1]} 20{ano}
            </span>
            <button onClick={() => navMes(1)} className="p-1 hover:bg-muted rounded">›</button>
          </div>
          <Button variant="outline" size="sm" onClick={handleAnalisar} disabled={executando} className="gap-1">
            <RefreshCw className={`w-4 h-4 ${executando ? 'animate-spin' : ''}`} />
            {executando ? 'Analisando...' : 'Analisar Agora'}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {stats.criticos > 0 && (
            <Button size="sm" variant="outline" onClick={handleSalvarNoBanco} className="gap-1 border-red-200 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
              <AlertTriangle className="w-4 h-4" />
              Salvar no Sistema ({stats.criticos + stats.altos})
            </Button>
          )}
          {isAdminUser && (
            <Button size="sm" onClick={() => setShowNovoAlerta(true)} className="gap-1 bg-purple-700 hover:bg-purple-800">
              <Plus className="w-4 h-4" /> Novo Alerta
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumCard title="Total Detectados" icon={BarChart3} className="bg-slate-600/5">
          <h3 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">{stats.total}</h3>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic opacity-60 mt-1">incidentes mapeados</p>
        </PremiumCard>

        <PremiumCard title="Críticos" icon={AlertTriangle} className="bg-red-600/5 border-l-red-500">
          <h3 className="text-2xl font-black italic tracking-tighter text-red-600 leading-none">{stats.criticos}</h3>
          <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest italic opacity-60 mt-1">ação imediata necessária</p>
        </PremiumCard>

        <PremiumCard title="Prioridade Alta" icon={TrendingDown} className="bg-orange-600/5 border-l-orange-500">
          <h3 className="text-2xl font-black italic tracking-tighter text-orange-600 leading-none">{stats.altos}</h3>
          <p className="text-[9px] text-orange-400 font-bold uppercase tracking-widest italic opacity-60 mt-1">monitoramento constante</p>
        </PremiumCard>

        <PremiumCard title="OPs em Atraso" icon={Zap} className="bg-amber-600/5 border-l-amber-500">
          <h3 className="text-2xl font-black italic tracking-tighter text-amber-600 leading-none">{stats.opsEmAtraso}</h3>
          <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest italic opacity-60 mt-1">atraso no cronograma</p>
        </PremiumCard>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'criticos', label: '🔴 Críticos/Altos' },
          { key: 'atraso', label: '📉 OPs em Atraso' },
          { key: 'producao', label: '📊 Picos/Quedas' },
          { key: 'operacional', label: '⚡ Operacionais' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filtro === f.key
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                : 'bg-background text-foreground border-border hover:border-accent'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de Alertas */}
      <PremiumCard
        title={`Alertas PCP — ${MESES[mes - 1]} 20${ano}`}
        icon={BarChart3}
        badge={
          <div className="text-[10px] font-black uppercase tracking-[0.2em] italic opacity-60 text-slate-400">
            SETOR: {nomeSetor}
          </div>
        }
        noPadding
        className="dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
      >
        <div className="p-4">
          {alertasFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
              <p className="text-slate-500">Nenhum alerta encontrado. Produção em dia! 🎉</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alertasFiltrados.map(alerta => {
                const cfg = TIPO_CONFIG[alerta.tipo] || TIPO_CONFIG.OPERACIONAL;
                const Icon = cfg.icon;
                return (
                  <div
                    key={alerta.id}
                    className={`p-4 rounded-lg border ${cfg.color} flex items-start gap-3`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-sm">{alerta.titulo}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${SEV_CONFIG[alerta.severidade]}`}>
                          {alerta.severidade}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-current">
                          {cfg.label}
                        </Badge>
                        {alerta.cliente && (
                          <span className="text-xs opacity-70">👤 {alerta.cliente}</span>
                        )}
                      </div>
                      <p className="text-xs opacity-80">{alerta.descricao}</p>
                      {alerta.perc !== null && alerta.perc !== undefined && (
                        <div className="mt-2 w-full bg-black/10 rounded-full h-1.5 max-w-xs">
                          <div
                            className="h-1.5 rounded-full bg-current opacity-60"
                            style={{ width: `${Math.min(100, alerta.perc)}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResolver(alerta.id)}
                      className="flex-shrink-0 h-7 text-xs opacity-70 hover:opacity-100"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Resolver
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PremiumCard>

      {showNovoAlerta && (
        <NovoAlertaDialog
          ops={ops}
          clientes={clientes}
          onClose={() => setShowNovoAlerta(false)}
          onSalvar={handleSalvarAlerta}
        />
      )}
    </div>
  );
}