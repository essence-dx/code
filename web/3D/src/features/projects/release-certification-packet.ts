import { createHash } from "node:crypto";

import type { ReleaseCertificationExceptionLedger } from "@/features/projects/release-certification-exception-ledger";
import type { ReleaseCertificationIntakeChecklist } from "@/features/projects/release-certification-intake-checklist";
import type { ReleaseContinuityArchiveManifest } from "@/features/projects/release-continuity-archive-manifest";
import type { ReleaseContinuityDashboardPacket } from "@/features/projects/release-continuity-dashboard-packet";

export type ReleaseCertificationPacketArea =
  | "archive-custody"
  | "continuity-status"
  | "exception-posture"
  | "intake-readiness";

export type ReleaseCertificationPacketStatus = "blocked" | "ready" | "review";
export type ReleaseCertificationPacketGoNoGoDecision =
  | "go"
  | "no-go"
  | "review";
export type ReleaseCertificationPacketFileFormat = "csv" | "json";

export interface ReleaseCertificationPacketInput {
  readonly archiveManifest: ReleaseContinuityArchiveManifest;
  readonly continuityDashboard: ReleaseContinuityDashboardPacket;
  readonly exceptionLedger: ReleaseCertificationExceptionLedger;
  readonly generatedAt?: string;
  readonly intakeChecklist: ReleaseCertificationIntakeChecklist;
  readonly operatorOwner?: string;
  readonly releaseCandidateId: string;
  readonly workspaceId?: string;
}

export interface ReleaseCertificationPacketRow {
  readonly area: ReleaseCertificationPacketArea;
  readonly blockerRoute: string;
  readonly certificationReady: boolean;
  readonly evidenceHash: string;
  readonly evidenceLinked: boolean;
  readonly nextAction: string;
  readonly packetHash: string;
  readonly score: number;
  readonly status: ReleaseCertificationPacketStatus;
}

export interface ReleaseCertificationPacketFile {
  readonly download: string;
  readonly format: ReleaseCertificationPacketFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface ReleaseCertificationPacket {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: ReleaseCertificationPacketFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly operatorOwner: string;
  readonly releaseCandidateId: string;
  readonly rows: ReleaseCertificationPacketRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly blockerRouteCount: number;
    readonly certificationScore: number;
    readonly goNoGoDecision: ReleaseCertificationPacketGoNoGoDecision;
    readonly nextAction: string;
    readonly operatorReady: boolean;
    readonly packetHash: string;
    readonly readyCount: number;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: ReleaseCertificationPacketStatus;
  };
  readonly workspaceId: string;
}

const areaRank: Record<ReleaseCertificationPacketArea, number> = {
  "intake-readiness": 0,
  "exception-posture": 1,
  "archive-custody": 2,
  "continuity-status": 3,
};

