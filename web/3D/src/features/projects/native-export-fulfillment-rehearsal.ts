import { createHash } from "node:crypto";

import type { PackagedCadRuntimeExecutionReport } from "@/features/projects/packaged-cad-runtime-execution-adapter";
import type { ProductionInstallLaunchEvidencePacket } from "@/features/projects/production-install-launch-evidence-packet";
import type { SignedPackageArtifactLocatorReport } from "@/features/projects/signed-package-artifact-locator";

export type NativeExportFulfillmentRehearsalStatus =
  | "blocked"
  | "ready"
  | "review";

export type NativeExportFulfillmentRehearsalGate =
  | "package-verification"
  | "cad-fixture-conversion"
  | "launch-smoke"
  | "customer-fallback";

export type NativeExportFulfillmentRehearsalFileFormat = "csv" | "json";

export interface NativeExportFulfillmentFallbackCheckInput {
  readonly checkedAt: string;
  readonly customerMessage: string;
  readonly evidenceHash: string;
  readonly fallbackId: string;
  readonly fallbackRoute: string;
  readonly owner: string;
  readonly status: NativeExportFulfillmentRehearsalStatus;
}

export interface NativeExportFulfillmentRehearsalRow {
  readonly blockerReason: string;
  readonly evidenceLinked: boolean;
  readonly gate: NativeExportFulfillmentRehearsalGate;
  readonly nextAction: string;
  readonly owner: string;
  readonly releaseBlocked: boolean;
  readonly rehearsalHash: string;
  readonly score: number;
  readonly sourceHash: string;
  readonly sourceScore: number;
  readonly sourceStatus: NativeExportFulfillmentRehearsalStatus;
  readonly status: NativeExportFulfillmentRehearsalStatus;
}

export interface NativeExportFulfillmentRehearsalFile {
  readonly download: string;
  readonly format: NativeExportFulfillmentRehearsalFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface NativeExportFulfillmentRehearsalReport {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly customerFallbackChecks: readonly NativeExportFulfillmentFallbackCheckRow[];
  readonly files: readonly NativeExportFulfillmentRehearsalFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: readonly NativeExportFulfillmentRehearsalRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly fallbackReadyCount: number;
    readonly nextAction: string;
    readonly readyCount: number;
    readonly rehearsalHash: string;
    readonly rehearsalScore: number;
    readonly releaseBlocked: boolean;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: NativeExportFulfillmentRehearsalStatus;
  };
  readonly workspaceId: string;
}

export interface NativeExportFulfillmentFallbackCheckRow {
  readonly blockerReason: string;
  readonly checkedAt: string;
  readonly checkedAtReady: boolean;
  readonly customerMessage: string;
  readonly customerMessageReady: boolean;
  readonly evidenceHash: string;
  readonly evidenceReady: boolean;
  readonly fallbackHash: string;
  readonly fallbackId: string;
  readonly fallbackRoute: string;
  readonly fallbackRouteReady: boolean;
  readonly nextAction: string;
  readonly owner: string;
  readonly ownerReady: boolean;
  readonly status: NativeExportFulfillmentRehearsalStatus;
}

export interface CreateNativeExportFulfillmentRehearsalInput {
  readonly cadRuntimeExecution?: PackagedCadRuntimeExecutionReport;
  readonly customerFallbackChecks: readonly NativeExportFulfillmentFallbackCheckInput[];
  readonly generatedAt?: string;
  readonly launchEvidence?: ProductionInstallLaunchEvidencePacket;
  readonly packageLocator?: SignedPackageArtifactLocatorReport;
  readonly releaseCandidateId: string;
  readonly workspaceId?: string;
}

const defaultWorkspaceId = "Essence Runtime";

