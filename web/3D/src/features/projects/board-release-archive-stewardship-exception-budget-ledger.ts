import { createHash } from "node:crypto";
import type { BoardReleaseArchiveOversightExecutiveHealthKind } from "@/features/projects/board-release-archive-oversight-executive-health-packet";
import type {
  BoardReleaseArchiveStewardshipEvidenceAgingForecastReport,
  BoardReleaseArchiveStewardshipEvidenceAgingForecastRow,
} from "@/features/projects/board-release-archive-stewardship-evidence-aging-forecast";

export type BoardReleaseArchiveStewardshipExceptionBudgetStatus = "approved" | "blocked" | "watch";

export interface BoardReleaseArchiveStewardshipExceptionBudgetOverride {
  acceptedRisk: number;
  boardApprovalHash: string | null;
  burnDownPercent: number;
  expiryAt: string;
  kind: BoardReleaseArchiveOversightExecutiveHealthKind;
}

export interface BoardReleaseArchiveStewardshipExceptionBudgetLedgerRow {
  acceptedRisk: number;
  boardApprovalHash: string | null;
  budgetHash: string;
  budgetScore: number;
  burnDownPercent: number;
  expiryAt: string;
  forecastHash: string;
  id: string;
  kind: BoardReleaseArchiveOversightExecutiveHealthKind;
  nextAction: string;
  status: BoardReleaseArchiveStewardshipExceptionBudgetStatus;
  title: string;
}

