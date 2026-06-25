import {
  createDesktopLaunchProofSummary,
  hasDesktopLaunchProofEntry,
  type DesktopLaunchProofRequirement,
} from "@/lib/desktop/desktop-launch-proof";
import {
  readDesktopVerificationEvidenceEntries,
  type DesktopVerificationHistoryEntry,
} from "@/lib/desktop/desktop-verification-history";

export type DesktopEvidenceAuditStatus = "ready" | "blocked";

export interface DesktopEvidencePacketAudit {
  status: DesktopEvidenceAuditStatus;
  summary: string;
  entryCount: number;
  readyEntry: DesktopVerificationHistoryEntry | null;
  latestEntry: DesktopVerificationHistoryEntry | null;
  readyCount: number;
  limitedCount: number;
  failedCount: number;
  missingRequirements: DesktopLaunchProofRequirement[];
  limitedRequirements: DesktopLaunchProofRequirement[];
  failedRequirements: DesktopLaunchProofRequirement[];
  stale: boolean;
  errors: string[];
}

const desktopEvidenceFreshnessWindowMs = 14 * 24 * 60 * 60 * 1000;

export function auditDesktopVerificationEvidencePacket(value: unknown, now = Date.now()): DesktopEvidencePacketAudit {
  const entries = readDesktopVerificationEvidenceEntries(value).sort((first, second) => second.checkedAt - first.checkedAt);
  const readyEntry = entries.find((entry) => hasDesktopLaunchProofEntry(entry)) ?? null;
  const latestEntry = entries[0] ?? null;
  const proofSummary = createDesktopLaunchProofSummary(readyEntry ?? latestEntry);
  const errors = packetErrors(value, entries);
  const stale = readyEntry ? !isFreshDesktopEvidence(readyEntry.checkedAt, now) : false;
  const missingRequirements = proofSummary.requirements.filter((requirement) => requirement.status === "missing");
  const limitedRequirements = proofSummary.requirements.filter((requirement) => requirement.status === "limited");
  const failedRequirements = proofSummary.requirements.filter((requirement) => requirement.status === "failed");
  const status = readyEntry && !stale && errors.length === 0 ? "ready" : "blocked";

  return {
    status,
    entryCount: entries.length,
    readyEntry,
    latestEntry,
    readyCount: entries.filter((entry) => hasDesktopLaunchProofEntry(entry)).length,
    limitedCount: entries.filter((entry) => createDesktopLaunchProofSummary(entry).status === "limited").length,
    failedCount: entries.filter((entry) => createDesktopLaunchProofSummary(entry).status === "failed").length,
    missingRequirements,
    limitedRequirements,
    failedRequirements,
    stale,
    errors,
    summary: desktopEvidenceAuditSummary(status, {
      entries: entries.length,
      ready: Boolean(readyEntry),
      stale,
      errors: errors.length,
      missing: missingRequirements.length,
      limited: limitedRequirements.length,
      failed: failedRequirements.length,
    }),
  };
}

function packetErrors(value: unknown, entries: DesktopVerificationHistoryEntry[]) {
  const errors: string[] = [];

  if (!entries.length) {
    errors.push("Desktop evidence packet does not contain readable verification entries.");
  }

  if (value && typeof value === "object" && "entryCount" in value) {
    const entryCount = (value as { entryCount?: unknown }).entryCount;
    if (typeof entryCount === "number" && Number.isFinite(entryCount) && entryCount !== entries.length) {
      errors.push(`Desktop evidence packet entryCount is ${entryCount}, but ${entries.length} entries were readable.`);
    }
  }

  return errors;
}

function isFreshDesktopEvidence(value: number, now: number) {
  return Number.isFinite(value) && value <= now && now - value <= desktopEvidenceFreshnessWindowMs;
}

function desktopEvidenceAuditSummary(
  status: DesktopEvidenceAuditStatus,
  counts: { entries: number; ready: boolean; stale: boolean; errors: number; missing: number; limited: number; failed: number },
) {
  if (status === "ready") {
    return `Desktop evidence is ready with ${counts.entries} captured verification entr${counts.entries === 1 ? "y" : "ies"}.`;
  }

  const issueCount = counts.errors + (counts.ready ? 0 : 1) + (counts.stale ? 1 : 0) + counts.missing + counts.limited + counts.failed;
  return `Desktop evidence is blocked with ${issueCount} issue${issueCount === 1 ? "" : "s"}.`;
}
