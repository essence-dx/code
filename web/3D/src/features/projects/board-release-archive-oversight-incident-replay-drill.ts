import { createHash } from "node:crypto";
import type { BoardReleaseArchiveOversightBoardDistributionDigestReport } from "@/features/projects/board-release-archive-oversight-board-distribution-digest";

export type BoardReleaseArchiveOversightIncidentReplayScenario = "custody-access-failure" | "restore-drift" | "retention-unlock";
export type BoardReleaseArchiveOversightIncidentReplayStatus = "blocked" | "passed" | "watch";

export interface BoardReleaseArchiveOversightIncidentReplayScenarioInput {
  replayEvidenceHash: string | null;
  scenario: BoardReleaseArchiveOversightIncidentReplayScenario;
}

export interface BoardReleaseArchiveOversightIncidentReplayDrillRow {
  drillHash: string;
  drillScore: number;
  id: string;
  nextAction: string;
  replayEvidenceHash: string | null;
  scenario: BoardReleaseArchiveOversightIncidentReplayScenario;
  sourcePacketHash: string;
  status: BoardReleaseArchiveOversightIncidentReplayStatus;
}

export interface BoardReleaseArchiveOversightIncidentReplayDrillReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveOversightIncidentReplayDrillRow[];
  summary: {
    blockedCount: number;
    drillHash: string;
    drillScore: number;
    nextAction: string;
    passedCount: number;
    rowCount: number;
    status: BoardReleaseArchiveOversightIncidentReplayStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveOversightIncidentReplayDrillInput {
  distributionDigest: BoardReleaseArchiveOversightBoardDistributionDigestReport;
  generatedAt?: string;
  scenarios?: BoardReleaseArchiveOversightIncidentReplayScenarioInput[];
  workspaceId?: string;
}

const scenarioRank: Record<BoardReleaseArchiveOversightIncidentReplayScenario, number> = {
  "custody-access-failure": 0,
  "retention-unlock": 1,
  "restore-drift": 2,
};

const statusRank: Record<BoardReleaseArchiveOversightIncidentReplayStatus, number> = {
  blocked: 0,
  watch: 1,
  passed: 2,
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

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
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

function defaultScenarios(input: CreateBoardReleaseArchiveOversightIncidentReplayDrillInput) {
  return (["custody-access-failure", "retention-unlock", "restore-drift"] as const).map((scenario) => ({
    replayEvidenceHash: sha256({
      distributionDigestHash: input.distributionDigest.summary.distributionDigestHash,
      scenario,
    }),
    scenario,
  })) satisfies BoardReleaseArchiveOversightIncidentReplayScenarioInput[];
}

function statusFor(input: {
  distributionStatus: BoardReleaseArchiveOversightBoardDistributionDigestReport["summary"]["status"];
  replayEvidenceHash: string | null;
}) {
  if (input.distributionStatus === "blocked") {
    return "blocked" satisfies BoardReleaseArchiveOversightIncidentReplayStatus;
  }

  if (!input.replayEvidenceHash?.startsWith("sha256:") || input.distributionStatus === "watch") {
    return "watch" satisfies BoardReleaseArchiveOversightIncidentReplayStatus;
  }

  return "passed" satisfies BoardReleaseArchiveOversightIncidentReplayStatus;
}

function nextActionFor(input: {
  distributionStatus: BoardReleaseArchiveOversightBoardDistributionDigestReport["summary"]["status"];
  scenario: BoardReleaseArchiveOversightIncidentReplayScenario;
  status: BoardReleaseArchiveOversightIncidentReplayStatus;
}) {
  if (input.status === "blocked") {
    return `Resolve blocked archive oversight distribution before replaying ${input.scenario}.`;
  }

  if (input.status === "watch") {
    return `Attach complete replay evidence for ${input.scenario}.`;
  }

  return `Keep ${input.scenario} replay drill evidence attached to archive oversight records.`;
}

function createRows(input: CreateBoardReleaseArchiveOversightIncidentReplayDrillInput & { workspaceId: string }) {
  const scenarios = input.scenarios && input.scenarios.length > 0 ? input.scenarios : defaultScenarios(input);
  const sourcePacketHash = input.distributionDigest.summary.distributionDigestHash;

  return scenarios
    .map((entry) => {
      const status = statusFor({
        distributionStatus: input.distributionDigest.summary.status,
        replayEvidenceHash: entry.replayEvidenceHash,
      });
      const drillScore = status === "passed" ? 100 : status === "watch" ? 74 : 36;
      const drillHash = sha256({
        drillScore,
        replayEvidenceHash: entry.replayEvidenceHash,
        scenario: entry.scenario,
        sourcePacketHash,
        status,
      });

      return {
        drillHash,
        drillScore,
        id: `archive-oversight-incident-replay:${slug(input.workspaceId)}:${entry.scenario}`,
        nextAction: nextActionFor({
          distributionStatus: input.distributionDigest.summary.status,
          scenario: entry.scenario,
          status,
        }),
        replayEvidenceHash: entry.replayEvidenceHash,
        scenario: entry.scenario,
        sourcePacketHash,
        status,
      } satisfies BoardReleaseArchiveOversightIncidentReplayDrillRow;
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || scenarioRank[first.scenario] - scenarioRank[second.scenario]);
}

function createCsv(rows: BoardReleaseArchiveOversightIncidentReplayDrillRow[]) {
  const header = ["drill_id", "scenario", "status", "drill_score", "source_packet_hash", "replay_evidence_hash", "drill_hash", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.scenario, entry.status, entry.drillScore, entry.sourcePacketHash, entry.replayEvidenceHash, entry.drillHash, entry.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveOversightIncidentReplayDrillRow[]): BoardReleaseArchiveOversightIncidentReplayDrillReport["summary"] {
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const passedCount = rows.filter((entry) => entry.status === "passed").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const status: BoardReleaseArchiveOversightIncidentReplayStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "passed";
  const nextRow = rows.find((entry) => entry.status === "blocked") ?? rows.find((entry) => entry.status === "watch") ?? rows[0] ?? null;

  return {
    blockedCount,
    drillHash: sha256(rows.map((entry) => entry.drillHash)),
    drillScore: rows.length > 0 ? Math.round(rows.reduce((total, entry) => total + entry.drillScore, 0) / rows.length) : 100,
    nextAction: status === "passed" ? "Archive oversight incident replay drill is passed." : (nextRow?.nextAction ?? "Review archive oversight incident replay drill."),
    passedCount,
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveOversightIncidentReplayDrillRow[];
  summary: BoardReleaseArchiveOversightIncidentReplayDrillReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveOversightIncidentReplayDrill(
  input: CreateBoardReleaseArchiveOversightIncidentReplayDrillInput,
): BoardReleaseArchiveOversightIncidentReplayDrillReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.distributionDigest.workspaceId;
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-oversight-incident-replay-drill-${dateStamp(generatedAt)}`;

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
