import type { ProjectCadConversionQueueReport } from "@/features/projects/cad-conversion-worker";
import type { ProjectCollaborationInbox, ProjectCollaborationInboxOperationBatch } from "@/features/projects/project-collaboration-inbox";
import type { ProjectPublicSurfaceHealthReport } from "@/features/projects/public-surface-health";
import type { ProjectCollaborationWebSocketRuntimeHealthSnapshot } from "@/features/projects/server/project-collaboration-websocket-runtime-health";
import type { WorkspaceNotificationEmailDeliveryReport } from "@/features/workspaces/notification-email-delivery";

export type WorkspaceSloService = "cad-workers" | "collaboration-runtime" | "email-delivery" | "public-surfaces";
export type WorkspaceSloStatus = "breach" | "healthy" | "no-data" | "watch";

export interface WorkspaceSloRow {
  detail: string;
  errorBudgetUsedPct: number | null;
  failingCount: number;
  id: WorkspaceSloService;
  label: string;
  lastObservedAt: string | null;
  nextAction: string;
  observedPct: number | null;
  pendingCount: number;
  sampleCount: number;
  status: WorkspaceSloStatus;
  targetPct: number;
}

export interface WorkspaceSloDashboard {
  generatedAt: string;
  rows: WorkspaceSloRow[];
  summary: {
    breachCount: number;
    healthyCount: number;
    noDataCount: number;
    overallScore: number;
    worstStatus: WorkspaceSloStatus;
    watchCount: number;
  };
}

export interface CreateWorkspaceSloDashboardInput {
  cadConversionQueueReport: ProjectCadConversionQueueReport;
  collaborationInbox: ProjectCollaborationInbox;
  collaborationOperationBatches: ProjectCollaborationInboxOperationBatch[];
  collaborationRuntimeHealth?: ProjectCollaborationWebSocketRuntimeHealthSnapshot | null;
  collaborationWebSocketConfigured?: boolean;
  emailDeliveryReport: WorkspaceNotificationEmailDeliveryReport;
  generatedAt?: string;
  publicSurfaceHealthReport: ProjectPublicSurfaceHealthReport;
}

const statusRank: Record<WorkspaceSloStatus, number> = {
  breach: 0,
  watch: 1,
  "no-data": 2,
  healthy: 3,
};

function newestIso(values: Array<Date | string | null | undefined>) {
  const newest = Math.max(
    ...values.map((value) => {
      if (!value) {
        return 0;
      }

      const time = value instanceof Date ? value.getTime() : new Date(value).getTime();

      return Number.isNaN(time) ? 0 : time;
    }),
    0,
  );

  return newest > 0 ? new Date(newest).toISOString() : null;
}

function percent(successCount: number, sampleCount: number) {
  if (sampleCount <= 0) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round((successCount / sampleCount) * 1000) / 10));
}

function errorBudgetUsed(observedPct: number | null, targetPct: number) {
  if (observedPct === null) {
    return null;
  }

  const budget = 100 - targetPct;

  if (budget <= 0) {
    return observedPct >= targetPct ? 0 : 100;
  }

  return Math.max(0, Math.round(((100 - observedPct) / budget) * 100));
}

function getStatus(input: {
  errorBudgetUsedPct: number | null;
  failingCount: number;
  observedPct: number | null;
  pendingCount: number;
  sampleCount: number;
  targetPct: number;
}): WorkspaceSloStatus {
  if (input.sampleCount === 0 || input.observedPct === null) {
    if (input.failingCount > 0) {
      return "breach";
    }

    if (input.pendingCount > 0) {
      return "watch";
    }

    return "no-data";
  }

  if (input.observedPct < input.targetPct || input.failingCount > 0) {
    return "breach";
  }

  if (input.pendingCount > 0 || (input.errorBudgetUsedPct ?? 0) >= 50) {
    return "watch";
  }

  return "healthy";
}

function createRow(input: {
  detail: string;
  failingCount: number;
  id: WorkspaceSloService;
  label: string;
  lastObservedAt: string | null;
  nextAction: string;
  pendingCount: number;
  sampleCount: number;
  successCount: number;
  targetPct: number;
}): WorkspaceSloRow {
  const observedPct = percent(input.successCount, input.sampleCount);
  const errorBudgetUsedPct = errorBudgetUsed(observedPct, input.targetPct);

  return {
    detail: input.detail,
    errorBudgetUsedPct,
    failingCount: input.failingCount,
    id: input.id,
    label: input.label,
    lastObservedAt: input.lastObservedAt,
    nextAction: input.nextAction,
    observedPct,
    pendingCount: input.pendingCount,
    sampleCount: input.sampleCount,
    status: getStatus({
      errorBudgetUsedPct,
      failingCount: input.failingCount,
      observedPct,
      pendingCount: input.pendingCount,
      sampleCount: input.sampleCount,
      targetPct: input.targetPct,
    }),
    targetPct: input.targetPct,
  };
}

function createPublicSurfaceRow(report: ProjectPublicSurfaceHealthReport): WorkspaceSloRow {
  return createRow({
    detail: `${report.summary.passCount} passing, ${report.summary.warnCount} warning, ${report.summary.failCount} failing public checks.`,
    failingCount: report.summary.failCount,
    id: "public-surfaces",
    label: "Public surfaces",
    lastObservedAt: newestIso(report.snapshots.map((snapshot) => snapshot.checkedAt)) ?? report.generatedAt,
    nextAction: "Review failed public viewer, embed, API, or app package checks before launch.",
    pendingCount: report.summary.warnCount + report.summary.screenshotPendingCount,
    sampleCount: report.summary.totalCount,
    successCount: report.summary.passCount,
    targetPct: 99,
  });
}

