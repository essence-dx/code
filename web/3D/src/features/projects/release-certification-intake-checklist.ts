import { createHash } from "node:crypto";

import type { ExternalRuntimeRealityPacket } from "@/features/projects/external-runtime-reality-packet";
import type { NativeReleaseCustodyApprovalPacket } from "@/features/projects/native-release-custody-approval-packet";
import type { ReleaseContinuityArchiveManifest } from "@/features/projects/release-continuity-archive-manifest";
import type { ReleaseContinuityDashboardPacket } from "@/features/projects/release-continuity-dashboard-packet";

export type ReleaseCertificationIntakeGate =
  | "archive-manifest-retention"
  | "continuity-dashboard-approval"
  | "external-runtime-reality"
  | "native-artifact-custody";

export type ReleaseCertificationIntakeStatus =
  | "blocked"
  | "ready"
  | "review";

export type ReleaseCertificationIntakeDecision = "hold" | "review" | "start";
export type ReleaseCertificationIntakeFileFormat = "csv" | "json";

export interface ReleaseCertificationIntakeChecklistInput {
  readonly archiveManifest: ReleaseContinuityArchiveManifest;
  readonly continuityDashboard: ReleaseContinuityDashboardPacket;
  readonly custodyApproval: NativeReleaseCustodyApprovalPacket;
  readonly externalReality: ExternalRuntimeRealityPacket;
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly workspaceId?: string;
}

export interface ReleaseCertificationIntakeRow {
  readonly blockerRoute: string;
  readonly certificationReady: boolean;
  readonly checklistHash: string;
  readonly evidenceHash: string;
  readonly evidenceLinked: boolean;
  readonly gate: ReleaseCertificationIntakeGate;
  readonly nextAction: string;
  readonly score: number;
  readonly status: ReleaseCertificationIntakeStatus;
}

export interface ReleaseCertificationIntakeFile {
  readonly download: string;
  readonly format: ReleaseCertificationIntakeFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface ReleaseCertificationIntakeChecklist {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: ReleaseCertificationIntakeFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: ReleaseCertificationIntakeRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly blockerRouteCount: number;
    readonly certificationDecision: ReleaseCertificationIntakeDecision;
    readonly checklistHash: string;
    readonly intakeScore: number;
    readonly nextAction: string;
    readonly readyCount: number;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: ReleaseCertificationIntakeStatus;
  };
  readonly workspaceId: string;
}

const gateRank: Record<ReleaseCertificationIntakeGate, number> = {
  "continuity-dashboard-approval": 0,
  "archive-manifest-retention": 1,
  "native-artifact-custody": 2,
  "external-runtime-reality": 3,
};

export function createReleaseCertificationIntakeChecklist(
  input: ReleaseCertificationIntakeChecklistInput,
): ReleaseCertificationIntakeChecklist {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? input.continuityDashboard.workspaceId;
  const rows = [
    createContinuityDashboardRow(input.continuityDashboard),
    createArchiveManifestRow(input.archiveManifest),
    createCustodyApprovalRow(input.custodyApproval),
    createExternalRealityRow(input.externalReality),
  ].sort((first, second) => gateRank[first.gate] - gateRank[second.gate]);
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-release-certification-intake-checklist-${slug(
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
        label: "Release certification intake checklist CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Release certification intake checklist JSON",
      },
    ],
    generatedAt,
    jsonContent,
    jsonDataUri,
    jsonFileName,
    releaseCandidateId: input.releaseCandidateId,
    rows,
    summary,
    workspaceId,
  };
}

function createContinuityDashboardRow(
  dashboard: ReleaseContinuityDashboardPacket,
): ReleaseCertificationIntakeRow {
  const evidenceLinked = hasSha256(dashboard.summary.dashboardHash);
  const certificationReady =
    dashboard.summary.status === "ready" &&
    dashboard.summary.goNoGoDecision === "go" &&
    dashboard.summary.ownerAcknowledged &&
    dashboard.summary.blockerRouteCount === 0;

  return createRow({
    blockerRoute: certificationReady
      ? ""
      : "release-certification-continuity-approval",
    certificationReady,
    evidenceHash: dashboard.summary.dashboardHash,
    evidenceLinked,
    gate: "continuity-dashboard-approval",
    score: dashboard.summary.dashboardScore,
  });
}

