import { createHash } from "node:crypto";
import type { RuntimeReleaseAutomationNotificationRoutingReport } from "@/features/projects/runtime-release-automation-notification-routing";
import type { RuntimeReleaseAutomationRunbook } from "@/features/projects/runtime-release-automation-runbook";
import type { RuntimeReleasePromotionRehearsalPacket } from "@/features/projects/runtime-release-promotion-rehearsal-packet";

export type RuntimeReleaseAutomationVerificationKind = "notification-route-eligibility" | "rehearsal-scoring" | "runbook-transition";
export type RuntimeReleaseAutomationVerificationStatus = "blocked" | "ready";

export interface RuntimeReleaseAutomationVerificationRow {
  evidenceHash: string;
  id: string;
  kind: RuntimeReleaseAutomationVerificationKind;
  nextAction: string;
  scenarioCount: number;
  status: RuntimeReleaseAutomationVerificationStatus;
}

export interface RuntimeReleaseAutomationVerificationReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: RuntimeReleaseAutomationVerificationRow[];
  summary: {
    blockedCoverageCount: number;
    coverageScore: number;
    nextAction: string;
    notificationRouteEligibilityCount: number;
    rehearsalScoringCoverageCount: number;
    runbookTransitionCoverageCount: number;
    status: RuntimeReleaseAutomationVerificationStatus;
    verificationHash: string;
  };
  workspaceId: string;
}

