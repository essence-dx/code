import { createHash } from "node:crypto";

import type { NativeExportFulfillmentRehearsalGate, NativeExportFulfillmentRehearsalReport } from "@/features/projects/native-export-fulfillment-rehearsal";
import type { PackagedCadRuntimeExecutionReport } from "@/features/projects/packaged-cad-runtime-execution-adapter";
import type { SignedPackageArtifactLocatorReport } from "@/features/projects/signed-package-artifact-locator";

export type CustomerFacingNativeFulfillmentStatus =
  | "blocked"
  | "ready"
  | "review";

export type CustomerFacingNativeFulfillmentSection =
  | "blocker-route"
  | "cad-support"
  | "download"
  | "fallback";

export type CustomerFacingNativeDownloadStatus =
  | "available"
  | "blocked"
  | "not-applicable"
  | "pending";

export type CustomerFacingNativeCadSupportStatus =
  | "blocked"
  | "fallback"
  | "not-applicable"
  | "supported";

export type CustomerFacingNativeFulfillmentFileFormat = "csv" | "json";

export interface CustomerFacingNativeFulfillmentStatusRouteInput {
  readonly blockerOwner: string;
  readonly blockerRoute: string;
  readonly customerMessage: string;
  readonly etaAt: string;
  readonly etaOwner: string;
  readonly fallbackMessage: string;
  readonly fallbackRoute: string;
  readonly targetId: string;
}

interface CustomerFacingNativeFulfillmentStatusBaseRow {
  readonly blockerOwner: string;
  readonly blockerRoute: string;
  readonly blockerRouteReady: boolean;
  readonly cadSupportStatus: CustomerFacingNativeCadSupportStatus;
  readonly customerMessage: string;
  readonly downloadStatus: CustomerFacingNativeDownloadStatus;
  readonly etaAt: string;
  readonly etaAtReady: boolean;
  readonly etaOwner: string;
  readonly etaOwnerReady: boolean;
  readonly evidenceHash: string;
  readonly evidenceLinked: boolean;
  readonly fallbackMessage: string;
  readonly fallbackMessageReady: boolean;
  readonly fallbackRoute: string;
  readonly fallbackRouteReady: boolean;
  readonly nextAction: string;
  readonly releaseBlocked: boolean;
  readonly routeReady: boolean;
  readonly section: CustomerFacingNativeFulfillmentSection;
  readonly sourceStatus: CustomerFacingNativeFulfillmentStatus;
  readonly status: CustomerFacingNativeFulfillmentStatus;
  readonly statusHash: string;
  readonly targetId: string;
}

export interface CustomerFacingNativeFulfillmentDownloadStatusRow
  extends CustomerFacingNativeFulfillmentStatusBaseRow {
  readonly artifactName: string;
  readonly downloadUrl: string;
  readonly downloadUrlReady: boolean;
  readonly platform: string;
  readonly section: "download";
}

export interface CustomerFacingNativeFulfillmentCadSupportStatusRow
  extends CustomerFacingNativeFulfillmentStatusBaseRow {
  readonly adapterId: string;
  readonly outputPath: string;
  readonly section: "cad-support";
}

export interface CustomerFacingNativeFulfillmentFallbackMessageRow
  extends CustomerFacingNativeFulfillmentStatusBaseRow {
  readonly fallbackId: string;
  readonly section: "fallback";
}

export interface CustomerFacingNativeFulfillmentBlockerRouteRow
  extends CustomerFacingNativeFulfillmentStatusBaseRow {
  readonly blockerReason: string;
  readonly gate: NativeExportFulfillmentRehearsalGate;
  readonly section: "blocker-route";
}

export type CustomerFacingNativeFulfillmentStatusRow =
  | CustomerFacingNativeFulfillmentBlockerRouteRow
  | CustomerFacingNativeFulfillmentCadSupportStatusRow
  | CustomerFacingNativeFulfillmentDownloadStatusRow
  | CustomerFacingNativeFulfillmentFallbackMessageRow;

