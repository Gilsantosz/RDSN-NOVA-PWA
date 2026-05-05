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
import { RealtimeProvider } from '@/lib/RealtimeContext';

import { GlobalRealtimeSync } from '@/components/GlobalRealtimeSync';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
// BUG SILENCIOSO 1: Tratamento seguro para MainPage
const MainPage = Pages[mainPageKey] || (() => <div>Página inicial não encontrada</div>);

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth() as { isLoadingAuth: boolean, isAuthenticated: boolean };
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Identifica se é página de autenticação
  const pathSegment = location.pathname.replace(/^\//, '').split('/')[0];
  const isAuthPage = ['AcessoInterno', 'Acesso', 'CadastroUsuario'].includes(pathSegment);

  if (!isAuthenticated && !isAuthPage) {
    return <Navigate to="/AcessoInterno" replace />;
  }

  const PageContent = () => (
    <Routes>
      <Route path="/" element={<Navigate to={`/${mainPageKey}`} replace />} />
      {Object.entries(Pages).map(([path, Page]) => {
        const PageComponent = Page as React.ComponentType;
        return <Route key={path} path={`/${path}`} element={<PageComponent />} />;
      })}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );

  return (
    <LayoutWrapper currentPageName={pathSegment}>
      <PageContent />
    </LayoutWrapper>
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
        <RealtimeProvider>
          <QueryClientProvider client={queryClientInstance}>
            <AuthGate>
              <Router>
                <NavigationTracker />
                <GlobalRealtimeSync />
                <AuthenticatedApp />
              </Router>
            </AuthGate>
            <Toaster />
          </QueryClientProvider>
        </RealtimeProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
