import { createHash } from "node:crypto";

import type { AttachmentCustodyDriftMonitor } from "@/features/projects/attachment-custody-drift-monitor";
import type { CadRuntimeCustodyLedger } from "@/features/projects/cad-runtime-custody-ledger";
import type { SignedArtifactCustodyLedger } from "@/features/projects/signed-artifact-custody-ledger";

export type NativeReleaseCustodyApprovalArea =
  | "attachment-custody-drift"
  | "cad-runtime-custody"
  | "signed-artifact-custody";
export type NativeReleaseCustodyApprovalStatus =
  | "blocked"
  | "ready"
  | "review";
export type NativeReleaseCustodyGoNoGoDecision = "go" | "no-go" | "review";
export type NativeReleaseCustodyApprovalFileFormat = "csv" | "json";

export interface NativeReleaseCustodyApprovalPacketInput {
  readonly cadRuntimeCustody: CadRuntimeCustodyLedger;
  readonly custodyDrift: AttachmentCustodyDriftMonitor;
  readonly generatedAt?: string;
  readonly operatorOwner?: string;
  readonly releaseCandidateId: string;
  readonly signedArtifactCustody: SignedArtifactCustodyLedger;
  readonly workspaceId?: string;
}

export interface NativeReleaseCustodyApprovalRow {
  readonly approvalHash: string;
  readonly area: NativeReleaseCustodyApprovalArea;
  readonly evidenceHash: string;
  readonly evidenceLinked: boolean;
  readonly nextAction: string;
  readonly releaseApprovalReady: boolean;
  readonly score: number;
  readonly status: NativeReleaseCustodyApprovalStatus;
}