export interface CreateRuntimeReleaseAutomationVerificationInput {
  generatedAt?: string;
  notificationRouting: RuntimeReleaseAutomationNotificationRoutingReport;
  rehearsalPackets: RuntimeReleasePromotionRehearsalPacket[];
  runbooks: RuntimeReleaseAutomationRunbook[];
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

function row(input: Omit<RuntimeReleaseAutomationVerificationRow, "evidenceHash"> & { evidence: unknown }): RuntimeReleaseAutomationVerificationRow {
  return {
    evidenceHash: sha256(input.evidence),
    id: input.id,
    kind: input.kind,
    nextAction: input.nextAction,
    scenarioCount: input.scenarioCount,
    status: input.status,
  };
}

function hasRunbookStatus(runbooks: RuntimeReleaseAutomationRunbook[], status: RuntimeReleaseAutomationRunbook["summary"]["status"]) {
  return runbooks.some((runbook) => runbook.summary.status === status);
}

function hasRehearsalStatus(rehearsals: RuntimeReleasePromotionRehearsalPacket[], status: RuntimeReleasePromotionRehearsalPacket["summary"]["status"]) {
  return rehearsals.some((packet) => packet.summary.status === status);
}

function createRows(input: CreateRuntimeReleaseAutomationVerificationInput): RuntimeReleaseAutomationVerificationRow[] {
  const readyRunbook = hasRunbookStatus(input.runbooks, "ready");
  const blockedRunbook = hasRunbookStatus(input.runbooks, "blocked");
  const readyRehearsal = hasRehearsalStatus(input.rehearsalPackets, "ready");
  const blockedRehearsal = hasRehearsalStatus(input.rehearsalPackets, "blocked");
  const notificationCovered = input.notificationRouting.summary.routeCount > 0 && input.notificationRouting.summary.eligibleRouteCount > 0;

  return [
    row({
      evidence: input.runbooks.filter((runbook) => runbook.summary.status === "ready").map((runbook) => runbook.summary.runbookHash),
      id: "runbook:ready",
      kind: "runbook-transition",
      nextAction: readyRunbook ? "Ready runbook transition is covered." : "Add a ready runbook transition fixture.",
      scenarioCount: input.runbooks.filter((runbook) => runbook.summary.status === "ready").length,
      status: readyRunbook ? "ready" : "blocked",
    }),
    row({
      evidence: input.runbooks.filter((runbook) => runbook.summary.status === "blocked").map((runbook) => runbook.summary.runbookHash),
      id: "runbook:blocked",
      kind: "runbook-transition",
      nextAction: blockedRunbook ? "Blocked runbook transition is covered." : "Add a blocked runbook transition fixture.",
      scenarioCount: input.runbooks.filter((runbook) => runbook.summary.status === "blocked").length,
      status: blockedRunbook ? "ready" : "blocked",
    }),
    row({
      evidence: input.rehearsalPackets.filter((packet) => packet.summary.status === "ready").map((packet) => packet.summary.packetHash),
      id: "rehearsal:ready",
      kind: "rehearsal-scoring",
      nextAction: readyRehearsal ? "Ready rehearsal scoring is covered." : "Add a ready rehearsal scoring fixture.",
      scenarioCount: input.rehearsalPackets.filter((packet) => packet.summary.status === "ready").length,
      status: readyRehearsal ? "ready" : "blocked",
    }),
    row({
      evidence: input.rehearsalPackets.filter((packet) => packet.summary.status === "blocked").map((packet) => packet.summary.packetHash),
      id: "rehearsal:blocked",
      kind: "rehearsal-scoring",
      nextAction: blockedRehearsal ? "Blocked rehearsal scoring is covered." : "Add a blocked rehearsal scoring fixture.",
      scenarioCount: input.rehearsalPackets.filter((packet) => packet.summary.status === "blocked").length,
      status: blockedRehearsal ? "ready" : "blocked",
    }),
    row({
      evidence: {
        eligibleRouteCount: input.notificationRouting.summary.eligibleRouteCount,
        routeCount: input.notificationRouting.summary.routeCount,
        routingHash: input.notificationRouting.summary.routingHash,
      },
      id: "notification:route-eligibility",
      kind: "notification-route-eligibility",
      nextAction: notificationCovered ? "Notification route eligibility is covered." : "Add missing notification route eligibility coverage.",
      scenarioCount: notificationCovered ? 1 : 0,
      status: notificationCovered ? "ready" : "blocked",
    }),
  ];
}

function summarize(rows: RuntimeReleaseAutomationVerificationRow[]): RuntimeReleaseAutomationVerificationReport["summary"] {
  const blockedCoverageCount = rows.filter((entry) => entry.status === "blocked").length;
  const runbookTransitionCoverageCount = rows.filter((entry) => entry.kind === "runbook-transition" && entry.status === "ready").length;
  const rehearsalScoringCoverageCount = rows.filter((entry) => entry.kind === "rehearsal-scoring" && entry.status === "ready").length;
  const notificationRouteEligibilityCount = rows.filter((entry) => entry.kind === "notification-route-eligibility" && entry.status === "ready").length;
  const status: RuntimeReleaseAutomationVerificationStatus = blockedCoverageCount > 0 ? "blocked" : "ready";

  return {
    blockedCoverageCount,
    coverageScore: Math.round(((rows.length - blockedCoverageCount) / Math.max(1, rows.length)) * 100),
    nextAction:
      status === "ready"
        ? "Runtime release automation verification coverage is complete."
        : "Add missing runtime release automation verification coverage before closing this set.",
    notificationRouteEligibilityCount,
    rehearsalScoringCoverageCount,
    runbookTransitionCoverageCount,
    status,
    verificationHash: sha256(rows.map((entry) => entry.evidenceHash)),
  };
}

function createCsv(rows: RuntimeReleaseAutomationVerificationRow[]) {
  const header = ["verification_id", "kind", "status", "scenario_count", "evidence_hash", "next_action"];
  const body = rows.map((entry) => [entry.id, entry.kind, entry.status, entry.scenarioCount, entry.evidenceHash, entry.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createRuntimeReleaseAutomationVerification(input: CreateRuntimeReleaseAutomationVerificationInput): RuntimeReleaseAutomationVerificationReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.runbooks[0]?.workspaceId ?? input.rehearsalPackets[0]?.workspaceId ?? input.notificationRouting.workspaceId ?? "workspace";
  const rows = createRows(input);
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-runtime-release-automation-verification-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeDataUri("text/csv", csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeDataUri("application/json", jsonContent),
    jsonFileName: `${fileBase}.json`,
    rows,
    summary,
    workspaceId,
  };
}
