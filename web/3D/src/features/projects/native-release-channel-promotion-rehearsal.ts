import { createHash } from "node:crypto";

export type NativeReleaseChannelPromotionKind = "channel-move" | "operator-acknowledgement" | "rollback-rehearsal";
export type NativeReleaseChannelPromotionStatus = "blocked" | "ready" | "review";
export type NativeReleaseChannelPromotionStepStatus = "failed" | "passed" | "warning";
export type NativeReleaseChannelPromotionFileFormat = "csv" | "json";

export interface NativeReleaseChannelPromotionStepInput {
  acknowledgedBy: null | string;
  approvalHashAfter: string;
  approvalHashBefore: string;
  detail: string;
  evidenceHash: string;
  id: string;
  kind: NativeReleaseChannelPromotionKind;
  rollbackEvidenceHash: null | string;
  staleApprovalInvalidated: boolean;
  status: NativeReleaseChannelPromotionStepStatus;
}

export interface NativeReleaseChannelPromotionStep {
  acknowledgedBy: string;
  approvalHashAfter: string;
  approvalHashBefore: string;
  detail: string;
  evidenceAttached: boolean;
  evidenceHash: string;
  id: string;
  kind: NativeReleaseChannelPromotionKind;
  nextAction: string;
  rollbackEvidenceAttached: boolean;
  rollbackEvidenceHash: string;
  staleApprovalInvalidated: boolean;
  status: NativeReleaseChannelPromotionStatus;
  stepHash: string;
}

export interface NativeReleaseChannelPromotionFile {
  download: string;
  format: NativeReleaseChannelPromotionFileFormat;
  href: string;
  label: string;
}

export interface NativeReleaseChannelPromotionRehearsal {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeReleaseChannelPromotionFile[];
  fromChannel: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  steps: NativeReleaseChannelPromotionStep[];
  summary: {
    blockedCount: number;
    missingCoverageCount: number;
    nextAction: string;
    readyCount: number;
    rehearsalHash: string;
    rehearsalScore: number;
    reviewCount: number;
    rowCount: number;
    staleApprovalInvalidationCount: number;
    status: NativeReleaseChannelPromotionStatus;
  };
  toChannel: string;
  workspaceId: string;
}

export interface CreateNativeReleaseChannelPromotionRehearsalInput {
  fromChannel: string;
  generatedAt?: string;
  releaseCandidateId: string;
  requiredStepKinds?: NativeReleaseChannelPromotionKind[];
  steps: NativeReleaseChannelPromotionStepInput[];
  toChannel: string;
  workspaceId?: string;
}

