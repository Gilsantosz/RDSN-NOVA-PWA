import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Factory, Package } from 'lucide-react';
import { format, startOfWeek, startOfMonth, endOfMonth, addDays, isWithinInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PeriodAnalysis({ reservas: _reservas, produtos, todasReservas }) {
  const [periodType, setPeriodType] = useState('weekly');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCell, setSelectedCell] = useState('all');

  const getCellasUnicas = () => {
    const celulas = new Set();
    produtos.forEach(p => {
      if (p.celulas_permitidas) {
        p.celulas_permitidas.forEach(c => celulas.add(c));
      }
    });
    return Array.from(celulas);
  };

  const getStatusOptions = () => {
    return ['RESERVADO', 'EM_PRODUCAO', 'PRODUZIDO', 'CANCELADO', 'LIBERADO'];
  };

  const filterReservas = (res) => {
    let filtered = res;

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(r => r.status === selectedStatus);
    }

    if (selectedCell !== 'all') {
      filtered = filtered.filter(r => {
        const produto = produtos.find(p => p.letra_produto === r.letra_produto);
        return produto?.celulas_permitidas?.includes(selectedCell);
      });
    }

    return filtered;
  };

  const getPeriodData = useMemo(() => {
    const today = new Date();
    const filtered = filterReservas(todasReservas);
    const periods = [];

    if (periodType === 'daily') {
      for (let i = 0; i < 30; i++) {
        const date = addDays(today, i);
        const dayReservas = filtered.filter(r => 
          r.data_prevista && isSameDay(new Date(r.data_prevista), date)
        );
        
        periods.push({
          label: format(date, 'EEE dd/MM', { locale: ptBR }),
          date: format(date, 'yyyy-MM-dd'),
          reservas: dayReservas,
          totalUnidades: dayReservas.reduce((sum, r) => sum + (r.quantidade - (r.quantidade_baixada || 0)), 0),
          reservasCount: dayReservas.length
        });
      }
    } else if (periodType === 'weekly') {
      for (let i = 0; i < 12; i++) {
        const weekStart = addDays(startOfWeek(today, { locale: ptBR }), i * 7);
        const weekEnd = addDays(weekStart, 6);
        
        const weekReservas = filtered.filter(r => 
          r.data_prevista && isWithinInterval(new Date(r.data_prevista), { 
            start: weekStart, 
            end: weekEnd 
          })
        );
        
        periods.push({
          label: `${format(weekStart, 'dd MMM', { locale: ptBR })} - ${format(weekEnd, 'dd MMM', { locale: ptBR })}`,
          date: format(weekStart, 'yyyy-MM-dd'),
          reservas: weekReservas,
          totalUnidades: weekReservas.reduce((sum, r) => sum + (r.quantidade - (r.quantidade_baixada || 0)), 0),
          reservasCount: weekReservas.length
        });
      }
    } else if (periodType === 'monthly') {
      for (let i = 0; i < 12; i++) {
        const monthStart = startOfMonth(addDays(today, i * 30));
        const monthEnd = endOfMonth(monthStart);
        
        const monthReservas = filtered.filter(r => 
          r.data_prevista && isWithinInterval(new Date(r.data_prevista), { 
            start: monthStart, 
            end: monthEnd 
          })
        );
        
        periods.push({
          label: format(monthStart, 'MMMM yyyy', { locale: ptBR }),
          date: format(monthStart, 'yyyy-MM-dd'),
          reservas: monthReservas,
          totalUnidades: monthReservas.reduce((sum, r) => sum + (r.quantidade - (r.quantidade_baixada || 0)), 0),
          reservasCount: monthReservas.length
        });
      }
    }

    return periods.filter(p => p.reservasCount > 0);
  }, [periodType, selectedStatus, selectedCell, todasReservas, filterReservas]);

  const getCargaPeriodo = (periodo) => {
    const capacidadeEstimada = 10000;
    const percentual = (periodo.totalUnidades / capacidadeEstimada) * 100;
    return Math.min(percentual, 100);
  };

  const getCargaCor = (percentual) => {
    if (percentual > 80) return 'bg-red-500';
    if (percentual > 50) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getCargaStatus = (percentual) => {
    if (percentual > 80) return 'Sobrecarga';
    if (percentual > 50) return 'Normal';
    return 'Subutilizado';
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Período</label>
          <Select value={periodType} onValueChange={setPeriodType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diário</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Status</label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {getStatusOptions().map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Célula de Produção</label>
          <Select value={selectedCell} onValueChange={setSelectedCell}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Células</SelectItem>
              {getCellasUnicas().map(celula => (
                <SelectItem key={celula} value={celula}>{celula}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Períodos */}
      <div className="space-y-3">
        {getPeriodData.length === 0 ? (
          <Card className="border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 backdrop-blur-xl shadow-sm">
            <CardContent className="p-8 text-center text-slate-500 dark:text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 flex items-center justify-center mx-auto mb-4">
                <Package className="w-6 h-6 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Nenhuma reserva encontrada com os filtros selecionados</p>
            </CardContent>
          </Card>
        ) : (
          getPeriodData.map((periodo, idx) => {
            const cargaPerc = getCargaPeriodo(periodo);
            const statusCarga = getCargaStatus(cargaPerc);
            const corCarga = getCargaCor(cargaPerc);

            return (
              <Card key={idx} className="overflow-hidden hover:shadow-md transition-shadow border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 backdrop-blur-xl">
                <CardHeader className="pb-3 bg-slate-50 dark:bg-white/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                      {periodo.label}
                    </CardTitle>
                    <Badge variant="outline" className="dark:border-white/10 dark:text-slate-300">{periodo.reservasCount} reservas</Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-4 space-y-4">
                  {/* Unidades e Carga */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Total de Unidades</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {periodo.totalUnidades.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Carga do Período</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="h-3 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${corCarga} transition-all`} 
                              style={{ width: `${cargaPerc}%` }} 
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{Math.round(cargaPerc)}%</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{statusCarga}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Células */}
                  {selectedCell === 'all' && (
                    <div className="border-t border-slate-100 dark:border-white/5 pt-3">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Distribuição por Célula:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {getCellasUnicas().map(celula => {
                          const celulasReservas = periodo.reservas.filter(r => {
                            const produto = produtos.find(p => p.letra_produto === r.letra_produto);
                            return produto?.celulas_permitidas?.includes(celula);
                          });
                          
                          if (celulasReservas.length === 0) return null;

                          const unitsCelula = celulasReservas.reduce((sum, r) => sum + (r.quantidade - (r.quantidade_baixada || 0)), 0);

                          return (
                            <div key={celula} className="bg-slate-50 dark:bg-white/5 rounded-lg p-2 border border-transparent dark:border-white/5">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Factory className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{celula}</span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {celulasReservas.length} {celulasReservas.length === 1 ? 'reserva' : 'reservas'} • {unitsCelula.toLocaleString()} un.
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}