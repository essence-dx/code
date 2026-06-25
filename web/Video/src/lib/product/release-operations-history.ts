import { getReleaseScreenshotProof, hasReleaseDeploymentProof, type ReleaseEvidence, type ReleaseEvidenceSummary } from "@/lib/product/release-evidence";
import type { ReleaseEvidenceHistoryEntry } from "@/lib/product/release-evidence-history";
import type { LocalMaintenanceHistoryEntry } from "@/lib/operations/local-maintenance-history";
import type { ExportProofBundleHistoryEntry } from "@/lib/projects/export-proof-bundle-history";

export type ReleaseOperationsStatus = "ready" | "draft" | "blocked";
export type ReleaseOperationsHistoryFilter = "all" | ReleaseOperationsStatus;

export interface ReleaseOperationsPacket {
  schemaVersion: 1;
  exportedAt: string;
  status: ReleaseOperationsStatus;
  releaseEvidence: {
    status: ReleaseEvidenceSummary["status"];
    score: number;
    readyCount: number;
    total: number;
    updatedAt: number | null;
    historyId: string;
    historyStatus: string;
  };
  deploymentProof: {
    ready: boolean;
    deploymentUrl: string;
    screenshotProof: string;
    desktopVerificationId: string;
    desktopVerificationCheckedAt: number | null;
  };
  maintenanceEvidence: {
    status: ReleaseOperationsStatus;
    historyId: string;
    savedAt: string;
    projectTitle: string;
    score: number;
    blockedCount: number;
  };
  reviewHandoff: {
    status: ReleaseOperationsStatus;
    historyId: string;
    importedAt: string;
    reviewId: string;
    outputName: string;
    generatedAt: string;
  };
}

export interface ReleaseOperationsPacketInput {
  releaseEvidence: ReleaseEvidence;
  releaseEvidenceSummary: ReleaseEvidenceSummary;
  releaseHistoryEntry?: Pick<ReleaseEvidenceHistoryEntry, "id" | "auditStatus" | "savedAt"> | null;
  maintenanceHistoryEntry?: Pick<LocalMaintenanceHistoryEntry, "id" | "label" | "savedAt" | "projectTitle" | "score" | "blockedCount"> | null;
  proofBundleEntry?: Pick<ExportProofBundleHistoryEntry, "id" | "importedAt" | "bundle"> | null;
  exportedAt?: string;
}

export interface ReleaseOperationsHistoryEntry {
  id: string;
  savedAt: string;
  status: ReleaseOperationsStatus;
  releaseScore: number;
  deploymentReady: boolean;
  maintenanceStatus: ReleaseOperationsStatus;
  maintenanceScore: number;
  reviewHandoffStatus: ReleaseOperationsStatus;
  packet: ReleaseOperationsPacket;
}

const releaseOperationsHistoryKey = "essence.release.operations.history.v1";
const maxReleaseOperationsHistoryEntries = 8;

export function createReleaseOperationsPacket(input: ReleaseOperationsPacketInput): ReleaseOperationsPacket {
  const exportedAt = input.exportedAt ?? new Date().toISOString();
  const deploymentReady = hasReleaseDeploymentProof(input.releaseEvidence);
  const maintenanceStatus = maintenanceOperationsStatus(input.maintenanceHistoryEntry);
  const reviewHandoffStatus = reviewOperationsStatus(input.proofBundleEntry);
  const releaseReady = input.releaseEvidenceSummary.status === "ready";
  const status = overallReleaseOperationsStatus({
    releaseReady,
    deploymentReady,
    maintenanceStatus,
    reviewHandoffStatus,
  });

  return {
    schemaVersion: 1,
    exportedAt,
    status,
    releaseEvidence: {
      status: input.releaseEvidenceSummary.status,
      score: input.releaseEvidenceSummary.score,
      readyCount: input.releaseEvidenceSummary.readyCount,
      total: input.releaseEvidenceSummary.total,
      updatedAt: input.releaseEvidence.updatedAt,
      historyId: input.releaseHistoryEntry?.id ?? "",
      historyStatus: input.releaseHistoryEntry?.auditStatus ?? "unsaved",
    },
    deploymentProof: {
      ready: deploymentReady,
      deploymentUrl: input.releaseEvidence.deploymentUrl,
      screenshotProof: getReleaseScreenshotProof(input.releaseEvidence),
      desktopVerificationId: input.releaseEvidence.desktopVerificationId,
      desktopVerificationCheckedAt: input.releaseEvidence.desktopVerificationCheckedAt,
    },
    maintenanceEvidence: {
      status: maintenanceStatus,
      historyId: input.maintenanceHistoryEntry?.id ?? "",
      savedAt: input.maintenanceHistoryEntry?.savedAt ?? "",
      projectTitle: input.maintenanceHistoryEntry?.projectTitle ?? "",
      score: input.maintenanceHistoryEntry?.score ?? 0,
      blockedCount: input.maintenanceHistoryEntry?.blockedCount ?? 0,
    },
    reviewHandoff: {
      status: reviewHandoffStatus,
      historyId: input.proofBundleEntry?.id ?? "",
      importedAt: input.proofBundleEntry?.importedAt ?? "",
      reviewId: input.proofBundleEntry?.bundle.reviewId ?? "",
      outputName: input.proofBundleEntry?.bundle.outputName ?? "",
      generatedAt: input.proofBundleEntry?.bundle.generatedAt ?? "",
    },
  };
}

