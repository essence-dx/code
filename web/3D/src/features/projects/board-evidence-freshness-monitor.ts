export type BoardEvidenceFreshnessStatus = "expired" | "fresh" | "stale" | "watch";
export type BoardEvidenceFreshnessKind = "acknowledgement" | "packet" | "replay-snapshot" | "route-evidence";
export type BoardEvidenceFreshnessSummaryStatus = "blocked" | "ready" | "watch";

export interface BoardEvidenceFreshnessRow {
  ageDays: number;
  detail: string;
  id: string;
  kind: BoardEvidenceFreshnessKind;
  nextAction: string;
  owner: string;
  score: number;
  sourceHash: string | null;
  sourceId: string;
  status: BoardEvidenceFreshnessStatus;
  title: string;
}

export interface BoardEvidenceFreshnessMonitorReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  rows: BoardEvidenceFreshnessRow[];
  summary: {
    expiredCount: number;
    freshCount: number;
    freshnessScore: number;
    nextAction: string;
    rowCount: number;
    staleCount: number;
    status: BoardEvidenceFreshnessSummaryStatus;
    watchCount: number;
  };
  workspaceId: string;
}

interface PacketHistoryRecordInput {
  approvalStatus: string;
  contentHash?: string;
  createdAt: string;
  packetId: string;
  recipientPurpose: string;
  status: string;
  updatedAt?: string;
}

interface ReplaySnapshotRecordInput {
  contentHash?: string;
  createdAt: string;
  replayScore?: number | null;
  snapshotId: string;
  status?: string;
}

interface NotificationHistoryRecordInput {
  contentHash?: string;
  createdAt: string;
  historyId?: string;
  id?: string;
  pendingAcknowledgementCount: number;
  retryNeededCount?: number;
  routeCount?: number;
  routes?: Array<{
    acknowledgementState?: string;
    acknowledgedAt?: string | null;
    deliveryState?: string;
    route?: {
      channel?: string;
      dedupeKey?: string;
      recipientEmail?: string;
      status?: string;
      topic?: string;
    };
  }>;
  status?: string;
}

interface RoutingReportInput {
  generatedAt: string;
  routes: Array<{
    channel?: string;
    dedupeKey?: string;
    recipientEmail?: string;
    status?: string;
    topic?: string;
  }>;
  summary: {
    eligibleRouteCount: number;
    latestRetryNeededCount?: number;
    notificationCount: number;
    routeCount: number;
    routingScore: number;
    status: string;
  };
}

export interface CreateBoardEvidenceFreshnessMonitorInput {
  generatedAt?: string;
  notificationHistory: {
    records: NotificationHistoryRecordInput[];
    summary?: {
      latestContentHash?: string | null;
      latestRetryNeededCount?: number;
      latestSavedAt?: string | null;
      pendingAcknowledgementCount?: number;
      totalRecordCount?: number;
    };
  } | null;
  packetHistory: {
    records: PacketHistoryRecordInput[];
  } | null;
  replaySnapshotHistory: {
    records: ReplaySnapshotRecordInput[];
    summary?: {
      latestContentHash?: string | null;
      latestSavedAt?: string | null;
      latestScore?: number | null;
      totalSnapshotCount?: number;
    };
  } | null;
  routing: RoutingReportInput | null;
  workspaceId?: string;
}

const statusRank: Record<BoardEvidenceFreshnessStatus, number> = {
  stale: 0,
  expired: 1,
  watch: 2,
  fresh: 3,
};

