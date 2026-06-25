import {
  createReleaseEvidencePacketPayload,
  type ReleaseEvidence,
  type ReleaseEvidencePacket,
  type ReleaseEvidencePacketOptions,
} from "@/lib/product/release-evidence";
import { auditReleaseEvidencePacket, type ReleaseEvidencePacketAudit } from "@/lib/product/release-evidence-audit";
import type { ReleaseReadinessReport } from "@/lib/product/release-readiness";

export type ReleaseEvidenceHistoryFilter = "all" | "ready" | "draft" | "stale";

export interface ReleaseEvidenceHistoryEntry {
  id: string;
  savedAt: number;
  auditStatus: ReleaseEvidencePacketAudit["status"];
  releaseScore: number;
  evidenceScore: number;
  staleCount: number;
  missingCount: number;
  blockerCount: number;
  warningCount: number;
  deploymentUrl: string;
  desktopVerificationId: string;
  packet: ReleaseEvidencePacket;
}

const releaseEvidenceHistoryKey = "essence.release.evidence.history.v1";
const pinnedReleaseEvidenceKey = "essence.release.evidence.pinned.v1";
const maxReleaseEvidenceHistoryEntries = 8;

export function createReleaseEvidenceHistoryEntry(packet: ReleaseEvidencePacket, savedAt = Date.now()): ReleaseEvidenceHistoryEntry {
  const audit = auditReleaseEvidencePacket(packet, savedAt);

  return {
    id: createReleaseEvidenceHistoryEntryId(packet, savedAt),
    savedAt,
    auditStatus: audit.status,
    releaseScore: audit.releaseScore,
    evidenceScore: audit.evidenceScore,
    staleCount: audit.staleRequirements.length,
    missingCount: audit.missingRequirements.length,
    blockerCount: audit.blockedGates.length + audit.errors.length,
    warningCount: audit.warningGates.length,
    deploymentUrl: packet.evidence.deploymentUrl,
    desktopVerificationId: packet.evidence.desktopVerificationId,
    packet,
  };
}

export function saveCurrentReleaseEvidenceHistoryEntry(
  report: ReleaseReadinessReport,
  evidence: ReleaseEvidence,
  options: ReleaseEvidencePacketOptions = {},
) {
  return saveReleaseEvidenceHistoryEntry(createReleaseEvidencePacketPayload(report, evidence, options));
}

export function saveReleaseEvidenceHistoryEntry(packet: ReleaseEvidencePacket, savedAt = Date.now()) {
  const entry = createReleaseEvidenceHistoryEntry(packet, savedAt);
  const entries = [entry, ...loadReleaseEvidenceHistory().filter((item) => item.id !== entry.id)]
    .sort((first, second) => second.savedAt - first.savedAt)
    .slice(0, maxReleaseEvidenceHistoryEntries);

  if (hasBrowserStorage()) {
    window.localStorage.setItem(releaseEvidenceHistoryKey, JSON.stringify(entries));
    const pinnedId = loadPinnedReleaseEvidenceHistoryId();
    if (!pinnedId || !entries.some((item) => item.id === pinnedId)) {
      window.localStorage.setItem(pinnedReleaseEvidenceKey, entry.id);
    }
  }

  return entries;
}

export function loadReleaseEvidenceHistory() {
  if (!hasBrowserStorage()) return [] as ReleaseEvidenceHistoryEntry[];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(releaseEvidenceHistoryKey) ?? "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .flatMap((entry) => {
        const normalized = normalizeReleaseEvidenceHistoryEntry(entry);
        return normalized ? [normalized] : [];
      })
      .sort((first, second) => second.savedAt - first.savedAt)
      .slice(0, maxReleaseEvidenceHistoryEntries);
  } catch {
    return [];
  }
}

export function filterReleaseEvidenceHistory(entries: ReleaseEvidenceHistoryEntry[], filter: ReleaseEvidenceHistoryFilter) {
  if (filter === "all") return entries;

  return entries.filter((entry) => {
    const label = releaseEvidenceHistoryLabel(entry).toLowerCase();
    return label === filter;
  });
}

export function releaseEvidenceHistoryLabel(entry: ReleaseEvidenceHistoryEntry) {
  if (entry.staleCount > 0) return "Stale";
  if (entry.auditStatus === "ready") return "Ready";
  return "Draft";
}

export function pinReleaseEvidenceHistoryEntry(id: string) {
  if (hasBrowserStorage()) {
    window.localStorage.setItem(pinnedReleaseEvidenceKey, id);
  }

  return id;
}

export function loadPinnedReleaseEvidenceHistoryId() {
  if (!hasBrowserStorage()) return "";

  return window.localStorage.getItem(pinnedReleaseEvidenceKey) ?? "";
}

export function selectPinnedReleaseEvidenceHistoryEntry(entries = loadReleaseEvidenceHistory()) {
  const pinnedId = loadPinnedReleaseEvidenceHistoryId();
  return entries.find((entry) => entry.id === pinnedId) ?? entries[0] ?? null;
}

export function clearReleaseEvidenceHistory() {
  if (!hasBrowserStorage()) return;

  window.localStorage.removeItem(releaseEvidenceHistoryKey);
  window.localStorage.removeItem(pinnedReleaseEvidenceKey);
}

function normalizeReleaseEvidenceHistoryEntry(value: unknown) {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<ReleaseEvidenceHistoryEntry>;
  if (typeof candidate.savedAt !== "number" || !Number.isFinite(candidate.savedAt)) return null;
  if (!isReleaseEvidencePacket(candidate.packet)) return null;

  return createReleaseEvidenceHistoryEntry(candidate.packet, candidate.savedAt);
}

function isReleaseEvidencePacket(value: unknown): value is ReleaseEvidencePacket {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ReleaseEvidencePacket>;
  return candidate.schemaVersion === 1 && typeof candidate.exportedAt === "string" && Boolean(candidate.report) && Boolean(candidate.evidence);
}

function createReleaseEvidenceHistoryEntryId(packet: ReleaseEvidencePacket, savedAt: number) {
  const proofId = packet.evidence.desktopVerificationId || packet.evidence.deploymentUrl || packet.exportedAt || "local";
  return `release_evidence_${savedAt}_${proofId.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 72)}`;
}

function hasBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
