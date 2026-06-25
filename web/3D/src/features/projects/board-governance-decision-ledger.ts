export type BoardGovernanceDecisionLedgerStatus = "blocked" | "ready" | "watch";
export type BoardGovernanceDecisionLedgerSource = "agenda-decision" | "audit-export" | "closeout-control" | "exception" | "packet-approval";

export interface BoardGovernanceDecisionLedgerRow {
  detail: string;
  id: string;
  nextAction: string;
  owner: string;
  score: number;
  source: BoardGovernanceDecisionLedgerSource;
  sourceHash: string | null;
  sourceId: string;
  status: BoardGovernanceDecisionLedgerStatus;
  title: string;
}

export interface BoardGovernanceDecisionLedgerReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  decisions: BoardGovernanceDecisionLedgerRow[];
  generatedAt: string;
  summary: {
    blockedCount: number;
    decisionCount: number;
    ledgerScore: number;
    linkedSourceCount: number;
    nextAction: string;
    readyCount: number;
    status: BoardGovernanceDecisionLedgerStatus;
    watchCount: number;
  };
  workspaceId: string;
}

interface AgendaInputItem {
  decisionPrompt?: string;
  dueAt?: string | null;
  evidence?: string;
  href?: string | null;
  id: string;
  kind?: string;
  nextAction: string;
  ownerEmail?: string | null;
  ownerName?: string;
  priority?: number;
  sourceId?: string;
  sourceLabel?: string;
  status: BoardGovernanceDecisionLedgerStatus;
  topic: string;
}

interface AuditInputSection {
  detail?: string;
  id: string;
  label: string;
  nextAction: string;
  recordCount?: number;
  score: number;
  sourceHash?: string;
  status: BoardGovernanceDecisionLedgerStatus;
}

interface ControlInputRow {
  detail?: string;
  id: string;
  label: string;
  nextAction: string;
  owner: string;
  score: number;
  status: BoardGovernanceDecisionLedgerStatus;
}

interface ExceptionInputRow {
  approverSignoff?: string | null;
  expiresAt?: string | null;
  evidence?: string;
  exceptionId?: string | null;
  releaseGateStatus?: string;
  requestedAt?: string | null;
  requestedBy?: string | null;
  id: string;
  nextAction: string;
  scopeId?: string;
  signedOffAt?: string | null;
  signedOffBy?: string | null;
  status: string;
  title: string;
}

interface PacketHistoryInputRecord {
  approvalScore: number;
  approvalStatus: BoardGovernanceDecisionLedgerStatus;
  blockedSignOffCount: number;
  contentHash?: string;
  createdAt?: string;
  createdBy?: {
    email: string | null;
    name: string | null;
  };
  packetId: string;
  recipientPurpose: string;
  status: string;
}

export interface CreateBoardGovernanceDecisionLedgerInput {
  agenda: {
    items: AgendaInputItem[];
    summary?: unknown;
  } | null;
  auditExport: {
    auditId: string;
    sections: AuditInputSection[];
    summary?: unknown;
  } | null;
  controlCenter: {
    rows: ControlInputRow[];
    summary?: unknown;
  } | null;
  exceptionWorkflow: {
    rows: ExceptionInputRow[];
    summary?: {
      approvedCount?: number;
      releaseGateBlockedCount?: number;
      status?: string;
      totalCount?: number;
      workflowScore?: number;
    };
  } | null;
  generatedAt?: string;
  packetHistory: {
    records: PacketHistoryInputRecord[];
    summary?: unknown;
  } | null;
  workspaceId?: string;
}

