import { createHash } from "node:crypto";
import type { BoardReleaseArchiveAnomalyReviewReport } from "@/features/projects/board-release-archive-anomaly-review";
import type { BoardReleaseArchiveIntelligenceIndexReport } from "@/features/projects/board-release-archive-intelligence-index";
import type { BoardReleaseArchiveReplaySimulatorReport } from "@/features/projects/board-release-archive-replay-simulator";
import type { BoardReleaseArchiveTrendDigestReport } from "@/features/projects/board-release-archive-trend-digest";
import type { BoardReleaseCloseoutReadinessGateStatus } from "@/features/projects/board-release-closeout-readiness-gates";

export type BoardReleaseArchiveIntelligencePacketSectionKind = "anomaly" | "governance" | "index" | "replay" | "trend";
export type BoardReleaseArchiveIntelligencePacketRecommendationKind =
  | "decision-control"
  | "governance-update"
  | "remediate-anomaly"
  | "stabilize-trend";

export interface BoardReleaseArchiveIntelligencePacketSection {
  evidenceHash: string;
  nextAction: string;
  score: number;
  sectionHash: string;
  sectionId: string;
  sectionKind: BoardReleaseArchiveIntelligencePacketSectionKind;
  status: BoardReleaseCloseoutReadinessGateStatus;
  summary: string;
  title: string;
  workspaceId: string;
}

export interface BoardReleaseArchiveIntelligencePacketRecommendation {
  action: string;
  evidenceHash: string;
  priority: "high" | "low" | "medium";
  recommendationHash: string;
  recommendationId: string;
  recommendationKind: BoardReleaseArchiveIntelligencePacketRecommendationKind;
  status: BoardReleaseCloseoutReadinessGateStatus;
  title: string;
  workspaceId: string;
}

