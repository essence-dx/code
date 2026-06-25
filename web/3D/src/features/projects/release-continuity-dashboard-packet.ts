import { createHash } from "node:crypto";

import type { ReleaseContinuityEvidenceIndex } from "@/features/projects/release-continuity-evidence-index";
import type { ReleaseContinuityRegressionMonitor } from "@/features/projects/release-continuity-regression-monitor";

export type ReleaseContinuityDashboardArea =
  | "blocker-routing"
  | "continuity-readiness"
  | "owner-acknowledgement";
export type ReleaseContinuityDashboardStatus = "blocked" | "ready" | "review";
export type ReleaseContinuityDashboardGoNoGoDecision = "go" | "no-go" | "review";
export type ReleaseContinuityDashboardFileFormat = "csv" | "json";

export interface ReleaseContinuityDashboardPacketInput {
  readonly evidenceIndex: ReleaseContinuityEvidenceIndex;
  readonly generatedAt?: string;
  readonly operatorOwner?: string;
  readonly ownerAcknowledged?: boolean;
  readonly regressionMonitor: ReleaseContinuityRegressionMonitor;
  readonly releaseCandidateId: string;
  readonly workspaceId?: string;
}

export interface ReleaseContinuityDashboardRow {
  readonly area: ReleaseContinuityDashboardArea;
  readonly blockerRoute: string;
  readonly dashboardHash: string;
  readonly evidenceHash: string;
  readonly evidenceLinked: boolean;
  readonly nextAction: string;
  readonly ownerAcknowledged: boolean;
  readonly releaseApprovalReady: boolean;
  readonly score: number;
  readonly status: ReleaseContinuityDashboardStatus;
}

