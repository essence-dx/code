import { createHash } from "node:crypto";

import type { CustomerFacingNativeFulfillmentStatusPacket } from "@/features/projects/customer-facing-native-fulfillment-status-packet";
import type { NativeCadRuntimeProcessRehearsalReport } from "@/features/projects/native-cad-runtime-process-rehearsal-runner";
import type { SignedPackageFilesystemVerificationRunPacket } from "@/features/projects/signed-package-filesystem-verification-run-packet";

export type OperatorEscalationStatusBridgeArea =
  | "failed-fixture-conversions"
  | "missing-cad-executables"
  | "missing-package-signatures"
  | "stale-customer-fallback-etas";

export type OperatorEscalationStatusBridgeStatus =
  | "blocked"
  | "ready"
  | "review";

export type OperatorEscalationStatusBridgeSeverity =
  | "critical"
  | "high"
  | "medium";

export type OperatorEscalationStatusBridgeFileFormat = "csv" | "json";

export interface OperatorEscalationStatusBridgeRouteInput {
  readonly acknowledgedAt: string;
  readonly acknowledgementHash: string;
  readonly area: OperatorEscalationStatusBridgeArea;
  readonly owner: string;
  readonly routeUrl: string;
  readonly severity: OperatorEscalationStatusBridgeSeverity;
  readonly slaDueAt: string;
}

export interface OperatorEscalationStatusBridgeRow {
  readonly acknowledged: boolean;
  readonly acknowledgedAt: string;
  readonly acknowledgementHash: string;
  readonly area: OperatorEscalationStatusBridgeArea;
  readonly bridgeHash: string;
  readonly findingCount: number;
  readonly findingSummary: string;
  readonly findingTargets: readonly string[];
  readonly nextAction: string;
  readonly openEscalation: boolean;
  readonly owner: string;
  readonly ownerReady: boolean;
  readonly routeReady: boolean;
  readonly routeUrl: string;
  readonly severity: OperatorEscalationStatusBridgeSeverity;
  readonly slaDueAt: string;
  readonly slaReady: boolean;
  readonly sourceHash: string;
  readonly sourceStatus: OperatorEscalationStatusBridgeStatus;
  readonly status: OperatorEscalationStatusBridgeStatus;
}

