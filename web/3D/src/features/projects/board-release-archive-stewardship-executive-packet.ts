import { createHash } from "node:crypto";
import type { BoardReleaseArchiveStewardshipContinuityRehearsalReport } from "@/features/projects/board-release-archive-stewardship-continuity-rehearsal";
import type { BoardReleaseArchiveStewardshipEvidenceAgingForecastReport } from "@/features/projects/board-release-archive-stewardship-evidence-aging-forecast";
import type { BoardReleaseArchiveStewardshipExceptionBudgetLedgerReport } from "@/features/projects/board-release-archive-stewardship-exception-budget-ledger";
import type { BoardReleaseArchiveStewardshipOwnershipRotationPlannerReport } from "@/features/projects/board-release-archive-stewardship-ownership-rotation-planner";

export type BoardReleaseArchiveStewardshipExecutivePacketKind =
  | "continuity-rehearsal"
  | "evidence-aging"
  | "exception-budget"
  | "ownership-rotation"
  | "release-recommendation";

export type BoardReleaseArchiveStewardshipExecutivePacketStatus = "approved" | "blocked" | "watch";

export interface BoardReleaseArchiveStewardshipExecutivePacketRow {
  evidenceHash: string;
  id: string;
  kind: BoardReleaseArchiveStewardshipExecutivePacketKind;
  nextAction: string;
  packetHash: string;
  score: number;
  status: BoardReleaseArchiveStewardshipExecutivePacketStatus;
  title: string;
}

