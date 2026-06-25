"use client";

import { createId } from "@/lib/editor/factory";
import { normalizeSelfHostedMediaUrl } from "@/lib/media/self-hosted-media";

export type SelfHostedUploadVerificationStatus = "verified" | "limited" | "failed";

export interface SelfHostedUploadVerificationResult {
  status: SelfHostedUploadVerificationStatus;
  publicUrl: string;
  checkedAt: number;
  httpStatus?: number;
  message: string;
}

export interface SelfHostedUploadHistoryEntry extends SelfHostedUploadVerificationResult {
  id: string;
  assetId: string;
  assetName: string;
}

export interface SelfHostedUploadHistoryInput extends SelfHostedUploadVerificationResult {
  assetId: string;
  assetName: string;
}

export interface SelfHostedUploadEvidencePacket {
  schemaVersion: 1;
  exportedAt: number;
  entryCount: number;
  verifiedCount: number;
  limitedCount: number;
  failedCount: number;
  entries: SelfHostedUploadHistoryEntry[];
}

const uploadHistoryStorageKey = "essence.selfHostedUploadHistory.v1";
const maxHistoryEntries = 12;

export async function verifySelfHostedUploadPublicUrl(publicUrl: string): Promise<SelfHostedUploadVerificationResult> {
  const normalizedUrl = normalizeSelfHostedMediaUrl(publicUrl);
  const checkedAt = Date.now();

  try {
    const response = await fetch(normalizedUrl, {
      cache: "no-store",
      credentials: "omit",
      method: "HEAD",
      mode: "cors",
    });

    return {
      status: response.ok ? "verified" : "failed",
      publicUrl: normalizedUrl,
      checkedAt,
      httpStatus: response.status,
      message: response.ok ? "Public media URL is reachable." : `Public media URL returned HTTP ${response.status}.`,
    };
  } catch {
    return {
      status: "limited",
      publicUrl: normalizedUrl,
      checkedAt,
      message: "Public media URL could not be checked from this browser.",
    };
  }
}

export function loadSelfHostedUploadHistory(): SelfHostedUploadHistoryEntry[] {
  if (!canUseLocalStorage()) return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(uploadHistoryStorageKey) ?? "[]");
    return normalizeHistory(parsed);
  } catch {
    return [];
  }
}

export function saveSelfHostedUploadHistoryEntry(input: SelfHostedUploadHistoryInput): SelfHostedUploadHistoryEntry[] {
  const entry: SelfHostedUploadHistoryEntry = {
    ...input,
    id: createId("upload_check"),
    assetId: cleanText(input.assetId, 120),
    assetName: cleanText(input.assetName, 160),
    publicUrl: normalizeSelfHostedMediaUrl(input.publicUrl),
    message: cleanText(input.message, 180),
  };
  const history = saveSelfHostedUploadHistory([entry, ...loadSelfHostedUploadHistory()]);
  return history;
}

export function createSelfHostedUploadEvidencePacket(entries = loadSelfHostedUploadHistory()): SelfHostedUploadEvidencePacket {
  return {
    schemaVersion: 1,
    exportedAt: Date.now(),
    entryCount: entries.length,
    verifiedCount: countEntries(entries, "verified"),
    limitedCount: countEntries(entries, "limited"),
    failedCount: countEntries(entries, "failed"),
    entries,
  };
}

export function downloadSelfHostedUploadEvidence(entries = loadSelfHostedUploadHistory()) {
  if (!canUseDocument()) return false;

  const packet = createSelfHostedUploadEvidencePacket(entries);
  const payload = JSON.stringify(packet, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `essence-upload-evidence-${formatEvidenceTimestamp(packet.exportedAt)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return true;
}

export async function importSelfHostedUploadEvidenceFile(file: Blob): Promise<SelfHostedUploadHistoryEntry[]> {
  const parsed = JSON.parse(await file.text()) as unknown;
  return importSelfHostedUploadEvidencePacket(parsed);
}

export function importSelfHostedUploadEvidencePacket(value: unknown): SelfHostedUploadHistoryEntry[] {
  const importedEntries = normalizeEvidencePacket(value);
  if (importedEntries.length === 0) return loadSelfHostedUploadHistory();
  return saveSelfHostedUploadHistory([...importedEntries, ...loadSelfHostedUploadHistory()]);
}

function saveSelfHostedUploadHistory(entries: SelfHostedUploadHistoryEntry[]) {
  const history = dedupeHistory(entries).slice(0, maxHistoryEntries);
  if (canUseLocalStorage()) {
    window.localStorage.setItem(uploadHistoryStorageKey, JSON.stringify(history));
  }

  return history;
}

function normalizeEvidencePacket(value: unknown) {
  if (!value || typeof value !== "object") return [];
  const packet = value as Partial<SelfHostedUploadEvidencePacket>;
  if (packet.schemaVersion !== 1 || !Array.isArray(packet.entries)) return [];
  return normalizeHistory(packet.entries);
}

function normalizeHistory(value: unknown): SelfHostedUploadHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const entry = normalizeHistoryEntry(item);
    return entry ? [entry] : [];
  }).slice(0, maxHistoryEntries);
}

function dedupeHistory(entries: SelfHostedUploadHistoryEntry[]) {
  const seen = new Set<string>();
  const deduped: SelfHostedUploadHistoryEntry[] = [];

  for (const entry of entries) {
    const key = `${entry.id}:${entry.publicUrl}:${entry.checkedAt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }

  return deduped;
}

function normalizeHistoryEntry(value: unknown): SelfHostedUploadHistoryEntry | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SelfHostedUploadHistoryEntry>;
  if (!candidate.id || !candidate.assetId || !candidate.assetName || !candidate.publicUrl || !candidate.checkedAt || !candidate.status) return null;
  if (!["verified", "limited", "failed"].includes(candidate.status)) return null;

  try {
    return {
      id: cleanText(candidate.id, 120),
      assetId: cleanText(candidate.assetId, 120),
      assetName: cleanText(candidate.assetName, 160),
      publicUrl: normalizeSelfHostedMediaUrl(candidate.publicUrl),
      checkedAt: candidate.checkedAt,
      status: candidate.status,
      httpStatus: normalizeHttpStatus(candidate.httpStatus),
      message: cleanText(candidate.message ?? "Upload check recorded.", 180),
    };
  } catch {
    return null;
  }
}

function normalizeHttpStatus(value: unknown) {
  const status = Number(value);
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined;
}

function cleanText(value: string, maxLength: number) {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function countEntries(entries: SelfHostedUploadHistoryEntry[], status: SelfHostedUploadVerificationStatus) {
  return entries.filter((entry) => entry.status === status).length;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function canUseDocument() {
  return typeof document !== "undefined" && typeof URL !== "undefined" && typeof Blob !== "undefined";
}

function formatEvidenceTimestamp(value: number) {
  return new Date(value).toISOString().replace(/[:.]/g, "-");
}