function createCollaborationRuntimeRow(input: {
  collaborationInbox: ProjectCollaborationInbox;
  collaborationOperationBatches: ProjectCollaborationInboxOperationBatch[];
  collaborationRuntimeHealth?: ProjectCollaborationWebSocketRuntimeHealthSnapshot | null;
  collaborationWebSocketConfigured?: boolean;
}): WorkspaceSloRow {
  const runtimeHealth = input.collaborationRuntimeHealth;
  const runtimeSamples = runtimeHealth ? runtimeHealth.openedSocketCount + runtimeHealth.rejectedSocketCount : 0;
  const runtimeFailures = runtimeHealth ? runtimeHealth.rejectedSocketCount + (runtimeHealth.lastError ? 1 : 0) : 0;
  const operationSamples = input.collaborationOperationBatches.length;
  const remoteConflictCount = input.collaborationInbox.summary.remoteConflictCount;
  const sampleCount = runtimeSamples + operationSamples;
  const failingCount = runtimeFailures + remoteConflictCount;
  const successCount = Math.max(0, sampleCount - failingCount);
  const latestOperationAt = newestIso(input.collaborationOperationBatches.map((batch) => batch.createdAt));
  const transportLabel = input.collaborationWebSocketConfigured ? "WebSocket endpoint configured" : "HTTP/SSE fallback active";

  return createRow({
    detail: `${operationSamples} operation batches, ${remoteConflictCount} remote review signal${remoteConflictCount === 1 ? "" : "s"}, ${transportLabel}.`,
    failingCount,
    id: "collaboration-runtime",
    label: "Collaboration runtime",
    lastObservedAt: newestIso([latestOperationAt, runtimeHealth?.startedAt, input.collaborationInbox.generatedAt]),
    nextAction: "Inspect collaboration transport health and review-gated remote batches when this row is not healthy.",
    pendingCount: input.collaborationInbox.summary.reviewRequestCount,
    sampleCount,
    successCount,
    targetPct: 99.5,
  });
}

function createEmailDeliveryRow(report: WorkspaceNotificationEmailDeliveryReport): WorkspaceSloRow {
  const completedCount = report.summary.sentCount + report.summary.failedCount + report.summary.skippedCount;

  return createRow({
    detail: `${report.summary.sentCount} sent, ${report.summary.pendingCount} pending, ${report.summary.failedCount} failed email jobs.`,
    failingCount: report.summary.failedCount,
    id: "email-delivery",
    label: "Email delivery",
    lastObservedAt: newestIso(report.jobs.map((job) => job.updatedAt)) ?? report.generatedAt,
    nextAction: "Retry failed email jobs and inspect provider errors before release notifications depend on email.",
    pendingCount: report.summary.pendingCount,
    sampleCount: completedCount,
    successCount: report.summary.sentCount + report.summary.skippedCount,
    targetPct: 99,
  });
}

function createCadWorkerRow(report: ProjectCadConversionQueueReport): WorkspaceSloRow {
  const completedCount = report.summary.succeededCount + report.summary.failedCount + report.summary.retryableCount;

  return createRow({
    detail: `${report.summary.succeededCount} succeeded, ${report.summary.queuedCount + report.summary.runningCount} active, ${report.summary.retryableCount} retryable, ${report.summary.failedCount} failed CAD jobs.`,
    failingCount: report.summary.failedCount + report.summary.retryableCount,
    id: "cad-workers",
    label: "CAD workers",
    lastObservedAt: newestIso(report.jobs.map((job) => job.updatedAt)) ?? report.generatedAt,
    nextAction: "Drain queued CAD jobs, retry retryable failures, or route conversions to an available worker adapter.",
    pendingCount: report.summary.queuedCount + report.summary.runningCount,
    sampleCount: completedCount,
    successCount: report.summary.succeededCount,
    targetPct: 98,
  });
}

function summarizeRows(rows: WorkspaceSloRow[]): WorkspaceSloDashboard["summary"] {
  const scoredRows = rows.filter((row) => row.observedPct !== null);
  const overallScore = scoredRows.length > 0 ? Math.round(scoredRows.reduce((sum, row) => sum + (row.observedPct ?? 0), 0) / scoredRows.length) : 0;
  const worstStatus = [...rows].sort((first, second) => statusRank[first.status] - statusRank[second.status])[0]?.status ?? "no-data";

  return {
    breachCount: rows.filter((row) => row.status === "breach").length,
    healthyCount: rows.filter((row) => row.status === "healthy").length,
    noDataCount: rows.filter((row) => row.status === "no-data").length,
    overallScore,
    watchCount: rows.filter((row) => row.status === "watch").length,
    worstStatus,
  };
}

export function createWorkspaceSloDashboard(input: CreateWorkspaceSloDashboardInput): WorkspaceSloDashboard {
  const rows = [
    createPublicSurfaceRow(input.publicSurfaceHealthReport),
    createCollaborationRuntimeRow({
      collaborationInbox: input.collaborationInbox,
      collaborationOperationBatches: input.collaborationOperationBatches,
      collaborationRuntimeHealth: input.collaborationRuntimeHealth,
      collaborationWebSocketConfigured: input.collaborationWebSocketConfigured,
    }),
    createEmailDeliveryRow(input.emailDeliveryReport),
    createCadWorkerRow(input.cadConversionQueueReport),
  ].sort((first, second) => statusRank[first.status] - statusRank[second.status] || first.label.localeCompare(second.label));

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    rows,
    summary: summarizeRows(rows),
  };
}
