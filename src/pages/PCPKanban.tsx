// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Package, Settings, Plus, RotateCcw, Flag, Play,
  CircleCheck, AlertCircle, QrCode, Layers, ArrowRight,
  Factory, Clock, TrendingUp, AlertTriangle, ChevronDown, ChevronUp,
  Gauge, Zap, CheckCircle2, Scissors
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const COLUMNS = [
  { id: 'backlog',   title: 'Backlog',     short: 'BL', icon: Flag,         color: '#64748b', bg: 'rgba(100,116,139,0.08)', wipLimit: null },
  { id: 'weekly',    title: 'Semana',      short: 'SM', icon: Layers,       color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  wipLimit: null },
  { id: 'setup',     title: 'Setup',       short: 'ST', icon: Settings,     color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  wipLimit: 3 },
  { id: 'producing', title: 'Produção',    short: 'WIP',icon: Play,         color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   wipLimit: 5 },
  { id: 'quality',   title: 'Qualidade',   short: 'QA', icon: AlertCircle,  color: '#f97316', bg: 'rgba(249,115,22,0.08)',  wipLimit: null },
  { id: 'done',      title: 'Concluído',   short: 'OK', icon: CircleCheck,  color: '#10b981', bg: 'rgba(16,185,129,0.08)',  wipLimit: null },
];

const COL_ORDER = COLUMNS.map(c => c.id);
const STAGE_PROGRESS: Record<string, number> = {
  backlog: 0, weekly: 20, setup: 40, producing: 65, quality: 85, done: 100
};

const LANES = ['Linha A', 'Linha B', 'Especiais', 'Exportação'];
const DEFAULT_LOT = 10;

// ─── TIPOS ───────────────────────────────────────────────────────────────────
interface KanbanCard {
  id: string; sku: string; qty: number; category: string;
  column: string; priority?: 'low'|'mid'|'high';
  lotIndex?: number; totalLots?: number; createdAt?: string;
}

// ─── COMPONENTES MENORES ──────────────────────────────────────────────────────
function MetricPill({ icon: Icon, label, value, color }: any) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10"
      style={{ '--pill-color': color } as React.CSSProperties}
    >
      <Icon className="w-3.5 h-3.5 text-[var(--pill-color)]" />
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-[11px] font-black text-[var(--pill-color)]">{value}</span>
    </div>
  );
}

