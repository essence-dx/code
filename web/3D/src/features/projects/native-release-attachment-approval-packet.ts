import { createHash } from "node:crypto";

import type { AttachmentReadinessDiffReport } from "@/features/projects/attachment-readiness-diff-report";
import type { CadRuntimeAttachmentRehearsalPacket } from "@/features/projects/cad-runtime-attachment-rehearsal-packet";
import type { SignedArtifactAttachmentRehearsalPacket } from "@/features/projects/signed-artifact-attachment-rehearsal-packet";

export type NativeReleaseAttachmentApprovalGate =
  | "attachment-readiness-diff"
  | "cad-runtime-attachments"
  | "signed-artifact-attachments";

export type NativeReleaseAttachmentApprovalStatus =
  | "blocked"
  | "ready"
  | "review";

export type NativeReleaseAttachmentGoNoGoDecision = "go" | "no-go" | "review";
export type NativeReleaseAttachmentApprovalFileFormat = "csv" | "json";

export interface NativeReleaseAttachmentApprovalRow {
  readonly approvalHash: string;
  readonly evidenceHash: string;
  readonly evidenceLinked: boolean;
  readonly gate: NativeReleaseAttachmentApprovalGate;
  readonly nextAction: string;
  readonly releaseApprovalReady: boolean;
  readonly score: number;
  readonly status: NativeReleaseAttachmentApprovalStatus;
}

export interface NativeReleaseAttachmentApprovalSummary {
  readonly approvalHash: string;
  readonly approvalScore: number;
  readonly blockedCount: number;
  readonly goNoGoDecision: NativeReleaseAttachmentGoNoGoDecision;
  readonly nextAction: string;
  readonly operatorReady: boolean;
  readonly readyCount: number;
  readonly reviewCount: number;
  readonly rowCount: number;
  readonly status: NativeReleaseAttachmentApprovalStatus;
}

export interface NativeReleaseAttachmentApprovalFile {
  readonly download: string;
  readonly format: NativeReleaseAttachmentApprovalFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface NativeReleaseAttachmentApprovalPacket {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: NativeReleaseAttachmentApprovalFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly operatorOwner: string;
  readonly releaseCandidateId: string;
  readonly rows: NativeReleaseAttachmentApprovalRow[];
  readonly summary: NativeReleaseAttachmentApprovalSummary;
  readonly workspaceId: string;
}

export interface NativeReleaseAttachmentApprovalPacketInput {
  readonly cadRuntimeAttachments: CadRuntimeAttachmentRehearsalPacket;
  readonly generatedAt?: string;
  readonly operatorOwner?: string;
  readonly readinessDiff: AttachmentReadinessDiffReport;
  readonly releaseCandidateId: string;
  readonly signedArtifactAttachments: SignedArtifactAttachmentRehearsalPacket;
  readonly workspaceId?: string;
}

const gateRank: Record<NativeReleaseAttachmentApprovalGate, number> = {
  "signed-artifact-attachments": 0,
  "cad-runtime-attachments": 1,
  "attachment-readiness-diff": 2,
};

export function createNativeReleaseAttachmentApprovalPacket(
  input: NativeReleaseAttachmentApprovalPacketInput,
): NativeReleaseAttachmentApprovalPacket {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const operatorOwner = input.operatorOwner?.trim() ?? "";
  const workspaceId = input.workspaceId ?? input.signedArtifactAttachments.workspaceId;
  const operatorReady = operatorOwner.length > 0;
  const rows = [
    createRow({
      evidenceHash: input.signedArtifactAttachments.summary.rehearsalHash,
      evidenceLinked: input.signedArtifactAttachments.summary.status === "ready",
      gate: "signed-artifact-attachments",
      releaseApprovalReady:
        input.signedArtifactAttachments.summary.status === "ready",
      score: input.signedArtifactAttachments.summary.rehearsalScore,
    }),
    createRow({
      evidenceHash: input.cadRuntimeAttachments.summary.rehearsalHash,
      evidenceLinked: input.cadRuntimeAttachments.summary.status === "ready",
      gate: "cad-runtime-attachments",
      releaseApprovalReady: input.cadRuntimeAttachments.summary.status === "ready",
      score: input.cadRuntimeAttachments.summary.rehearsalScore,
    }),
    createRow({
      evidenceHash: input.readinessDiff.summary.diffHash,
      evidenceLinked: input.readinessDiff.summary.status === "ready",
      gate: "attachment-readiness-diff",
      releaseApprovalReady: input.readinessDiff.summary.status === "ready",
      score: input.readinessDiff.summary.diffScore,
    }),
  ].sort((first, second) => gateRank[first.gate] - gateRank[second.gate]);
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
  const baseFileName = `${slug(workspaceId)}-native-release-attachment-approval-packet-${slug(
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
        label: "Native release attachment approval CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Native release attachment approval JSON",
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
  input: Omit<NativeReleaseAttachmentApprovalRow, "approvalHash" | "nextAction" | "status">,
): NativeReleaseAttachmentApprovalRow {
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
}): NativeReleaseAttachmentApprovalStatus {
  if (!input.evidenceLinked || !input.releaseApprovalReady || input.score < 60) {
    return "blocked";
  }

  if (input.score < 90) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Omit<NativeReleaseAttachmentApprovalRow, "approvalHash">,
) {
  if (row.status === "blocked") {
    return `Resolve blocked native release attachment evidence for ${row.gate}.`;
  }

  if (row.status === "review") {
    return `Review native release attachment evidence for ${row.gate}.`;
  }

  return `Native release attachment evidence is ready for operator approval for ${row.gate}.`;
}

function createSummary(input: {
  readonly operatorReady: boolean;
  readonly rows: readonly NativeReleaseAttachmentApprovalRow[];
}): NativeReleaseAttachmentApprovalSummary {
  const blockedCount = input.rows.filter((row) => row.status === "blocked").length;
  const readyCount = input.rows.filter((row) => row.status === "ready").length;
  const reviewCount = input.rows.filter((row) => row.status === "review").length;
  const status: NativeReleaseAttachmentApprovalStatus =
    blockedCount > 0 || !input.operatorReady
      ? "blocked"
      : reviewCount > 0
        ? "review"
        : "ready";
  const averageScore =
    input.rows.reduce((sum, row) => sum + row.score, 0) /
    Math.max(1, input.rows.length);
  const approvalScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        averageScore - blockedCount * 18 - reviewCount * 6 - (input.operatorReady ? 0 : 12),
      ),
    ),
  );
  const goNoGoDecision: NativeReleaseAttachmentGoNoGoDecision =
    status === "blocked" ? "no-go" : status === "review" ? "review" : "go";

  return {
    approvalHash: sha256(input.rows.map((row) => row.approvalHash)),
    approvalScore,
    blockedCount,
    goNoGoDecision,
    nextAction:
      status === "blocked"
        ? "Resolve blocked native release attachment approval packet before release approval."
        : status === "review"
          ? "Review native release attachment approval packet before release approval."
          : "Native release attachment approval packet is ready for release approval.",
    operatorReady: input.operatorReady,
    readyCount,
    reviewCount,
    rowCount: input.rows.length,
    status,
  };
}

function createCsv(rows: readonly NativeReleaseAttachmentApprovalRow[]) {
  const header = [
    "gate",
    "status",
    "score",
    "evidence_linked",
    "release_approval_ready",
    "approval_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.gate,
    row.status,
    String(row.score),
    String(row.evidenceLinked),
    String(row.releaseApprovalReady),
    row.approvalHash,
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