export interface BoardReleaseArchiveIntelligencePacketReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  executiveMemo: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  recommendations: BoardReleaseArchiveIntelligencePacketRecommendation[];
  sections: BoardReleaseArchiveIntelligencePacketSection[];
  summary: {
    blockedRecommendationCount: number;
    blockedSectionCount: number;
    governanceUpdateCount: number;
    nextAction: string;
    packetHash: string;
    packetScore: number;
    recommendationCount: number;
    sectionCount: number;
    status: BoardReleaseCloseoutReadinessGateStatus;
    watchRecommendationCount: number;
    watchSectionCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveIntelligencePacketReportInput {
  anomalyReview: BoardReleaseArchiveAnomalyReviewReport;
  generatedAt?: string;
  index: BoardReleaseArchiveIntelligenceIndexReport;
  replaySimulator: BoardReleaseArchiveReplaySimulatorReport;
  trendDigest: BoardReleaseArchiveTrendDigestReport;
  workspaceId?: string;
}

const sectionRank: Record<BoardReleaseArchiveIntelligencePacketSectionKind, number> = {
  index: 0,
  anomaly: 1,
  trend: 2,
  replay: 3,
  governance: 4,
};

const statusRank: Record<BoardReleaseCloseoutReadinessGateStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const priorityRank: Record<BoardReleaseArchiveIntelligencePacketRecommendation["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const recommendationKindRank: Record<BoardReleaseArchiveIntelligencePacketRecommendationKind, number> = {
  "remediate-anomaly": 0,
  "stabilize-trend": 1,
  "decision-control": 2,
  "governance-update": 3,
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

function sectionId(input: {
  generatedAt: string;
  sectionKind: BoardReleaseArchiveIntelligencePacketSectionKind;
  workspaceId: string;
}) {
  return `board-release-archive-intelligence-packet:${slug(input.workspaceId)}:${input.sectionKind}:${dateStamp(input.generatedAt)}`;
}

function recommendationId(input: {
  generatedAt: string;
  recommendationKind: BoardReleaseArchiveIntelligencePacketRecommendationKind;
  title: string;
  workspaceId: string;
}) {
  return `board-release-archive-intelligence-recommendation:${slug(input.workspaceId)}:${input.recommendationKind}:${slug(input.title)}:${dateStamp(input.generatedAt)}`;
}

function createSection(input: Omit<BoardReleaseArchiveIntelligencePacketSection, "sectionHash" | "sectionId"> & { generatedAt: string }) {
  const id = sectionId({
    generatedAt: input.generatedAt,
    sectionKind: input.sectionKind,
    workspaceId: input.workspaceId,
  });
  const sectionHash = sha256({
    evidenceHash: input.evidenceHash,
    id,
    score: input.score,
    sectionKind: input.sectionKind,
    status: input.status,
    summary: input.summary,
  });

  return {
    evidenceHash: input.evidenceHash,
    nextAction: input.nextAction,
    score: input.score,
    sectionHash,
    sectionId: id,
    sectionKind: input.sectionKind,
    status: input.status,
    summary: input.summary,
    title: input.title,
    workspaceId: input.workspaceId,
  };
}

function createRecommendation(
  input: Omit<BoardReleaseArchiveIntelligencePacketRecommendation, "recommendationHash" | "recommendationId"> & {
    generatedAt: string;
  },
) {
  const id = recommendationId({
    generatedAt: input.generatedAt,
    recommendationKind: input.recommendationKind,
    title: input.title,
    workspaceId: input.workspaceId,
  });
  const recommendationHash = sha256({
    action: input.action,
    evidenceHash: input.evidenceHash,
    id,
    priority: input.priority,
    recommendationKind: input.recommendationKind,
    status: input.status,
  });

  return {
    action: input.action,
    evidenceHash: input.evidenceHash,
    priority: input.priority,
    recommendationHash,
    recommendationId: id,
    recommendationKind: input.recommendationKind,
    status: input.status,
    title: input.title,
    workspaceId: input.workspaceId,
  };
}

function createSections(input: CreateBoardReleaseArchiveIntelligencePacketReportInput & { generatedAt: string; workspaceId: string }) {
  const indexScore = clampScore(
    (input.index.summary.readyCount / Math.max(input.index.summary.indexCount, 1)) * 100 -
      input.index.summary.blockedCount * 18 -
      input.index.summary.watchCount * 8,
  );
  const anomalyScore = clampScore(100 - input.anomalyReview.summary.criticalCount * 10 - input.anomalyReview.summary.watchCount * 5);
  const governanceScore = clampScore(
    (indexScore + anomalyScore + input.trendDigest.summary.trendScore) / 3 -
      input.replaySimulator.summary.changedCount * 12 -
      input.replaySimulator.summary.holdCount * 6,
  );

  return [
    createSection({
      evidenceHash: input.index.summary.intelligenceHash,
      generatedAt: input.generatedAt,
      nextAction: input.index.summary.nextAction,
      score: indexScore,
      sectionKind: "index",
      status: input.index.summary.status,
      summary: `${input.index.summary.indexCount} archive intelligence rows with ${input.index.summary.heldCount} held, ${input.index.summary.deferredCount} deferred, and ${input.index.summary.approvedCount} approved outcomes.`,
      title: "Archive intelligence index",
      workspaceId: input.workspaceId,
    }),
    createSection({
      evidenceHash: input.anomalyReview.summary.reviewHash,
      generatedAt: input.generatedAt,
      nextAction: input.anomalyReview.summary.nextAction,
      score: anomalyScore,
      sectionKind: "anomaly",
      status: input.anomalyReview.summary.status,
      summary: `${input.anomalyReview.summary.findingCount} anomaly findings with ${input.anomalyReview.summary.criticalCount} critical and ${input.anomalyReview.summary.blockedCount} blocked.`,
      title: "Archive anomaly review",
      workspaceId: input.workspaceId,
    }),
    createSection({
      evidenceHash: input.trendDigest.summary.digestHash,
      generatedAt: input.generatedAt,
      nextAction: input.trendDigest.summary.nextAction,
      score: input.trendDigest.summary.trendScore,
      sectionKind: "trend",
      status: input.trendDigest.summary.status,
      summary: `${input.trendDigest.summary.rowCount} trend rows with ${input.trendDigest.summary.closeoutScoreMovement} closeout score movement and ${input.trendDigest.summary.recurringBlockerCategoryCount} recurring blocker categories.`,
      title: "Archive trend digest",
      workspaceId: input.workspaceId,
    }),
    createSection({
      evidenceHash: input.replaySimulator.summary.replayHash,
      generatedAt: input.generatedAt,
      nextAction: input.replaySimulator.summary.nextAction,
      score: clampScore(100 - input.replaySimulator.summary.changedCount * 22 - input.replaySimulator.summary.holdCount * 9),
      sectionKind: "replay",
      status: input.replaySimulator.summary.status,
      summary: `${input.replaySimulator.summary.scenarioCount} replay scenarios with ${input.replaySimulator.summary.changedCount} changed decisions and ${input.replaySimulator.summary.holdCount} hold outcomes.`,
      title: "Archive replay simulator",
      workspaceId: input.workspaceId,
    }),
    createSection({
      evidenceHash: sha256({
        anomalyHash: input.anomalyReview.summary.reviewHash,
        indexHash: input.index.summary.intelligenceHash,
        replayHash: input.replaySimulator.summary.replayHash,
        trendHash: input.trendDigest.summary.digestHash,
      }),
      generatedAt: input.generatedAt,
      nextAction:
        governanceScore < 70
          ? "Adopt the archive intelligence governance updates before closing the board release archive cycle."
          : "Archive intelligence governance controls are ready for the next board review cycle.",
      score: governanceScore,
      sectionKind: "governance",
      status: governanceScore < 60 ? "blocked" : governanceScore < 85 ? "watch" : "ready",
      summary: "Recommended governance updates derived from archive index, anomaly, trend, and replay evidence.",
      title: "Governance updates",
      workspaceId: input.workspaceId,
    }),
  ].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      sectionRank[first.sectionKind] - sectionRank[second.sectionKind] ||
      first.title.localeCompare(second.title),
  );
}

function createRecommendations(input: CreateBoardReleaseArchiveIntelligencePacketReportInput & { generatedAt: string; workspaceId: string }) {
  const recommendations = [
    createRecommendation({
      action:
        input.anomalyReview.summary.criticalCount > 0
          ? "Assign owners to critical archive anomaly findings and require refreshed remediation hashes before board closeout."
          : "Keep anomaly review attached to each archive closeout packet.",
      evidenceHash: input.anomalyReview.summary.reviewHash,
      generatedAt: input.generatedAt,
      priority: input.anomalyReview.summary.criticalCount > 0 ? "high" : "low",
      recommendationKind: "remediate-anomaly",
      status: input.anomalyReview.summary.criticalCount > 0 ? "blocked" : "ready",
      title: "Critical anomaly remediation",
      workspaceId: input.workspaceId,
    }),
    createRecommendation({
      action:
        input.trendDigest.summary.closeoutScoreMovement < 0
          ? "Add a closeout score decline threshold that opens board review before archive closure."
          : "Retain archive trend scoring as release-closeout evidence.",
      evidenceHash: input.trendDigest.summary.digestHash,
      generatedAt: input.generatedAt,
      priority: input.trendDigest.summary.closeoutScoreMovement <= -40 ? "high" : input.trendDigest.summary.closeoutScoreMovement < 0 ? "medium" : "low",
      recommendationKind: "stabilize-trend",
      status: input.trendDigest.summary.closeoutScoreMovement <= -40 ? "blocked" : input.trendDigest.summary.closeoutScoreMovement < 0 ? "watch" : "ready",
      title: "Closeout trend threshold",
      workspaceId: input.workspaceId,
    }),
    createRecommendation({
      action:
        input.replaySimulator.summary.changedCount > 0
          ? "Require replay simulator sign-off whenever later evidence would have changed a prior final decision."
          : "Keep replay simulator snapshots as supporting evidence for unchanged board decisions.",
      evidenceHash: input.replaySimulator.summary.replayHash,
      generatedAt: input.generatedAt,
      priority: input.replaySimulator.summary.changedCount > 0 ? "high" : "low",
      recommendationKind: "decision-control",
      status: input.replaySimulator.summary.changedCount > 0 ? "blocked" : "ready",
      title: "Replay sign-off control",
      workspaceId: input.workspaceId,
    }),
    createRecommendation({
      action: "Package index, anomaly, trend, and replay hashes into one immutable archive intelligence packet for board governance review.",
      evidenceHash: sha256({
        anomalyHash: input.anomalyReview.summary.reviewHash,
        indexHash: input.index.summary.intelligenceHash,
        replayHash: input.replaySimulator.summary.replayHash,
        trendHash: input.trendDigest.summary.digestHash,
      }),
      generatedAt: input.generatedAt,
      priority: "medium",
      recommendationKind: "governance-update",
      status: input.index.summary.status === "ready" && input.anomalyReview.summary.status === "ready" && input.replaySimulator.summary.status === "ready" ? "ready" : "watch",
      title: "Immutable intelligence packet",
      workspaceId: input.workspaceId,
    }),
  ];

  return recommendations.sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      priorityRank[first.priority] - priorityRank[second.priority] ||
      recommendationKindRank[first.recommendationKind] - recommendationKindRank[second.recommendationKind] ||
      first.title.localeCompare(second.title),
  );
}

