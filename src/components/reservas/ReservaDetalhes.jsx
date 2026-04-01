import { Package, TrendingUp, CircleCheck, Clock, ScanLine, User, FileText, History, Plus } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import IntervaloBadge from '../ui/intervalo-badge';
import WorkflowVisualReserva from './WorkflowVisualReserva';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calcularFim, proximoNumero } from '@/core/numeracaoService';

import { PremiumCard } from '@/components/ui/PremiumCard';
import { Button } from '@/components/ui/button';

const statusConfig = {
  RESERVADO: { label: 'Reservado', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', icon: Clock },
  EM_PRODUCAO: { label: 'Em Produção', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: TrendingUp },
  PRODUZIDO: { label: 'Produzido', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: CircleCheck },
  BAIXADO: { label: 'Baixado', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: CircleCheck },
  CANCELADO: { label: 'Cancelado', color: 'bg-red-500/10 text-red-600 dark:text-red-400', icon: Clock },
  LIBERADO: { label: 'Liberado', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400', icon: Clock }
};

export default function ReservaDetalhes({ reserva, baixas, onBaixa }) {
  if (!reserva) return null;

  const quantidadeBaixada = reserva.quantidade_baixada || 0;
  const percentualConcluido = Math.round((quantidadeBaixada / (reserva.quantidade || 1)) * 100);
  const quantidadeRestante = (reserva.quantidade || 0) - quantidadeBaixada;

  const config = statusConfig[reserva.status] || statusConfig.RESERVADO;
  const StatusIcon = config.icon;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50 dark:bg-white/5 p-8 rounded-[2rem] border border-slate-200 dark:border-white/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-blue-500/10 transition-colors" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-4">
            <h3 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">
              {reserva.codigo_completo}
            </h3>
            <div className={cn("px-4 py-1.5 rounded-full border-0 font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-2 shadow-sm", config.color)}>
              <StatusIcon className="w-3.5 h-3.5" />
              {config.label}
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic opacity-80">
            <History className="w-3 h-3" />
            Registrado em {format(new Date(reserva.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
        </div>

        {reserva.status !== 'PRODUZIDO' && reserva.status !== 'CANCELADO' && quantidadeRestante > 0 && (
          <Button
            onClick={onBaixa}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[11px] tracking-[0.2em] h-14 px-8 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95 group relative overflow-hidden"
          >
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            <ScanLine className="w-5 h-5 mr-3" />
            Registrar Nova Baixa
          </Button>
        )}
      </div>

      {/* Workflow Visual Section */}
      <div className="bg-slate-900/5 dark:bg-white/5 rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/5 shadow-inner">
        <div className="mb-6 flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 italic">Fluxogramação Temporal de Lote</h4>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[9px] font-black text-blue-500 uppercase">Monitoramento em Tempo Real</span>
          </div>
        </div>
        <WorkflowVisualReserva
          status={reserva.status}
          quantidade={reserva.quantidade}
          quantidadeBaixada={quantidadeBaixada}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Coluna de Dados GERAIS (Larga) */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <PremiumCard
              title="Cliente Industrial"
              icon={User}
              iconColor="#3b82f6"
              className="dark:bg-slate-900/80 hover:shadow-blue-500/5 transition-all"
            >
              <div className="py-2">
                <p className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic leading-tight">
                  {reserva.cliente || 'CONSUMIDOR FINAL'}
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Identificação Comercial</p>
                  <Badge variant="outline" className="text-[8px] font-black uppercase text-blue-500 border-blue-500/20">Ativo</Badge>
                </div>
              </div>
            </PremiumCard>

            <PremiumCard
              title="Configuração Técnica"
              icon={Package}
              iconColor="#8b5cf6"
              className="dark:bg-slate-900/80 hover:shadow-purple-500/5 transition-all"
            >
              <div className="py-2">
                <p className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic leading-tight">
                  {reserva.modelo || 'MODELO PADRÃO'}
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sku / Pattern Industrial</p>
                  <Badge variant="outline" className="text-[8px] font-black uppercase text-purple-500 border-purple-500/20 font-mono">{reserva.codigo_produto || '-'}</Badge>
                </div>
              </div>
            </PremiumCard>
          </div>

          <PremiumCard title="Especificações de Produção" icon={FileText} iconColor="#f59e0b" className="dark:bg-slate-900/80">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 py-4">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Unidade Fiscal</span>
                <p className="font-mono text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest bg-emerald-500/5 dark:bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/20 inline-block">{reserva.unidade || 'UNIDADE 1'}</p>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Código Global</span>
                <p className="font-mono text-lg font-black text-slate-900 dark:text-white tracking-widest bg-slate-100 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 inline-block">{reserva.codigo_produto || '---'}</p>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Safra Operacional</span>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase italic tracking-tighter">{reserva.mes_producao || '-'}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Ciclo Mensal 20{reserva.ano}</p>
              </div>
              <div className="space-y-2 text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Prazo Estimado</span>
                <p className="text-xl font-black text-amber-600 dark:text-amber-500 italic">
                  {reserva.data_prevista ? format(new Date(reserva.data_prevista), 'dd/MM/yyyy', { locale: ptBR }) : 'N/D'}
                </p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Entrega Programada</p>
              </div>
            </div>
          </PremiumCard>

          {/* Últimas Baixas Section */}
          {baixas.length > 0 ? (
            <PremiumCard title="Timeline de Processamento" icon={History} iconColor="#10b981" className="dark:bg-slate-900/80">
              <div className="space-y-4">
                {baixas.slice(0, 5).map(baixa => (
                  <div key={baixa.id} className="flex items-center justify-between p-5 bg-white dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 group hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5 transition-all">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                          <CircleCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-mono text-lg font-black text-slate-900 dark:text-white tracking-tighter">
                            {baixa.numero_inicial.toLocaleString()} <span className="text-slate-300 dark:text-slate-600 mx-1">→</span> {baixa.numero_final.toLocaleString()}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge className="bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-black text-[8px] uppercase tracking-widest border-emerald-500/20 py-0.5">
                              {baixa.tipo}
                            </Badge>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">
                              Sincronizado em {format(new Date(baixa.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right bg-slate-50 dark:bg-black/20 px-5 py-3 rounded-2xl border border-slate-100 dark:border-white/5 shadow-inner">
                      <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{baixa.quantidade.toLocaleString()}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">unidades</p>
                    </div>
                  </div>
                ))}
                {baixas.length > 5 && (
                  <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:bg-blue-500/5 rounded-2xl py-4 border border-dashed border-blue-500/20 group">
                    <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
                    Visualizar Log Consolidado ({baixas.length} registros)
                  </Button>
                )}
              </div>
            </PremiumCard>
          ) : (
            <div className="p-12 text-center bg-slate-50 dark:bg-white/5 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-white/10">
              <ScanLine className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4 opacity-50 italic" />
              <p className="text-sm font-black text-slate-400 uppercase italic tracking-widest">Nenhuma baixa registrada neste lote</p>
              <p className="text-[10px] text-slate-500 mt-2 uppercase font-bold tracking-tight">O fluxo de produção aguarda o processamento inicial</p>
            </div>
          )}
        </div>

        {/* Coluna Lateral: Métricas de Alta Performance (Estreita) */}
        <div className="lg:col-span-4 space-y-8">
          <PremiumCard
            title="Carga de Lançamento"
            icon={TrendingUp}
            iconColor="#10b981"
            className="dark:bg-slate-900/80 border-2 border-emerald-500/20"
          >
            <div className="text-center py-6">
              <p className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-none">{(reserva.quantidade || 0).toLocaleString()}</p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="h-px w-8 bg-emerald-500/30" />
                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.3em] italic">Meta Estipulada</p>
                <div className="h-px w-8 bg-emerald-500/30" />
              </div>
            </div>
          </PremiumCard>

          <PremiumCard title="Intervalo Técnico" icon={ScanLine} iconColor="#3b82f6" className="dark:bg-slate-900/80">
            <div className="space-y-4">
              <IntervaloBadge
                inicio={reserva.quantidade_baixada > 0 
                  ? proximoNumero(calcularFim(reserva.numero_inicial, reserva.quantidade_baixada, reserva.sequencia_decrescente), reserva.sequencia_decrescente)
                  : reserva.numero_inicial}
                fim={reserva.numero_final}
                variant="primary"
                size="lg"
                className="w-full justify-center py-5 rounded-2xl shadow-lg shadow-blue-500/10 text-xl"
              />
              <div className="px-4 py-3 bg-blue-500/5 dark:bg-white/5 rounded-2xl text-center border border-blue-500/10">
                <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic leading-tight">Sequenciamento Certificado pelo Sistema</p>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard title="Eficiência de Produção" icon={TrendingUp} className="dark:bg-slate-900/80 overflow-hidden relative">
            <div className="space-y-6">
              <div className="flex items-end justify-between relative z-10">
                <div>
                  <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{percentualConcluido}%</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Concluído</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter leading-none">{quantidadeRestante.toLocaleString()}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Pendente</p>
                </div>
              </div>

              <div className="relative pt-2">
                <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner border border-slate-200 dark:border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-1000 ease-out"
                    style={{ width: `${percentualConcluido}%` }}
                  />
                </div>
                {/* Glow effect on progress bar */}
                <div
                  className="absolute top-0 h-8 w-24 bg-blue-500/20 blur-xl transition-all duration-1000 ease-out"
                  style={{ left: `calc(${percentualConcluido}% - 3rem)` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="text-center p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                  <p className="text-lg font-black text-slate-900 dark:text-white tracking-tighter">{quantidadeBaixada.toLocaleString()}</p>
                  <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1">Realizado</p>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                  <p className="text-lg font-black text-slate-900 dark:text-white tracking-tighter">{reserva.quantidade?.toLocaleString()}</p>
                  <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-1">Total</p>
                </div>
              </div>
            </div>
          </PremiumCard>
        </div>
      </div>
    </div>
  );
}