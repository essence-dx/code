"use client";

import type { SelfHostedUploadProfile } from "@/lib/media/self-hosted-upload-profiles";
import { createSelfHostedPublicUrl } from "@/lib/media/self-hosted-upload-profiles";

export type SelfHostedUploadProfileReadinessStatus = "ready" | "limited" | "failed";

export interface SelfHostedUploadProfileReadinessStep {
  id: "public-base-url" | "secure-url" | "derived-public-url" | "cors-head";
  label: string;
  status: SelfHostedUploadProfileReadinessStatus;
  detail: string;
}

export interface SelfHostedUploadProfileReadinessReport {
  profileId: string;
  profileName: string;
  checkedAt: number;
  status: SelfHostedUploadProfileReadinessStatus;
  probeUrl: string;
  steps: SelfHostedUploadProfileReadinessStep[];
}

export interface SelfHostedUploadProfileReadinessEvidencePacket {
  schemaVersion: 1;
  exportedAt: number;
  reportCount: number;
  readyCount: number;
  limitedCount: number;
  failedCount: number;
  reports: SelfHostedUploadProfileReadinessReport[];
}

const readinessHistoryStorageKey = "essence.selfHostedUploadProfileReadiness.history.v1";
export const maxReadinessHistoryEntries = 12;

export async function checkSelfHostedUploadProfileReadiness(
  profile: SelfHostedUploadProfile,
  fileName = "essence-upload-readiness.txt",
): Promise<SelfHostedUploadProfileReadinessReport> {
  const steps: SelfHostedUploadProfileReadinessStep[] = [
    checkPublicBaseUrl(profile),
    checkSecureUrl(profile),
  ];
  const probeUrl = createSelfHostedPublicUrl(profile, fileName);

  steps.push(checkDerivedPublicUrl(probeUrl));
  steps.push(await checkCorsHead(probeUrl));

  return {
    profileId: profile.id,
    profileName: profile.name,
    checkedAt: Date.now(),
    status: summarizeStatus(steps),
    probeUrl,
    steps,
  };
}

export function loadSelfHostedUploadProfileReadinessHistory(): SelfHostedUploadProfileReadinessReport[] {
  if (!hasLocalStorage()) return [];

  try {
    const stored = window.localStorage.getItem(readinessHistoryStorageKey);
    return normalizeReadinessHistory(stored ? JSON.parse(stored) : []);
  } catch {
    return [];
  }
}

export function saveSelfHostedUploadProfileReadinessReport(report: SelfHostedUploadProfileReadinessReport) {
  const normalizedReport = normalizeReadinessReport(report);
  return saveSelfHostedUploadProfileReadinessHistory([
    ...(normalizedReport ? [normalizedReport] : []),
    ...loadSelfHostedUploadProfileReadinessHistory(),
  ]);
}

export function createSelfHostedUploadProfileReadinessEvidencePacket(
  reports = loadSelfHostedUploadProfileReadinessHistory(),
): SelfHostedUploadProfileReadinessEvidencePacket {
  const normalizedReports = normalizeReadinessHistory(reports);

  return {
    schemaVersion: 1,
    exportedAt: Date.now(),
    reportCount: normalizedReports.length,
    readyCount: countReports(normalizedReports, "ready"),
    limitedCount: countReports(normalizedReports, "limited"),
    failedCount: countReports(normalizedReports, "failed"),
    reports: normalizedReports,
  };
}

