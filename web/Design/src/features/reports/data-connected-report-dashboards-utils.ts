import type { ContentDatabaseCenter } from "@/features/content-database/content-database";
import type { ProductionDistributionAnalyticsCenter } from "@/features/distribution/production-distribution-analytics";
import type { DataConnectedReportStatus } from "@/features/reports/data-connected-report-dashboards-types";

export function mapAnalyticsStatus(
  status: ProductionDistributionAnalyticsCenter["status"],
): DataConnectedReportStatus {
  return status;
}

export function mapContentStatus(
  status: ContentDatabaseCenter["status"],
): DataConnectedReportStatus {
  return status;
}

export function aggregateStatus(statuses: DataConnectedReportStatus[]) {
  if (!statuses.length) return "blocked";
  if (statuses.some((status) => status === "blocked")) return "blocked";
  if (statuses.some((status) => status === "review")) return "review";

  return "ready";
}

export function scoreToStatus(score: number): DataConnectedReportStatus {
  if (score >= 80) return "ready";
  if (score >= 55) return "review";

  return "blocked";
}

export function statusScore(status: DataConnectedReportStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 65;

  return 30;
}

export function average(values: number[], fallback = 0) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

export function latestDate(values: string[]) {
  const sorted = values
    .filter(Boolean)
    .sort((left, right) => Date.parse(right) - Date.parse(left));

  return sorted[0] ?? null;
}

export function addHours(value: string, hours: number) {
  const date = new Date(value);
  date.setHours(date.getHours() + hours);

  return date.toISOString();
}

export function ageInHours(now: Date, value: string) {
  return Math.floor((now.getTime() - Date.parse(value)) / (60 * 60 * 1000));
}

export function normalizeDate(value: Date | string | undefined) {
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);

  return new Date();
}

export function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export const reportChartPalette = [
  "#2563eb",
  "#0f766e",
  "#f97316",
  "#7c3aed",
  "#dc2626",
  "#475569",
];
