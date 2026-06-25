import { createHash } from "node:crypto";
import type { BoardReleaseArchiveAnomalyReviewReport } from "@/features/projects/board-release-archive-anomaly-review";
import type {
  BoardReleaseArchiveIntelligenceIndexOutcome,
  BoardReleaseArchiveIntelligenceIndexReport,
} from "@/features/projects/board-release-archive-intelligence-index";
import type { BoardReleaseArchiveTrendDigestReport } from "@/features/projects/board-release-archive-trend-digest";
import type { BoardReleaseCloseoutReadinessGateStatus } from "@/features/projects/board-release-closeout-readiness-gates";

export type BoardReleaseArchiveReplayDecision = "approve" | "defer" | "hold";
export type BoardReleaseArchiveReplayOutcome = "changed" | "unchanged";
export type BoardReleaseArchiveReplayScenarioKind = "anomaly-adjusted" | "evidence-clean" | "trend-adjusted";

export interface BoardReleaseArchiveReplayScenario {
  archiveBundleHash: string;
  evidenceHash: string;
  nextAction: string;
  originalDecision: BoardReleaseArchiveIntelligenceIndexOutcome;
  outcome: BoardReleaseArchiveReplayOutcome;
  replayDecision: BoardReleaseArchiveReplayDecision;
  scenarioHash: string;
  scenarioId: string;
  scenarioKind: BoardReleaseArchiveReplayScenarioKind;
  scoreDelta: number;
  simulatedScore: number;
  status: BoardReleaseCloseoutReadinessGateStatus;
  title: string;
  workspaceId: string;
}

