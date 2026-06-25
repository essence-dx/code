import type { PostDeploySyntheticDashboardSummary } from "@/features/deployment/post-deploy-synthetic-dashboard";
import type { WorkspaceRiskDigestReport } from "@/features/projects/workspace-risk-digest";
import type { WorkspaceReleaseRunbookRecord, WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";
import type { WorkspaceReleaseCalendarMilestone, WorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";

export type DeployPromotionDecision = "blocked" | "ready" | "watch";
export type DeployPromotionSignalSource = "post-deploy" | "release-calendar" | "risk" | "runbook";
export type DeployPromotionSignalStatus = "blocked" | "clear" | "missing" | "watch";

export interface DeployPromotionSignal {
  actionLabel: string;
  detail: string;
  evidenceCount: number;
  id: string;
  source: DeployPromotionSignalSource;
  status: DeployPromotionSignalStatus;
  title: string;
  value: string;
}

export interface DeployPromotionDecisionBoard {
  blockerCount: number;
  decision: DeployPromotionDecision;
  decisionLabel: string;
  generatedAt: string;
  milestoneFocus: WorkspaceReleaseCalendarMilestone[];
  nextAction: DeployPromotionSignal;
  promotionScore: number;
  runbookCompletionPercent: number;
  runbookFocus: WorkspaceReleaseRunbookRecord[];
  signals: DeployPromotionSignal[];
  smokeIssueRows: NonNullable<PostDeploySyntheticDashboardSummary>["issueRows"];
  summary: {
    calendarBlockedCount: number;
    calendarDueCount: number;
    calendarNextMilestoneAt: string | null;
    postDeployHistoryCount: number;
    postDeployPassStreak: number;
    riskScore: number;
    runbookBlockedCount: number;
    runbookCompleteCount: number;
    runbookTotalCount: number;
  };
  warningCount: number;
}

export interface CreateDeployPromotionDecisionBoardInput {
  generatedAt?: string;
  postDeploySummary: PostDeploySyntheticDashboardSummary | null;
  releaseCalendar: WorkspaceReleaseCalendarReport;
  riskDigest: WorkspaceRiskDigestReport;
  runbook: WorkspaceReleaseRunbookReport;
}

const statusPenalty: Record<DeployPromotionSignalStatus, number> = {
  blocked: 22,
  clear: 0,
  missing: 18,
  watch: 8,
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function decisionLabel(decision: DeployPromotionDecision) {
  if (decision === "ready") {
    return "Ready to promote";
  }

  return decision === "blocked" ? "Promotion blocked" : "Promotion watch";
}

function signalRank(signal: DeployPromotionSignal) {
  const rank: Record<DeployPromotionSignalStatus, number> = {
    blocked: 0,
    missing: 1,
    watch: 2,
    clear: 3,
  };

  return rank[signal.status];
}

function activeMilestones(report: WorkspaceReleaseCalendarReport) {
  return report.milestones.filter((milestone) => milestone.status !== "done").slice(0, 8);
}

function activeRunbookRecords(report: WorkspaceReleaseRunbookReport) {
  return report.records.filter((record) => record.status !== "complete").slice(0, 8);
}

function createRiskSignal(riskDigest: WorkspaceRiskDigestReport): DeployPromotionSignal {
  const status: DeployPromotionSignalStatus = riskDigest.score < 55 ? "blocked" : riskDigest.score < 82 ? "watch" : "clear";

  return {
    actionLabel: status === "clear" ? "Keep current controls" : "Resolve risk digest actions",
    detail:
      riskDigest.actionItems.length > 0
        ? `${riskDigest.actionItems.length} risk action${riskDigest.actionItems.length === 1 ? "" : "s"} remain before promotion.`
        : "Risk digest has no open action items.",
    evidenceCount: riskDigest.actionItems.length,
    id: "risk-digest",
    source: "risk",
    status,
    title: "Workspace risk",
    value: `${riskDigest.score}/100 ${riskDigest.riskLevel}`,
  };
}

function createPostDeploySignal(summary: PostDeploySyntheticDashboardSummary | null): DeployPromotionSignal {
  if (!summary || summary.status === "missing") {
    return {
      actionLabel: "Run deploy smoke",
      detail: "No post-deploy synthetic smoke report has been recorded for this deploy.",
      evidenceCount: 1,
      id: "post-deploy-smoke",
      source: "post-deploy",
      status: "missing",
      title: "Post-deploy smoke",
      value: "No report",
    };
  }

  if (summary.status === "fail") {
    const issueCount = Math.max(1, summary.issueRows.length || summary.failedRunCount);

    return {
      actionLabel: "Inspect failed checks",
      detail: `${issueCount} public route check${issueCount === 1 ? "" : "s"} need attention before promotion.`,
      evidenceCount: issueCount,
      id: "post-deploy-smoke",
      source: "post-deploy",
      status: "blocked",
      title: "Post-deploy smoke",
      value: `${summary.completionPercent}% failing`,
    };
  }

  const status: DeployPromotionSignalStatus = summary.currentPassStreak >= 2 ? "clear" : "watch";

  return {
    actionLabel: status === "clear" ? "Keep smoke evidence" : "Collect another passing smoke",
    detail: `Latest smoke passed with ${summary.currentPassStreak} passing run${summary.currentPassStreak === 1 ? "" : "s"} in a row across ${summary.historyCount} report${summary.historyCount === 1 ? "" : "s"}.`,
    evidenceCount: summary.historyCount,
    id: "post-deploy-smoke",
    source: "post-deploy",
    status,
    title: "Post-deploy smoke",
    value: `${summary.completionPercent}% passing`,
  };
}

function createCalendarSignal(report: WorkspaceReleaseCalendarReport): DeployPromotionSignal {
  const status: DeployPromotionSignalStatus =
    report.summary.totalCount === 0 ? "missing" : report.summary.blockedCount > 0 ? "blocked" : report.summary.dueCount > 0 ? "watch" : "clear";

  return {
    actionLabel: status === "clear" ? "Keep milestones current" : status === "missing" ? "Create release milestones" : "Clear release milestones",
    detail:
      status === "clear"
        ? `${report.summary.doneCount}/${report.summary.totalCount} release milestones are complete or scheduled.`
        : `${report.summary.blockedCount} blocked and ${report.summary.dueCount} due release milestone${report.summary.blockedCount + report.summary.dueCount === 1 ? "" : "s"} remain.`,
    evidenceCount: report.summary.blockedCount + report.summary.dueCount,
    id: "release-calendar",
    source: "release-calendar",
    status,
    title: "Release calendar",
    value: `${report.summary.doneCount}/${report.summary.totalCount} done`,
  };
}

function createRunbookSignal(report: WorkspaceReleaseRunbookReport): DeployPromotionSignal {
  const status: DeployPromotionSignalStatus =
    report.summary.totalCount === 0 ? "missing" : report.summary.blockedCount > 0 ? "blocked" : report.summary.inProgressCount > 0 || report.summary.scheduledCount > 0 ? "watch" : "clear";

  return {
    actionLabel: status === "clear" ? "Archive release evidence" : status === "missing" ? "Create runbook records" : "Finish runbook records",
    detail:
      status === "clear"
        ? `${report.summary.completeCount}/${report.summary.totalCount} runbook records are complete.`
        : `${report.summary.blockedCount} blocked, ${report.summary.inProgressCount} in progress, and ${report.summary.scheduledCount} scheduled runbook record${report.summary.totalCount === 1 ? "" : "s"} remain.`,
    evidenceCount: report.summary.blockedCount + report.summary.inProgressCount + report.summary.scheduledCount,
    id: "release-runbook",
    source: "runbook",
    status,
    title: "Release runbook",
    value: `${report.summary.completeCount}/${report.summary.totalCount} complete`,
  };
}

function runbookCompletionPercent(report: WorkspaceReleaseRunbookReport) {
  return report.summary.totalCount > 0 ? Math.round((report.summary.completeCount / report.summary.totalCount) * 100) : 0;
}

function promotionScore(riskScore: number, signals: DeployPromotionSignal[]) {
  const signalPenalty = signals.reduce((total, signal) => total + statusPenalty[signal.status], 0);

  return clampScore(riskScore - signalPenalty);
}

function resolveDecision(signals: DeployPromotionSignal[], score: number): DeployPromotionDecision {
  const hasBlockingSignal = signals.some((signal) => signal.status === "blocked" || signal.status === "missing");

  if (hasBlockingSignal || score < 60) {
    return "blocked";
  }

  return signals.some((signal) => signal.status === "watch") || score < 86 ? "watch" : "ready";
}

export function createDeployPromotionDecisionBoard(input: CreateDeployPromotionDecisionBoardInput): DeployPromotionDecisionBoard {
  const signals = [
    createRiskSignal(input.riskDigest),
    createPostDeploySignal(input.postDeploySummary),
    createCalendarSignal(input.releaseCalendar),
    createRunbookSignal(input.runbook),
  ];
  const score = promotionScore(input.riskDigest.score, signals);
  const decision = resolveDecision(signals, score);
  const sortedSignals = [...signals].sort((first, second) => signalRank(first) - signalRank(second) || second.evidenceCount - first.evidenceCount || first.title.localeCompare(second.title));
  const postDeployHistoryCount = input.postDeploySummary?.historyCount ?? 0;
  const postDeployPassStreak = input.postDeploySummary?.currentPassStreak ?? 0;

  return {
    blockerCount: signals.filter((signal) => signal.status === "blocked" || signal.status === "missing").length,
    decision,
    decisionLabel: decisionLabel(decision),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    milestoneFocus: activeMilestones(input.releaseCalendar),
    nextAction: sortedSignals[0] ?? signals[0],
    promotionScore: score,
    runbookCompletionPercent: runbookCompletionPercent(input.runbook),
    runbookFocus: activeRunbookRecords(input.runbook),
    signals: sortedSignals,
    smokeIssueRows: input.postDeploySummary?.issueRows ?? [],
    summary: {
      calendarBlockedCount: input.releaseCalendar.summary.blockedCount,
      calendarDueCount: input.releaseCalendar.summary.dueCount,
      calendarNextMilestoneAt: input.releaseCalendar.summary.nextMilestoneAt,
      postDeployHistoryCount,
      postDeployPassStreak,
      riskScore: input.riskDigest.score,
      runbookBlockedCount: input.runbook.summary.blockedCount,
      runbookCompleteCount: input.runbook.summary.completeCount,
      runbookTotalCount: input.runbook.summary.totalCount,
    },
    warningCount: signals.filter((signal) => signal.status === "watch").length,
  };
}
