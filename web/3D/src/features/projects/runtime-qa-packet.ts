import { createHash } from "node:crypto";
import type { DeterministicRuntimeReplayReport } from "@/features/editor/runtime/deterministic-runtime-replay";
import type { MaterialPostProcessParityReport } from "@/features/editor/runtime/material-postprocess-parity";
import type { EditorPerformanceBudgetEvidenceReport } from "@/features/editor/utils/editor-performance-budget-evidence";
import type { PackagedSceneRuntimeSmokeReport } from "@/features/projects/packaged-scene-runtime-smoke";

export type RuntimeQaPacketStatus = "blocked" | "ready";
export type RuntimeQaPacketSectionId = "deterministic-replay" | "material-parity" | "packaged-playback" | "performance-budget";

export interface RuntimeQaPacketSection {
  hash: string;
  id: RuntimeQaPacketSectionId;
  label: string;
  nextAction: string;
  score: number;
  status: RuntimeQaPacketStatus;
}

export interface RuntimeQaPacket {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  markdownContent: string;
  markdownDataUri: string;
  markdownFileName: string;
  sections: RuntimeQaPacketSection[];
  summary: {
    blockedCount: number;
    nextAction: string;
    packetHash: string;
    qaScore: number;
    readyCount: number;
    sceneVersionHash: string | null;
    sectionCount: number;
    status: RuntimeQaPacketStatus;
  };
  workspaceId: string;
}

export interface CreateRuntimeQaPacketInput {
  deterministicReplayReport: DeterministicRuntimeReplayReport;
  generatedAt?: string;
  materialParityReport: MaterialPostProcessParityReport;
  packagedPlaybackReport: PackagedSceneRuntimeSmokeReport;
  performanceBudgetReport: EditorPerformanceBudgetEvidenceReport;
  sceneVersionHash?: string | null;
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

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function encodeDataUri(mimeType: string, content: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
}

function normalizeStatus(status: string): RuntimeQaPacketStatus {
  return status === "ready" ? "ready" : "blocked";
}

function section(input: RuntimeQaPacketSection): RuntimeQaPacketSection {
  return input;
}

function createSections(input: CreateRuntimeQaPacketInput): RuntimeQaPacketSection[] {
  return [
    section({
      hash: input.materialParityReport.summary.parityHash,
      id: "material-parity",
      label: "Material and post-process parity",
      nextAction: input.materialParityReport.summary.nextAction,
      score: input.materialParityReport.summary.parityScore,
      status: normalizeStatus(input.materialParityReport.summary.status),
    }),
    section({
      hash: input.packagedPlaybackReport.summary.runtimeSmokeHash,
      id: "packaged-playback",
      label: "Packaged scene playback",
      nextAction: input.packagedPlaybackReport.summary.nextAction,
      score: input.packagedPlaybackReport.summary.runtimeSmokeScore,
      status: normalizeStatus(input.packagedPlaybackReport.summary.status),
    }),
    section({
      hash: input.performanceBudgetReport.summary.performanceBudgetHash,
      id: "performance-budget",
      label: "Editor performance budgets",
      nextAction: input.performanceBudgetReport.summary.nextAction,
      score: input.performanceBudgetReport.summary.runtimeBudgetScore,
      status: normalizeStatus(input.performanceBudgetReport.summary.status),
    }),
    section({
      hash: input.deterministicReplayReport.summary.reportHash,
      id: "deterministic-replay",
      label: "Deterministic runtime replay",
      nextAction: input.deterministicReplayReport.summary.nextAction,
      score: input.deterministicReplayReport.summary.replayScore,
      status: normalizeStatus(input.deterministicReplayReport.summary.status),
    }),
  ];
}

function summarize(sections: RuntimeQaPacketSection[], sceneVersionHash: string | null): RuntimeQaPacket["summary"] {
  const blockedCount = sections.filter((section) => section.status === "blocked").length;
  const readyCount = sections.filter((section) => section.status === "ready").length;
  const status: RuntimeQaPacketStatus = blockedCount > 0 ? "blocked" : "ready";
  const qaScore = Math.max(0, Math.min(100, Math.round(sections.reduce((total, section) => total + section.score, 0) / Math.max(1, sections.length))));
  const base = {
    blockedCount,
    qaScore,
    readyCount,
    sceneVersionHash,
    sectionHashes: sections.map((section) => section.hash),
    status,
  };

  return {
    blockedCount,
    nextAction:
      status === "ready"
        ? "Runtime QA packet is reviewer-ready across material parity, packaged playback, performance budgets, and deterministic replay."
        : "Resolve blocked runtime QA sections before sending this packet for release review.",
    packetHash: sha256(base),
    qaScore,
    readyCount,
    sceneVersionHash,
    sectionCount: sections.length,
    status,
  };
}

function createCsv(sections: RuntimeQaPacketSection[]) {
  const header = ["section", "status", "score", "hash", "next_action"];
  const body = sections.map((section) => [section.id, section.status, section.score, section.hash, section.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createMarkdown(input: {
  generatedAt: string;
  sections: RuntimeQaPacketSection[];
  summary: RuntimeQaPacket["summary"];
  workspaceId: string;
}) {
  const sectionRows = input.sections
    .map((section) => `| ${section.label} | ${section.status} | ${section.score}/100 | ${section.hash} | ${section.nextAction} |`)
    .join("\n");

  return `# Runtime QA Packet

- Workspace: ${input.workspaceId}
- Generated: ${input.generatedAt}
- Status: ${input.summary.status}
- Score: ${input.summary.qaScore}/100
- Scene/version hash: ${input.summary.sceneVersionHash ?? "not provided"}
- Packet hash: ${input.summary.packetHash}

| Section | Status | Score | Evidence hash | Next action |
| --- | --- | ---: | --- | --- |
${sectionRows}
`;
}

export function createRuntimeQaPacket(input: CreateRuntimeQaPacketInput): RuntimeQaPacket {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const sections = createSections(input);
  const summary = summarize(sections, input.sceneVersionHash ?? null);
  const csvContent = createCsv(sections);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      sections,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const markdownContent = createMarkdown({
    generatedAt,
    sections,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-runtime-qa-packet-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeDataUri("text/csv", csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeDataUri("application/json", jsonContent),
    jsonFileName: `${fileBase}.json`,
    markdownContent,
    markdownDataUri: encodeDataUri("text/markdown", markdownContent),
    markdownFileName: `${fileBase}.md`,
    sections,
    summary,
    workspaceId,
  };
}