export function createReleaseCertificationPacket(
  input: ReleaseCertificationPacketInput,
): ReleaseCertificationPacket {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const operatorOwner = input.operatorOwner?.trim() ?? "";
  const operatorReady = operatorOwner.length > 0;
  const workspaceId = input.workspaceId ?? input.intakeChecklist.workspaceId;
  const rows = [
    createIntakeReadinessRow(input.intakeChecklist, operatorReady),
    createExceptionPostureRow(input.exceptionLedger),
    createArchiveCustodyRow(input.archiveManifest),
    createContinuityStatusRow(input.continuityDashboard),
  ].sort((first, second) => areaRank[first.area] - areaRank[second.area]);
  const summary = summarize({ operatorReady, rows });
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
  const fileBase = `${slug(workspaceId)}-release-certification-packet-${slug(
    input.releaseCandidateId,
  )}-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
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
        label: "Release certification packet CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Release certification packet JSON",
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

function createIntakeReadinessRow(
  checklist: ReleaseCertificationIntakeChecklist,
  operatorReady: boolean,
): ReleaseCertificationPacketRow {
  const evidenceLinked = hasSha256(checklist.summary.checklistHash);
  const certificationReady =
    operatorReady &&
    checklist.summary.status === "ready" &&
    checklist.summary.certificationDecision === "start" &&
    checklist.summary.blockerRouteCount === 0;

  return createRow({
    area: "intake-readiness",
    blockerRoute: certificationReady
      ? ""
      : "release-certification-intake-checklist",
    certificationReady,
    evidenceHash: checklist.summary.checklistHash,
    evidenceLinked,
    score: checklist.summary.intakeScore,
  });
}

function createExceptionPostureRow(
  ledger: ReleaseCertificationExceptionLedger,
): ReleaseCertificationPacketRow {
  const evidenceLinked = hasSha256(ledger.summary.ledgerHash);
  const certificationReady =
    ledger.summary.status === "ready" && !ledger.summary.certificationBlocked;

  return createRow({
    area: "exception-posture",
    blockerRoute: certificationReady
      ? ""
      : "release-certification-exception-ledger",
    certificationReady,
    evidenceHash: ledger.summary.ledgerHash,
    evidenceLinked,
    score: ledger.summary.ledgerScore,
  });
}

function createArchiveCustodyRow(
  manifest: ReleaseContinuityArchiveManifest,
): ReleaseCertificationPacketRow {
  const evidenceLinked = hasSha256(manifest.summary.manifestHash);
  const certificationReady =
    manifest.summary.status === "ready" &&
    manifest.summary.retentionReadyCount === manifest.summary.rowCount &&
    manifest.summary.restorationReadyCount === manifest.summary.rowCount &&
    manifest.summary.storageReadyCount === manifest.summary.rowCount;

  return createRow({
    area: "archive-custody",
    blockerRoute: certificationReady
      ? ""
      : "release-certification-archive-custody",
    certificationReady,
    evidenceHash: manifest.summary.manifestHash,
    evidenceLinked,
    score: manifest.summary.archiveScore,
  });
}

function createContinuityStatusRow(
  dashboard: ReleaseContinuityDashboardPacket,
): ReleaseCertificationPacketRow {
  const evidenceLinked = hasSha256(dashboard.summary.dashboardHash);
  const certificationReady =
    dashboard.summary.status === "ready" &&
    dashboard.summary.goNoGoDecision === "go" &&
    dashboard.summary.blockerRouteCount === 0;

  return createRow({
    area: "continuity-status",
    blockerRoute: certificationReady
      ? ""
      : "release-certification-continuity-status",
    certificationReady,
    evidenceHash: dashboard.summary.dashboardHash,
    evidenceLinked,
    score: dashboard.summary.dashboardScore,
  });
}

function createRow(
  input: Omit<
    ReleaseCertificationPacketRow,
    "nextAction" | "packetHash" | "status"
  >,
): ReleaseCertificationPacketRow {
  const score = normalizeScore(input.score);
  const status: ReleaseCertificationPacketStatus =
    !input.evidenceLinked || !input.certificationReady || score < 60
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
        ? `Release certification packet is ready for ${input.area}.`
        : status === "review"
          ? `Review release certification packet evidence for ${input.area}.`
          : `Resolve blocked release certification packet evidence for ${input.area}.`,
  };

  return {
    ...row,
    packetHash: sha256(row),
  };
}

function summarize(input: {
  readonly operatorReady: boolean;
  readonly rows: readonly ReleaseCertificationPacketRow[];
}): ReleaseCertificationPacket["summary"] {
  const blockedCount = input.rows.filter((row) => row.status === "blocked").length;
  const readyCount = input.rows.filter((row) => row.status === "ready").length;
  const reviewCount = input.rows.filter((row) => row.status === "review").length;
  const blockerRouteCount = input.rows.filter(
    (row) => row.blockerRoute.length > 0,
  ).length;
  const averageScore = Math.round(
    input.rows.reduce((total, row) => total + row.score, 0) /
      Math.max(1, input.rows.length),
  );
  const status: ReleaseCertificationPacketStatus =
    !input.operatorReady || blockedCount > 0
      ? "blocked"
      : reviewCount > 0
        ? "review"
        : "ready";
  const goNoGoDecision: ReleaseCertificationPacketGoNoGoDecision =
    status === "blocked" ? "no-go" : status === "review" ? "review" : "go";

  return {
    blockedCount,
    blockerRouteCount,
    certificationScore:
      status === "blocked" ? Math.min(averageScore, 60) : averageScore,
    goNoGoDecision,
    nextAction:
      status === "ready"
        ? "Release certification packet is ready for certification go/no-go approval."
        : status === "review"
          ? "Review release certification packet before certification go/no-go approval."
          : "Resolve blocked release certification packet before certification go/no-go approval.",
    operatorReady: input.operatorReady,
    packetHash: sha256(input.rows.map((row) => row.packetHash)),
    readyCount,
    reviewCount,
    rowCount: input.rows.length,
    status,
  };
}

function createCsv(rows: readonly ReleaseCertificationPacketRow[]) {
  const header = [
    "area",
    "status",
    "score",
    "evidence_linked",
    "certification_ready",
    "blocker_route",
    "evidence_hash",
    "packet_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.area,
    row.status,
    String(row.score),
    String(row.evidenceLinked),
    String(row.certificationReady),
    row.blockerRoute,
    row.evidenceHash,
    row.packetHash,
    row.nextAction,
  ]);

  return [header, ...records].map(csvRow).join("\n");
}

function normalizeScore(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
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
