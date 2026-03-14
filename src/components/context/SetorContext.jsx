import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

const SetorContext = createContext(null);

export function SetorProvider({ children }) {
  const { user: currentUser } = useAuth();

  const [setorAtivo, setSetorAtivo] = useState(() => {
    return localStorage.getItem('setorAtivo') || null;
  });

  // Definir setor automaticamente quando usuário fizer login
  useEffect(() => {
    if (currentUser) {
      const isAdmin = currentUser?.role_custom?.toUpperCase() === 'ADMIN';

      // Admin sempre pode ver 'ALL'
      if (isAdmin && !setorAtivo) {
        const setorPadrao = 'ALL';
        setSetorAtivo(setorPadrao);
        localStorage.setItem('setorAtivo', setorPadrao);
        return;
      }

      // Usuários com setores_permitidos: usar o primeiro setor
      if (currentUser.setores_permitidos?.length > 0 && !setorAtivo) {
        const primeiroSetor = currentUser.setores_permitidos[0];
        setSetorAtivo(primeiroSetor);
        localStorage.setItem('setorAtivo', primeiroSetor);
      }
    }
  }, [currentUser, setorAtivo]);

  useEffect(() => {
    if (setorAtivo) {
      localStorage.setItem('setorAtivo', setorAtivo);
    }
  }, [setorAtivo]);

  const setoresPermitidos = currentUser?.setores_permitidos || [];
  const isAdmin = currentUser?.role_custom?.toUpperCase() === 'ADMIN';

  const value = React.useMemo(() => ({
    setorAtivo,
    setSetorAtivo,
    setoresPermitidos,
    isAdmin,
    currentUser
  }), [setorAtivo, setoresPermitidos, isAdmin, currentUser]);

  return (
    <SetorContext.Provider value={value}>
      {children}
    </SetorContext.Provider>
  );
}

export function useSetor() {
  const context = useContext(SetorContext);
  if (!context) {
    throw new Error('useSetor must be used within SetorProvider');
  }
  return context;
}