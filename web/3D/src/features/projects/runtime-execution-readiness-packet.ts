import { createHash } from "node:crypto";
import type { ExternalArtifactVerificationCommandRunnerReport } from "@/features/projects/external-artifact-verification-command-runner";
import type { NativeCadRuntimeExecutionProbeReport } from "@/features/projects/native-cad-runtime-execution-probe";
import type { NativeToolchainPrerequisiteDetectorReport } from "@/features/projects/native-toolchain-prerequisite-detector";

export type RuntimeExecutionReadinessGate =
  | "artifact-command-verification"
  | "cad-runtime-execution"
  | "customer-facing-blockers"
  | "toolchain-prerequisites";

export type RuntimeExecutionReadinessStatus = "blocked" | "ready" | "review";
export type RuntimeExecutionReadinessFileFormat = "csv" | "json";

export interface RuntimeExecutionCustomerBlockerInput {
  readonly blockerId: string;
  readonly customerMessage: string;
  readonly evidenceHash: string;
  readonly evidenceUrl: string;
  readonly mitigation: string;
  readonly owner: string;
  readonly releaseBlocker: boolean;
  readonly sourceGate: RuntimeExecutionReadinessGate;
  readonly status: RuntimeExecutionReadinessStatus;
}

export interface RuntimeExecutionCustomerBlockerRow {
  readonly blockerHash: string;
  readonly blockerId: string;
  readonly customerMessage: string;
  readonly customerMessageReady: boolean;
  readonly evidenceHash: string;
  readonly evidenceLinked: boolean;
  readonly evidenceUrl: string;
  readonly mitigation: string;
  readonly mitigationReady: boolean;
  readonly nextAction: string;
  readonly owner: string;
  readonly ownerReady: boolean;
  readonly releaseBlocker: boolean;
  readonly sourceGate: RuntimeExecutionReadinessGate;
  readonly status: RuntimeExecutionReadinessStatus;
}

export interface RuntimeExecutionReadinessRow {
  readonly customerBlockerCount: number;
  readonly customerMessageReady: boolean;
  readonly evidenceLinked: boolean;
  readonly gate: RuntimeExecutionReadinessGate;
  readonly nextAction: string;
  readonly readinessHash: string;
  readonly releaseBlocked: boolean;
  readonly score: number;
  readonly sourceHash: string;
  readonly sourceReady: boolean;
  readonly sourceStatus: RuntimeExecutionReadinessStatus;
  readonly status: RuntimeExecutionReadinessStatus;
}

export interface RuntimeExecutionReadinessFile {
  readonly download: string;
  readonly format: RuntimeExecutionReadinessFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface RuntimeExecutionReadinessPacket {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly customerBlockers: readonly RuntimeExecutionCustomerBlockerRow[];
  readonly files: readonly RuntimeExecutionReadinessFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: readonly RuntimeExecutionReadinessRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly customerBlockerCount: number;
    readonly customerMessageReadyCount: number;
    readonly nextAction: string;
    readonly readinessHash: string;
    readonly readinessScore: number;
    readonly readyCount: number;
    readonly releaseBlocked: boolean;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly sourceReadyCount: number;
    readonly status: RuntimeExecutionReadinessStatus;
  };
  readonly workspaceId: string;
}

export interface CreateRuntimeExecutionReadinessPacketInput {
  readonly artifactVerification?: ExternalArtifactVerificationCommandRunnerReport;
  readonly cadRuntimeExecution?: NativeCadRuntimeExecutionProbeReport;
  readonly customerBlockers?: readonly RuntimeExecutionCustomerBlockerInput[];
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly requiredGates?: readonly RuntimeExecutionReadinessGate[];
  readonly toolchainPrerequisites?: NativeToolchainPrerequisiteDetectorReport;
  readonly workspaceId?: string;
}

const defaultRequiredGates: readonly RuntimeExecutionReadinessGate[] = [
  "toolchain-prerequisites",
  "artifact-command-verification",
  "cad-runtime-execution",
  "customer-facing-blockers",
];

const gateRank: Record<RuntimeExecutionReadinessGate, number> = {
  "toolchain-prerequisites": 0,
  "artifact-command-verification": 1,
  "cad-runtime-execution": 2,
  "customer-facing-blockers": 3,
};

