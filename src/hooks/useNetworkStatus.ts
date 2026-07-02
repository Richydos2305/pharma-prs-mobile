import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

function resolveOnline(state: Network.NetworkState): boolean {
  return !!(state.isConnected && state.isInternetReachable);
}

export function useNetworkStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let active = true;

    Network.getNetworkStateAsync().then((state) => {
      if (active) setIsOnline(resolveOnline(state));
    });

    const subscription = Network.addNetworkStateListener((state) => {
      setIsOnline(resolveOnline(state));
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return { isOnline };
}

export async function isOnlineNow(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return resolveOnline(state);
}
