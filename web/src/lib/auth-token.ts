const STORAGE_KEY = 'fieldsync.dashboard.auth.v1';

export interface StoredAuth {
  token: string;
  orgId: string;
  name: string;
  email: string;
  role: string;
}

// Module-level cache backed by localStorage, mirroring the mobile app's
// authToken.ts — the API client and the realtime socket both need the token
// outside of any React component tree (query functions, socket handshake).
// The listener set makes this a valid useSyncExternalStore source (see
// AuthProvider.tsx), which is what lets the provider read localStorage
// without a hydration mismatch: the server snapshot is always `null`, and
// the real value is only read client-side, without needing a setState-in-effect.
let current: StoredAuth | null | undefined;
const listeners = new Set<() => void>();

function readFromLocalStorage(): StoredAuth | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getAuthSnapshot(): StoredAuth | null {
  if (current === undefined) {
    current = typeof window === 'undefined' ? null : readFromLocalStorage();
  }
  return current;
}

export function getServerAuthSnapshot(): StoredAuth | null {
  return null;
}

export function subscribeToAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setStoredAuth(auth: StoredAuth | null): void {
  current = auth;
  if (typeof window !== 'undefined') {
    if (auth) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }
  listeners.forEach((listener) => listener());
}

export function getAuthToken(): string | null {
  return getAuthSnapshot()?.token ?? null;
}
