import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, LoginPayload, RegisterPayload, UpdatePreferencesPayload } from '../types/auth';
import { authApi, tokenStorage } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updatePreferences: (payload: UpdatePreferencesPayload) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Hidratar de inmediato desde localStorage del DOM para evitar cierres o parpadeos al entrar
  const [user, setUser] = useState<User | null>(() => tokenStorage.getCachedUser());
  const [loading, setLoading] = useState<boolean>(true);

  const updateAndCacheUser = (nextUser: User | null) => {
    tokenStorage.setCachedUser(nextUser);
    setUser(nextUser);
  };

  const fetchCurrentUser = async () => {
    const accessToken = tokenStorage.getAccessToken();
    const refreshToken = tokenStorage.getRefreshToken();

    if (!accessToken && !refreshToken) {
      updateAndCacheUser(null);
      setLoading(false);
      return;
    }

    try {
      const profile = await authApi.getMe();
      updateAndCacheUser(profile);
    } catch {
      // Solo cerrar sesión si tampoco existe refreshToken válido (fetchWithAuth ya limpia storage si el refresh expiró)
      if (!tokenStorage.getAccessToken() && !tokenStorage.getRefreshToken()) {
        updateAndCacheUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    const handleSessionExpired = () => {
      updateAndCacheUser(null);
    };

    window.addEventListener('pilates:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('pilates:session-expired', handleSessionExpired);
    };
  }, []);

  const login = async (payload: LoginPayload) => {
    const response = await authApi.login(payload);
    tokenStorage.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
    updateAndCacheUser(response.user);
    // Sincronizar perfil completo (incluyendo favoriteBranch y allowedMenus)
    try {
      const fullProfile = await authApi.getMe();
      updateAndCacheUser(fullProfile);
    } catch {
      // Mantener datos de login si falla llamada complementaria
    }
  };

  const register = async (payload: RegisterPayload) => {
    const response = await authApi.register(payload);
    tokenStorage.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
    updateAndCacheUser(response.user);
  };

  const logout = () => {
    tokenStorage.clear();
    updateAndCacheUser(null);
  };

  const updatePreferences = async (payload: UpdatePreferencesPayload) => {
    const updated = await authApi.updateProfile(payload);
    updateAndCacheUser(updated);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
