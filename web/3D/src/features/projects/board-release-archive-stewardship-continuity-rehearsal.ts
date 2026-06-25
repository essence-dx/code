import { createHash } from "node:crypto";
import type { BoardReleaseArchiveOversightExecutiveHealthKind } from "@/features/projects/board-release-archive-oversight-executive-health-packet";
import type {
  BoardReleaseArchiveStewardshipExceptionBudgetLedgerReport,
  BoardReleaseArchiveStewardshipExceptionBudgetLedgerRow,
} from "@/features/projects/board-release-archive-stewardship-exception-budget-ledger";

export type BoardReleaseArchiveStewardshipContinuityRehearsalStatus = "blocked" | "ready" | "watch";

export interface BoardReleaseArchiveStewardshipContinuityRehearsalOverride {
  evidenceHash: string | null;
  governanceResumeMinutes: number;
  kind: BoardReleaseArchiveOversightExecutiveHealthKind;
  ownerHandoffMinutes: number;
  packetRecoveryMinutes: number;
}

export interface BoardReleaseArchiveStewardshipContinuityRehearsalRow {
  budgetHash: string;
  evidenceHash: string | null;
  governanceResumeMinutes: number;
  id: string;
  kind: BoardReleaseArchiveOversightExecutiveHealthKind;
  nextAction: string;
  ownerHandoffMinutes: number;
  packetRecoveryMinutes: number;
  rehearsalHash: string;
  rehearsalScore: number;
  status: BoardReleaseArchiveStewardshipContinuityRehearsalStatus;
  title: string;
}

