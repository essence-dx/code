import { createHash } from "node:crypto";
import type { RuntimeReleaseAutomationCommandCenter } from "@/features/projects/runtime-release-automation-command-center";

export type RuntimeReleasePromotionRehearsalStepKind = "alias-move" | "operator-acknowledgement" | "post-promote-smoke" | "rollback-drill";
export type RuntimeReleasePromotionRehearsalStepStatus = "failed" | "passed" | "warning";
export type RuntimeReleasePromotionRehearsalPacketStatus = "blocked" | "ready" | "review";
export type RuntimeReleasePromotionRehearsalPacketFileFormat = "csv" | "json";

export interface RuntimeReleasePromotionRehearsalStepInput {
  detail: string;
  durationMs: number;
  evidenceHash?: string;
  id: string;
  kind: RuntimeReleasePromotionRehearsalStepKind;
  operator?: string;
  status: RuntimeReleasePromotionRehearsalStepStatus;
}

export interface RuntimeReleasePromotionRehearsalStep extends RuntimeReleasePromotionRehearsalStepInput {
  evidenceHash: string;
  nextAction: string;
}

export interface RuntimeReleasePromotionRehearsalPacketFile {
  download: string;
  format: RuntimeReleasePromotionRehearsalPacketFileFormat;
  href: string;
  label: string;
}

export interface RuntimeReleasePromotionRehearsalPacket {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: RuntimeReleasePromotionRehearsalPacketFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  steps: RuntimeReleasePromotionRehearsalStep[];
  summary: {
    failedStepCount: number;
    missingCoverageCount: number;
    nextAction: string;
    packetHash: string;
    productionAlias: string;
    releaseCandidateId: string;
    rehearsalScore: number;
    requiredCoverageCount: number;
    status: RuntimeReleasePromotionRehearsalPacketStatus;
    stepCount: number;
    totalDurationMs: number;
    warningStepCount: number;
  };
  workspaceId: string;
}

export interface CreateRuntimeReleasePromotionRehearsalPacketInput {
  commandCenter: RuntimeReleaseAutomationCommandCenter;
  generatedAt?: string;
  productionAlias: string;
  releaseCandidateId: string;
  steps: RuntimeReleasePromotionRehearsalStepInput[];
  workspaceId?: string;
}

const stepKindRank: Record<RuntimeReleasePromotionRehearsalStepKind, number> = {
  "alias-move": 0,
  "post-promote-smoke": 1,
  "rollback-drill": 2,
  "operator-acknowledgement": 3,
};

const requiredStepKinds = ["alias-move", "post-promote-smoke", "rollback-drill", "operator-acknowledgement"] as const;

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

function csvCell(value: string | number) {
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

function nextActionFor(step: Pick<RuntimeReleasePromotionRehearsalStepInput, "kind" | "status">) {
  if (step.status === "failed") {
    return `Resolve failed ${step.kind} rehearsal before promotion.`;
  }

  if (step.status === "warning") {
    return `Review warning evidence for ${step.kind} before promotion.`;
  }

  return `Keep ${step.kind} rehearsal evidence attached to the promotion packet.`;
}

function normalizeStep(step: RuntimeReleasePromotionRehearsalStepInput): RuntimeReleasePromotionRehearsalStep {
  const nextAction = nextActionFor(step);
  const evidenceHash =
    step.evidenceHash ??
    sha256({
      detail: step.detail,
      durationMs: step.durationMs,
      id: step.id,
      kind: step.kind,
      nextAction,
      operator: step.operator ?? null,
      status: step.status,
    });

  return {
    ...step,
    evidenceHash,
    nextAction,
  };
}

function missingStepKinds(steps: RuntimeReleasePromotionRehearsalStep[]) {
  const kinds = new Set(steps.map((step) => step.kind));

  return requiredStepKinds.filter((kind) => !kinds.has(kind));
}

function summarize(input: {
  commandCenter: RuntimeReleaseAutomationCommandCenter;
  productionAlias: string;
  releaseCandidateId: string;
  steps: RuntimeReleasePromotionRehearsalStep[];
}) {
  const failedStepCount = input.steps.filter((step) => step.status === "failed").length;
  const warningStepCount = input.steps.filter((step) => step.status === "warning").length;
  const missingCoverageCount = missingStepKinds(input.steps).length;
  const requiredCoverageCount = requiredStepKinds.length - missingCoverageCount;
  const totalDurationMs = input.steps.reduce((total, step) => total + step.durationMs, 0);
  const baseScore = Math.round((requiredCoverageCount / requiredStepKinds.length) * 100);
  const rehearsalScore = Math.max(
    0,
    Math.min(100, Math.round((baseScore + input.commandCenter.summary.commandCenterScore) / 2) - failedStepCount * 18 - warningStepCount * 8),
  );
  const status: RuntimeReleasePromotionRehearsalPacketStatus =
    failedStepCount > 0 || missingCoverageCount > 0 || input.commandCenter.summary.status === "blocked"
      ? "blocked"
      : warningStepCount > 0
        ? "review"
        : "ready";

  return {
    failedStepCount,
    missingCoverageCount,
    nextAction:
      status === "blocked"
        ? "Resolve failed rehearsal steps, missing coverage, or blocked command-center candidates before promotion."
        : status === "review"
          ? "Review warning rehearsal evidence before promotion."
          : "Promotion rehearsal packet is ready for operator-approved release.",
    packetHash: sha256({
      commandCenterHash: input.commandCenter.summary.commandCenterHash,
      productionAlias: input.productionAlias,
      releaseCandidateId: input.releaseCandidateId,
      status,
      stepHashes: input.steps.map((step) => step.evidenceHash),
    }),
    productionAlias: input.productionAlias,
    releaseCandidateId: input.releaseCandidateId,
    rehearsalScore,
    requiredCoverageCount,
    status,
    stepCount: input.steps.length,
    totalDurationMs,
    warningStepCount,
  } satisfies RuntimeReleasePromotionRehearsalPacket["summary"];
}

function createCsv(steps: RuntimeReleasePromotionRehearsalStep[]) {
  const header = ["step_id", "kind", "status", "duration_ms", "evidence_hash", "next_action"];
  const body = steps.map((step) => [step.id, step.kind, step.status, step.durationMs, step.evidenceHash, step.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: {
  csvDataUri: string;
  csvFileName: string;
  jsonDataUri: string;
  jsonFileName: string;
}): RuntimeReleasePromotionRehearsalPacketFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV rehearsal",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON rehearsal",
    },
  ];
}

export function createRuntimeReleasePromotionRehearsalPacket(input: CreateRuntimeReleasePromotionRehearsalPacketInput): RuntimeReleasePromotionRehearsalPacket {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.commandCenter.workspaceId ?? "workspace";
  const steps = input.steps.map(normalizeStep).sort((first, second) => stepKindRank[first.kind] - stepKindRank[second.kind] || first.id.localeCompare(second.id));
  const summary = summarize({
    commandCenter: input.commandCenter,
    productionAlias: input.productionAlias,
    releaseCandidateId: input.releaseCandidateId,
    steps,
  });
  const csvContent = createCsv(steps);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      steps,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-runtime-release-promotion-rehearsal-packet-${dateStamp(generatedAt)}`;
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
    steps,
    summary,
    workspaceId,
  };
}
