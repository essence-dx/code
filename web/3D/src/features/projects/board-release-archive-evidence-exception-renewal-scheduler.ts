import { createHash } from "node:crypto";
import type {
  BoardReleaseArchiveIntelligenceApprovalRow,
  BoardReleaseArchiveIntelligenceApprovalWorkflowReport,
} from "@/features/projects/board-release-archive-intelligence-approval-workflow";
import type { BoardReleaseArchiveEvidenceReviewerPacketReport } from "@/features/projects/board-release-archive-evidence-reviewer-packets";

export type BoardReleaseArchiveEvidenceExceptionRenewalKind = "exception-note" | "packet-hash-signoff" | "reviewer-acknowledgement";
export type BoardReleaseArchiveEvidenceExceptionRenewalStatus = "blocked" | "due-soon" | "overdue" | "scheduled";

export interface BoardReleaseArchiveEvidenceExceptionRenewalRow {
  currentPacketHash: string;
  dueAt: string;
  hoursUntilDue: number;
  id: string;
  kind: BoardReleaseArchiveEvidenceExceptionRenewalKind;
  nextAction: string;
  ownerEmail: string;
  ownerName: string;
  recommendationId: string | null;
  renewalHash: string;
  signedPacketHash: string | null;
  sourceHash: string;
  status: BoardReleaseArchiveEvidenceExceptionRenewalStatus;
  title: string;
}