export interface ReleaseContinuityDashboardFile {
  readonly download: string;
  readonly format: ReleaseContinuityDashboardFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface ReleaseContinuityDashboardPacket {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: ReleaseContinuityDashboardFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly operatorOwner: string;
  readonly releaseCandidateId: string;
  readonly rows: ReleaseContinuityDashboardRow[];
  readonly summary: {
    readonly blockerRouteCount: number;
    readonly blockedCount: number;
    readonly dashboardHash: string;
    readonly dashboardScore: number;
    readonly goNoGoDecision: ReleaseContinuityDashboardGoNoGoDecision;
    readonly nextAction: string;
    readonly operatorReady: boolean;
    readonly ownerAcknowledged: boolean;
    readonly readyCount: number;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: ReleaseContinuityDashboardStatus;
  };
  readonly workspaceId: string;
}

const areaRank: Record<ReleaseContinuityDashboardArea, number> = {
  "continuity-readiness": 0,
  "owner-acknowledgement": 1,
  "blocker-routing": 2,
};

export function createReleaseContinuityDashboardPacket(
  input: ReleaseContinuityDashboardPacketInput,
): ReleaseContinuityDashboardPacket {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const operatorOwner = input.operatorOwner?.trim() ?? "";
  const ownerAcknowledged = input.ownerAcknowledged === true;
  const workspaceId = input.workspaceId ?? input.evidenceIndex.workspaceId;
  const rows = [
    createReadinessRow(input),
    createAcknowledgementRow({
      evidenceHash: input.regressionMonitor.summary.monitorHash,
      operatorReady: operatorOwner.length > 0,
      ownerAcknowledged,
    }),
    createBlockerRoutingRow(input),
  ].sort((first, second) => areaRank[first.area] - areaRank[second.area]);
  const summary = summarize({
    operatorReady: operatorOwner.length > 0,
    ownerAcknowledged,
    rows,
  });
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      operatorOwner,
      releaseCandidateId: input.releaseCandidateId,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const baseFileName = `${slug(workspaceId)}-release-continuity-dashboard-packet-${slug(
    input.releaseCandidateId,
  )}-${dateStamp(generatedAt)}`;
  const csvFileName = `${baseFileName}.csv`;
  const jsonFileName = `${baseFileName}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    csvContent,
    csvDataUri,
    csvFileName,
    files: [
      {
        download: csvFileName,
        format: "csv",
        href: csvDataUri,
        label: "Release continuity dashboard packet CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Release continuity dashboard packet JSON",
      },
    ],
    generatedAt,
    jsonContent,
    jsonDataUri,
    jsonFileName,
    operatorOwner,
    releaseCandidateId: input.releaseCandidateId,
    rows,
    summary,
    workspaceId,
  };
}

function createReadinessRow(
  input: ReleaseContinuityDashboardPacketInput,
): ReleaseContinuityDashboardRow {
  const evidenceLinked =
    input.evidenceIndex.summary.status === "ready" &&
    input.regressionMonitor.summary.status === "ready" &&
    hasSha256(input.evidenceIndex.summary.indexHash) &&
    hasSha256(input.regressionMonitor.summary.monitorHash);
  const score = Math.round(
    (input.evidenceIndex.summary.continuityScore +
      input.regressionMonitor.summary.regressionScore) /
      2,
  );

  return createRow({
    area: "continuity-readiness",
    blockerRoute: evidenceLinked ? "" : "release-continuity-war-room",
    evidenceHash: sha256([
      input.evidenceIndex.summary.indexHash,
      input.regressionMonitor.summary.monitorHash,
    ]),
    evidenceLinked,
    ownerAcknowledged: true,
    releaseApprovalReady: evidenceLinked && score >= 90,
    score,
  });
}

function createAcknowledgementRow(input: {
  readonly evidenceHash: string;
  readonly operatorReady: boolean;
  readonly ownerAcknowledged: boolean;
}): ReleaseContinuityDashboardRow {
  return createRow({
    area: "owner-acknowledgement",
    blockerRoute:
      input.operatorReady && input.ownerAcknowledged
        ? ""
        : "release-owner-acknowledgement",
    evidenceHash: input.evidenceHash,
    evidenceLinked: hasSha256(input.evidenceHash),
    ownerAcknowledged: input.operatorReady && input.ownerAcknowledged,
    releaseApprovalReady: input.operatorReady && input.ownerAcknowledged,
    score: input.operatorReady && input.ownerAcknowledged ? 100 : 0,
  });
}

function createBlockerRoutingRow(
  input: ReleaseContinuityDashboardPacketInput,
): ReleaseContinuityDashboardRow {
  const blockerCount =
    input.evidenceIndex.summary.blockedCount +
    input.evidenceIndex.summary.missingEvidenceCount +
    input.regressionMonitor.summary.blockedCount +
    input.regressionMonitor.summary.hashChangeCount +
    input.regressionMonitor.summary.missingEvidenceCount;
  const releaseApprovalReady = blockerCount === 0;

  return createRow({
    area: "blocker-routing",
    blockerRoute: releaseApprovalReady ? "" : "release-continuity-war-room",
    evidenceHash: input.regressionMonitor.summary.monitorHash,
    evidenceLinked: hasSha256(input.regressionMonitor.summary.monitorHash),
    ownerAcknowledged: true,
    releaseApprovalReady,
    score: releaseApprovalReady ? 100 : 50,
  });
}

function createRow(
  input: Omit<ReleaseContinuityDashboardRow, "dashboardHash" | "nextAction" | "status">,
): ReleaseContinuityDashboardRow {
  const score = normalizeScore(input.score);
  const status: ReleaseContinuityDashboardStatus =
    !input.evidenceLinked || !input.ownerAcknowledged || !input.releaseApprovalReady || score < 60
      ? "blocked"
      : score < 90
        ? "review"
        : "ready";
  const rowWithoutHash = {
    ...input,
    nextAction: "",
    score,
    status,
  };
  const row = {
    ...rowWithoutHash,
    nextAction:
      status === "ready"
        ? `Release continuity dashboard is ready for ${input.area}.`
        : `Resolve release continuity dashboard blocker for ${input.area}.`,
  };

  return {
    ...row,
    dashboardHash: sha256(row),
  };
}

function summarize(input: {
  readonly operatorReady: boolean;
  readonly ownerAcknowledged: boolean;
  readonly rows: readonly ReleaseContinuityDashboardRow[];
}): ReleaseContinuityDashboardPacket["summary"] {
  const blockedCount = input.rows.filter((row) => row.status === "blocked").length;
  const readyCount = input.rows.filter((row) => row.status === "ready").length;
  const reviewCount = input.rows.filter((row) => row.status === "review").length;
  const blockerRouteCount = input.rows.filter(
    (row) => row.blockerRoute.length > 0,
  ).length;
  const averageScore = Math.round(
    input.rows.reduce((total, row) => total + row.score, 0) / input.rows.length,
  );
  const status: ReleaseContinuityDashboardStatus =
    !input.operatorReady || !input.ownerAcknowledged || blockedCount > 0
      ? "blocked"
      : reviewCount > 0
        ? "review"
        : "ready";
  const goNoGoDecision: ReleaseContinuityDashboardGoNoGoDecision =
    status === "blocked" ? "no-go" : status === "review" ? "review" : "go";

  return {
    blockerRouteCount,
    blockedCount,
    dashboardHash: sha256(input.rows.map((row) => row.dashboardHash)),
    dashboardScore:
      status === "blocked" ? Math.min(averageScore, 60) : averageScore,
    goNoGoDecision,
    nextAction:
      status === "ready"
        ? "Release continuity dashboard packet is ready for go/no-go approval."
        : "Resolve blocked release continuity dashboard packet before go/no-go approval.",
    operatorReady: input.operatorReady,
    ownerAcknowledged: input.ownerAcknowledged,
    readyCount,
    reviewCount,
    rowCount: input.rows.length,
    status,
  };
}

function createCsv(rows: readonly ReleaseContinuityDashboardRow[]) {
  const header = [
    "area",
    "status",
    "score",
    "evidence_linked",
    "owner_acknowledged",
    "release_approval_ready",
    "blocker_route",
    "dashboard_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.area,
    row.status,
    String(row.score),
    String(row.evidenceLinked),
    String(row.ownerAcknowledged),
    String(row.releaseApprovalReady),
    row.blockerRoute,
    row.dashboardHash,
    row.nextAction,
  ]);

  return [header, ...records].map(csvRow).join("\n");
}

function normalizeScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function csvRow(values: readonly string[]) {
  return values
    .map((value) => {
      const escaped = value.replaceAll('"', '""');

      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    })
    .join(",");
}

function hasSha256(value: string) {
  return value.startsWith("sha256:");
}

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
  return `sha256:${createHash("sha256")
    .update(typeof value === "string" ? value : stableJson(value))
    .digest("hex")}`;
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

  return Number.isNaN(date.getTime())
    ? "current"
    : date.toISOString().slice(0, 10).replaceAll("-", "");
}
