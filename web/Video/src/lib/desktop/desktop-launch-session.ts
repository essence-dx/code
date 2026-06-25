"use client";

import type { DesktopVerificationStep } from "@/lib/desktop/desktop-verification";
import { isDesktopRuntime } from "@/lib/runtime/client-api";

const launchSessionStorageKey = "essence.desktop.launch-session.v1";

interface DesktopLaunchSession {
  id: string;
  startedAt: number;
  autoVerify: boolean;
}

interface StoredDesktopLaunchSession extends DesktopLaunchSession {
  checkedAt: number;
}

export async function verifyDesktopLaunchSession(): Promise<DesktopVerificationStep> {
  if (!isDesktopRuntime()) {
    return launchSessionStep("limited", "Open the desktop app to capture a launch session marker.");
  }

  try {
    const current = await readCurrentDesktopLaunchSession();
    const previous = loadStoredDesktopLaunchSession();
    saveDesktopLaunchSession(current);

    if (!previous) {
      return launchSessionStep("limited", "Desktop launch marker captured. Restart the desktop app and run checks again to prove reopen persistence.");
    }

    if (previous.id === current.id) {
      return launchSessionStep("limited", "Current desktop launch is captured. Restart the desktop app before using this as release proof.");
    }

    return launchSessionStep("ready", "Desktop app relaunched after a previous proof marker and preserved local verification state.");
  } catch {
    return launchSessionStep("failed", "Desktop launch session could not be read from the native runtime.");
  }
}

function launchSessionStep(status: DesktopVerificationStep["status"], detail: string): DesktopVerificationStep {
  return {
    id: "desktop-launch-session",
    label: "App relaunch",
    source: "runtime",
    status,
    detail,
  };
}

export async function readCurrentDesktopLaunchSession(): Promise<DesktopLaunchSession> {
  const { invoke } = await import("@tauri-apps/api/core");
  return normalizeDesktopLaunchSession(await invoke("read_desktop_launch_session"));
}

function normalizeDesktopLaunchSession(value: unknown): DesktopLaunchSession {
  if (!value || typeof value !== "object") {
    throw new Error("Desktop launch session is missing.");
  }

  const session = value as Partial<DesktopLaunchSession>;
  if (!session.id || typeof session.id !== "string" || typeof session.startedAt !== "number") {
    throw new Error("Desktop launch session is invalid.");
  }

  return {
    id: session.id,
    startedAt: session.startedAt,
    autoVerify: session.autoVerify === true,
  };
}

function loadStoredDesktopLaunchSession(): StoredDesktopLaunchSession | null {
  if (!canUseLocalStorage()) return null;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(launchSessionStorageKey) ?? "null") as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    const session = parsed as Partial<StoredDesktopLaunchSession>;
    if (!session.id || typeof session.id !== "string" || typeof session.startedAt !== "number" || typeof session.checkedAt !== "number") {
      return null;
    }

    return {
      id: session.id,
      startedAt: session.startedAt,
      autoVerify: session.autoVerify === true,
      checkedAt: session.checkedAt,
    };
  } catch {
    return null;
  }
}

function saveDesktopLaunchSession(session: DesktopLaunchSession) {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(
      launchSessionStorageKey,
      JSON.stringify({
        ...session,
        checkedAt: Date.now(),
      } satisfies StoredDesktopLaunchSession),
    );
  } catch {
    return;
  }
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}
