import type { OfflineDesktopHandoffKit, OfflineDesktopHandoffKitSummary } from "@/features/projects/offline-desktop-handoff-kit";
import {
  createReleaseEvidenceDiffMetrics,
  type ReleaseEvidenceDiffMetric,
  type ReleaseEvidenceDiffMetricPreference,
} from "@/features/projects/release-evidence-diff-metrics";
import type { ReleaseEvidenceBundle, ReleaseEvidenceBundleSummary } from "@/features/projects/release-evidence-bundle";
import type { WorkspaceRole } from "@/features/workspaces/types";

export type ReleaseEvidenceDiffSourceKind = "current-launch-state" | "offline-desktop-handoff-kit" | "release-evidence-bundle";

export type ReleaseEvidenceDiffMetricSource = "desktop-handoff" | "release-evidence";

export type ReleaseEvidenceDiffRowStatus = "added" | "changed" | "improved" | "regressed" | "removed" | "unchanged";

export type ReleaseEvidenceDiffSeverity = "critical" | "info" | "positive" | "warning";

export interface ReleaseEvidenceDiffBaseline {
  generatedAt: string;
  kind: "release-evidence-diff-baseline";
  offlineDesktopHandoffSummary: OfflineDesktopHandoffKitSummary | null;
  releaseEvidenceSummary: ReleaseEvidenceBundleSummary | null;
  schemaVersion: 1;
  sourceFileName: string | null;
  sourceKind: ReleaseEvidenceDiffSourceKind;
  workspace: {
    id: string;
    name: string;
    role: WorkspaceRole;
  };
}

export interface ReleaseEvidenceDiffCurrentState {
  generatedAt: string;
  offlineDesktopHandoffSummary?: OfflineDesktopHandoffKitSummary | null;
  releaseEvidenceSummary: ReleaseEvidenceBundleSummary;
  workspace: {
    id: string;
    name: string;
    role: WorkspaceRole;
  };
}

export interface ReleaseEvidenceDiffRow {
  currentValue: number | null;
  detail: string;
  id: string;
  label: string;
  previousValue: number | null;
  severity: ReleaseEvidenceDiffSeverity;
  source: ReleaseEvidenceDiffMetricSource;
  status: ReleaseEvidenceDiffRowStatus;
}

export interface ReleaseEvidenceDiffReport {
  baseline: {
    generatedAt: string;
    sourceFileName: string | null;
    sourceKind: ReleaseEvidenceDiffSourceKind;
  };
  current: {
    generatedAt: string;
  };
  rows: ReleaseEvidenceDiffRow[];
  summary: {
    addedCount: number;
    changedCount: number;
    currentBlockerCount: number;
    currentReadinessScore: number | null;
    improvedCount: number;
    netBlockerDelta: number;
    netReadinessDelta: number | null;
    previousBlockerCount: number;
    previousReadinessScore: number | null;
    regressedCount: number;
    removedCount: number;
    status: "changed" | "clean" | "improved" | "regressed";
    unchangedCount: number;
  };
  workspace: {
    id: string;
    name: string;
    role: WorkspaceRole;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWorkspace(value: unknown): value is ReleaseEvidenceDiffBaseline["workspace"] {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.id === "string" && typeof value.name === "string" && typeof value.role === "string";
}

function isSourceKind(value: unknown): value is ReleaseEvidenceDiffSourceKind {
  return value === "current-launch-state" || value === "offline-desktop-handoff-kit" || value === "release-evidence-bundle";
}

function hasReleaseEvidenceSummary(value: unknown): value is ReleaseEvidenceBundleSummary {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.riskScore === "number" && typeof value.releaseBlockerCount === "number" && typeof value.riskLevel === "string";
}

function hasOfflineDesktopHandoffSummary(value: unknown): value is OfflineDesktopHandoffKitSummary {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.handoffScore === "number" && typeof value.releaseBlockerCount === "number" && typeof value.generatedAt === "string";
}

function hasReleaseEvidenceBundleShape(value: unknown): value is ReleaseEvidenceBundle {
  return isRecord(value) && hasReleaseEvidenceSummary(value.summary) && isWorkspace(value.workspace) && typeof value.generatedAt === "string";
}

function hasOfflineDesktopHandoffKitShape(value: unknown): value is OfflineDesktopHandoffKit {
  return isRecord(value) && hasOfflineDesktopHandoffSummary(value.summary) && isWorkspace(value.workspace);
}

function hasDiffBaselineShape(value: unknown): value is ReleaseEvidenceDiffBaseline {
  return (
    isRecord(value) &&
    value.kind === "release-evidence-diff-baseline" &&
    value.schemaVersion === 1 &&
    typeof value.generatedAt === "string" &&
    isSourceKind(value.sourceKind) &&
    (value.sourceFileName === null || typeof value.sourceFileName === "string") &&
    isWorkspace(value.workspace) &&
    (value.releaseEvidenceSummary === null || hasReleaseEvidenceSummary(value.releaseEvidenceSummary)) &&
    (value.offlineDesktopHandoffSummary === null || hasOfflineDesktopHandoffSummary(value.offlineDesktopHandoffSummary))
  );
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64) || "workspace"
  );
}

