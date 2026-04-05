// @ts-nocheck
import React, { useState, useMemo, useEffect, ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { rdsn } from '@/api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  FileText,
  Factory,
  Package,
  Calendar,
  Shield,
  LineChart,
  Menu,
  X,
  LogOut,
  ChevronRight,
  User as UserIcon,
  BarChart3,
  CalendarClock,
  Users,
  AlertTriangle,
  Settings,
  Zap,
  ChevronDown,
  LucideIcon
} from 'lucide-react';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import SetorSelector from '@/components/filters/SetorSelector';
import { SetorProvider } from '@/components/context/SetorContext';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import GlobalSearch from '@/components/search/GlobalSearch';
import FeedbackToasts from '@/components/feedback/FeedbackToasts';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/lib/AuthContext';
import SessionManager, { User } from '@/lib/sessionManager';

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  section: 'principal' | 'pcp' | 'operacoes' | 'analise' | 'admin';
  permission?: string;
}

const navigationConfig: NavigationItem[] = [
  { name: 'Dashboard', href: 'Dashboard', icon: LayoutDashboard, section: 'principal', permission: 'dashboard.visualizar' },
  { name: 'Alertas', href: 'Alertas', icon: AlertTriangle, section: 'principal', permission: 'alertas.visualizar' },
  { name: 'Agendamento', href: 'Agendamento', icon: CalendarClock, section: 'principal', permission: 'agendamento.visualizar' },
  { name: 'Dashboard PCP', href: 'PCPDashboard', icon: BarChart3, section: 'pcp', permission: 'dashboard.visualizar' },
  { name: 'Prog. Mensal', href: 'PCPProgramacaoMensal', icon: BarChart3, section: 'pcp', permission: 'dashboard.visualizar' },
  { name: 'Kanban Produção', href: 'PCPKanban', icon: Zap, section: 'pcp', permission: 'dashboard.visualizar' },
  { name: 'Simulação', href: 'PCPSimulacaoPlano', icon: Zap, section: 'pcp', permission: 'dashboard.visualizar' },
  { name: 'Clientes PCP', href: 'PCPCadastroClientes', icon: Users, section: 'pcp', permission: 'dashboard.visualizar' },
  { name: 'Reservas', href: 'Reservas', icon: FileText, section: 'operacoes', permission: 'reservas.visualizar' },
  { name: 'Produção', href: 'Producao', icon: Factory, section: 'operacoes', permission: 'producao.visualizar' },
  { name: 'Baixas', href: 'Baixas', icon: Package, section: 'operacoes', permission: 'baixas.visualizar' },
  { name: 'Etiquetas', href: 'EtiquetasLote', icon: Package, section: 'operacoes', permission: 'producao.visualizar' },
  { name: 'Estoque', href: 'Estoque', icon: Package, section: 'operacoes', permission: 'estoque.visualizar' },
  { name: 'Relatórios', href: 'Relatorios', icon: LineChart, section: 'analise', permission: 'relatorios.visualizar' },
  { name: 'Auditoria Números', href: 'AuditoriaNumeracao', icon: BarChart3, section: 'analise', permission: 'auditoria.visualizar' },
  { name: 'Sequências', href: 'Sequencias', icon: Calendar, section: 'analise', permission: 'setores.visualizar' },
  { name: 'Setores', href: 'Setores', icon: Factory, section: 'analise', permission: 'setores.visualizar' },
  { name: 'Configurar Alertas', href: 'ConfiguracaoAlertas', icon: Settings, section: 'analise', permission: 'alertas.gerenciar' },
  { name: 'Usuários', href: 'Usuarios', icon: Users, section: 'admin', permission: 'usuarios.visualizar' },
  { name: 'Auditoria', href: 'Auditoria', icon: Shield, section: 'admin', permission: 'auditoria.visualizar' },
  { name: 'Configurações', href: 'ConfiguracoesGerais', icon: Settings, section: 'admin', permission: 'configuracoes.visualizar' },
];

const APP_SESSION_VERSION = '1.0.6';

interface LayoutProps {
  children: ReactNode;
  currentPageName: string;
}

