import { createHash } from "node:crypto";
import type { BoardAuditEvidenceAcceptanceWorkflow } from "@/features/projects/board-audit-evidence-acceptance";
import type { BoardAuditEvidenceAttachmentManifest } from "@/features/projects/board-audit-evidence-manifest";
import type { BoardAuditEvidenceReadinessDigest } from "@/features/projects/board-audit-evidence-readiness-digest";
import type { BoardAuditEvidenceVerificationReport } from "@/features/projects/board-audit-evidence-verification";
import type { BoardEvidencePacketLockReport } from "@/features/projects/board-evidence-packet-lock";

export type BoardEvidenceCloseoutSectionId = "acceptance" | "lock" | "manifest" | "readiness" | "verification";
export type BoardEvidenceCloseoutStatus = "blocked" | "ready" | "watch";

export interface BoardEvidenceCloseoutSection {
  fileCount: number;
  id: BoardEvidenceCloseoutSectionId;
  nextAction: string;
  recordCount: number;
  score: number;
  sourceHash: string;
  status: BoardEvidenceCloseoutStatus;
  title: string;
}

export interface BoardEvidenceCloseoutReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  sections: BoardEvidenceCloseoutSection[];
  summary: {
    attachmentFileCount: number;
    auditTrailCount: number;
    blockedSectionCount: number;
    closeoutScore: number;
    nextAction: string;
    readySectionCount: number;
    sectionCount: number;
    status: BoardEvidenceCloseoutStatus;
    verificationCheckCount: number;
    watchSectionCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardEvidenceCloseoutReportInput {
  acceptance: BoardAuditEvidenceAcceptanceWorkflow;
  generatedAt?: string;
  manifest: BoardAuditEvidenceAttachmentManifest;
  packetLock: BoardEvidencePacketLockReport;
  readiness: BoardAuditEvidenceReadinessDigest;
  verification: BoardAuditEvidenceVerificationReport;
  workspaceId?: string;
}

const sectionRank: Record<BoardEvidenceCloseoutStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
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
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
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

function statusFrom(value: string): BoardEvidenceCloseoutStatus {
  return value === "blocked" ? "blocked" : value === "watch" || value === "partial" ? "watch" : "ready";
}

function createSections(input: CreateBoardEvidenceCloseoutReportInput): BoardEvidenceCloseoutSection[] {
  const manifestFileCount = input.manifest.rows.reduce((sum, row) => sum + row.linkedFileCount, 0);
  const verificationCheckCount = input.verification.rows.reduce((sum, row) => sum + row.checks.length, 0);

  const sections: BoardEvidenceCloseoutSection[] = [
    {
      fileCount: manifestFileCount,
      id: "manifest",
      nextAction: input.manifest.summary.nextAction,
      recordCount: input.manifest.summary.taskCount,
      score: input.manifest.summary.manifestScore,
      sourceHash: sha256(input.manifest),
      status: statusFrom(input.manifest.summary.status),
      title: "Attachment manifest",
    },
    {
      fileCount: 1,
      id: "verification",
      nextAction: input.verification.summary.nextAction,
      recordCount: verificationCheckCount,
      score: input.verification.summary.verificationScore,
      sourceHash: sha256(input.verification),
      status: statusFrom(input.verification.summary.status),
      title: "Verification checks",
    },
    {
      fileCount: 1,
      id: "acceptance",
      nextAction: input.acceptance.summary.nextAction,
      recordCount: input.acceptance.summary.auditTrailCount,
      score: input.acceptance.summary.acceptanceScore,
      sourceHash: sha256(input.acceptance),
      status: statusFrom(input.acceptance.summary.status),
      title: "Acceptance audit trail",
    },
    {
      fileCount: 1,
      id: "readiness",
      nextAction: input.readiness.summary.nextAction,
      recordCount: input.readiness.summary.carryForwardCount,
      score: input.readiness.summary.readinessScore,
      sourceHash: sha256(input.readiness),
      status: statusFrom(input.readiness.summary.status),
      title: "Readiness digest",
    },
    {
      fileCount: 1,
      id: "lock",
      nextAction: input.packetLock.summary.nextAction,
      recordCount: input.packetLock.summary.lockedCount,
      score: input.packetLock.summary.lockScore,
      sourceHash: sha256(input.packetLock),
      status: statusFrom(input.packetLock.summary.status),
      title: "Packet lock",
    },
  ];

  return sections.sort((first, second) => sectionRank[first.status] - sectionRank[second.status] || first.id.localeCompare(second.id));
}

function summarize(input: {
  acceptance: BoardAuditEvidenceAcceptanceWorkflow;
  manifest: BoardAuditEvidenceAttachmentManifest;
  sections: BoardEvidenceCloseoutSection[];
  verification: BoardAuditEvidenceVerificationReport;
}): BoardEvidenceCloseoutReport["summary"] {
  const blockedSectionCount = input.sections.filter((section) => section.status === "blocked").length;
  const watchSectionCount = input.sections.filter((section) => section.status === "watch").length;
  const readySectionCount = input.sections.filter((section) => section.status === "ready").length;
  const firstAttention = input.sections.find((section) => section.status !== "ready") ?? null;

  return {
    attachmentFileCount: input.manifest.summary.linkedFileCount,
    auditTrailCount: input.acceptance.summary.auditTrailCount,
    blockedSectionCount,
    closeoutScore: input.sections.length > 0 ? Math.round(input.sections.reduce((sum, section) => sum + section.score, 0) / input.sections.length) : 100,
    nextAction: firstAttention?.nextAction ?? "Board evidence closeout report is ready for export.",
    readySectionCount,
    sectionCount: input.sections.length,
    status: blockedSectionCount > 0 ? "blocked" : watchSectionCount > 0 ? "watch" : "ready",
    verificationCheckCount: input.verification.rows.reduce((sum, row) => sum + row.checks.length, 0),
    watchSectionCount,
  };
}

function createCsv(sections: BoardEvidenceCloseoutSection[]) {
  const header = ["section_id", "status", "score", "records", "files", "source_hash", "next_action"];
  const body = sections.map((section) =>
    [section.id, section.status, section.score, section.recordCount, section.fileCount, section.sourceHash, section.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  acceptance: BoardAuditEvidenceAcceptanceWorkflow;
  generatedAt: string;
  manifest: BoardAuditEvidenceAttachmentManifest;
  packetLock: BoardEvidencePacketLockReport;
  readiness: BoardAuditEvidenceReadinessDigest;
  sections: BoardEvidenceCloseoutSection[];
  summary: BoardEvidenceCloseoutReport["summary"];
  verification: BoardAuditEvidenceVerificationReport;
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      acceptance: {
        auditTrail: input.acceptance.auditTrail,
        summary: input.acceptance.summary,
      },
      generatedAt: input.generatedAt,
      manifest: {
        rows: input.manifest.rows,
        summary: input.manifest.summary,
      },
      packetLock: {
        rows: input.packetLock.rows,
        summary: input.packetLock.summary,
      },
      readiness: {
        recommendations: input.readiness.recommendations,
        risks: input.readiness.risks,
        summary: input.readiness.summary,
        trend: input.readiness.trend,
      },
      sections: input.sections,
      summary: input.summary,
      verification: {
        rows: input.verification.rows,
        summary: input.verification.summary,
      },
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardEvidenceCloseoutReport(input: CreateBoardEvidenceCloseoutReportInput): BoardEvidenceCloseoutReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.readiness.workspaceId;
  const sections = createSections(input);
  const summary = summarize({
    acceptance: input.acceptance,
    manifest: input.manifest,
    sections,
    verification: input.verification,
  });
  const csvContent = createCsv(sections);
  const jsonContent = createJson({
    acceptance: input.acceptance,
    generatedAt,
    manifest: input.manifest,
    packetLock: input.packetLock,
    readiness: input.readiness,
    sections,
    summary,
    verification: input.verification,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-evidence-closeout-report-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    sections,
    summary,
    workspaceId,
  };
}
