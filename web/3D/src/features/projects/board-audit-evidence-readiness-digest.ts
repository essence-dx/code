import type { BoardAuditEvidenceAcceptanceWorkflow } from "@/features/projects/board-audit-evidence-acceptance";
import type { BoardAuditEvidenceAttachmentManifest } from "@/features/projects/board-audit-evidence-manifest";
import type { BoardAuditEvidenceVerificationReport } from "@/features/projects/board-audit-evidence-verification";

export type BoardAuditEvidenceReadinessStatus = "blocked" | "ready" | "watch";
export type BoardAuditEvidenceRiskLevel = "critical" | "high" | "medium" | "low";

export interface BoardAuditEvidenceReadinessTrendPoint {
  generatedAt: string;
  readinessScore: number;
}

export interface BoardAuditEvidenceReadinessRisk {
  nextAction: string;
  ownerName: string;
  readinessScore: number;
  riskLevel: BoardAuditEvidenceRiskLevel;
  status: BoardAuditEvidenceReadinessStatus;
  taskId: string;
  title: string;
}

export interface BoardAuditEvidenceReadinessRecommendation {
  ownerName: string;
  recommendation: string;
  taskId: string;
  title: string;
}

export interface BoardAuditEvidenceReadinessDigest {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  recommendations: BoardAuditEvidenceReadinessRecommendation[];
  risks: BoardAuditEvidenceReadinessRisk[];
  summary: {
    carryForwardCount: number;
    nextAction: string;
    readinessScore: number;
    scoreDelta: number;
    status: BoardAuditEvidenceReadinessStatus;
    taskCount: number;
    trendPointCount: number;
    unresolvedAttachmentRiskCount: number;
  };
  trend: BoardAuditEvidenceReadinessTrendPoint[];
  workspaceId: string;
}

