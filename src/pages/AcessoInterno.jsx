// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { validateAdmin } from '@/api/secure_vault';
import SessionManager from '@/lib/sessionManager';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Factory, Loader2, BarChart3, Shield, Zap, Users,
  ArrowRight, CheckCircle, Package,
  Calendar, AlertTriangle, TrendingUp, Lock
} from "lucide-react";

const features = [
  { icon: BarChart3, title: 'Programação Mensal', desc: 'Visualize e controle a produção diária de cada OP com tabela interativa.' },
  { icon: Zap, title: 'Simulação de Planos', desc: 'Simule cenários de produção ajustando demanda, eficiência e capacidade.' },
  { icon: Package, title: 'Gestão de Reservas', desc: 'Controle completo de reservas, lotes e numerações por setor.' },
  { icon: Shield, title: 'Auditoria Completa', desc: 'Rastreie toda movimentação com logs detalhados e histórico.' },
  { icon: Users, title: 'Multi-usuário', desc: 'Controle de acesso por papel com permissões granulares.' },
  { icon: Calendar, title: 'Agendamento', desc: 'Planejamento visual de ordens de produção por período.' },
];

export default function AcessoInterno() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { login } = useAuth();
  const loginRef = useRef(null);

  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Limpeza local ao entrar na tela de login.
    // IMPORTANTE: NÃO chamar supabase.signOut() aqui — é async e pode
    // chegar depois do login completar, apagando a sessão recém criada.
    SessionManager.clear();
    queryClient.clear();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToLogin = () => {
    loginRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.group('🔐 Processo de Login');
    console.log('Iniciando login para:', username);

    try {
      // ── CAMINHO 1: Admin local (Vault) ─────────────────────────────
      // Validação 100% local, sem rede, sem edge function.
      if (validateAdmin(username, senha)) {
        console.log('✅ Admin autenticado via Vault local');
        const adminUser = {
          id: 'admin-vault',
          full_name: 'Administrador',
          email: 'admin@system.local',
          username: 'admin',
          role_custom: 'Admin',
          celula: null,
          setores_permitidos: ['TODOS'],
          permissoes_customizadas: {},
        };
        login(adminUser);
        localStorage.setItem('setorAtivo', 'ALL');
        console.log('🚀 Redirecionando para Dashboard...');
        console.groupEnd();
        navigate('/Dashboard', { replace: true });
        return;
      }

      // ── CAMINHO 2: Usuários do Supabase ────────────────────────────
      const { rdsn } = await import('@/api/supabaseClient');
      let user = null;

      // 2a. Tenta via Edge Function
      try {
        const res = await rdsn.functions.invoke('loginUser', {
          username,
          password: senha,
        });
        if (res?.data?.success && res?.data?.user) {
          user = res.data.user;
          console.log('✅ Usuário autenticado via Edge Function');
        } else if (res?.data?.error) {
          // Edge Function respondeu com erro explícito de credenciais
          throw new Error(res.data.error);
        }
      } catch (edgeErr) {
        console.warn('⚠️ Edge Function falhou, tentando busca direta...', edgeErr.message);

        // 2b. Fallback: busca direta no banco pelo username
        try {
          const rows = await rdsn.entities.UsuarioInterno.filter({ username });
          if (rows?.length > 0) {
            const candidate = rows[0];
            // Suporte a hash base64 simples (legado)
            const hashMatch = candidate.password_hash === btoa(senha);
            if (candidate.ativo !== false && hashMatch) {
              user = candidate;
              console.log('✅ Usuário autenticado via banco direto (fallback)');
            }
          }
        } catch (dbErr) {
          console.error('❌ Falha no fallback de banco:', dbErr.message);
        }
      }

      if (!user) {
        setError('Usuário ou senha incorretos.');
        setLoading(false);
        console.groupEnd();
        return;
      }

      // ── Sessão aprovada ────────────────────────────────────────────
      login(user);
      if (user.role_custom === 'Admin') {
        localStorage.setItem('setorAtivo', 'ALL');
      } else if (user.setores_permitidos?.length > 0) {
        localStorage.setItem('setorAtivo', user.setores_permitidos[0]);
      }
      console.log('🚀 Redirecionando para Dashboard...');
      console.groupEnd();
      navigate('/Dashboard', { replace: true });

    } catch (err) {
      console.error('❌ Erro inesperado no login:', err);
      setError(err.message || 'Erro ao fazer login. Tente novamente.');
      setLoading(false);
      console.groupEnd();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">

      {/* ── HEADER PREMIUM (DASHBOARD STYLE) ── */}
      <section className="relative flex flex-col overflow-hidden pt-6 px-6">
        <div className="max-w-7xl mx-auto w-full">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-white/5 dark:bg-slate-900/40 backdrop-blur-3xl p-5 sm:p-6 shadow-2xl border border-white/5 mb-6 animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-16 h-16 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-600 to-indigo-500 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all hover:scale-105 active:scale-95 group border border-blue-400/20">
                  <Factory className="w-8 h-8 sm:w-6 sm:h-6 text-white group-hover:rotate-12 transition-transform duration-500" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter leading-none">
                    PCP <span className="text-blue-500">MATRIX</span>
                  </h1>
                  <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-[0.2em] italic opacity-80 flex items-center gap-2">
                    PAINEL DE CONTROLE INDUSTRIAL • <span className="text-blue-500 flex items-center gap-1"><Shield className="w-3.5 h-3.5" />V2.0.4 PCP MATRIX</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button
                  onClick={scrollToLogin}
                  className="rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-[0.2em] px-8 h-12 gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-blue-500/20 overflow-hidden relative group/btn"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                   <Lock className="w-4 h-4" /> AUTENTICAR COLETA
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Hero content fallback simplified */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-20 animate-in fade-in zoom-in-95 duration-1000">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-6 py-2.5 text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-8 backdrop-blur-md animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.15)]">
            <Zap className="w-4 h-4" /> Evolução da Produção
          </div>
          <h2 className="text-4xl md:text-7xl font-black text-white leading-[0.85] mb-8 max-w-5xl tracking-tighter italic uppercase">
            SISTEMA <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 drop-shadow-[0_0_35px_rgba(56,189,248,0.5)] pr-2">BLINDADO</span><br />
            DE ALTO DESEMPENHO
          </h2>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed font-medium italic opacity-80 uppercase tracking-tight">
            INTERFACE OTIMIZADA PARA O CHÃO DE FÁBRICA . PRECISÃO EM CADA REGISTRO SEGUINDO PLANO PCP
          </p>
          <div className="flex flex-col sm:flex-row gap-6">
            <Button onClick={scrollToLogin} size="lg"
              className="bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-[0.2em] gap-3 h-16 px-14 rounded-2xl border border-white/10 backdrop-blur-xl transition-all hover:scale-105 active:scale-95 shadow-2xl">
              Iniciar Protocolo <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6 bg-slate-900 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_10%_10%,rgba(59,130,246,0.05),transparent)] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter uppercase italic">
              Dominando o <span className="text-blue-500">Processo</span>
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg font-medium italic uppercase tracking-widest opacity-80">Ferramentas de precisão industrial</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="bg-slate-950/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 hover:border-blue-500/50 hover:bg-slate-900 group transition-all relative overflow-hidden flex flex-col items-start text-left shadow-2xl hover:scale-[1.02] active:scale-[0.98]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 transition-all group-hover:scale-150 blur-[60px]" />
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-[1.5rem] flex items-center justify-center mb-10 border border-blue-500/20 shadow-inner group-hover:from-blue-600 group-hover:to-indigo-600 transition-all duration-500 group-hover:rotate-6">
                  <f.icon className="w-8 h-8 text-blue-400 group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-black text-2xl text-white mb-4 tracking-tight uppercase italic">{f.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed italic opacity-90">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DESTAQUES ── */}
      <section className="py-24 px-6 bg-gradient-to-r from-blue-700 to-indigo-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="mb-20">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 uppercase tracking-tighter italic">Arquitetura de <span className="text-blue-200">Confiabilidade</span></h2>
            <p className="text-blue-100 text-lg md:text-xl italic font-medium max-w-3xl mx-auto opacity-80 uppercase tracking-widest">Engenharia de software aplicada à produtividade industrial</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: TrendingUp, title: 'Alta Performance', desc: 'Sincronização em tempo real entre linhas de montagem e gestão.' },
              { icon: Shield, title: 'Auditabilidade', desc: 'Rastro digital completo de cada componente em movimentação.' },
              { icon: AlertTriangle, title: 'Inteligência Industrial', desc: 'Sistemas que antecipam gargalos e otimizam fluxos operacionais.' },
            ].map(item => (
              <div key={item.title} className="bg-white/10 backdrop-blur-3xl rounded-[2.5rem] p-10 text-center border border-white/20 shadow-2xl hover:bg-white/15 transition-all group scale-100 hover:scale-[1.05] active:scale-95 duration-500">
                <div className="w-20 h-20 bg-white rounded-[1.8rem] flex items-center justify-center mx-auto mb-8 shadow-2xl transition-transform group-hover:rotate-12 duration-500">
                  <item.icon className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="font-black text-white mb-4 uppercase text-lg tracking-[0.2em] italic">{item.title}</h3>
                <p className="text-blue-50 italic font-medium leading-relaxed opacity-90">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LOGIN ── */}
      <section ref={loginRef} className="py-32 px-6 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="w-full max-w-md mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3 transition-transform hover:rotate-0">
              <Lock className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Protocolo de Acesso</h2>
             <p className="text-slate-500 mt-3 font-medium italic uppercase text-xs tracking-widest">Identifique-se para a coleta</p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 sm:p-12 shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
            <form onSubmit={handleLogin} className="space-y-8 relative z-10">
              <div className="space-y-3">
                <Label htmlFor="username" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1 italic opacity-70">Operador / Gestor</Label>
                <div className="relative group">
                  <Input
                    id="username"
                    type="text"
                    placeholder="ID de Usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                    className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-700 h-16 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all font-black text-xl px-6"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-blue-500/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity" />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Origem Matrix</p>
                <Label htmlFor="senha" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1 italic opacity-70">Chave de Segurança</Label>
                <div className="relative group">
                  <Input
                    id="senha"
                    type="password"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    disabled={loading}
                    className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-700 h-16 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all font-black text-xl px-6"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-blue-500/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity" />
                </div>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-6 py-4 rounded-2xl text-[11px] font-black italic flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="uppercase tracking-wider">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black h-20 rounded-[2rem] text-xs uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(37,99,235,0.3)] transition-all hover:scale-[1.02] active:scale-95 border-b-[6px] border-blue-900 group/btn overflow-hidden relative"
                disabled={loading}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                {loading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="animate-pulse">Autenticando...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5" />
                    Iniciar Sessão
                  </div>
                )}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-950 border-t border-white/5 py-16 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.05),transparent)] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center gap-10">
          <div className="flex items-center justify-center gap-4 opacity-50 contrast-125 group cursor-default">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 shadow-xl transition-all group-hover:scale-110">
              <Factory className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <span className="font-black text-white tracking-[0.2em] uppercase italic text-lg leading-none block">v2.0.3 RESERVA<span className="text-blue-500">NOVA</span></span>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Sistema de Rastreabilidade Matrix Ativo</span>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.4em] italic">Engenharia Industrial · Hardware & Software Alignment · © 2026</p>
            <p className="text-[9px] text-slate-700 font-black uppercase tracking-[0.5em] opacity-50">Todos os direitos reservados à REDESON — Sistema Blindado</p>
          </div>
        </div>
      </footer>
    </div>
  );
}