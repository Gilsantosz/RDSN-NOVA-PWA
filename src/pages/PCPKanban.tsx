// @ts-nocheck
// @ts-nocheck
import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    Package,
    Settings,
    Plus,
    RotateCcw,
    LayoutDashboard,
    Flag,
    Play,
    CircleCheck,
    AlertCircle,
    QrCode,
    Layers,
    ArrowRight,
    Factory
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

/**
 * PCP_KANBAN_CONFIG
 * Configurações reativas do sistema Lean
 */
const KANBAN_CONFIG = {
    COLUMNS: {
        BACKLOG: { id: 'backlog', title: 'Backlog Mensal', icon: Flag, color: 'slate' },
        WEEKLY: { id: 'weekly', title: 'Planejado (Semana)', icon: Layers, color: 'blue' },
        SETUP: { id: 'setup', title: 'Setup/Preparação', icon: Settings, color: 'amber' },
        PRODUCING: { id: 'producing', title: 'Em Produção (WIP)', icon: Play, color: 'blue', wipLimit: 5 },
        QUALITY: { id: 'quality', title: 'Inspeção Qualidade', icon: AlertCircle, color: 'violet' },
        DONE: { id: 'done', title: 'Concluído', icon: CircleCheck, color: 'emerald' },
    },
    CATEGORIES: ['Linha A', 'Linha B', 'Especiais', 'Exportação'], // Swimlanes
    DEFAULT_LOT_SIZE: 10,
};