export interface CreateBoardAuditEvidenceReadinessDigestInput {
  acceptance: BoardAuditEvidenceAcceptanceWorkflow;
  generatedAt?: string;
  manifest: BoardAuditEvidenceAttachmentManifest;
  previousDigests?: BoardAuditEvidenceReadinessTrendPoint[];
  verification: BoardAuditEvidenceVerificationReport;
  workspaceId?: string;
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

function boundedScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function rowStatus(input: {
  acceptanceStatus: string | undefined;
  manifestStatus: string | undefined;
  verificationStatus: string | undefined;
}): BoardAuditEvidenceReadinessStatus {
  if (input.acceptanceStatus === "rejected" || input.acceptanceStatus === "blocked" || input.manifestStatus === "blocked" || input.verificationStatus === "blocked") {
    return "blocked";
  }

  if (input.acceptanceStatus === "pending" || input.manifestStatus === "watch" || input.verificationStatus === "watch") {
    return "watch";
  }

  return "ready";
}

function riskLevel(score: number, status: BoardAuditEvidenceReadinessStatus): BoardAuditEvidenceRiskLevel {
  if (status === "blocked" && score < 60) {
    return "critical";
  }

  if (status === "blocked" || score < 70) {
    return "high";
  }

  return status === "watch" || score < 85 ? "medium" : "low";
}

function createRisks(input: CreateBoardAuditEvidenceReadinessDigestInput): BoardAuditEvidenceReadinessRisk[] {
  const manifestByTask = new Map(input.manifest.rows.map((row) => [row.taskId, row]));
  const verificationByTask = new Map(input.verification.rows.map((row) => [row.taskId, row]));

  return input.acceptance.rows
    .map((acceptanceRow) => {
      const manifestRow = manifestByTask.get(acceptanceRow.taskId);
      const verificationRow = verificationByTask.get(acceptanceRow.taskId);
      const status = rowStatus({
        acceptanceStatus: acceptanceRow.status,
        manifestStatus: manifestRow?.status,
        verificationStatus: verificationRow?.status,
      });
      const manifestScore = manifestRow?.status === "blocked" ? 45 : manifestRow?.status === "watch" ? 75 : 100;
      const acceptanceScore = acceptanceRow.status === "accepted" ? 100 : acceptanceRow.status === "pending" ? 65 : 25;
      const readinessScore = boundedScore(((verificationRow?.score ?? 100) + manifestScore + acceptanceScore) / 3);

      return {
        nextAction: acceptanceRow.nextAction,
        ownerName: acceptanceRow.ownerName,
        readinessScore,
        riskLevel: riskLevel(readinessScore, status),
        status,
        taskId: acceptanceRow.taskId,
        title: acceptanceRow.title,
      };
    })
    .filter((risk) => risk.status !== "ready")
    .sort((first, second) => first.readinessScore - second.readinessScore || first.title.localeCompare(second.title));
}

function createRecommendations(risks: BoardAuditEvidenceReadinessRisk[]): BoardAuditEvidenceReadinessRecommendation[] {
  return risks.map((risk) => ({
    ownerName: risk.ownerName,
    recommendation: `${risk.ownerName}: ${risk.nextAction}`,
    taskId: risk.taskId,
    title: risk.title,
  }));
}

function createSummary(input: {
  acceptance: BoardAuditEvidenceAcceptanceWorkflow;
  generatedAt: string;
  manifest: BoardAuditEvidenceAttachmentManifest;
  previousDigests: BoardAuditEvidenceReadinessTrendPoint[];
  recommendations: BoardAuditEvidenceReadinessRecommendation[];
  risks: BoardAuditEvidenceReadinessRisk[];
  verification: BoardAuditEvidenceVerificationReport;
}): BoardAuditEvidenceReadinessDigest["summary"] {
  const unresolvedAttachmentRiskCount = input.risks.filter((risk) => risk.status === "blocked").length;
  const baseScore = (input.manifest.summary.manifestScore + input.verification.summary.verificationScore + input.acceptance.summary.acceptanceScore) / 3;
  const readinessScore = boundedScore(baseScore - unresolvedAttachmentRiskCount * 7);
  const previousScore = input.previousDigests.at(-1)?.readinessScore ?? readinessScore;
  const firstRisk = input.risks[0] ?? null;
  const status: BoardAuditEvidenceReadinessStatus =
    input.acceptance.summary.status === "blocked" || input.verification.summary.status === "blocked" || input.manifest.summary.status === "blocked"
      ? "blocked"
      : input.acceptance.summary.status === "watch" || input.verification.summary.status === "watch" || input.manifest.summary.status === "watch"
        ? "watch"
        : "ready";

  return {
    carryForwardCount: input.recommendations.length,
    nextAction: firstRisk?.nextAction ?? "Board audit evidence readiness is ready for board packet closeout.",
    readinessScore,
    scoreDelta: readinessScore - previousScore,
    status,
    taskCount: input.acceptance.summary.taskCount,
    trendPointCount: input.previousDigests.length + 1,
    unresolvedAttachmentRiskCount,
  };
}

function createTrend(input: {
  currentScore: number;
  generatedAt: string;
  previousDigests: BoardAuditEvidenceReadinessTrendPoint[];
}) {
  return [
    ...input.previousDigests,
    {
      generatedAt: input.generatedAt,
      readinessScore: input.currentScore,
    },
  ];
}

function createCsv(risks: BoardAuditEvidenceReadinessRisk[], recommendations: BoardAuditEvidenceReadinessRecommendation[]) {
  const recommendationByTask = new Map(recommendations.map((recommendation) => [recommendation.taskId, recommendation.recommendation]));
  const header = ["task_id", "status", "owner", "readiness_score", "risk_level", "recommendation"];
  const body = risks.map((risk) =>
    [risk.taskId, risk.status, risk.ownerName, risk.readinessScore, risk.riskLevel, recommendationByTask.get(risk.taskId) ?? risk.nextAction]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  recommendations: BoardAuditEvidenceReadinessRecommendation[];
  risks: BoardAuditEvidenceReadinessRisk[];
  summary: BoardAuditEvidenceReadinessDigest["summary"];
  trend: BoardAuditEvidenceReadinessTrendPoint[];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      recommendations: input.recommendations,
      risks: input.risks,
      summary: input.summary,
      trend: input.trend,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardAuditEvidenceReadinessDigest(input: CreateBoardAuditEvidenceReadinessDigestInput): BoardAuditEvidenceReadinessDigest {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.acceptance.workspaceId;
  const previousDigests = input.previousDigests ?? [];
  const risks = createRisks(input);
  const recommendations = createRecommendations(risks);
  const summary = createSummary({
    acceptance: input.acceptance,
    generatedAt,
    manifest: input.manifest,
    previousDigests,
    recommendations,
    risks,
    verification: input.verification,
  });
  const trend = createTrend({
    currentScore: summary.readinessScore,
    generatedAt,
    previousDigests,
  });
  const csvContent = createCsv(risks, recommendations);
  const jsonContent = createJson({
    generatedAt,
    recommendations,
    risks,
    summary,
    trend,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-audit-evidence-readiness-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    recommendations,
    risks,
    summary,
    trend,
    workspaceId,
  };
}
