import { createHash } from "node:crypto";

import type { CadRuntimeAttachmentRehearsalPacket } from "@/features/projects/cad-runtime-attachment-rehearsal-packet";
import type { NativeReleaseEvidenceDrillPacket } from "@/features/projects/native-release-evidence-drill-packet";
import type { SignedArtifactAttachmentRehearsalPacket } from "@/features/projects/signed-artifact-attachment-rehearsal-packet";

export type AttachmentReadinessDiffArea =
  | "accepted-release-drill"
  | "cad-runtime-attachments"
  | "signed-artifact-attachments";

export type AttachmentReadinessDiffStatus = "blocked" | "ready" | "review";
export type AttachmentReadinessDiffFileFormat = "csv" | "json";

export interface AttachmentReadinessDiffReportInput {
  readonly acceptedDrillPacket: NativeReleaseEvidenceDrillPacket;
  readonly cadRuntimeAttachments: CadRuntimeAttachmentRehearsalPacket;
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly signedArtifactAttachments: SignedArtifactAttachmentRehearsalPacket;
  readonly workspaceId?: string;
}

export interface AttachmentReadinessDiffRow {
  readonly acceptedEvidenceHash: string;
  readonly acceptedEvidenceReady: boolean;
  readonly area: AttachmentReadinessDiffArea;
  readonly currentEvidenceHash: string;
  readonly currentEvidenceReady: boolean;
  readonly diffHash: string;
  readonly missingArtifactEvidence: boolean;
  readonly missingCadEvidence: boolean;
  readonly nextAction: string;
  readonly score: number;
  readonly status: AttachmentReadinessDiffStatus;
}

export interface AttachmentReadinessDiffSummary {
  readonly acceptedDrillReady: boolean;
  readonly blockedCount: number;
  readonly diffHash: string;
  readonly diffScore: number;
  readonly missingArtifactEvidenceCount: number;
  readonly missingCadEvidenceCount: number;
  readonly nextAction: string;
  readonly readyCount: number;
  readonly reviewCount: number;
  readonly rowCount: number;
  readonly status: AttachmentReadinessDiffStatus;
}

