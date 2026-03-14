import React, { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useSetor } from '@/components/context/SetorContext';

export default function WelcomeTour() {
  const [run, setRun] = useState(false);
  const { currentUser } = useSetor();

  useEffect(() => {
    // Verificar se é o primeiro acesso do usuário
    const hasSeenTour = localStorage.getItem(`tour_completed_${currentUser?.id}`);
    
    if (!hasSeenTour && currentUser) {
      // Aguardar 1 segundo para garantir que a página carregou
      const timer = setTimeout(() => {
        setRun(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem(`tour_completed_${currentUser?.id}`, 'true');
    }
  };

  const steps = [
    {
      target: 'body',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900">👋 Bem-vindo ao Sistema de Reserva e Numeração!</h3>
          <p className="text-slate-600">Vamos fazer um tour rápido pelas principais funcionalidades do sistema.</p>
          <p className="text-sm text-slate-500">Você pode pular este tour a qualquer momento clicando em "Pular".</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.setor-selector',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-900">🏭 Seletor de Setor</h4>
          <p className="text-slate-600">Selecione o setor produtivo que deseja visualizar. Seus dados serão filtrados automaticamente.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="notifications"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-900">🔔 Central de Notificações</h4>
          <p className="text-slate-600">Receba alertas importantes sobre produção, reservas e eventos críticos em tempo real.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="search"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-900">🔍 Busca Global</h4>
          <p className="text-slate-600">Pressione <kbd className="px-2 py-1 bg-slate-200 rounded text-xs font-mono">Ctrl+K</kbd> ou <kbd className="px-2 py-1 bg-slate-200 rounded text-xs font-mono">⌘K</kbd> para buscar rapidamente por reservas, clientes e produtos.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[href*="Dashboard"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-900">📊 Dashboard</h4>
          <p className="text-slate-600">Visualize métricas em tempo real, KPIs e análises de produção do seu setor.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[href*="Reservas"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-900">📝 Reservas</h4>
          <p className="text-slate-600">Crie e gerencie reservas de numeração para seus produtos. Aqui você controla todos os lotes reservados.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[href*="Producao"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-900">🏭 Produção</h4>
          <p className="text-slate-600">Registre e acompanhe a produção em tempo real. Monitore o progresso de cada lote.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[href*="Alertas"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-900">⚠️ Alertas</h4>
          <p className="text-slate-600">Visualize e gerencie alertas importantes sobre gargalos, estoques baixos e eventos críticos.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: 'body',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900">🎉 Tour Concluído!</h3>
          <p className="text-slate-600">Agora você está pronto para usar o sistema. Explore as funcionalidades e aproveite!</p>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-4">
            <p className="text-sm text-blue-900 font-medium">💡 Dica: Pressione <kbd className="px-2 py-1 bg-white rounded text-xs font-mono">?</kbd> a qualquer momento para ver todos os atalhos de teclado disponíveis.</p>
          </div>
        </div>
      ),
      placement: 'center',
    },
  ];

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#0f172a',
          textColor: '#334155',
          backgroundColor: '#fff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          arrowColor: '#fff',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 12,
          padding: 20,
        },
        buttonNext: {
          backgroundColor: '#0f172a',
          borderRadius: 8,
          fontSize: 14,
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#64748b',
          marginRight: 10,
        },
        buttonSkip: {
          color: '#94a3b8',
        },
      }}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        skip: 'Pular',
      }}
    />
  );
}