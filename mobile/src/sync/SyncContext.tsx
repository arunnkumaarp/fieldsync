import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
// `getLastPulledAt` lives under the `/impl` path rather than the public
// `@nozbe/watermelondb/sync` entrypoint — it's the same persisted value
// synchronize() itself reads/writes, exposed here purely to display it.
import { getLastPulledAt } from '@nozbe/watermelondb/sync/impl';
import { useDatabase } from '@nozbe/watermelondb/react';
import { runSync } from './runSync';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/AuthContext';

interface SyncContextValue {
  isSyncing: boolean;
  lastSyncedAt: number | null;
  lastError: string | null;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const database = useDatabase();
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    getLastPulledAt(database).then(setLastSyncedAt);
  }, [database]);

  const syncNow = useCallback(async () => {
    if (isSyncingRef.current || !user) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    setLastError(null);
    try {
      await runSync(database, apiClient);
      const newLastPulledAt = await getLastPulledAt(database);
      setLastSyncedAt(newLastPulledAt);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [database, user]);

  const value: SyncContextValue = { isSyncing, lastSyncedAt, lastError, syncNow };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}