export interface BoardReleaseArchiveStewardshipExecutivePacketReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveStewardshipExecutivePacketRow[];
  summary: {
    approvedCount: number;
    blockedCount: number;
    nextAction: string;
    releaseRecommendation: string;
    rowCount: number;
    status: BoardReleaseArchiveStewardshipExecutivePacketStatus;
    stewardshipPacketHash: string;
    stewardshipScore: number;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveStewardshipExecutivePacketInput {
  continuityRehearsal: BoardReleaseArchiveStewardshipContinuityRehearsalReport;
  evidenceAgingForecast: BoardReleaseArchiveStewardshipEvidenceAgingForecastReport;
  exceptionBudgetLedger: BoardReleaseArchiveStewardshipExceptionBudgetLedgerReport;
  generatedAt?: string;
  ownershipRotationPlanner: BoardReleaseArchiveStewardshipOwnershipRotationPlannerReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveStewardshipExecutivePacketKind, number> = {
  "ownership-rotation": 0,
  "evidence-aging": 1,
  "exception-budget": 2,
  "continuity-rehearsal": 3,
  "release-recommendation": 4,
};

const statusRank: Record<BoardReleaseArchiveStewardshipExecutivePacketStatus, number> = {
  blocked: 0,
  watch: 1,
  approved: 2,
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

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
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

function mapStatus(status: "approved" | "blocked" | "healthy" | "ready" | "watch") {
  if (status === "blocked") {
    return "blocked" satisfies BoardReleaseArchiveStewardshipExecutivePacketStatus;
  }

  return status === "watch" ? "watch" : "approved";
}

function row(input: {
  evidenceHash: string;
  kind: BoardReleaseArchiveStewardshipExecutivePacketKind;
  nextAction: string;
  score: number;
  status: BoardReleaseArchiveStewardshipExecutivePacketStatus;
  title: string;
  workspaceId: string;
}) {
  const packetHash = sha256({
    evidenceHash: input.evidenceHash,
    kind: input.kind,
    score: input.score,
    status: input.status,
    title: input.title,
  });

  return {
    evidenceHash: input.evidenceHash,
    id: `archive-stewardship-executive-packet:${slug(input.workspaceId)}:${input.kind}`,
    kind: input.kind,
    nextAction: input.nextAction,
    packetHash,
    score: input.score,
    status: input.status,
    title: input.title,
  } satisfies BoardReleaseArchiveStewardshipExecutivePacketRow;
}

function recommendation(input: {
  componentRows: BoardReleaseArchiveStewardshipExecutivePacketRow[];
  workspaceId: string;
}) {
  const blocked = input.componentRows.filter((entry) => entry.status === "blocked");
  const watch = input.componentRows.filter((entry) => entry.status === "watch");
  const score = Math.round(input.componentRows.reduce((total, entry) => total + entry.score, 0) / Math.max(1, input.componentRows.length));
  const status: BoardReleaseArchiveStewardshipExecutivePacketStatus = blocked.length > 0 ? "blocked" : watch.length > 0 ? "watch" : "approved";
  const nextAction =
    status === "blocked"
      ? `Resolve ${blocked[0]?.title ?? "blocked archive stewardship evidence"} before release recommendation.`
      : status === "watch"
        ? `Monitor ${watch[0]?.title ?? "watch archive stewardship evidence"} before final release recommendation.`
        : "Approve archive stewardship packet for release governance.";

  return row({
    evidenceHash: sha256(input.componentRows.map((entry) => entry.packetHash)),
    kind: "release-recommendation",
    nextAction,
    score,
    status,
    title: "Archive stewardship release recommendation",
    workspaceId: input.workspaceId,
  });
}

function createRows(input: CreateBoardReleaseArchiveStewardshipExecutivePacketInput & { workspaceId: string }) {
  const componentRows = [
    row({
      evidenceHash: input.ownershipRotationPlanner.summary.rotationPlannerHash,
      kind: "ownership-rotation",
      nextAction: input.ownershipRotationPlanner.summary.nextAction,
      score: input.ownershipRotationPlanner.summary.rotationScore,
      status: mapStatus(input.ownershipRotationPlanner.summary.status),
      title: "Ownership rotation planner",
      workspaceId: input.workspaceId,
    }),
    row({
      evidenceHash: input.evidenceAgingForecast.summary.forecastHash,
      kind: "evidence-aging",
      nextAction: input.evidenceAgingForecast.summary.nextAction,
      score: input.evidenceAgingForecast.summary.forecastScore,
      status: mapStatus(input.evidenceAgingForecast.summary.status),
      title: "Evidence aging forecast",
      workspaceId: input.workspaceId,
    }),
    row({
      evidenceHash: input.exceptionBudgetLedger.summary.budgetLedgerHash,
      kind: "exception-budget",
      nextAction: input.exceptionBudgetLedger.summary.nextAction,
      score: input.exceptionBudgetLedger.summary.budgetScore,
      status: mapStatus(input.exceptionBudgetLedger.summary.status),
      title: "Exception budget ledger",
      workspaceId: input.workspaceId,
    }),
    row({
      evidenceHash: input.continuityRehearsal.summary.continuityHash,
      kind: "continuity-rehearsal",
      nextAction: input.continuityRehearsal.summary.nextAction,
      score: input.continuityRehearsal.summary.rehearsalScore,
      status: mapStatus(input.continuityRehearsal.summary.status),
      title: "Continuity rehearsal",
      workspaceId: input.workspaceId,
    }),
  ];

  return [...componentRows, recommendation({ componentRows, workspaceId: input.workspaceId })].sort(
    (first, second) => kindRank[first.kind] - kindRank[second.kind] || statusRank[first.status] - statusRank[second.status] || first.title.localeCompare(second.title),
  );
}

function releaseRecommendationFor(input: {
  blockedCount: number;
  stewardshipScore: number;
  watchCount: number;
}) {
  if (input.blockedCount > 0) {
    return `BLOCK archive stewardship packet until blocked ownership, aging, exception budget, or continuity evidence is repaired. Current score: ${input.stewardshipScore}/100.`;
  }

  if (input.watchCount > 0) {
    return `WATCH archive stewardship packet and complete executive monitoring before final release recommendation. Current score: ${input.stewardshipScore}/100.`;
  }

  return `APPROVE archive stewardship packet with ownership rotation, evidence aging, exception budget, and continuity rehearsal ready. Current score: ${input.stewardshipScore}/100.`;
}

function summarize(rows: BoardReleaseArchiveStewardshipExecutivePacketRow[]): BoardReleaseArchiveStewardshipExecutivePacketReport["summary"] {
  const approvedCount = rows.filter((entry) => entry.status === "approved").length;
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const status: BoardReleaseArchiveStewardshipExecutivePacketStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "approved";
  const stewardshipScore = rows.length > 0 ? Math.max(0, Math.round(rows.reduce((total, entry) => total + entry.score, 0) / rows.length - blockedCount * 12 - watchCount * 5)) : 100;
  const nextRow = rows.find((entry) => entry.status === "blocked") ?? rows.find((entry) => entry.status === "watch") ?? rows.find((entry) => entry.kind === "release-recommendation") ?? null;

  return {
    approvedCount,
    blockedCount,
    nextAction: nextRow?.nextAction ?? "Review archive stewardship executive packet.",
    releaseRecommendation: releaseRecommendationFor({
      blockedCount,
      stewardshipScore,
      watchCount,
    }),
    rowCount: rows.length,
    status,
    stewardshipPacketHash: sha256(rows.map((entry) => entry.packetHash)),
    stewardshipScore,
    watchCount,
  };
}

function createCsv(rows: BoardReleaseArchiveStewardshipExecutivePacketRow[]) {
  const header = ["packet_id", "kind", "title", "status", "score", "evidence_hash", "packet_hash", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.kind, entry.title, entry.status, entry.score, entry.evidenceHash, entry.packetHash, entry.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveStewardshipExecutivePacketRow[];
  summary: BoardReleaseArchiveStewardshipExecutivePacketReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveStewardshipExecutivePacket(
  input: CreateBoardReleaseArchiveStewardshipExecutivePacketInput,
): BoardReleaseArchiveStewardshipExecutivePacketReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.ownershipRotationPlanner.workspaceId;
  const rows = createRows({
    ...input,
    workspaceId,
  });
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-stewardship-executive-packet-${dateStamp(generatedAt)}`;

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
