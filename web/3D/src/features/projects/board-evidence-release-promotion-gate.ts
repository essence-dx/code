import type { BoardEvidenceCloseoutReport, BoardEvidenceCloseoutStatus } from "@/features/projects/board-evidence-closeout-report";
import type { BoardEvidenceEscalationRoutingReport } from "@/features/projects/board-evidence-escalation-routing";
import type { BoardEvidencePacketLockReport } from "@/features/projects/board-evidence-packet-lock";
import type {
  BoardEvidenceReleaseApprovalHandoffReport,
  BoardEvidenceReleaseApprovalHandoffStatus,
} from "@/features/projects/board-evidence-release-approval-handoff";

export type BoardEvidenceReleasePromotionGateStatus = "blocked" | "ready" | "watch";
export type BoardEvidenceReleasePromotionGateId = "closeout-export" | "escalation-routing" | "approval-handoff" | "packet-lock";

export interface BoardEvidenceReleasePromotionGate {
  evidence: string;
  id: BoardEvidenceReleasePromotionGateId;
  nextAction: string;
  promotionBlocker: boolean;
  score: number;
  status: BoardEvidenceReleasePromotionGateStatus;
  title: string;
}

export interface BoardEvidenceReleasePromotionGateReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  gates: BoardEvidenceReleasePromotionGate[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releasePromotionId: string | null;
  summary: {
    blockerCount: number;
    gateCount: number;
    gateScore: number;
    nextAction: string;
    promotionAllowed: boolean;
    readyCount: number;
    status: BoardEvidenceReleasePromotionGateStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardEvidenceReleasePromotionGateReportInput {
  closeout: BoardEvidenceCloseoutReport;
  escalationRouting: BoardEvidenceEscalationRoutingReport | null;
  generatedAt?: string;
  handoff: BoardEvidenceReleaseApprovalHandoffReport;
  packetLock: BoardEvidencePacketLockReport;
  releasePromotionId?: string | null;
  workspaceId?: string;
}

const statusRank: Record<BoardEvidenceReleasePromotionGateStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const gateRank: Record<BoardEvidenceReleasePromotionGateId, number> = {
  "closeout-export": 0,
  "packet-lock": 1,
  "escalation-routing": 2,
  "approval-handoff": 3,
};

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

function csvCell(value: string | number | boolean | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function statusFromCloseout(value: BoardEvidenceCloseoutStatus): BoardEvidenceReleasePromotionGateStatus {
  return value === "blocked" ? "blocked" : value === "watch" ? "watch" : "ready";
}

function statusFromHandoff(value: BoardEvidenceReleaseApprovalHandoffStatus): BoardEvidenceReleasePromotionGateStatus {
  return value === "blocked" ? "blocked" : value === "watch" ? "watch" : "ready";
}

function scoreForStatus(status: BoardEvidenceReleasePromotionGateStatus, sourceScore: number) {
  if (status === "blocked") {
    return Math.min(sourceScore, 50);
  }

  if (status === "watch") {
    return Math.min(Math.max(sourceScore, 60), 89);
  }

  return Math.max(sourceScore, 90);
}

function closeoutGate(closeout: BoardEvidenceCloseoutReport): BoardEvidenceReleasePromotionGate {
  const hasExports = Boolean(closeout.csvFileName && closeout.jsonFileName);
  const status = hasExports ? statusFromCloseout(closeout.summary.status) : "blocked";

  return {
    evidence: hasExports ? `${closeout.csvFileName}; ${closeout.jsonFileName}` : "Missing closeout CSV/JSON exports.",
    id: "closeout-export",
    nextAction: hasExports ? closeout.summary.nextAction : "Generate closeout CSV and JSON exports before promotion.",
    promotionBlocker: status === "blocked",
    score: scoreForStatus(status, closeout.summary.closeoutScore),
    status,
    title: "Closeout exports",
  };
}

function packetLockGate(packetLock: BoardEvidencePacketLockReport): BoardEvidenceReleasePromotionGate {
  const status: BoardEvidenceReleasePromotionGateStatus = packetLock.summary.promotionBlocked
    ? "blocked"
    : packetLock.summary.status === "partial"
      ? "watch"
      : "ready";

  return {
    evidence: `${packetLock.summary.lockedCount ?? 0}/${packetLock.summary.taskCount ?? 0} rows locked.`,
    id: "packet-lock",
    nextAction: packetLock.summary.nextAction,
    promotionBlocker: status === "blocked",
    score: scoreForStatus(status, packetLock.summary.lockScore),
    status,
    title: "Packet lock",
  };
}

function escalationGate(escalationRouting: BoardEvidenceEscalationRoutingReport | null): BoardEvidenceReleasePromotionGate {
  if (!escalationRouting) {
    return {
      evidence: "No board evidence escalation routing report is attached.",
      id: "escalation-routing",
      nextAction: "Create escalation routing before promotion.",
      promotionBlocker: true,
      score: 0,
      status: "blocked",
      title: "Escalation routing",
    };
  }

  const status: BoardEvidenceReleasePromotionGateStatus =
    escalationRouting.summary.criticalCount > 0 ? "blocked" : escalationRouting.summary.warningCount > 0 ? "watch" : "ready";

  return {
    evidence: `${escalationRouting.summary.eligibleRouteCount} eligible routes; ${escalationRouting.summary.criticalCount} critical escalations.`,
    id: "escalation-routing",
    nextAction: escalationRouting.summary.nextAction,
    promotionBlocker: status === "blocked",
    score: scoreForStatus(status, escalationRouting.summary.routingScore),
    status,
    title: "Escalation routing",
  };
}

function handoffGate(handoff: BoardEvidenceReleaseApprovalHandoffReport): BoardEvidenceReleasePromotionGate {
  const status = statusFromHandoff(handoff.summary.status);

  return {
    evidence: `${handoff.summary.signerCount} signers; ${handoff.summary.dependencyBlockerCount} dependency blockers.`,
    id: "approval-handoff",
    nextAction: handoff.summary.nextAction,
    promotionBlocker: status === "blocked",
    score: scoreForStatus(status, handoff.summary.handoffScore),
    status,
    title: "Approval handoff",
  };
}

function createGates(input: CreateBoardEvidenceReleasePromotionGateReportInput) {
  return [closeoutGate(input.closeout), packetLockGate(input.packetLock), escalationGate(input.escalationRouting), handoffGate(input.handoff)].sort(
    (first, second) => statusRank[first.status] - statusRank[second.status] || gateRank[first.id] - gateRank[second.id],
  );
}

function summarize(gates: BoardEvidenceReleasePromotionGate[]): BoardEvidenceReleasePromotionGateReport["summary"] {
  const blockerCount = gates.filter((gate) => gate.promotionBlocker).length;
  const watchCount = gates.filter((gate) => gate.status === "watch").length;
  const readyCount = gates.filter((gate) => gate.status === "ready").length;
  const firstBlocker = gates.find((gate) => gate.promotionBlocker) ?? null;
  const firstWatch = gates.find((gate) => gate.status === "watch") ?? null;
  const gateScore = gates.length > 0 ? Math.max(0, Math.round(gates.reduce((sum, gate) => sum + gate.score, 0) / gates.length) - blockerCount * 20) : 100;

  return {
    blockerCount,
    gateCount: gates.length,
    gateScore,
    nextAction: firstBlocker?.nextAction ?? firstWatch?.nextAction ?? "Release promotion gate is open.",
    promotionAllowed: blockerCount === 0,
    readyCount,
    status: blockerCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready",
    watchCount,
  };
}

function createCsv(gates: BoardEvidenceReleasePromotionGate[]) {
  const header = ["gate_id", "status", "score", "promotion_blocker", "evidence", "next_action"];
  const body = gates.map((gate) => [gate.id, gate.status, gate.score, gate.promotionBlocker, gate.evidence, gate.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  gates: BoardEvidenceReleasePromotionGate[];
  generatedAt: string;
  releasePromotionId: string | null;
  summary: BoardEvidenceReleasePromotionGateReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      gates: input.gates,
      generatedAt: input.generatedAt,
      releasePromotionId: input.releasePromotionId,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardEvidenceReleasePromotionGateReport(input: CreateBoardEvidenceReleasePromotionGateReportInput): BoardEvidenceReleasePromotionGateReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.closeout.workspaceId;
  const releasePromotionId = input.releasePromotionId ?? input.handoff.releasePromotionId ?? input.packetLock.releasePromotionId ?? null;
  const gates = createGates(input);
  const summary = summarize(gates);
  const csvContent = createCsv(gates);
  const jsonContent = createJson({
    gates,
    generatedAt,
    releasePromotionId,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-evidence-release-promotion-gate-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    gates,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    releasePromotionId,
    summary,
    workspaceId,
  };
}
