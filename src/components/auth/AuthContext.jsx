import React, { createContext, useContext, useState, useEffect } from 'react';
import { rdsn } from '@/api/supabaseClient';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    strategy: null, // 'RDSN' | 'INTERNO' | null
    isAuthenticated: false,
    user: null,
    loading: false // CRÍTICO: Iniciar como false para não bloquear
  });

  // Função única de inicialização - PRIORIZA AUTENTICAÇÃO INTERNA
  const initAuth = async () => {
    // PRIORIDADE 1: Verificar se existe sessão interna
    try {
      const internalUserData = localStorage.getItem('internalUser');
      if (internalUserData) {
        const internalUser = JSON.parse(internalUserData);
        setAuthState({
          strategy: 'INTERNO',
          isAuthenticated: true,
          user: internalUser,
          loading: false
        });
        return;
      }
    } catch (storageErr) {
      console.warn('Erro ao ler localStorage:', storageErr);
    }

    // PRIORIDADE 2: Tentar autenticação RDSN (com timeout)
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 2000)
      );
      
      const rdsnUser = await Promise.race([
        rdsn.auth.me(),
        timeoutPromise
      ]);
      
      if (rdsnUser) {
        setAuthState({
          strategy: 'RDSN',
          isAuthenticated: true,
          user: rdsnUser,
          loading: false
        });
        return;
      }
    } catch (error) {
      // RDSN falhou ou timeout - liberar app para login interno
      console.log('RDSN auth indisponível, usando sistema interno');
    }

    // Nenhuma autenticação válida - liberar tela de login
    setAuthState({
      strategy: 'INTERNO',
      isAuthenticated: false,
      user: null,
      loading: false
    });
  };

  useEffect(() => {
    initAuth();
  }, []);

  const loginInterno = async (username, password) => {
    const response = await rdsn.functions.invoke('loginUser', { username, password });
    
    if (response.data.error) {
      throw new Error(response.data.error);
    }

    if (response.data.success) {
      localStorage.setItem('internalUser', JSON.stringify(response.data.user));
      setAuthState({
        strategy: 'INTERNO',
        isAuthenticated: true,
        user: response.data.user,
        loading: false
      });
      return response.data.user;
    }
  };

  const logout = () => {
    if (authState.strategy === 'INTERNO') {
      localStorage.removeItem('internalUser');
    } else if (authState.strategy === 'RDSN') {
      rdsn.auth.logout();
    }
    
    setAuthState({
      strategy: null,
      isAuthenticated: false,
      user: null,
      loading: false
    });
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      loginInterno,
      logout,
      refresh: initAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
}