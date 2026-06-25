import type { AdminOperationalIncidentReport } from "@/features/admin/admin-operational-incidents";
import type { AdminRollbackReadinessReport } from "@/features/admin/admin-rollback-readiness";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";
import type { RuntimeObservabilityReport } from "@/features/editor/runtime-observability";

export type AdminProductionMonitoringStatus = "ready" | "review" | "blocked";

export type AdminProductionMonitoringKind =
  | "admin-actions"
  | "deploy-smoke"
  | "incidents"
  | "rollback"
  | "runtime";

export type AdminProductionMonitoringRow = {
  id: string;
  status: AdminProductionMonitoringStatus;
  kind: AdminProductionMonitoringKind;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  latestAt: string | null;
  target: string | null;
};

export type AdminProductionMonitoringAction = {
  id: string;
  actorEmail: string;
  action: string;
  targetLabel: string;
  createdAt: string;
};

export type AdminProductionMonitoringDigest = {
  generatedAt: string;
  status: AdminProductionMonitoringStatus;
  score: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  deploySmokeScore: number;
  runtimeScore: number;
  runtimeErrorCount: number;
  runtimeWarningCount: number;
  failedAuthAttemptCount: number;
  failedEmailDeliveryCount: number;
  rollbackScore: number;
  recentAdminActionCount: number;
  highImpactAdminActionCount: number;
  latestAdminActionAt: string | null;
  rows: AdminProductionMonitoringRow[];
  recentActions: AdminProductionMonitoringAction[];
};

export type AdminProductionMonitoringDigestInput = {
  deploySmoke: ProductionDeploySmokeReport;
  runtimeObservability: RuntimeObservabilityReport;
  operationalIncidents: AdminOperationalIncidentReport;
  rollbackReadiness: AdminRollbackReadinessReport;
  auditEvents: AdminProductionMonitoringAction[];
  generatedAt?: string;
  now?: number;
};

const RECENT_ACTION_WINDOW_DAYS = 7;
const HIGH_IMPACT_ACTIONS = new Set([
  "release.approval.snapshot",
  "session.revoke",
  "share.disable",
  "share.restore",
  "user.verify",
  "workspace.policy.update",
  "collaborator.role.approval.request",
  "collaborator.role.approval.decision",
  "collaborator.role.approval.reject",
]);

export function getAdminProductionMonitoringDigest({
  deploySmoke,
  runtimeObservability,
  operationalIncidents,
  rollbackReadiness,
  auditEvents,
  generatedAt = new Date().toISOString(),
  now = Date.now(),
}: AdminProductionMonitoringDigestInput): AdminProductionMonitoringDigest {
  const recentActions = auditEvents
    .filter((event) => isRecent(event.createdAt, now, RECENT_ACTION_WINDOW_DAYS))
    .sort(sortActionsByCreatedAt)
    .slice(0, 12);
  const highImpactActions = recentActions.filter((event) =>
    isHighImpactAction(event.action),
  );
  const rows = [
    getDeploySmokeRow(deploySmoke),
    getRuntimeRow(runtimeObservability),
    getIncidentRow(operationalIncidents),
    getRollbackRow(rollbackReadiness),
    getAdminActionsRow(recentActions, highImpactActions),
  ];
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const status: AdminProductionMonitoringStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    generatedAt,
    status,
    score: Math.max(0, 100 - blockedCount * 24 - reviewCount * 8),
    readyCount,
    reviewCount,
    blockedCount,
    deploySmokeScore: deploySmoke.score,
    runtimeScore: runtimeObservability.score,
    runtimeErrorCount: runtimeObservability.errorCount,
    runtimeWarningCount: runtimeObservability.warningCount,
    failedAuthAttemptCount: operationalIncidents.failedAuthAttemptCount,
    failedEmailDeliveryCount: operationalIncidents.failedEmailDeliveryCount,
    rollbackScore: rollbackReadiness.score,
    recentAdminActionCount: recentActions.length,
    highImpactAdminActionCount: highImpactActions.length,
    latestAdminActionAt: recentActions[0]?.createdAt ?? null,
    rows,
    recentActions,
  };
}

function getDeploySmokeRow(
  deploySmoke: ProductionDeploySmokeReport,
): AdminProductionMonitoringRow {
  return {
    id: "deploy-smoke",
    status: deploySmoke.status,
    kind: "deploy-smoke",
    label: "Deploy smoke",
    value: `${deploySmoke.score}`,
    detail: `${deploySmoke.readyCount} ready, ${deploySmoke.reviewCount} review, and ${deploySmoke.blockedCount} blocked checks across ${deploySmoke.requiredRouteCount} required production routes.`,
    recommendation:
      deploySmoke.status === "ready"
        ? "Keep the route smoke artifact attached to the release packet."
        : "Run or refresh the deployed route smoke checks before approving the production release.",
    latestAt: deploySmoke.generatedAt,
    target: deploySmoke.baseUrl,
  };
}