export default function PCPKanban() {
    // --- ESTADO ---
    const [cards, setCards] = useState([
        { id: 'lote-001', sku: 'TERM-X1', qty: 10, category: 'Linha A', column: 'producing', metadata: { qr: 'QR001' } },
        { id: 'lote-002', sku: 'MOD-Z2', qty: 5, category: 'Linha B', column: 'backlog', metadata: { qr: 'QR002' } },
    ]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', totalQty: '', category: KANBAN_CONFIG.CATEGORIES[0] });

    // --- LÓGICA DE NEGÓCIO (LEAN/PCP) ---

    /**
     * Função de Nivelamento/Distribuição:
     * Divide uma demanda bruta em lotes processáveis (cartões Kanban)
     */
    const handleAddProduct = () => {
        const total = parseFloat(String(newProduct.totalQty || '').replace(',', '.'));
        if (!newProduct.name || isNaN(total)) {
            toast.error("Preencha os dados corretamente.");
            return;
        }

        const lotSize = KANBAN_CONFIG.DEFAULT_LOT_SIZE;
        const numberOfLots = Math.ceil(total / lotSize);
        const newLots = [];

        for (let i = 0; i < numberOfLots; i++) {
            const currentQty = (i === numberOfLots - 1) ? (total % lotSize || lotSize) : lotSize;
            newLots.push({
                id: `LOTE-${Date.now()}-${i}`,
                sku: newProduct.name,
                qty: currentQty,
                category: newProduct.category,
                column: 'backlog',
                metadata: {
                    lotIndex: i + 1,
                    totalLots: numberOfLots,
                    timestamp: new Date().toISOString(),
                    qrCodeBase: `PROD-${newProduct.name}-${Date.now()}` // Preparado para rastreabilidade
                }
            });
        }

        setCards(prev => [...prev, ...newLots]);
        setIsModalOpen(false);
        setNewProduct({ name: '', totalQty: '', category: KANBAN_CONFIG.CATEGORIES[0] });
        toast.success(`${numberOfLots} cartões (lotes) criados no Backlog.`);
    };

    /**
     * DRAG & DROP: Movimentação de cartões
     */
    const onDragEnd = (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // Lógica de Movimentação Simples para o MVP Estrutural
        setCards(prev => {
            const newCards = [...prev];
            const cardIndex = newCards.findIndex(c => c.id === draggableId);
            if (cardIndex !== -1) {
                // No sistema com swimlanes, o droppableId costuma ser "colId::laneName"
                const [colId, laneName] = destination.droppableId.split('::');
                newCards[cardIndex] = { ...newCards[cardIndex], column: colId, category: laneName };
            }
            return newCards;
        });

        // HOOK: Preparado para rastreabilidade/logs de auditoria
        console.log(`Logística: Lote ${draggableId} movido para ${destination.droppableId}`);
    };

    /**
     * HOOK QR CODE: Preparado para integração futura com html5-qrcode
     * Esta função seria chamada ao escanear um componente no chão de fábrica
     */
    const handleQRCodeScan = (_scannedId, _targetColumn) => {
        // Lógica de movimentação automática (PULL SYSTEM)
    };

    // --- RENDERIZAÇÃO ---

    return (
        <div className="kanban-page h-full min-h-screen bg-transparent p-4 transition-all">
            <style dangerouslySetInnerHTML={{
                __html: `
                .kanban-board-container {
                    display: flex;
                    flex-direction: column;
                    gap: var(--kanban-lane-gap, 2.5rem);
                    width: 100%;
                }
                .kanban-swimlane {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .kanban-columns-grid {
                    display: grid;
                    grid-template-columns: repeat(6, 280px);
                    gap: 1.5rem;
                    min-width: max-content;
                }
                .kanban-column {
                    display: flex;
                    flex-direction: column;
                    min-height: 300px;
                    border-radius: var(--radius-lg, 2rem);
                    padding: 1.25rem;
                    background: var(--bg-column, rgba(255,255,255,0.05));
                    border: 2px solid transparent;
                    transition: all 0.3s ease;
                }
                .kanban-column.wip-limit-exceeded {
                    border-color: var(--color-danger, #f43f5e);
                    background: var(--bg-danger-light, rgba(244,63,94,0.05));
                }
                .kanban-card {
                    background: var(--bg-card, #ffffff);
                    border: 1px solid var(--border-card, #e2e8f0);
                    border-radius: var(--radius-md, 1rem);
                    padding: 1rem;
                    margin-bottom: 1rem;
                    transition: all 0.2s ease;
                    cursor: grab;
                }
                .kanban-card:active { cursor: grabbing; }
                .kanban-card-stage-bar {
                    height: 4px;
                    width: 100%;
                    border-radius: 999px;
                    background: var(--bg-stage-track, #f1f5f9);
                    overflow: hidden;
                    margin-top: 1rem;
                }
                .kanban-card-stage-fill {
                    height: 100%;
                    background: var(--color-primary, #3b82f6);
                    transition: width 0.5s ease;
                }
            `}} />

            {/* Header Premium */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/5 mb-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="flex items-center gap-4 sm:gap-5">
                        <div className="w-16 h-16 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-600 to-indigo-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all hover:scale-105 active:scale-95 group border border-blue-400/20">
                            <LayoutDashboard className="w-8 h-8 sm:w-6 sm:h-6 text-white group-hover:rotate-6 transition-transform duration-500" />
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                                Quadro <span className="text-blue-600 dark:text-blue-400">Kanban</span>
                            </h1>
                            <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                                Gestão Lean • Sistema Puxado • <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 font-black leading-none uppercase"><Factory className="w-3.5 h-3.5" />MATRIX PCP</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
                        <Button
                            onClick={() => setIsModalOpen(true)}
                            className="h-12 px-6 rounded-2xl bg-slate-900 dark:bg-blue-600 text-white font-black uppercase text-xs tracking-widest gap-2 shadow-xl hover:scale-[1.02] active:scale-95 transition-all border-0 shadow-blue-500/20"
                        >
                            <Plus className="w-4 h-4" /> Novo Lote Demanda
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleQRCodeScan(null, null)} className="h-12 w-12 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 backdrop-blur-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all font-black">
                            <RotateCcw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Board Central */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="kanban-board-container overflow-x-auto pb-8">
                    <div className="kanban-board">
                        {KANBAN_CONFIG.CATEGORIES.map(lane => (
                            <div key={lane} className="kanban-swimlane group mb-10">
                                {/* Cabeçalho da Raia */}
                                <div className="flex items-center gap-4 mb-6 px-2">
                                    <div className="h-0.5 w-8 bg-blue-600 rounded-full" />
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] italic">
                                        {lane}
                                    </h3>
                                    <div className="h-0.5 flex-1 bg-gradient-to-r from-blue-600/20 to-transparent rounded-full" />
                                </div>

                                {/* Colunas dentro da Raia */}
                                <div className="kanban-columns-grid">
                                    {Object.values(KANBAN_CONFIG.COLUMNS).map(col => {
                                        const colCards = cards.filter(c => c.column === col.id && c.category === lane);
                                        const isOverlimit = col.wipLimit && colCards.length > col.wipLimit;

                                        return (
                                            <div
                                                key={`${col.id}-${lane}`}
                                                className={cn(
                                                    "kanban-column",
                                                    isOverlimit && "wip-limit-exceeded"
                                                )}
                                            >
                                                {/* Col Header */}
                                                <div className="flex justify-between items-center mb-5 px-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-white/5">
                                                            <col.icon className="w-3.5 h-3.5 text-blue-600" />
                                                        </div>
                                                        <span className="font-black text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                                            {col.title}
                                                        </span>
                                                    </div>
                                                    <Badge className={cn(
                                                        "font-black text-[9px] rounded-md h-5 px-2",
                                                        isOverlimit ? "bg-rose-500 text-white" : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400"
                                                    )}>
                                                        {colCards.length} {col.wipLimit && `/ ${col.wipLimit}`}
                                                    </Badge>
                                                </div>

                                                {/* Droppable Area */}
                                                <Droppable droppableId={`${col.id}::${lane}`}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            {...provided.droppableProps}
                                                            ref={provided.ref}
                                                            className={cn(
                                                                "flex-1 flex flex-col gap-4 p-1 transition-colors rounded-3xl",
                                                                snapshot.isDraggingOver && "bg-blue-500/5"
                                                            )}
                                                        >
                                                            {colCards.map((card, index) => (
                                                                <Draggable key={card.id} draggableId={card.id} index={index}>
                                                                    {(draggableProvided, draggableSnapshot) => (
                                                                        <div
                                                                            ref={draggableProvided.innerRef}
                                                                            {...draggableProvided.draggableProps}
                                                                            {...draggableProvided.dragHandleProps}
                                                                            className={cn(
                                                                                "kanban-card group",
                                                                                draggableSnapshot.isDragging && "z-50"
                                                                            )}
                                                                        >
                                                                            <div className="flex justify-between items-start mb-3">
                                                                                <p className="font-black text-slate-900 dark:text-white uppercase italic text-xs tracking-tight truncate">
                                                                                    {card.sku}
                                                                                </p>
                                                                                <div className="p-1 rounded-md bg-slate-50 dark:bg-white/5 opacity-40 group-hover:opacity-100 transition-opacity">
                                                                                    <QrCode className="w-3 h-3 text-slate-400" />
                                                                                </div>
                                                                            </div>

                                                                            <div className="flex justify-between items-end">
                                                                                <div className="flex flex-col gap-0.5">
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <Package className="w-3 h-3 text-blue-500" />
                                                                                        <span className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                                                                                            {card.qty} UN
                                                                                        </span>
                                                                                    </div>
                                                                                    <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter ml-4">
                                                                                        TAMANHO LOTE
                                                                                    </span>
                                                                                </div>

                                                                                <div className="text-[8px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-tighter border border-slate-100 dark:border-white/5 px-1.5 py-0.5 rounded">
                                                                                    ID:{card.id.split('-').pop()}
                                                                                </div>
                                                                            </div>

                                                                            {/* Estágio Visual Lean */}
                                                                            <div className="kanban-card-stage-bar">
                                                                                <div
                                                                                    className="kanban-card-stage-fill"
                                                                                    style={{ width: '100%', background: col.id === 'done' ? 'var(--color-success, #10b981)' : '' }}
                                                                                />
                                                                            </div>
                                                                        </div>
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
                            </div>
                        ))}
                    </div>
                </div>
            </DragDropContext>

            {/* Modal de Cadastro/Distribuição */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-xl dark:bg-slate-900/90 dark:border-white/10 rounded-[2.5rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl border-0">
                    <div className="bg-gradient-to-br from-blue-700 to-indigo-800 p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
                        <DialogHeader className="relative z-10">
                            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                                <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                                    <Plus className="w-6 h-6 text-blue-200" />
                                </span>
                                Registrar <span className="text-blue-200">Demanda</span>
                            </DialogTitle>
                            <p className="text-xs font-bold text-blue-100/60 uppercase tracking-widest mt-1 italic">
                                Engenharia de Lotes • Sistema Puxado
                            </p>
                        </DialogHeader>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 ml-1">
                                <Package className="w-3 h-3" /> SKU de Identificação / Produto
                            </Label>
                            <div className="relative group">
                                <Input
                                    value={newProduct.name}
                                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value.toUpperCase() })}
                                    placeholder="EX: TURBINA-MODEL-X"
                                    className="h-14 rounded-2xl bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 focus:border-blue-500/50 transition-all font-black uppercase px-6"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 ml-1">
                                    <Layers className="w-3 h-3" /> Unidades Totais
                                </Label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={newProduct.totalQty}
                                    onChange={e => setNewProduct({ ...newProduct, totalQty: e.target.value })}
                                    placeholder="0"
                                    className="h-14 rounded-2xl bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 focus:border-blue-500/50 transition-all font-black text-lg px-6"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 ml-1">
                                    <Flag className="w-3 h-3" /> Canal de Raia
                                </Label>
                                <select
                                    value={newProduct.category}
                                    onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                                    className="w-full h-14 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/5 focus:border-blue-500/50 transition-all px-4 text-[10px] font-black uppercase tracking-widest italic"
                                >
                                    {KANBAN_CONFIG.CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="bg-blue-600/5 p-6 rounded-3xl border border-blue-600/10 flex gap-4 items-start relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
                            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Nivelamento Inteligente (PCP)</p>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 italic leading-relaxed">
                                    A demanda processada será fragmentada em múltiplos cartões de <b>{KANBAN_CONFIG.DEFAULT_LOT_SIZE} unidades</b> para garantir a fluidez do fluxo unitizado no chão de fábrica.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-900/80 backdrop-blur-3xl border-t border-slate-100 dark:border-white/10 flex gap-4">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-14 rounded-2xl border-slate-200 dark:border-white/10 uppercase font-black text-[10px] tracking-[0.2em] px-8 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                            Descartar
                        </Button>
                        <Button onClick={handleAddProduct} className="flex-[1.5] h-14 bg-blue-600 hover:bg-blue-700 text-white px-10 uppercase font-black text-[10px] tracking-[0.2em] shadow-2xl shadow-blue-600/30 transition-all active:scale-95 border-0">
                            Confirmar Planejamento <ArrowRight className="ml-3 w-4 h-4" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
