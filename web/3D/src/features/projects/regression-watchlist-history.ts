import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import {
  createProjectRegressionWatchlistCsv,
  createProjectRegressionWatchlistFileName,
  type ProjectRegressionWatchlistFormat,
  type ProjectRegressionWatchlistItemTriageState,
  type ProjectRegressionWatchlistReport,
} from "@/features/projects/regression-watchlist";

export interface ProjectRegressionWatchlistSnapshotActor {
  email: string | null;
  name: string | null;
  userId: string | null;
}

export interface ProjectRegressionWatchlistSnapshotRecord {
  actor: ProjectRegressionWatchlistSnapshotActor;
  contentHash: string;
  createdAt: string;
  csvByteSize: number;
  csvFileName: string;
  id: string;
  itemCount: number;
  jsonByteSize: number;
  jsonFileName: string;
  recurringCount: number;
  report: ProjectRegressionWatchlistReport;
  severeCount: number;
  snapshotId: string;
  states: ProjectRegressionWatchlistItemTriageState[];
  workspaceId: string;
  workspaceName: string;
}

export interface ProjectRegressionWatchlistSnapshotHistoryReport {
  snapshots: ProjectRegressionWatchlistSnapshotRecord[];
  summary: {
    actorCount: number;
    latestContentHash: string | null;
    latestSavedAt: string | null;
    recurringCount: number;
    severeCount: number;
    totalItemCount: number;
    totalSnapshotCount: number;
  };
}

export interface CreateProjectRegressionWatchlistSnapshotRecordInput {
  actor: ProjectRegressionWatchlistSnapshotActor;
  createdAt?: string;
  id?: string;
  report: ProjectRegressionWatchlistReport;
  states?: ProjectRegressionWatchlistItemTriageState[];
  workspace: {
    id: string;
    name: string;
  };
}

function byteSize(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function createDateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replace(/-/g, "");
}

export function createProjectRegressionWatchlistSnapshotJson(
  report: ProjectRegressionWatchlistReport,
  states: ProjectRegressionWatchlistItemTriageState[] = [],
) {
  return JSON.stringify({ report, states }, null, 2);
}

export function createProjectRegressionWatchlistContentHash(
  report: ProjectRegressionWatchlistReport,
  states: ProjectRegressionWatchlistItemTriageState[] = [],
) {
  return `sha256:${createHash("sha256").update(createProjectRegressionWatchlistSnapshotJson(report, states)).digest("hex")}`;
}

export function createProjectRegressionWatchlistSnapshotId(report: ProjectRegressionWatchlistReport, workspaceId: string) {
  return `regression-watchlist-${workspaceId}-${createDateStamp(report.generatedAt)}`;
}

export function createProjectRegressionWatchlistSnapshotRecord(
  input: CreateProjectRegressionWatchlistSnapshotRecordInput,
): ProjectRegressionWatchlistSnapshotRecord {
  const states = input.states ?? [];
  const json = createProjectRegressionWatchlistSnapshotJson(input.report, states);
  const csv = createProjectRegressionWatchlistCsv(input.report, states);

  return {
    actor: input.actor,
    contentHash: createProjectRegressionWatchlistContentHash(input.report, states),
    createdAt: input.createdAt ?? new Date().toISOString(),
    csvByteSize: byteSize(csv),
    csvFileName: createProjectRegressionWatchlistFileName(input.report, "csv"),
    id: input.id ?? nanoid(),
    itemCount: input.report.summary.totalCount,
    jsonByteSize: byteSize(json),
    jsonFileName: createProjectRegressionWatchlistFileName(input.report, "json"),
    recurringCount: input.report.summary.recurringCount,
    report: input.report,
    severeCount: input.report.summary.criticalCount + input.report.summary.highCount,
    snapshotId: createProjectRegressionWatchlistSnapshotId(input.report, input.workspace.id),
    states,
    workspaceId: input.workspace.id,
    workspaceName: input.workspace.name,
  };
}

export function createProjectRegressionWatchlistSnapshotHistoryReport(
  records: ProjectRegressionWatchlistSnapshotRecord[],
): ProjectRegressionWatchlistSnapshotHistoryReport {
  const snapshots = [...records].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  const actorIds = new Set(snapshots.map((snapshot) => snapshot.actor.userId ?? snapshot.actor.email ?? snapshot.actor.name ?? "unknown"));

  return {
    snapshots,
    summary: {
      actorCount: actorIds.size,
      latestContentHash: snapshots[0]?.contentHash ?? null,
      latestSavedAt: snapshots[0]?.createdAt ?? null,
      recurringCount: snapshots.reduce((sum, snapshot) => sum + snapshot.recurringCount, 0),
      severeCount: snapshots.reduce((sum, snapshot) => sum + snapshot.severeCount, 0),
      totalItemCount: snapshots.reduce((sum, snapshot) => sum + snapshot.itemCount, 0),
      totalSnapshotCount: snapshots.length,
    },
  };
}

export function getProjectRegressionWatchlistSnapshotDownload(
  snapshot: ProjectRegressionWatchlistSnapshotRecord,
  format: ProjectRegressionWatchlistFormat,
) {
  if (format === "json") {
    return {
      body: createProjectRegressionWatchlistSnapshotJson(snapshot.report, snapshot.states),
      fileName: snapshot.jsonFileName,
      mimeType: "application/json;charset=utf-8",
    };
  }

  return {
    body: createProjectRegressionWatchlistCsv(snapshot.report, snapshot.states),
    fileName: snapshot.csvFileName,
    mimeType: "text/csv;charset=utf-8",
  };
}