export function createNativeExportFulfillmentRehearsal(
  input: CreateNativeExportFulfillmentRehearsalInput,
): NativeExportFulfillmentRehearsalReport {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? defaultWorkspaceId;
  const customerFallbackChecks = input.customerFallbackChecks.map(createFallbackRow);
  const rows: readonly NativeExportFulfillmentRehearsalRow[] = [
    createPackageVerificationRow(input.packageLocator),
    createCadFixtureConversionRow(input.cadRuntimeExecution),
    createLaunchSmokeRow(input.launchEvidence),
    createCustomerFallbackRow(customerFallbackChecks),
  ];
  const summary = summarize(rows, customerFallbackChecks);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      customerFallbackChecks,
      generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-native-export-fulfillment-rehearsal-${slug(
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
    customerFallbackChecks,
    files: [
      {
        download: csvFileName,
        format: "csv",
        href: csvDataUri,
        label: "Native export fulfillment rehearsal CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Native export fulfillment rehearsal JSON",
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

function createPackageVerificationRow(
  report?: SignedPackageArtifactLocatorReport,
): NativeExportFulfillmentRehearsalRow {
  if (!report) {
    return createGateRow({
      blockerReason: "No signed package artifact locator report was attached.",
      evidenceLinked: false,
      gate: "package-verification",
      owner: "Native Release",
      releaseBlocked: true,
      score: 0,
      sourceHash: "missing",
      sourceScore: 0,
      sourceStatus: "blocked",
    });
  }

  return createGateRow({
    blockerReason: report.summary.releaseBlocked
      ? report.summary.nextAction
      : "",
    evidenceLinked: report.files.length >= 2 && hasSha256(report.summary.locatorHash),
    gate: "package-verification",
    owner: "Native Release",
    releaseBlocked: report.summary.releaseBlocked,
    score: report.summary.locatorScore,
    sourceHash: report.summary.locatorHash,
    sourceScore: report.summary.locatorScore,
    sourceStatus: report.summary.status,
  });
}

function createCadFixtureConversionRow(
  report?: PackagedCadRuntimeExecutionReport,
): NativeExportFulfillmentRehearsalRow {
  if (!report) {
    return createGateRow({
      blockerReason: "No packaged CAD runtime execution report was attached.",
      evidenceLinked: false,
      gate: "cad-fixture-conversion",
      owner: "CAD Runtime",
      releaseBlocked: true,
      score: 0,
      sourceHash: "missing",
      sourceScore: 0,
      sourceStatus: "blocked",
    });
  }

  return createGateRow({
    blockerReason: report.summary.releaseBlocked ? report.summary.nextAction : "",
    evidenceLinked: report.files.length >= 2 && hasSha256(report.summary.executionHash),
    gate: "cad-fixture-conversion",
    owner: "CAD Runtime",
    releaseBlocked: report.summary.releaseBlocked,
    score: report.summary.executionScore,
    sourceHash: report.summary.executionHash,
    sourceScore: report.summary.executionScore,
    sourceStatus: report.summary.status,
  });
}

function createLaunchSmokeRow(
  report?: ProductionInstallLaunchEvidencePacket,
): NativeExportFulfillmentRehearsalRow {
  if (!report) {
    return createGateRow({
      blockerReason: "No production install and launch evidence packet was attached.",
      evidenceLinked: false,
      gate: "launch-smoke",
      owner: "Release Engineering",
      releaseBlocked: true,
      score: 0,
      sourceHash: "missing",
      sourceScore: 0,
      sourceStatus: "blocked",
    });
  }

  return createGateRow({
    blockerReason: report.summary.installLaunchBlocked
      ? report.summary.nextAction
      : "",
    evidenceLinked: report.files.length >= 2 && hasSha256(report.summary.packetHash),
    gate: "launch-smoke",
    owner: "Release Engineering",
    releaseBlocked: report.summary.installLaunchBlocked,
    score: report.summary.installLaunchScore,
    sourceHash: report.summary.packetHash,
    sourceScore: report.summary.installLaunchScore,
    sourceStatus: report.summary.status,
  });
}

function createCustomerFallbackRow(
  fallbackRows: readonly NativeExportFulfillmentFallbackCheckRow[],
): NativeExportFulfillmentRehearsalRow {
  const readyCount = fallbackRows.filter((row) => row.status === "ready").length;
  const blockedCount = fallbackRows.filter((row) => row.status === "blocked").length;
  const reviewCount = fallbackRows.filter((row) => row.status === "review").length;
  const sourceStatus = statusForCounts({
    blockedCount,
    readyCount,
    reviewCount,
    rowCount: fallbackRows.length,
  });
  const sourceScore =
    fallbackRows.length === 0
      ? 0
      : Math.round(
          fallbackRows.reduce((total, row) => total + scoreForStatus(row.status), 0) /
            fallbackRows.length,
        );
  const releaseBlocked = sourceStatus === "blocked";

  return createGateRow({
    blockerReason: fallbackRows
      .filter((row) => row.status !== "ready")
      .map((row) => row.blockerReason)
      .filter(Boolean)
      .join("; "),
    evidenceLinked:
      fallbackRows.length > 0 &&
      fallbackRows.every((row) => row.evidenceReady && hasSha256(row.fallbackHash)),
    gate: "customer-fallback",
    owner:
      fallbackRows
        .map((row) => row.owner)
        .filter(Boolean)
        .join(", ") || "Customer Experience",
    releaseBlocked,
    score: sourceScore,
    sourceHash: hashJson(
      fallbackRows.map((row) => ({
        checkedAt: row.checkedAt,
        evidenceHash: row.evidenceHash,
        fallbackHash: row.fallbackHash,
        fallbackId: row.fallbackId,
        status: row.status,
      })),
    ),
    sourceScore,
    sourceStatus,
  });
}

function createGateRow(input: {
  readonly blockerReason: string;
  readonly evidenceLinked: boolean;
  readonly gate: NativeExportFulfillmentRehearsalGate;
  readonly owner: string;
  readonly releaseBlocked: boolean;
  readonly score: number;
  readonly sourceHash: string;
  readonly sourceScore: number;
  readonly sourceStatus: NativeExportFulfillmentRehearsalStatus;
}): NativeExportFulfillmentRehearsalRow {
  const score = clampScore(input.score);
  const status = gateStatusFor({
    evidenceLinked: input.evidenceLinked,
    releaseBlocked: input.releaseBlocked,
    score,
    sourceStatus: input.sourceStatus,
  });
  const blockerReason =
    input.blockerReason ||
    (status === "ready" ? "" : `Incomplete ${input.gate} evidence.`);
  const nextAction =
    status === "ready"
      ? `${titleCase(input.gate)} is ready for native export fulfillment.`
      : `Resolve blocked native export fulfillment rehearsal: ${blockerReason}`;
  const rowWithoutHash = {
    blockerReason,
    evidenceLinked: input.evidenceLinked,
    gate: input.gate,
    nextAction,
    owner: input.owner,
    releaseBlocked: input.releaseBlocked || status === "blocked",
    score,
    sourceHash: input.sourceHash || "missing",
    sourceScore: clampScore(input.sourceScore),
    sourceStatus: input.sourceStatus,
    status,
  };

  return {
    ...rowWithoutHash,
    rehearsalHash: hashJson(rowWithoutHash),
  };
}

function createFallbackRow(
  input: NativeExportFulfillmentFallbackCheckInput,
): NativeExportFulfillmentFallbackCheckRow {
  const checkedAt = input.checkedAt.trim();
  const customerMessage = input.customerMessage.trim();
  const evidenceHash = input.evidenceHash.trim();
  const fallbackId = input.fallbackId.trim() || "fallback-missing";
  const fallbackRoute = input.fallbackRoute.trim();
  const owner = input.owner.trim();
  const checkedAtReady = validDate(checkedAt);
  const customerMessageReady = customerMessage.length >= 20;
  const evidenceReady = hasSha256(evidenceHash);
  const fallbackRouteReady =
    fallbackRoute.length > 0 &&
    (fallbackRoute.startsWith("https://") || fallbackRoute.startsWith("/"));
  const ownerReady = owner.length > 0;
  const status = fallbackStatusFor({
    checkedAtReady,
    customerMessageReady,
    evidenceReady,
    fallbackRouteReady,
    inputStatus: input.status,
    ownerReady,
  });
  const blockerReason = fallbackBlockerReasonFor({
    checkedAtReady,
    customerMessageReady,
    evidenceReady,
    fallbackRouteReady,
    inputStatus: input.status,
    ownerReady,
  });
  const rowWithoutHash = {
    blockerReason,
    checkedAt,
    checkedAtReady,
    customerMessage,
    customerMessageReady,
    evidenceHash: evidenceHash || "missing",
    evidenceReady,
    fallbackId,
    fallbackRoute,
    fallbackRouteReady,
    nextAction:
      status === "ready"
        ? "Customer fallback is ready for native export fulfillment."
        : `Resolve blocked native export fulfillment rehearsal: ${blockerReason}`,
    owner,
    ownerReady,
    status,
  };

  return {
    ...rowWithoutHash,
    fallbackHash: hashJson(rowWithoutHash),
  };
}

function fallbackStatusFor(input: {
  readonly checkedAtReady: boolean;
  readonly customerMessageReady: boolean;
  readonly evidenceReady: boolean;
  readonly fallbackRouteReady: boolean;
  readonly inputStatus: NativeExportFulfillmentRehearsalStatus;
  readonly ownerReady: boolean;
}): NativeExportFulfillmentRehearsalStatus {
  const allReady =
    input.checkedAtReady &&
    input.customerMessageReady &&
    input.evidenceReady &&
    input.fallbackRouteReady &&
    input.ownerReady;

  if (!allReady || input.inputStatus === "blocked") {
    return "blocked";
  }

  if (input.inputStatus === "ready") {
    return "ready";
  }

  return "review";
}

function fallbackBlockerReasonFor(input: {
  readonly checkedAtReady: boolean;
  readonly customerMessageReady: boolean;
  readonly evidenceReady: boolean;
  readonly fallbackRouteReady: boolean;
  readonly inputStatus: NativeExportFulfillmentRehearsalStatus;
  readonly ownerReady: boolean;
}) {
  const blockers = [
    !input.checkedAtReady ? "fallback check timestamp is missing" : "",
    !input.customerMessageReady ? "customer fallback message is too short" : "",
    !input.evidenceReady ? "fallback evidence hash is missing" : "",
    !input.fallbackRouteReady ? "fallback route is missing" : "",
    !input.ownerReady ? "fallback owner is missing" : "",
    input.inputStatus !== "ready" ? `fallback status is ${input.inputStatus}` : "",
  ].filter(Boolean);

  return blockers.join("; ");
}

function summarize(
  rows: readonly NativeExportFulfillmentRehearsalRow[],
  fallbackRows: readonly NativeExportFulfillmentFallbackCheckRow[],
) {
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const rehearsalScore =
    rows.length === 0
      ? 0
      : Math.round(rows.reduce((total, row) => total + row.score, 0) / rows.length);
  const status = statusForCounts({
    blockedCount,
    readyCount,
    reviewCount,
    rowCount: rows.length,
  });
  const releaseBlocked =
    status === "blocked" || rows.some((row) => row.releaseBlocked);
  const nextAction =
    status === "ready"
      ? "Native export fulfillment rehearsal is ready for operator release review."
      : `Resolve blocked native export fulfillment rehearsal: ${rows
          .filter((row) => row.status !== "ready")
          .map((row) => row.blockerReason)
          .filter(Boolean)
          .join("; ")}`;
  const summaryWithoutHash = {
    blockedCount,
    fallbackReadyCount: fallbackRows.filter((row) => row.status === "ready").length,
    nextAction,
    readyCount,
    rehearsalScore,
    releaseBlocked,
    reviewCount,
    rowCount: rows.length,
    status,
  };

  return {
    ...summaryWithoutHash,
    rehearsalHash: hashJson({
      rowHashes: rows.map((row) => row.rehearsalHash),
      summary: summaryWithoutHash,
    }),
  };
}

function gateStatusFor(input: {
  readonly evidenceLinked: boolean;
  readonly releaseBlocked: boolean;
  readonly score: number;
  readonly sourceStatus: NativeExportFulfillmentRehearsalStatus;
}): NativeExportFulfillmentRehearsalStatus {
  if (input.releaseBlocked || !input.evidenceLinked || input.sourceStatus === "blocked") {
    return "blocked";
  }

  if (input.sourceStatus === "review" || input.score < 100) {
    return "review";
  }

  return "ready";
}

function statusForCounts(input: {
  readonly blockedCount: number;
  readonly readyCount: number;
  readonly reviewCount: number;
  readonly rowCount: number;
}): NativeExportFulfillmentRehearsalStatus {
  if (input.rowCount === 0 || input.blockedCount > 0) {
    return "blocked";
  }

  if (input.reviewCount > 0 || input.readyCount < input.rowCount) {
    return "review";
  }

  return "ready";
}

function scoreForStatus(status: NativeExportFulfillmentRehearsalStatus) {
  if (status === "ready") {
    return 100;
  }

  if (status === "review") {
    return 60;
  }

  return 0;
}

function createCsv(rows: readonly NativeExportFulfillmentRehearsalRow[]) {
  const headers = [
    "gate",
    "status",
    "score",
    "evidence_linked",
    "release_blocked",
    "rehearsal_hash",
    "next_action",
  ];
  const lines = rows.map((row) =>
    [
      row.gate,
      row.status,
      String(row.score),
      String(row.evidenceLinked),
      String(row.releaseBlocked),
      row.rehearsalHash,
      row.nextAction,
    ]
      .map(csvEscape)
      .join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}

function csvEscape(value: string) {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasSha256(value: string) {
  return value.trim().startsWith("sha256:") && value.trim().length > "sha256:".length;
}

function validDate(value: string) {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp);
}

function encodeDataUri(mimeType: string, content: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
}

function hashJson(value: unknown) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function dateStamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "undated";
  }

  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