export interface OperatorEscalationStatusBridgeFile {
  readonly download: string;
  readonly format: OperatorEscalationStatusBridgeFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface OperatorEscalationStatusBridge {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: readonly OperatorEscalationStatusBridgeFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: readonly OperatorEscalationStatusBridgeRow[];
  readonly summary: {
    readonly acknowledgedCount: number;
    readonly blockedCount: number;
    readonly bridgeHash: string;
    readonly bridgeScore: number;
    readonly findingCount: number;
    readonly nextAction: string;
    readonly openEscalationCount: number;
    readonly readyCount: number;
    readonly releaseBlocked: boolean;
    readonly reviewCount: number;
    readonly routeReadyCount: number;
    readonly rowCount: number;
    readonly status: OperatorEscalationStatusBridgeStatus;
  };
  readonly workspaceId: string;
}

export interface CreateOperatorEscalationStatusBridgeInput {
  readonly cadProcessRehearsal?: NativeCadRuntimeProcessRehearsalReport;
  readonly customerStatus?: CustomerFacingNativeFulfillmentStatusPacket;
  readonly escalationRoutes: readonly OperatorEscalationStatusBridgeRouteInput[];
  readonly filesystemVerification?: SignedPackageFilesystemVerificationRunPacket;
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly workspaceId?: string;
}

interface FindingSource {
  readonly hash: string;
  readonly status: OperatorEscalationStatusBridgeStatus;
  readonly targets: readonly string[];
}

interface AreaConfig {
  readonly area: OperatorEscalationStatusBridgeArea;
  readonly label: string;
  readonly severity: OperatorEscalationStatusBridgeSeverity;
}

const areaConfigs: readonly AreaConfig[] = [
  {
    area: "missing-package-signatures",
    label: "missing package signatures",
    severity: "critical",
  },
  {
    area: "missing-cad-executables",
    label: "missing CAD executables",
    severity: "critical",
  },
  {
    area: "failed-fixture-conversions",
    label: "failed fixture conversions",
    severity: "critical",
  },
  {
    area: "stale-customer-fallback-etas",
    label: "stale customer fallback ETAs",
    severity: "high",
  },
];

export function createOperatorEscalationStatusBridge(
  input: CreateOperatorEscalationStatusBridgeInput,
): OperatorEscalationStatusBridge {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? "Essence Runtime";
  const routeByArea = new Map(
    input.escalationRoutes.map((route) => [route.area, normalizeRoute(route)]),
  );
  const rows = areaConfigs.map((config) =>
    createRow({
      config,
      findingSource: findingsForArea({
        area: config.area,
        cadProcessRehearsal: input.cadProcessRehearsal,
        customerStatus: input.customerStatus,
        filesystemVerification: input.filesystemVerification,
        generatedAt,
      }),
      route: routeByArea.get(config.area),
    }),
  );
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
  const fileBase = `${slug(workspaceId)}-operator-escalation-status-bridge-${slug(
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
        label: "Operator escalation status bridge CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Operator escalation status bridge JSON",
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

function createRow(input: {
  readonly config: AreaConfig;
  readonly findingSource: FindingSource;
  readonly route: OperatorEscalationStatusBridgeRouteInput | undefined;
}): OperatorEscalationStatusBridgeRow {
  const route = input.route ?? missingRoute(input.config.area, input.config.severity);
  const routeUrl = route.routeUrl.trim();
  const owner = route.owner.trim();
  const acknowledgementHash = route.acknowledgementHash.trim() || "missing";
  const acknowledgedAt = route.acknowledgedAt.trim();
  const slaDueAt = route.slaDueAt.trim();
  const ownerReady = owner.length > 0;
  const routeReady = routeEndpointReady(routeUrl) && ownerReady;
  const slaReady = validDate(slaDueAt);
  const acknowledged = validDate(acknowledgedAt) && hasSha256(acknowledgementHash);
  const findingTargets = [...new Set(input.findingSource.targets)].sort();
  const findingCount = findingTargets.length;
  const openEscalation = findingCount > 0;
  const status = statusFor({
    acknowledged,
    openEscalation,
    routeReady,
    slaReady,
    sourceStatus: input.findingSource.status,
  });
  const findingSummary =
    findingCount === 0
      ? `No ${input.config.label} are currently open.`
      : `${findingCount} ${input.config.label}: ${findingTargets.join(", ")}`;
  const rowWithoutHash = {
    acknowledged,
    acknowledgedAt,
    acknowledgementHash,
    area: input.config.area,
    findingCount,
    findingSummary,
    findingTargets,
    nextAction: "",
    openEscalation,
    owner,
    ownerReady,
    routeReady,
    routeUrl,
    severity: route.severity,
    slaDueAt,
    slaReady,
    sourceHash: input.findingSource.hash,
    sourceStatus: input.findingSource.status,
    status,
  } satisfies Omit<OperatorEscalationStatusBridgeRow, "bridgeHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    bridgeHash: sha256(row),
  };
}

function findingsForArea(input: {
  readonly area: OperatorEscalationStatusBridgeArea;
  readonly cadProcessRehearsal?: NativeCadRuntimeProcessRehearsalReport;
  readonly customerStatus?: CustomerFacingNativeFulfillmentStatusPacket;
  readonly filesystemVerification?: SignedPackageFilesystemVerificationRunPacket;
  readonly generatedAt: string;
}): FindingSource {
  if (input.area === "missing-package-signatures") {
    return packageSignatureFindings(input.filesystemVerification);
  }

  if (input.area === "missing-cad-executables") {
    return cadExecutableFindings(input.cadProcessRehearsal);
  }

  if (input.area === "failed-fixture-conversions") {
    return fixtureConversionFindings(input.cadProcessRehearsal);
  }

  return staleCustomerFallbackEtaFindings(input.customerStatus, input.generatedAt);
}

function packageSignatureFindings(
  packet: SignedPackageFilesystemVerificationRunPacket | undefined,
): FindingSource {
  if (!packet) {
    return missingSource("missing-package-signatures");
  }

  return {
    hash: packet.summary.verificationHash,
    status: statusValue(packet.summary.status),
    targets: packet.rows
      .filter((row) => !row.signatureTranscriptReady)
      .map((row) => `${row.platform}:${row.artifactName}`),
  };
}

function cadExecutableFindings(
  packet: NativeCadRuntimeProcessRehearsalReport | undefined,
): FindingSource {
  if (!packet) {
    return missingSource("missing-cad-executables");
  }

  return {
    hash: packet.summary.rehearsalHash,
    status: statusValue(packet.summary.status),
    targets: packet.rows
      .filter((row) => !row.processExecuted && missingExecutableReason(row))
      .map((row) => row.adapterId),
  };
}

function fixtureConversionFindings(
  packet: NativeCadRuntimeProcessRehearsalReport | undefined,
): FindingSource {
  if (!packet) {
    return missingSource("failed-fixture-conversions");
  }

  return {
    hash: packet.summary.rehearsalHash,
    status: statusValue(packet.summary.status),
    targets: packet.rows
      .filter((row) => !row.processExecuted && !missingExecutableReason(row))
      .map((row) => row.adapterId),
  };
}

function staleCustomerFallbackEtaFindings(
  packet: CustomerFacingNativeFulfillmentStatusPacket | undefined,
  generatedAt: string,
): FindingSource {
  if (!packet) {
    return missingSource("stale-customer-fallback-etas");
  }

  const generatedAtMs = Date.parse(generatedAt);

  return {
    hash: packet.summary.statusHash,
    status: statusValue(packet.summary.status),
    targets: packet.rows
      .filter((row) => row.releaseBlocked || row.status === "blocked")
      .filter((row) => validDate(row.etaAt) && Date.parse(row.etaAt) < generatedAtMs)
      .map((row) => row.targetId),
  };
}

function missingSource(area: OperatorEscalationStatusBridgeArea): FindingSource {
  return {
    hash: "missing",
    status: "blocked",
    targets: [area],
  };
}

function missingExecutableReason(
  row: NativeCadRuntimeProcessRehearsalReport["rows"][number],
) {
  return /executable|packaged runtime|resolved path/i.test(
    `${row.failureReason} ${row.blockerReason}`,
  );
}

function statusFor(input: {
  readonly acknowledged: boolean;
  readonly openEscalation: boolean;
  readonly routeReady: boolean;
  readonly slaReady: boolean;
  readonly sourceStatus: OperatorEscalationStatusBridgeStatus;
}): OperatorEscalationStatusBridgeStatus {
  if (!input.routeReady || !input.slaReady) {
    return "blocked";
  }

  if (input.openEscalation && !input.acknowledged) {
    return "blocked";
  }

  if (input.sourceStatus === "review" || input.openEscalation) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Pick<
    OperatorEscalationStatusBridgeRow,
    | "acknowledged"
    | "area"
    | "findingSummary"
    | "openEscalation"
    | "routeReady"
    | "slaReady"
    | "status"
  >,
) {
  if (row.status === "ready") {
    return `Operator escalation status bridge is clear for ${row.area}.`;
  }

  if (!row.routeReady) {
    return `Resolve blocked operator escalation status bridge for ${row.area}: assign owner and route.`;
  }

  if (!row.slaReady) {
    return `Resolve blocked operator escalation status bridge for ${row.area}: set escalation SLA.`;
  }

  if (row.openEscalation && !row.acknowledged) {
    return `Resolve blocked operator escalation status bridge for ${row.area}: acknowledge ${row.findingSummary}.`;
  }

  return `Review operator escalation status bridge for ${row.area}: ${row.findingSummary}.`;
}

function summarize(
  rows: readonly OperatorEscalationStatusBridgeRow[],
): OperatorEscalationStatusBridge["summary"] {
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const openEscalationCount = rows.filter((row) => row.openEscalation).length;
  const routeReadyCount = rows.filter((row) => row.routeReady).length;
  const acknowledgedCount = rows.filter((row) => row.acknowledged).length;
  const findingCount = rows.reduce((total, row) => total + row.findingCount, 0);
  const readySignals = rows.reduce(
    (total, row) =>
      total +
      [
        row.routeReady,
        row.ownerReady,
        row.slaReady,
        row.acknowledged,
        !row.openEscalation,
        row.sourceStatus !== "blocked",
      ].filter(Boolean).length,
    0,
  );
  const status: OperatorEscalationStatusBridgeStatus =
    rows.length === 0 || blockedCount > 0
      ? "blocked"
      : reviewCount > 0
        ? "review"
        : "ready";
  const summaryWithoutHash = {
    acknowledgedCount,
    blockedCount,
    bridgeScore:
      rows.length === 0
        ? 0
        : Math.round((readySignals / (rows.length * 6)) * 100),
    findingCount,
    nextAction:
      status === "ready"
        ? "Operator escalation status bridge is ready for native artifact runtime integration."
        : `Resolve blocked operator escalation status bridge: ${rows
            .filter((row) => row.status !== "ready")
            .map((row) => row.nextAction)
            .join("; ")}`,
    openEscalationCount,
    readyCount,
    releaseBlocked: status === "blocked" || openEscalationCount > 0,
    reviewCount,
    routeReadyCount,
    rowCount: rows.length,
    status,
  };

  return {
    ...summaryWithoutHash,
    bridgeHash: sha256({
      rowHashes: rows.map((row) => row.bridgeHash),
      summary: summaryWithoutHash,
    }),
  };
}

function normalizeRoute(
  route: OperatorEscalationStatusBridgeRouteInput,
): OperatorEscalationStatusBridgeRouteInput {
  return {
    acknowledgedAt: route.acknowledgedAt.trim(),
    acknowledgementHash: route.acknowledgementHash.trim(),
    area: route.area,
    owner: route.owner.trim(),
    routeUrl: route.routeUrl.trim(),
    severity: route.severity,
    slaDueAt: route.slaDueAt.trim(),
  };
}

function missingRoute(
  area: OperatorEscalationStatusBridgeArea,
  severity: OperatorEscalationStatusBridgeSeverity,
): OperatorEscalationStatusBridgeRouteInput {
  return {
    acknowledgedAt: "",
    acknowledgementHash: "",
    area,
    owner: "",
    routeUrl: "",
    severity,
    slaDueAt: "",
  };
}

function createCsv(rows: readonly OperatorEscalationStatusBridgeRow[]) {
  const headers = [
    "area",
    "status",
    "finding_count",
    "open_escalation",
    "route_ready",
    "acknowledged",
    "severity",
    "bridge_hash",
    "next_action",
  ];
  const lines = rows.map((row) =>
    [
      row.area,
      row.status,
      String(row.findingCount),
      String(row.openEscalation),
      String(row.routeReady),
      String(row.acknowledged),
      row.severity,
      row.bridgeHash,
      row.nextAction,
    ]
      .map(csvEscape)
      .join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}

function statusValue(value: string): OperatorEscalationStatusBridgeStatus {
  return value === "ready" || value === "review" ? value : "blocked";
}

function routeEndpointReady(value: string) {
  return value.startsWith("https://") || value.startsWith("/");
}

function hasSha256(value: string) {
  return value.trim().startsWith("sha256:") && value.trim().length > "sha256:".length;
}

function validDate(value: string) {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp);
}

function csvEscape(value: string) {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}

function encodeDataUri(mimeType: string, content: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
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

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "current"
    : date.toISOString().slice(0, 10).replaceAll("-", "");
}
