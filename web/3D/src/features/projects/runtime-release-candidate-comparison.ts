import { createHash } from "node:crypto";
import type { RuntimeReleaseApprovalChecklist } from "@/features/projects/runtime-release-approval-checklist";
import type { RuntimeReleaseGate, RuntimeReleaseGateId, RuntimeReleaseGatesReport } from "@/features/projects/runtime-release-gates";
import type { RuntimeReleaseOperatorQueue } from "@/features/projects/runtime-release-operator-queue";

export type RuntimeReleaseCandidateComparisonStatus = "blocked" | "ready" | "watch";
export type RuntimeReleaseCandidateChange = "improved" | "missing" | "new" | "regressed" | "unchanged";

export interface RuntimeReleaseCandidateSnapshot {
  approvalChecklist: RuntimeReleaseApprovalChecklist;
  operatorQueue: RuntimeReleaseOperatorQueue;
  releaseCandidateId: string;
  runtimeReleaseGates: RuntimeReleaseGatesReport;
}

export interface RuntimeReleaseCandidateComparisonRow {
  change: RuntimeReleaseCandidateChange;
  currentHash: string | null;
  currentScore: number;
  currentStatus: string;
  id: string;
  label: string;
  lastApprovedHash: string | null;
  lastApprovedScore: number;
  lastApprovedStatus: string;
  nextAction: string;
  rowHash: string;
}

export interface RuntimeReleaseCandidateComparison {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  currentReleaseCandidateId: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  lastApprovedReleaseCandidateId: string;
  rows: RuntimeReleaseCandidateComparisonRow[];
  summary: {
    comparisonHash: string;
    comparisonScore: number;
    diffCount: number;
    improvementCount: number;
    missingGateCount: number;
    newGateCount: number;
    nextAction: string;
    regressionCount: number;
    status: RuntimeReleaseCandidateComparisonStatus;
    unchangedCount: number;
  };
  workspaceId: string;
}

