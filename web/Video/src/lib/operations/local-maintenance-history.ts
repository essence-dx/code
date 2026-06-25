import type { EditorProject } from "@/lib/editor/types";
import type { LocalMaintenanceReport, LocalMaintenanceStatus } from "@/lib/operations/local-maintenance-center";

export type LocalMaintenanceHistoryFilter = "all" | "ready" | "draft" | "blocked";
export type LocalMaintenanceHistoryLabel = "Ready" | "Draft" | "Blocked";

export interface LocalMaintenanceEvidenceProject {
  id: string;
  title: string;
  updatedAt: string;
  aspectRatio: string;
  duration: number;
  layerCount: number;
  mediaAssetCount: number;
  exportJobCount: number;
}

export interface LocalMaintenanceEvidencePacket {
  schemaVersion: 1;
  exportedAt: string;
  project: LocalMaintenanceEvidenceProject;
  report: LocalMaintenanceReport;
}

export interface LocalMaintenanceHistoryEntry {
  id: string;
  savedAt: string;
  label: LocalMaintenanceHistoryLabel;
  score: number;
  readyCount: number;
  attentionCount: number;
  blockedCount: number;
  projectId: string;
  projectTitle: string;
  packet: LocalMaintenanceEvidencePacket;
}

export interface LocalMaintenanceEvidenceMetrics {
  mediaAssetCount?: number;
  exportJobCount?: number;
}

const maintenanceHistoryStorageKey = "essence.local-maintenance.history.v1";
const maxMaintenanceHistoryEntries = 10;

export function createLocalMaintenanceEvidencePacket(
  project: EditorProject,
  report: LocalMaintenanceReport,
  exportedAt = new Date().toISOString(),
  metrics: LocalMaintenanceEvidenceMetrics = {},
): LocalMaintenanceEvidencePacket {
  return {
    schemaVersion: 1,
    exportedAt,
    project: {
      id: project.id,
      title: project.title,
      updatedAt: project.updatedAt,
      aspectRatio: project.aspectRatio,
      duration: project.duration,
      layerCount: project.layers.length,
      mediaAssetCount: metrics.mediaAssetCount ?? countUniqueMediaAssets(project),
      exportJobCount: metrics.exportJobCount ?? 0,
    },
    report,
  };
}

export function createLocalMaintenanceHistoryEntry(
  packet: LocalMaintenanceEvidencePacket,
  savedAt = packet.exportedAt,
): LocalMaintenanceHistoryEntry {
  return {
    id: createMaintenanceHistoryEntryId(packet, savedAt),
    savedAt,
    label: localMaintenanceHistoryLabelForReport(packet.report),
    score: packet.report.score,
    readyCount: packet.report.readyCount,
    attentionCount: packet.report.attentionCount,
    blockedCount: packet.report.blockedCount,
    projectId: packet.project.id,
    projectTitle: packet.project.title,
    packet,
  };
}

export function saveLocalMaintenanceHistoryEntry(packet: LocalMaintenanceEvidencePacket, savedAt = new Date().toISOString()) {
  const entry = createLocalMaintenanceHistoryEntry(packet, savedAt);
  const entries = [entry, ...loadLocalMaintenanceHistory().filter((item) => item.id !== entry.id)]
    .sort((first, second) => second.savedAt.localeCompare(first.savedAt))
    .slice(0, maxMaintenanceHistoryEntries);

  saveLocalMaintenanceHistory(entries);
  return entries;
}

export function loadLocalMaintenanceHistory() {
  if (!hasBrowserStorage()) return [] as LocalMaintenanceHistoryEntry[];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(maintenanceHistoryStorageKey) ?? "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .flatMap((entry) => {
        const normalized = normalizeLocalMaintenanceHistoryEntry(entry);
        return normalized ? [normalized] : [];
      })
      .sort((first, second) => second.savedAt.localeCompare(first.savedAt))
      .slice(0, maxMaintenanceHistoryEntries);
  } catch {
    return [];
  }
}

export function filterLocalMaintenanceHistory(entries: LocalMaintenanceHistoryEntry[], filter: LocalMaintenanceHistoryFilter) {
  if (filter === "all") return entries;

  return entries.filter((entry) => entry.label.toLowerCase() === filter);
}

export function localMaintenanceHistoryLabel(entry: LocalMaintenanceHistoryEntry) {
  return entry.label;
}

export function createDownloadableLocalMaintenanceEvidencePacket(
  project: EditorProject,
  report: LocalMaintenanceReport,
  exportedAt = new Date().toISOString(),
  metrics: LocalMaintenanceEvidenceMetrics = {},
) {
  return createLocalMaintenanceEvidencePacket(project, report, exportedAt, metrics);
}