const kindRank: Record<BoardEvidenceFreshnessKind, number> = {
  packet: 0,
  "replay-snapshot": 1,
  acknowledgement: 2,
  "route-evidence": 3,
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function toTime(value: string | null | undefined) {
  const time = value ? new Date(value).getTime() : Number.NaN;

  return Number.isNaN(time) ? null : time;
}

function ageDays(generatedAt: string, evidenceAt: string | null | undefined) {
  const generatedTime = toTime(generatedAt);
  const evidenceTime = toTime(evidenceAt);

  if (generatedTime === null || evidenceTime === null) {
    return 999;
  }

  return Math.max(0, Math.floor((generatedTime - evidenceTime) / (24 * 60 * 60 * 1000)));
}

function latestSnapshot(input: CreateBoardEvidenceFreshnessMonitorInput["replaySnapshotHistory"]) {
  return [...(input?.records ?? [])].sort((first, second) => second.createdAt.localeCompare(first.createdAt))[0] ?? null;
}

function latestNotificationRecord(input: CreateBoardEvidenceFreshnessMonitorInput["notificationHistory"]) {
  return [...(input?.records ?? [])].sort((first, second) => second.createdAt.localeCompare(first.createdAt))[0] ?? null;
}

function packetRows(input: CreateBoardEvidenceFreshnessMonitorInput, generatedAt: string): BoardEvidenceFreshnessRow[] {
  const rows = (input.packetHistory?.records ?? [])
    .filter((record) => record.status === "active")
    .map((record) => {
      const checkedAt = record.updatedAt ?? record.createdAt;
      const age = ageDays(generatedAt, checkedAt);
      const status: BoardEvidenceFreshnessStatus = age > 7 || record.approvalStatus === "blocked" ? "stale" : age > 3 || record.approvalStatus === "watch" ? "watch" : "fresh";

      return {
        ageDays: age,
        detail: `${record.recipientPurpose} was last saved ${age} day${age === 1 ? "" : "s"} ago with ${record.approvalStatus} approval status.`,
        id: `packet:${record.packetId}`,
        kind: "packet" as const,
        nextAction: status === "fresh" ? "Keep the active board packet attached to the closeout ledger." : "Refresh stale board packet evidence before board closeout.",
        owner: "Packet owner",
        score: clamp(100 - age * 5 - (record.approvalStatus === "blocked" ? 20 : record.approvalStatus === "watch" ? 10 : 0)),
        sourceHash: record.contentHash ?? null,
        sourceId: record.packetId,
        status,
        title: "Active board packet",
      };
    });

  const staleRows = rows.filter((row) => row.status !== "fresh");

  return staleRows.length > 0 ? staleRows : rows.slice(0, 1);
}

function replaySnapshotRow(input: CreateBoardEvidenceFreshnessMonitorInput, generatedAt: string): BoardEvidenceFreshnessRow | null {
  const record = latestSnapshot(input.replaySnapshotHistory);

  if (!record) {
    return null;
  }

  const age = ageDays(generatedAt, record.createdAt);
  const score = record.replayScore ?? input.replaySnapshotHistory?.summary?.latestScore ?? 100;
  const status: BoardEvidenceFreshnessStatus = age > 5 || score < 60 ? "stale" : age > 2 || score < 80 ? "watch" : "fresh";

  return {
    ageDays: age,
    detail: `Latest replay snapshot is ${age} day${age === 1 ? "" : "s"} old with replay score ${score}/100.`,
    id: `snapshot:${record.snapshotId}`,
    kind: "replay-snapshot",
    nextAction: status === "fresh" ? "Keep the replay snapshot with the audit export." : "Save a fresh board decision replay snapshot before closeout.",
    owner: "Replay owner",
    score: clamp(100 - age * 5 - (score < 80 ? 20 : 0)),
    sourceHash: record.contentHash ?? input.replaySnapshotHistory?.summary?.latestContentHash ?? null,
    sourceId: record.snapshotId,
    status,
    title: "Decision replay snapshot",
  };
}

function acknowledgementRow(input: CreateBoardEvidenceFreshnessMonitorInput, generatedAt: string): BoardEvidenceFreshnessRow | null {
  const record = latestNotificationRecord(input.notificationHistory);

  if (!record || record.pendingAcknowledgementCount === 0) {
    return null;
  }

  const age = ageDays(generatedAt, record.createdAt);
  const retryCount = record.retryNeededCount ?? input.notificationHistory?.summary?.latestRetryNeededCount ?? 0;
  const status: BoardEvidenceFreshnessStatus = age >= 2 || retryCount > 0 ? "expired" : "watch";

  return {
    ageDays: age,
    detail: `${record.pendingAcknowledgementCount} reviewer acknowledgement${record.pendingAcknowledgementCount === 1 ? "" : "s"} pending for ${age} day${age === 1 ? "" : "s"}.`,
    id: `acknowledgement:${record.historyId ?? record.id ?? "latest"}`,
    kind: "acknowledgement",
    nextAction: "Collect or expire pending reviewer acknowledgements before board closeout.",
    owner: "Reviewer coordinator",
    score: clamp(100 - age * 10 - record.pendingAcknowledgementCount * 20 - retryCount * 5),
    sourceHash: record.contentHash ?? input.notificationHistory?.summary?.latestContentHash ?? null,
    sourceId: record.historyId ?? record.id ?? "latest-notification-history",
    status,
    title: "Reviewer acknowledgements",
  };
}

function routeEvidenceRow(input: CreateBoardEvidenceFreshnessMonitorInput, generatedAt: string): BoardEvidenceFreshnessRow | null {
  const record = latestNotificationRecord(input.notificationHistory);
  const routing = input.routing;

  if (!routing && !record) {
    return null;
  }

  const evidenceAt = record?.createdAt ?? routing?.generatedAt ?? null;
  const age = ageDays(generatedAt, evidenceAt);
  const retryCount = record?.retryNeededCount ?? input.notificationHistory?.summary?.latestRetryNeededCount ?? routing?.summary.latestRetryNeededCount ?? 0;
  const routingScore = routing?.summary.routingScore ?? 100;
  const status: BoardEvidenceFreshnessStatus = age > 3 || routingScore < 60 ? "stale" : retryCount > 0 || age > 1 || routingScore < 85 ? "watch" : "fresh";

  return {
    ageDays: age,
    detail: `${routing?.summary.eligibleRouteCount ?? record?.routeCount ?? 0} eligible route${(routing?.summary.eligibleRouteCount ?? record?.routeCount ?? 0) === 1 ? "" : "s"}, ${retryCount} retry-needed route${retryCount === 1 ? "" : "s"}.`,
    id: `route-evidence:${record?.historyId ?? record?.id ?? "latest"}`,
    kind: "route-evidence",
    nextAction: status === "fresh" ? "Keep route evidence attached to the board audit export." : "Refresh aging board notification route evidence before closeout.",
    owner: "Notification owner",
    score: clamp(100 - age * 8 - retryCount * 16 - (routingScore < 60 ? 20 : 0)),
    sourceHash: record?.contentHash ?? input.notificationHistory?.summary?.latestContentHash ?? null,
    sourceId: record?.historyId ?? record?.id ?? "latest-route-evidence",
    status,
    title: "Notification route evidence",
  };
}

function createRows(input: CreateBoardEvidenceFreshnessMonitorInput, generatedAt: string) {
  return [...packetRows(input, generatedAt), replaySnapshotRow(input, generatedAt), acknowledgementRow(input, generatedAt), routeEvidenceRow(input, generatedAt)]
    .filter((row): row is BoardEvidenceFreshnessRow => Boolean(row))
    .sort(
      (first, second) =>
        statusRank[first.status] - statusRank[second.status] ||
        kindRank[first.kind] - kindRank[second.kind] ||
        second.ageDays - first.ageDays ||
        first.title.localeCompare(second.title),
    );
}

function createSummary(rows: BoardEvidenceFreshnessRow[]): BoardEvidenceFreshnessMonitorReport["summary"] {
  const staleCount = rows.filter((row) => row.status === "stale").length;
  const expiredCount = rows.filter((row) => row.status === "expired").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const freshCount = rows.filter((row) => row.status === "fresh").length;
  const status: BoardEvidenceFreshnessSummaryStatus = staleCount > 0 || expiredCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";
  const nextRow = rows[0] ?? null;

  return {
    expiredCount,
    freshCount,
    freshnessScore: rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 100,
    nextAction: status === "ready" ? "Archive fresh board evidence with the closeout packet." : (nextRow?.nextAction ?? "Review board evidence freshness before closeout."),
    rowCount: rows.length,
    staleCount,
    status,
    watchCount,
  };
}

function createCsv(rows: BoardEvidenceFreshnessRow[]) {
  const header = ["evidence_id", "kind", "status", "age_days", "owner", "source_hash", "next_action"];
  const body = rows.map((row) => [row.id, row.kind, row.status, row.ageDays, row.owner, row.sourceHash, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createBoardEvidenceFreshnessMonitor(input: CreateBoardEvidenceFreshnessMonitorInput): BoardEvidenceFreshnessMonitorReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows(input, generatedAt);
  const summary = createSummary(rows);
  const csvContent = createCsv(rows);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(workspaceId)}-board-evidence-freshness-${dateStamp(generatedAt)}.csv`,
    generatedAt,
    rows,
    summary,
    workspaceId,
  };
}
