import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import type {
  ExecutiveReleaseIntelligenceDomain,
  ExecutiveReleaseIntelligenceReport,
  ExecutiveReleaseIntelligenceStatus,
} from "@/features/projects/executive-release-intelligence";

export type ExecutiveReleaseSnapshotFormat = "csv" | "json";
export type ExecutiveReleaseSnapshotTrendDirection = "declining" | "flat" | "improving";

export interface ExecutiveReleaseSnapshotActor {
  email: string | null;
  name: string | null;
  userId: string | null;
}

export interface ExecutiveReleaseSnapshotRecord {
  actor: ExecutiveReleaseSnapshotActor;
  blockedCount: number;
  contentHash: string;
  createdAt: string;
  criticalPathCount: number;
  csvByteSize: number;
  csvFileName: string;
  domainScores: Record<ExecutiveReleaseIntelligenceDomain, number>;
  executiveScore: number;
  id: string;
  jsonByteSize: number;
  jsonFileName: string;
  lowestDomain: ExecutiveReleaseIntelligenceDomain;
  readyCount: number;
  report: ExecutiveReleaseIntelligenceReport;
  snapshotId: string;
  status: ExecutiveReleaseIntelligenceStatus;
  topAction: string;
  watchCount: number;
  workspaceId: string;
  workspaceName: string;
}

export interface ExecutiveReleaseSnapshotTrendRow {
  currentValue: number | string;
  delta: number;
  direction: ExecutiveReleaseSnapshotTrendDirection;
  metric: string;
  previousValue: number | string;
}

export interface ExecutiveReleaseSnapshotHistoryReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  snapshots: ExecutiveReleaseSnapshotRecord[];
  summary: {
    actorCount: number;
    blockerDelta: number;
    latestContentHash: string | null;
    latestSavedAt: string | null;
    latestScore: number | null;
    previousScore: number | null;
    scoreDelta: number;
    statusTrend: ExecutiveReleaseSnapshotTrendDirection;
    totalSnapshotCount: number;
  };
  trends: ExecutiveReleaseSnapshotTrendRow[];
}

export interface CreateExecutiveReleaseSnapshotRecordInput {
  actor: ExecutiveReleaseSnapshotActor;
  createdAt?: string;
  id?: string;
  report: ExecutiveReleaseIntelligenceReport;
  workspace: {
    id: string;
    name: string;
  };
}

