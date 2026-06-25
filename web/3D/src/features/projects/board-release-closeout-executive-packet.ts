import { createHash } from "node:crypto";
import type { BoardReleaseCloseoutArchiveManifestReport } from "@/features/projects/board-release-closeout-archive-manifests";
import type { BoardReleaseCloseoutOwnerAcknowledgementReport } from "@/features/projects/board-release-closeout-owner-acknowledgements";
import type { BoardReleaseCloseoutReadinessGateReport, BoardReleaseCloseoutReadinessGateStatus } from "@/features/projects/board-release-closeout-readiness-gates";
import type { BoardReleaseCloseoutVarianceRemediationReport } from "@/features/projects/board-release-closeout-variance-remediation";

export type BoardReleaseCloseoutExecutivePacketDecision = "approve" | "defer" | "hold";
export type BoardReleaseCloseoutExecutivePacketSectionKind = "acknowledgements" | "archive" | "decision" | "readiness" | "remediation";

export interface BoardReleaseCloseoutExecutivePacketSection {
  evidenceHash: string;
  nextAction: string;
  score: number;
  sectionHash: string;
  sectionId: string;
  sectionKind: BoardReleaseCloseoutExecutivePacketSectionKind;
  status: BoardReleaseCloseoutReadinessGateStatus;
  summary: string;
  title: string;
  workspaceId: string;
}

