"use client";

import type { DesktopDiagnosticStatus } from "@/lib/desktop/desktop-diagnostics";
import type { DesktopVerificationHistoryEntry } from "@/lib/desktop/desktop-verification-history";

export type DesktopLaunchProofStatus = DesktopDiagnosticStatus | "missing";

export interface DesktopLaunchProofRequirement {
  id: string;
  label: string;
  status: DesktopLaunchProofStatus;
  detail: string;
}

export interface DesktopLaunchProofSummary {
  status: DesktopLaunchProofStatus;
  readyCount: number;
  limitedCount: number;
  failedCount: number;
  missingCount: number;
  total: number;
  requirements: DesktopLaunchProofRequirement[];
}

export const desktopLaunchProofRequirements = [
  { id: "desktop-launch-session", label: "App relaunch" },
  { id: "local-project-persistence", label: "Project reopen" },
  { id: "desktop-storage", label: "Local storage" },
  { id: "media-library", label: "Media library" },
  { id: "render-spool", label: "Render spool" },
  { id: "native-media-engine", label: "Media engine" },
  { id: "native-render-smoke", label: "Render smoke" },
  { id: "file-backed-media", label: "File media" },
  { id: "native-export-output", label: "Export output" },
] as const;

export function createDesktopLaunchProofSummary(entry: DesktopVerificationHistoryEntry | null | undefined): DesktopLaunchProofSummary {
  const requirements = desktopLaunchProofRequirements.map((requirement): DesktopLaunchProofRequirement => {
    const step = entry?.steps.find((candidate) => candidate.id === requirement.id);

    return {
      ...requirement,
      status: step?.status ?? "missing",
      detail: step?.detail ?? "Run desktop checks from the desktop app to capture this launch proof.",
    };
  });
  const readyCount = countRequirements(requirements, "ready");
  const limitedCount = countRequirements(requirements, "limited");
  const failedCount = countRequirements(requirements, "failed");
  const missingCount = countRequirements(requirements, "missing");

  return {
    status: launchProofStatus(entry, { readyCount, limitedCount, failedCount, missingCount, total: requirements.length }),
    readyCount,
    limitedCount,
    failedCount,
    missingCount,
    total: requirements.length,
    requirements,
  };
}

export function hasDesktopLaunchProofEntry(entry: DesktopVerificationHistoryEntry | null | undefined) {
  return createDesktopLaunchProofSummary(entry).status === "ready";
}

function launchProofStatus(
  entry: DesktopVerificationHistoryEntry | null | undefined,
  counts: Pick<DesktopLaunchProofSummary, "readyCount" | "limitedCount" | "failedCount" | "missingCount" | "total">,
): DesktopLaunchProofStatus {
  if (!entry || counts.missingCount > 0) return "missing";
  if (entry.status === "failed" || counts.failedCount > 0) return "failed";
  if (entry.status === "limited" || counts.limitedCount > 0) return "limited";
  return counts.readyCount === counts.total ? "ready" : "missing";
}

function countRequirements(requirements: DesktopLaunchProofRequirement[], status: DesktopLaunchProofStatus) {
  return requirements.filter((requirement) => requirement.status === status).length;
}
