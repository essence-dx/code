import { createHash } from "node:crypto";

export type NativeRuntimeExceptionKind = "failed-cad-worker-execution" | "install-rehearsal-regression" | "missing-signature" | "stale-artifact-approval";
export type NativeRuntimeExceptionSeverity = "critical" | "high" | "medium";
export type NativeRuntimeExceptionSourceStatus = "blocked" | "ready" | "review";
export type NativeRuntimeExceptionRoutingStatus = "blocked" | "ready" | "review";
export type NativeRuntimeExceptionRoutingFileFormat = "csv" | "json";

export interface NativeRuntimeExceptionInput {
  ageHours: number;
  dueAt: string;
  evidenceHash: string;
  kind: NativeRuntimeExceptionKind;
  owner: string;
  severity: NativeRuntimeExceptionSeverity;
  sourceId: string;
  sourceStatus: NativeRuntimeExceptionSourceStatus;
}

export interface NativeRuntimeExceptionRouteRow {
  ageHours: number;
  dueAt: string;
  evidenceHash: string;
  exceptionId: string;
  kind: NativeRuntimeExceptionKind;
  nextAction: string;
  owner: string;
  routeEligible: boolean;
  routeTarget: string;
  routingHash: string;
  severity: NativeRuntimeExceptionSeverity;
  sourceId: string;
  status: NativeRuntimeExceptionRoutingStatus;
}

export interface NativeRuntimeExceptionRoutingFile {
  download: string;
  format: NativeRuntimeExceptionRoutingFileFormat;
  href: string;
  label: string;
}

export interface NativeRuntimeExceptionRoutingReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeRuntimeExceptionRoutingFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: NativeRuntimeExceptionRouteRow[];
  summary: {
    blockedCount: number;
    escalationCount: number;
    nextAction: string;
    routedCount: number;
    routingHash: string;
    routingScore: number;
    rowCount: number;
    status: NativeRuntimeExceptionRoutingStatus;
  };
  workspaceId: string;
}

export interface CreateNativeRuntimeExceptionRoutingReportInput {
  exceptions?: NativeRuntimeExceptionInput[];
  generatedAt?: string;
  workspaceId?: string;
}

const kindRank: Record<NativeRuntimeExceptionKind, number> = {
  "missing-signature": 0,
  "failed-cad-worker-execution": 1,
  "install-rehearsal-regression": 2,
  "stale-artifact-approval": 3,
};

const routeTargetByKind: Record<NativeRuntimeExceptionKind, string> = {
  "failed-cad-worker-execution": "cad-runtime-incident",
  "install-rehearsal-regression": "desktop-install-release-review",
  "missing-signature": "release-signing-incident",
  "stale-artifact-approval": "artifact-approval-renewal",
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

function csvCell(value: boolean | number | string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function encodeDataUri(mimeType: string, content: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
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

function isEscalation(input: Pick<NativeRuntimeExceptionInput, "ageHours" | "severity" | "sourceStatus">) {
  return input.sourceStatus === "blocked" || input.severity === "critical" || input.ageHours >= 72;
}

function statusFor(sourceStatus: NativeRuntimeExceptionSourceStatus): NativeRuntimeExceptionRoutingStatus {
  return sourceStatus === "ready" ? "ready" : sourceStatus;
}

function nextActionFor(input: {
  kind: NativeRuntimeExceptionKind;
  routeEligible: boolean;
  routeTarget: string;
  status: NativeRuntimeExceptionRoutingStatus;
}) {
  if (!input.routeEligible) {
    return `Keep native runtime exception routing evidence current for ${input.kind}.`;
  }

  if (input.status === "blocked") {
    return `Open ${input.routeTarget} for blocked ${input.kind} before native runtime promotion.`;
  }

  return `Route ${input.kind} to ${input.routeTarget} for release review before native runtime promotion.`;
}

function createRow(input: NativeRuntimeExceptionInput, workspaceId: string): NativeRuntimeExceptionRouteRow {
  const status = statusFor(input.sourceStatus);
  const routeEligible = status !== "ready";
  const routeTarget = routeEligible ? routeTargetByKind[input.kind] : "none";
  const rowWithoutHash = {
    ageHours: input.ageHours,
    dueAt: input.dueAt,
    evidenceHash: input.evidenceHash.trim() || "missing",
    exceptionId: `native-runtime-exception:${slug(workspaceId)}:${input.kind}:${slug(input.sourceId)}`,
    kind: input.kind,
    nextAction: nextActionFor({
      kind: input.kind,
      routeEligible,
      routeTarget,
      status,
    }),
    owner: input.owner.trim() || "Unassigned",
    routeEligible,
    routeTarget,
    severity: input.severity,
    sourceId: input.sourceId.trim() || "missing",
    status,
  } satisfies Omit<NativeRuntimeExceptionRouteRow, "routingHash">;

  return {
    ...rowWithoutHash,
    routingHash: sha256({
      ...rowWithoutHash,
      workspaceId,
    }),
  };
}

function summarize(rows: NativeRuntimeExceptionRouteRow[], inputs: NativeRuntimeExceptionInput[]): NativeRuntimeExceptionRoutingReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const routedCount = rows.filter((row) => row.routeEligible).length;
  const escalationCount = inputs.filter(isEscalation).length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: NativeRuntimeExceptionRoutingStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const routingScore = Math.max(0, Math.min(100, Math.round(100 - blockedCount * 24 - reviewCount * 10 - escalationCount * 4)));

  return {
    blockedCount,
    escalationCount,
    nextAction:
      status === "blocked"
        ? "Route blocked native runtime exceptions before release-channel promotion."
        : status === "review"
          ? "Review native runtime exception routes before release-channel promotion."
          : "Native runtime exception routing is ready.",
    routedCount,
    routingHash: sha256(rows.map((row) => row.routingHash)),
    routingScore,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: NativeRuntimeExceptionRouteRow[]) {
  const header = ["exception_id", "kind", "status", "severity", "route_target", "route_eligible", "owner", "due_at", "evidence_hash", "routing_hash", "next_action"];
  const body = rows.map((row) =>
    [
      row.exceptionId,
      row.kind,
      row.status,
      row.severity,
      row.routeTarget,
      row.routeEligible,
      row.owner,
      row.dueAt,
      row.evidenceHash,
      row.routingHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: {
  csvDataUri: string;
  csvFileName: string;
  jsonDataUri: string;
  jsonFileName: string;
}): NativeRuntimeExceptionRoutingFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV routes",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON routes",
    },
  ];
}

export function createNativeRuntimeExceptionRoutingReport(input: CreateNativeRuntimeExceptionRoutingReportInput = {}): NativeRuntimeExceptionRoutingReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const exceptions = input.exceptions ?? [];
  const rows = exceptions
    .map((exception) => createRow(exception, workspaceId))
    .sort((first, second) => kindRank[first.kind] - kindRank[second.kind] || first.sourceId.localeCompare(second.sourceId));
  const summary = summarize(rows, exceptions);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-native-runtime-exception-routing-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    csvContent,
    csvDataUri,
    csvFileName,
    files: filesFor({
      csvDataUri,
      csvFileName,
      jsonDataUri,
      jsonFileName,
    }),
    generatedAt,
    jsonContent,
    jsonDataUri,
    jsonFileName,
    rows,
    summary,
    workspaceId,
  };
}