export default function Layout({ children, currentPageName }: LayoutProps) {
  const { logout, user: authUser } = useAuth() as { logout: () => void, user: User | null };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const isAuthPage = ['GateAuth', 'AcessoInterno', 'Acesso', 'CadastroUsuario'].includes(currentPageName || '');
    if (isAuthPage) return;

    const currentVersion = SessionManager.getVersion();
    if (currentVersion !== APP_SESSION_VERSION) {
      console.log('Atualizando versão do sistema para:', APP_SESSION_VERSION);
      SessionManager.setVersion(APP_SESSION_VERSION);
    }
  }, [currentPageName]);

  const user = useMemo(() => authUser, [authUser]);

  const { data: alertasNaoLidos = 0 } = useQuery({
    queryKey: ['alertas-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      try {
        const alertas = await rdsn.entities.Alerta.filter({ lido: false });
        return (alertas || []).length;
      } catch { return 0; }
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const { data: rolePermissoes } = useQuery({
    queryKey: ['role-permissoes', user?.role_custom],
    queryFn: async () => {
      if (!user?.role_custom) return {};
      const roles = await rdsn.entities.PermissaoRole.filter({ role: user.role_custom });
      if (roles.length > 0 && (roles[0] as any).permissoes) return (roles[0] as any).permissoes;
      return {};
    },
    enabled: !!user?.role_custom,
    staleTime: 0,
    gcTime: 0
  });

  const permissoesEfetivas = useMemo(() => {
    const rp = (rolePermissoes || {}) as Record<string, boolean>;
    const up = (user?.permissoes_customizadas || {}) as Record<string, boolean>;
    return { ...rp, ...up };
  }, [rolePermissoes, user?.permissoes_customizadas]);

  const navigation = useMemo(() => {
    if (!user) return [];
    if (user.role_custom === 'Admin') return navigationConfig;
    return navigationConfig.filter(item => {
      if (!item.permission) return true;
      return permissoesEfetivas[item.permission] === true;
    });
  }, [user?.role_custom, permissoesEfetivas]);

  const isAuthPage = ['GateAuth', 'AcessoInterno', 'Acesso', 'CadastroUsuario'].includes(currentPageName);
  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!user && !isAuthPage) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sessão Expirada ou Inválida</p>
          <Button onClick={() => window.location.hash = '#/AcessoInterno'} className="mt-4 bg-blue-600 shadow-lg shadow-blue-900/20">Ir para Login</Button>
        </div>
      </div>
    );
  }

  return (
    <SetorProvider>
      <FeedbackToasts />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={cn(
            "fixed top-0 left-0 z-50 h-full bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 overflow-y-auto",
            collapsed ? "w-20" : "w-64",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800">
            {!collapsed && (
              <div className="flex items-center gap-2 flex-1 overflow-hidden">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                  <Zap className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 truncate text-white">
                  <span className="font-black text-sm block tracking-tighter">PCP <span className="text-blue-400">MATRIX</span></span>
                  <span className="text-[9px] font-bold opacity-50 block uppercase tracking-widest leading-none">Industrial Systems</span>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => setCollapsed(!collapsed)}
            >
              <ChevronRight className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:bg-white/10"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <nav className="p-3 space-y-6">
            {(['principal', 'pcp', 'operacoes', 'analise', 'admin'] as const).map(section => {
              const items = navigation.filter(n => n.section === section);
              if (items.length === 0) return null;
              return (
                <div key={section}>
                  {!collapsed && <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-3 py-2 mb-1">{section}</div>}
                  <div className="space-y-1">
                    {items.map((item) => {
                      const isActive = currentPageName === item.href;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          to={createPageUrl(item.href)}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                            isActive
                              ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20"
                              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          {!collapsed && <span className="font-bold text-xs uppercase tracking-wider">{item.name}</span>}
                          {item.href === 'Alertas' && alertasNaoLidos > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{alertasNaoLidos}</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <main className={cn("transition-all duration-300", collapsed ? "lg:pl-20" : "lg:pl-64")}>
          <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-3">
            <div className="flex items-center justify-between gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
              <div className="flex-1 max-w-md hidden sm:block">
                <GlobalSearch />
              </div>
              <div className="flex items-center gap-4">
                <SetorSelector />
                <ThemeToggle />
                {user && (
                  <>
                    <NotificationCenter userId={user.id} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-3 px-3 py-2 rounded-xl border-2 hover:border-blue-500/50 transition-all h-auto">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
                            <UserIcon className="w-4 h-4" />
                          </div>
                          <div className="text-left hidden sm:block">
                            <p className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none mb-1">{user.full_name}</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">{user.role_custom || 'Operador'}</p>
                          </div>
                          <ChevronDown className="w-3 h-3 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
                        <div className="px-3 py-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identidade Ativa</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.full_name}</p>
                        </div>
                        <DropdownMenuItem
                          onClick={() => logout()}
                          className="rounded-xl text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Encerrar Sessão
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            </div>
          </header>
          {children}
        </main>
      </div>
    </SetorProvider>
  );
}