import type { PostDeploySyntheticDashboardSummary } from "@/features/deployment/post-deploy-synthetic-dashboard";
import type { ReleaseDeploymentCheckCategory, ReleaseDeploymentChecklist } from "@/features/deployment/release-deployment-checklist";
import type { ProjectCadConversionQueueReport } from "@/features/projects/cad-conversion-worker";
import type { ProjectArtifactRegistryReport } from "@/features/projects/project-artifact-registry";
import type { WorkspaceNotificationEmailDeliveryReport } from "@/features/workspaces/notification-email-delivery";

export type FreeTierResourceId = "brevo-email" | "storage-artifacts" | "turso-database" | "vercel-deployment" | "worker-queue";
export type FreeTierResourceStatus = "blocked" | "ready" | "watch";

export interface FreeTierResourceMonitorRow {
  evidence: string;
  id: FreeTierResourceId;
  label: string;
  limitLabel: string;
  nextAction: string;
  ownerHint: string;
  status: FreeTierResourceStatus;
  usageLabel: string;
  usagePercent: number;
}

export interface FreeTierResourceMonitorReport {
  generatedAt: string;
  rows: FreeTierResourceMonitorRow[];
  summary: {
    blockedCount: number;
    readyCount: number;
    totalCount: number;
    watchCount: number;
    weightedUsagePercent: number;
    worstStatus: FreeTierResourceStatus;
  };
}

export interface FreeTierResourceMonitorBudgets {
  dailyEmailJobGuardrail: number;
  storageArtifactGuardrail: number;
  workerQueueGuardrail: number;
}

export interface CreateFreeTierResourceMonitorReportInput {
  artifactRegistryReport: ProjectArtifactRegistryReport;
  budgets?: Partial<FreeTierResourceMonitorBudgets>;
  cadConversionQueueReport: ProjectCadConversionQueueReport;
  emailDeliveryReport: WorkspaceNotificationEmailDeliveryReport;
  generatedAt?: string;
  postDeploySummary: PostDeploySyntheticDashboardSummary | null;
  releaseDeploymentChecklist: ReleaseDeploymentChecklist | null;
}

const defaultBudgets: FreeTierResourceMonitorBudgets = {
  dailyEmailJobGuardrail: 300,
  storageArtifactGuardrail: 250,
  workerQueueGuardrail: 25,
};

const statusRank: Record<FreeTierResourceStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function percent(used: number, limit: number) {
  return limit <= 0 ? 0 : clampPercent((used / limit) * 100);
}

function checksForCategory(checklist: ReleaseDeploymentChecklist | null, category: ReleaseDeploymentCheckCategory) {
  return checklist?.checks.filter((check) => check.category === category) ?? [];
}

function issueCounts(checks: ReturnType<typeof checksForCategory>) {
  return {
    failCount: checks.filter((check) => check.status === "fail").length,
    warningCount: checks.filter((check) => check.status === "warning").length,
  };
}

function statusFromIssues(failCount: number, warningCount: number): FreeTierResourceStatus {
  if (failCount > 0) {
    return "blocked";
  }

  return warningCount > 0 ? "watch" : "ready";
}

function createVercelRow(input: {
  checklist: ReleaseDeploymentChecklist | null;
  postDeploySummary: PostDeploySyntheticDashboardSummary | null;
}): FreeTierResourceMonitorRow {
  const checks = checksForCategory(input.checklist, "vercel");
  const issues = issueCounts(checks);
  const smokeStatus = input.postDeploySummary?.status ?? "missing";
  const status = issues.failCount > 0 || smokeStatus === "fail" ? "blocked" : issues.warningCount > 0 || smokeStatus === "missing" ? "watch" : "ready";
  const issueLoad = issues.failCount * 2 + issues.warningCount + (smokeStatus === "fail" ? 2 : smokeStatus === "missing" ? 1 : 0);

  return {
    evidence: `${checks.length} Vercel linkage checks, smoke status ${smokeStatus}, ${input.postDeploySummary?.historyCount ?? 0} smoke reports.`,
    id: "vercel-deployment",
    label: "Vercel deployment",
    limitLabel: "Guardrail: 0 unresolved linkage or smoke issues",
    nextAction:
      status === "ready"
        ? "Keep post-deploy smoke history current after substantial releases."
        : "Resolve Vercel linkage or post-deploy smoke issues before spending more preview or production cycles.",
    ownerHint: "Web release owner",
    status,
    usageLabel: `${issueLoad} deployment risk signal${issueLoad === 1 ? "" : "s"}`,
    usagePercent: clampPercent(issueLoad * 25),
  };
}

function createTursoRow(checklist: ReleaseDeploymentChecklist | null): FreeTierResourceMonitorRow {
  const checks = checksForCategory(checklist, "database");
  const issues = issueCounts(checks);
  const status = statusFromIssues(issues.failCount, issues.warningCount);
  const issueLoad = issues.failCount * 2 + issues.warningCount;

  return {
    evidence: `${checks.length} database checks, ${issues.failCount} failed, ${issues.warningCount} warning.`,
    id: "turso-database",
    label: "Turso database",
    limitLabel: "Guardrail: clean libSQL env and connectivity checks",
    nextAction:
      status === "ready"
        ? "Keep the release checklist DB smoke available before deployment."
        : "Resolve Turso URL, token, or connectivity warnings before accepting more workspace traffic.",
    ownerHint: "Data owner",
    status,
    usageLabel: `${issueLoad} database risk signal${issueLoad === 1 ? "" : "s"}`,
    usagePercent: clampPercent(issueLoad * 25),
  };
}

