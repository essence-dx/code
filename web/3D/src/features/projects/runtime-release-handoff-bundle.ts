import { createHash } from "node:crypto";
import type { RuntimeReleaseApprovalChecklist } from "@/features/projects/runtime-release-approval-checklist";
import type { RuntimeReleaseCandidateComparison } from "@/features/projects/runtime-release-candidate-comparison";
import type { RuntimeReleaseOperatorQueue } from "@/features/projects/runtime-release-operator-queue";

export type RuntimeReleaseHandoffBundleStatus = "blocked" | "ready";
export type RuntimeReleaseHandoffBundleFormat = "csv" | "json" | "markdown";
export type RuntimeReleaseHandoffBundleSectionId = "approval-checklist" | "candidate-comparison" | "operator-queue";

export interface RuntimeReleaseHandoffBundleSection {
  evidenceHash: string;
  id: RuntimeReleaseHandoffBundleSectionId;
  label: string;
  nextAction: string;
  score: number;
  status: RuntimeReleaseHandoffBundleStatus;
}

export interface RuntimeReleaseHandoffBundleFile {
  download: string;
  format: RuntimeReleaseHandoffBundleFormat;
  href: string;
  label: string;
}

export interface RuntimeReleaseHandoffBundle {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: RuntimeReleaseHandoffBundleFile[];
  generatedAt: string;
  handoffAudience: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  markdownContent: string;
  markdownDataUri: string;
  markdownFileName: string;
  sections: RuntimeReleaseHandoffBundleSection[];
  summary: {
    blockedSectionCount: number;
    bundleHash: string;
    bundleScore: number;
    nextAction: string;
    releaseCandidateId: string;
    reviewerEmailRedacted: string | null;
    reviewerName: string;
    sectionCount: number;
    status: RuntimeReleaseHandoffBundleStatus;
  };
  workspaceId: string;
}

