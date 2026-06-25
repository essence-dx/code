export type BoardGovernanceExecutiveDigestStatus = "blocked" | "ready" | "watch";
export type BoardGovernanceExecutiveDigestKind = "control-score" | "decision-risk" | "evidence-freshness" | "reviewer-workload";

export interface BoardGovernanceExecutiveDigestRow {
  detail: string;
  id: string;
  kind: BoardGovernanceExecutiveDigestKind;
  metric: string;
  nextAction: string;
  score: number;
  status: BoardGovernanceExecutiveDigestStatus;
  title: string;
}

export interface BoardGovernanceExecutiveDigestReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  executiveMemo: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardGovernanceExecutiveDigestRow[];
  schemaVersion: 1;
  summary: {
    blockedDecisionCount: number;
    digestScore: number;
    nextAction: string;
    overloadedReviewerCount: number;
    riskCount: number;
    staleEvidenceCount: number;
    status: BoardGovernanceExecutiveDigestStatus;
    unassignedTaskCount: number;
    watchCount: number;
  };
  workspaceId: string;
}

interface ControlCenterInput {
  rows: Array<{
    id: string;
    label: string;
    nextAction: string;
    owner: string;
    score: number;
    status: BoardGovernanceExecutiveDigestStatus;
  }>;
  summary: {
    blockedCount: number;
    controlScore: number;
    nextAction: string;
    readyCount?: number;
    rowCount: number;
    savedReviewCycleCount?: number;
    status: BoardGovernanceExecutiveDigestStatus;
    watchCount: number;
  };
}

interface DecisionLedgerInput {
  decisions: Array<{
    id: string;
    nextAction: string;
    owner: string;
    score: number;
    source: string;
    sourceHash?: string | null;
    sourceId: string;
    status: BoardGovernanceExecutiveDigestStatus;
    title: string;
  }>;
  summary: {
    blockedCount: number;
    decisionCount: number;
    ledgerScore: number;
    linkedSourceCount: number;
    nextAction: string;
    readyCount?: number;
    status: BoardGovernanceExecutiveDigestStatus;
    watchCount: number;
  };
}

interface FreshnessMonitorInput {
  rows: Array<{
    ageDays: number;
    id: string;
    kind: string;
    nextAction: string;
    owner: string;
    score: number;
    sourceHash?: string | null;
    sourceId: string;
    status: "expired" | "fresh" | "stale" | "watch";
    title: string;
  }>;
  summary: {
    expiredCount: number;
    freshCount?: number;
    freshnessScore: number;
    nextAction: string;
    rowCount: number;
    staleCount: number;
    status: BoardGovernanceExecutiveDigestStatus;
    watchCount: number;
  };
}

interface ReviewerWorkloadInput {
  rows: Array<{
    agendaItemCount: number;
    exceptionSignoffCount: number;
    nextAction: string;
    packetReviewCount: number;
    pendingAcknowledgementCount: number;
    reviewerEmail: string | null;
    reviewerName: string;
    status: "balanced" | "blocked" | "overloaded" | "watch";
    tasks?: unknown[];
    workloadPoints: number;
  }>;
  summary: {
    balanceScore: number;
    nextAction: string;
    overloadedReviewerCount: number;
    reviewerCount: number;
    status: BoardGovernanceExecutiveDigestStatus;
    totalWorkloadPoints: number;
    unassignedTaskCount: number;
    watchReviewerCount: number;
  };
}

export interface CreateBoardGovernanceExecutiveDigestInput {
  controlCenter: ControlCenterInput | null;
  decisionLedger: DecisionLedgerInput | null;
  freshnessMonitor: FreshnessMonitorInput | null;
  generatedAt?: string;
  reviewerWorkload: ReviewerWorkloadInput | null;
  workspaceId?: string;
}

const statusRank: Record<BoardGovernanceExecutiveDigestStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const kindRank: Record<BoardGovernanceExecutiveDigestKind, number> = {
  "control-score": 0,
  "decision-risk": 1,
  "evidence-freshness": 2,
  "reviewer-workload": 3,
};

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

function controlRow(input: CreateBoardGovernanceExecutiveDigestInput): BoardGovernanceExecutiveDigestRow | null {
  const control = input.controlCenter;

  if (!control) {
    return null;
  }

  return {
    detail: `${control.summary.blockedCount} blocked control${control.summary.blockedCount === 1 ? "" : "s"}, ${control.summary.watchCount} watched, ${control.summary.rowCount} total controls.`,
    id: "control-score",
    kind: "control-score",
    metric: `${control.summary.controlScore}/100 control score`,
    nextAction: control.summary.nextAction,
    score: control.summary.controlScore,
    status: control.summary.status,
    title: "Board control score",
  };
}

function decisionRow(input: CreateBoardGovernanceExecutiveDigestInput): BoardGovernanceExecutiveDigestRow | null {
  const ledger = input.decisionLedger;

  if (!ledger) {
    return null;
  }

  return {
    detail: `${ledger.summary.blockedCount} blocked decision${ledger.summary.blockedCount === 1 ? "" : "s"}, ${ledger.summary.watchCount} watched, ${ledger.summary.linkedSourceCount} linked sources.`,
    id: "decision-risk",
    kind: "decision-risk",
    metric: `${ledger.summary.blockedCount} blocked decisions`,
    nextAction: ledger.summary.nextAction,
    score: ledger.summary.ledgerScore,
    status: ledger.summary.status,
    title: "Unresolved decision risk",
  };
}

