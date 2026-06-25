"use client";

export type InstallPromptChoice = "accepted" | "dismissed" | "unavailable";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: Exclude<InstallPromptChoice, "unavailable">;
    platform: string;
  }>;
};

export type MobileInstallSnapshot = {
  installed: boolean;
  manifestReady: boolean;
  promptReady: boolean;
  serviceWorkerReady: boolean;
  serviceWorkerSupported: boolean;
  standalone: boolean;
};

declare global {
  interface Window {
    __essenceAppInstalled?: boolean;
    __essenceInstallPromptEvent?: BeforeInstallPromptEvent;
  }
}

export function captureInstallPrompt(event: BeforeInstallPromptEvent) {
  window.__essenceInstallPromptEvent = event;
  notifyMobileInstallChanged();
}

export function markAppInstalled() {
  window.__essenceAppInstalled = true;
  window.__essenceInstallPromptEvent = undefined;
  notifyMobileInstallChanged();
}

export function getInstallPrompt() {
  return window.__essenceInstallPromptEvent;
}

export function clearInstallPrompt() {
  window.__essenceInstallPromptEvent = undefined;
  notifyMobileInstallChanged();
}

export function isStandaloneDisplay() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export async function getMobileInstallSnapshot(): Promise<MobileInstallSnapshot> {
  const serviceWorkerSupported = "serviceWorker" in navigator;
  const serviceWorkerReady = serviceWorkerSupported
    ? await hasServiceWorkerRegistration()
    : false;
  const standalone = isStandaloneDisplay();

  return {
    installed: standalone || window.__essenceAppInstalled === true,
    manifestReady: Boolean(document.querySelector('link[rel="manifest"]')),
    promptReady: Boolean(getInstallPrompt()),
    serviceWorkerReady,
    serviceWorkerSupported,
    standalone,
  };
}

export function notifyMobileInstallChanged() {
  window.dispatchEvent(new CustomEvent("essence-mobile-install:changed"));
}

async function hasServiceWorkerRegistration() {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return Boolean(registration?.active || navigator.serviceWorker.controller);
  } catch {
    return false;
  }
}
