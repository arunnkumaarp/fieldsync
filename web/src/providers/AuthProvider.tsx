'use client';

import React, { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import { api } from '@/lib/api';
import { getAuthSnapshot, getServerAuthSnapshot, setStoredAuth, StoredAuth, subscribeToAuth } from '@/lib/auth-token';
import type { LoginResponse } from '@/lib/types';

interface AuthContextValue {
  user: StoredAuth | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // useSyncExternalStore (not useState+useEffect) is what avoids a
  // hydration mismatch here: the server always "sees" no auth (no
  // localStorage), so the server-rendered HTML and the client's first
  // hydration pass must agree on that — React handles reconciling in the
  // corrected client value right after hydration itself, no extra
  // loading-flag render needed.
  const user = useSyncExternalStore(subscribeToAuth, getAuthSnapshot, getServerAuthSnapshot);

  const login = async (email: string, password: string) => {
    const result = await api.post<LoginResponse>('/auth/login', { email, password });
    setStoredAuth({
      token: result.accessToken,
      orgId: result.user.orgId,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
    });
  };

  const logout = () => setStoredAuth(null);

  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