export interface AttachmentReadinessDiffFile {
  readonly download: string;
  readonly format: AttachmentReadinessDiffFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface AttachmentReadinessDiffReport {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: AttachmentReadinessDiffFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: AttachmentReadinessDiffRow[];
  readonly summary: AttachmentReadinessDiffSummary;
  readonly workspaceId: string;
}

const areaRank: Record<AttachmentReadinessDiffArea, number> = {
  "signed-artifact-attachments": 0,
  "cad-runtime-attachments": 1,
  "accepted-release-drill": 2,
};

export function createAttachmentReadinessDiffReport(
  input: AttachmentReadinessDiffReportInput,
): AttachmentReadinessDiffReport {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? input.signedArtifactAttachments.workspaceId;
  const rows = createRows(input).sort(
    (first, second) => areaRank[first.area] - areaRank[second.area],
  );
  const summary = createSummary(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      acceptedDrillPacketHash: input.acceptedDrillPacket.summary.packetHash,
      generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const baseFileName = `${slug(workspaceId)}-attachment-readiness-diff-report-${slug(
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
        label: "Attachment readiness diff CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Attachment readiness diff JSON",
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
  input: AttachmentReadinessDiffReportInput,
): AttachmentReadinessDiffRow[] {
  const acceptedSignedArtifact = input.acceptedDrillPacket.rows.find(
    (row) => row.gate === "signed-artifact-drill",
  );
  const acceptedCad = input.acceptedDrillPacket.rows.find(
    (row) => row.gate === "cad-conversion-drill",
  );
  const signedArtifactReady =
    input.signedArtifactAttachments.summary.status === "ready";
  const cadReady = input.cadRuntimeAttachments.summary.status === "ready";
  const acceptedReady =
    input.acceptedDrillPacket.summary.status === "ready" &&
    !input.acceptedDrillPacket.summary.releaseApprovalBlocked;

  return [
    createRow({
      acceptedEvidenceHash: acceptedSignedArtifact?.evidenceHash ?? "missing",
      acceptedEvidenceReady:
        acceptedSignedArtifact?.evidenceReady === true &&
        acceptedSignedArtifact.releaseApprovalReady,
      area: "signed-artifact-attachments",
      currentEvidenceHash:
        input.signedArtifactAttachments.summary.rehearsalHash,
      currentEvidenceReady: signedArtifactReady,
      missingArtifactEvidence: !signedArtifactReady,
      missingCadEvidence: false,
      score: input.signedArtifactAttachments.summary.rehearsalScore,
    }),
    createRow({
      acceptedEvidenceHash: acceptedCad?.evidenceHash ?? "missing",
      acceptedEvidenceReady:
        acceptedCad?.evidenceReady === true && acceptedCad.releaseApprovalReady,
      area: "cad-runtime-attachments",
      currentEvidenceHash: input.cadRuntimeAttachments.summary.rehearsalHash,
      currentEvidenceReady: cadReady,
      missingArtifactEvidence: false,
      missingCadEvidence: !cadReady,
      score: input.cadRuntimeAttachments.summary.rehearsalScore,
    }),
    createRow({
      acceptedEvidenceHash: input.acceptedDrillPacket.summary.packetHash,
      acceptedEvidenceReady: acceptedReady,
      area: "accepted-release-drill",
      currentEvidenceHash: input.acceptedDrillPacket.summary.packetHash,
      currentEvidenceReady: acceptedReady,
      missingArtifactEvidence: false,
      missingCadEvidence: false,
      score: input.acceptedDrillPacket.summary.packetScore,
    }),
  ];
}

function createRow(
  input: Omit<AttachmentReadinessDiffRow, "diffHash" | "nextAction" | "status">,
): AttachmentReadinessDiffRow {
  const status = statusFor(input);
  const rowWithoutHash = {
    ...input,
    nextAction: nextActionFor({ ...input, status }),
    status,
  };

  return {
    ...rowWithoutHash,
    diffHash: sha256(rowWithoutHash),
  };
}

function statusFor(
  row: Omit<AttachmentReadinessDiffRow, "diffHash" | "nextAction" | "status">,
): AttachmentReadinessDiffStatus {
  if (
    row.missingArtifactEvidence ||
    row.missingCadEvidence ||
    !row.currentEvidenceReady ||
    !row.acceptedEvidenceReady ||
    row.score < 60
  ) {
    return "blocked";
  }

  if (row.score < 90) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Omit<AttachmentReadinessDiffRow, "diffHash" | "nextAction">,
) {
  if (row.missingArtifactEvidence) {
    return "Attach missing signed artifact release evidence before native release approval.";
  }

  if (row.missingCadEvidence) {
    return "Attach missing CAD runtime release evidence before native release approval.";
  }

  if (!row.acceptedEvidenceReady) {
    return `Refresh accepted native release drill evidence for ${row.area}.`;
  }

  if (row.status === "review") {
    return `Review attachment readiness hash difference for ${row.area}.`;
  }

  return `Attachment readiness diff is ready for ${row.area}.`;
}

function createSummary(
  rows: readonly AttachmentReadinessDiffRow[],
): AttachmentReadinessDiffSummary {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const missingArtifactEvidenceCount = rows.filter(
    (row) => row.missingArtifactEvidence,
  ).length;
  const missingCadEvidenceCount = rows.filter(
    (row) => row.missingCadEvidence,
  ).length;
  const status: AttachmentReadinessDiffStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const averageScore =
    rows.reduce((sum, row) => sum + row.score, 0) / Math.max(1, rows.length);
  const diffScore = Math.max(
    0,
    Math.min(100, Math.round(averageScore - blockedCount * 18 - reviewCount * 6)),
  );

  return {
    acceptedDrillReady:
      rows.find((row) => row.area === "accepted-release-drill")?.status ===
      "ready",
    blockedCount,
    diffHash: sha256(rows.map((row) => row.diffHash)),
    diffScore,
    missingArtifactEvidenceCount,
    missingCadEvidenceCount,
    nextAction:
      status === "blocked"
        ? "Resolve missing attachment evidence before native release approval."
        : status === "review"
          ? "Review attachment readiness differences before native release approval."
          : "Attachment readiness diff is ready for native release approval.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: readonly AttachmentReadinessDiffRow[]) {
  const header = [
    "area",
    "status",
    "current_evidence_ready",
    "accepted_evidence_ready",
    "missing_artifact_evidence",
    "missing_cad_evidence",
    "current_evidence_hash",
    "accepted_evidence_hash",
    "diff_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.area,
    row.status,
    String(row.currentEvidenceReady),
    String(row.acceptedEvidenceReady),
    String(row.missingArtifactEvidence),
    String(row.missingCadEvidence),
    row.currentEvidenceHash,
    row.acceptedEvidenceHash,
    row.diffHash,
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