export interface CustomerFacingNativeFulfillmentStatusFile {
  readonly download: string;
  readonly format: CustomerFacingNativeFulfillmentFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface CustomerFacingNativeFulfillmentStatusPacket {
  readonly blockerRoutes: readonly CustomerFacingNativeFulfillmentBlockerRouteRow[];
  readonly cadSupportStatuses: readonly CustomerFacingNativeFulfillmentCadSupportStatusRow[];
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly downloadStatuses: readonly CustomerFacingNativeFulfillmentDownloadStatusRow[];
  readonly fallbackMessages: readonly CustomerFacingNativeFulfillmentFallbackMessageRow[];
  readonly files: readonly CustomerFacingNativeFulfillmentStatusFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: readonly CustomerFacingNativeFulfillmentStatusRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly blockerRouteReadyCount: number;
    readonly cadSupportedCount: number;
    readonly downloadAvailableCount: number;
    readonly fallbackReadyCount: number;
    readonly nextAction: string;
    readonly readyCount: number;
    readonly releaseBlocked: boolean;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: CustomerFacingNativeFulfillmentStatus;
    readonly statusHash: string;
    readonly statusScore: number;
  };
  readonly workspaceId: string;
}

export interface CreateCustomerFacingNativeFulfillmentStatusPacketInput {
  readonly cadRuntimeExecution: PackagedCadRuntimeExecutionReport;
  readonly fulfillmentRehearsal: NativeExportFulfillmentRehearsalReport;
  readonly generatedAt?: string;
  readonly packageLocator: SignedPackageArtifactLocatorReport;
  readonly releaseCandidateId: string;
  readonly statusRoutes: readonly CustomerFacingNativeFulfillmentStatusRouteInput[];
  readonly workspaceId?: string;
}

