import { createHash } from "node:crypto";
import type { BoardReleaseArchiveOversightExecutiveHealthKind } from "@/features/projects/board-release-archive-oversight-executive-health-packet";
import type {
  BoardReleaseArchiveStewardshipOwnershipRotationPlannerReport,
  BoardReleaseArchiveStewardshipOwnershipRotationPlannerRow,
} from "@/features/projects/board-release-archive-stewardship-ownership-rotation-planner";

export type BoardReleaseArchiveStewardshipEvidenceAgingForecastStatus = "blocked" | "healthy" | "watch";

export interface BoardReleaseArchiveStewardshipEvidenceAgingForecastOverride {
  kind: BoardReleaseArchiveOversightExecutiveHealthKind;
  reviewerCapacity: number;
  staleHashRisk: number;
}

export interface BoardReleaseArchiveStewardshipEvidenceAgingForecastRow {
  agingHash: string;
  forecastScore: number;
  id: string;
  kind: BoardReleaseArchiveOversightExecutiveHealthKind;
  nextAction: string;
  renewalPressure: number;
  reviewerCapacity: number;
  rotationDueAt: string;
  rotationHash: string;
  staleHashRisk: number;
  status: BoardReleaseArchiveStewardshipEvidenceAgingForecastStatus;
  title: string;
}