export interface BoardReleaseArchiveReplaySimulatorReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  scenarios: BoardReleaseArchiveReplayScenario[];
  summary: {
    approveCount: number;
    changedCount: number;
    deferCount: number;
    holdCount: number;
    nextAction: string;
    replayHash: string;
    scenarioCount: number;
    status: BoardReleaseCloseoutReadinessGateStatus;
    unchangedCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveReplaySimulatorReportInput {
  anomalyReview: BoardReleaseArchiveAnomalyReviewReport;
  generatedAt?: string;
  index: BoardReleaseArchiveIntelligenceIndexReport;
  trendDigest: BoardReleaseArchiveTrendDigestReport;
  workspaceId?: string;
}

const scenarioRank: Record<BoardReleaseArchiveReplayScenarioKind, number> = {
  "anomaly-adjusted": 0,
  "trend-adjusted": 1,
  "evidence-clean": 2,
};

const statusRank: Record<BoardReleaseCloseoutReadinessGateStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
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

function scenarioId(input: {
  generatedAt: string;
  scenarioKind: BoardReleaseArchiveReplayScenarioKind;
  title: string;
  workspaceId: string;
}) {
  return `board-release-archive-replay:${slug(input.workspaceId)}:${input.scenarioKind}:${slug(input.title)}:${dateStamp(input.generatedAt)}`;
}

function originalDecisionToReplayDecision(originalDecision: BoardReleaseArchiveIntelligenceIndexOutcome): BoardReleaseArchiveReplayDecision {
  if (originalDecision === "approved") {
    return "approve";
  }

  return originalDecision === "deferred" ? "defer" : "hold";
}

function replayStatus(decision: BoardReleaseArchiveReplayDecision): BoardReleaseCloseoutReadinessGateStatus {
  if (decision === "approve") {
    return "ready";
  }

  return decision === "defer" ? "watch" : "blocked";
}

function decisionForEvidence(input: {
  blockedSignals: number;
  score: number;
  watchSignals: number;
}): BoardReleaseArchiveReplayDecision {
  if (input.blockedSignals > 0 || input.score < 60) {
    return "hold";
  }

  if (input.watchSignals > 0 || input.score < 85) {
    return "defer";
  }

  return "approve";
}

function createScenario(
  input: Omit<BoardReleaseArchiveReplayScenario, "outcome" | "scenarioHash" | "scenarioId" | "status"> & { generatedAt: string },
): BoardReleaseArchiveReplayScenario {
  const id = scenarioId({
    generatedAt: input.generatedAt,
    scenarioKind: input.scenarioKind,
    title: input.title,
    workspaceId: input.workspaceId,
  });
  const outcome = originalDecisionToReplayDecision(input.originalDecision) === input.replayDecision ? "unchanged" : "changed";
  const status = replayStatus(input.replayDecision);
  const scenarioHash = sha256({
    archiveBundleHash: input.archiveBundleHash,
    evidenceHash: input.evidenceHash,
    id,
    originalDecision: input.originalDecision,
    replayDecision: input.replayDecision,
    scoreDelta: input.scoreDelta,
    simulatedScore: input.simulatedScore,
    status,
  });

  return {
    archiveBundleHash: input.archiveBundleHash,
    evidenceHash: input.evidenceHash,
    nextAction: input.nextAction,
    originalDecision: input.originalDecision,
    outcome,
    replayDecision: input.replayDecision,
    scenarioHash,
    scenarioId: id,
    scenarioKind: input.scenarioKind,
    scoreDelta: input.scoreDelta,
    simulatedScore: input.simulatedScore,
    status,
    title: input.title,
    workspaceId: input.workspaceId,
  };
}

function averageIndexScore(index: BoardReleaseArchiveIntelligenceIndexReport) {
  return index.rows.length > 0 ? Math.round(index.rows.reduce((sum, row) => sum + row.score, 0) / index.rows.length) : 100;
}

function primaryOriginalDecision(index: BoardReleaseArchiveIntelligenceIndexReport): BoardReleaseArchiveIntelligenceIndexOutcome {
  const mostSevereRow = [...index.rows].sort((first, second) => statusRank[first.status] - statusRank[second.status] || first.score - second.score)[0];

  return mostSevereRow?.finalDecisionOutcome ?? "approved";
}

function primaryArchiveHash(index: BoardReleaseArchiveIntelligenceIndexReport) {
  return index.rows[0]?.archiveBundleHash ?? index.summary.intelligenceHash;
}

function createScenarios(input: CreateBoardReleaseArchiveReplaySimulatorReportInput & { generatedAt: string; workspaceId: string }) {
  const originalDecision = primaryOriginalDecision(input.index);
  const baseScore = averageIndexScore(input.index);
  const archiveBundleHash = primaryArchiveHash(input.index);
  const anomalyScore = clampScore(
    baseScore - input.anomalyReview.summary.criticalCount * 8 - input.anomalyReview.summary.watchCount * 4,
  );
  const trendScore = clampScore(input.trendDigest.summary.trendScore + input.trendDigest.summary.closeoutScoreMovement / 2);
  const cleanedScore = clampScore(
    input.trendDigest.summary.trendScore +
      input.anomalyReview.summary.criticalCount * 10 +
      input.anomalyReview.summary.watchCount * 5 +
      input.trendDigest.summary.recurringBlockerCategoryCount * 8,
  );

  return [
    createScenario({
      archiveBundleHash,
      evidenceHash: sha256({
        intelligenceHash: input.index.summary.intelligenceHash,
        reviewHash: input.anomalyReview.summary.reviewHash,
      }),
      generatedAt: input.generatedAt,
      nextAction:
        anomalyScore < 60
          ? "Keep the prior board decision held until critical anomaly evidence is remediated."
          : "Replay confirms the anomaly-adjusted decision can move to board review.",
      originalDecision,
      replayDecision: decisionForEvidence({
        blockedSignals: input.anomalyReview.summary.blockedCount,
        score: anomalyScore,
        watchSignals: input.anomalyReview.summary.watchCount,
      }),
      scenarioKind: "anomaly-adjusted",
      scoreDelta: anomalyScore - baseScore,
      simulatedScore: anomalyScore,
      title: "Anomaly-adjusted replay",
      workspaceId: input.workspaceId,
    }),
    createScenario({
      archiveBundleHash,
      evidenceHash: input.trendDigest.summary.digestHash,
      generatedAt: input.generatedAt,
      nextAction:
        trendScore < 60
          ? "Treat the trend-adjusted replay as a hold signal until score decline stabilizes."
          : "Trend-adjusted replay is stable enough for deferred board review.",
      originalDecision,
      replayDecision: decisionForEvidence({
        blockedSignals: input.trendDigest.summary.blockedCount,
        score: trendScore,
        watchSignals: input.trendDigest.summary.watchCount,
      }),
      scenarioKind: "trend-adjusted",
      scoreDelta: trendScore - baseScore,
      simulatedScore: trendScore,
      title: "Trend-adjusted replay",
      workspaceId: input.workspaceId,
    }),
    createScenario({
      archiveBundleHash,
      evidenceHash: sha256({
        digestHash: input.trendDigest.summary.digestHash,
        reviewHash: input.anomalyReview.summary.reviewHash,
        simulation: "evidence-clean",
      }),
      generatedAt: input.generatedAt,
      nextAction:
        cleanedScore >= 85
          ? "Document that remediated evidence would have changed the prior board decision to approval."
          : "Use the clean-evidence replay as the next remediation target for board review.",
      originalDecision,
      replayDecision: decisionForEvidence({
        blockedSignals: 0,
        score: cleanedScore,
        watchSignals: cleanedScore >= 85 ? 0 : 1,
      }),
      scenarioKind: "evidence-clean",
      scoreDelta: cleanedScore - baseScore,
      simulatedScore: cleanedScore,
      title: "Clean-evidence replay",
      workspaceId: input.workspaceId,
    }),
  ].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      scenarioRank[first.scenarioKind] - scenarioRank[second.scenarioKind] ||
      first.title.localeCompare(second.title),
  );
}

