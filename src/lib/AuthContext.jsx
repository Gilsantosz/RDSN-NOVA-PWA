import React, { createContext, useContext, useEffect, useState } from "react";
import SessionManager from "./sessionManager";
import { createPageUrl } from '../utils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = () => {
    const sessionUser = SessionManager.getUser();
    setUser(sessionUser);
  };

  useEffect(() => {
    loadSession();
    setLoading(false);

    const handleStorage = (event) => {
      if (event.key === SessionManager.SESSION_KEY) {
        loadSession();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const login = (userData) => {
    SessionManager.setUser(userData);
    setUser(userData);
  };

  const logout = () => {
    console.log("Logout executado");
    SessionManager.clear();
    setUser(null);

    window.location.hash = "#/AcessoInterno";

    // Trava anti-loop: garante um tempo para o redirecionamento ocorrer antes do reload
    setTimeout(() => {
      window.location.reload();
    }, 150);
  };

  const navigateToLogin = () => {
    window.location.href = createPageUrl("AcessoInterno");
  };

  const refresh = () => {
    loadSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoadingAuth: loading,
        login,
        logout,
        refresh,
        navigateToLogin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