export function downloadLocalMaintenanceEvidencePacket(
  project: EditorProject,
  report: LocalMaintenanceReport,
  metrics: LocalMaintenanceEvidenceMetrics = {},
) {
  if (!canDownloadFile()) return false;

  const packet = createDownloadableLocalMaintenanceEvidencePacket(project, report, new Date().toISOString(), metrics);
  const blob = new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `essence-maintenance-evidence-${formatEvidenceTimestamp(packet.exportedAt)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return true;
}

export function normalizeLocalMaintenanceEvidencePacket(value: unknown): LocalMaintenanceEvidencePacket | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<LocalMaintenanceEvidencePacket>;
  const project = normalizeMaintenanceEvidenceProject(candidate.project);
  const report = normalizeMaintenanceReport(candidate.report);

  if (candidate.schemaVersion !== 1 || typeof candidate.exportedAt !== "string" || !project || !report) return null;

  return {
    schemaVersion: 1,
    exportedAt: candidate.exportedAt,
    project,
    report,
  };
}

export function clearLocalMaintenanceHistory() {
  if (hasBrowserStorage()) {
    window.localStorage.removeItem(maintenanceHistoryStorageKey);
  }

  return [] as LocalMaintenanceHistoryEntry[];
}

function saveLocalMaintenanceHistory(entries: LocalMaintenanceHistoryEntry[]) {
  if (hasBrowserStorage()) {
    window.localStorage.setItem(maintenanceHistoryStorageKey, JSON.stringify(entries));
  }
}

function normalizeLocalMaintenanceHistoryEntry(value: unknown): LocalMaintenanceHistoryEntry | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<LocalMaintenanceHistoryEntry>;
  const packet = normalizeLocalMaintenanceEvidencePacket(candidate.packet);
  if (!candidate.id || typeof candidate.savedAt !== "string" || !packet) return null;

  return createLocalMaintenanceHistoryEntry(packet, candidate.savedAt);
}

function normalizeMaintenanceEvidenceProject(value: unknown): LocalMaintenanceEvidenceProject | null {
  if (!value || typeof value !== "object") return null;

  const project = value as Partial<LocalMaintenanceEvidenceProject>;
  if (!project.id || !project.title || !project.updatedAt || !project.aspectRatio) return null;

  return {
    id: project.id,
    title: project.title,
    updatedAt: project.updatedAt,
    aspectRatio: project.aspectRatio,
    duration: normalizeNumber(project.duration),
    layerCount: normalizeNumber(project.layerCount),
    mediaAssetCount: normalizeNumber(project.mediaAssetCount),
    exportJobCount: normalizeNumber(project.exportJobCount),
  };
}

function normalizeMaintenanceReport(value: unknown): LocalMaintenanceReport | null {
  if (!value || typeof value !== "object") return null;

  const report = value as Partial<LocalMaintenanceReport>;
  if (!isMaintenanceStatus(report.status) || !Array.isArray(report.items)) return null;

  return {
    score: normalizeNumber(report.score),
    status: report.status,
    readyCount: normalizeNumber(report.readyCount),
    attentionCount: normalizeNumber(report.attentionCount),
    blockedCount: normalizeNumber(report.blockedCount),
    items: report.items.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const candidate = item as {
        id?: unknown;
        label?: unknown;
        status?: unknown;
        count?: unknown;
        detail?: unknown;
        actionLabel?: unknown;
      };
      if (typeof candidate.id !== "string" || typeof candidate.label !== "string" || !isMaintenanceStatus(candidate.status)) return [];

      return [
        {
          id: candidate.id as LocalMaintenanceReport["items"][number]["id"],
          label: candidate.label,
          status: candidate.status,
          count: normalizeNumber(candidate.count),
          detail: typeof candidate.detail === "string" ? candidate.detail : "",
          actionLabel: typeof candidate.actionLabel === "string" ? candidate.actionLabel : undefined,
        },
      ];
    }),
  };
}

function localMaintenanceHistoryLabelForReport(report: LocalMaintenanceReport): LocalMaintenanceHistoryLabel {
  if (report.blockedCount > 0 || report.status === "blocked") return "Blocked";
  if (report.status === "ready") return "Ready";
  return "Draft";
}

function createMaintenanceHistoryEntryId(packet: LocalMaintenanceEvidencePacket, savedAt: string) {
  const proofId = `${packet.project.id}_${packet.project.title}_${savedAt}`;
  return `maintenance_${proofId.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 96)}`;
}

function countUniqueMediaAssets(project: EditorProject) {
  return new Set(project.layers.flatMap((layer) => (layer.assetId ? [layer.assetId] : []))).size;
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isMaintenanceStatus(value: unknown): value is LocalMaintenanceStatus {
  return value === "ready" || value === "attention" || value === "blocked";
}

function hasBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function canDownloadFile() {
  return typeof document !== "undefined" && typeof Blob !== "undefined" && typeof URL !== "undefined";
}

function formatEvidenceTimestamp(value: string) {
  return value.replace(/[:.]/g, "-");
}
