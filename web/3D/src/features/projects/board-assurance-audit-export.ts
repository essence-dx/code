import { createHash } from "node:crypto";

export type BoardAssuranceAuditExportStatus = "blocked" | "ready" | "watch";
export type BoardAssuranceAuditExportSectionId = "evidence-bundle" | "notification-routing" | "replay-snapshots" | "reviewer-acknowledgements" | "variance-dashboard";

export interface BoardAssuranceAuditExportSection {
  detail: string;
  id: BoardAssuranceAuditExportSectionId;
  label: string;
  nextAction: string;
  recordCount: number;
  score: number;
  sourceHash: string;
  status: BoardAssuranceAuditExportStatus;
  pendingAcknowledgementCount?: number;
  retryNeededCount?: number;
}

export interface BoardAssuranceAuditExportReport {
  auditId: string;
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  schemaVersion: 1;
  sections: BoardAssuranceAuditExportSection[];
  summary: {
    auditScore: number;
    blockedSectionCount: number;
    pendingAcknowledgementCount: number;
    readySectionCount: number;
    retryNeededCount: number;
    sectionCount: number;
    status: BoardAssuranceAuditExportStatus;
    watchSectionCount: number;
    nextAction: string;
  };
  workspaceId: string;
}

export interface CreateBoardAssuranceAuditExportInput {
  evidenceBundle: {
    bundleId: string;
    files: Array<{
      contentHash: string;
      kind: string;
      label: string;
      path: string;
      recordCount: number;
      status: BoardAssuranceAuditExportStatus;
    }>;
    generatedAt: string;
    jsonContent: string;
    jsonFileName: string;
    summary: {
      blockedEvidenceCount: number;
      evidenceScore: number;
      fileCount: number;
      readyEvidenceCount: number;
      replaySnapshotCount: number;
      status: BoardAssuranceAuditExportStatus;
      totalByteSize: number;
      watchEvidenceCount: number;
    };
    workspaceId: string;
  };
  generatedAt?: string;
  notificationHistory?: {
    records: Array<{
      acknowledgedRouteCount: number;
      contentHash: string;
      createdAt: string;
      eligibleRouteCount: number;
      historyId: string;
      pendingAcknowledgementCount: number;
      retryNeededCount: number;
      status: "critical" | "info" | "warning";
    }>;
    summary: {
      latestContentHash: string | null;
      latestEligibleRouteCount: number;
      latestRetryNeededCount: number;
      latestSavedAt: string | null;
      latestStatus: "critical" | "info" | "warning" | null;
      pendingAcknowledgementCount: number;
      totalRecordCount: number;
    };
  } | null;
  notificationRouting: {
    generatedAt: string;
    notifications: Array<{
      id: string;
      kind: string;
      severity: "critical" | "info" | "warning";
      title: string;
    }>;
    routes: Array<{
      channel: "email" | "in-app";
      recipientEmail: string;
      status: "eligible" | "suppressed-by-preference" | "suppressed-by-role";
    }>;
    summary: {
      criticalCount: number;
      eligibleRouteCount: number;
      notificationCount: number;
      routingScore: number;
      status: "critical" | "info" | "warning";
      warningCount: number;
    };
    workspaceId: string;
  };
  replaySnapshotHistory?: {
    records: Array<{
      blockedRowCount: number;
      contentHash: string;
      createdAt: string;
      replayScore: number;
      rowCount: number;
      snapshotId: string;
      status: string;
    }>;
    summary: {
      blockedRowDelta: number;
      latestContentHash: string | null;
      latestSavedAt: string | null;
      latestScore: number | null;
      scoreDelta: number;
      totalSnapshotCount: number;
    };
  } | null;
  varianceDashboard: {
    generatedAt: string;
    rows: Array<{
      delta: number;
      id: string;
      label: string;
      status: BoardAssuranceAuditExportStatus;
    }>;
    summary: {
      blockedCount: number;
      status: BoardAssuranceAuditExportStatus;
      varianceScore: number;
      watchCount: number;
    };
    workspaceId: string;
  };
  workspaceId?: string;
}