function summarize(input: {
  recommendations: BoardReleaseArchiveIntelligencePacketRecommendation[];
  sections: BoardReleaseArchiveIntelligencePacketSection[];
}): BoardReleaseArchiveIntelligencePacketReport["summary"] {
  const blockedSectionCount = input.sections.filter((section) => section.status === "blocked").length;
  const watchSectionCount = input.sections.filter((section) => section.status === "watch").length;
  const blockedRecommendationCount = input.recommendations.filter((recommendation) => recommendation.status === "blocked").length;
  const watchRecommendationCount = input.recommendations.filter((recommendation) => recommendation.status === "watch").length;
  const firstRecommendation = input.recommendations.find((recommendation) => recommendation.status === "blocked" || recommendation.status === "watch") ?? null;
  const firstSection = input.sections.find((section) => section.status === "blocked" || section.status === "watch") ?? null;

  return {
    blockedRecommendationCount,
    blockedSectionCount,
    governanceUpdateCount: input.recommendations.filter((recommendation) => recommendation.recommendationKind === "governance-update").length,
    nextAction: firstRecommendation?.action ?? firstSection?.nextAction ?? "Archive intelligence packet is ready for board governance review.",
    packetHash: sha256({
      recommendations: input.recommendations.map((recommendation) => recommendation.recommendationHash),
      sections: input.sections.map((section) => section.sectionHash),
    }),
    packetScore: input.sections.length > 0 ? Math.round(input.sections.reduce((sum, section) => sum + section.score, 0) / input.sections.length) : 100,
    recommendationCount: input.recommendations.length,
    sectionCount: input.sections.length,
    status: blockedSectionCount + blockedRecommendationCount > 0 ? "blocked" : watchSectionCount + watchRecommendationCount > 0 ? "watch" : "ready",
    watchRecommendationCount,
    watchSectionCount,
  };
}