function compareValues(previousValue: number, currentValue: number, preference: ReleaseEvidenceDiffMetricPreference): ReleaseEvidenceDiffRowStatus {
  if (previousValue === currentValue) {
    return "unchanged";
  }

  if (preference === "neutral") {
    return "changed";
  }

  if (preference === "higher") {
    return currentValue > previousValue ? "improved" : "regressed";
  }

  return currentValue < previousValue ? "improved" : "regressed";
}

function severityForStatus(status: ReleaseEvidenceDiffRowStatus, currentValue: number | null, preference: ReleaseEvidenceDiffMetricPreference): ReleaseEvidenceDiffSeverity {
  if (status === "improved") {
    return "positive";
  }

  if (status === "regressed") {
    return currentValue && currentValue > 0 && preference === "lower" ? "critical" : "warning";
  }

  if (status === "added" || status === "removed") {
    return "warning";
  }

  return "info";
}

function createDiffRow(previousMetric: ReleaseEvidenceDiffMetric | undefined, currentMetric: ReleaseEvidenceDiffMetric | undefined): ReleaseEvidenceDiffRow {
  const metric = currentMetric ?? previousMetric;

  if (!metric) {
    throw new Error("Release evidence diff row requires a metric.");
  }

  const previousValue = previousMetric?.value ?? null;
  const currentValue = currentMetric?.value ?? null;
  const status =
    previousValue === null ? "added" : currentValue === null ? "removed" : compareValues(previousValue, currentValue, metric.preference);

  return {
    currentValue,
    detail: metric.detail,
    id: metric.id,
    label: metric.label,
    previousValue,
    severity: severityForStatus(status, currentValue, metric.preference),
    source: metric.source,
    status,
  };
}

function countRows(rows: ReleaseEvidenceDiffRow[], status: ReleaseEvidenceDiffRowStatus) {
  return rows.filter((row) => row.status === status).length;
}

function sumMetricValues(metrics: ReleaseEvidenceDiffMetric[], ids: string[]) {
  return metrics.filter((metric) => ids.includes(metric.id)).reduce((total, metric) => total + metric.value, 0);
}

function averageScore(metrics: ReleaseEvidenceDiffMetric[]) {
  const scoreMetrics = metrics.filter((metric) => metric.id === "release:risk-score" || metric.id === "desktop:handoff-score");

  if (scoreMetrics.length === 0) {
    return null;
  }

  return Math.round(scoreMetrics.reduce((total, metric) => total + metric.value, 0) / scoreMetrics.length);
}

function reportStatus(rows: ReleaseEvidenceDiffRow[]): ReleaseEvidenceDiffReport["summary"]["status"] {
  if (rows.some((row) => row.status === "regressed")) {
    return "regressed";
  }

  if (rows.some((row) => row.status === "improved")) {
    return "improved";
  }

  if (rows.some((row) => row.status !== "unchanged")) {
    return "changed";
  }

  return "clean";
}

export function createReleaseEvidenceDiffBaseline(input: ReleaseEvidenceDiffCurrentState): ReleaseEvidenceDiffBaseline {
  return {
    generatedAt: input.generatedAt,
    kind: "release-evidence-diff-baseline",
    offlineDesktopHandoffSummary: input.offlineDesktopHandoffSummary ?? null,
    releaseEvidenceSummary: input.releaseEvidenceSummary,
    schemaVersion: 1,
    sourceFileName: null,
    sourceKind: "current-launch-state",
    workspace: input.workspace,
  };
}