export function downloadSelfHostedUploadProfileReadinessEvidence(reports = loadSelfHostedUploadProfileReadinessHistory()) {
  if (!canUseDocument()) return false;

  const packet = createSelfHostedUploadProfileReadinessEvidencePacket(reports);
  const payload = JSON.stringify(packet, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `essence-profile-readiness-evidence-${formatEvidenceTimestamp(packet.exportedAt)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return true;
}

export async function importSelfHostedUploadProfileReadinessEvidenceFile(file: Blob): Promise<SelfHostedUploadProfileReadinessReport[]> {
  const parsed = JSON.parse(await file.text()) as unknown;
  return importSelfHostedUploadProfileReadinessEvidencePacket(parsed);
}

export function importSelfHostedUploadProfileReadinessEvidencePacket(value: unknown) {
  const importedReports = normalizeEvidencePacket(value);
  if (importedReports.length === 0) return loadSelfHostedUploadProfileReadinessHistory();
  return saveSelfHostedUploadProfileReadinessHistory([...importedReports, ...loadSelfHostedUploadProfileReadinessHistory()]);
}

function saveSelfHostedUploadProfileReadinessHistory(reports: SelfHostedUploadProfileReadinessReport[]) {
  const history = dedupeReadinessHistory(reports).slice(0, maxReadinessHistoryEntries);

  if (!hasLocalStorage()) return history;

  try {
    window.localStorage.setItem(readinessHistoryStorageKey, JSON.stringify(history));
  } catch {
    return history;
  }

  return history;
}

function normalizeEvidencePacket(value: unknown) {
  if (!isRecord(value)) return [];
  const packet = value as Partial<SelfHostedUploadProfileReadinessEvidencePacket>;
  if (packet.schemaVersion !== 1 || !Array.isArray(packet.reports)) return [];
  return normalizeReadinessHistory(packet.reports);
}

function checkPublicBaseUrl(profile: SelfHostedUploadProfile): SelfHostedUploadProfileReadinessStep {
  return {
    id: "public-base-url",
    label: "Public base URL",
    status: profile.publicBaseUrl ? "ready" : "failed",
    detail: profile.publicBaseUrl ? "Profile has a reusable public folder URL." : "Profile needs a public folder URL.",
  };
}

function checkSecureUrl(profile: SelfHostedUploadProfile): SelfHostedUploadProfileReadinessStep {
  return {
    id: "secure-url",
    label: "Secure delivery",
    status: profile.publicBaseUrl.startsWith("https://") ? "ready" : "limited",
    detail: profile.publicBaseUrl.startsWith("https://")
      ? "Public files use HTTPS."
      : "HTTP can work locally, but HTTPS is safer for shared projects and deployed previews.",
  };
}

function checkDerivedPublicUrl(probeUrl: string): SelfHostedUploadProfileReadinessStep {
  try {
    const url = new URL(probeUrl);
    return {
      id: "derived-public-url",
      label: "Derived file URL",
      status: url.protocol === "https:" || url.protocol === "http:" ? "ready" : "failed",
      detail: "Profile can derive a per-file public URL.",
    };
  } catch {
    return {
      id: "derived-public-url",
      label: "Derived file URL",
      status: "failed",
      detail: "Profile could not derive a valid public file URL.",
    };
  }
}

async function checkCorsHead(probeUrl: string): Promise<SelfHostedUploadProfileReadinessStep> {
  try {
    const response = await fetch(probeUrl, {
      cache: "no-store",
      credentials: "omit",
      method: "HEAD",
      mode: "cors",
    });

    if (response.ok) {
      return {
        id: "cors-head",
        label: "Browser CORS check",
        status: "ready",
        detail: "Browser can read a HEAD response from this public URL.",
      };
    }

    return {
      id: "cors-head",
      label: "Browser CORS check",
      status: "limited",
      detail: `Storage returned HTTP ${response.status}. CORS is reachable, but the probe file may not exist yet.`,
    };
  } catch {
    return {
      id: "cors-head",
      label: "Browser CORS check",
      status: "failed",
      detail: "Browser could not read this public URL. Check CORS and public access rules.",
    };
  }
}

function summarizeStatus(steps: SelfHostedUploadProfileReadinessStep[]): SelfHostedUploadProfileReadinessStatus {
  if (steps.some((step) => step.status === "failed")) return "failed";
  if (steps.some((step) => step.status === "limited")) return "limited";
  return "ready";
}

function normalizeReadinessHistory(value: unknown): SelfHostedUploadProfileReadinessReport[] {
  if (!Array.isArray(value)) return [];

  return dedupeReadinessHistory(value.map(normalizeReadinessReport).filter(isReadinessReport)).slice(0, maxReadinessHistoryEntries);
}

function normalizeReadinessReport(value: unknown): SelfHostedUploadProfileReadinessReport | null {
  if (!isRecord(value)) return null;
  const { checkedAt, profileId, profileName, probeUrl, status, steps } = value;

  if (typeof profileId !== "string" || !profileId.trim()) return null;
  if (typeof profileName !== "string" || !profileName.trim()) return null;
  if (typeof probeUrl !== "string" || !probeUrl.trim()) return null;
  if (typeof checkedAt !== "number" || !Number.isFinite(checkedAt)) return null;
  if (!isReadinessStatus(status)) return null;

  const normalizedSteps = Array.isArray(steps) ? steps.map(normalizeReadinessStep).filter(isReadinessStep) : [];
  if (normalizedSteps.length === 0) return null;

  return {
    checkedAt,
    profileId,
    profileName,
    probeUrl,
    status,
    steps: normalizedSteps,
  };
}

function normalizeReadinessStep(value: unknown): SelfHostedUploadProfileReadinessStep | null {
  if (!isRecord(value)) return null;
  const { detail, id, label, status } = value;

  if (!isReadinessStepId(id)) return null;
  if (!isReadinessStatus(status)) return null;
  if (typeof label !== "string" || !label.trim()) return null;
  if (typeof detail !== "string" || !detail.trim()) return null;

  return {
    detail,
    id,
    label,
    status,
  };
}

function dedupeReadinessHistory(reports: SelfHostedUploadProfileReadinessReport[]) {
  const seen = new Set<string>();

  return [...reports]
    .sort((left, right) => right.checkedAt - left.checkedAt)
    .filter((report) => {
      const key = `${report.profileId}:${report.checkedAt}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function canUseDocument() {
  return typeof document !== "undefined" && typeof URL !== "undefined" && typeof Blob !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isReadinessStatus(value: unknown): value is SelfHostedUploadProfileReadinessStatus {
  return value === "ready" || value === "limited" || value === "failed";
}

function isReadinessReport(value: SelfHostedUploadProfileReadinessReport | null): value is SelfHostedUploadProfileReadinessReport {
  return Boolean(value);
}

function isReadinessStep(value: SelfHostedUploadProfileReadinessStep | null): value is SelfHostedUploadProfileReadinessStep {
  return Boolean(value);
}

function isReadinessStepId(value: unknown): value is SelfHostedUploadProfileReadinessStep["id"] {
  return value === "public-base-url" || value === "secure-url" || value === "derived-public-url" || value === "cors-head";
}

function countReports(reports: SelfHostedUploadProfileReadinessReport[], status: SelfHostedUploadProfileReadinessStatus) {
  return reports.filter((report) => report.status === status).length;
}

function formatEvidenceTimestamp(value: number) {
  return new Date(value).toISOString().replace(/[:.]/g, "-");
}
