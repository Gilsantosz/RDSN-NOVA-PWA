import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Acesso() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(createPageUrl('AcessoInterno'), { replace: true });
    // fallback para garantir que carrega mesmo sem react-router
    // window.location.replace('/' + createPageUrl('AcessoInterno'));
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Redirecionando...</p>
      </div>
    </div>
  );
}