function freshnessRow(input: CreateBoardGovernanceExecutiveDigestInput): BoardGovernanceExecutiveDigestRow | null {
  const freshness = input.freshnessMonitor;

  if (!freshness) {
    return null;
  }

  return {
    detail: `${freshness.summary.staleCount} stale evidence row${freshness.summary.staleCount === 1 ? "" : "s"}, ${freshness.summary.expiredCount} expired acknowledgement row${freshness.summary.expiredCount === 1 ? "" : "s"}.`,
    id: "evidence-freshness",
    kind: "evidence-freshness",
    metric: `${freshness.summary.freshnessScore}/100 freshness`,
    nextAction: freshness.summary.nextAction,
    score: freshness.summary.freshnessScore,
    status: freshness.summary.status,
    title: "Evidence freshness risk",
  };
}

function workloadRow(input: CreateBoardGovernanceExecutiveDigestInput): BoardGovernanceExecutiveDigestRow | null {
  const workload = input.reviewerWorkload;

  if (!workload) {
    return null;
  }

  return {
    detail: `${workload.summary.overloadedReviewerCount} overloaded reviewer${workload.summary.overloadedReviewerCount === 1 ? "" : "s"}, ${workload.summary.unassignedTaskCount} unassigned task${workload.summary.unassignedTaskCount === 1 ? "" : "s"}, ${workload.summary.totalWorkloadPoints} total workload points.`,
    id: "reviewer-workload",
    kind: "reviewer-workload",
    metric: `${workload.summary.balanceScore}/100 workload balance`,
    nextAction: workload.summary.nextAction,
    score: workload.summary.balanceScore,
    status: workload.summary.status,
    title: "Reviewer workload summary",
  };
}

function createRows(input: CreateBoardGovernanceExecutiveDigestInput) {
  return [controlRow(input), decisionRow(input), freshnessRow(input), workloadRow(input)]
    .filter((row): row is BoardGovernanceExecutiveDigestRow => Boolean(row))
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || kindRank[first.kind] - kindRank[second.kind] || first.title.localeCompare(second.title));
}

function createSummary(rows: BoardGovernanceExecutiveDigestRow[], input: CreateBoardGovernanceExecutiveDigestInput): BoardGovernanceExecutiveDigestReport["summary"] {
  const blockedRows = rows.filter((row) => row.status === "blocked").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const status: BoardGovernanceExecutiveDigestStatus = blockedRows > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";
  const nextRow = rows[0] ?? null;

  return {
    blockedDecisionCount: input.decisionLedger?.summary.blockedCount ?? 0,
    digestScore: rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 100,
    nextAction: status === "ready" ? "Archive the executive board governance digest with the closeout packet." : (nextRow?.nextAction ?? "Review board governance executive digest before closeout."),
    overloadedReviewerCount: input.reviewerWorkload?.summary.overloadedReviewerCount ?? 0,
    riskCount: blockedRows + watchCount,
    staleEvidenceCount: (input.freshnessMonitor?.summary.staleCount ?? 0) + (input.freshnessMonitor?.summary.expiredCount ?? 0),
    status,
    unassignedTaskCount: input.reviewerWorkload?.summary.unassignedTaskCount ?? 0,
    watchCount,
  };
}

function createExecutiveMemo(summary: BoardGovernanceExecutiveDigestReport["summary"], rows: BoardGovernanceExecutiveDigestRow[]) {
  const rowLine = rows.map((row) => `${row.title}: ${row.status} (${row.metric})`).join("; ");

  if (summary.status === "blocked") {
    return `Board governance is blocked by ${summary.riskCount} executive risk signal${summary.riskCount === 1 ? "" : "s"}. ${rowLine} Next action: ${summary.nextAction}`;
  }

  if (summary.status === "watch") {
    return `Board governance is under watch with ${summary.watchCount} monitored signal${summary.watchCount === 1 ? "" : "s"}. ${rowLine} Next action: ${summary.nextAction}`;
  }

  return `Board governance is ready for closeout. ${rowLine} Next action: ${summary.nextAction}`;
}

function createCsv(rows: BoardGovernanceExecutiveDigestRow[]) {
  const header = ["digest_id", "kind", "status", "score", "metric", "next_action"];
  const body = rows.map((row) => [row.id, row.kind, row.status, row.score, row.metric, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  executiveMemo: string;
  generatedAt: string;
  rows: BoardGovernanceExecutiveDigestRow[];
  summary: BoardGovernanceExecutiveDigestReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      executiveMemo: input.executiveMemo,
      generatedAt: input.generatedAt,
      rows: input.rows,
      schemaVersion: 1,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardGovernanceExecutiveDigest(input: CreateBoardGovernanceExecutiveDigestInput): BoardGovernanceExecutiveDigestReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows(input);
  const summary = createSummary(rows, input);
  const executiveMemo = createExecutiveMemo(summary, rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({ executiveMemo, generatedAt, rows, summary, workspaceId });
  const filePrefix = `${slug(workspaceId)}-board-governance-executive-digest-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeDataUri("text/csv", csvContent),
    csvFileName: `${filePrefix}.csv`,
    executiveMemo,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeDataUri("application/json", jsonContent),
    jsonFileName: `${filePrefix}.json`,
    rows,
    schemaVersion: 1,
    summary,
    workspaceId,
  };
}
