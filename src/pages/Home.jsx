import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { rdsn } from '@/api/supabaseClient';

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    async function protectPage() {
      try {
        await rdsn.auth.me();
        return;
      } catch { }

      const token = localStorage.getItem('internal_token');
      if (!token) {
        navigate(createPageUrl('AcessoInterno'));
      }
    }

    protectPage();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Bem-vindo</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Página inicial protegida</p>
      </div>
    </div>
  );
}