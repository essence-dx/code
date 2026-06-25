import type { CostQuotaForecastProjection, CostQuotaForecastReport } from "@/features/projects/cost-quota-forecast-simulator";
import type { PolicyAsCodeCheckId, PolicyAsCodeCheckRow, PolicyAsCodeReport, PolicyAsCodeStatus } from "@/features/projects/policy-as-code-checks";
import type { ReleaseReadinessWebhookReport } from "@/features/projects/release-readiness-webhooks";

export type WorkspacePolicySimulationDomain = "permission" | "quota" | "release" | "retention" | "webhook";
export type WorkspacePolicySimulationSeverity = "critical" | "info" | "warning";
export type WorkspacePolicySimulationStatus = "blocked" | "ready" | "watch";

interface WorkspacePolicySimulationBaseChange {
  domain: WorkspacePolicySimulationDomain;
  id: string;
  label: string;
  ownerHint?: string;
}

export interface WorkspacePermissionPolicySimulationChange extends WorkspacePolicySimulationBaseChange {
  affectedProjectCount: number;
  domain: "permission";
  existingBlockedPolicyCount?: number;
  existingWatchPolicyCount?: number;
  grantsEditorAccess: boolean;
  opensPublicSurface: boolean;
  requiresReview: boolean;
}

export interface WorkspaceRetentionPolicySimulationChange extends WorkspacePolicySimulationBaseChange {
  auditLogDays: number;
  commentDays: number;
  destructiveCleanup: boolean;
  domain: "retention";
  evidencePacketDays: number;
  existingBlockedPolicyCount?: number;
  existingWatchPolicyCount?: number;
  requiresApproval: boolean;
  versionDays: number;
}

export interface WorkspaceReleasePolicySimulationChange extends WorkspacePolicySimulationBaseChange {
  blockedGateCount: number;
  bypassesApproval: boolean;
  domain: "release";
  existingBlockedPolicyCount?: number;
  existingWatchPolicyCount?: number;
  pendingGateCount: number;
  publicSurfaceCount: number;
}

export interface WorkspaceQuotaPolicySimulationProjection {
  label: string;
  projectedUsagePercent: number;
  resourceId: string;
}

export interface WorkspaceQuotaPolicySimulationChange extends WorkspacePolicySimulationBaseChange {
  domain: "quota";
  existingBlockedScenarioCount?: number;
  existingWatchScenarioCount?: number;
  projections: WorkspaceQuotaPolicySimulationProjection[];
}

export interface WorkspaceWebhookPolicySimulationChange extends WorkspacePolicySimulationBaseChange {
  domain: "webhook";
  existingBlockedEventCount?: number;
  existingWatchEventCount?: number;
  missingTrustedProviderCount: number;
  providerCount: number;
  replayProtectionEnabled: boolean;
  retryingDeliveryCount: number;
  trustedSignatureRequired: boolean;
}

export type WorkspacePolicySimulationChange =
  | WorkspacePermissionPolicySimulationChange
  | WorkspaceQuotaPolicySimulationChange
  | WorkspaceReleasePolicySimulationChange
  | WorkspaceRetentionPolicySimulationChange
  | WorkspaceWebhookPolicySimulationChange;

export interface WorkspacePolicySimulationRow {
  approvalRequired: boolean;
  blockers: string[];
  domain: WorkspacePolicySimulationDomain;
  evidence: string;
  id: string;
  impact: string;
  label: string;
  nextAction: string;
  ownerHint: string;
  riskScore: number;
  severity: WorkspacePolicySimulationSeverity;
  status: WorkspacePolicySimulationStatus;
  warnings: string[];
}

export interface WorkspacePolicySimulationReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  rows: WorkspacePolicySimulationRow[];
  summary: {
    approvalRequiredCount: number;
    blockedCount: number;
    blockerCount: number;
    nextAction: string;
    readyCount: number;
    simulationScore: number;
    totalCount: number;
    warningCount: number;
    watchCount: number;
    worstStatus: WorkspacePolicySimulationStatus;
  };
}

export interface CreateWorkspacePolicySimulationReportInput {
  changes: WorkspacePolicySimulationChange[];
  generatedAt?: string;
  workspaceId?: string;
}

export interface CreateWorkspacePolicySimulationReportFromSourcesInput {
  activeProjectCount: number;
  costQuotaForecast: CostQuotaForecastReport | null;
  generatedAt?: string;
  memberCount: number;
  policyAsCodeReport: PolicyAsCodeReport;
  releaseReadinessWebhooks: ReleaseReadinessWebhookReport | null;
  workspaceId?: string;
}

