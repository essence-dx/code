import { createHash } from "node:crypto";
import type {
  BoardReleaseArchiveGovernanceExceptionQuorumTrackerReport,
  BoardReleaseArchiveGovernanceExceptionQuorumTrackerRow,
} from "@/features/projects/board-release-archive-governance-exception-quorum-tracker";
import type { BoardReleaseArchiveGovernancePolicyCharterKind } from "@/features/projects/board-release-archive-governance-policy-charter";

export type BoardReleaseArchiveGovernancePolicyDriftMonitorStatus = "aligned" | "blocked" | "watch";

export interface BoardReleaseArchiveGovernancePolicyDriftMonitorOverride {
  activeRule: string;
  kind: BoardReleaseArchiveGovernancePolicyCharterKind;
  recommendation: string;
}

export interface BoardReleaseArchiveGovernancePolicyDriftMonitorRow {
  activeRule: string;
  driftHash: string;
  driftScore: number;
  id: string;
  kind: BoardReleaseArchiveGovernancePolicyCharterKind;
  nextAction: string;
  quorumHash: string;
  recommendation: string;
  status: BoardReleaseArchiveGovernancePolicyDriftMonitorStatus;
  title: string;
}

export interface BoardReleaseArchiveGovernancePolicyDriftMonitorReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveGovernancePolicyDriftMonitorRow[];
  summary: {
    alignedCount: number;
    blockedCount: number;
    driftHash: string;
    driftScore: number;
    nextAction: string;
    rowCount: number;
    status: BoardReleaseArchiveGovernancePolicyDriftMonitorStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveGovernancePolicyDriftMonitorInput {
  driftOverrides?: BoardReleaseArchiveGovernancePolicyDriftMonitorOverride[];
  generatedAt?: string;
  quorumTracker: BoardReleaseArchiveGovernanceExceptionQuorumTrackerReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveGovernancePolicyCharterKind, number> = {
  "decision-rights": 0,
  "approval-policy": 1,
  "risk-acceptance": 2,
  "release-authority": 3,
};

const statusRank: Record<BoardReleaseArchiveGovernancePolicyDriftMonitorStatus, number> = {
  blocked: 0,
  watch: 1,
  aligned: 2,
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

function defaultPolicy(input: { row: BoardReleaseArchiveGovernanceExceptionQuorumTrackerRow }) {
  if (input.row.status === "blocked") {
    return {
      activeRule: "Block archive release when governance quorum is blocked.",
      recommendation: `BLOCK archive release until ${input.row.title} quorum is repaired.`,
    };
  }

  if (input.row.status === "watch") {
    return {
      activeRule: "Watch archive release when governance quorum has renewal pressure.",
      recommendation: `WATCH archive release while ${input.row.title} quorum renewal pressure is active.`,
    };
  }

  return {
    activeRule: "Approve archive release when governance quorum is approved.",
    recommendation: `APPROVE archive release with ${input.row.title} quorum aligned.`,
  };
}

function expectedVerb(status: BoardReleaseArchiveGovernanceExceptionQuorumTrackerRow["status"]) {
  if (status === "blocked") {
    return "BLOCK";
  }

  return status === "watch" ? "WATCH" : "APPROVE";
}

function statusFor(input: {
  activeRule: string;
  quorumStatus: BoardReleaseArchiveGovernanceExceptionQuorumTrackerRow["status"];
  recommendation: string;
}) {
  const verb = expectedVerb(input.quorumStatus);
  const hasVerb = input.recommendation.trim().toUpperCase().startsWith(verb);
  const hasRule = input.activeRule.trim().length > 0;

  if (!hasRule || input.quorumStatus === "blocked" || (!hasVerb && input.recommendation.trim().toUpperCase().startsWith("BLOCK"))) {
    return "blocked" satisfies BoardReleaseArchiveGovernancePolicyDriftMonitorStatus;
  }

  if (!hasVerb || input.quorumStatus === "watch") {
    return "watch" satisfies BoardReleaseArchiveGovernancePolicyDriftMonitorStatus;
  }

  return "aligned" satisfies BoardReleaseArchiveGovernancePolicyDriftMonitorStatus;
}

function scoreFor(input: {
  activeRule: string;
  recommendation: string;
  status: BoardReleaseArchiveGovernancePolicyDriftMonitorStatus;
}) {
  if (input.status === "aligned") {
    return 100;
  }

  const rulePenalty = input.activeRule.trim().length === 0 ? 35 : 0;
  const recommendationPenalty = input.recommendation.trim().length === 0 ? 35 : 0;
  const statusPenalty = input.status === "blocked" ? 35 : 15;

  return Math.max(0, Math.round(100 - rulePenalty - recommendationPenalty - statusPenalty));
}

function nextActionFor(input: {
  status: BoardReleaseArchiveGovernancePolicyDriftMonitorStatus;
  title: string;
}) {
  if (input.status === "blocked") {
    return `Repair blocked archive governance policy drift for ${input.title}.`;
  }

  if (input.status === "watch") {
    return `Monitor archive governance policy drift for ${input.title}.`;
  }

  return `Keep archive governance policy drift aligned for ${input.title}.`;
}

function createRows(input: CreateBoardReleaseArchiveGovernancePolicyDriftMonitorInput & { workspaceId: string }) {
  const overrides = new Map((input.driftOverrides ?? []).map((entry) => [entry.kind, entry]));

  return input.quorumTracker.rows
    .map((entry) => {
      const defaults = defaultPolicy({ row: entry });
      const override = overrides.get(entry.kind);
      const activeRule = override?.activeRule ?? defaults.activeRule;
      const recommendation = override?.recommendation ?? defaults.recommendation;
      const status = statusFor({
        activeRule,
        quorumStatus: entry.status,
        recommendation,
      });
      const driftScore = scoreFor({
        activeRule,
        recommendation,
        status,
      });
      const driftHash = sha256({
        activeRule,
        driftScore,
        kind: entry.kind,
        quorumHash: entry.quorumHash,
        recommendation,
        status,
      });

      return {
        activeRule,
        driftHash,
        driftScore,
        id: `archive-governance-policy-drift:${slug(input.workspaceId)}:${entry.kind}`,
        kind: entry.kind,
        nextAction: nextActionFor({
          status,
          title: entry.title,
        }),
        quorumHash: entry.quorumHash,
        recommendation,
        status,
        title: entry.title,
      } satisfies BoardReleaseArchiveGovernancePolicyDriftMonitorRow;
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || kindRank[first.kind] - kindRank[second.kind] || first.title.localeCompare(second.title));
}

function createCsv(rows: BoardReleaseArchiveGovernancePolicyDriftMonitorRow[]) {
  const header = ["drift_id", "kind", "title", "status", "active_rule", "recommendation", "drift_score", "drift_hash", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.kind, entry.title, entry.status, entry.activeRule, entry.recommendation, entry.driftScore, entry.driftHash, entry.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveGovernancePolicyDriftMonitorRow[]): BoardReleaseArchiveGovernancePolicyDriftMonitorReport["summary"] {
  const alignedCount = rows.filter((entry) => entry.status === "aligned").length;
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const status: BoardReleaseArchiveGovernancePolicyDriftMonitorStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "aligned";
  const nextRow = rows.find((entry) => entry.status === "blocked") ?? rows.find((entry) => entry.status === "watch") ?? rows[0] ?? null;

  return {
    alignedCount,
    blockedCount,
    driftHash: sha256(rows.map((entry) => entry.driftHash)),
    driftScore: rows.length > 0 ? Math.round(rows.reduce((total, entry) => total + entry.driftScore, 0) / rows.length) : 100,
    nextAction: status === "aligned" ? "Archive governance policy drift monitor is aligned." : (nextRow?.nextAction ?? "Review archive governance policy drift monitor."),
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveGovernancePolicyDriftMonitorRow[];
  summary: BoardReleaseArchiveGovernancePolicyDriftMonitorReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveGovernancePolicyDriftMonitor(
  input: CreateBoardReleaseArchiveGovernancePolicyDriftMonitorInput,
): BoardReleaseArchiveGovernancePolicyDriftMonitorReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.quorumTracker.workspaceId;
  const rows = createRows({
    ...input,
    workspaceId,
  });
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-governance-policy-drift-monitor-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    rows,
    summary,
    workspaceId,
  };
}
