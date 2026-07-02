import { createContext, useContext } from 'react';

import { useSyncEngine } from '../hooks/useSyncEngine';

type SyncContextValue = ReturnType<typeof useSyncEngine>;

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const value = useSyncEngine();
  return <SyncContext value={value}>{children}</SyncContext>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}