export interface BoardReleaseArchiveStewardshipEvidenceAgingForecastReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveStewardshipEvidenceAgingForecastRow[];
  summary: {
    blockedCount: number;
    forecastHash: string;
    forecastScore: number;
    healthyCount: number;
    nextAction: string;
    rowCount: number;
    status: BoardReleaseArchiveStewardshipEvidenceAgingForecastStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveStewardshipEvidenceAgingForecastInput {
  forecastOverrides?: BoardReleaseArchiveStewardshipEvidenceAgingForecastOverride[];
  generatedAt?: string;
  rotationPlanner: BoardReleaseArchiveStewardshipOwnershipRotationPlannerReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveOversightExecutiveHealthKind, number> = {
  "exception-renewals": 0,
  "evidence-quality": 1,
  "board-distribution": 2,
  "incident-replay": 3,
  "release-recommendation": 4,
};

const statusRank: Record<BoardReleaseArchiveStewardshipEvidenceAgingForecastStatus, number> = {
  blocked: 0,
  watch: 1,
  healthy: 2,
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

function daysUntil(input: { dueAt: string; generatedAt: string }) {
  const dueAt = new Date(input.dueAt).getTime();
  const now = new Date(input.generatedAt).getTime();

  if (Number.isNaN(dueAt) || Number.isNaN(now)) {
    return 30;
  }

  return Math.ceil((dueAt - now) / (24 * 60 * 60 * 1000));
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function renewalPressureFor(input: {
  generatedAt: string;
  row: BoardReleaseArchiveStewardshipOwnershipRotationPlannerRow;
}) {
  const days = daysUntil({
    dueAt: input.row.rotationDueAt,
    generatedAt: input.generatedAt,
  });

  if (days <= 0) {
    return 100;
  }

  return clamp(100 - days * 5);
}

function defaultSignals(input: {
  generatedAt: string;
  row: BoardReleaseArchiveStewardshipOwnershipRotationPlannerRow;
}) {
  const renewalPressure = renewalPressureFor(input);
  const staleHashRisk = input.row.status === "blocked" ? 90 : input.row.status === "watch" ? 54 : Math.max(0, renewalPressure - 35);
  const reviewerCapacity = input.row.status === "blocked" ? 45 : input.row.status === "watch" ? 68 : 100;

  return {
    renewalPressure,
    reviewerCapacity,
    staleHashRisk,
  };
}

function statusFor(input: {
  renewalPressure: number;
  reviewerCapacity: number;
  staleHashRisk: number;
}) {
  if (input.staleHashRisk >= 80 || input.reviewerCapacity < 40 || input.renewalPressure >= 95) {
    return "blocked" satisfies BoardReleaseArchiveStewardshipEvidenceAgingForecastStatus;
  }

  if (input.staleHashRisk >= 40 || input.reviewerCapacity < 70 || input.renewalPressure >= 70) {
    return "watch" satisfies BoardReleaseArchiveStewardshipEvidenceAgingForecastStatus;
  }

  return "healthy" satisfies BoardReleaseArchiveStewardshipEvidenceAgingForecastStatus;
}

function nextActionFor(input: {
  status: BoardReleaseArchiveStewardshipEvidenceAgingForecastStatus;
  title: string;
}) {
  if (input.status === "blocked") {
    return `Reduce blocked archive stewardship evidence aging risk for ${input.title}.`;
  }

  if (input.status === "watch") {
    return `Monitor archive stewardship evidence aging pressure for ${input.title}.`;
  }

  return `Keep archive stewardship evidence aging forecast healthy for ${input.title}.`;
}

function createRows(input: CreateBoardReleaseArchiveStewardshipEvidenceAgingForecastInput & { generatedAt: string; workspaceId: string }) {
  const overrides = new Map((input.forecastOverrides ?? []).map((entry) => [entry.kind, entry]));

  return input.rotationPlanner.rows
    .map((entry) => {
      const defaults = defaultSignals({
        generatedAt: input.generatedAt,
        row: entry,
      });
      const override = overrides.get(entry.kind);
      const renewalPressure = defaults.renewalPressure;
      const staleHashRisk = override?.staleHashRisk ?? defaults.staleHashRisk;
      const reviewerCapacity = override?.reviewerCapacity ?? defaults.reviewerCapacity;
      const status = statusFor({
        renewalPressure,
        reviewerCapacity,
        staleHashRisk,
      });
      const forecastScore =
        status === "healthy" ? 100 : clamp(100 - renewalPressure * 0.25 - staleHashRisk * 0.45 - (100 - reviewerCapacity) * 0.3);
      const agingHash = sha256({
        forecastScore,
        kind: entry.kind,
        renewalPressure,
        reviewerCapacity,
        rotationHash: entry.handoffHash,
        staleHashRisk,
        status,
      });

      return {
        agingHash,
        forecastScore,
        id: `archive-stewardship-evidence-aging:${slug(input.workspaceId)}:${entry.kind}`,
        kind: entry.kind,
        nextAction: nextActionFor({
          status,
          title: entry.title,
        }),
        renewalPressure,
        reviewerCapacity,
        rotationDueAt: entry.rotationDueAt,
        rotationHash: entry.handoffHash,
        staleHashRisk,
        status,
        title: entry.title,
      } satisfies BoardReleaseArchiveStewardshipEvidenceAgingForecastRow;
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || kindRank[first.kind] - kindRank[second.kind] || first.title.localeCompare(second.title));
}

function createCsv(rows: BoardReleaseArchiveStewardshipEvidenceAgingForecastRow[]) {
  const header = ["forecast_id", "kind", "title", "status", "forecast_score", "renewal_pressure", "stale_hash_risk", "reviewer_capacity", "rotation_due_at", "aging_hash", "next_action"];
  const body = rows.map((entry) =>
    [
      entry.id,
      entry.kind,
      entry.title,
      entry.status,
      entry.forecastScore,
      entry.renewalPressure,
      entry.staleHashRisk,
      entry.reviewerCapacity,
      entry.rotationDueAt,
      entry.agingHash,
      entry.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveStewardshipEvidenceAgingForecastRow[]): BoardReleaseArchiveStewardshipEvidenceAgingForecastReport["summary"] {
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const healthyCount = rows.filter((entry) => entry.status === "healthy").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const status: BoardReleaseArchiveStewardshipEvidenceAgingForecastStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "healthy";
  const nextRow = rows.find((entry) => entry.status === "blocked") ?? rows.find((entry) => entry.status === "watch") ?? rows[0] ?? null;

  return {
    blockedCount,
    forecastHash: sha256(rows.map((entry) => entry.agingHash)),
    forecastScore: rows.length > 0 ? Math.round(rows.reduce((total, entry) => total + entry.forecastScore, 0) / rows.length) : 100,
    healthyCount,
    nextAction: status === "healthy" ? "Archive stewardship evidence aging forecast is healthy." : (nextRow?.nextAction ?? "Review archive stewardship evidence aging forecast."),
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveStewardshipEvidenceAgingForecastRow[];
  summary: BoardReleaseArchiveStewardshipEvidenceAgingForecastReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveStewardshipEvidenceAgingForecast(
  input: CreateBoardReleaseArchiveStewardshipEvidenceAgingForecastInput,
): BoardReleaseArchiveStewardshipEvidenceAgingForecastReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.rotationPlanner.workspaceId;
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-stewardship-evidence-aging-forecast-${dateStamp(generatedAt)}`;

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
