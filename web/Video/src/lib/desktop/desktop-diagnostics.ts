"use client";

import { isDesktopRuntime } from "@/lib/runtime/client-api";

export type DesktopDiagnosticStatus = "ready" | "limited" | "failed";

export interface DesktopDiagnosticStep {
  id: string;
  label: string;
  status: DesktopDiagnosticStatus;
  detail: string;
}

export interface DesktopDiagnosticReport {
  status: DesktopDiagnosticStatus;
  checkedAt: number;
  steps: DesktopDiagnosticStep[];
}

export async function runDesktopDiagnostics(): Promise<DesktopDiagnosticReport> {
  if (!isDesktopRuntime()) {
    return browserDiagnosticReport();
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<DesktopDiagnosticReport>("run_desktop_diagnostics");
  } catch {
    return {
      status: "failed",
      checkedAt: Date.now(),
      steps: [
        {
          id: "desktop-diagnostics",
          label: "Desktop diagnostics",
          status: "failed",
          detail: "Desktop checks could not run in this session.",
        },
      ],
    };
  }
}

function browserDiagnosticReport(): DesktopDiagnosticReport {
  return {
    status: "limited",
    checkedAt: Date.now(),
    steps: [
      {
        id: "desktop-runtime",
        label: "Desktop runtime",
        status: "limited",
        detail: "Open the desktop app to check local file storage, media recovery, and native export readiness.",
      },
    ],
  };
}
