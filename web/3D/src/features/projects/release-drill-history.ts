import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import type { ReleaseDrillScenario, ReleaseDrillSimulationReport, ReleaseDrillSimulationRow, ReleaseDrillStatus } from "@/features/projects/release-drill-simulation";

export type ReleaseDrillHistoryFormat = "csv" | "json";

export interface ReleaseDrillHistoryActor {
  email: string | null;
  name: string | null;
  userId: string | null;
}

export interface ReleaseDrillEvidenceLink {
  href: string;
  label: string;
}

export interface ReleaseDrillHistoryScenarioRecord {
  dueAt: string;
  evidence: string;
  evidenceLinks: ReleaseDrillEvidenceLink[];
  id: ReleaseDrillScenario;
  label: string;
  lastRunAt: string;
  nextAction: string;
  outcome: ReleaseDrillStatus;
  ownerName: string;
  recoveryTargetMinutes: number;
}

export interface ReleaseDrillHistoryRecord {
  actor: ReleaseDrillHistoryActor;
  blockedCount: number;
  contentHash: string;
  createdAt: string;
  csvByteSize: number;
  csvFileName: string;
  drillId: string;
  drillRows: ReleaseDrillHistoryScenarioRecord[];
  id: string;
  jsonByteSize: number;
  jsonFileName: string;
  missingCount: number;
  readyCount: number;
  report: ReleaseDrillSimulationReport;
  score: number;
  totalCount: number;
  watchCount: number;
  workspaceId: string;
  workspaceName: string;
}

export interface ReleaseDrillHistoryReport {
  records: ReleaseDrillHistoryRecord[];
  summary: {
    actorCount: number;
    blockedRunCount: number;
    latestContentHash: string | null;
    latestSavedAt: string | null;
    readyRunCount: number;
    totalDrillCount: number;
    totalRecordCount: number;
    watchRunCount: number;
  };
}

export interface CreateReleaseDrillHistoryRecordInput {
  actor: ReleaseDrillHistoryActor;
  createdAt?: string;
  id?: string;
  report: ReleaseDrillSimulationReport;
  workspace: {
    id: string;
    name: string;
  };
}

