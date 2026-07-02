let _currentUserId = '';
let _offlineWallCallback: (() => void) | null = null;
let _syncReadyCallback: (() => void) | null = null;

export const OFFLINE_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

export function setCurrentUserId(id: string): void {
  _currentUserId = id;
}

export function getCurrentUserId(): string {
  return _currentUserId;
}

export function setOfflineWallCallback(cb: () => void): void {
  _offlineWallCallback = cb;
}

export function triggerOfflineWall(): void {
  _offlineWallCallback?.();
}

export function setSyncReadyCallback(cb: () => void): void {
  _syncReadyCallback = cb;
}

export function triggerSyncReady(): void {
  _syncReadyCallback?.();
}