export function createRuntimeExecutionReadinessPacket(
  input: CreateRuntimeExecutionReadinessPacketInput,
): RuntimeExecutionReadinessPacket {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? "Essence Runtime";
  const customerBlockers = createCustomerBlockerRows(
    input.customerBlockers ?? [],
  );
  const rows = createRows({
    ...input,
    customerBlockers,
  });
  const summary = summarize(rows, customerBlockers);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      customerBlockers,
      generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-runtime-execution-readiness-packet-${slug(
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
    customerBlockers,
    files: [
      {
        download: csvFileName,
        format: "csv",
        href: csvDataUri,
        label: "Runtime execution readiness packet CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Runtime execution readiness packet JSON",
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

function createRows(
  input: CreateRuntimeExecutionReadinessPacketInput & {
    readonly customerBlockers: readonly RuntimeExecutionCustomerBlockerRow[];
  },
) {
  const requiredGates = input.requiredGates ?? defaultRequiredGates;
  const rows = requiredGates.map((gate) => {
    if (gate === "toolchain-prerequisites") {
      return createSourceRow({
        evidenceLinked: reportEvidenceLinked(input.toolchainPrerequisites),
        gate,
        missingReason: "Attach native toolchain prerequisite detector report.",
        releaseBlocked: input.toolchainPrerequisites?.summary.releaseBlocked ?? true,
        score: input.toolchainPrerequisites?.summary.prerequisiteScore ?? 0,
        sourceHash:
          input.toolchainPrerequisites?.summary.prerequisiteHash ?? "missing",
        sourceStatus:
          input.toolchainPrerequisites?.summary.status ?? "blocked",
      });
    }

    if (gate === "artifact-command-verification") {
      return createSourceRow({
        evidenceLinked: reportEvidenceLinked(input.artifactVerification),
        gate,
        missingReason:
          "Attach external artifact verification command runner report.",
        releaseBlocked: input.artifactVerification?.summary.releaseBlocked ?? true,
        score: input.artifactVerification?.summary.verificationScore ?? 0,
        sourceHash:
          input.artifactVerification?.summary.verificationHash ?? "missing",
        sourceStatus:
          input.artifactVerification?.summary.status ?? "blocked",
      });
    }

    if (gate === "cad-runtime-execution") {
      return createSourceRow({
        evidenceLinked: reportEvidenceLinked(input.cadRuntimeExecution),
        gate,
        missingReason: "Attach native CAD runtime execution probe report.",
        releaseBlocked: input.cadRuntimeExecution?.summary.releaseBlocked ?? true,
        score: input.cadRuntimeExecution?.summary.executionScore ?? 0,
        sourceHash: input.cadRuntimeExecution?.summary.probeHash ?? "missing",
        sourceStatus: input.cadRuntimeExecution?.summary.status ?? "blocked",
      });
    }

    return createCustomerBlockerGateRow(input.customerBlockers);
  });

  return rows.sort((first, second) => gateRank[first.gate] - gateRank[second.gate]);
}

function createSourceRow(input: {
  readonly evidenceLinked: boolean;
  readonly gate: RuntimeExecutionReadinessGate;
  readonly missingReason: string;
  readonly releaseBlocked: boolean;
  readonly score: number;
  readonly sourceHash: string;
  readonly sourceStatus: RuntimeExecutionReadinessStatus;
}): RuntimeExecutionReadinessRow {
  const sourceHash = input.sourceHash.trim() || "missing";
  const score = normalizeScore(input.score);
  const evidenceLinked = input.evidenceLinked && hasSha256(sourceHash);
  const sourceReady =
    input.sourceStatus === "ready" &&
    !input.releaseBlocked &&
    score >= 90 &&
    evidenceLinked;
  const status = statusFor({
    evidenceLinked,
    releaseBlocked: input.releaseBlocked,
    score,
    sourceReady,
    sourceStatus: input.sourceStatus,
  });
  const rowWithoutHash = {
    customerBlockerCount: 0,
    customerMessageReady: true,
    evidenceLinked,
    gate: input.gate,
    nextAction: "",
    releaseBlocked: input.releaseBlocked || status === "blocked",
    score,
    sourceHash,
    sourceReady,
    sourceStatus: input.sourceStatus,
    status,
  } satisfies Omit<RuntimeExecutionReadinessRow, "readinessHash">;
  const row = {
    ...rowWithoutHash,
    nextAction:
      sourceHash === "missing"
        ? input.missingReason
        : nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    readinessHash: sha256(row),
  };
}

function createCustomerBlockerGateRow(
  customerBlockers: readonly RuntimeExecutionCustomerBlockerRow[],
): RuntimeExecutionReadinessRow {
  const releaseBlocked = customerBlockers.some(
    (blocker) => blocker.releaseBlocker && blocker.status === "blocked",
  );
  const evidenceLinked = customerBlockers.every(
    (blocker) => blocker.evidenceLinked,
  );
  const customerMessageReady = customerBlockers.every(
    (blocker) => blocker.customerMessageReady && blocker.mitigationReady,
  );
  const sourceHash = sha256(customerBlockers.map((blocker) => blocker.blockerHash));
  const score = customerBlockers.length === 0
    ? 100
    : normalizeScore(
        (customerBlockers.reduce(
          (total, blocker) =>
            total +
            [
              blocker.customerMessageReady,
              blocker.evidenceLinked,
              blocker.mitigationReady,
              blocker.ownerReady,
              !(blocker.releaseBlocker && blocker.status === "blocked"),
            ].filter(Boolean).length,
          0,
        ) /
          (customerBlockers.length * 5)) *
          100,
      );
  const sourceStatus: RuntimeExecutionReadinessStatus = releaseBlocked
    ? "blocked"
    : score < 90
      ? "review"
      : "ready";
  const sourceReady =
    sourceStatus === "ready" &&
    !releaseBlocked &&
    evidenceLinked &&
    customerMessageReady;
  const status = statusFor({
    evidenceLinked,
    releaseBlocked,
    score,
    sourceReady,
    sourceStatus,
  });
  const rowWithoutHash = {
    customerBlockerCount: customerBlockers.length,
    customerMessageReady,
    evidenceLinked,
    gate: "customer-facing-blockers",
    nextAction: "",
    releaseBlocked,
    score,
    sourceHash,
    sourceReady,
    sourceStatus,
    status,
  } satisfies Omit<RuntimeExecutionReadinessRow, "readinessHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    readinessHash: sha256(row),
  };
}

function createCustomerBlockerRows(
  blockers: readonly RuntimeExecutionCustomerBlockerInput[],
) {
  return blockers
    .map((blocker) => createCustomerBlockerRow(blocker))
    .sort((first, second) => first.blockerId.localeCompare(second.blockerId));
}

function createCustomerBlockerRow(
  input: RuntimeExecutionCustomerBlockerInput,
): RuntimeExecutionCustomerBlockerRow {
  const blockerId = input.blockerId.trim() || "unassigned-blocker";
  const customerMessage = input.customerMessage.trim();
  const evidenceHash = input.evidenceHash.trim() || "missing";
  const evidenceUrl = input.evidenceUrl.trim();
  const mitigation = input.mitigation.trim();
  const owner = input.owner.trim();
  const ownerReady = owner.length > 0;
  const customerMessageReady = customerMessage.length >= 20;
  const mitigationReady = mitigation.length >= 20;
  const evidenceLinked = hasSha256(evidenceHash) && urlReady(evidenceUrl);
  const rowWithoutHash = {
    blockerId,
    customerMessage,
    customerMessageReady,
    evidenceHash,
    evidenceLinked,
    evidenceUrl,
    mitigation,
    mitigationReady,
    nextAction: "",
    owner,
    ownerReady,
    releaseBlocker: input.releaseBlocker,
    sourceGate: input.sourceGate,
    status: input.status,
  } satisfies Omit<RuntimeExecutionCustomerBlockerRow, "blockerHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionForCustomerBlocker(rowWithoutHash),
  };

  return {
    ...row,
    blockerHash: sha256(row),
  };
}

function statusFor(input: {
  readonly evidenceLinked: boolean;
  readonly releaseBlocked: boolean;
  readonly score: number;
  readonly sourceReady: boolean;
  readonly sourceStatus: RuntimeExecutionReadinessStatus;
}): RuntimeExecutionReadinessStatus {
  if (
    input.releaseBlocked ||
    input.sourceStatus === "blocked" ||
    !input.evidenceLinked ||
    input.score < 60
  ) {
    return "blocked";
  }

  if (!input.sourceReady || input.sourceStatus === "review" || input.score < 90) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Pick<
    RuntimeExecutionReadinessRow,
    | "customerBlockerCount"
    | "customerMessageReady"
    | "evidenceLinked"
    | "gate"
    | "releaseBlocked"
    | "score"
    | "sourceReady"
    | "status"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked runtime execution readiness packet for ${row.gate}.`;
  }

  if (!row.evidenceLinked) {
    return `Attach runtime execution readiness evidence for ${row.gate}.`;
  }

  if (row.releaseBlocked) {
    return `Clear release blockers before approving ${row.gate}.`;
  }

  if (row.customerBlockerCount > 0 && !row.customerMessageReady) {
    return "Write customer-facing blocker messages and mitigations.";
  }

  if (row.score < 90 || !row.sourceReady) {
    return `Review runtime execution readiness packet for ${row.gate}.`;
  }

  return `Runtime execution readiness packet is ready for ${row.gate}.`;
}

function nextActionForCustomerBlocker(
  blocker: Pick<
    RuntimeExecutionCustomerBlockerRow,
    | "blockerId"
    | "customerMessageReady"
    | "evidenceLinked"
    | "mitigationReady"
    | "ownerReady"
    | "releaseBlocker"
    | "status"
  >,
) {
  if (blocker.releaseBlocker && blocker.status === "blocked") {
    return `Resolve customer-facing runtime execution blocker ${blocker.blockerId}.`;
  }

  if (!blocker.customerMessageReady) {
    return `Write customer-facing message for ${blocker.blockerId}.`;
  }

  if (!blocker.mitigationReady) {
    return `Write customer-facing mitigation for ${blocker.blockerId}.`;
  }

  if (!blocker.evidenceLinked) {
    return `Attach customer-facing blocker evidence for ${blocker.blockerId}.`;
  }

  if (!blocker.ownerReady) {
    return `Assign customer-facing blocker owner for ${blocker.blockerId}.`;
  }

  return `Customer-facing blocker ${blocker.blockerId} is ready.`;
}

function summarize(
  rows: readonly RuntimeExecutionReadinessRow[],
  customerBlockers: readonly RuntimeExecutionCustomerBlockerRow[],
): RuntimeExecutionReadinessPacket["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const sourceReadyCount = rows.filter((row) => row.sourceReady).length;
  const status: RuntimeExecutionReadinessStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const scoreTotal = rows.reduce((total, row) => total + row.score, 0);
  const evidenceMissingCount = rows.filter((row) => !row.evidenceLinked).length;
  const readinessScore = normalizeScore(
    scoreTotal / Math.max(1, rows.length) -
      blockedCount * 12 -
      reviewCount * 4 -
      evidenceMissingCount * 8,
  );

  return {
    blockedCount,
    customerBlockerCount: customerBlockers.length,
    customerMessageReadyCount: customerBlockers.filter(
      (blocker) => blocker.customerMessageReady,
    ).length,
    nextAction:
      status === "blocked"
        ? "Resolve blocked runtime execution readiness packet before native runtime fulfillment."
        : status === "review"
          ? "Review runtime execution readiness packet before native runtime fulfillment."
          : "Runtime execution readiness packet is ready for native runtime fulfillment.",
    readinessHash: sha256(rows.map((row) => row.readinessHash)),
    readinessScore,
    readyCount,
    releaseBlocked: rows.some((row) => row.releaseBlocked),
    reviewCount,
    rowCount: rows.length,
    sourceReadyCount,
    status,
  };
}

function createCsv(rows: readonly RuntimeExecutionReadinessRow[]) {
  const header = [
    "gate",
    "status",
    "score",
    "source_ready",
    "evidence_linked",
    "release_blocked",
    "customer_blocker_count",
    "readiness_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.gate,
      row.status,
      row.score,
      row.sourceReady,
      row.evidenceLinked,
      row.releaseBlocked,
      row.customerBlockerCount,
      row.readinessHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return [header.join(","), ...body].join("\n");
}

function reportEvidenceLinked(
  report:
    | ExternalArtifactVerificationCommandRunnerReport
    | NativeCadRuntimeExecutionProbeReport
    | NativeToolchainPrerequisiteDetectorReport
    | undefined,
) {
  return Boolean(
    report?.csvDataUri.startsWith("data:text/csv") &&
      report?.jsonDataUri.startsWith("data:application/json") &&
      report?.files.length >= 2,
  );
}

function normalizeScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasSha256(value: string) {
  return value.startsWith("sha256:");
}

function urlReady(value: string) {
  return value.startsWith("https://") || value.startsWith("data:");
}

function csvCell(value: boolean | number | string) {
  return `"${String(value).replaceAll('"', '""')}"`;
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
