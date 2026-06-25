import { createHash } from "node:crypto";
import type { RuntimeReleaseHandoffBundle } from "@/features/projects/runtime-release-handoff-bundle";

export type RuntimeReleaseAutomationRunbookStatus = "blocked" | "ready";
export type RuntimeReleaseAutomationCommandKind = "post-promote-smoke" | "promote" | "rollback";
export type RuntimeReleaseAutomationRunbookFileFormat = "csv" | "json";

export interface RuntimeReleaseAutomationCommandInput {
  command: string;
  evidenceHash?: string;
  id: string;
  kind: RuntimeReleaseAutomationCommandKind;
  label: string;
}

export interface RuntimeReleaseAutomationCommand extends RuntimeReleaseAutomationCommandInput {
  evidenceHash: string;
  nextAction: string;
  status: RuntimeReleaseAutomationRunbookStatus;
}

export interface RuntimeReleaseAutomationRollbackGuardrail {
  evidenceHash: string;
  id: string;
  label: string;
  nextAction: string;
  status: RuntimeReleaseAutomationRunbookStatus;
}

export interface RuntimeReleaseAutomationRunbookFile {
  download: string;
  format: RuntimeReleaseAutomationRunbookFileFormat;
  href: string;
  label: string;
}

export interface RuntimeReleaseAutomationRunbook {
  commands: RuntimeReleaseAutomationCommand[];
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: RuntimeReleaseAutomationRunbookFile[];
  generatedAt: string;
  guardrails: RuntimeReleaseAutomationRollbackGuardrail[];
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  summary: {
    blockedCommandCount: number;
    blockedGuardrailCount: number;
    commandCount: number;
    missingCommandKindCount: number;
    nextAction: string;
    productionAlias: string;
    releaseCandidateId: string;
    rollbackGuardrailCount: number;
    runbookHash: string;
    runbookScore: number;
    status: RuntimeReleaseAutomationRunbookStatus;
  };
  workspaceId: string;
}

export interface CreateRuntimeReleaseAutomationRunbookInput {
  generatedAt?: string;
  handoffBundle: RuntimeReleaseHandoffBundle;
  productionAlias: string;
  promotionCommands: RuntimeReleaseAutomationCommandInput[];
  rollbackGuardrails: RuntimeReleaseAutomationRollbackGuardrail[];
  workspaceId?: string;
}

const commandKindRank: Record<RuntimeReleaseAutomationCommandKind, number> = {
  promote: 0,
  "post-promote-smoke": 1,
  rollback: 2,
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

function normalizeCommand(input: RuntimeReleaseAutomationCommandInput): RuntimeReleaseAutomationCommand {
  const evidenceHash =
    input.evidenceHash ??
    sha256({
      command: input.command,
      id: input.id,
      kind: input.kind,
      label: input.label,
    });

  return {
    ...input,
    evidenceHash,
    nextAction: `Run ${input.label} after the release handoff bundle is approved.`,
    status: "ready",
  };
}

function missingCommandKinds(commands: RuntimeReleaseAutomationCommand[]) {
  const commandKinds = new Set(commands.map((command) => command.kind));

  return (["promote", "post-promote-smoke", "rollback"] as const).filter((kind) => !commandKinds.has(kind));
}

function summarize(input: {
  commands: RuntimeReleaseAutomationCommand[];
  guardrails: RuntimeReleaseAutomationRollbackGuardrail[];
  handoffBundle: RuntimeReleaseHandoffBundle;
  productionAlias: string;
}) {
  const blockedCommandCount = input.commands.filter((command) => command.status === "blocked").length;
  const blockedGuardrailCount = input.guardrails.filter((guardrail) => guardrail.status === "blocked").length;
  const missingCommandKindCount = missingCommandKinds(input.commands).length;
  const blockedCount =
    blockedCommandCount +
    blockedGuardrailCount +
    missingCommandKindCount +
    (input.handoffBundle.summary.status === "ready" ? 0 : 1);
  const status: RuntimeReleaseAutomationRunbookStatus = blockedCount > 0 ? "blocked" : "ready";
  const commandCoverageScore = Math.round(((3 - missingCommandKindCount) / 3) * 100);
  const guardrailScore = Math.round(((input.guardrails.length - blockedGuardrailCount) / Math.max(1, input.guardrails.length)) * 100);
  const handoffScore = input.handoffBundle.summary.status === "ready" ? input.handoffBundle.summary.bundleScore : Math.min(70, input.handoffBundle.summary.bundleScore);
  const runbookScore = Math.max(0, Math.min(100, Math.round((commandCoverageScore + guardrailScore + handoffScore) / 3 - blockedCommandCount * 8)));

  return {
    blockedCommandCount,
    blockedGuardrailCount,
    commandCount: input.commands.length,
    missingCommandKindCount,
    nextAction:
      status === "ready"
        ? "Runtime release automation runbook is ready for production promotion."
        : "Resolve blocked handoff, command coverage, or rollback guardrail gaps before production promotion.",
    productionAlias: input.productionAlias,
    releaseCandidateId: input.handoffBundle.summary.releaseCandidateId,
    rollbackGuardrailCount: input.guardrails.length,
    runbookHash: sha256({
      commandHashes: input.commands.map((command) => command.evidenceHash),
      guardrailHashes: input.guardrails.map((guardrail) => guardrail.evidenceHash),
      handoffHash: input.handoffBundle.summary.bundleHash,
      productionAlias: input.productionAlias,
      status,
    }),
    runbookScore,
    status,
  } satisfies RuntimeReleaseAutomationRunbook["summary"];
}

function createCsv(input: {
  commands: RuntimeReleaseAutomationCommand[];
  guardrails: RuntimeReleaseAutomationRollbackGuardrail[];
}) {
  const header = ["item_id", "kind", "status", "evidence_hash", "next_action"];
  const commandRows = input.commands.map((command) =>
    [command.id, command.kind, command.status, command.evidenceHash, `${command.nextAction} Command: ${command.command}`].map(csvCell).join(","),
  );
  const guardrailRows = input.guardrails.map((guardrail) =>
    [guardrail.id, "rollback-guardrail", guardrail.status, guardrail.evidenceHash, guardrail.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...commandRows, ...guardrailRows].join("\n")}\n`;
}

function filesFor(input: {
  csvDataUri: string;
  csvFileName: string;
  jsonDataUri: string;
  jsonFileName: string;
}): RuntimeReleaseAutomationRunbookFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV runbook",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON runbook",
    },
  ];
}

export function createRuntimeReleaseAutomationRunbook(input: CreateRuntimeReleaseAutomationRunbookInput): RuntimeReleaseAutomationRunbook {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.handoffBundle.workspaceId ?? "workspace";
  const commands = input.promotionCommands.map(normalizeCommand).sort((first, second) => commandKindRank[first.kind] - commandKindRank[second.kind]);
  const guardrails = [...input.rollbackGuardrails].sort((first, second) => first.id.localeCompare(second.id));
  const summary = summarize({
    commands,
    guardrails,
    handoffBundle: input.handoffBundle,
    productionAlias: input.productionAlias,
  });
  const csvContent = createCsv({
    commands,
    guardrails,
  });
  const jsonContent = JSON.stringify(
    {
      commands,
      generatedAt,
      guardrails,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-runtime-release-automation-runbook-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    commands,
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
    guardrails,
    jsonContent,
    jsonDataUri,
    jsonFileName,
    summary,
    workspaceId,
  };
}