function createBrevoRow(report: WorkspaceNotificationEmailDeliveryReport, budget: number): FreeTierResourceMonitorRow {
  const { failedCount, pendingCount, sentCount, totalCount } = report.summary;
  const usagePercent = percent(totalCount, budget);
  const status: FreeTierResourceStatus = failedCount > 0 ? "blocked" : usagePercent >= 80 || pendingCount > budget * 0.2 ? "watch" : "ready";

  return {
    evidence: `${sentCount} sent, ${pendingCount} pending, ${failedCount} failed email deliveries.`,
    id: "brevo-email",
    label: "Brevo email",
    limitLabel: `Workspace guardrail: ${budget} queued/sent jobs per day`,
    nextAction:
      status === "ready"
        ? "Keep failed email jobs at zero and review volume before large invite or OTP batches."
        : "Reduce failed or pending email jobs before sending more workspace notifications.",
    ownerHint: "Messaging owner",
    status,
    usageLabel: `${totalCount}/${budget} email jobs`,
    usagePercent,
  };
}

function createStorageRow(report: ProjectArtifactRegistryReport, budget: number): FreeTierResourceMonitorRow {
  const { blockedCount, draftCount, totalCount } = report.summary;
  const usagePercent = percent(totalCount, budget);
  const status: FreeTierResourceStatus = blockedCount > 0 ? "blocked" : usagePercent >= 80 || draftCount > totalCount * 0.35 ? "watch" : "ready";

  return {
    evidence: `${report.summary.availableCount} available, ${draftCount} draft, ${blockedCount} blocked registry artifacts.`,
    id: "storage-artifacts",
    label: "Storage artifacts",
    limitLabel: `Workspace guardrail: ${budget} registry artifacts`,
    nextAction:
      status === "ready"
        ? "Keep artifact cleanup and lineage snapshots inside the workspace storage guardrail."
        : "Archive stale drafts or clear blocked artifacts before growing package and evidence storage.",
    ownerHint: "Asset owner",
    status,
    usageLabel: `${totalCount}/${budget} artifacts`,
    usagePercent,
  };
}

function createWorkerRow(report: ProjectCadConversionQueueReport, budget: number): FreeTierResourceMonitorRow {
  const activeCount = report.summary.queuedCount + report.summary.runningCount + report.summary.retryableCount;
  const usagePercent = percent(activeCount, budget);
  const status: FreeTierResourceStatus = report.summary.failedCount > 0 ? "blocked" : report.summary.retryableCount > 0 || usagePercent >= 80 ? "watch" : "ready";

  return {
    evidence: `${report.summary.queuedCount} queued, ${report.summary.runningCount} running, ${report.summary.retryableCount} retryable, ${report.summary.failedCount} failed CAD jobs.`,
    id: "worker-queue",
    label: "Background worker queue",
    limitLabel: `Workspace guardrail: ${budget} active CAD jobs`,
    nextAction:
      status === "ready"
        ? "Keep CAD conversion jobs below the queue guardrail and retry failures quickly."
        : "Drain failed or retryable CAD jobs before accepting more native conversion work.",
    ownerHint: "Worker owner",
    status,
    usageLabel: `${activeCount}/${budget} active jobs`,
    usagePercent,
  };
}

function summarizeRows(rows: FreeTierResourceMonitorRow[]): FreeTierResourceMonitorReport["summary"] {
  const worstStatus = rows.reduce<FreeTierResourceStatus>((worst, row) => (statusRank[row.status] < statusRank[worst] ? row.status : worst), "ready");

  return {
    blockedCount: rows.filter((row) => row.status === "blocked").length,
    readyCount: rows.filter((row) => row.status === "ready").length,
    totalCount: rows.length,
    watchCount: rows.filter((row) => row.status === "watch").length,
    weightedUsagePercent: Math.round(rows.reduce((sum, row) => sum + row.usagePercent, 0) / Math.max(rows.length, 1)),
    worstStatus,
  };
}

export function createFreeTierResourceMonitorReport(input: CreateFreeTierResourceMonitorReportInput): FreeTierResourceMonitorReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const budgets = {
    ...defaultBudgets,
    ...input.budgets,
  };
  const rows = [
    createVercelRow({
      checklist: input.releaseDeploymentChecklist,
      postDeploySummary: input.postDeploySummary,
    }),
    createTursoRow(input.releaseDeploymentChecklist),
    createBrevoRow(input.emailDeliveryReport, budgets.dailyEmailJobGuardrail),
    createStorageRow(input.artifactRegistryReport, budgets.storageArtifactGuardrail),
    createWorkerRow(input.cadConversionQueueReport, budgets.workerQueueGuardrail),
  ];

  return {
    generatedAt,
    rows,
    summary: summarizeRows(rows),
  };
}