function byteSize(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function addDays(value: string, days: number) {
  const date = new Date(value);
  const base = Number.isNaN(date.getTime()) ? new Date() : date;

  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function dueAtForOutcome(createdAt: string, status: ReleaseDrillStatus) {
  if (status === "blocked" || status === "missing") {
    return createdAt;
  }

  return status === "watch" ? addDays(createdAt, 7) : addDays(createdAt, 30);
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replace(/-/g, "");
}

function evidenceLinksForRow(row: ReleaseDrillSimulationRow, workspaceId: string): ReleaseDrillEvidenceLink[] {
  const workspaceQuery = `workspaceId=${encodeURIComponent(workspaceId)}`;

  if (row.id === "rollback") {
    return [
      { href: `/projects?${workspaceQuery}#release-runbook`, label: "Release runbook" },
      { href: `/projects?${workspaceQuery}#release-calendar`, label: "Release calendar" },
    ];
  }

  if (row.id === "certificate-expiry") {
    return [
      { href: `/projects?${workspaceQuery}#artifact-provenance`, label: "Artifact provenance" },
      { href: `/projects?${workspaceQuery}#certificates`, label: "Package certificates" },
    ];
  }

  if (row.id === "deploy-smoke-failure") {
    return [
      { href: `/projects?${workspaceQuery}#post-deploy`, label: "Post-deploy smoke" },
      { href: "/projects/release-operations", label: "Release operations" },
    ];
  }

  return [
    { href: `/projects?${workspaceQuery}#cad-workers`, label: "CAD worker queue" },
    { href: `/projects?${workspaceQuery}#artifact-provenance`, label: "CAD output provenance" },
  ];
}

function createScenarioRecord(row: ReleaseDrillSimulationRow, workspaceId: string, createdAt: string): ReleaseDrillHistoryScenarioRecord {
  return {
    dueAt: dueAtForOutcome(createdAt, row.status),
    evidence: row.evidence,
    evidenceLinks: evidenceLinksForRow(row, workspaceId),
    id: row.id,
    label: row.label,
    lastRunAt: createdAt,
    nextAction: row.nextAction,
    outcome: row.status,
    ownerName: row.ownerHint,
    recoveryTargetMinutes: row.recoveryTargetMinutes,
  };
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function isReleaseDrillSimulationReport(value: unknown): value is ReleaseDrillSimulationReport {
  if (!value || typeof value !== "object") {
    return false;
  }

  const report = value as Partial<ReleaseDrillSimulationReport>;

  return (
    typeof report.generatedAt === "string" &&
    Array.isArray(report.rows) &&
    !!report.summary &&
    typeof report.summary.score === "number" &&
    typeof report.summary.totalCount === "number" &&
    report.rows.every((row) => {
      const candidate = row as Partial<ReleaseDrillSimulationRow>;

      return typeof candidate.id === "string" && typeof candidate.label === "string" && typeof candidate.status === "string" && typeof candidate.evidence === "string";
    })
  );
}

export function createReleaseDrillHistoryJson(report: ReleaseDrillSimulationReport, drillRows: ReleaseDrillHistoryScenarioRecord[]) {
  return JSON.stringify({ drillRows, report }, null, 2);
}

export function createReleaseDrillHistoryCsv(drillRows: ReleaseDrillHistoryScenarioRecord[]) {
  return [
    ["Scenario", "Outcome", "Owner", "Last run", "Due", "Recovery target minutes", "Evidence links", "Evidence", "Next action"].map(csvCell).join(","),
    ...drillRows.map((row) =>
      [
        row.label,
        row.outcome,
        row.ownerName,
        row.lastRunAt,
        row.dueAt,
        row.recoveryTargetMinutes,
        row.evidenceLinks.map((link) => `${link.label}: ${link.href}`).join(" | "),
        row.evidence,
        row.nextAction,
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\n");
}

export function createReleaseDrillHistoryFileName(report: ReleaseDrillSimulationReport, format: ReleaseDrillHistoryFormat) {
  return `essence-spline-release-drills-${dateStamp(report.generatedAt)}.${format}`;
}

export function createReleaseDrillHistoryContentHash(report: ReleaseDrillSimulationReport, drillRows: ReleaseDrillHistoryScenarioRecord[]) {
  return `sha256:${createHash("sha256").update(createReleaseDrillHistoryJson(report, drillRows)).digest("hex")}`;
}

export function createReleaseDrillHistoryRecord(input: CreateReleaseDrillHistoryRecordInput): ReleaseDrillHistoryRecord {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const drillRows = input.report.rows.map((row) => createScenarioRecord(row, input.workspace.id, createdAt));
  const json = createReleaseDrillHistoryJson(input.report, drillRows);
  const csv = createReleaseDrillHistoryCsv(drillRows);

  return {
    actor: input.actor,
    blockedCount: input.report.summary.blockedCount,
    contentHash: createReleaseDrillHistoryContentHash(input.report, drillRows),
    createdAt,
    csvByteSize: byteSize(csv),
    csvFileName: createReleaseDrillHistoryFileName(input.report, "csv"),
    drillId: `release-drills-${input.workspace.id}-${dateStamp(input.report.generatedAt)}`,
    drillRows,
    id: input.id ?? nanoid(),
    jsonByteSize: byteSize(json),
    jsonFileName: createReleaseDrillHistoryFileName(input.report, "json"),
    missingCount: input.report.summary.missingCount,
    readyCount: input.report.summary.readyCount,
    report: input.report,
    score: input.report.summary.score,
    totalCount: input.report.summary.totalCount,
    watchCount: input.report.summary.watchCount,
    workspaceId: input.workspace.id,
    workspaceName: input.workspace.name,
  };
}

export function createReleaseDrillHistoryReport(records: ReleaseDrillHistoryRecord[]): ReleaseDrillHistoryReport {
  const sortedRecords = [...records].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  const actorIds = new Set(sortedRecords.map((record) => record.actor.userId ?? record.actor.email ?? record.actor.name ?? "unknown"));

  return {
    records: sortedRecords,
    summary: {
      actorCount: actorIds.size,
      blockedRunCount: sortedRecords.reduce((sum, record) => sum + record.blockedCount, 0),
      latestContentHash: sortedRecords[0]?.contentHash ?? null,
      latestSavedAt: sortedRecords[0]?.createdAt ?? null,
      readyRunCount: sortedRecords.reduce((sum, record) => sum + record.readyCount, 0),
      totalDrillCount: sortedRecords.reduce((sum, record) => sum + record.totalCount, 0),
      totalRecordCount: sortedRecords.length,
      watchRunCount: sortedRecords.reduce((sum, record) => sum + record.watchCount, 0),
    },
  };
}

export function getReleaseDrillHistoryDownload(record: ReleaseDrillHistoryRecord, format: ReleaseDrillHistoryFormat) {
  if (format === "json") {
    return {
      body: createReleaseDrillHistoryJson(record.report, record.drillRows),
      fileName: record.jsonFileName,
      mimeType: "application/json;charset=utf-8",
    };
  }

  return {
    body: createReleaseDrillHistoryCsv(record.drillRows),
    fileName: record.csvFileName,
    mimeType: "text/csv;charset=utf-8",
  };
}