export interface NativeReleaseCustodyApprovalFile {
  readonly download: string;
  readonly format: NativeReleaseCustodyApprovalFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface NativeReleaseCustodyApprovalPacket {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: NativeReleaseCustodyApprovalFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly operatorOwner: string;
  readonly releaseCandidateId: string;
  readonly rows: NativeReleaseCustodyApprovalRow[];
  readonly summary: {
    readonly approvalScore: number;
    readonly blockedCount: number;
    readonly custodyApprovalHash: string;
    readonly evidenceReadyCount: number;
    readonly goNoGoDecision: NativeReleaseCustodyGoNoGoDecision;
    readonly nextAction: string;
    readonly operatorReady: boolean;
    readonly readyCount: number;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: NativeReleaseCustodyApprovalStatus;
  };
  readonly workspaceId: string;
}

const areaRank: Record<NativeReleaseCustodyApprovalArea, number> = {
  "signed-artifact-custody": 0,
  "cad-runtime-custody": 1,
  "attachment-custody-drift": 2,
};

export function createNativeReleaseCustodyApprovalPacket(
  input: NativeReleaseCustodyApprovalPacketInput,
): NativeReleaseCustodyApprovalPacket {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const operatorOwner = input.operatorOwner?.trim() ?? "";
  const operatorReady = operatorOwner.length > 0;
  const workspaceId = input.workspaceId ?? input.signedArtifactCustody.workspaceId;
  const rows = [
    createRow({
      area: "signed-artifact-custody",
      evidenceHash: input.signedArtifactCustody.summary.ledgerHash,
      evidenceLinked: input.signedArtifactCustody.summary.status === "ready",
      releaseApprovalReady:
        input.signedArtifactCustody.summary.status === "ready",
      score: input.signedArtifactCustody.summary.custodyScore,
    }),
    createRow({
      area: "cad-runtime-custody",
      evidenceHash: input.cadRuntimeCustody.summary.ledgerHash,
      evidenceLinked: input.cadRuntimeCustody.summary.status === "ready",
      releaseApprovalReady: input.cadRuntimeCustody.summary.status === "ready",
      score: input.cadRuntimeCustody.summary.custodyScore,
    }),
    createRow({
      area: "attachment-custody-drift",
      evidenceHash: input.custodyDrift.summary.driftHash,
      evidenceLinked: input.custodyDrift.summary.status === "ready",
      releaseApprovalReady: input.custodyDrift.summary.status === "ready",
      score: input.custodyDrift.summary.driftScore,
    }),
  ].sort((first, second) => areaRank[first.area] - areaRank[second.area]);
  const summary = createSummary({ operatorReady, rows });
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
  const baseFileName = `${slug(workspaceId)}-native-release-custody-approval-packet-${slug(
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
        label: "Native release custody approval CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Native release custody approval JSON",
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

function createRow(
  input: Omit<NativeReleaseCustodyApprovalRow, "approvalHash" | "nextAction" | "status">,
): NativeReleaseCustodyApprovalRow {
  const score = normalizeScore(input.score);
  const status = statusFor({
    evidenceLinked: input.evidenceLinked,
    releaseApprovalReady: input.releaseApprovalReady,
    score,
  });
  const rowWithoutHash = {
    ...input,
    nextAction: "",
    score,
    status,
  };
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    approvalHash: sha256(row),
  };
}

function statusFor(input: {
  readonly evidenceLinked: boolean;
  readonly releaseApprovalReady: boolean;
  readonly score: number;
}): NativeReleaseCustodyApprovalStatus {
  if (!input.evidenceLinked || !input.releaseApprovalReady || input.score < 60) {
    return "blocked";
  }

  if (input.score < 90) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Omit<NativeReleaseCustodyApprovalRow, "approvalHash">,
) {
  if (row.status === "blocked") {
    return `Resolve blocked native release custody evidence for ${row.area}.`;
  }

  if (row.status === "review") {
    return `Review native release custody evidence for ${row.area}.`;
  }

  return `Native release custody evidence is ready for operator approval for ${row.area}.`;
}

function createSummary(input: {
  readonly operatorReady: boolean;
  readonly rows: readonly NativeReleaseCustodyApprovalRow[];
}): NativeReleaseCustodyApprovalPacket["summary"] {
  const blockedCount = input.rows.filter((row) => row.status === "blocked").length;
  const readyCount = input.rows.filter((row) => row.status === "ready").length;
  const reviewCount = input.rows.filter((row) => row.status === "review").length;
  const evidenceReadyCount = input.rows.filter(
    (row) => row.evidenceLinked && row.releaseApprovalReady,
  ).length;
  const rowCount = input.rows.length;
  const approvalScore = Math.round(
    input.rows.reduce((total, row) => total + row.score, 0) / rowCount,
  );
  const status: NativeReleaseCustodyApprovalStatus =
    !input.operatorReady || blockedCount > 0
      ? "blocked"
      : reviewCount > 0
        ? "review"
        : "ready";
  const goNoGoDecision: NativeReleaseCustodyGoNoGoDecision =
    status === "blocked" ? "no-go" : status === "review" ? "review" : "go";

  return {
    approvalScore: status === "blocked" ? Math.min(approvalScore, 60) : approvalScore,
    blockedCount: input.operatorReady ? blockedCount : blockedCount + 1,
    custodyApprovalHash: sha256(input.rows.map((row) => row.approvalHash)),
    evidenceReadyCount,
    goNoGoDecision,
    nextAction:
      status === "blocked"
        ? "Resolve blocked native release custody approval packet before release approval."
        : status === "review"
          ? "Review native release custody approval packet before release approval."
          : "Native release custody approval packet is ready for release approval.",
    operatorReady: input.operatorReady,
    readyCount,
    reviewCount,
    rowCount,
    status,
  };
}

function createCsv(rows: readonly NativeReleaseCustodyApprovalRow[]) {
  const header = [
    "area",
    "status",
    "evidence_linked",
    "release_approval_ready",
    "score",
    "evidence_hash",
    "approval_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.area,
    row.status,
    String(row.evidenceLinked),
    String(row.releaseApprovalReady),
    String(row.score),
    row.evidenceHash,
    row.approvalHash,
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