const statusRank: Record<WorkspacePolicySimulationStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const statusScore: Record<WorkspacePolicySimulationStatus, number> = {
  blocked: 0,
  ready: 100,
  watch: 65,
};

const retentionFloors = [
  { field: "auditLogDays", label: "audit logs", min: 365 },
  { field: "commentDays", label: "comments", min: 90 },
  { field: "evidencePacketDays", label: "evidence packets", min: 365 },
  { field: "versionDays", label: "versions", min: 30 },
] as const;

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function escapeCsvValue(value: string | number | boolean) {
  const text = String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function statusFromSignals(blockers: string[], warnings: string[]): WorkspacePolicySimulationStatus {
  if (blockers.length > 0) {
    return "blocked";
  }

  return warnings.length > 0 ? "watch" : "ready";
}

function severityForStatus(status: WorkspacePolicySimulationStatus): WorkspacePolicySimulationSeverity {
  if (status === "blocked") {
    return "critical";
  }

  return status === "watch" ? "warning" : "info";
}

function createRow(input: Omit<WorkspacePolicySimulationRow, "riskScore" | "severity" | "status">): WorkspacePolicySimulationRow {
  const status = statusFromSignals(input.blockers, input.warnings);

  return {
    ...input,
    riskScore: statusScore[status],
    severity: severityForStatus(status),
    status,
  };
}

function simulatePermissionChange(change: WorkspacePermissionPolicySimulationChange): WorkspacePolicySimulationRow {
  const blockers = [
    ...(!change.requiresReview && change.opensPublicSurface ? ["Public surfaces cannot open without an approved review gate."] : []),
    ...(!change.requiresReview && change.grantsEditorAccess ? ["Editor grants require role-access review before enforcement."] : []),
    ...((change.existingBlockedPolicyCount ?? 0) > 0 ? [`${countLabel(change.existingBlockedPolicyCount ?? 0, "existing permission blocker")} must clear first.`] : []),
  ];
  const warnings = [
    ...((change.existingWatchPolicyCount ?? 0) > 0 ? [`${countLabel(change.existingWatchPolicyCount ?? 0, "permission warning")} needs attestation.`] : []),
    ...(change.affectedProjectCount > 10 ? [`${countLabel(change.affectedProjectCount, "project")} will be touched by this permission change.`] : []),
  ];

  return createRow({
    approvalRequired: change.opensPublicSurface || change.grantsEditorAccess || change.requiresReview || blockers.length > 0,
    blockers,
    domain: change.domain,
    evidence: `${countLabel(change.affectedProjectCount, "project")} affected, public surface ${change.opensPublicSurface ? "opens" : "unchanged"}, editor grants ${
      change.grantsEditorAccess ? "included" : "unchanged"
    }.`,
    id: change.id,
    impact: "Changes who can view, embed, edit, or administer project surfaces.",
    label: change.label,
    nextAction:
      blockers.length > 0
        ? "Block enforcement until review gates and access attestations approve this permission change."
        : warnings.length > 0
          ? "Collect owner attestation before enforcing the permission update."
          : "Safe to enforce after recording the permission review evidence.",
    ownerHint: change.ownerHint ?? "Workspace access owner",
    warnings,
  });
}

function retentionWindowBlockers(change: WorkspaceRetentionPolicySimulationChange) {
  return retentionFloors.flatMap((floor) => (change[floor.field] < floor.min ? [`${floor.label} retention drops to ${change[floor.field]} days below the ${floor.min} day floor.`] : []));
}

function simulateRetentionChange(change: WorkspaceRetentionPolicySimulationChange): WorkspacePolicySimulationRow {
  const blockers = [
    ...(change.destructiveCleanup && !change.requiresApproval ? ["Destructive cleanup cannot run without purge approval."] : []),
    ...retentionWindowBlockers(change),
    ...((change.existingBlockedPolicyCount ?? 0) > 0 ? [`${countLabel(change.existingBlockedPolicyCount ?? 0, "existing retention blocker")} must clear first.`] : []),
  ];
  const warnings = [
    ...(change.destructiveCleanup && change.requiresApproval ? ["Destructive cleanup requires retained deletion manifest evidence."] : []),
    ...((change.existingWatchPolicyCount ?? 0) > 0 ? [`${countLabel(change.existingWatchPolicyCount ?? 0, "retention warning")} should be reviewed.`] : []),
  ];

  return createRow({
    approvalRequired: change.destructiveCleanup || change.requiresApproval || blockers.length > 0,
    blockers,
    domain: change.domain,
    evidence: `Audit ${change.auditLogDays}d, comments ${change.commentDays}d, versions ${change.versionDays}d, evidence packets ${change.evidencePacketDays}d.`,
    id: change.id,
    impact: "Changes how long audit, comment, version, and evidence packet records remain available.",
    label: change.label,
    nextAction:
      blockers.length > 0
        ? "Block enforcement until retention floors and purge approval requirements pass."
        : warnings.length > 0
          ? "Attach the deletion manifest and reviewer note before scheduling cleanup."
          : "Safe to enforce with the retention policy review record.",
    ownerHint: change.ownerHint ?? "Compliance owner",
    warnings,
  });
}

function simulateReleaseChange(change: WorkspaceReleasePolicySimulationChange): WorkspacePolicySimulationRow {
  const blockers = [
    ...(change.bypassesApproval ? ["Release approval gates cannot be bypassed."] : []),
    ...(change.blockedGateCount > 0 ? [`${countLabel(change.blockedGateCount, "blocked release gate")} must be cleared.`] : []),
    ...((change.existingBlockedPolicyCount ?? 0) > 0 ? [`${countLabel(change.existingBlockedPolicyCount ?? 0, "existing release blocker")} must clear first.`] : []),
  ];
  const warnings = [
    ...(change.pendingGateCount > 0 ? [`${countLabel(change.pendingGateCount, "release gate")} still pending approval.`] : []),
    ...((change.existingWatchPolicyCount ?? 0) > 0 ? [`${countLabel(change.existingWatchPolicyCount ?? 0, "release warning")} should be reviewed.`] : []),
  ];

  return createRow({
    approvalRequired: change.publicSurfaceCount > 0 || change.blockedGateCount > 0 || change.pendingGateCount > 0,
    blockers,
    domain: change.domain,
    evidence: `${countLabel(change.publicSurfaceCount, "public surface")}, ${countLabel(change.blockedGateCount, "blocked gate")}, ${countLabel(change.pendingGateCount, "pending gate")}.`,
    id: change.id,
    impact: "Controls whether publish, export, promotion, and package release actions can proceed.",
    label: change.label,
    nextAction:
      blockers.length > 0
        ? "Block enforcement until release gates are approved and no bypass is requested."
        : warnings.length > 0
          ? "Finish pending release approvals before turning this policy on."
          : "Safe to enforce with the release approval packet.",
    ownerHint: change.ownerHint ?? "Launch owner",
    warnings,
  });
}

function simulateQuotaChange(change: WorkspaceQuotaPolicySimulationChange): WorkspacePolicySimulationRow {
  const highestProjection = change.projections.reduce<WorkspaceQuotaPolicySimulationProjection | null>(
    (highest, projection) => (!highest || projection.projectedUsagePercent > highest.projectedUsagePercent ? projection : highest),
    null,
  );
  const maxUsagePercent = highestProjection?.projectedUsagePercent ?? 0;
  const blockers = [
    ...(maxUsagePercent >= 100 ? [`${highestProjection?.label ?? "Resource"} would exceed the free-tier limit at ${maxUsagePercent}%.`] : []),
    ...((change.existingBlockedScenarioCount ?? 0) > 0 ? [`${countLabel(change.existingBlockedScenarioCount ?? 0, "blocked quota scenario")} must clear first.`] : []),
  ];
  const warnings = [
    ...(maxUsagePercent >= 80 && maxUsagePercent < 100 ? [`${highestProjection?.label ?? "Resource"} reaches ${maxUsagePercent}% projected usage.`] : []),
    ...((change.existingWatchScenarioCount ?? 0) > 0 ? [`${countLabel(change.existingWatchScenarioCount ?? 0, "quota scenario")} is already in watch state.`] : []),
  ];

  return createRow({
    approvalRequired: blockers.length > 0,
    blockers,
    domain: change.domain,
    evidence: `${countLabel(change.projections.length, "resource")} projected, highest load ${maxUsagePercent}%.`,
    id: change.id,
    impact: "Forecasts free-tier pressure for Vercel, Turso, Brevo, storage, and worker queues.",
    label: change.label,
    nextAction:
      blockers.length > 0
        ? "Block enforcement until quota pressure is reduced or the release is split."
        : warnings.length > 0
          ? "Review watched quota projections before scheduling the campaign."
          : "Safe to enforce inside the current free-tier guardrails.",
    ownerHint: change.ownerHint ?? "Release operations owner",
    warnings,
  });
}

function simulateWebhookChange(change: WorkspaceWebhookPolicySimulationChange): WorkspacePolicySimulationRow {
  const blockers = [
    ...(change.trustedSignatureRequired && change.missingTrustedProviderCount > 0
      ? [`${countLabel(change.missingTrustedProviderCount, "provider")} lacks trusted webhook signature coverage.`]
      : []),
    ...(!change.replayProtectionEnabled ? ["Replay protection must be enabled before accepting provider events."] : []),
    ...((change.existingBlockedEventCount ?? 0) > 0 ? [`${countLabel(change.existingBlockedEventCount ?? 0, "blocked webhook event")} must be resolved.`] : []),
  ];
  const warnings = [
    ...(change.retryingDeliveryCount > 0 ? [`${countLabel(change.retryingDeliveryCount, "webhook delivery")} still retrying.`] : []),
    ...((change.existingWatchEventCount ?? 0) > 0 ? [`${countLabel(change.existingWatchEventCount ?? 0, "webhook event")} is in watch state.`] : []),
  ];

  return createRow({
    approvalRequired: change.trustedSignatureRequired || blockers.length > 0,
    blockers,
    domain: change.domain,
    evidence: `${change.providerCount} providers, ${countLabel(change.missingTrustedProviderCount, "missing trusted signature")}, replay ${
      change.replayProtectionEnabled ? "enabled" : "disabled"
    }.`,
    id: change.id,
    impact: "Changes trusted ingestion for deploy, migration, delivery, and desktop updater events.",
    label: change.label,
    nextAction:
      blockers.length > 0
        ? "Block enforcement until provider signing secrets and replay protection are verified."
        : warnings.length > 0
          ? "Let retrying webhook deliveries settle before enforcing the cutover."
          : "Safe to enforce with trusted signatures and replay protection enabled.",
    ownerHint: change.ownerHint ?? "Automation owner",
    warnings,
  });
}

function simulateChange(change: WorkspacePolicySimulationChange): WorkspacePolicySimulationRow {
  switch (change.domain) {
    case "permission":
      return simulatePermissionChange(change);
    case "quota":
      return simulateQuotaChange(change);
    case "release":
      return simulateReleaseChange(change);
    case "retention":
      return simulateRetentionChange(change);
    case "webhook":
      return simulateWebhookChange(change);
  }
}

function createCsv(rows: WorkspacePolicySimulationRow[]) {
  const header = ["domain", "status", "label", "approval_required", "blockers", "warnings", "next_action"];
  const body = rows.map((row) =>
    [row.domain, row.status, row.label, row.approvalRequired, row.blockers.join("; "), row.warnings.join("; "), row.nextAction].map(escapeCsvValue).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarizeRows(rows: WorkspacePolicySimulationRow[]): WorkspacePolicySimulationReport["summary"] {
  const worstStatus = rows.reduce<WorkspacePolicySimulationStatus>((worst, row) => (statusRank[row.status] < statusRank[worst] ? row.status : worst), "ready");

  return {
    approvalRequiredCount: rows.filter((row) => row.approvalRequired).length,
    blockedCount: rows.filter((row) => row.status === "blocked").length,
    blockerCount: rows.reduce((sum, row) => sum + row.blockers.length, 0),
    nextAction:
      worstStatus === "blocked"
        ? "Block enforcement until every blocking simulation result is resolved."
        : worstStatus === "watch"
          ? "Review watched policy changes before enforcing them."
          : "All simulated policy changes are ready for enforcement.",
    readyCount: rows.filter((row) => row.status === "ready").length,
    simulationScore: Math.round(rows.reduce((sum, row) => sum + row.riskScore, 0) / Math.max(rows.length, 1)),
    totalCount: rows.length,
    warningCount: rows.reduce((sum, row) => sum + row.warnings.length, 0),
    watchCount: rows.filter((row) => row.status === "watch").length,
    worstStatus,
  };
}

export function createWorkspacePolicySimulationReport(input: CreateWorkspacePolicySimulationReportInput): WorkspacePolicySimulationReport {
  const rows = input.changes.map(simulateChange);
  const csvContent = createCsv(rows);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${input.workspaceId ?? "workspace"}-policy-simulation.csv`,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    rows,
    summary: summarizeRows(rows),
  };
}

function findPolicyRow(report: PolicyAsCodeReport, id: PolicyAsCodeCheckId): PolicyAsCodeCheckRow | null {
  return report.rows.find((row) => row.id === id) ?? null;
}

function blockedSignal(row: PolicyAsCodeCheckRow | null) {
  return (row?.failCount ?? 0) + (row?.status === "blocked" ? 1 : 0);
}

function watchSignal(row: PolicyAsCodeCheckRow | null) {
  return (row?.warningCount ?? 0) + (row?.status === "watch" ? 1 : 0);
}

function statusSignal(status: PolicyAsCodeStatus | undefined) {
  return status === "blocked" ? 1 : 0;
}

function projectedQuotaRows(report: CostQuotaForecastReport | null): WorkspaceQuotaPolicySimulationProjection[] {
  const scenario =
    report?.scenarios.find((entry) => entry.id === "public-launch") ??
    report?.scenarios.reduce((largest, entry) => (entry.worstProjectedUsagePercent > largest.worstProjectedUsagePercent ? entry : largest), report.scenarios[0]);

  return (
    scenario?.projections.map((projection: CostQuotaForecastProjection) => ({
      label: projection.label,
      projectedUsagePercent: projection.projectedUsagePercent,
      resourceId: projection.resourceId,
    })) ?? []
  );
}

export function createWorkspacePolicySimulationReportFromSources(input: CreateWorkspacePolicySimulationReportFromSourcesInput): WorkspacePolicySimulationReport {
  const permissionRow = findPolicyRow(input.policyAsCodeReport, "publish-permissions");
  const retentionRow = findPolicyRow(input.policyAsCodeReport, "retention-windows");
  const releaseRow = findPolicyRow(input.policyAsCodeReport, "release-approvals");
  const releasePublicSurfaceRow = findPolicyRow(input.policyAsCodeReport, "public-surface-guardrails");
  const webhookSummary = input.releaseReadinessWebhooks?.summary;
  const changes: WorkspacePolicySimulationChange[] = [
    {
      affectedProjectCount: input.activeProjectCount,
      domain: "permission",
      existingBlockedPolicyCount: blockedSignal(permissionRow),
      existingWatchPolicyCount: watchSignal(permissionRow),
      grantsEditorAccess: input.memberCount > 1,
      id: "workspace-permission-enforcement",
      label: "Permission policy enforcement",
      opensPublicSurface: statusSignal(releasePublicSurfaceRow?.status) > 0,
      requiresReview: true,
    },
    {
      auditLogDays: 730,
      commentDays: 365,
      destructiveCleanup: false,
      domain: "retention",
      evidencePacketDays: 730,
      existingBlockedPolicyCount: blockedSignal(retentionRow),
      existingWatchPolicyCount: watchSignal(retentionRow),
      id: "workspace-retention-enforcement",
      label: "Retention policy enforcement",
      requiresApproval: true,
      versionDays: 180,
    },
    {
      blockedGateCount: releaseRow?.failCount ?? 0,
      bypassesApproval: false,
      domain: "release",
      existingBlockedPolicyCount: blockedSignal(releaseRow),
      existingWatchPolicyCount: watchSignal(releaseRow),
      id: "workspace-release-enforcement",
      label: "Release gate enforcement",
      pendingGateCount: releaseRow?.warningCount ?? 0,
      publicSurfaceCount: input.activeProjectCount,
    },
    {
      domain: "quota",
      existingBlockedScenarioCount: input.costQuotaForecast?.summary.blockedScenarioCount ?? 0,
      existingWatchScenarioCount: input.costQuotaForecast?.summary.watchScenarioCount ?? 0,
      id: "workspace-quota-enforcement",
      label: "Quota guardrail enforcement",
      projections: projectedQuotaRows(input.costQuotaForecast),
    },
    {
      domain: "webhook",
      existingBlockedEventCount: webhookSummary?.blockedCount ?? 0,
      existingWatchEventCount: webhookSummary?.watchCount ?? 0,
      id: "workspace-webhook-enforcement",
      label: "Webhook trust enforcement",
      missingTrustedProviderCount: webhookSummary?.missingProviderCount ?? 4,
      providerCount: 4,
      replayProtectionEnabled: (webhookSummary?.blockedCount ?? 1) === 0,
      retryingDeliveryCount: webhookSummary?.watchCount ?? 0,
      trustedSignatureRequired: true,
    },
  ];

  return createWorkspacePolicySimulationReport({
    changes,
    generatedAt: input.generatedAt,
    workspaceId: input.workspaceId,
  });
}
