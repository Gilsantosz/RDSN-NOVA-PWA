// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/supabaseClient';
import { Download, Shield, Clock, Activity, Package } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AuditoriaTable from '../components/tables/AuditoriaTable';
import FilterBar from '../components/filters/FilterBar';
import { cn } from '@/lib/utils';

export default function Auditoria() {
  const [filters, setFilters] = useState({ search: '', letra: '', ano: '' });

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['auditoria'],
    queryFn: () => base44.entities.Auditoria.list('-created_at', 500)
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: sequencias = [] } = useQuery({
    queryKey: ['sequencias'],
    queryFn: () => base44.entities.SequenciaAnual.list()
  });

  const filteredRegistros = useMemo(() => {
    let result = [...registros];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(r =>
        r.created_by?.toLowerCase().includes(search) ||
        r.detalhes?.toLowerCase().includes(search)
      );
    }

    if (filters.letra) {
      result = result.filter(r => r.letra_produto === filters.letra);
    }

    if (filters.ano) {
      result = result.filter(r => r.ano === filters.ano);
    }

    return result;
  }, [registros, filters]);

  const stats = useMemo(() => {
    const hoje = new Date().toDateString();
    const registrosHoje = registros.filter(r =>
      new Date(r.created_at).toDateString() === hoje
    );

    const porAcao = registros.reduce((acc, r) => {
      acc[r.acao] = (acc[r.acao] || 0) + 1;
      return acc;
    }, {});

    return {
      total: registros.length,
      hoje: registrosHoje.length,
      reservasCriadas: porAcao.RESERVA_CRIADA || 0,
      baixasRegistradas: porAcao.BAIXA_REGISTRADA || 0
    };
  }, [registros]);

  const exportCSV = () => {
    const dataAtual = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let csvContent = '';

    // Cabeçalho do relatório
    csvContent += `========================================\n`;
    csvContent += `RELATÓRIO DE AUDITORIA\n`;
    csvContent += `========================================\n`;
    csvContent += `Data de Geração: ${dataAtual}\n`;
    csvContent += `Usuário: ${user?.full_name || 'Sistema'}\n`;
    csvContent += `Total de Registros Exportados: ${filteredRegistros.length}\n\n`;

    // Filtros aplicados
    csvContent += `FILTROS APLICADOS:\n`;
    csvContent += `----------------------------------------\n`;
    if (filters.search) {
      csvContent += `- Pesquisa: ${filters.search}\n`;
    }
    if (filters.letra) {
      csvContent += `- Letra do Produto: ${filters.letra}\n`;
    }
    if (filters.ano) {
      csvContent += `- Ano: ${filters.ano}\n`;
    }
    if (!filters.search && !filters.letra && !filters.ano) {
      csvContent += `- Nenhum filtro aplicado (todos os registros)\n`;
    }
    csvContent += `\n`;

    // Resumo executivo
    csvContent += `RESUMO EXECUTIVO:\n`;
    csvContent += `----------------------------------------\n`;
    csvContent += `Total de Registros: ${stats.total}\n`;
    csvContent += `Registros Hoje: ${stats.hoje}\n`;
    csvContent += `Reservas Criadas: ${stats.reservasCriadas}\n`;
    csvContent += `Baixas Registradas: ${stats.baixasRegistradas}\n`;
    csvContent += `----------------------------------------\n\n`;

    // Dados detalhados
    csvContent += `DADOS DETALHADOS:\n\n`;
    csvContent += `Data/Hora\tAção\tPrefixo\tCódigo\tIntervalo\tUsuário\tDetalhes\n`;

    filteredRegistros.forEach(r => {
      const dataFormatada = r.created_at ?
        new Date(r.created_at).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }) : '-';

      const acaoLabel = {
        RESERVA_CRIADA: 'Reserva Criada',
        RESERVA_CANCELADA: 'Reserva Cancelada',
        RESERVA_LIBERADA: 'Reserva Liberada',
        BAIXA_REGISTRADA: 'Baixa Registrada',
        ANO_ENCERRADO: 'Ano Encerrado',
        SEQUENCIA_CRIADA: 'Sequência Criada'
      }[r.acao] || r.acao;

      const prefixo = `${r.letra_produto || ''}${r.ano || ''}LM`;
      const codigo = r.codigo_produto || '-';
      const intervalo = (r.numero_inicial && r.numero_final)
        ? `${r.numero_inicial.toLocaleString('pt-BR')} - ${r.numero_final.toLocaleString('pt-BR')}`
        : '-';
      const detalhes = (r.detalhes || '').replace(/\t/g, ' ').replace(/\n/g, ' ');

      csvContent += `${dataFormatada}\t${acaoLabel}\t${prefixo}\t${codigo}\t${intervalo}\t${r.created_by || '-'}\t${detalhes}\n`;
    });

    csvContent += `\n========================================\n`;
    csvContent += `FIM DO RELATÓRIO\n`;
    csvContent += `Sistema HydroTrack - Controle de Produção Industrial\n`;
    csvContent += `========================================\n`;

    // BOM para compatibilidade com Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const letras = [...new Set(registros.map(r => r.letra_produto).filter(Boolean))];
  const anos = [...new Set(sequencias.map(s => s.ano))];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-indigo-400 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all hover:scale-105 active:scale-95 group">
                <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white group-hover:rotate-6 transition-transform" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                  Central de <span className="text-blue-600 dark:text-blue-400">Auditoria</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80">
                  Histórico Imutável • Rastreabilidade • Segurança
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={exportCSV}
              className="h-14 px-8 rounded-2xl border-slate-200 dark:border-white/10 dark:hover:bg-slate-800 transition-all font-black uppercase text-[10px] tracking-[0.2em] italic gap-3 shadow-xl backdrop-blur-xl"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* KPIs Premium */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total de Registros', value: stats.total.toLocaleString(), icon: Shield, color: 'blue' },
            { label: 'Movimentações Hoje', value: stats.hoje, icon: Clock, color: 'indigo' },
            { label: 'Reservas Geradas', value: stats.reservasCriadas, icon: Package, color: 'emerald' },
            { label: 'Baixas de Estoque', value: stats.baixasRegistradas, icon: Activity, color: 'orange' },
          ].map((item, i) => (
            <Card key={i} className="relative overflow-hidden group border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 backdrop-blur-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] italic opacity-80">{item.label}</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic">{item.value}</p>
                  </div>
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6",
                    item.color === 'blue' ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20" :
                      item.color === 'indigo' ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/20" :
                        item.color === 'emerald' ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20" :
                          "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-500/20"
                  )}>
                    <item.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
              <div className={cn(
                "absolute bottom-0 left-0 h-1 bg-gradient-to-r opacity-50 transition-all duration-500 group-hover:h-1.5",
                item.color === 'blue' ? "from-blue-600 to-blue-400 w-full" :
                  item.color === 'indigo' ? "from-indigo-600 to-indigo-400 w-full" :
                    item.color === 'emerald' ? "from-emerald-600 to-emerald-400 w-full" :
                      "from-orange-600 to-orange-400 w-full"
              )} />
            </Card>
          ))}
        </div>

        {/* Filters */}
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          letras={letras}
          anos={anos}
          showStatus={false}
          onClear={() => setFilters({ search: '', letra: '', ano: '' })}
        />

        {/* Table */}
        <AuditoriaTable
          registros={filteredRegistros}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}