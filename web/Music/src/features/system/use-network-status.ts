"use client";

import { useSyncExternalStore } from "react";

export type NetworkStatus = {
  online: boolean;
  restoredAt: number | null;
};

const serverSnapshot: NetworkStatus = {
  online: true,
  restoredAt: null,
};

let browserSnapshot: NetworkStatus = serverSnapshot;
let listening = false;
const listeners = new Set<() => void>();

export function useNetworkStatus() {
  return useSyncExternalStore(
    subscribeToNetworkStatus,
    getBrowserSnapshot,
    getServerSnapshot,
  );
}

function subscribeToNetworkStatus(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  listeners.add(listener);

  if (!listening) {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    listening = true;
  }

  syncNavigatorStatus();

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      listening = false;
    }
  };
}

function getBrowserSnapshot() {
  return browserSnapshot;
}

function getServerSnapshot() {
  return serverSnapshot;
}

function syncNavigatorStatus() {
  const online = navigator.onLine;

  setBrowserSnapshot({
    online,
    restoredAt: online ? browserSnapshot.restoredAt : null,
  });
}

function handleOnline() {
  setBrowserSnapshot({ online: true, restoredAt: Date.now() });
}

function handleOffline() {
  setBrowserSnapshot({ online: false, restoredAt: null });
}

function setBrowserSnapshot(nextSnapshot: NetworkStatus) {
  if (
    browserSnapshot.online === nextSnapshot.online &&
    browserSnapshot.restoredAt === nextSnapshot.restoredAt
  ) {
    return;
  }

  browserSnapshot = nextSnapshot;
  listeners.forEach((listener) => listener());
}
