import { createHash } from "node:crypto";
import type {
  BoardReleaseArchiveCustodyExecutiveCloseoutDigestKind,
  BoardReleaseArchiveCustodyExecutiveCloseoutDigestReport,
} from "@/features/projects/board-release-archive-custody-executive-closeout-digest";

export type BoardReleaseArchiveOversightExceptionRenewalStatus = "complete" | "due-soon" | "overdue" | "scheduled";

export interface BoardReleaseArchiveOversightExceptionRenewalOverride {
  completedAt?: string | null;
  dueAt: string;
  kind: BoardReleaseArchiveCustodyExecutiveCloseoutDigestKind;
  renewalEvidenceHash: string | null;
}

export interface BoardReleaseArchiveOversightExceptionRenewalCalendarRow {
  closeoutHash: string;
  dueAt: string;
  id: string;
  kind: BoardReleaseArchiveCustodyExecutiveCloseoutDigestKind;
  nextAction: string;
  renewalEvidenceHash: string | null;
  renewalHash: string;
  status: BoardReleaseArchiveOversightExceptionRenewalStatus;
  title: string;
}

export interface BoardReleaseArchiveOversightExceptionRenewalCalendarReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveOversightExceptionRenewalCalendarRow[];
  summary: {
    completedCount: number;
    dueSoonCount: number;
    nextAction: string;
    overdueCount: number;
    renewalCalendarHash: string;
    renewalScore: number;
    rowCount: number;
    scheduledCount: number;
    status: "blocked" | "scheduled" | "watch";
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveOversightExceptionRenewalCalendarInput {
  closeoutDigest: BoardReleaseArchiveCustodyExecutiveCloseoutDigestReport;
  generatedAt?: string;
  renewalOverrides?: BoardReleaseArchiveOversightExceptionRenewalOverride[];
  workspaceId?: string;
}

const renewalDays: Record<BoardReleaseArchiveCustodyExecutiveCloseoutDigestKind, number> = {
  "access-review": 14,
  "chain-of-control": 30,
  "release-recommendation": 30,
  "restore-rehearsal": 21,
  "retention-lock": 45,
};

const kindRank: Record<BoardReleaseArchiveCustodyExecutiveCloseoutDigestKind, number> = {
  "access-review": 0,
  "restore-rehearsal": 1,
  "chain-of-control": 2,
  "release-recommendation": 3,
  "retention-lock": 4,
};

const statusRank: Record<BoardReleaseArchiveOversightExceptionRenewalStatus, number> = {
  overdue: 0,
  "due-soon": 1,
  scheduled: 2,
  complete: 3,
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

function addDays(value: string, days: number) {
  const date = new Date(value);
  const base = Number.isNaN(date.getTime()) ? Date.now() : date.getTime();

  return new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
}

function daysUntil(input: { dueAt: string; generatedAt: string }) {
  const dueAt = new Date(input.dueAt).getTime();
  const now = new Date(input.generatedAt).getTime();

  if (Number.isNaN(dueAt) || Number.isNaN(now)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.ceil((dueAt - now) / (24 * 60 * 60 * 1000));
}

function statusFor(input: {
  dueAt: string;
  generatedAt: string;
  renewalEvidenceHash: string | null;
}) {
  if (input.renewalEvidenceHash?.startsWith("sha256:")) {
    return "complete" satisfies BoardReleaseArchiveOversightExceptionRenewalStatus;
  }

  const remainingDays = daysUntil({
    dueAt: input.dueAt,
    generatedAt: input.generatedAt,
  });

  if (remainingDays < 0) {
    return "overdue" satisfies BoardReleaseArchiveOversightExceptionRenewalStatus;
  }

  return remainingDays <= 7 ? "due-soon" : "scheduled";
}

function nextActionFor(input: {
  kind: BoardReleaseArchiveCustodyExecutiveCloseoutDigestKind;
  status: BoardReleaseArchiveOversightExceptionRenewalStatus;
  title: string;
}) {
  if (input.status === "overdue") {
    return `Renew overdue archive oversight exception evidence for ${input.title}.`;
  }

  if (input.status === "due-soon") {
    return `Prepare archive oversight renewal evidence for ${input.title}.`;
  }

  if (input.status === "complete") {
    return `Keep renewed archive oversight evidence attached for ${input.title}.`;
  }

  return `Track ${input.kind} renewal date for ${input.title}.`;
}

function createRows(input: CreateBoardReleaseArchiveOversightExceptionRenewalCalendarInput & { generatedAt: string; workspaceId: string }) {
  const overrides = new Map((input.renewalOverrides ?? []).map((entry) => [entry.kind, entry]));

  return input.closeoutDigest.rows
    .map((entry) => {
      const override = overrides.get(entry.kind);
      const dueAt = override?.dueAt ?? addDays(input.generatedAt, renewalDays[entry.kind]);
      const renewalEvidenceHash = override?.renewalEvidenceHash ?? null;
      const status = statusFor({
        dueAt,
        generatedAt: input.generatedAt,
        renewalEvidenceHash,
      });
      const renewalHash = sha256({
        closeoutHash: entry.closeoutHash,
        completedAt: override?.completedAt ?? null,
        dueAt,
        kind: entry.kind,
        renewalEvidenceHash,
        status,
      });

      return {
        closeoutHash: entry.closeoutHash,
        dueAt,
        id: `archive-oversight-exception-renewal:${slug(input.workspaceId)}:${entry.kind}`,
        kind: entry.kind,
        nextAction: nextActionFor({
          kind: entry.kind,
          status,
          title: entry.title,
        }),
        renewalEvidenceHash,
        renewalHash,
        status,
        title: entry.title,
      } satisfies BoardReleaseArchiveOversightExceptionRenewalCalendarRow;
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || kindRank[first.kind] - kindRank[second.kind] || first.title.localeCompare(second.title));
}

function createCsv(rows: BoardReleaseArchiveOversightExceptionRenewalCalendarRow[]) {
  const header = ["renewal_id", "kind", "title", "status", "due_at", "renewal_evidence_hash", "closeout_hash", "renewal_hash", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.kind, entry.title, entry.status, entry.dueAt, entry.renewalEvidenceHash, entry.closeoutHash, entry.renewalHash, entry.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveOversightExceptionRenewalCalendarRow[]): BoardReleaseArchiveOversightExceptionRenewalCalendarReport["summary"] {
  const completedCount = rows.filter((entry) => entry.status === "complete").length;
  const dueSoonCount = rows.filter((entry) => entry.status === "due-soon").length;
  const overdueCount = rows.filter((entry) => entry.status === "overdue").length;
  const scheduledCount = rows.filter((entry) => entry.status === "scheduled").length;
  const status: BoardReleaseArchiveOversightExceptionRenewalCalendarReport["summary"]["status"] = overdueCount > 0 ? "blocked" : dueSoonCount > 0 ? "watch" : "scheduled";
  const nextRow = rows.find((entry) => entry.status === "overdue") ?? rows.find((entry) => entry.status === "due-soon") ?? rows[0] ?? null;

  return {
    completedCount,
    dueSoonCount,
    nextAction:
      status === "scheduled"
        ? "Archive oversight exception renewal calendar is scheduled."
        : (nextRow?.nextAction ?? "Review archive oversight exception renewal calendar."),
    overdueCount,
    renewalCalendarHash: sha256(rows.map((entry) => entry.renewalHash)),
    renewalScore: rows.length > 0 ? Math.max(0, Math.round(((scheduledCount + completedCount) / rows.length) * 100 - overdueCount * 24 - dueSoonCount * 10)) : 100,
    rowCount: rows.length,
    scheduledCount,
    status,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveOversightExceptionRenewalCalendarRow[];
  summary: BoardReleaseArchiveOversightExceptionRenewalCalendarReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveOversightExceptionRenewalCalendar(
  input: CreateBoardReleaseArchiveOversightExceptionRenewalCalendarInput,
): BoardReleaseArchiveOversightExceptionRenewalCalendarReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.closeoutDigest.workspaceId;
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-oversight-exception-renewal-calendar-${dateStamp(generatedAt)}`;

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
