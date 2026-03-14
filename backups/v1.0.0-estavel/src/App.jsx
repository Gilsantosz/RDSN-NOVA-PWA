import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { HashRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';

import { GlobalRealtimeSync } from '@/components/GlobalRealtimeSync';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
// BUG SILENCIOSO 1: Tratamento seguro para MainPage
const MainPage = Pages[mainPageKey] || (() => <div>Página inicial não encontrada</div>);

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();

  // BUG SILENCIOSO 2: Memoizar rotas para evitar re-montagens infinitas
  const routes = React.useMemo(() => {
    return Object.entries(Pages).map(([path, Page]) => (
      <Route
        key={path}
        path={`/${path}`}
        element={
          <LayoutWrapper currentPageName={path}>
            <Page />
          </LayoutWrapper>
        }
      />
    ));
  }, []);

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // REDIRECIONAMENTO AUTOMÁTICO: Se não estiver logado, manda para a tela de login
  const isAuthPage = ['/AcessoInterno', '/Acesso', '/CadastroUsuario'].some(path =>
    location.pathname === path || location.pathname === path + '/'
  );

  if (!isAuthenticated && !isAuthPage) {
    return <Navigate to="/AcessoInterno" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Dashboard" replace />} />
      {routes}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


const AuthGate = ({ children }) => {
  const { isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <AuthGate>
            <GlobalRealtimeSync />
            <Router>
              <NavigationTracker />
              <AuthenticatedApp />
            </Router>
          </AuthGate>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