const requiredKinds: NativeReleaseChannelPromotionKind[] = ["channel-move", "rollback-rehearsal", "operator-acknowledgement"];
const kindRank: Record<NativeReleaseChannelPromotionKind, number> = {
  "channel-move": 0,
  "rollback-rehearsal": 1,
  "operator-acknowledgement": 2,
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

function missingStep(kind: NativeReleaseChannelPromotionKind): NativeReleaseChannelPromotionStepInput {
  return {
    acknowledgedBy: null,
    approvalHashAfter: "",
    approvalHashBefore: "",
    detail: `No ${kind} native release channel promotion rehearsal evidence recorded.`,
    evidenceHash: "",
    id: `missing-${kind}`,
    kind,
    rollbackEvidenceHash: null,
    staleApprovalInvalidated: false,
    status: "failed",
  };
}

function statusFor(input: {
  acknowledgedBy: string;
  evidenceAttached: boolean;
  kind: NativeReleaseChannelPromotionKind;
  rollbackEvidenceAttached: boolean;
  staleApprovalInvalidated: boolean;
  stepStatus: NativeReleaseChannelPromotionStepStatus;
}) {
  if (input.stepStatus === "failed" || !input.evidenceAttached || !input.staleApprovalInvalidated) {
    return "blocked";
  }

  if (input.kind === "rollback-rehearsal" && !input.rollbackEvidenceAttached) {
    return "blocked";
  }

  if (input.stepStatus === "warning" || input.acknowledgedBy === "missing") {
    return "review";
  }

  return "ready";
}

function nextActionFor(step: Pick<NativeReleaseChannelPromotionStep, "kind" | "rollbackEvidenceAttached" | "staleApprovalInvalidated" | "status">) {
  if (step.status === "blocked") {
    return `Resolve blocked native release channel promotion rehearsal for ${step.kind}.`;
  }

  if (!step.staleApprovalInvalidated) {
    return `Invalidate stale approval evidence for ${step.kind}.`;
  }

  if (step.kind === "rollback-rehearsal" && !step.rollbackEvidenceAttached) {
    return "Attach native release rollback rehearsal evidence before stable promotion.";
  }

  if (step.status === "review") {
    return `Review native release channel promotion rehearsal evidence for ${step.kind}.`;
  }

  return `Keep native release channel promotion rehearsal evidence current for ${step.kind}.`;
}

function createStep(input: NativeReleaseChannelPromotionStepInput): NativeReleaseChannelPromotionStep {
  const acknowledgedBy = input.acknowledgedBy?.trim() || "missing";
  const evidenceHash = input.evidenceHash.trim() || "missing";
  const rollbackEvidenceHash = input.rollbackEvidenceHash?.trim() || "missing";
  const evidenceAttached = evidenceHash.startsWith("sha256:");
  const rollbackEvidenceAttached = rollbackEvidenceHash.startsWith("sha256:");
  const status = statusFor({
    acknowledgedBy,
    evidenceAttached,
    kind: input.kind,
    rollbackEvidenceAttached,
    staleApprovalInvalidated: input.staleApprovalInvalidated,
    stepStatus: input.status,
  });
  const stepWithoutHash = {
    acknowledgedBy,
    approvalHashAfter: input.approvalHashAfter.trim() || "missing",
    approvalHashBefore: input.approvalHashBefore.trim() || "missing",
    detail: input.detail.trim() || "No promotion rehearsal detail recorded.",
    evidenceAttached,
    evidenceHash,
    id: input.id.trim() || `${input.kind}-step`,
    kind: input.kind,
    nextAction: "",
    rollbackEvidenceAttached,
    rollbackEvidenceHash,
    staleApprovalInvalidated: input.staleApprovalInvalidated,
    status,
  } satisfies Omit<NativeReleaseChannelPromotionStep, "stepHash">;
  const step = {
    ...stepWithoutHash,
    nextAction: nextActionFor(stepWithoutHash),
  };

  return {
    ...step,
    stepHash: sha256(step),
  };
}

function createSteps(input: CreateNativeReleaseChannelPromotionRehearsalInput) {
  const stepsByKind = new Map(input.steps.map((step) => [step.kind, step]));
  const requiredStepKinds = input.requiredStepKinds ?? requiredKinds;

  return requiredStepKinds
    .map((kind) => createStep(stepsByKind.get(kind) ?? missingStep(kind)))
    .sort((first, second) => kindRank[first.kind] - kindRank[second.kind]);
}

function summarize(steps: NativeReleaseChannelPromotionStep[]): NativeReleaseChannelPromotionRehearsal["summary"] {
  const blockedCount = steps.filter((step) => step.status === "blocked").length;
  const readyCount = steps.filter((step) => step.status === "ready").length;
  const reviewCount = steps.filter((step) => step.status === "review").length;
  const missingCoverageCount = steps.filter((step) => step.id.startsWith("missing-")).length;
  const staleApprovalInvalidationCount = steps.filter((step) => step.staleApprovalInvalidated).length;
  const status: NativeReleaseChannelPromotionStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    missingCoverageCount,
    nextAction:
      status === "blocked"
        ? "Resolve blocked native release channel promotion rehearsal before stable promotion."
        : status === "review"
          ? "Review native release channel promotion rehearsal before stable promotion."
          : "Native release channel promotion rehearsal is ready for stable promotion.",
    readyCount,
    rehearsalHash: sha256(steps.map((step) => step.stepHash)),
    rehearsalScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, steps.length)) * 100 + reviewCount * 20 - blockedCount * 18 - missingCoverageCount * 10))),
    reviewCount,
    rowCount: steps.length,
    staleApprovalInvalidationCount,
    status,
  };
}

function createCsv(steps: NativeReleaseChannelPromotionStep[]) {
  const header = ["step_id", "kind", "status", "evidence_attached", "rollback_evidence_attached", "stale_approval_invalidated", "step_hash", "next_action"];
  const body = steps.map((step) =>
    [step.id, step.kind, step.status, step.evidenceAttached, step.rollbackEvidenceAttached, step.staleApprovalInvalidated, step.stepHash, step.nextAction]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: {
  csvDataUri: string;
  csvFileName: string;
  jsonDataUri: string;
  jsonFileName: string;
}): NativeReleaseChannelPromotionFile[] {
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

export function createNativeReleaseChannelPromotionRehearsal(input: CreateNativeReleaseChannelPromotionRehearsalInput): NativeReleaseChannelPromotionRehearsal {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const steps = createSteps(input);
  const summary = summarize(steps);
  const csvContent = createCsv(steps);
  const jsonContent = JSON.stringify(
    {
      fromChannel: input.fromChannel,
      generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      steps,
      summary,
      toChannel: input.toChannel,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-native-release-channel-promotion-rehearsal-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
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
    fromChannel: input.fromChannel,
    generatedAt,
    jsonContent,
    jsonDataUri,
    jsonFileName,
    releaseCandidateId: input.releaseCandidateId,
    steps,
    summary,
    toChannel: input.toChannel,
    workspaceId,
  };
}