export function parseReleaseEvidenceDiffBaseline(value: unknown, sourceFileName?: string): ReleaseEvidenceDiffBaseline {
  if (hasDiffBaselineShape(value)) {
    return {
      ...value,
      sourceFileName: sourceFileName ?? value.sourceFileName ?? null,
    };
  }

  if (hasReleaseEvidenceBundleShape(value)) {
    return {
      generatedAt: value.generatedAt,
      kind: "release-evidence-diff-baseline",
      offlineDesktopHandoffSummary: null,
      releaseEvidenceSummary: value.summary,
      schemaVersion: 1,
      sourceFileName: sourceFileName ?? null,
      sourceKind: "release-evidence-bundle",
      workspace: value.workspace,
    };
  }

  if (hasOfflineDesktopHandoffKitShape(value)) {
    return {
      generatedAt: value.summary.generatedAt,
      kind: "release-evidence-diff-baseline",
      offlineDesktopHandoffSummary: value.summary,
      releaseEvidenceSummary: null,
      schemaVersion: 1,
      sourceFileName: sourceFileName ?? null,
      sourceKind: "offline-desktop-handoff-kit",
      workspace: value.workspace,
    };
  }

  throw new Error("Select a release evidence bundle, offline desktop handoff kit, or saved launch-state baseline JSON file.");
}

export function createReleaseEvidenceDiffReport(input: {
  baseline: ReleaseEvidenceDiffBaseline;
  current: ReleaseEvidenceDiffBaseline;
}): ReleaseEvidenceDiffReport {
  const previousMetrics = createReleaseEvidenceDiffMetrics(input.baseline);
  const previousSources = new Set(previousMetrics.map((metric) => metric.source));
  const currentMetrics = createReleaseEvidenceDiffMetrics(input.current).filter((metric) => previousSources.has(metric.source));
  const previousMetricById = new Map(previousMetrics.map((metric) => [metric.id, metric]));
  const currentMetricById = new Map(currentMetrics.map((metric) => [metric.id, metric]));
  const ids = [...new Set([...previousMetricById.keys(), ...currentMetricById.keys()])];
  const rows = ids.map((id) => createDiffRow(previousMetricById.get(id), currentMetricById.get(id)));
  const previousBlockerCount = sumMetricValues(previousMetrics, ["desktop:blockers", "release:blockers"]);
  const currentBlockerCount = sumMetricValues(currentMetrics, ["desktop:blockers", "release:blockers"]);
  const previousReadinessScore = averageScore(previousMetrics);
  const currentReadinessScore = averageScore(currentMetrics);

  return {
    baseline: {
      generatedAt: input.baseline.generatedAt,
      sourceFileName: input.baseline.sourceFileName,
      sourceKind: input.baseline.sourceKind,
    },
    current: {
      generatedAt: input.current.generatedAt,
    },
    rows,
    summary: {
      addedCount: countRows(rows, "added"),
      changedCount: countRows(rows, "changed"),
      currentBlockerCount,
      currentReadinessScore,
      improvedCount: countRows(rows, "improved"),
      netBlockerDelta: currentBlockerCount - previousBlockerCount,
      netReadinessDelta: currentReadinessScore === null || previousReadinessScore === null ? null : currentReadinessScore - previousReadinessScore,
      previousBlockerCount,
      previousReadinessScore,
      regressedCount: countRows(rows, "regressed"),
      removedCount: countRows(rows, "removed"),
      status: reportStatus(rows),
      unchangedCount: countRows(rows, "unchanged"),
    },
    workspace: input.current.workspace,
  };
}

export function createReleaseEvidenceDiffBaselineBody(baseline: ReleaseEvidenceDiffBaseline) {
  return JSON.stringify(baseline, null, 2);
}

export function createReleaseEvidenceDiffBaselineFileName(baseline: ReleaseEvidenceDiffBaseline) {
  const date = baseline.generatedAt.slice(0, 10).replaceAll("-", "");

  return `release-evidence-diff-baseline-${slug(baseline.workspace.name)}-${slug(baseline.workspace.id)}-${date}.json`;
}