function createArchiveManifestRow(
  manifest: ReleaseContinuityArchiveManifest,
): ReleaseCertificationIntakeRow {
  const evidenceLinked = hasSha256(manifest.summary.manifestHash);
  const certificationReady =
    manifest.summary.status === "ready" &&
    manifest.summary.retentionReadyCount === manifest.summary.rowCount &&
    manifest.summary.restorationReadyCount === manifest.summary.rowCount &&
    manifest.summary.storageReadyCount === manifest.summary.rowCount;

  return createRow({
    blockerRoute: certificationReady
      ? ""
      : "release-certification-archive-retention",
    certificationReady,
    evidenceHash: manifest.summary.manifestHash,
    evidenceLinked,
    gate: "archive-manifest-retention",
    score: manifest.summary.archiveScore,
  });
}

function createCustodyApprovalRow(
  custodyApproval: NativeReleaseCustodyApprovalPacket,
): ReleaseCertificationIntakeRow {
  const evidenceLinked = hasSha256(custodyApproval.summary.custodyApprovalHash);
  const certificationReady =
    custodyApproval.summary.status === "ready" &&
    custodyApproval.summary.goNoGoDecision === "go" &&
    custodyApproval.summary.operatorReady &&
    custodyApproval.summary.evidenceReadyCount === custodyApproval.summary.rowCount;

  return createRow({
    blockerRoute: certificationReady
      ? ""
      : "release-certification-custody-approval",
    certificationReady,
    evidenceHash: custodyApproval.summary.custodyApprovalHash,
    evidenceLinked,
    gate: "native-artifact-custody",
    score: custodyApproval.summary.approvalScore,
  });
}

function createExternalRealityRow(
  externalReality: ExternalRuntimeRealityPacket,
): ReleaseCertificationIntakeRow {
  const evidenceLinked = hasSha256(externalReality.summary.packetHash);
  const certificationReady =
    externalReality.summary.status === "ready" &&
    !externalReality.summary.releaseApprovalBlocked &&
    externalReality.summary.operatorReadyCount === externalReality.summary.rowCount;

  return createRow({
    blockerRoute: certificationReady
      ? ""
      : "release-certification-external-reality",
    certificationReady,
    evidenceHash: externalReality.summary.packetHash,
    evidenceLinked,
    gate: "external-runtime-reality",
    score: externalReality.summary.packetScore,
  });
}

function createRow(
  input: Omit<
    ReleaseCertificationIntakeRow,
    "checklistHash" | "nextAction" | "status"
  >,
): ReleaseCertificationIntakeRow {
  const score = normalizeScore(input.score);
  const status: ReleaseCertificationIntakeStatus =
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
        ? `Release certification intake is ready for ${input.gate}.`
        : status === "review"
          ? `Review release certification intake evidence for ${input.gate}.`
          : `Resolve blocked release certification intake evidence for ${input.gate}.`,
  };

  return {
    ...row,
    checklistHash: sha256(row),
  };
}

function summarize(
  rows: readonly ReleaseCertificationIntakeRow[],
): ReleaseCertificationIntakeChecklist["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockerRouteCount = rows.filter(
    (row) => row.blockerRoute.length > 0,
  ).length;
  const intakeScore = Math.round(
    rows.reduce((total, row) => total + row.score, 0) /
      Math.max(1, rows.length),
  );
  const status: ReleaseCertificationIntakeStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const certificationDecision: ReleaseCertificationIntakeDecision =
    status === "blocked" ? "hold" : status === "review" ? "review" : "start";

  return {
    blockedCount,
    blockerRouteCount,
    certificationDecision,
    checklistHash: sha256(rows.map((row) => row.checklistHash)),
    intakeScore: status === "blocked" ? Math.min(intakeScore, 79) : intakeScore,
    nextAction:
      status === "ready"
        ? "Release certification intake checklist is ready to start certification."
        : status === "review"
          ? "Review release certification intake checklist before certification starts."
          : "Resolve blocked release certification intake checklist before certification starts.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: readonly ReleaseCertificationIntakeRow[]) {
  const header = [
    "gate",
    "status",
    "score",
    "evidence_linked",
    "certification_ready",
    "blocker_route",
    "evidence_hash",
    "checklist_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.gate,
    row.status,
    String(row.score),
    String(row.evidenceLinked),
    String(row.certificationReady),
    row.blockerRoute,
    row.evidenceHash,
    row.checklistHash,
    row.nextAction,
  ]);

  return [header, ...records].map(csvRow).join("\n");
}

function csvRow(values: readonly string[]) {
  return values
    .map((value) => {
      const escaped = value.replaceAll('"', '""');

      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    })
    .join(",");
}

function normalizeScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
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
