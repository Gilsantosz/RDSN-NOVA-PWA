import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { rdsn } from '@/api/supabaseClient';

export default function GateAuth() {
  const navigate = useNavigate();

  useEffect(() => {
    async function gateAuth() {
      // 1️⃣ Tenta RDSN
      try {
        const me = await rdsn.auth.me();
        if (me) {
          navigate(createPageUrl('Home'));
          return;
        }
      } catch (e) {
        // Continua para próximo método
      }

      // 2️⃣ Tenta login interno
      const internalUser = localStorage.getItem('internalUser');
      if (internalUser) {
        navigate(createPageUrl('Home'));
        return;
      }

      // 3️⃣ Sem auth - vai para tela de login
      navigate(createPageUrl('AcessoInterno'));
    }

    gateAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Verificando autenticação...</p>
      </div>
    </div>
  );
}