function createExecutiveMemo(summary: BoardReleaseArchiveIntelligencePacketReport["summary"]) {
  return `${summary.status.toUpperCase()} archive intelligence packet: ${summary.sectionCount} evidence sections, ${summary.recommendationCount} governance recommendations, ${summary.packetScore}/100 packet score. ${summary.nextAction}`;
}

function createCsv(input: {
  recommendations: BoardReleaseArchiveIntelligencePacketRecommendation[];
  sections: BoardReleaseArchiveIntelligencePacketSection[];
}) {
  const header = ["record_type", "id", "kind", "title", "status", "score_or_priority", "evidence_hash", "record_hash", "next_action"];
  const sectionRows = input.sections.map((section) =>
    [
      "section",
      section.sectionId,
      section.sectionKind,
      section.title,
      section.status,
      section.score,
      section.evidenceHash,
      section.sectionHash,
      section.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );
  const recommendationRows = input.recommendations.map((recommendation) =>
    [
      "recommendation",
      recommendation.recommendationId,
      recommendation.recommendationKind,
      recommendation.title,
      recommendation.status,
      recommendation.priority,
      recommendation.evidenceHash,
      recommendation.recommendationHash,
      recommendation.action,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...sectionRows, ...recommendationRows].join("\n")}\n`;
}

function createJson(input: {
  executiveMemo: string;
  generatedAt: string;
  recommendations: BoardReleaseArchiveIntelligencePacketRecommendation[];
  sections: BoardReleaseArchiveIntelligencePacketSection[];
  summary: BoardReleaseArchiveIntelligencePacketReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveIntelligencePacketReport(
  input: CreateBoardReleaseArchiveIntelligencePacketReportInput,
): BoardReleaseArchiveIntelligencePacketReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.index.workspaceId;
  const sections = createSections({
    ...input,
    generatedAt,
    workspaceId,
  });
  const recommendations = createRecommendations({
    ...input,
    generatedAt,
    workspaceId,
  });
  const summary = summarize({
    recommendations,
    sections,
  });
  const executiveMemo = createExecutiveMemo(summary);
  const csvContent = createCsv({
    recommendations,
    sections,
  });
  const jsonContent = createJson({
    executiveMemo,
    generatedAt,
    recommendations,
    sections,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-intelligence-packet-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    executiveMemo,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    recommendations,
    sections,
    summary,
    workspaceId,
  };
}
