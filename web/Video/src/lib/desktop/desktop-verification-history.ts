"use client";

import type { DesktopDiagnosticStatus } from "@/lib/desktop/desktop-diagnostics";
import type { DesktopVerificationReport, DesktopVerificationStep } from "@/lib/desktop/desktop-verification";

const verificationHistoryKey = "essence.desktop.verification.history.v1";
const desktopEvidenceDirectory = "desktop-verification";
const desktopEvidenceFilename = "latest-desktop-evidence.json";
const desktopEvidencePath = `${desktopEvidenceDirectory}/${desktopEvidenceFilename}`;
const maxHistoryEntries = 5;

export interface DesktopVerificationHistoryEntry {
  id: string;
  status: DesktopDiagnosticStatus;
  checkedAt: number;
  stepCount: number;
  readyCount: number;
  limitedCount: number;
  failedCount: number;
  steps: DesktopVerificationStep[];
}

export interface DesktopVerificationEvidencePacket {
  schemaVersion: 1;
  exportedAt: number;
  entryCount: number;
  entries: DesktopVerificationHistoryEntry[];
}

export interface DesktopVerificationEvidenceFile {
  path: string;
  entryCount: number;
  exportedAt: number;
}

export function loadDesktopVerificationHistory(): DesktopVerificationHistoryEntry[] {
  if (!canUseLocalStorage()) return [];

  try {
    const raw = window.localStorage.getItem(verificationHistoryKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((entry) => {
      const normalized = normalizeDesktopVerificationHistoryEntry(entry);
      return normalized ? [normalized] : [];
    });
  } catch {
    return [];
  }
}

export function saveDesktopVerificationReport(report: DesktopVerificationReport): DesktopVerificationHistoryEntry[] {
  const nextEntry = createHistoryEntry(report);
  return saveDesktopVerificationHistoryEntry(nextEntry);
}

export function importDesktopVerificationHistoryEntry(entry: DesktopVerificationHistoryEntry): DesktopVerificationHistoryEntry[] {
  return saveDesktopVerificationHistoryEntry(entry);
}

export function importDesktopVerificationEvidencePacket(value: unknown): DesktopVerificationHistoryEntry[] {
  return saveDesktopVerificationHistoryEntries(readDesktopVerificationEvidenceEntries(value));
}

export function readDesktopVerificationEvidenceEntries(value: unknown): DesktopVerificationHistoryEntry[] {
  if (Array.isArray(value)) {
    return value.flatMap(readDesktopVerificationEvidenceEntries);
  }

  const singleEntry = normalizeDesktopVerificationHistoryEntry(value);
  if (singleEntry) return [singleEntry];

  if (!value || typeof value !== "object") return [];
  const packet = value as Partial<DesktopVerificationEvidencePacket>;

  if (!Array.isArray(packet.entries)) return [];

  return packet.entries.flatMap((entry) => {
    const normalized = normalizeDesktopVerificationHistoryEntry(entry);
    return normalized ? [normalized] : [];
  });
}

function saveDesktopVerificationHistoryEntry(entry: DesktopVerificationHistoryEntry): DesktopVerificationHistoryEntry[] {
  return saveDesktopVerificationHistoryEntries([entry]);
}

function saveDesktopVerificationHistoryEntries(entries: DesktopVerificationHistoryEntry[]): DesktopVerificationHistoryEntry[] {
  const normalizedEntries = entries.flatMap((entry) => {
    const normalized = normalizeDesktopVerificationHistoryEntry(entry);
    return normalized ? [normalized] : [];
  });

  if (!normalizedEntries.length) return loadDesktopVerificationHistory();
  const seenIds = new Set<string>();

  const history = [...normalizedEntries, ...loadDesktopVerificationHistory()]
    .filter((entry) => {
      if (seenIds.has(entry.id)) return false;
      seenIds.add(entry.id);
      return true;
    })
    .sort((first, second) => second.checkedAt - first.checkedAt)
    .slice(0, maxHistoryEntries);

  if (!canUseLocalStorage()) return history;

  try {
    window.localStorage.setItem(verificationHistoryKey, JSON.stringify(history));
  } catch {
    return history;
  }

  return history;
}

export function createDesktopVerificationEvidencePacket(
  entries = loadDesktopVerificationHistory(),
): DesktopVerificationEvidencePacket {
  return {
    schemaVersion: 1,
    exportedAt: Date.now(),
    entryCount: entries.length,
    entries,
  };
}

export function downloadDesktopVerificationEvidence(entries = loadDesktopVerificationHistory()) {
  if (!canUseDocument()) return false;

  const packet = createDesktopVerificationEvidencePacket(entries);
  const payload = JSON.stringify(packet, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `essence-desktop-evidence-${formatEvidenceTimestamp(packet.exportedAt)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return true;
}

export async function writeDesktopVerificationEvidenceToAppLocalData(
  entries = loadDesktopVerificationHistory(),
): Promise<DesktopVerificationEvidenceFile> {
  const packet = createDesktopVerificationEvidencePacket(entries);
  const { BaseDirectory, exists, mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
  const hasDirectory = await exists(desktopEvidenceDirectory, { baseDir: BaseDirectory.AppLocalData }).catch(() => false);

  if (!hasDirectory) {
    await mkdir(desktopEvidenceDirectory, { baseDir: BaseDirectory.AppLocalData, recursive: true });
  }

  await writeTextFile(desktopEvidencePath, `${JSON.stringify(packet, null, 2)}\n`, {
    baseDir: BaseDirectory.AppLocalData,
  });

  return {
    path: desktopEvidencePath,
    entryCount: packet.entryCount,
    exportedAt: packet.exportedAt,
  };
}

function createHistoryEntry(report: DesktopVerificationReport): DesktopVerificationHistoryEntry {
  return {
    id: `desktop_verification_${report.checkedAt}`,
    status: report.status,
    checkedAt: report.checkedAt,
    stepCount: report.steps.length,
    readyCount: countSteps(report.steps, "ready"),
    limitedCount: countSteps(report.steps, "limited"),
    failedCount: countSteps(report.steps, "failed"),
    steps: report.steps,
  };
}

export function normalizeDesktopVerificationHistoryEntry(value: unknown): DesktopVerificationHistoryEntry | null {
  if (!value || typeof value !== "object") return null;

  const entry = value as Partial<DesktopVerificationHistoryEntry>;
  if (!entry.id || !entry.checkedAt || !entry.status || !Array.isArray(entry.steps)) return null;
  if (!["ready", "limited", "failed"].includes(entry.status)) return null;

  return {
    id: entry.id,
    status: entry.status,
    checkedAt: entry.checkedAt,
    stepCount: entry.stepCount ?? entry.steps.length,
    readyCount: entry.readyCount ?? countSteps(entry.steps, "ready"),
    limitedCount: entry.limitedCount ?? countSteps(entry.steps, "limited"),
    failedCount: entry.failedCount ?? countSteps(entry.steps, "failed"),
    steps: entry.steps,
  };
}

function countSteps(steps: DesktopVerificationStep[], status: DesktopDiagnosticStatus) {
  return steps.filter((step) => step.status === status).length;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function canUseDocument() {
  return typeof document !== "undefined" && typeof URL !== "undefined" && typeof Blob !== "undefined";
}

function formatEvidenceTimestamp(value: number) {
  return new Date(value).toISOString().replace(/[:.]/g, "-");
}