export interface CreateRuntimeReleaseCandidateComparisonInput {
  current: RuntimeReleaseCandidateSnapshot;
  generatedAt?: string;
  lastApproved: RuntimeReleaseCandidateSnapshot;
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

function scoreForGate(gate: RuntimeReleaseGate | null) {
  if (!gate) {
    return 0;
  }

  return gate.status === "ready" ? 100 : Math.max(0, 60 - gate.blockerCount * 20);
}

function changeFor(input: {
  currentHash: string | null;
  currentScore: number;
  lastApprovedHash: string | null;
  lastApprovedScore: number;
}): RuntimeReleaseCandidateChange {
  if (!input.lastApprovedHash && input.currentHash) {
    return "new";
  }

  if (input.lastApprovedHash && !input.currentHash) {
    return "missing";
  }

  if (input.currentHash === input.lastApprovedHash && input.currentScore === input.lastApprovedScore) {
    return "unchanged";
  }

  if (input.currentScore > input.lastApprovedScore) {
    return "improved";
  }

  if (input.currentScore < input.lastApprovedScore) {
    return "regressed";
  }

  return input.currentHash === input.lastApprovedHash ? "unchanged" : "improved";
}

function nextActionFor(change: RuntimeReleaseCandidateChange, label: string) {
  if (change === "regressed") {
    return `Review ${label} regression before approving this release candidate.`;
  }

  if (change === "missing") {
    return `Restore missing ${label} evidence before approving this release candidate.`;
  }

  if (change === "new") {
    return `Confirm new ${label} evidence is expected for this release candidate.`;
  }

  if (change === "improved") {
    return `Keep improved ${label} evidence with the release comparison packet.`;
  }

  return `${label} matches the last approved release evidence.`;
}

function row(input: {
  currentHash: string | null;
  currentScore: number;
  currentStatus: string;
  id: string;
  label: string;
  lastApprovedHash: string | null;
  lastApprovedScore: number;
  lastApprovedStatus: string;
}): RuntimeReleaseCandidateComparisonRow {
  const change = changeFor(input);
  const base = {
    change,
    currentHash: input.currentHash,
    currentScore: input.currentScore,
    currentStatus: input.currentStatus,
    id: input.id,
    label: input.label,
    lastApprovedHash: input.lastApprovedHash,
    lastApprovedScore: input.lastApprovedScore,
    lastApprovedStatus: input.lastApprovedStatus,
    nextAction: nextActionFor(change, input.label),
  };

  return {
    ...base,
    rowHash: sha256(base),
  };
}

function gateMap(gates: RuntimeReleaseGate[]) {
  return new Map<RuntimeReleaseGateId, RuntimeReleaseGate>(gates.map((gate) => [gate.id, gate]));
}

function createRows(input: CreateRuntimeReleaseCandidateComparisonInput): RuntimeReleaseCandidateComparisonRow[] {
  const currentGates = gateMap(input.current.runtimeReleaseGates.gates);
  const lastApprovedGates = gateMap(input.lastApproved.runtimeReleaseGates.gates);
  const gateIds = [...new Set([...lastApprovedGates.keys(), ...currentGates.keys()])].sort();
  const rows = [
    ...gateIds.map((gateId) => {
      const currentGate = currentGates.get(gateId) ?? null;
      const lastGate = lastApprovedGates.get(gateId) ?? null;

      return row({
        currentHash: currentGate?.evidenceHash ?? null,
        currentScore: scoreForGate(currentGate),
        currentStatus: currentGate?.status ?? "missing",
        id: `gate:${gateId}`,
        label: currentGate?.label ?? lastGate?.label ?? gateId,
        lastApprovedHash: lastGate?.evidenceHash ?? null,
        lastApprovedScore: scoreForGate(lastGate),
        lastApprovedStatus: lastGate?.status ?? "missing",
      });
    }),
    row({
      currentHash: input.current.runtimeReleaseGates.summary.releaseGateHash,
      currentScore: input.current.runtimeReleaseGates.summary.releaseGateScore,
      currentStatus: input.current.runtimeReleaseGates.summary.status,
      id: "release-gate-score",
      label: "Release gate score",
      lastApprovedHash: input.lastApproved.runtimeReleaseGates.summary.releaseGateHash,
      lastApprovedScore: input.lastApproved.runtimeReleaseGates.summary.releaseGateScore,
      lastApprovedStatus: input.lastApproved.runtimeReleaseGates.summary.status,
    }),
    row({
      currentHash: input.current.approvalChecklist.summary.approvalHash,
      currentScore: input.current.approvalChecklist.summary.approvalScore,
      currentStatus: input.current.approvalChecklist.summary.status,
      id: "approval-score",
      label: "Approval score",
      lastApprovedHash: input.lastApproved.approvalChecklist.summary.approvalHash,
      lastApprovedScore: input.lastApproved.approvalChecklist.summary.approvalScore,
      lastApprovedStatus: input.lastApproved.approvalChecklist.summary.status,
    }),
    row({
      currentHash: input.current.operatorQueue.summary.queueHash,
      currentScore: input.current.operatorQueue.summary.queueScore,
      currentStatus: input.current.operatorQueue.summary.status,
      id: "queue-score",
      label: "Operator queue score",
      lastApprovedHash: input.lastApproved.operatorQueue.summary.queueHash,
      lastApprovedScore: input.lastApproved.operatorQueue.summary.queueScore,
      lastApprovedStatus: input.lastApproved.operatorQueue.summary.status,
    }),
  ];

  return rows.sort((first, second) => rank(first.change) - rank(second.change) || first.id.localeCompare(second.id));
}

function rank(change: RuntimeReleaseCandidateChange) {
  const ranks: Record<RuntimeReleaseCandidateChange, number> = {
    regressed: 0,
    missing: 1,
    new: 2,
    improved: 3,
    unchanged: 4,
  };

  return ranks[change];
}

function summarize(rows: RuntimeReleaseCandidateComparisonRow[]): RuntimeReleaseCandidateComparison["summary"] {
  const regressionCount = rows.filter((row) => row.change === "regressed").length;
  const missingGateCount = rows.filter((row) => row.change === "missing" && row.id.startsWith("gate:")).length;
  const newGateCount = rows.filter((row) => row.change === "new" && row.id.startsWith("gate:")).length;
  const improvementCount = rows.filter((row) => row.change === "improved").length;
  const unchangedCount = rows.filter((row) => row.change === "unchanged").length;
  const diffCount = rows.length - unchangedCount;
  const status: RuntimeReleaseCandidateComparisonStatus = regressionCount > 0 || missingGateCount > 0 ? "blocked" : diffCount > 0 ? "watch" : "ready";

  return {
    comparisonHash: sha256(rows.map((row) => row.rowHash)),
    comparisonScore: Math.max(0, Math.min(100, Math.round((unchangedCount / Math.max(1, rows.length)) * 100))),
    diffCount,
    improvementCount,
    missingGateCount,
    newGateCount,
    nextAction:
      status === "blocked"
        ? "Resolve release candidate regressions or missing evidence before approval."
        : status === "watch"
          ? "Review changed release candidate evidence before final approval."
          : "Release candidate evidence matches the last approved release.",
    regressionCount,
    status,
    unchangedCount,
  };
}

function createCsv(rows: RuntimeReleaseCandidateComparisonRow[], currentReleaseCandidateId: string, lastApprovedReleaseCandidateId: string) {
  const header = ["comparison_id", "change", "current_candidate", "last_approved_candidate", "current_score", "last_score", "current_hash", "last_hash", "next_action"];
  const body = rows.map((row) =>
    [
      row.id,
      row.change,
      currentReleaseCandidateId,
      lastApprovedReleaseCandidateId,
      row.currentScore,
      row.lastApprovedScore,
      row.currentHash,
      row.lastApprovedHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createRuntimeReleaseCandidateComparison(input: CreateRuntimeReleaseCandidateComparisonInput): RuntimeReleaseCandidateComparison {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows(input);
  const summary = summarize(rows);
  const csvContent = createCsv(rows, input.current.releaseCandidateId, input.lastApproved.releaseCandidateId);
  const jsonContent = JSON.stringify(
    {
      currentReleaseCandidateId: input.current.releaseCandidateId,
      generatedAt,
      lastApprovedReleaseCandidateId: input.lastApproved.releaseCandidateId,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-runtime-release-candidate-comparison-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeDataUri("text/csv", csvContent),
    csvFileName: `${fileBase}.csv`,
    currentReleaseCandidateId: input.current.releaseCandidateId,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeDataUri("application/json", jsonContent),
    jsonFileName: `${fileBase}.json`,
    lastApprovedReleaseCandidateId: input.lastApproved.releaseCandidateId,
    rows,
    summary,
    workspaceId,
  };
}