export function createCustomerFacingNativeFulfillmentStatusPacket(
  input: CreateCustomerFacingNativeFulfillmentStatusPacketInput,
): CustomerFacingNativeFulfillmentStatusPacket {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId =
    input.workspaceId ??
    input.packageLocator.workspaceId ??
    input.fulfillmentRehearsal.workspaceId;
  const routeByTarget = new Map(
    input.statusRoutes.map((route) => [route.targetId.trim(), normalizeRoute(route)]),
  );
  const downloadStatuses = input.packageLocator.rows.map((row) =>
    createDownloadStatus(row, routeByTarget.get(`download:${row.platform}`)),
  );
  const cadSupportStatuses = input.cadRuntimeExecution.rows.map((row) =>
    createCadSupportStatus(row, routeByTarget.get(`cad:${row.adapterId}`)),
  );
  const fallbackMessages = input.fulfillmentRehearsal.customerFallbackChecks.map((row) =>
    createFallbackMessage(row, routeByTarget.get(`fallback:${row.fallbackId}`)),
  );
  const blockerRoutes = input.fulfillmentRehearsal.rows.map((row) =>
    createBlockerRoute(row, routeByTarget.get(`blocker:${row.gate}`)),
  );
  const rows = [
    ...downloadStatuses,
    ...cadSupportStatuses,
    ...fallbackMessages,
    ...blockerRoutes,
  ];
  const summary = summarize({
    blockerRoutes,
    cadSupportStatuses,
    downloadStatuses,
    fallbackMessages,
    rows,
  });
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      blockerRoutes,
      cadSupportStatuses,
      downloadStatuses,
      fallbackMessages,
      generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-customer-facing-native-fulfillment-status-packet-${slug(
    input.releaseCandidateId,
  )}-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    blockerRoutes,
    cadSupportStatuses,
    csvContent,
    csvDataUri,
    csvFileName,
    downloadStatuses,
    fallbackMessages,
    files: [
      {
        download: csvFileName,
        format: "csv",
        href: csvDataUri,
        label: "Customer-facing native fulfillment status packet CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Customer-facing native fulfillment status packet JSON",
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

function createDownloadStatus(
  row: SignedPackageArtifactLocatorReport["rows"][number],
  route: NormalizedStatusRoute | undefined,
): CustomerFacingNativeFulfillmentDownloadStatusRow {
  const downloadUrl = row.uploadDestinationUrl.trim();
  const downloadStatus = downloadStatusFor({
    sourceStatus: row.status,
    uploadReady: row.uploadReady,
    urlReady: urlReady(downloadUrl),
  });
  const targetId = `download:${row.platform}`;
  const status = statusFor({
    availabilityBlocked: downloadStatus === "blocked",
    evidenceLinked: hasSha256(row.locatorHash),
    routeReady: routeReady(route),
    sourceStatus: row.status,
  });

  return createStatusRow({
    artifactName: row.artifactName,
    cadSupportStatus: "not-applicable",
    customerMessage:
      route?.customerMessage ||
      `${titleCase(row.platform)} native download status is ${downloadStatus}.`,
    downloadStatus,
    downloadUrl,
    downloadUrlReady: urlReady(downloadUrl),
    evidenceHash: row.locatorHash,
    platform: row.platform,
    releaseBlocked: row.missingArtifactBlocker || status === "blocked",
    route,
    section: "download",
    sourceStatus: row.status,
    status,
    targetId,
  });
}

function createCadSupportStatus(
  row: PackagedCadRuntimeExecutionReport["rows"][number],
  route: NormalizedStatusRoute | undefined,
): CustomerFacingNativeFulfillmentCadSupportStatusRow {
  const cadSupportStatus = cadSupportStatusFor({
    outputReady: row.outputReady,
    sourceStatus: row.status,
    transcriptReady: row.transcriptReady,
  });
  const targetId = `cad:${row.adapterId}`;
  const status = statusFor({
    availabilityBlocked: cadSupportStatus === "blocked",
    evidenceLinked: hasSha256(row.executionHash),
    routeReady: routeReady(route),
    sourceStatus: row.status,
  });

  return createStatusRow({
    adapterId: row.adapterId,
    cadSupportStatus,
    customerMessage:
      route?.customerMessage ||
      `${row.adapterId} CAD support status is ${cadSupportStatus}.`,
    downloadStatus: "not-applicable",
    evidenceHash: row.executionHash,
    outputPath: row.outputPath,
    releaseBlocked: status === "blocked",
    route,
    section: "cad-support",
    sourceStatus: row.status,
    status,
    targetId,
  });
}

function createFallbackMessage(
  row: NativeExportFulfillmentRehearsalReport["customerFallbackChecks"][number],
  route: NormalizedStatusRoute | undefined,
): CustomerFacingNativeFulfillmentFallbackMessageRow {
  const targetId = `fallback:${row.fallbackId}`;
  const status = statusFor({
    availabilityBlocked: row.status === "blocked",
    evidenceLinked: hasSha256(row.fallbackHash),
    routeReady: routeReady(route),
    sourceStatus: row.status,
  });

  return createStatusRow({
    cadSupportStatus: row.status === "ready" ? "fallback" : "blocked",
    customerMessage: route?.customerMessage || row.customerMessage,
    downloadStatus: "not-applicable",
    evidenceHash: row.fallbackHash,
    fallbackId: row.fallbackId,
    releaseBlocked: status === "blocked",
    route: route ?? routeFromFallback(row),
    section: "fallback",
    sourceStatus: row.status,
    status,
    targetId,
  });
}

function createBlockerRoute(
  row: NativeExportFulfillmentRehearsalReport["rows"][number],
  route: NormalizedStatusRoute | undefined,
): CustomerFacingNativeFulfillmentBlockerRouteRow {
  const targetId = `blocker:${row.gate}`;
  const status = statusFor({
    availabilityBlocked: row.status === "blocked",
    evidenceLinked: hasSha256(row.rehearsalHash),
    routeReady: routeReady(route),
    sourceStatus: row.status,
  });

  return createStatusRow({
    blockerReason: row.blockerReason,
    cadSupportStatus: "not-applicable",
    customerMessage:
      route?.customerMessage ||
      (row.status === "ready"
        ? `${titleCase(row.gate)} has no customer-facing blocker.`
        : row.blockerReason),
    downloadStatus: "not-applicable",
    evidenceHash: row.rehearsalHash,
    gate: row.gate,
    releaseBlocked: row.releaseBlocked || status === "blocked",
    route,
    section: "blocker-route",
    sourceStatus: row.status,
    status,
    targetId,
  });
}

function createStatusRow(
  input: CreateDownloadStatusRowInput,
): CustomerFacingNativeFulfillmentDownloadStatusRow;
function createStatusRow(
  input: CreateCadSupportStatusRowInput,
): CustomerFacingNativeFulfillmentCadSupportStatusRow;
function createStatusRow(
  input: CreateFallbackMessageRowInput,
): CustomerFacingNativeFulfillmentFallbackMessageRow;
function createStatusRow(
  input: CreateBlockerRouteRowInput,
): CustomerFacingNativeFulfillmentBlockerRouteRow;
function createStatusRow(
  input:
    | CreateBlockerRouteRowInput
    | CreateCadSupportStatusRowInput
    | CreateDownloadStatusRowInput
    | CreateFallbackMessageRowInput,
): CustomerFacingNativeFulfillmentStatusRow {
  const route = input.route;
  const fallbackMessage = route?.fallbackMessage ?? "";
  const fallbackRoute = route?.fallbackRoute ?? "";
  const blockerRoute = route?.blockerRoute ?? "";
  const blockerOwner = route?.blockerOwner ?? "";
  const etaAt = route?.etaAt ?? "";
  const etaOwner = route?.etaOwner ?? "";
  const base = {
    blockerOwner,
    blockerRoute,
    blockerRouteReady: routeEndpointReady(blockerRoute) && blockerOwner.length > 0,
    cadSupportStatus: input.cadSupportStatus,
    customerMessage: input.customerMessage.trim(),
    downloadStatus: input.downloadStatus,
    etaAt,
    etaAtReady: validDate(etaAt),
    etaOwner,
    etaOwnerReady: etaOwner.length > 0,
    evidenceHash: input.evidenceHash.trim() || "missing",
    evidenceLinked: hasSha256(input.evidenceHash),
    fallbackMessage,
    fallbackMessageReady: fallbackMessage.length >= 20,
    fallbackRoute,
    fallbackRouteReady: routeEndpointReady(fallbackRoute),
    nextAction: "",
    releaseBlocked: input.releaseBlocked,
    routeReady: routeReady(route),
    section: input.section,
    sourceStatus: input.sourceStatus,
    status: input.status,
    targetId: input.targetId,
  };
  const nextAction =
    base.status === "ready"
      ? `${input.targetId} customer-facing native fulfillment status is ready.`
      : `Resolve customer-facing native fulfillment status: ${blockerReasonFor(base)}`;
  const rowWithoutHash = {
    ...base,
    nextAction,
  };
  const statusHash = sha256(rowWithoutHash);

  if (input.section === "download") {
    return {
      ...rowWithoutHash,
      artifactName: input.artifactName,
      downloadUrl: input.downloadUrl,
      downloadUrlReady: input.downloadUrlReady,
      platform: input.platform,
      section: "download",
      statusHash,
    };
  }

  if (input.section === "cad-support") {
    return {
      ...rowWithoutHash,
      adapterId: input.adapterId,
      outputPath: input.outputPath,
      section: "cad-support",
      statusHash,
    };
  }

  if (input.section === "fallback") {
    return {
      ...rowWithoutHash,
      fallbackId: input.fallbackId,
      section: "fallback",
      statusHash,
    };
  }

  return {
    ...rowWithoutHash,
    blockerReason: input.blockerReason,
    gate: input.gate,
    section: "blocker-route",
    statusHash,
  };
}

interface NormalizedStatusRoute {
  readonly blockerOwner: string;
  readonly blockerRoute: string;
  readonly customerMessage: string;
  readonly etaAt: string;
  readonly etaOwner: string;
  readonly fallbackMessage: string;
  readonly fallbackRoute: string;
  readonly targetId: string;
}

interface CreateDownloadStatusRowInput {
  readonly artifactName: string;
  readonly cadSupportStatus: "not-applicable";
  readonly customerMessage: string;
  readonly downloadStatus: CustomerFacingNativeDownloadStatus;
  readonly downloadUrl: string;
  readonly downloadUrlReady: boolean;
  readonly evidenceHash: string;
  readonly platform: string;
  readonly releaseBlocked: boolean;
  readonly route: NormalizedStatusRoute | undefined;
  readonly section: "download";
  readonly sourceStatus: CustomerFacingNativeFulfillmentStatus;
  readonly status: CustomerFacingNativeFulfillmentStatus;
  readonly targetId: string;
}

interface CreateCadSupportStatusRowInput {
  readonly adapterId: string;
  readonly cadSupportStatus: CustomerFacingNativeCadSupportStatus;
  readonly customerMessage: string;
  readonly downloadStatus: "not-applicable";
  readonly evidenceHash: string;
  readonly outputPath: string;
  readonly releaseBlocked: boolean;
  readonly route: NormalizedStatusRoute | undefined;
  readonly section: "cad-support";
  readonly sourceStatus: CustomerFacingNativeFulfillmentStatus;
  readonly status: CustomerFacingNativeFulfillmentStatus;
  readonly targetId: string;
}

interface CreateFallbackMessageRowInput {
  readonly cadSupportStatus: CustomerFacingNativeCadSupportStatus;
  readonly customerMessage: string;
  readonly downloadStatus: "not-applicable";
  readonly evidenceHash: string;
  readonly fallbackId: string;
  readonly releaseBlocked: boolean;
  readonly route: NormalizedStatusRoute | undefined;
  readonly section: "fallback";
  readonly sourceStatus: CustomerFacingNativeFulfillmentStatus;
  readonly status: CustomerFacingNativeFulfillmentStatus;
  readonly targetId: string;
}

interface CreateBlockerRouteRowInput {
  readonly blockerReason: string;
  readonly cadSupportStatus: "not-applicable";
  readonly customerMessage: string;
  readonly downloadStatus: "not-applicable";
  readonly evidenceHash: string;
  readonly gate: NativeExportFulfillmentRehearsalGate;
  readonly releaseBlocked: boolean;
  readonly route: NormalizedStatusRoute | undefined;
  readonly section: "blocker-route";
  readonly sourceStatus: CustomerFacingNativeFulfillmentStatus;
  readonly status: CustomerFacingNativeFulfillmentStatus;
  readonly targetId: string;
}

function normalizeRoute(
  route: CustomerFacingNativeFulfillmentStatusRouteInput,
): NormalizedStatusRoute {
  return {
    blockerOwner: route.blockerOwner.trim(),
    blockerRoute: route.blockerRoute.trim(),
    customerMessage: route.customerMessage.trim(),
    etaAt: route.etaAt.trim(),
    etaOwner: route.etaOwner.trim(),
    fallbackMessage: route.fallbackMessage.trim(),
    fallbackRoute: route.fallbackRoute.trim(),
    targetId: route.targetId.trim(),
  };
}

function routeFromFallback(
  row: NativeExportFulfillmentRehearsalReport["customerFallbackChecks"][number],
): NormalizedStatusRoute | undefined {
  if (!row.fallbackRouteReady || !row.ownerReady || !row.customerMessageReady) {
    return undefined;
  }

  return {
    blockerOwner: row.owner,
    blockerRoute: row.fallbackRoute,
    customerMessage: row.customerMessage,
    etaAt: row.checkedAt,
    etaOwner: row.owner,
    fallbackMessage: row.customerMessage,
    fallbackRoute: row.fallbackRoute,
    targetId: `fallback:${row.fallbackId}`,
  };
}

function downloadStatusFor(input: {
  readonly sourceStatus: CustomerFacingNativeFulfillmentStatus;
  readonly uploadReady: boolean;
  readonly urlReady: boolean;
}): CustomerFacingNativeDownloadStatus {
  if (input.sourceStatus === "ready" && input.uploadReady && input.urlReady) {
    return "available";
  }

  if (input.sourceStatus === "review") {
    return "pending";
  }

  return "blocked";
}

function cadSupportStatusFor(input: {
  readonly outputReady: boolean;
  readonly sourceStatus: CustomerFacingNativeFulfillmentStatus;
  readonly transcriptReady: boolean;
}): CustomerFacingNativeCadSupportStatus {
  if (input.sourceStatus === "ready" && input.outputReady && input.transcriptReady) {
    return "supported";
  }

  if (input.sourceStatus === "review") {
    return "fallback";
  }

  return "blocked";
}

function statusFor(input: {
  readonly availabilityBlocked: boolean;
  readonly evidenceLinked: boolean;
  readonly routeReady: boolean;
  readonly sourceStatus: CustomerFacingNativeFulfillmentStatus;
}): CustomerFacingNativeFulfillmentStatus {
  if (
    input.availabilityBlocked ||
    !input.evidenceLinked ||
    !input.routeReady ||
    input.sourceStatus === "blocked"
  ) {
    return "blocked";
  }

  if (input.sourceStatus === "review") {
    return "review";
  }

  return "ready";
}

function summarize(input: {
  readonly blockerRoutes: readonly CustomerFacingNativeFulfillmentBlockerRouteRow[];
  readonly cadSupportStatuses: readonly CustomerFacingNativeFulfillmentCadSupportStatusRow[];
  readonly downloadStatuses: readonly CustomerFacingNativeFulfillmentDownloadStatusRow[];
  readonly fallbackMessages: readonly CustomerFacingNativeFulfillmentFallbackMessageRow[];
  readonly rows: readonly CustomerFacingNativeFulfillmentStatusRow[];
}) {
  const readyCount = input.rows.filter((row) => row.status === "ready").length;
  const blockedCount = input.rows.filter((row) => row.status === "blocked").length;
  const reviewCount = input.rows.filter((row) => row.status === "review").length;
  const statusScore =
    input.rows.length === 0
      ? 0
      : Math.round(
          input.rows.reduce((total, row) => total + scoreForStatus(row.status), 0) /
            input.rows.length,
        );
  const status = statusForCounts({
    blockedCount,
    readyCount,
    reviewCount,
    rowCount: input.rows.length,
  });
  const releaseBlocked =
    status === "blocked" || input.rows.some((row) => row.releaseBlocked);
  const unresolved = input.rows
    .filter((row) => row.status !== "ready")
    .map(blockerReasonFor)
    .filter(Boolean);
  const nextAction =
    status === "ready"
      ? "Customer-facing native fulfillment status is ready for release communication."
      : `Resolve customer-facing native fulfillment status: ${unresolved.join("; ")}`;
  const summaryWithoutHash = {
    blockedCount,
    blockerRouteReadyCount: input.blockerRoutes.filter((row) => row.routeReady).length,
    cadSupportedCount: input.cadSupportStatuses.filter(
      (row) => row.status === "ready" && row.cadSupportStatus === "supported",
    ).length,
    downloadAvailableCount: input.downloadStatuses.filter(
      (row) => row.status === "ready" && row.downloadStatus === "available",
    ).length,
    fallbackReadyCount: input.fallbackMessages.filter((row) => row.status === "ready")
      .length,
    nextAction,
    readyCount,
    releaseBlocked,
    reviewCount,
    rowCount: input.rows.length,
    status,
    statusScore,
  };

  return {
    ...summaryWithoutHash,
    statusHash: sha256({
      rowHashes: input.rows.map((row) => row.statusHash),
      summary: summaryWithoutHash,
    }),
  };
}

function statusForCounts(input: {
  readonly blockedCount: number;
  readonly readyCount: number;
  readonly reviewCount: number;
  readonly rowCount: number;
}): CustomerFacingNativeFulfillmentStatus {
  if (input.rowCount === 0 || input.blockedCount > 0) {
    return "blocked";
  }

  if (input.reviewCount > 0 || input.readyCount < input.rowCount) {
    return "review";
  }

  return "ready";
}

function scoreForStatus(status: CustomerFacingNativeFulfillmentStatus) {
  if (status === "ready") {
    return 100;
  }

  if (status === "review") {
    return 60;
  }

  return 0;
}

function routeReady(route: NormalizedStatusRoute | undefined) {
  return Boolean(
    route &&
      validDate(route.etaAt) &&
      route.etaOwner.length > 0 &&
      route.fallbackMessage.length >= 20 &&
      routeEndpointReady(route.fallbackRoute) &&
      routeEndpointReady(route.blockerRoute) &&
      route.blockerOwner.length > 0 &&
      route.customerMessage.length >= 20,
  );
}

function blockerReasonFor(
  row: Omit<CustomerFacingNativeFulfillmentStatusBaseRow, "statusHash">,
) {
  const blockers = [
    row.sourceStatus === "blocked" ? `${row.targetId} source evidence is blocked` : "",
    !row.evidenceLinked ? `${row.targetId} evidence hash is missing` : "",
    !row.etaOwnerReady ? `${row.targetId} ETA owner is missing` : "",
    !row.etaAtReady ? `${row.targetId} ETA timestamp is missing` : "",
    !row.fallbackMessageReady ? `${row.targetId} fallback message is missing` : "",
    !row.fallbackRouteReady ? `${row.targetId} fallback route is missing` : "",
    !row.blockerRouteReady ? `${row.targetId} blocker route is missing` : "",
    row.releaseBlocked ? `${row.targetId} release is blocked` : "",
  ].filter(Boolean);

  return blockers.join("; ");
}

function createCsv(rows: readonly CustomerFacingNativeFulfillmentStatusRow[]) {
  const headers = [
    "section",
    "target_id",
    "status",
    "download_status",
    "cad_support_status",
    "eta_owner",
    "eta_at",
    "blocker_route",
    "status_hash",
    "next_action",
  ];
  const lines = rows.map((row) =>
    [
      row.section,
      row.targetId,
      row.status,
      row.downloadStatus,
      row.cadSupportStatus,
      row.etaOwner,
      row.etaAt,
      row.blockerRoute,
      row.statusHash,
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

function routeEndpointReady(value: string) {
  return value.startsWith("https://") || value.startsWith("/");
}

function urlReady(value: string) {
  return value.startsWith("https://");
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

function sha256(value: unknown) {
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