function summarize(scenarios: BoardReleaseArchiveReplayScenario[]): BoardReleaseArchiveReplaySimulatorReport["summary"] {
  const changedCount = scenarios.filter((scenario) => scenario.outcome === "changed").length;
  const holdCount = scenarios.filter((scenario) => scenario.replayDecision === "hold").length;
  const deferCount = scenarios.filter((scenario) => scenario.replayDecision === "defer").length;
  const approveCount = scenarios.filter((scenario) => scenario.replayDecision === "approve").length;
  const firstChanged = scenarios.find((scenario) => scenario.outcome === "changed") ?? null;

  return {
    approveCount,
    changedCount,
    deferCount,
    holdCount,
    nextAction: firstChanged?.nextAction ?? "Replay simulator confirms later evidence would not change the prior board decision.",
    replayHash: sha256(scenarios.map((scenario) => scenario.scenarioHash)),
    scenarioCount: scenarios.length,
    status: holdCount > 0 ? "blocked" : deferCount > 0 ? "watch" : "ready",
    unchangedCount: scenarios.length - changedCount,
  };
}

function createCsv(scenarios: BoardReleaseArchiveReplayScenario[]) {
  const header = [
    "scenario_id",
    "scenario_kind",
    "title",
    "status",
    "original_decision",
    "replay_decision",
    "outcome",
    "simulated_score",
    "score_delta",
    "evidence_hash",
    "archive_bundle_hash",
    "scenario_hash",
    "next_action",
  ];
  const body = scenarios.map((scenario) =>
    [
      scenario.scenarioId,
      scenario.scenarioKind,
      scenario.title,
      scenario.status,
      scenario.originalDecision,
      scenario.replayDecision,
      scenario.outcome,
      scenario.simulatedScore,
      scenario.scoreDelta,
      scenario.evidenceHash,
      scenario.archiveBundleHash,
      scenario.scenarioHash,
      scenario.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  scenarios: BoardReleaseArchiveReplayScenario[];
  summary: BoardReleaseArchiveReplaySimulatorReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      scenarios: input.scenarios,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseArchiveReplaySimulatorReport(
  input: CreateBoardReleaseArchiveReplaySimulatorReportInput,
): BoardReleaseArchiveReplaySimulatorReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.index.workspaceId;
  const scenarios = createScenarios({
    ...input,
    generatedAt,
    workspaceId,
  });
  const summary = summarize(scenarios);
  const csvContent = createCsv(scenarios);
  const jsonContent = createJson({
    generatedAt,
    scenarios,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-replay-simulator-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    scenarios,
    summary,
    workspaceId,
  };
}