function byteSize(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replace(/-/g, "");
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function domainScores(report: ExecutiveReleaseIntelligenceReport): Record<ExecutiveReleaseIntelligenceDomain, number> {
  return {
    automation: 0,
    cost: report.summary.costScore,
    evidence: report.summary.evidenceScore,
    governance: report.summary.governanceScore,
    incident: report.summary.incidentScore,
    launch: report.summary.launchScore,
    risk: report.summary.riskScore,
    ...Object.fromEntries(report.signals.map((signal) => [signal.domain, signal.score])),
  };
}

function snapshotPayload(record: Omit<ExecutiveReleaseSnapshotRecord, "contentHash" | "csvByteSize" | "jsonByteSize">) {
  return {
    actor: record.actor,
    createdAt: record.createdAt,
    report: record.report,
    snapshotId: record.snapshotId,
    workspace: {
      id: record.workspaceId,
      name: record.workspaceName,
    },
  };
}

export function createExecutiveReleaseSnapshotJson(record: Omit<ExecutiveReleaseSnapshotRecord, "contentHash" | "csvByteSize" | "jsonByteSize">) {
  return JSON.stringify(snapshotPayload(record), null, 2);
}

export function createExecutiveReleaseSnapshotCsv(record: Pick<ExecutiveReleaseSnapshotRecord, "domainScores" | "report">) {
  const metricRows = [
    ["Executive score", record.report.summary.executiveScore],
    ["Blocked signals", record.report.summary.blockedCount],
    ["Watch signals", record.report.summary.watchCount],
    ["Ready signals", record.report.summary.readyCount],
    ["Launch score", record.domainScores.launch],
    ["Governance score", record.domainScores.governance],
    ["Automation score", record.domainScores.automation],
    ["Cost score", record.domainScores.cost],
    ["Risk score", record.domainScores.risk],
    ["Incident score", record.domainScores.incident],
    ["Evidence score", record.domainScores.evidence],
  ] satisfies [string, number][];

  return [
    ["Metric", "Value"].map(csvCell).join(","),
    ...metricRows.map(([metric, value]) => [metric, value].map(csvCell).join(",")),
    "",
    ["Domain", "Status", "Label", "Score", "Next action"].map(csvCell).join(","),
    ...record.report.signals.map((signal) => [signal.domain, signal.status, signal.label, signal.score, signal.nextAction].map(csvCell).join(",")),
  ].join("\n");
}

export function createExecutiveReleaseSnapshotFileName(report: ExecutiveReleaseIntelligenceReport, format: ExecutiveReleaseSnapshotFormat) {
  return `essence-spline-executive-release-${dateStamp(report.generatedAt)}.${format}`;
}

export function createExecutiveReleaseSnapshotContentHash(record: Omit<ExecutiveReleaseSnapshotRecord, "contentHash" | "csvByteSize" | "jsonByteSize">) {
  return `sha256:${createHash("sha256").update(createExecutiveReleaseSnapshotJson(record)).digest("hex")}`;
}

export function isExecutiveReleaseIntelligenceReport(value: unknown): value is ExecutiveReleaseIntelligenceReport {
  if (!value || typeof value !== "object") {
    return false;
  }

  const report = value as Partial<ExecutiveReleaseIntelligenceReport>;

  return (
    typeof report.generatedAt === "string" &&
    typeof report.executiveMemo === "string" &&
    Array.isArray(report.signals) &&
    Array.isArray(report.criticalPath) &&
    !!report.summary &&
    typeof report.summary.executiveScore === "number" &&
    typeof report.summary.blockedCount === "number" &&
    typeof report.summary.watchCount === "number" &&
    typeof report.summary.readyCount === "number" &&
    typeof report.summary.topAction === "string" &&
    (report.summary.status === "blocked" || report.summary.status === "ready" || report.summary.status === "watch")
  );
}

export function createExecutiveReleaseSnapshotRecord(input: CreateExecutiveReleaseSnapshotRecordInput): ExecutiveReleaseSnapshotRecord {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const baseRecord: Omit<ExecutiveReleaseSnapshotRecord, "contentHash" | "csvByteSize" | "jsonByteSize"> = {
    actor: input.actor,
    blockedCount: input.report.summary.blockedCount,
    createdAt,
    criticalPathCount: input.report.criticalPath.length,
    csvFileName: createExecutiveReleaseSnapshotFileName(input.report, "csv"),
    domainScores: domainScores(input.report),
    executiveScore: input.report.summary.executiveScore,
    id: input.id ?? nanoid(),
    jsonFileName: createExecutiveReleaseSnapshotFileName(input.report, "json"),
    lowestDomain: input.report.summary.lowestDomain,
    readyCount: input.report.summary.readyCount,
    report: input.report,
    snapshotId: `executive-release-${input.workspace.id}-${dateStamp(input.report.generatedAt)}`,
    status: input.report.summary.status,
    topAction: input.report.summary.topAction,
    watchCount: input.report.summary.watchCount,
    workspaceId: input.workspace.id,
    workspaceName: input.workspace.name,
  };
  const json = createExecutiveReleaseSnapshotJson(baseRecord);
  const csv = createExecutiveReleaseSnapshotCsv(baseRecord);

  return {
    ...baseRecord,
    contentHash: createExecutiveReleaseSnapshotContentHash(baseRecord),
    csvByteSize: byteSize(csv),
    jsonByteSize: byteSize(json),
  };
}

function directionForDelta(delta: number, inverse = false): ExecutiveReleaseSnapshotTrendDirection {
  if (delta === 0) {
    return "flat";
  }

  const improving = inverse ? delta < 0 : delta > 0;

  return improving ? "improving" : "declining";
}

function trendRow(input: {
  currentValue: number;
  inverse?: boolean;
  metric: string;
  previousValue: number;
}): ExecutiveReleaseSnapshotTrendRow {
  const delta = input.currentValue - input.previousValue;

  return {
    currentValue: input.currentValue,
    delta,
    direction: directionForDelta(delta, input.inverse),
    metric: input.metric,
    previousValue: input.previousValue,
  };
}

function createTrendRows(current: ExecutiveReleaseSnapshotRecord | null, previous: ExecutiveReleaseSnapshotRecord | null): ExecutiveReleaseSnapshotTrendRow[] {
  if (!current || !previous) {
    return [];
  }

  return [
    trendRow({ currentValue: current.executiveScore, metric: "Executive score", previousValue: previous.executiveScore }),
    trendRow({ currentValue: current.blockedCount, inverse: true, metric: "Blocked signals", previousValue: previous.blockedCount }),
    trendRow({ currentValue: current.watchCount, inverse: true, metric: "Watch signals", previousValue: previous.watchCount }),
    trendRow({ currentValue: current.criticalPathCount, inverse: true, metric: "Critical path", previousValue: previous.criticalPathCount }),
    trendRow({ currentValue: current.domainScores.launch, metric: "Launch score", previousValue: previous.domainScores.launch }),
    trendRow({ currentValue: current.domainScores.risk, metric: "Risk score", previousValue: previous.domainScores.risk }),
    trendRow({ currentValue: current.domainScores.evidence, metric: "Evidence score", previousValue: previous.domainScores.evidence }),
  ];
}

function createHistoryCsv(snapshots: ExecutiveReleaseSnapshotRecord[]) {
  const header = ["created_at", "status", "executive_score", "blocked_count", "watch_count", "lowest_domain", "top_action"];
  const body = snapshots.map((snapshot) =>
    [
      snapshot.createdAt,
      snapshot.status,
      snapshot.executiveScore,
      snapshot.blockedCount,
      snapshot.watchCount,
      snapshot.lowestDomain,
      snapshot.topAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createExecutiveReleaseSnapshotHistoryReport(records: ExecutiveReleaseSnapshotRecord[]): ExecutiveReleaseSnapshotHistoryReport {
  const snapshots = [...records].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  const latest = snapshots[0] ?? null;
  const previous = snapshots[1] ?? null;
  const trends = createTrendRows(latest, previous);
  const scoreDelta = latest && previous ? latest.executiveScore - previous.executiveScore : 0;
  const blockerDelta = latest && previous ? latest.blockedCount - previous.blockedCount : 0;
  const actorIds = new Set(snapshots.map((snapshot) => snapshot.actor.userId ?? snapshot.actor.email ?? snapshot.actor.name ?? "unknown"));
  const csvContent = createHistoryCsv(snapshots);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: "essence-spline-executive-release-snapshots.csv",
    snapshots,
    summary: {
      actorCount: actorIds.size,
      blockerDelta,
      latestContentHash: latest?.contentHash ?? null,
      latestSavedAt: latest?.createdAt ?? null,
      latestScore: latest?.executiveScore ?? null,
      previousScore: previous?.executiveScore ?? null,
      scoreDelta,
      statusTrend: directionForDelta(scoreDelta),
      totalSnapshotCount: snapshots.length,
    },
    trends,
  };
}

export function getExecutiveReleaseSnapshotDownload(record: ExecutiveReleaseSnapshotRecord, format: ExecutiveReleaseSnapshotFormat) {
  if (format === "json") {
    return {
      body: createExecutiveReleaseSnapshotJson(record),
      fileName: record.jsonFileName,
      mimeType: "application/json;charset=utf-8",
    };
  }

  return {
    body: createExecutiveReleaseSnapshotCsv(record),
    fileName: record.csvFileName,
    mimeType: "text/csv;charset=utf-8",
  };
}