function KanbanCardView({ card, col, provided, snapshot, onSplit }: any) {
  const progress = STAGE_PROGRESS[card.column] ?? 0;
  const priorityColors: Record<string, string> = { high: '#ef4444', mid: '#f59e0b', low: '#10b981' };
  const _pColor = priorityColors[card.priority ?? 'mid'];

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={cn(
        "group select-none rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 p-3.5 shadow-sm hover:shadow-md transition-all duration-200",
        snapshot.isDragging && "rotate-1 scale-105 shadow-2xl z-50 ring-2 ring-blue-500/30"
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-black text-slate-900 dark:text-white text-[11px] uppercase tracking-tight truncate">
            {card.sku}
          </span>
          {card.totalLots && (
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
              LOTE {card.lotIndex}/{card.totalLots}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <div
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              card.priority === 'high' ? "bg-red-500" : card.priority === 'mid' ? "bg-amber-500" : "bg-emerald-500"
            )}
          />
          {/* Cortar lote */}
          {card.qty > 1 && (
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onSplit(card); }}
              title="Cortar lote"
              className="p-1 rounded-lg bg-slate-50 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-100 dark:hover:bg-amber-500/20"
            >
              <Scissors className="w-2.5 h-2.5 text-amber-500" />
            </button>
          )}
          <div className="p-1 rounded-lg bg-slate-50 dark:bg-white/5 opacity-40 group-hover:opacity-100 transition-opacity">
            <QrCode className="w-2.5 h-2.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Qty */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5" style={{ '--col-color': col.color } as React.CSSProperties}>
          <Package className="w-3 h-3 text-[var(--col-color)]" />
          <span className="text-sm font-black text-slate-900 dark:text-white">{card.qty}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase">UN</span>
        </div>
        <span className="text-[8px] font-black text-slate-300 dark:text-slate-700 border border-slate-100 dark:border-white/5 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
          {card.id.split('-').slice(-1)[0]}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-2.5 h-[3px] w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${progress}%`, backgroundColor: col.color } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function PCPKanban() {
  const [cards, setCards] = useState<KanbanCard[]>([
    { id: 'lote-001', sku: 'TERM-X1', qty: 10, category: 'Linha A', column: 'producing', lotIndex: 1, totalLots: 1, priority: 'high', createdAt: new Date().toISOString() },
    { id: 'lote-002', sku: 'MOD-Z2',  qty: 5,  category: 'Linha B', column: 'backlog',   lotIndex: 1, totalLots: 1, priority: 'mid',  createdAt: new Date().toISOString() },
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [splitModal, setSplitModal] = useState<{ open: boolean; card: KanbanCard | null }>({ open: false, card: null });
  const [splitSize, setSplitSize] = useState('');
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ name: '', totalQty: '', category: LANES[0], priority: 'mid', lotSize: String(DEFAULT_LOT) });

  // ─── MÉTRICAS ───────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = cards.length;
    const wip = cards.filter(c => c.column === 'producing').length;
    const done = cards.filter(c => c.column === 'done').length;
    const blocked = COLUMNS.filter(col => col.wipLimit && cards.filter(c => c.column === col.id).length > col.wipLimit).length;
    const leadTime = total > 0 ? `~${Math.round(total * 0.8)}h` : '—';
    return { total, wip, done, blocked, leadTime };
  }, [cards]);

  // ─── ADICIONAR LOTES ────────────────────────────────────────────────────────
  const handleAdd = () => {
    const total = parseFloat(form.totalQty.replace(',', '.'));
    const lotSz = parseInt(form.lotSize) || DEFAULT_LOT;
    if (!form.name || isNaN(total) || total <= 0) { toast.error('Preencha os dados.'); return; }

    const n = Math.ceil(total / lotSz);
    const newCards: KanbanCard[] = Array.from({ length: n }, (_, i) => ({
      id: `LOTE-${Date.now()}-${i}`,
      sku: form.name.toUpperCase(),
      qty: i === n - 1 ? (total % lotSz || lotSz) : lotSz,
      category: form.category,
      column: 'backlog',
      priority: form.priority as any,
      lotIndex: i + 1,
      totalLots: n,
      createdAt: new Date().toISOString(),
    }));

    setCards(prev => [...prev, ...newCards]);
    setModalOpen(false);
    setForm({ name: '', totalQty: '', category: LANES[0], priority: 'mid', lotSize: String(DEFAULT_LOT) });
    toast.success(`${n} cartão(ões) criados no Backlog.`);
  };

  // ─── CORTE DE LOTE ──────────────────────────────────────────────────────────
  const openSplit = (card: KanbanCard) => {
    setSplitModal({ open: true, card });
    setSplitSize(String(Math.floor(card.qty / 2)));
  };

  const handleSplit = () => {
    const card = splitModal.card;
    if (!card) return;
    const cutQty = parseInt(splitSize);
    if (isNaN(cutQty) || cutQty <= 0 || cutQty >= card.qty) {
      toast.error('Quantidade de corte inválida.');
      return;
    }
    const remainQty = card.qty - cutQty;
    const ts = Date.now();
    setCards(prev => [
      ...prev.filter(c => c.id !== card.id),
      { ...card, qty: remainQty, id: `${card.id}-A` },
      { ...card, qty: cutQty, id: `${card.id}-B-${ts}`, lotIndex: (card.totalLots ?? 1) + 1, totalLots: (card.totalLots ?? 1) + 1 },
    ]);
    setSplitModal({ open: false, card: null });
    toast.success(`Lote cortado: ${remainQty} + ${cutQty} UN`);
  };

  // ─── DRAG & DROP ────────────────────────────────────────────────────────────
  const onDragEnd = (result: any) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const [colId, lane] = destination.droppableId.split('::');
    setCards(prev => prev.map(c => c.id === draggableId ? { ...c, column: colId, category: lane } : c));
  };

  const toggleLane = (lane: string) =>
    setCollapsedLanes(prev => { const s = new Set(prev); s.has(lane) ? s.delete(lane) : s.add(lane); return s; });

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 transition-colors">

      {/* HEADER */}
      <div className="relative overflow-hidden rounded-[2rem] bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-xl mb-6 p-5">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(239,68,68,0.06),transparent_60%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">

          {/* Title */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-950 dark:bg-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
              <Factory className="w-6 h-6 text-white dark:text-slate-900" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                Quadro <span className="text-red-500">Kanban</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">
                Gestão Lean • Sistema Puxado • Matrix PCP
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex flex-wrap gap-2">
            <MetricPill icon={Gauge}       label="Total"   value={metrics.total}    color="#3b82f6" />
            <MetricPill icon={Zap}         label="WIP"     value={metrics.wip}      color="#ef4444" />
            <MetricPill icon={CheckCircle2}label="Done"    value={metrics.done}     color="#10b981" />
            <MetricPill icon={Clock}       label="Lead"    value={metrics.leadTime} color="#f59e0b" />
            {metrics.blocked > 0 && (
              <MetricPill icon={AlertTriangle} label="Bloqueios" value={metrics.blocked} color="#ef4444" />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={() => setModalOpen(true)}
              className="h-10 px-5 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-900 font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all border-0"
            >
              <Plus className="w-3.5 h-3.5" /> Novo Lote
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              onClick={() => toast.info('Quadro atualizado!')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* PIPELINE HEADER (régua de colunas) */}
      <div className="mb-4 px-1">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `120px repeat(${COLUMNS.length}, 1fr)` } as React.CSSProperties}
        >
          <div />
          {COLUMNS.map((col, idx) => {
            const total = cards.filter(c => c.column === col.id).length;
            const over = col.wipLimit && total > col.wipLimit;
            return (
              <div key={col.id} className="flex flex-col items-center gap-1">
                <div className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest",
                  over
                    ? "bg-red-500/10 border-red-500/40 text-red-500"
                    : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400"
                )}>
                  <div className="flex items-center gap-1.5" style={{ '--col-color': col.color } as React.CSSProperties}>
                    <col.icon className="w-3 h-3 text-[var(--col-color)]" />
                    <span>{col.title}</span>
                  </div>
                  <span
                    className={cn("font-black", over ? "text-red-500" : "text-[var(--col-color)]")}
                    style={{ '--col-color': col.color } as React.CSSProperties}
                  >
                    {total}{col.wipLimit ? `/${col.wipLimit}` : ''}
                  </span>
                </div>
                {/* connector line */}
                {idx < COLUMNS.length - 1 && (
                  <div className="hidden" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* BOARD */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="space-y-3">
          {LANES.map(lane => {
            const laneCards = cards.filter(c => c.category === lane);
            const isCollapsed = collapsedLanes.has(lane);

            return (
              <div key={lane} className="rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
                {/* Lane header */}
                <button
                  onClick={() => toggleLane(lane)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="h-4 w-1 rounded-full bg-red-500 shrink-0" />
                  <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] italic flex-1 text-left">
                    {lane}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 font-black text-[9px] rounded-md">
                      {laneCards.length} cards
                    </Badge>
                    {isCollapsed
                      ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    }
                  </div>
                </button>

                {/* Lane columns */}
                {!isCollapsed && (
                  <div
                    className="grid gap-2 p-3 overflow-x-auto"
                    style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(200px, 1fr))` } as React.CSSProperties}
                  >
                    {COLUMNS.map(col => {
                      const colCards = laneCards.filter(c => c.column === col.id);
                      const isOver = col.wipLimit && colCards.length > col.wipLimit;

                      return (
                        <div key={`${col.id}-${lane}`} className={cn(
                          "rounded-xl p-2 flex flex-col gap-2 min-h-[120px] transition-colors",
                          isOver ? "ring-2 ring-red-500/30 bg-red-500/5" : ""
                        )} style={{ backgroundColor: isOver ? undefined : col.bg } as React.CSSProperties}>

                          {/* Empty state */}
                          {colCards.length === 0 && (
                            <div className="flex-1 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">vazio</span>
                            </div>
                          )}

                          <Droppable droppableId={`${col.id}::${lane}`}>
                            {(provided, snapshot) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className={cn(
                                  "flex-1 flex flex-col gap-2 min-h-[60px] rounded-xl transition-colors p-0.5",
                                  snapshot.isDraggingOver && "bg-blue-500/8 ring-1 ring-blue-400/20"
                                )}
                              >
                                {colCards.map((card, idx) => (
                                  <Draggable key={card.id} draggableId={card.id} index={idx}>
                                    {(dp, ds) => (
                                      <KanbanCardView card={card} col={col} provided={dp} snapshot={ds} onSplit={openSplit} />
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* MODAL CORTE DE LOTE */}
      <Dialog open={splitModal.open} onOpenChange={open => setSplitModal(s => ({ ...s, open }))}>
        <DialogContent className="max-w-sm dark:bg-slate-900 rounded-[2rem] border-0 shadow-2xl p-0">
          <div className="bg-amber-500 p-6 rounded-t-[2rem] text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-3 text-white">
                <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Scissors className="w-4 h-4 text-white" />
                </span>
                Cortar <span className="text-white/80">Lote</span>
              </DialogTitle>
              {splitModal.card && (
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-1">
                  {splitModal.card.sku} — {splitModal.card.qty} UN disponíveis
                </p>
              )}
            </DialogHeader>
          </div>
          <div className="p-6 space-y-5 bg-white dark:bg-slate-900">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Qtd a separar (novo lote)
              </Label>
              <Input
                type="number"
                value={splitSize}
                onChange={e => setSplitSize(e.target.value)}
                min={1}
                max={splitModal.card ? splitModal.card.qty - 1 : undefined}
                placeholder="0"
                className="h-12 rounded-xl font-black text-lg"
              />
            </div>
            {splitModal.card && splitSize && (
              <div className="bg-slate-950 text-white rounded-xl p-4 flex items-center gap-3">
                <Scissors className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-[11px] leading-relaxed">
                  Lote A: <b>{splitModal.card.qty - (parseInt(splitSize) || 0)} UN</b>
                  {' '}• Lote B: <b>{parseInt(splitSize) || 0} UN</b>
                </p>
              </div>
            )}
          </div>
          <div className="px-6 pb-6 flex gap-3 bg-white dark:bg-slate-900 rounded-b-[2rem]">
            <Button
              variant="outline"
              onClick={() => setSplitModal({ open: false, card: null })}
              className="flex-1 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSplit}
              className="flex-[2] h-12 bg-amber-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-amber-600 active:scale-95 transition-all"
            >
              Cortar Lote <Scissors className="w-3.5 h-3.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL NOVO LOTE */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg dark:bg-slate-900 rounded-[2rem] border-0 shadow-2xl p-0">
          {/* Modal header */}
          <div className="bg-slate-950 p-7 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </span>
                Registrar <span className="text-red-400">Demanda</span>
              </DialogTitle>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Nivelamento • Sistema Puxado
              </p>
            </DialogHeader>
          </div>

          {/* Modal body */}
          <div className="p-6 space-y-5 bg-white dark:bg-slate-900">

            {/* SKU */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                SKU / Produto
              </Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value.toUpperCase() })}
                placeholder="EX: TURBINA-MODEL-X"
                className="h-12 rounded-xl font-black uppercase"
              />
            </div>

            {/* Qty + LotSize */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Qtd Total
                </Label>
                <Input
                  type="number"
                  value={form.totalQty}
                  onChange={e => setForm({ ...form, totalQty: e.target.value })}
                  placeholder="0"
                  className="h-12 rounded-xl font-black text-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Tam. Lote
                </Label>
                <Input
                  type="number"
                  value={form.lotSize}
                  onChange={e => setForm({ ...form, lotSize: e.target.value })}
                  placeholder="10"
                  className="h-12 rounded-xl font-black"
                />
              </div>
            </div>

            {/* Canal + Prioridade */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Raia</Label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  title="Selecionar raia"
                  aria-label="Raia"
                  className="w-full h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-4 text-[10px] font-black uppercase tracking-widest"
                >
                  {LANES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Prioridade</Label>
                <select
                  value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })}
                  title="Selecionar prioridade"
                  aria-label="Prioridade"
                  className="w-full h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-4 text-[10px] font-black uppercase tracking-widest"
                >
                  <option value="high">🔴 Alta</option>
                  <option value="mid">🟡 Média</option>
                  <option value="low">🟢 Baixa</option>
                </select>
              </div>
            </div>

            {/* Preview info */}
            {form.totalQty && form.lotSize && (
              <div className="bg-slate-950 text-white rounded-xl p-4 flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-[11px] leading-relaxed">
                  <b>{Math.ceil(parseFloat(form.totalQty || '0') / (parseInt(form.lotSize) || DEFAULT_LOT))}</b> cartões de{' '}
                  <b>{form.lotSize} UN</b> serão criados no Backlog da raia <b>{form.category}</b>.
                </p>
              </div>
            )}
          </div>

          {/* Modal footer */}
          <div className="px-6 pb-6 flex gap-3 bg-white dark:bg-slate-900">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="flex-1 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              className="flex-[2] h-12 bg-slate-950 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 hover:opacity-90 active:scale-95 transition-all"
            >
              Confirmar <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
