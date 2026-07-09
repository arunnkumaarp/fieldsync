import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';
import { setAuthToken } from '../api/authToken';

const STORAGE_KEY = 'fieldsync.auth.v1';

interface StoredAuth {
  token: string;
  orgId: string;
  email: string;
  name: string;
  role: string;
}

interface LoginResponse {
  accessToken: string;
  user: { orgId: string; email: string; name: string; role: string };
}

interface AuthContextValue {
  isLoading: boolean;
  user: StoredAuth | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredAuth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const stored: StoredAuth = JSON.parse(raw);
        setAuthToken(stored.token);
        setUser(stored);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const result = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    const stored: StoredAuth = {
      token: result.accessToken,
      orgId: result.user.orgId,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    setAuthToken(stored.token);
    setUser(stored);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ isLoading, user, login, logout }), [isLoading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
