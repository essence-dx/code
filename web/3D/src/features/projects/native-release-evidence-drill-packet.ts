import { createHash } from "node:crypto";
import type { CadConversionFixtureDrillRunnerReport } from "@/features/projects/cad-conversion-fixture-drill-runner";
import type { ReleaseEvidenceDrillComparisonReport } from "@/features/projects/release-evidence-drill-comparison";
import type { SignedArtifactFixtureDrillRunnerReport } from "@/features/projects/signed-artifact-fixture-drill-runner";

export type NativeReleaseEvidenceDrillGate = "cad-conversion-drill" | "comparison-regression" | "signed-artifact-drill";
export type NativeReleaseEvidenceDrillPacketStatus = "blocked" | "ready" | "review";
export type NativeReleaseEvidenceDrillGoNoGoDecision = "go" | "no-go" | "review";
export type NativeReleaseEvidenceDrillPacketFileFormat = "csv" | "json";

export interface NativeReleaseEvidenceDrillPacketRow {
  evidenceHash: string;
  evidenceReady: boolean;
  gate: NativeReleaseEvidenceDrillGate;
  nextAction: string;
  packetHash: string;
  releaseApprovalReady: boolean;
  score: number;
  status: NativeReleaseEvidenceDrillPacketStatus;
}

export interface NativeReleaseEvidenceDrillPacketFile {
  download: string;
  format: NativeReleaseEvidenceDrillPacketFileFormat;
  href: string;
  label: string;
}

export interface NativeReleaseEvidenceDrillPacket {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeReleaseEvidenceDrillPacketFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  operatorOwner: string;
  releaseCandidateId: string;
  rows: NativeReleaseEvidenceDrillPacketRow[];
  summary: {
    blockedCount: number;
    goNoGoDecision: NativeReleaseEvidenceDrillGoNoGoDecision;
    nextAction: string;
    operatorReady: boolean;
    packetHash: string;
    packetScore: number;
    readyCount: number;
    releaseApprovalBlocked: boolean;
    reviewCount: number;
    rowCount: number;
    status: NativeReleaseEvidenceDrillPacketStatus;
  };
  workspaceId: string;
}

export interface CreateNativeReleaseEvidenceDrillPacketInput {
  cadFixtureDrill: CadConversionFixtureDrillRunnerReport;
  comparison: ReleaseEvidenceDrillComparisonReport;
  generatedAt?: string;
  operatorOwner?: string;
  releaseCandidateId: string;
  signedArtifactDrill: SignedArtifactFixtureDrillRunnerReport;
  workspaceId?: string;
}

const gateRank: Record<NativeReleaseEvidenceDrillGate, number> = {
  "signed-artifact-drill": 0,
  "cad-conversion-drill": 1,
  "comparison-regression": 2,
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

function normalizeScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function statusFor(input: {
  evidenceReady: boolean;
  inputStatus: NativeReleaseEvidenceDrillPacketStatus;
  releaseApprovalReady: boolean;
  score: number;
}) {
  if (!input.evidenceReady || !input.releaseApprovalReady || input.inputStatus === "blocked" || input.score < 60) {
    return "blocked" satisfies NativeReleaseEvidenceDrillPacketStatus;
  }

  if (input.inputStatus === "review" || input.score < 90) {
    return "review" satisfies NativeReleaseEvidenceDrillPacketStatus;
  }

  return "ready" satisfies NativeReleaseEvidenceDrillPacketStatus;
}

function nextActionFor(row: Pick<NativeReleaseEvidenceDrillPacketRow, "evidenceReady" | "gate" | "releaseApprovalReady" | "score" | "status">) {
  if (row.status === "blocked") {
    return `Resolve blocked native release evidence drill packet for ${row.gate}.`;
  }

  if (!row.evidenceReady) {
    return `Attach native release drill evidence for ${row.gate}.`;
  }

  if (!row.releaseApprovalReady) {
    return `Hold release approval until ${row.gate} has no blocked regressions.`;
  }

  if (row.score < 90) {
    return `Review native release drill score for ${row.gate}.`;
  }

  if (row.gate === "comparison-regression") {
    return "Release evidence drill comparison evidence is ready for go/no-go approval.";
  }

  return `Native release evidence drill packet is ready for ${row.gate}.`;
}

function createRow(input: {
  evidenceHash: string;
  evidenceReady: boolean;
  gate: NativeReleaseEvidenceDrillGate;
  inputStatus: NativeReleaseEvidenceDrillPacketStatus;
  releaseApprovalReady: boolean;
  score: number;
}): NativeReleaseEvidenceDrillPacketRow {
  const score = normalizeScore(input.score);
  const status = statusFor({
    evidenceReady: input.evidenceReady,
    inputStatus: input.inputStatus,
    releaseApprovalReady: input.releaseApprovalReady,
    score,
  });
  const rowWithoutHash = {
    evidenceHash: input.evidenceHash,
    evidenceReady: input.evidenceReady,
    gate: input.gate,
    nextAction: "",
    releaseApprovalReady: input.releaseApprovalReady,
    score,
    status,
  } satisfies Omit<NativeReleaseEvidenceDrillPacketRow, "packetHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    packetHash: sha256(row),
  };
}

