import { Buffer } from "node:buffer";
import type { AdminWorkspaceOperationsStatus } from "@/features/admin/admin-workspace-operations-types";

export const DEFAULT_WORKSPACE_OPERATIONS_STORAGE_BUDGET_BYTES =
  100 * 1024 * 1024;
export const DEPLOY_SMOKE_REVIEW_HOURS = 72;
export const DEPLOY_SMOKE_BLOCKED_HOURS = 168;

export function getDocumentByteSize(document: unknown) {
  try {
    return Buffer.byteLength(JSON.stringify(document), "utf8");
  } catch {
    return 0;
  }
}

export function getAgeHours(value: string, now: number) {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return Math.max(0, (now - timestamp) / (1000 * 60 * 60));
}

export function getLatestDate(values: string[]) {
  return values
    .map((value) => {
      const timestamp = new Date(value).getTime();
      return Number.isFinite(timestamp) ? { value, timestamp } : null;
    })
    .filter((value): value is { value: string; timestamp: number } =>
      Boolean(value),
    )
    .sort((left, right) => right.timestamp - left.timestamp)[0]?.value ?? null;
}

export function isRecent(value: string, now: number, days: number) {
  const timestamp = new Date(value).getTime();
  return (
    Number.isFinite(timestamp) && now - timestamp <= days * 24 * 60 * 60 * 1000
  );
}

export function getWorstStatus(
  statuses: AdminWorkspaceOperationsStatus[],
  fallback: AdminWorkspaceOperationsStatus,
) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return statuses.length > 0 ? "ready" : fallback;
}

export function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function formatWorkspaceOperationsBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${bytes} B`;
}