function getRuntimeRow(
  runtimeObservability: RuntimeObservabilityReport,
): AdminProductionMonitoringRow {
  return {
    id: "runtime-observability",
    status: runtimeObservability.status,
    kind: "runtime",
    label: "Runtime issues",
    value: `${runtimeObservability.errorCount} errors`,
    detail: runtimeObservability.captured
      ? `${runtimeObservability.errorCount} runtime errors, ${runtimeObservability.warningCount} warnings, and ${runtimeObservability.infoCount} info signals were captured.`
      : "No browser runtime issue artifact is attached to the current admin digest.",
    recommendation:
      runtimeObservability.status === "ready"
        ? "Attach the clean runtime artifact to release evidence."
        : "Run visual route probes or snapshot capture with runtime issue capture before release approval.",
    latestAt: latestRuntimeIssueAt(runtimeObservability),
    target: runtimeObservability.rows.find((row) => row.status !== "ready")?.label ??
      null,
  };
}

function getIncidentRow(
  operationalIncidents: AdminOperationalIncidentReport,
): AdminProductionMonitoringRow {
  return {
    id: "auth-email-incidents",
    status: operationalIncidents.status,
    kind: "incidents",
    label: "Auth and email incidents",
    value: `${operationalIncidents.failedAuthAttemptCount}/${operationalIncidents.failedEmailDeliveryCount}`,
    detail: `${operationalIncidents.failedAuthAttemptCount} failed auth attempts, ${operationalIncidents.failedEmailDeliveryCount} failed email deliveries, ${operationalIncidents.staleSessionCount} stale sessions, and ${operationalIncidents.riskyShareCount} risky shares are in the loaded operations window.`,
    recommendation:
      operationalIncidents.status === "ready"
        ? "Keep auth, email, session, and share incident review in the release checklist."
        : "Resolve blocked auth/email incidents and review session/share exposure before release approval.",
    latestAt: latestRowAt(operationalIncidents.rows),
    target: operationalIncidents.rows.find((row) => row.status !== "ready")
      ?.target ?? null,
  };
}

function getRollbackRow(
  rollbackReadiness: AdminRollbackReadinessReport,
): AdminProductionMonitoringRow {
  return {
    id: "rollback-readiness",
    status: rollbackReadiness.status,
    kind: "rollback",
    label: "Rollback readiness",
    value: `${rollbackReadiness.score}`,
    detail: `${rollbackReadiness.versionAnchorCount} version anchors, ${rollbackReadiness.filesWithoutVersions} files without versions, ${rollbackReadiness.staleShareCount} stale shares, and ${rollbackReadiness.deploymentLinkCount} deployment links are visible.`,
    recommendation:
      rollbackReadiness.status === "ready"
        ? "Pair rollback readiness with release approval and smoke evidence."
        : "Resolve rollback readiness review rows before treating production monitoring as release-ready.",
    latestAt: rollbackReadiness.generatedAt,
    target: rollbackReadiness.rows.find((row) => row.status !== "ready")?.label ??
      rollbackReadiness.deploymentUrls[0] ??
      null,
  };
}

function getAdminActionsRow(
  recentActions: AdminProductionMonitoringAction[],
  highImpactActions: AdminProductionMonitoringAction[],
): AdminProductionMonitoringRow {
  if (recentActions.length === 0) {
    return {
      id: "recent-admin-actions-missing",
      status: "review",
      kind: "admin-actions",
      label: "Recent admin actions",
      value: "0",
      detail: `No admin audit actions were recorded in the last ${RECENT_ACTION_WINDOW_DAYS} days.`,
      recommendation:
        "Confirm admin audit ingestion is working before relying on the digest for production monitoring.",
      latestAt: null,
      target: null,
    };
  }

  return {
    id: "recent-admin-actions",
    status: highImpactActions.length > 8 ? "review" : "ready",
    kind: "admin-actions",
    label: "Recent admin actions",
    value: `${recentActions.length}`,
    detail: `${recentActions.length} admin actions and ${highImpactActions.length} high-impact changes were recorded in the last ${RECENT_ACTION_WINDOW_DAYS} days.`,
    recommendation:
      highImpactActions.length > 8
        ? "Review the high-impact admin action burst before release approval."
        : "Use recent audit actions to confirm release, access, and share operations are traceable.",
    latestAt: recentActions[0]?.createdAt ?? null,
    target: highImpactActions[0]?.targetLabel ?? recentActions[0]?.targetLabel ??
      null,
  };
}

function latestRuntimeIssueAt(report: RuntimeObservabilityReport) {
  return report.issues
    .map((issue) => issue.capturedAt)
    .sort((left, right) => toTime(right) - toTime(left))[0] ?? null;
}

function latestRowAt(rows: Array<{ latestAt: string | null }>) {
  return rows
    .map((row) => row.latestAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => toTime(right) - toTime(left))[0] ?? null;
}

function isHighImpactAction(action: string) {
  return HIGH_IMPACT_ACTIONS.has(action) || action.startsWith("release.");
}

function isRecent(value: string, now: number, days: number) {
  return toTime(value) >= now - days * 24 * 60 * 60 * 1000;
}

function sortActionsByCreatedAt(
  first: AdminProductionMonitoringAction,
  second: AdminProductionMonitoringAction,
) {
  return toTime(second.createdAt) - toTime(first.createdAt);
}

function toTime(value: string) {
  return new Date(value).getTime();
}