export interface BoardReleaseArchiveStewardshipContinuityRehearsalReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveStewardshipContinuityRehearsalRow[];
  summary: {
    blockedCount: number;
    continuityHash: string;
    nextAction: string;
    readyCount: number;
    rehearsalScore: number;
    rowCount: number;
    status: BoardReleaseArchiveStewardshipContinuityRehearsalStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveStewardshipContinuityRehearsalInput {
  exceptionBudgetLedger: BoardReleaseArchiveStewardshipExceptionBudgetLedgerReport;
  generatedAt?: string;
  rehearsalOverrides?: BoardReleaseArchiveStewardshipContinuityRehearsalOverride[];
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveOversightExecutiveHealthKind, number> = {
  "exception-renewals": 0,
  "evidence-quality": 1,
  "board-distribution": 2,
  "incident-replay": 3,
  "release-recommendation": 4,
};

const statusRank: Record<BoardReleaseArchiveStewardshipContinuityRehearsalStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
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

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function defaultRehearsal(input: {
  row: BoardReleaseArchiveStewardshipExceptionBudgetLedgerRow;
  workspaceId: string;
}) {
  const ownerHandoffMinutes = input.row.status === "blocked" ? 90 : input.row.status === "watch" ? 35 : 15;
  const packetRecoveryMinutes = input.row.status === "blocked" ? 120 : input.row.status === "watch" ? 50 : 20;
  const governanceResumeMinutes = input.row.status === "blocked" ? 180 : input.row.status === "watch" ? 75 : 30;

  return {
    evidenceHash: sha256({
      budgetHash: input.row.budgetHash,
      governanceResumeMinutes,
      kind: input.row.kind,
      ownerHandoffMinutes,
      packetRecoveryMinutes,
      workspaceId: input.workspaceId,
    }),
    governanceResumeMinutes,
    ownerHandoffMinutes,
    packetRecoveryMinutes,
  };
}

function statusFor(input: {
  budgetStatus: BoardReleaseArchiveStewardshipExceptionBudgetLedgerRow["status"];
  evidenceHash: string | null;
  governanceResumeMinutes: number;
  ownerHandoffMinutes: number;
  packetRecoveryMinutes: number;
}) {
  const hasEvidence = Boolean(input.evidenceHash?.startsWith("sha256:"));

  if (
    input.budgetStatus === "blocked" ||
    !hasEvidence ||
    input.ownerHandoffMinutes > 60 ||
    input.packetRecoveryMinutes > 90 ||
    input.governanceResumeMinutes > 120
  ) {
    return "blocked" satisfies BoardReleaseArchiveStewardshipContinuityRehearsalStatus;
  }

  if (
    input.budgetStatus === "watch" ||
    input.ownerHandoffMinutes > 30 ||
    input.packetRecoveryMinutes > 45 ||
    input.governanceResumeMinutes > 60
  ) {
    return "watch" satisfies BoardReleaseArchiveStewardshipContinuityRehearsalStatus;
  }

  return "ready" satisfies BoardReleaseArchiveStewardshipContinuityRehearsalStatus;
}

function scoreFor(input: {
  evidenceHash: string | null;
  governanceResumeMinutes: number;
  ownerHandoffMinutes: number;
  packetRecoveryMinutes: number;
  status: BoardReleaseArchiveStewardshipContinuityRehearsalStatus;
}) {
  if (input.status === "ready") {
    return 100;
  }

  const evidencePenalty = input.evidenceHash?.startsWith("sha256:") ? 0 : 25;
  const handoffPenalty = Math.max(0, input.ownerHandoffMinutes - 15) * 0.6;
  const packetPenalty = Math.max(0, input.packetRecoveryMinutes - 20) * 0.45;
  const governancePenalty = Math.max(0, input.governanceResumeMinutes - 30) * 0.3;

  return clamp(100 - evidencePenalty - handoffPenalty - packetPenalty - governancePenalty);
}

function nextActionFor(input: {
  status: BoardReleaseArchiveStewardshipContinuityRehearsalStatus;
  title: string;
}) {
  if (input.status === "blocked") {
    return `Recover blocked archive stewardship continuity rehearsal for ${input.title}.`;
  }

  if (input.status === "watch") {
    return `Tighten archive stewardship continuity rehearsal timing for ${input.title}.`;
  }

  return `Keep archive stewardship continuity rehearsal ready for ${input.title}.`;
}

function createRows(input: CreateBoardReleaseArchiveStewardshipContinuityRehearsalInput & { workspaceId: string }) {
  const overrides = new Map((input.rehearsalOverrides ?? []).map((entry) => [entry.kind, entry]));

  return input.exceptionBudgetLedger.rows
    .map((entry) => {
      const defaults = defaultRehearsal({
        row: entry,
        workspaceId: input.workspaceId,
      });
      const override = overrides.get(entry.kind);
      const evidenceHash = override ? override.evidenceHash : defaults.evidenceHash;
      const ownerHandoffMinutes = Math.max(0, Math.round(override?.ownerHandoffMinutes ?? defaults.ownerHandoffMinutes));
      const packetRecoveryMinutes = Math.max(0, Math.round(override?.packetRecoveryMinutes ?? defaults.packetRecoveryMinutes));
      const governanceResumeMinutes = Math.max(0, Math.round(override?.governanceResumeMinutes ?? defaults.governanceResumeMinutes));
      const status = statusFor({
        budgetStatus: entry.status,
        evidenceHash,
        governanceResumeMinutes,
        ownerHandoffMinutes,
        packetRecoveryMinutes,
      });
      const rehearsalScore = scoreFor({
        evidenceHash,
        governanceResumeMinutes,
        ownerHandoffMinutes,
        packetRecoveryMinutes,
        status,
      });
      const rehearsalHash = sha256({
        budgetHash: entry.budgetHash,
        evidenceHash,
        governanceResumeMinutes,
        kind: entry.kind,
        ownerHandoffMinutes,
        packetRecoveryMinutes,
        rehearsalScore,
        status,
      });

      return {
        budgetHash: entry.budgetHash,
        evidenceHash,
        governanceResumeMinutes,
        id: `archive-stewardship-continuity-rehearsal:${slug(input.workspaceId)}:${entry.kind}`,
        kind: entry.kind,
        nextAction: nextActionFor({
          status,
          title: entry.title,
        }),
        ownerHandoffMinutes,
        packetRecoveryMinutes,
        rehearsalHash,
        rehearsalScore,
        status,
        title: entry.title,
      } satisfies BoardReleaseArchiveStewardshipContinuityRehearsalRow;
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || kindRank[first.kind] - kindRank[second.kind] || first.title.localeCompare(second.title));
}

function createCsv(rows: BoardReleaseArchiveStewardshipContinuityRehearsalRow[]) {
  const header = [
    "rehearsal_id",
    "kind",
    "title",
    "status",
    "owner_handoff_minutes",
    "packet_recovery_minutes",
    "governance_resume_minutes",
    "evidence_hash",
    "rehearsal_score",
    "rehearsal_hash",
    "next_action",
  ];
  const body = rows.map((entry) =>
    [
      entry.id,
      entry.kind,
      entry.title,
      entry.status,
      entry.ownerHandoffMinutes,
      entry.packetRecoveryMinutes,
      entry.governanceResumeMinutes,
      entry.evidenceHash,
      entry.rehearsalScore,
      entry.rehearsalHash,
      entry.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveStewardshipContinuityRehearsalRow[]): BoardReleaseArchiveStewardshipContinuityRehearsalReport["summary"] {
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const readyCount = rows.filter((entry) => entry.status === "ready").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const status: BoardReleaseArchiveStewardshipContinuityRehearsalStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";
  const nextRow = rows.find((entry) => entry.status === "blocked") ?? rows.find((entry) => entry.status === "watch") ?? rows[0] ?? null;

  return {
    blockedCount,
    continuityHash: sha256(rows.map((entry) => entry.rehearsalHash)),
    nextAction: status === "ready" ? "Archive stewardship continuity rehearsal is ready." : (nextRow?.nextAction ?? "Review archive stewardship continuity rehearsal."),
    readyCount,
    rehearsalScore: rows.length > 0 ? Math.round(rows.reduce((total, entry) => total + entry.rehearsalScore, 0) / rows.length) : 100,
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveStewardshipContinuityRehearsalRow[];
  summary: BoardReleaseArchiveStewardshipContinuityRehearsalReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveStewardshipContinuityRehearsal(
  input: CreateBoardReleaseArchiveStewardshipContinuityRehearsalInput,
): BoardReleaseArchiveStewardshipContinuityRehearsalReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.exceptionBudgetLedger.workspaceId;
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-stewardship-continuity-rehearsal-${dateStamp(generatedAt)}`;

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
