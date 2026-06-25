import { auditDesktopVerificationEvidencePacket } from "@/lib/desktop/desktop-evidence-audit";

export type DesktopProofFreshnessStatus = "ready" | "renew-soon" | "stale" | "missing" | "blocked";

export interface DesktopProofFreshnessReminder {
  status: DesktopProofFreshnessStatus;
  label: string;
  detail: string;
  command: string;
  checkedAt: number | null;
  ageDays: number | null;
  daysUntilStale: number | null;
  readyEntryId: string;
}

const desktopProofFreshnessWindowMs = 14 * 24 * 60 * 60 * 1000;
const desktopProofRenewSoonWindowMs = 3 * 24 * 60 * 60 * 1000;
export const desktopProofRefreshCommand = "bun run desktop:proof:refresh";

export function createDesktopProofFreshnessReminder(value: unknown, now = Date.now()): DesktopProofFreshnessReminder {
  const audit = auditDesktopVerificationEvidencePacket(value, now);
  const readyEntry = audit.readyEntry;
  const checkedAt = readyEntry?.checkedAt ?? null;
  const ageMs = typeof checkedAt === "number" ? Math.max(0, now - checkedAt) : null;
  const daysUntilStale = ageMs === null ? null : Math.ceil((desktopProofFreshnessWindowMs - ageMs) / (24 * 60 * 60 * 1000));

  if (!readyEntry) {
    return reminder({
      status: "missing",
      label: "Desktop proof needed",
      detail: "Capture a ready desktop evidence packet before the next release claim.",
      checkedAt,
      ageMs,
      daysUntilStale,
      readyEntryId: "",
    });
  }

  if (audit.stale) {
    return reminder({
      status: "stale",
      label: "Desktop proof is stale",
      detail: "Refresh desktop proof before release evidence can be marked ready.",
      checkedAt,
      ageMs,
      daysUntilStale,
      readyEntryId: readyEntry.id,
    });
  }

  if (audit.status !== "ready") {
    return reminder({
      status: "blocked",
      label: "Desktop proof is blocked",
      detail: audit.summary,
      checkedAt,
      ageMs,
      daysUntilStale,
      readyEntryId: readyEntry.id,
    });
  }

  if (ageMs !== null && desktopProofFreshnessWindowMs - ageMs <= desktopProofRenewSoonWindowMs) {
    return reminder({
      status: "renew-soon",
      label: "Renew desktop proof soon",
      detail: "Desktop proof is still valid, but it is close to the release freshness window.",
      checkedAt,
      ageMs,
      daysUntilStale,
      readyEntryId: readyEntry.id,
    });
  }

  return reminder({
    status: "ready",
    label: "Desktop proof is fresh",
    detail: "Desktop launch evidence is ready for release packets.",
    checkedAt,
    ageMs,
    daysUntilStale,
    readyEntryId: readyEntry.id,
  });
}

function reminder(input: {
  status: DesktopProofFreshnessStatus;
  label: string;
  detail: string;
  checkedAt: number | null;
  ageMs: number | null;
  daysUntilStale: number | null;
  readyEntryId: string;
}): DesktopProofFreshnessReminder {
  return {
    status: input.status,
    label: input.label,
    detail: input.detail,
    command: desktopProofRefreshCommand,
    checkedAt: input.checkedAt,
    ageDays: input.ageMs === null ? null : Math.floor(input.ageMs / (24 * 60 * 60 * 1000)),
    daysUntilStale: input.daysUntilStale === null ? null : Math.max(0, input.daysUntilStale),
    readyEntryId: input.readyEntryId,
  };
}