const statusRank: Record<BoardAssuranceAuditExportStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const sectionPriority: Record<BoardAssuranceAuditExportSectionId, number> = {
  "reviewer-acknowledgements": 0,
  "notification-routing": 1,
  "variance-dashboard": 2,
  "evidence-bundle": 3,
  "replay-snapshots": 4,
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeDataUri(contentType: "application/json" | "text/csv", value: string) {
  return `data:${contentType};charset=utf-8,${encodeURIComponent(value)}`;
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

function notificationStatus(status: "critical" | "info" | "warning"): BoardAssuranceAuditExportStatus {
  if (status === "critical") {
    return "blocked";
  }

  return status === "warning" ? "watch" : "ready";
}

function acknowledgementScore(pendingAcknowledgementCount: number, retryNeededCount: number) {
  return Math.max(0, Math.min(100, 100 - pendingAcknowledgementCount * 25 - retryNeededCount * 20));
}

function acknowledgementStatus(pendingAcknowledgementCount: number, retryNeededCount: number): BoardAssuranceAuditExportStatus {
  if (pendingAcknowledgementCount > 0 || retryNeededCount > 0) {
    return "blocked";
  }

  return "ready";
}

function sections(input: CreateBoardAssuranceAuditExportInput): BoardAssuranceAuditExportSection[] {
  const latestNotificationRecord = input.notificationHistory?.records.at(0) ?? null;
  const pendingAcknowledgementCount = input.notificationHistory?.summary.pendingAcknowledgementCount ?? 0;
  const retryNeededCount = input.notificationHistory?.summary.latestRetryNeededCount ?? 0;
  const replaySnapshotCount = input.replaySnapshotHistory?.summary.totalSnapshotCount ?? 0;
  const latestReplayScore = input.replaySnapshotHistory?.summary.latestScore ?? 100;

  const rows: BoardAssuranceAuditExportSection[] = [
    {
      detail: `${pendingAcknowledgementCount} pending reviewer acknowledgement${pendingAcknowledgementCount === 1 ? "" : "s"} and ${retryNeededCount} retry-needed route${retryNeededCount === 1 ? "" : "s"}.`,
      id: "reviewer-acknowledgements",
      label: "Reviewer acknowledgements",
      nextAction:
        pendingAcknowledgementCount > 0
          ? "Collect reviewer acknowledgements before closing the board assurance audit."
          : retryNeededCount > 0
            ? "Resolve retry-needed notification routes before audit closeout."
            : "Archive reviewer acknowledgements with the audit export.",
      recordCount: input.notificationHistory?.summary.totalRecordCount ?? 0,
      score: acknowledgementScore(pendingAcknowledgementCount, retryNeededCount),
      sourceHash: latestNotificationRecord?.contentHash ?? sha256(input.notificationHistory ?? null),
      status: acknowledgementStatus(pendingAcknowledgementCount, retryNeededCount),
      pendingAcknowledgementCount,
      retryNeededCount,
    },
    {
      detail: `${input.notificationRouting.summary.notificationCount} notification${input.notificationRouting.summary.notificationCount === 1 ? "" : "s"} and ${input.notificationRouting.summary.eligibleRouteCount} eligible route${input.notificationRouting.summary.eligibleRouteCount === 1 ? "" : "s"}.`,
      id: "notification-routing",
      label: "Notification routing",
      nextAction:
        input.notificationRouting.summary.status === "critical"
          ? "Resolve critical notification routes and attach delivery evidence."
          : "Keep route evidence with the audit export.",
      recordCount: input.notificationRouting.summary.notificationCount,
      score: input.notificationRouting.summary.routingScore,
      sourceHash: sha256(input.notificationRouting),
      status: notificationStatus(input.notificationRouting.summary.status),
    },
    {
      detail: `${input.varianceDashboard.summary.blockedCount} blocked variance row${input.varianceDashboard.summary.blockedCount === 1 ? "" : "s"} and ${input.varianceDashboard.summary.watchCount} watched.`,
      id: "variance-dashboard",
      label: "Variance dashboard",
      nextAction:
        input.varianceDashboard.summary.status === "blocked"
          ? "Resolve blocked variance rows before audit closeout."
          : "Archive board variance evidence with the audit export.",
      recordCount: input.varianceDashboard.rows.length,
      score: input.varianceDashboard.summary.varianceScore,
      sourceHash: sha256(input.varianceDashboard),
      status: input.varianceDashboard.summary.status,
    },
    {
      detail: `${input.evidenceBundle.summary.fileCount} bundle file${input.evidenceBundle.summary.fileCount === 1 ? "" : "s"}, ${input.evidenceBundle.summary.blockedEvidenceCount} blocked, ${input.evidenceBundle.summary.totalByteSize} bytes.`,
      id: "evidence-bundle",
      label: "Evidence bundle",
      nextAction:
        input.evidenceBundle.summary.status === "blocked"
          ? "Resolve blocked evidence bundle files before audit closeout."
          : "Attach the evidence bundle JSON to the audit export.",
      recordCount: input.evidenceBundle.summary.fileCount,
      score: input.evidenceBundle.summary.evidenceScore,
      sourceHash: sha256({
        bundleId: input.evidenceBundle.bundleId,
        files: input.evidenceBundle.files.map((file) => file.contentHash),
        jsonContent: input.evidenceBundle.jsonContent,
      }),
      status: input.evidenceBundle.summary.status,
    },
    {
      detail: `${replaySnapshotCount} replay snapshot${replaySnapshotCount === 1 ? "" : "s"}, latest score ${latestReplayScore}/100, score delta ${input.replaySnapshotHistory?.summary.scoreDelta ?? 0}.`,
      id: "replay-snapshots",
      label: "Replay snapshots",
      nextAction:
        replaySnapshotCount === 0
          ? "Save a replay snapshot before audit closeout."
          : latestReplayScore < 80
            ? "Attach remediation for low replay snapshot score."
            : "Archive replay snapshots with the audit export.",
      recordCount: replaySnapshotCount,
      score: replaySnapshotCount === 0 ? 50 : latestReplayScore,
      sourceHash: input.replaySnapshotHistory?.summary.latestContentHash ?? sha256(input.replaySnapshotHistory ?? null),
      status: replaySnapshotCount === 0 || latestReplayScore < 60 ? "blocked" : latestReplayScore < 80 ? "watch" : "ready",
    },
  ];

  return rows.sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      first.score - second.score ||
      sectionPriority[first.id] - sectionPriority[second.id],
  );
}

function createSummary(rows: BoardAssuranceAuditExportSection[]): BoardAssuranceAuditExportReport["summary"] {
  const blockedSectionCount = rows.filter((row) => row.status === "blocked").length;
  const watchSectionCount = rows.filter((row) => row.status === "watch").length;
  const readySectionCount = rows.filter((row) => row.status === "ready").length;
  const acknowledgementSection = rows.find((row) => row.id === "reviewer-acknowledgements");
  const status: BoardAssuranceAuditExportStatus = blockedSectionCount > 0 ? "blocked" : watchSectionCount > 0 ? "watch" : "ready";
  const nextRow = rows[0] ?? null;

  return {
    auditScore: rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 100,
    blockedSectionCount,
    nextAction:
      status === "ready"
        ? "Archive the board assurance audit export with the closeout packet."
        : (nextRow?.nextAction ?? "Review board assurance audit export sections before closeout."),
    pendingAcknowledgementCount: acknowledgementSection?.pendingAcknowledgementCount ?? 0,
    readySectionCount,
    retryNeededCount: acknowledgementSection?.retryNeededCount ?? 0,
    sectionCount: rows.length,
    status,
    watchSectionCount,
  };
}

function createCsv(rows: BoardAssuranceAuditExportSection[]) {
  const header = ["section", "status", "score", "records", "source_hash", "next_action"];
  const body = rows.map((row) => [row.id, row.status, row.score, row.recordCount, row.sourceHash, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  sections: BoardAssuranceAuditExportSection[];
  summary: BoardAssuranceAuditExportReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      schemaVersion: 1,
      sections: input.sections,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardAssuranceAuditExport(input: CreateBoardAssuranceAuditExportInput): BoardAssuranceAuditExportReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.evidenceBundle.workspaceId;
  const rows = sections(input);
  const summary = createSummary(rows);
  const jsonContent = createJson({ generatedAt, sections: rows, summary, workspaceId });
  const csvContent = createCsv(rows);
  const filePrefix = `${slug(workspaceId)}-board-assurance-audit-${dateStamp(generatedAt)}`;

  return {
    auditId: `board-assurance-audit-${slug(workspaceId)}-${dateStamp(generatedAt)}`,
    csvContent,
    csvDataUri: encodeDataUri("text/csv", csvContent),
    csvFileName: `${filePrefix}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeDataUri("application/json", jsonContent),
    jsonFileName: `${filePrefix}.json`,
    schemaVersion: 1,
    sections: rows,
    summary,
    workspaceId,
  };
}
