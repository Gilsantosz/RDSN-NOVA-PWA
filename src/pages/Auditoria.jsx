// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { Download, Shield, Clock, Activity, Package } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PremiumCard } from '@/components/ui/PremiumCard';
import AuditoriaTable from '../components/tables/AuditoriaTable';
import FilterBar from '../components/filters/FilterBar';

export default function Auditoria() {
  const [filters, setFilters] = useState({ search: '', letra: '', ano: '' });

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['auditoria'],
    queryFn: () => rdsn.entities.Auditoria.list('-created_at', 500)
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => rdsn.auth.me()
  });

  const { data: sequencias = [] } = useQuery({
    queryKey: ['sequencias'],
    queryFn: () => rdsn.entities.SequenciaAnual.list()
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


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-600 to-indigo-400 rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all hover:scale-105 active:scale-95 group">
                <Shield className="w-8 h-8 sm:w-6 sm:h-6 text-white group-hover:rotate-6 transition-transform" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
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
          <PremiumCard title="Total de Registros" icon={Shield} className="bg-slate-600/5">
            <h3 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">{stats.total.toLocaleString()}</h3>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic opacity-60 mt-1">histórico total</p>
          </PremiumCard>

          <PremiumCard title="Movimentações Hoje" icon={Clock} className="bg-emerald-600/5">
            <h3 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">{stats.hoje}</h3>
            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest italic opacity-60 mt-1">atividades nas últimas 24h</p>
          </PremiumCard>

          <PremiumCard title="Reservas Geradas" icon={Package} className="bg-blue-600/5">
            <h3 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">{stats.reservasCriadas}</h3>
            <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest italic opacity-60 mt-1">novas reservas no sistema</p>
          </PremiumCard>

          <PremiumCard title="Baixas de Estoque" icon={Activity} className="bg-purple-600/5">
            <h3 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white leading-none">{stats.baixasRegistradas}</h3>
            <p className="text-[9px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-widest italic opacity-60 mt-1">coletas processadas</p>
          </PremiumCard>
        </div>

        {/* Tabela de Auditoria */}
        <Card className="border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden">
          <CardHeader className="p-8 border-b dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50">
            <FilterBar filters={filters} setFilters={setFilters} sequencias={sequencias} />
          </CardHeader>
          <CardContent className="p-0">
            <AuditoriaTable registros={filteredRegistros} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}