export interface BoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveEvidenceExceptionRenewalRow[];
  summary: {
    blockedCount: number;
    dueSoonCount: number;
    nextAction: string;
    overdueCount: number;
    renewalHash: string;
    renewalScore: number;
    rowCount: number;
    scheduledCount: number;
    status: BoardReleaseArchiveEvidenceExceptionRenewalStatus;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveEvidenceExceptionRenewalSchedulerInput {
  approvalWorkflow: BoardReleaseArchiveIntelligenceApprovalWorkflowReport | null;
  dueSoonHours?: number;
  exceptionRenewalHours?: number;
  generatedAt?: string;
  reviewerPackets: BoardReleaseArchiveEvidenceReviewerPacketReport;
  signOffRenewalHours?: number;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseArchiveEvidenceExceptionRenewalStatus, number> = {
  overdue: 0,
  blocked: 1,
  "due-soon": 2,
  scheduled: 3,
};

const kindRank: Record<BoardReleaseArchiveEvidenceExceptionRenewalKind, number> = {
  "packet-hash-signoff": 0,
  "exception-note": 1,
  "reviewer-acknowledgement": 2,
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

  return JSON.stringify(value) ?? "null";
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex")}`;
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
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

function addHours(value: string, hours: number) {
  const date = new Date(value);
  const base = Number.isNaN(date.getTime()) ? Date.now() : date.getTime();

  return new Date(base + hours * 60 * 60 * 1000).toISOString();
}

function hoursUntil(dueAt: string, generatedAt: string) {
  const diff = new Date(dueAt).getTime() - new Date(generatedAt).getTime();

  return Number.isNaN(diff) ? 0 : Math.ceil(diff / (60 * 60 * 1000));
}

function statusFor(hoursUntilDue: number, dueSoonHours: number, blocked: boolean): BoardReleaseArchiveEvidenceExceptionRenewalStatus {
  if (hoursUntilDue <= 0) {
    return "overdue";
  }

  if (blocked) {
    return "blocked";
  }

  return hoursUntilDue <= dueSoonHours ? "due-soon" : "scheduled";
}

function nextActionFor(input: {
  kind: BoardReleaseArchiveEvidenceExceptionRenewalKind;
  status: BoardReleaseArchiveEvidenceExceptionRenewalStatus;
  title: string;
}) {
  if (input.status === "overdue") {
    return `Renew ${input.title} immediately before board archive evidence handoff.`;
  }

  if (input.status === "blocked") {
    return `Refresh missing or stale source evidence for ${input.title}.`;
  }

  if (input.status === "due-soon") {
    return `Schedule renewal confirmation for ${input.title} before the due window closes.`;
  }

  return input.kind === "reviewer-acknowledgement"
    ? `Track acknowledgement window for ${input.title}.`
    : `Keep renewal schedule attached to ${input.title}.`;
}

function createRenewalRow(input: {
  currentPacketHash: string;
  dueAt: string;
  dueSoonHours: number;
  generatedAt: string;
  kind: BoardReleaseArchiveEvidenceExceptionRenewalKind;
  ownerEmail: string;
  ownerName: string;
  recommendationId: string | null;
  signedPacketHash: string | null;
  sourceHash: string;
  title: string;
  workspaceId: string;
}) {
  const hours = hoursUntil(input.dueAt, input.generatedAt);
  const blocked = input.kind === "packet-hash-signoff" && input.signedPacketHash !== input.currentPacketHash;
  const status = statusFor(hours, input.dueSoonHours, blocked);
  const id = `archive-evidence-renewal:${slug(input.workspaceId)}:${input.kind}:${slug(input.recommendationId ?? input.title)}:${dateStamp(input.generatedAt)}`;
  const renewalHash = sha256({
    currentPacketHash: input.currentPacketHash,
    dueAt: input.dueAt,
    id,
    kind: input.kind,
    ownerEmail: input.ownerEmail,
    signedPacketHash: input.signedPacketHash,
    sourceHash: input.sourceHash,
    status,
  });

  return {
    currentPacketHash: input.currentPacketHash,
    dueAt: input.dueAt,
    hoursUntilDue: hours,
    id,
    kind: input.kind,
    nextAction: nextActionFor({ kind: input.kind, status, title: input.title }),
    ownerEmail: input.ownerEmail,
    ownerName: input.ownerName,
    recommendationId: input.recommendationId,
    renewalHash,
    signedPacketHash: input.signedPacketHash,
    sourceHash: input.sourceHash,
    status,
    title: input.title,
  } satisfies BoardReleaseArchiveEvidenceExceptionRenewalRow;
}

function approvalRows(input: {
  approvalWorkflow: BoardReleaseArchiveIntelligenceApprovalWorkflowReport | null;
  currentPacketHash: string;
  dueSoonHours: number;
  exceptionRenewalHours: number;
  generatedAt: string;
  signOffRenewalHours: number;
  workspaceId: string;
}) {
  return (input.approvalWorkflow?.rows ?? []).flatMap((row) => {
    const rows: BoardReleaseArchiveEvidenceExceptionRenewalRow[] = [];

    if (row.status === "exception-needed" || row.exceptionNote) {
      rows.push(
        createRenewalRow({
          currentPacketHash: input.currentPacketHash,
          dueAt: addHours(row.acknowledgedAt ?? row.signedOffAt ?? input.generatedAt, input.exceptionRenewalHours),
          dueSoonHours: input.dueSoonHours,
          generatedAt: input.generatedAt,
          kind: "exception-note",
          ownerEmail: row.reviewerEmail,
          ownerName: row.reviewerName,
          recommendationId: row.recommendationId,
          signedPacketHash: row.signedPacketHash,
          sourceHash: row.approvalHash,
          title: `${row.title} exception note`,
          workspaceId: input.workspaceId,
        }),
      );
    }

    if (row.status === "hash-mismatch" || row.signedPacketHash !== input.currentPacketHash) {
      rows.push(
        createRenewalRow({
          currentPacketHash: input.currentPacketHash,
          dueAt: addHours(row.signedOffAt ?? row.acknowledgedAt ?? input.generatedAt, input.signOffRenewalHours),
          dueSoonHours: input.dueSoonHours,
          generatedAt: input.generatedAt,
          kind: "packet-hash-signoff",
          ownerEmail: row.reviewerEmail,
          ownerName: row.reviewerName,
          recommendationId: row.recommendationId,
          signedPacketHash: row.signedPacketHash,
          sourceHash: row.approvalHash,
          title: `${row.title} packet hash sign-off`,
          workspaceId: input.workspaceId,
        }),
      );
    }

    return rows;
  });
}

function reviewerPacketRows(input: {
  dueSoonHours: number;
  generatedAt: string;
  reviewerPackets: BoardReleaseArchiveEvidenceReviewerPacketReport;
  workspaceId: string;
}) {
  return input.reviewerPackets.packets.map((packet) =>
    createRenewalRow({
      currentPacketHash: packet.packetHash,
      dueAt: addHours(input.reviewerPackets.generatedAt, packet.acknowledgementWindowHours),
      dueSoonHours: input.dueSoonHours,
      generatedAt: input.generatedAt,
      kind: "reviewer-acknowledgement",
      ownerEmail: packet.reviewerEmail ?? `${packet.audience}@external.review`,
      ownerName: packet.reviewerName,
      recommendationId: null,
      signedPacketHash: packet.packetHash,
      sourceHash: packet.evidenceHash,
      title: `${packet.title} acknowledgement`,
      workspaceId: input.workspaceId,
    }),
  );
}

function createCsv(rows: BoardReleaseArchiveEvidenceExceptionRenewalRow[]) {
  const header = [
    "renewal_id",
    "kind",
    "title",
    "status",
    "owner",
    "owner_email",
    "due_at",
    "hours_until_due",
    "recommendation_id",
    "current_packet_hash",
    "signed_packet_hash",
    "source_hash",
    "renewal_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.id,
      row.kind,
      row.title,
      row.status,
      row.ownerName,
      row.ownerEmail,
      row.dueAt,
      row.hoursUntilDue,
      row.recommendationId,
      row.currentPacketHash,
      row.signedPacketHash,
      row.sourceHash,
      row.renewalHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveEvidenceExceptionRenewalRow[]): BoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const overdueCount = rows.filter((row) => row.status === "overdue").length;
  const dueSoonCount = rows.filter((row) => row.status === "due-soon").length;
  const scheduledCount = rows.filter((row) => row.status === "scheduled").length;
  const status = rows.reduce<BoardReleaseArchiveEvidenceExceptionRenewalStatus>(
    (worst, row) => (statusRank[row.status] < statusRank[worst] ? row.status : worst),
    "scheduled",
  );
  const nextRow = rows.find((row) => row.status !== "scheduled") ?? rows[0] ?? null;

  return {
    blockedCount,
    dueSoonCount,
    nextAction: rows.length === 0 ? "No archive evidence renewals are currently required." : (nextRow?.nextAction ?? "Keep archive evidence renewal schedule attached."),
    overdueCount,
    renewalHash: sha256(rows.map((row) => row.renewalHash)),
    renewalScore: rows.length > 0 ? Math.max(0, Math.round(100 - overdueCount * 24 - blockedCount * 18 - dueSoonCount * 8)) : 100,
    rowCount: rows.length,
    scheduledCount,
    status,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveEvidenceExceptionRenewalRow[];
  summary: BoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport(
  input: CreateBoardReleaseArchiveEvidenceExceptionRenewalSchedulerInput,
): BoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.reviewerPackets.workspaceId;
  const dueSoonHours = input.dueSoonHours ?? 24;
  const rows = [
    ...approvalRows({
      approvalWorkflow: input.approvalWorkflow,
      currentPacketHash: input.approvalWorkflow?.summary.packetHash ?? input.reviewerPackets.summary.reviewerPacketHash,
      dueSoonHours,
      exceptionRenewalHours: input.exceptionRenewalHours ?? 72,
      generatedAt,
      signOffRenewalHours: input.signOffRenewalHours ?? 24,
      workspaceId,
    }),
    ...reviewerPacketRows({
      dueSoonHours,
      generatedAt,
      reviewerPackets: input.reviewerPackets,
      workspaceId,
    }),
  ].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      first.hoursUntilDue - second.hoursUntilDue ||
      kindRank[first.kind] - kindRank[second.kind] ||
      first.title.localeCompare(second.title),
  );
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-evidence-exception-renewals-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    rows,
    summary,
    workspaceId,
  };
}