export interface BoardReleaseArchiveStewardshipExceptionBudgetLedgerReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveStewardshipExceptionBudgetLedgerRow[];
  summary: {
    approvedCount: number;
    blockedCount: number;
    budgetLedgerHash: string;
    budgetScore: number;
    nextAction: string;
    rowCount: number;
    status: BoardReleaseArchiveStewardshipExceptionBudgetStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveStewardshipExceptionBudgetLedgerInput {
  agingForecast: BoardReleaseArchiveStewardshipEvidenceAgingForecastReport;
  budgetOverrides?: BoardReleaseArchiveStewardshipExceptionBudgetOverride[];
  generatedAt?: string;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveOversightExecutiveHealthKind, number> = {
  "exception-renewals": 0,
  "evidence-quality": 1,
  "board-distribution": 2,
  "incident-replay": 3,
  "release-recommendation": 4,
};

const statusRank: Record<BoardReleaseArchiveStewardshipExceptionBudgetStatus, number> = {
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

function daysUntil(input: { dueAt: string; generatedAt: string }) {
  const dueAt = new Date(input.dueAt).getTime();
  const now = new Date(input.generatedAt).getTime();

  if (Number.isNaN(dueAt) || Number.isNaN(now)) {
    return 30;
  }

  return Math.ceil((dueAt - now) / (24 * 60 * 60 * 1000));
}

function addDays(input: { days: number; generatedAt: string }) {
  const date = new Date(input.generatedAt);

  if (Number.isNaN(date.getTime())) {
    return input.generatedAt;
  }

  date.setUTCDate(date.getUTCDate() + input.days);

  return date.toISOString();
}

function defaultBudget(input: {
  generatedAt: string;
  row: BoardReleaseArchiveStewardshipEvidenceAgingForecastRow;
  workspaceId: string;
}) {
  const acceptedRisk = input.row.status === "blocked" ? 86 : input.row.status === "watch" ? 56 : Math.max(0, 100 - input.row.forecastScore);
  const burnDownPercent = input.row.status === "blocked" ? 24 : input.row.status === "watch" ? 62 : 100;
  const expiryAt = addDays({
    days: input.row.status === "blocked" ? 7 : input.row.status === "watch" ? 14 : 30,
    generatedAt: input.generatedAt,
  });

  return {
    acceptedRisk,
    boardApprovalHash: sha256({
      acceptedRisk,
      agingHash: input.row.agingHash,
      burnDownPercent,
      expiryAt,
      kind: input.row.kind,
      workspaceId: input.workspaceId,
    }),
    burnDownPercent,
    expiryAt,
  };
}

function statusFor(input: {
  acceptedRisk: number;
  boardApprovalHash: string | null;
  burnDownPercent: number;
  expiryAt: string;
  forecastStatus: BoardReleaseArchiveStewardshipEvidenceAgingForecastRow["status"];
  generatedAt: string;
}) {
  const daysRemaining = daysUntil({
    dueAt: input.expiryAt,
    generatedAt: input.generatedAt,
  });
  const hasApproval = Boolean(input.boardApprovalHash?.startsWith("sha256:"));

  if (
    input.forecastStatus === "blocked" ||
    input.acceptedRisk >= 80 ||
    input.burnDownPercent < 30 ||
    daysRemaining < 0 ||
    !hasApproval
  ) {
    return "blocked" satisfies BoardReleaseArchiveStewardshipExceptionBudgetStatus;
  }

  if (input.forecastStatus === "watch" || input.acceptedRisk >= 50 || input.burnDownPercent < 70 || daysRemaining <= 7) {
    return "watch" satisfies BoardReleaseArchiveStewardshipExceptionBudgetStatus;
  }

  return "approved" satisfies BoardReleaseArchiveStewardshipExceptionBudgetStatus;
}

function nextActionFor(input: {
  status: BoardReleaseArchiveStewardshipExceptionBudgetStatus;
  title: string;
}) {
  if (input.status === "blocked") {
    return `Reduce blocked archive stewardship exception budget for ${input.title}.`;
  }

  if (input.status === "watch") {
    return `Review archive stewardship exception budget burn-down for ${input.title}.`;
  }

  return `Keep archive stewardship exception budget approved for ${input.title}.`;
}

function scoreFor(input: {
  acceptedRisk: number;
  boardApprovalHash: string | null;
  burnDownPercent: number;
  expiryAt: string;
  generatedAt: string;
  status: BoardReleaseArchiveStewardshipExceptionBudgetStatus;
}) {
  if (input.status === "approved") {
    return 100;
  }

  const daysRemaining = daysUntil({
    dueAt: input.expiryAt,
    generatedAt: input.generatedAt,
  });
  const expiryPenalty = daysRemaining < 0 ? 25 : daysRemaining <= 7 ? 10 : 0;
  const approvalPenalty = input.boardApprovalHash?.startsWith("sha256:") ? 0 : 25;

  return clamp(100 - input.acceptedRisk * 0.45 - (100 - input.burnDownPercent) * 0.35 - expiryPenalty - approvalPenalty);
}

function createRows(input: CreateBoardReleaseArchiveStewardshipExceptionBudgetLedgerInput & { generatedAt: string; workspaceId: string }) {
  const overrides = new Map((input.budgetOverrides ?? []).map((entry) => [entry.kind, entry]));

  return input.agingForecast.rows
    .map((entry) => {
      const defaults = defaultBudget({
        generatedAt: input.generatedAt,
        row: entry,
        workspaceId: input.workspaceId,
      });
      const override = overrides.get(entry.kind);
      const acceptedRisk = clamp(override?.acceptedRisk ?? defaults.acceptedRisk);
      const burnDownPercent = clamp(override?.burnDownPercent ?? defaults.burnDownPercent);
      const boardApprovalHash = override ? override.boardApprovalHash : defaults.boardApprovalHash;
      const expiryAt = override?.expiryAt ?? defaults.expiryAt;
      const status = statusFor({
        acceptedRisk,
        boardApprovalHash,
        burnDownPercent,
        expiryAt,
        forecastStatus: entry.status,
        generatedAt: input.generatedAt,
      });
      const budgetScore = scoreFor({
        acceptedRisk,
        boardApprovalHash,
        burnDownPercent,
        expiryAt,
        generatedAt: input.generatedAt,
        status,
      });
      const budgetHash = sha256({
        acceptedRisk,
        boardApprovalHash,
        budgetScore,
        burnDownPercent,
        expiryAt,
        forecastHash: entry.agingHash,
        kind: entry.kind,
        status,
      });

      return {
        acceptedRisk,
        boardApprovalHash,
        budgetHash,
        budgetScore,
        burnDownPercent,
        expiryAt,
        forecastHash: entry.agingHash,
        id: `archive-stewardship-exception-budget:${slug(input.workspaceId)}:${entry.kind}`,
        kind: entry.kind,
        nextAction: nextActionFor({
          status,
          title: entry.title,
        }),
        status,
        title: entry.title,
      } satisfies BoardReleaseArchiveStewardshipExceptionBudgetLedgerRow;
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || kindRank[first.kind] - kindRank[second.kind] || first.title.localeCompare(second.title));
}

function createCsv(rows: BoardReleaseArchiveStewardshipExceptionBudgetLedgerRow[]) {
  const header = [
    "budget_id",
    "kind",
    "title",
    "status",
    "accepted_risk",
    "expiry_at",
    "burn_down_percent",
    "board_approval_hash",
    "budget_score",
    "budget_hash",
    "next_action",
  ];
  const body = rows.map((entry) =>
    [
      entry.id,
      entry.kind,
      entry.title,
      entry.status,
      entry.acceptedRisk,
      entry.expiryAt,
      entry.burnDownPercent,
      entry.boardApprovalHash,
      entry.budgetScore,
      entry.budgetHash,
      entry.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveStewardshipExceptionBudgetLedgerRow[]): BoardReleaseArchiveStewardshipExceptionBudgetLedgerReport["summary"] {
  const approvedCount = rows.filter((entry) => entry.status === "approved").length;
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const status: BoardReleaseArchiveStewardshipExceptionBudgetStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "approved";
  const nextRow = rows.find((entry) => entry.status === "blocked") ?? rows.find((entry) => entry.status === "watch") ?? rows[0] ?? null;

  return {
    approvedCount,
    blockedCount,
    budgetLedgerHash: sha256(rows.map((entry) => entry.budgetHash)),
    budgetScore: rows.length > 0 ? Math.round(rows.reduce((total, entry) => total + entry.budgetScore, 0) / rows.length) : 100,
    nextAction: status === "approved" ? "Archive stewardship exception budget ledger is approved." : (nextRow?.nextAction ?? "Review archive stewardship exception budget ledger."),
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveStewardshipExceptionBudgetLedgerRow[];
  summary: BoardReleaseArchiveStewardshipExceptionBudgetLedgerReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveStewardshipExceptionBudgetLedger(
  input: CreateBoardReleaseArchiveStewardshipExceptionBudgetLedgerInput,
): BoardReleaseArchiveStewardshipExceptionBudgetLedgerReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.agingForecast.workspaceId;
  const rows = createRows({
    ...input,
    generatedAt,
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-stewardship-exception-budget-ledger-${dateStamp(generatedAt)}`;

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
