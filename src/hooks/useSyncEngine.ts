import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '../contexts/ToastContext';
import * as syncEngine from '../services/syncEngine';
import * as syncQueue from '../services/syncQueue';
import { isOnlineNow, useNetworkStatus } from './useNetworkStatus';
import { triggerOfflineWall, triggerSyncReady, OFFLINE_THRESHOLD_MS } from '../services/userSession';

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

export function useSyncEngine(): {
  isSyncing: boolean;
  isOnline: boolean;
  isOfflineIconVisible: boolean;
  pendingCount: number;
  lastSyncedAt: Date | null;
} {
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const { showToast } = useToast();
  const prevOnlineRef = useRef(isOnline);

  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isOfflineIconVisible, setIsOfflineIconVisible] = useState(false);
  const iconTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offlineWallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncEngine.run(queryClient);
      setLastSyncedAt(new Date());
      triggerSyncReady();
    } catch {
      showToast('Sync failed — will retry', 'error');
    } finally {
      setIsSyncing(false);
      const count = await syncQueue.getPendingCount();
      setPendingCount(count);
    }
  }, [queryClient, showToast]);

  // On mount: read pending count and attempt immediate sync if online
  useEffect(() => {
    syncQueue.getPendingCount().then(setPendingCount);
    isOnlineNow().then((online) => {
      if (online) void runSync();
    });
  }, [runSync]);

  // Reconnect / disconnect transitions
  useEffect(() => {
    const wasOnline = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;
    if (isOnline && !wasOnline) {
      if (offlineWallTimerRef.current) {
        clearTimeout(offlineWallTimerRef.current);
        offlineWallTimerRef.current = null;
      }
      if (iconTimerRef.current) clearTimeout(iconTimerRef.current);
      iconTimerRef.current = setTimeout(() => setIsOfflineIconVisible(false), 800);
      void runSync();
    }
    if (!isOnline && wasOnline) {
      iconTimerRef.current = setTimeout(() => setIsOfflineIconVisible(true), 3300);
      offlineWallTimerRef.current = setTimeout(triggerOfflineWall, OFFLINE_THRESHOLD_MS);
    }
  }, [isOnline, runSync]);

  useEffect(() => {
    return () => {
      if (iconTimerRef.current) clearTimeout(iconTimerRef.current);
      if (offlineWallTimerRef.current) clearTimeout(offlineWallTimerRef.current);
    };
  }, []);

  // Periodic sync every 5 minutes while online
  useEffect(() => {
    const id = setInterval(() => {
      if (isOnline) void runSync();
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isOnline, runSync]);

  return { isSyncing, isOnline, isOfflineIconVisible, pendingCount, lastSyncedAt };
}
