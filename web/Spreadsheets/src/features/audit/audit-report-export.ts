import type { AuditLogCategory, AuditLogRow } from "@/features/audit/audit-log-service";
import type {
  WorkbookRole,
  WorkbookSharingSummary,
} from "@/features/workbooks/types";

type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
};

type WorkbookAccessReportInput = {
  accessRole: WorkbookRole;
  ownerEmail: string;
  sharing?: WorkbookSharingSummary;
  workbookId: string;
  workbookName: string;
};

type WorkbookAccessReportRow = {
  createdAt: string;
  email: string;
  expiresAt: string;
  principal: "owner" | "collaborator" | "share link";
  role: WorkbookRole;
  status: string;
  tokenPreview: string;
  workbookId: string;
  workbookName: string;
};

export type AuditActivityReview = {
  actorCounts: Array<{ actorEmail: string; count: number; latestAt: string }>;
  categoryCounts: Array<{
    category: AuditLogCategory;
    count: number;
    latestAt: string;
  }>;
  latestAt: string | null;
  total: number;
};

const auditLogColumns: Array<CsvColumn<AuditLogRow>> = [
  { header: "created_at", value: (row) => row.createdAt },
  { header: "category", value: (row) => row.category },
  { header: "action", value: (row) => row.action },
  { header: "summary", value: (row) => row.summary },
  { header: "actor_email", value: (row) => row.actorEmail },
  { header: "target_user_id", value: (row) => row.targetUserId },
  { header: "target_workbook_id", value: (row) => row.targetWorkbookId },
  { header: "metadata", value: (row) => formatAuditMetadata(row.metadata) },
];

const accessReportColumns: Array<CsvColumn<WorkbookAccessReportRow>> = [
  { header: "workbook_id", value: (row) => row.workbookId },
  { header: "workbook_name", value: (row) => row.workbookName },
  { header: "principal", value: (row) => row.principal },
  { header: "email", value: (row) => row.email },
  { header: "role", value: (row) => row.role },
  { header: "status", value: (row) => row.status },
  { header: "created_at", value: (row) => row.createdAt },
  { header: "expires_at", value: (row) => row.expiresAt },
  { header: "token_preview", value: (row) => row.tokenPreview },
];

export function auditLogsToCsv(logs: AuditLogRow[]) {
  return recordsToCsv(logs, auditLogColumns);
}

export function auditLogsToJson(logs: AuditLogRow[]) {
  return JSON.stringify(logs, null, 2);
}

export function workbookAccessReportToCsv(input: WorkbookAccessReportInput) {
  return recordsToCsv(createWorkbookAccessReportRows(input), accessReportColumns);
}

export function createAuditActivityReview(logs: AuditLogRow[]): AuditActivityReview {
  const latestAt = logs
    .map((log) => log.createdAt)
    .sort()
    .at(-1) ?? null;

  return {
    actorCounts: countBy(
      logs,
      (log) => log.actorEmail || "Unknown actor",
      "actorEmail",
    ),
    categoryCounts: countBy(logs, (log) => log.category, "category"),
    latestAt,
    total: logs.length,
  };
}

export function createReportFileName({
  extension,
  prefix,
  timestamp = new Date(),
}: {
  extension: "csv" | "json";
  prefix: string;
  timestamp?: Date;
}) {
  const safePrefix = prefix
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "report";
  const safeTimestamp = timestamp.toISOString().slice(0, 10);

  return `${safePrefix}-${safeTimestamp}.${extension}`;
}

function createWorkbookAccessReportRows({
  accessRole,
  ownerEmail,
  sharing,
  workbookId,
  workbookName,
}: WorkbookAccessReportInput): WorkbookAccessReportRow[] {
  const rows: WorkbookAccessReportRow[] = [
    {
      createdAt: "",
      email: ownerEmail,
      expiresAt: "",
      principal: "owner",
      role: "owner",
      status: accessRole === "owner" ? "current user owner" : "owner",
      tokenPreview: "",
      workbookId,
      workbookName,
    },
  ];

  for (const collaborator of sharing?.collaborators ?? []) {
    rows.push({
      createdAt: collaborator.createdAt.toISOString(),
      email: collaborator.email,
      expiresAt: "",
      principal: "collaborator",
      role: collaborator.role,
      status: collaborator.status,
      tokenPreview: "",
      workbookId,
      workbookName,
    });
  }

  for (const link of sharing?.links ?? []) {
    rows.push({
      createdAt: link.createdAt.toISOString(),
      email: "",
      expiresAt: link.expiresAt?.toISOString() ?? "",
      principal: "share link",
      role: link.role,
      status: link.active ? "active" : "disabled",
      tokenPreview: previewShareToken(link.token),
      workbookId,
      workbookName,
    });
  }

  return rows;
}

function recordsToCsv<T>(rows: T[], columns: Array<CsvColumn<T>>) {
  return [
    columns.map((column) => escapeCsvValue(column.header)).join(","),
    ...rows.map((row) =>
      columns
        .map((column) => escapeCsvValue(column.value(row) ?? ""))
        .join(","),
    ),
  ].join("\n");
}

function escapeCsvValue(value: string | number | boolean) {
  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function formatAuditMetadata(metadata: AuditLogRow["metadata"]) {
  return Object.entries(metadata)
    .filter(([, value]) => value !== "" && value !== null)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("; ");
}

function previewShareToken(token: string) {
  return token.length <= 10 ? token : `${token.slice(0, 8)}...`;
}

function countBy<
  TKey extends string,
  TOutputKey extends "actorEmail" | "category",
>(
  logs: AuditLogRow[],
  getKey: (log: AuditLogRow) => TKey,
  outputKey: TOutputKey,
) {
  const counts = new Map<TKey, { count: number; latestAt: string }>();

  for (const log of logs) {
    const key = getKey(log);
    const current = counts.get(key);

    counts.set(key, {
      count: (current?.count ?? 0) + 1,
      latestAt:
        !current || log.createdAt > current.latestAt
          ? log.createdAt
          : current.latestAt,
    });
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1].count - left[1].count)
    .map(([key, value]) => ({
      [outputKey]: key,
      count: value.count,
      latestAt: value.latestAt,
    })) as Array<
    TOutputKey extends "category"
      ? { category: AuditLogCategory; count: number; latestAt: string }
      : { actorEmail: string; count: number; latestAt: string }
  >;
}