export interface BoardReleaseCloseoutExecutivePacketReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  executiveMemo: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  sections: BoardReleaseCloseoutExecutivePacketSection[];
  summary: {
    blockedSectionCount: number;
    decision: BoardReleaseCloseoutExecutivePacketDecision;
    finalDecisionHash: string;
    nextAction: string;
    packetHash: string;
    packetScore: number;
    readySectionCount: number;
    sectionCount: number;
    status: BoardReleaseCloseoutReadinessGateStatus;
    watchSectionCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseCloseoutExecutivePacketReportInput {
  archiveManifests: BoardReleaseCloseoutArchiveManifestReport;
  generatedAt?: string;
  ownerAcknowledgements: BoardReleaseCloseoutOwnerAcknowledgementReport;
  readinessGates: BoardReleaseCloseoutReadinessGateReport;
  remediation: BoardReleaseCloseoutVarianceRemediationReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseCloseoutReadinessGateStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const sectionRank: Record<BoardReleaseCloseoutExecutivePacketSectionKind, number> = {
  readiness: 0,
  acknowledgements: 1,
  archive: 2,
  remediation: 3,
  decision: 4,
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

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sectionId(input: {
  generatedAt: string;
  sectionKind: BoardReleaseCloseoutExecutivePacketSectionKind;
  workspaceId: string;
}) {
  return `board-release-closeout-executive-packet:${slug(input.workspaceId)}:${input.sectionKind}:${dateStamp(input.generatedAt)}`;
}

function section(input: Omit<BoardReleaseCloseoutExecutivePacketSection, "sectionHash" | "sectionId"> & { generatedAt: string }) {
  const id = sectionId({
    generatedAt: input.generatedAt,
    sectionKind: input.sectionKind,
    workspaceId: input.workspaceId,
  });
  const sectionHash = sha256({
    evidenceHash: input.evidenceHash,
    id,
    score: input.score,
    sectionKind: input.sectionKind,
    status: input.status,
    summary: input.summary,
    workspaceId: input.workspaceId,
  });

  return {
    evidenceHash: input.evidenceHash,
    nextAction: input.nextAction,
    score: input.score,
    sectionHash,
    sectionId: id,
    sectionKind: input.sectionKind,
    status: input.status,
    summary: input.summary,
    title: input.title,
    workspaceId: input.workspaceId,
  };
}

function readinessSection(report: BoardReleaseCloseoutReadinessGateReport, generatedAt: string, workspaceId: string) {
  return section({
    evidenceHash: sha256(report.jsonContent),
    generatedAt,
    nextAction: report.summary.nextAction,
    score: report.summary.readinessScore,
    sectionKind: "readiness",
    status: report.summary.status,
    summary: `${report.summary.readyCount}/${report.summary.gateCount} closeout gates ready, ${report.summary.blockedCount} blocked, ${report.summary.watchCount} watched.`,
    title: "Readiness gates",
    workspaceId,
  });
}

function acknowledgementSection(report: BoardReleaseCloseoutOwnerAcknowledgementReport, generatedAt: string, workspaceId: string) {
  const score = clampScore((report.summary.signedCount / Math.max(report.summary.acknowledgementCount, 1)) * 100 - report.summary.blockedCount * 18 - report.summary.dueCount * 8);

  return section({
    evidenceHash: sha256(report.jsonContent),
    generatedAt,
    nextAction: report.summary.nextAction,
    score,
    sectionKind: "acknowledgements",
    status: report.summary.status,
    summary: `${report.summary.signedCount}/${report.summary.acknowledgementCount} acknowledgements signed with ${report.summary.roleCoverageCount} role-covered rows.`,
    title: "Owner acknowledgements",
    workspaceId,
  });
}

function archiveSection(report: BoardReleaseCloseoutArchiveManifestReport, generatedAt: string, workspaceId: string) {
  const score = clampScore((report.summary.readyCount / Math.max(report.summary.manifestCount, 1)) * 100 - report.summary.blockedCount * 20 - report.summary.watchCount * 8);

  return section({
    evidenceHash: report.summary.bundleHash,
    generatedAt,
    nextAction: report.summary.nextAction,
    score,
    sectionKind: "archive",
    status: report.summary.status,
    summary: `${report.summary.readyCount}/${report.summary.manifestCount} archive manifests ready with bundle ${report.summary.bundleHash}.`,
    title: "Archive manifests",
    workspaceId,
  });
}

function remediationSection(report: BoardReleaseCloseoutVarianceRemediationReport, generatedAt: string, workspaceId: string) {
  const score = clampScore((report.summary.completedCount / Math.max(report.summary.planCount, 1)) * 100 - report.summary.blockedCount * 18 - report.summary.openCount * 8);

  return section({
    evidenceHash: report.summary.remediationHash,
    generatedAt,
    nextAction: report.summary.nextAction,
    score,
    sectionKind: "remediation",
    status: report.summary.status,
    summary: `${report.summary.completedCount}/${report.summary.planCount} remediation plans completed, ${report.summary.criticalCount} critical.`,
    title: "Variance remediation",
    workspaceId,
  });
}

function decisionFromStatus(status: BoardReleaseCloseoutReadinessGateStatus): BoardReleaseCloseoutExecutivePacketDecision {
  if (status === "blocked") {
    return "hold";
  }

  return status === "watch" ? "defer" : "approve";
}

function decisionNextAction(decision: BoardReleaseCloseoutExecutivePacketDecision) {
  if (decision === "approve") {
    return "Board release closeout packet is ready for final sign-off and release archive handoff.";
  }

  return decision === "defer"
    ? "Resolve watched closeout items before final release approval."
    : "Resolve blocked closeout items before the board can approve release closure.";
}

function createSections(input: CreateBoardReleaseCloseoutExecutivePacketReportInput & { generatedAt: string; workspaceId: string }) {
  const baseSections = [
    readinessSection(input.readinessGates, input.generatedAt, input.workspaceId),
    acknowledgementSection(input.ownerAcknowledgements, input.generatedAt, input.workspaceId),
    archiveSection(input.archiveManifests, input.generatedAt, input.workspaceId),
    remediationSection(input.remediation, input.generatedAt, input.workspaceId),
  ];
  const status = baseSections.reduce<BoardReleaseCloseoutReadinessGateStatus>(
    (worst, item) => (statusRank[item.status] < statusRank[worst] ? item.status : worst),
    "ready",
  );
  const decision = decisionFromStatus(status);
  const packetScore = clampScore(baseSections.reduce((sum, item) => sum + item.score, 0) / Math.max(baseSections.length, 1));
  const decisionSection = section({
    evidenceHash: sha256({
      decision,
      packetScore,
      sections: baseSections.map((item) => item.sectionHash),
    }),
    generatedAt: input.generatedAt,
    nextAction: decisionNextAction(decision),
    score: packetScore,
    sectionKind: "decision",
    status,
    summary: `Final decision is ${decision} with ${packetScore}/100 closeout confidence.`,
    title: "Final decision",
    workspaceId: input.workspaceId,
  });

  return [...baseSections, decisionSection].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] || sectionRank[first.sectionKind] - sectionRank[second.sectionKind],
  );
}

function summarize(sections: BoardReleaseCloseoutExecutivePacketSection[]): BoardReleaseCloseoutExecutivePacketReport["summary"] {
  const blockedSectionCount = sections.filter((item) => item.status === "blocked").length;
  const watchSectionCount = sections.filter((item) => item.status === "watch").length;
  const status: BoardReleaseCloseoutReadinessGateStatus = blockedSectionCount > 0 ? "blocked" : watchSectionCount > 0 ? "watch" : "ready";
  const decision = decisionFromStatus(status);
  const packetScore = clampScore(sections.reduce((sum, item) => sum + item.score, 0) / Math.max(sections.length, 1));
  const finalDecisionHash = sha256({
    decision,
    packetScore,
    status,
  });
  const packetHash = sha256({
    finalDecisionHash,
    sections: sections.map((item) => item.sectionHash),
  });

  return {
    blockedSectionCount,
    decision,
    finalDecisionHash,
    nextAction: decisionNextAction(decision),
    packetHash,
    packetScore,
    readySectionCount: sections.filter((item) => item.status === "ready").length,
    sectionCount: sections.length,
    status,
    watchSectionCount,
  };
}

function createMemo(summary: BoardReleaseCloseoutExecutivePacketReport["summary"], sections: BoardReleaseCloseoutExecutivePacketSection[]) {
  const sectionLines = sections.map((item) => `- ${item.title}: ${item.status}, ${item.score}/100. ${item.summary}`).join("\n");

  return [
    `Board release closeout decision: ${summary.decision.toUpperCase()}`,
    `Packet status: ${summary.status}, ${summary.packetScore}/100 confidence.`,
    `Next action: ${summary.nextAction}`,
    "",
    sectionLines,
    "",
    `Packet hash: ${summary.packetHash}`,
    `Final decision hash: ${summary.finalDecisionHash}`,
  ].join("\n");
}

function createCsv(sections: BoardReleaseCloseoutExecutivePacketSection[]) {
  const header = ["section_id", "section_kind", "title", "status", "score", "evidence_hash", "section_hash", "summary", "next_action"];
  const body = sections.map((item) =>
    [item.sectionId, item.sectionKind, item.title, item.status, item.score, item.evidenceHash, item.sectionHash, item.summary, item.nextAction]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  executiveMemo: string;
  generatedAt: string;
  sections: BoardReleaseCloseoutExecutivePacketSection[];
  summary: BoardReleaseCloseoutExecutivePacketReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      executiveMemo: input.executiveMemo,
      generatedAt: input.generatedAt,
      sections: input.sections,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseCloseoutExecutivePacketReport(
  input: CreateBoardReleaseCloseoutExecutivePacketReportInput,
): BoardReleaseCloseoutExecutivePacketReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.readinessGates.workspaceId;
  const sections = createSections({
    ...input,
    generatedAt,
    workspaceId,
  });
  const summary = summarize(sections);
  const executiveMemo = createMemo(summary, sections);
  const csvContent = createCsv(sections);
  const jsonContent = createJson({
    executiveMemo,
    generatedAt,
    sections,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-closeout-executive-packet-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    executiveMemo,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    sections,
    summary,
    workspaceId,
  };
}