const statusRank: Record<BoardGovernanceDecisionLedgerStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const sourceRank: Record<BoardGovernanceDecisionLedgerSource, number> = {
  "closeout-control": 0,
  "audit-export": 1,
  "packet-approval": 2,
  exception: 3,
  "agenda-decision": 4,
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

function normalizeExceptionStatus(status: string): BoardGovernanceDecisionLedgerStatus {
  return status === "approved" ? "ready" : status === "pending" ? "watch" : "blocked";
}

function agendaScore(status: BoardGovernanceDecisionLedgerStatus) {
  if (status === "ready") {
    return 100;
  }

  return status === "watch" ? 65 : 30;
}

function exceptionScore(row: ExceptionInputRow, fallbackScore: number) {
  if (row.status === "approved") {
    return 100;
  }

  if (row.status === "pending") {
    return 50;
  }

  if (typeof fallbackScore === "number") {
    return clamp(fallbackScore);
  }

  return row.status === "request-needed" ? 35 : 30;
}

function controlRows(input: CreateBoardGovernanceDecisionLedgerInput): BoardGovernanceDecisionLedgerRow[] {
  return (
    input.controlCenter?.rows
      .filter((row) => row.status !== "ready" || row.id === "closeout-report")
      .map((row) => ({
        detail: row.detail ?? row.label,
        id: `closeout:${row.id}`,
        nextAction: row.nextAction,
        owner: row.owner,
        score: clamp(row.score),
        source: "closeout-control" as const,
        sourceHash: null,
        sourceId: row.id,
        status: row.status,
        title: row.label,
      })) ?? []
  );
}

function auditRows(input: CreateBoardGovernanceDecisionLedgerInput): BoardGovernanceDecisionLedgerRow[] {
  return (
    input.auditExport?.sections
      .filter((section) => section.status !== "ready")
      .map((section) => ({
        detail: section.detail ?? `${section.label} from ${input.auditExport?.auditId ?? "audit export"}.`,
        id: `audit:${section.id}`,
        nextAction: section.nextAction,
        owner: "Audit owner",
        score: clamp(section.score),
        source: "audit-export" as const,
        sourceHash: section.sourceHash ?? null,
        sourceId: `${input.auditExport?.auditId ?? "audit"}:${section.id}`,
        status: section.status,
        title: section.label,
      })) ?? []
  );
}

function packetRows(input: CreateBoardGovernanceDecisionLedgerInput): BoardGovernanceDecisionLedgerRow[] {
  return (
    input.packetHistory?.records
      .filter((record) => record.status === "active" && record.approvalStatus !== "ready")
      .map((record) => ({
        detail: `${record.recipientPurpose} has ${record.blockedSignOffCount} blocked sign-off${record.blockedSignOffCount === 1 ? "" : "s"}.`,
        id: `packet:${record.packetId}`,
        nextAction: record.approvalStatus === "blocked" ? "Resolve blocked packet sign-offs before board approval." : "Confirm watched packet sign-offs before closeout.",
        owner: record.createdBy?.name ?? record.createdBy?.email ?? "Packet owner",
        score: clamp(record.approvalScore - record.blockedSignOffCount * 20),
        source: "packet-approval" as const,
        sourceHash: record.contentHash ?? null,
        sourceId: record.packetId,
        status: record.approvalStatus,
        title: record.recipientPurpose,
      })) ?? []
  );
}

function exceptionRows(input: CreateBoardGovernanceDecisionLedgerInput): BoardGovernanceDecisionLedgerRow[] {
  const fallbackScore = input.exceptionWorkflow?.summary?.workflowScore ?? 35;

  return (
    input.exceptionWorkflow?.rows
      .filter((row) => row.status !== "approved")
      .map((row) => ({
        detail: row.evidence ?? row.title,
        id: `exception:${row.id}`,
        nextAction: row.nextAction,
        owner: row.signedOffBy ?? "Exception owner",
        score: exceptionScore(row, fallbackScore),
        source: "exception" as const,
        sourceHash: row.exceptionId ?? null,
        sourceId: row.scopeId ?? row.id,
        status: normalizeExceptionStatus(row.status),
        title: row.title,
      })) ?? []
  );
}

function agendaRows(input: CreateBoardGovernanceDecisionLedgerInput): BoardGovernanceDecisionLedgerRow[] {
  return (
    input.agenda?.items
      .filter((item) => item.kind === "decision" && item.status !== "ready")
      .map((item) => ({
        detail: item.decisionPrompt ?? item.evidence ?? item.topic,
        id: `agenda:${item.id}`,
        nextAction: item.nextAction,
        owner: item.ownerName ?? "Board owner",
        score: agendaScore(item.status),
        source: "agenda-decision" as const,
        sourceHash: item.sourceLabel ?? null,
        sourceId: item.sourceId ?? item.id,
        status: item.status,
        title: item.topic,
      })) ?? []
  );
}

function createRows(input: CreateBoardGovernanceDecisionLedgerInput) {
  return [...controlRows(input), ...auditRows(input), ...packetRows(input), ...exceptionRows(input), ...agendaRows(input)].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      sourceRank[first.source] - sourceRank[second.source] ||
      first.score - second.score ||
      first.title.localeCompare(second.title),
  );
}

function createSummary(rows: BoardGovernanceDecisionLedgerRow[]): BoardGovernanceDecisionLedgerReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const status: BoardGovernanceDecisionLedgerStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";
  const nextRow = rows[0] ?? null;

  return {
    blockedCount,
    decisionCount: rows.length,
    ledgerScore: rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 100,
    linkedSourceCount: new Set(rows.map((row) => row.id)).size,
    nextAction: status === "ready" ? "Archive the board governance decision ledger with the closeout packet." : (nextRow?.nextAction ?? "Review board governance decisions before closeout."),
    readyCount,
    status,
    watchCount,
  };
}

function createCsv(rows: BoardGovernanceDecisionLedgerRow[]) {
  const header = ["decision_id", "source", "status", "owner", "source_hash", "next_action"];
  const body = rows.map((row) => [row.id, row.source, row.status, row.owner, row.sourceHash, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createBoardGovernanceDecisionLedger(input: CreateBoardGovernanceDecisionLedgerInput): BoardGovernanceDecisionLedgerReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const decisions = createRows(input);
  const summary = createSummary(decisions);
  const csvContent = createCsv(decisions);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(workspaceId)}-board-governance-decision-ledger-${dateStamp(generatedAt)}.csv`,
    decisions,
    generatedAt,
    summary,
    workspaceId,
  };
}