export interface CreateRuntimeReleaseHandoffBundleInput {
  approvalChecklist: RuntimeReleaseApprovalChecklist;
  candidateComparison: RuntimeReleaseCandidateComparison;
  generatedAt?: string;
  handoffAudience?: string;
  operatorQueue: RuntimeReleaseOperatorQueue;
  workspaceId?: string;
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
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex")}`;
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

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeDataUri(mimeType: string, content: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
}

function normalizeStatus(status: string): RuntimeReleaseHandoffBundleStatus {
  return status === "ready" || status === "approved" ? "ready" : "blocked";
}

function redactEmail(email: string | null | undefined) {
  if (!email) {
    return null;
  }

  const [name, domain] = email.split("@");

  if (!name || !domain) {
    return "***";
  }

  return `${name.slice(0, 2)}***@${domain}`;
}

function createSections(input: CreateRuntimeReleaseHandoffBundleInput): RuntimeReleaseHandoffBundleSection[] {
  return [
    {
      evidenceHash: input.approvalChecklist.summary.approvalHash,
      id: "approval-checklist",
      label: "Approval checklist",
      nextAction: input.approvalChecklist.summary.nextAction,
      score: input.approvalChecklist.summary.approvalScore,
      status: normalizeStatus(input.approvalChecklist.summary.status),
    },
    {
      evidenceHash: input.operatorQueue.summary.queueHash,
      id: "operator-queue",
      label: "Operator queue",
      nextAction: input.operatorQueue.summary.nextAction,
      score: input.operatorQueue.summary.queueScore,
      status: normalizeStatus(input.operatorQueue.summary.status),
    },
    {
      evidenceHash: input.candidateComparison.summary.comparisonHash,
      id: "candidate-comparison",
      label: "Candidate comparison",
      nextAction: input.candidateComparison.summary.nextAction,
      score: input.candidateComparison.summary.comparisonScore,
      status: normalizeStatus(input.candidateComparison.summary.status),
    },
  ];
}

function summarize(input: {
  approvalChecklist: RuntimeReleaseApprovalChecklist;
  candidateComparison: RuntimeReleaseCandidateComparison;
  handoffAudience: string;
  operatorQueue: RuntimeReleaseOperatorQueue;
  sections: RuntimeReleaseHandoffBundleSection[];
}): RuntimeReleaseHandoffBundle["summary"] {
  const blockedSectionCount = input.sections.filter((section) => section.status === "blocked").length;
  const status: RuntimeReleaseHandoffBundleStatus = blockedSectionCount > 0 ? "blocked" : "ready";
  const bundleScore = Math.max(0, Math.min(100, Math.round(input.sections.reduce((total, section) => total + section.score, 0) / Math.max(1, input.sections.length))));
  const releaseCandidateId = input.approvalChecklist.releaseCandidateId || input.candidateComparison.currentReleaseCandidateId || input.operatorQueue.releaseCandidateId;
  const reviewerEmailRedacted = redactEmail(input.approvalChecklist.summary.reviewerEmail);
  const reviewerName = input.approvalChecklist.summary.reviewerName;

  return {
    blockedSectionCount,
    bundleHash: sha256({
      approvalHash: input.approvalChecklist.summary.approvalHash,
      audience: input.handoffAudience,
      comparisonHash: input.candidateComparison.summary.comparisonHash,
      queueHash: input.operatorQueue.summary.queueHash,
      releaseCandidateId,
      reviewerEmailRedacted,
      reviewerName,
      status,
    }),
    bundleScore,
    nextAction:
      status === "ready"
        ? "Runtime release handoff bundle is ready for audit-safe reviewer export."
        : "Resolve blocked approval, operator queue, or candidate comparison sections before handoff.",
    releaseCandidateId,
    reviewerEmailRedacted,
    reviewerName,
    sectionCount: input.sections.length,
    status,
  };
}

function createCsv(sections: RuntimeReleaseHandoffBundleSection[]) {
  const header = ["section", "status", "score", "evidence_hash", "next_action"];
  const body = sections.map((section) => [section.id, section.status, section.score, section.evidenceHash, section.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createMarkdown(input: {
  generatedAt: string;
  handoffAudience: string;
  sections: RuntimeReleaseHandoffBundleSection[];
  summary: RuntimeReleaseHandoffBundle["summary"];
  workspaceId: string;
}) {
  const rows = input.sections
    .map((section) => `| ${section.label} | ${section.status} | ${section.score}/100 | ${section.evidenceHash} | ${section.nextAction} |`)
    .join("\n");

  return `# Runtime Release Handoff Bundle

- Workspace: ${input.workspaceId}
- Generated: ${input.generatedAt}
- Audience: ${input.handoffAudience}
- Release candidate: ${input.summary.releaseCandidateId}
- Reviewer: ${input.summary.reviewerName}
- Reviewer email: ${input.summary.reviewerEmailRedacted ?? "not provided"}
- Status: ${input.summary.status}
- Score: ${input.summary.bundleScore}/100
- Bundle hash: ${input.summary.bundleHash}

| Section | Status | Score | Evidence hash | Next action |
| --- | --- | ---: | --- | --- |
${rows}
`;
}

function filesFor(input: {
  csvDataUri: string;
  csvFileName: string;
  jsonDataUri: string;
  jsonFileName: string;
  markdownDataUri: string;
  markdownFileName: string;
}): RuntimeReleaseHandoffBundleFile[] {
  return [
    {
      download: input.markdownFileName,
      format: "markdown",
      href: input.markdownDataUri,
      label: "Markdown handoff",
    },
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV handoff",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON handoff",
    },
  ];
}

export function createRuntimeReleaseHandoffBundle(input: CreateRuntimeReleaseHandoffBundleInput): RuntimeReleaseHandoffBundle {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const handoffAudience = input.handoffAudience ?? "release-handoff";
  const sections = createSections(input);
  const summary = summarize({
    approvalChecklist: input.approvalChecklist,
    candidateComparison: input.candidateComparison,
    handoffAudience,
    operatorQueue: input.operatorQueue,
    sections,
  });
  const csvContent = createCsv(sections);
  const markdownContent = createMarkdown({
    generatedAt,
    handoffAudience,
    sections,
    summary,
    workspaceId,
  });
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      handoffAudience,
      sections,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-runtime-release-handoff-bundle-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
  const markdownFileName = `${fileBase}.md`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);
  const markdownDataUri = encodeDataUri("text/markdown", markdownContent);

  return {
    csvContent,
    csvDataUri,
    csvFileName,
    files: filesFor({
      csvDataUri,
      csvFileName,
      jsonDataUri,
      jsonFileName,
      markdownDataUri,
      markdownFileName,
    }),
    generatedAt,
    handoffAudience,
    jsonContent,
    jsonDataUri,
    jsonFileName,
    markdownContent,
    markdownDataUri,
    markdownFileName,
    sections,
    summary,
    workspaceId,
  };
}
