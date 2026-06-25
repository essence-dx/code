"use client";

import { useEffect } from "react";
import { readCurrentDesktopLaunchSession } from "@/lib/desktop/desktop-launch-session";
import { runDesktopVerification } from "@/lib/desktop/desktop-verification";
import {
  saveDesktopVerificationReport,
  writeDesktopVerificationEvidenceToAppLocalData,
  type DesktopVerificationEvidenceFile,
} from "@/lib/desktop/desktop-verification-history";
import { isDesktopRuntime } from "@/lib/runtime/client-api";

const autopilotRunStorageKey = "essence.desktop.proof-autopilot.runs.v1";
export const desktopVerificationUpdatedEvent = "essence:desktop-verification-updated";

export interface DesktopVerificationUpdatedEventDetail {
  report: Awaited<ReturnType<typeof runDesktopVerification>>;
  history: ReturnType<typeof saveDesktopVerificationReport>;
  evidenceFile: DesktopVerificationEvidenceFile | null;
}

export function DesktopProofAutopilot() {
  useEffect(() => {
    let cancelled = false;

    async function runAutopilot() {
      if (!isDesktopRuntime()) return;

      const session = await readCurrentDesktopLaunchSession();
      const forcedByUrl = new URLSearchParams(window.location.search).get("desktopProof") === "run";
      if (!session.autoVerify && !forcedByUrl) return;
      if (!forcedByUrl && hasAutopilotRun(session.id)) return;

      markAutopilotRun(session.id);
      const report = await runDesktopVerification();
      if (cancelled) return;

      const history = saveDesktopVerificationReport(report);
      const evidenceFile = await writeDesktopVerificationEvidenceToAppLocalData(history).catch(() => null);

      if (cancelled) return;
      window.dispatchEvent(
        new CustomEvent<DesktopVerificationUpdatedEventDetail>(desktopVerificationUpdatedEvent, {
          detail: {
            report,
            history,
            evidenceFile,
          },
        }),
      );
    }

    void runAutopilot().catch(() => {
      return;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

function hasAutopilotRun(sessionId: string) {
  if (!canUseSessionStorage()) return false;

  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(autopilotRunStorageKey) ?? "[]") as unknown;
    return Array.isArray(parsed) && parsed.includes(sessionId);
  } catch {
    return false;
  }
}

function markAutopilotRun(sessionId: string) {
  if (!canUseSessionStorage()) return;

  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(autopilotRunStorageKey) ?? "[]") as unknown;
    const sessions = Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
    window.sessionStorage.setItem(autopilotRunStorageKey, JSON.stringify([sessionId, ...sessions.filter((value) => value !== sessionId)].slice(0, 10)));
  } catch {
    return;
  }
}

function canUseSessionStorage() {
  return typeof window !== "undefined" && "sessionStorage" in window;
}