function createRows(input: CreateNativeReleaseEvidenceDrillPacketInput) {
  return [
    createRow({
      evidenceHash: input.signedArtifactDrill.summary.drillHash,
      evidenceReady: input.signedArtifactDrill.summary.status !== "blocked" && input.signedArtifactDrill.summary.drillScore >= 60,
      gate: "signed-artifact-drill",
      inputStatus: input.signedArtifactDrill.summary.status,
      releaseApprovalReady: input.signedArtifactDrill.summary.status === "ready",
      score: input.signedArtifactDrill.summary.drillScore,
    }),
    createRow({
      evidenceHash: input.cadFixtureDrill.summary.drillHash,
      evidenceReady: input.cadFixtureDrill.summary.status !== "blocked" && input.cadFixtureDrill.summary.drillScore >= 60,
      gate: "cad-conversion-drill",
      inputStatus: input.cadFixtureDrill.summary.status,
      releaseApprovalReady: input.cadFixtureDrill.summary.status === "ready",
      score: input.cadFixtureDrill.summary.drillScore,
    }),
    createRow({
      evidenceHash: input.comparison.summary.comparisonHash,
      evidenceReady: input.comparison.summary.status !== "blocked" && input.comparison.summary.comparisonScore >= 60,
      gate: "comparison-regression",
      inputStatus: input.comparison.summary.status,
      releaseApprovalReady: input.comparison.summary.status === "ready" && input.comparison.summary.regressionCount === 0,
      score: input.comparison.summary.comparisonScore,
    }),
  ].sort((first, second) => gateRank[first.gate] - gateRank[second.gate]);
}

function summarize(input: {
  operatorReady: boolean;
  rows: NativeReleaseEvidenceDrillPacketRow[];
}): NativeReleaseEvidenceDrillPacket["summary"] {
  const blockedCount = input.rows.filter((row) => row.status === "blocked").length;
  const readyCount = input.rows.filter((row) => row.status === "ready").length;
  const reviewCount = input.rows.filter((row) => row.status === "review").length;
  const status: NativeReleaseEvidenceDrillPacketStatus = blockedCount > 0 || !input.operatorReady ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const averageScore = input.rows.reduce((sum, row) => sum + row.score, 0) / Math.max(1, input.rows.length);
  const packetScore = Math.max(0, Math.min(100, Math.round(averageScore + reviewCount * 4 - blockedCount * 18 - (input.operatorReady ? 0 : 12))));
  const goNoGoDecision: NativeReleaseEvidenceDrillGoNoGoDecision = status === "blocked" ? "no-go" : status === "review" ? "review" : "go";

  return {
    blockedCount,
    goNoGoDecision,
    nextAction:
      status === "blocked"
        ? "Resolve blocked native release evidence drill packet before go/no-go approval."
        : status === "review"
          ? "Review native release evidence drill packet before go/no-go approval."
          : "Native release evidence drill packet is ready for go/no-go approval.",
    operatorReady: input.operatorReady,
    packetHash: sha256(input.rows.map((row) => row.packetHash)),
    packetScore,
    readyCount,
    releaseApprovalBlocked: status === "blocked",
    reviewCount,
    rowCount: input.rows.length,
    status,
  };
}

function createCsv(rows: NativeReleaseEvidenceDrillPacketRow[]) {
  const header = ["gate", "status", "score", "evidence_ready", "release_approval_ready", "evidence_hash", "packet_hash", "next_action"];
  const body = rows.map((row) =>
    [row.gate, row.status, row.score, row.evidenceReady, row.releaseApprovalReady, row.evidenceHash, row.packetHash, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: {
  csvDataUri: string;
  csvFileName: string;
  jsonDataUri: string;
  jsonFileName: string;
}): NativeReleaseEvidenceDrillPacketFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV packet",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON packet",
    },
  ];
}

export function createNativeReleaseEvidenceDrillPacket(input: CreateNativeReleaseEvidenceDrillPacketInput): NativeReleaseEvidenceDrillPacket {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.signedArtifactDrill.workspaceId ?? input.cadFixtureDrill.workspaceId ?? input.comparison.workspaceId;
  const operatorOwner = input.operatorOwner?.trim() ?? "";
  const rows = createRows(input);
  const summary = summarize({
    operatorReady: operatorOwner.length > 0,
    rows,
  });
  const csvContent = createCsv(rows);
  const jsonContent = `${JSON.stringify(
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
  )}\n`;
  const fileBase = `${slug(workspaceId)}-native-release-evidence-drill-packet-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
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
    operatorOwner,
    releaseCandidateId: input.releaseCandidateId,
    rows,
    summary,
    workspaceId,
  };
}