export function createReleaseOperationsHistoryEntry(
  packet: ReleaseOperationsPacket,
  savedAt = new Date().toISOString(),
): ReleaseOperationsHistoryEntry {
  return {
    id: createReleaseOperationsHistoryId(packet, savedAt),
    savedAt,
    status: packet.status,
    releaseScore: packet.releaseEvidence.score,
    deploymentReady: packet.deploymentProof.ready,
    maintenanceStatus: packet.maintenanceEvidence.status,
    maintenanceScore: packet.maintenanceEvidence.score,
    reviewHandoffStatus: packet.reviewHandoff.status,
    packet,
  };
}

export function saveReleaseOperationsHistoryEntry(packet: ReleaseOperationsPacket, savedAt = new Date().toISOString()) {
  const entry = createReleaseOperationsHistoryEntry(packet, savedAt);
  const entries = [entry, ...loadReleaseOperationsHistory().filter((item) => item.id !== entry.id)]
    .sort((first, second) => second.savedAt.localeCompare(first.savedAt))
    .slice(0, maxReleaseOperationsHistoryEntries);

  if (hasBrowserStorage()) {
    window.localStorage.setItem(releaseOperationsHistoryKey, JSON.stringify(entries));
  }

  return entries;
}

export function loadReleaseOperationsHistory() {
  if (!hasBrowserStorage()) return [] as ReleaseOperationsHistoryEntry[];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(releaseOperationsHistoryKey) ?? "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .flatMap((entry) => {
        const normalized = normalizeReleaseOperationsHistoryEntry(entry);
        return normalized ? [normalized] : [];
      })
      .sort((first, second) => second.savedAt.localeCompare(first.savedAt))
      .slice(0, maxReleaseOperationsHistoryEntries);
  } catch {
    return [];
  }
}

export function filterReleaseOperationsHistory(entries: ReleaseOperationsHistoryEntry[], filter: ReleaseOperationsHistoryFilter) {
  if (filter === "all") return entries;
  return entries.filter((entry) => entry.status === filter);
}

export function downloadReleaseOperationsPacket(packet: ReleaseOperationsPacket) {
  if (typeof document === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") return false;

  const blob = new Blob([`${JSON.stringify(packet, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `essence-release-operations-${packet.exportedAt.replace(/[:.]/g, "-")}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return true;
}

export function releaseOperationsStatusLabel(status: ReleaseOperationsStatus) {
  if (status === "ready") return "Ready";
  if (status === "blocked") return "Blocked";
  return "Draft";
}

function normalizeReleaseOperationsHistoryEntry(value: unknown): ReleaseOperationsHistoryEntry | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<ReleaseOperationsHistoryEntry>;
  const packet = normalizeReleaseOperationsPacket(candidate.packet);
  if (!candidate.id || !candidate.savedAt || !packet) return null;

  return createReleaseOperationsHistoryEntry(packet, candidate.savedAt);
}

function normalizeReleaseOperationsPacket(value: unknown): ReleaseOperationsPacket | null {
  if (!value || typeof value !== "object") return null;

  const packet = value as Partial<ReleaseOperationsPacket>;
  if (packet.schemaVersion !== 1 || typeof packet.exportedAt !== "string" || !isOperationsStatus(packet.status)) return null;
  if (!packet.releaseEvidence || !packet.deploymentProof || !packet.maintenanceEvidence || !packet.reviewHandoff) return null;

  return packet as ReleaseOperationsPacket;
}

function maintenanceOperationsStatus(entry: ReleaseOperationsPacketInput["maintenanceHistoryEntry"]): ReleaseOperationsStatus {
  if (!entry) return "draft";
  if (entry.label === "Blocked" || entry.blockedCount > 0) return "blocked";
  if (entry.label === "Ready") return "ready";
  return "draft";
}

function reviewOperationsStatus(entry: ReleaseOperationsPacketInput["proofBundleEntry"]): ReleaseOperationsStatus {
  if (!entry) return "draft";
  if (entry.bundle.status === "blocked") return "blocked";
  if (entry.bundle.status === "ready") return "ready";
  return "draft";
}

function overallReleaseOperationsStatus(input: {
  releaseReady: boolean;
  deploymentReady: boolean;
  maintenanceStatus: ReleaseOperationsStatus;
  reviewHandoffStatus: ReleaseOperationsStatus;
}): ReleaseOperationsStatus {
  if (input.maintenanceStatus === "blocked" || input.reviewHandoffStatus === "blocked") return "blocked";
  if (input.releaseReady && input.deploymentReady && input.maintenanceStatus === "ready" && input.reviewHandoffStatus === "ready") return "ready";
  return "draft";
}

function createReleaseOperationsHistoryId(packet: ReleaseOperationsPacket, savedAt: string) {
  const proofId = `${packet.deploymentProof.deploymentUrl}_${packet.reviewHandoff.reviewId}_${savedAt}`;
  return `release_operations_${proofId.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 96)}`;
}

function isOperationsStatus(value: unknown): value is ReleaseOperationsStatus {
  return value === "ready" || value === "draft" || value === "blocked";
}

function hasBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
