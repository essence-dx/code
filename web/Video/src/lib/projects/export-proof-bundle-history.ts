"use client";

import { normalizeExportProofBundle, type ExportProofBundle } from "@/lib/projects/export-proof-bundle";

export interface ExportProofBundleHistoryEntry {
  id: string;
  importedAt: string;
  bundle: ExportProofBundle;
}

const proofBundleHistoryStorageKey = "essence.export.proof-bundle.imports.v1";
const maxProofBundleHistoryEntries = 12;

export function importExportProofBundle(value: unknown) {
  const bundle = normalizeExportProofBundle(value);
  if (!bundle) return null;

  const entry: ExportProofBundleHistoryEntry = {
    id: `proof_import_${Date.now()}_${bundle.reviewId.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 72)}`,
    importedAt: new Date().toISOString(),
    bundle,
  };
  const entries = [entry, ...loadExportProofBundleHistory().filter((item) => item.bundle.id !== bundle.id)]
    .sort((first, second) => second.importedAt.localeCompare(first.importedAt))
    .slice(0, maxProofBundleHistoryEntries);

  saveExportProofBundleHistory(entries);
  return entry;
}

export function loadExportProofBundleHistory() {
  if (!hasBrowserStorage()) return [] as ExportProofBundleHistoryEntry[];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(proofBundleHistoryStorageKey) ?? "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .flatMap((entry) => {
        const normalized = normalizeExportProofBundleHistoryEntry(entry);
        return normalized ? [normalized] : [];
      })
      .sort((first, second) => second.importedAt.localeCompare(first.importedAt))
      .slice(0, maxProofBundleHistoryEntries);
  } catch {
    return [];
  }
}

export function findImportedProofBundleForReview(reviewId: string) {
  return loadExportProofBundleHistory().find((entry) => entry.bundle.reviewId === reviewId)?.bundle ?? null;
}

export function clearImportedProofBundle(reviewId: string) {
  const entries = loadExportProofBundleHistory().filter((entry) => entry.bundle.reviewId !== reviewId);
  saveExportProofBundleHistory(entries);
  return entries;
}

function saveExportProofBundleHistory(entries: ExportProofBundleHistoryEntry[]) {
  if (hasBrowserStorage()) {
    window.localStorage.setItem(proofBundleHistoryStorageKey, JSON.stringify(entries));
  }
}

function normalizeExportProofBundleHistoryEntry(value: unknown): ExportProofBundleHistoryEntry | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<ExportProofBundleHistoryEntry>;
  const bundle = normalizeExportProofBundle(candidate.bundle);
  if (!candidate.id || !candidate.importedAt || !bundle) return null;

  return {
    id: candidate.id,
    importedAt: candidate.importedAt,
    bundle,
  };
}

function hasBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
