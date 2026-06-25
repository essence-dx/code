import { getProjectReviewGate } from "@/features/projects/project-review-gates";
import type { ProjectDataRetentionPurgeReviewStatus, ProjectDataRetentionPolicySettings } from "@/features/projects/project-data-retention";
import { projectReviewSurfaceLabels, resolveShareSettings, type ProjectReviewSurface } from "@/features/projects/share-settings";

type DateLike = Date | string | null | undefined;

export type PolicyAsCodeCheckId = "public-surface-guardrails" | "publish-permissions" | "release-approvals" | "retention-windows";
export type PolicyAsCodeRuleStatus = "fail" | "pass" | "warn";
export type PolicyAsCodeStatus = "blocked" | "ready" | "watch";

export interface PolicyAsCodeProjectSource {
  archivedAt: DateLike;
  id: string;
  name: string;
  publishedAt: DateLike;
  shareId?: string | null;
  shareSettings: unknown;
}

export interface PolicyAsCodeRetentionPolicySource extends Partial<ProjectDataRetentionPolicySettings> {
  projectId: string;
  purgeReviewStatus: ProjectDataRetentionPurgeReviewStatus;
  updatedAt: DateLike;
}

export interface PolicyAsCodeSecurityComplianceSource {
  projectRows: {
    blockedSurfaces: string[];
    id: string;
    name: string;
    retentionCovered: boolean;
    retentionPurgeStatus: ProjectDataRetentionPurgeReviewStatus | null;
    risk: "blocked" | "healthy" | "watch";
  }[];
  retention: {
    coveragePercent: number;
    missingProjectCount: number;
    purgeApprovalRequestedCount: number;
    stalePolicyCount: number;
  };
  reviewSurfaces: {
    blockedCount: number;
    label: string;
    surface: string;
  }[];
  summary: {
    activeProjectCount: number;
    projectWithBlockerCount: number;
    trustScore: number;
  };
}

export interface PolicyAsCodeReleaseArchiveSource {
  summary: {
    blockedCount: number;
    governanceScore: number;
    totalCount: number;
    watchCount: number;
    worstStatus: PolicyAsCodeStatus;
  };
}

export interface PolicyAsCodeReviewerHandoffSource {
  summary: {
    blockedAttestationCount: number;
    handoffScore: number;
    pendingAttestationCount: number;
    signedAttestationCount: number;
    status: PolicyAsCodeStatus;
    totalAttestationCount: number;
  };
}

export interface PolicyAsCodePublicSurfaceHealthSource {
  summary: {
    failCount: number;
    passCount: number;
    screenshotDiffCount: number;
    screenshotPendingCount: number;
    totalCount: number;
    warnCount: number;
  };
}

export interface PolicyAsCodeWorkspaceRiskSource {
  actionItems: unknown[];
  riskLevel: "critical" | "healthy" | "watch";
  score: number;
}

export interface PolicyAsCodeRule {
  evidence: string;
  id: string;
  label: string;
  status: PolicyAsCodeRuleStatus;
}

export interface PolicyAsCodeCheckRow {
  evidence: string;
  failCount: number;
  id: PolicyAsCodeCheckId;
  label: string;
  nextAction: string;
  ownerHint: string;
  passCount: number;
  ruleCount: number;
  rules: PolicyAsCodeRule[];
  status: PolicyAsCodeStatus;
  warningCount: number;
}

export interface PolicyAsCodeReport {
  generatedAt: string;
  rows: PolicyAsCodeCheckRow[];
  summary: {
    blockedCount: number;
    failedRuleCount: number;
    passedRuleCount: number;
    policyScore: number;
    readyCount: number;
    totalCount: number;
    warningRuleCount: number;
    watchCount: number;
    worstStatus: PolicyAsCodeStatus;
  };
}

export interface CreatePolicyAsCodeReportInput {
  generatedAt?: string;
  projects: PolicyAsCodeProjectSource[];
  publicSurfaceHealthReport: PolicyAsCodePublicSurfaceHealthSource;
  releaseArchiveExplorer: PolicyAsCodeReleaseArchiveSource;
  retentionPolicies: PolicyAsCodeRetentionPolicySource[];
  reviewerHandoffPacket: PolicyAsCodeReviewerHandoffSource;
  securityComplianceReport: PolicyAsCodeSecurityComplianceSource;
  workspaceRiskDigest: PolicyAsCodeWorkspaceRiskSource;
}

interface RetentionWindowThreshold {
  field: keyof ProjectDataRetentionPolicySettings;
  label: string;
  max: number;
  min: number;
}

const statusRank: Record<PolicyAsCodeStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const statusScore: Record<PolicyAsCodeStatus, number> = {
  blocked: 0,
  watch: 65,
  ready: 100,
};

const retentionWindowThresholds: RetentionWindowThreshold[] = [
  { field: "auditLogDays", label: "audit logs", max: 3650, min: 365 },
  { field: "commentDays", label: "comments", max: 3650, min: 90 },
  { field: "deletedAssetTombstoneDays", label: "deleted asset tombstones", max: 3650, min: 90 },
  { field: "versionDays", label: "versions", max: 3650, min: 30 },
];

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

function isArchived(value: DateLike) {
  return Boolean(value);
}

function hasPublishedSurface(project: PolicyAsCodeProjectSource) {
  return Boolean(project.publishedAt || project.shareId);
}

function rule(input: PolicyAsCodeRule): PolicyAsCodeRule {
  return input;
}

function row(input: Omit<PolicyAsCodeCheckRow, "failCount" | "passCount" | "ruleCount" | "status" | "warningCount">): PolicyAsCodeCheckRow {
  const failCount = input.rules.filter((entry) => entry.status === "fail").length;
  const warningCount = input.rules.filter((entry) => entry.status === "warn").length;
  const status: PolicyAsCodeStatus = failCount > 0 ? "blocked" : warningCount > 0 ? "watch" : "ready";

  return {
    ...input,
    failCount,
    passCount: input.rules.filter((entry) => entry.status === "pass").length,
    ruleCount: input.rules.length,
    status,
    warningCount,
  };
}

function publishPermissionIssues(projects: PolicyAsCodeProjectSource[]) {
  return projects.flatMap((project) => {
    const settings = resolveShareSettings(project.shareSettings);
    const requirements: { required: boolean; surface: ProjectReviewSurface }[] = [
      { required: hasPublishedSurface(project) || settings.allowView, surface: "publicLink" },
      { required: settings.allowCodeExport || settings.allowEmbed || settings.allowPublicApi, surface: "embed" },
      { required: settings.allowViewerDownload, surface: "appPackage" },
    ];

    return requirements.flatMap((requirement) => {
      const gate = getProjectReviewGate(settings, requirement.surface);

      return requirement.required && !gate.allowed ? [`${project.name}: ${projectReviewSurfaceLabels[requirement.surface]}`] : [];
    });
  });
}

function createPublishPermissionsRow(input: {
  projects: PolicyAsCodeProjectSource[];
  securityComplianceReport: PolicyAsCodeSecurityComplianceSource;
}) {
  const activeProjects = input.projects.filter((project) => !isArchived(project.archivedAt));
  const publishedCount = activeProjects.filter(hasPublishedSurface).length;
  const permissionIssueCount = publishPermissionIssues(activeProjects).length;
  const publishedWithoutShareIdCount = activeProjects.filter((project) => project.publishedAt && !project.shareId).length;
  const reviewSurfaceBlockerCount = input.securityComplianceReport.reviewSurfaces.reduce((sum, surface) => sum + surface.blockedCount, 0);
  const blockedProjectCount = input.securityComplianceReport.projectRows.filter((project) => project.risk === "blocked").length;
  const trustScore = input.securityComplianceReport.summary.trustScore;
  const rules = [
    rule({
      evidence: `${plural(permissionIssueCount, "unapproved public permission surface")} across ${plural(activeProjects.length, "active project")}.`,
      id: "publish-review-approvals",
      label: "Public permissions require approved review gates",
      status: permissionIssueCount > 0 ? "fail" : "pass",
    }),
    rule({
      evidence: `${plural(publishedWithoutShareIdCount, "published project")} missing a public share id.`,
      id: "published-share-id",
      label: "Published scenes keep stable share identifiers",
      status: publishedWithoutShareIdCount > 0 ? "warn" : "pass",
    }),
    rule({
      evidence: `${plural(blockedProjectCount, "blocked project")} and ${plural(input.securityComplianceReport.summary.projectWithBlockerCount, "project")} with compliance signals.`,
      id: "security-compliance-blockers",
      label: "Security compliance has no blocker projects",
      status: blockedProjectCount > 0 ? "fail" : input.securityComplianceReport.summary.projectWithBlockerCount > 0 ? "warn" : "pass",
    }),
    rule({
      evidence: `Workspace trust score is ${trustScore}/100.`,
      id: "workspace-trust-floor",
      label: "Workspace trust score stays above release floor",
      status: trustScore < 70 ? "fail" : trustScore < 90 ? "warn" : "pass",
    }),
  ];

  return row({
    evidence: `${plural(permissionIssueCount, "permission issue")}, ${plural(reviewSurfaceBlockerCount, "review-surface blocker")}, ${plural(publishedCount, "published scene")}.`,
    id: "publish-permissions",
    label: "Publish permissions",
    nextAction:
      permissionIssueCount > 0 || blockedProjectCount > 0
        ? "Approve required review gates or disable public permissions before publishing."
        : publishedWithoutShareIdCount > 0 || trustScore < 90
          ? "Refresh share identifiers and compliance evidence before the next handoff."
          : "Keep publish permission policies attached to each review surface.",
    ownerHint: "Publishing owner",
    rules,
  });
}

function retentionWindowIssues(policy: PolicyAsCodeRetentionPolicySource) {
  return retentionWindowThresholds.flatMap((threshold) => {
    const value = policy[threshold.field];

    if (!Number.isFinite(value ?? NaN)) {
      return [`${policy.projectId} is missing ${threshold.label} retention days.`];
    }

    if ((value ?? 0) < threshold.min) {
      return [`${policy.projectId} keeps ${threshold.label} for ${value} days, below ${threshold.min}.`];
    }

    if ((value ?? 0) > threshold.max) {
      return [`${policy.projectId} keeps ${threshold.label} for ${value} days, above ${threshold.max}.`];
    }

    return [];
  });
}

function createRetentionWindowsRow(input: {
  projects: PolicyAsCodeProjectSource[];
  retentionPolicies: PolicyAsCodeRetentionPolicySource[];
  securityComplianceReport: PolicyAsCodeSecurityComplianceSource;
}) {
  const activeProjectIds = new Set(input.projects.filter((project) => !isArchived(project.archivedAt)).map((project) => project.id));
  const activePolicies = input.retentionPolicies.filter((policy) => activeProjectIds.has(policy.projectId));
  const windowIssueCount = activePolicies.flatMap(retentionWindowIssues).length;
  const changesRequestedCount = activePolicies.filter((policy) => policy.purgeReviewStatus === "changesRequested").length;
  const requestedPurgeCount = activePolicies.filter((policy) => policy.purgeReviewStatus === "requested").length;
  const missingPolicyCount = input.securityComplianceReport.retention.missingProjectCount;
  const stalePolicyCount = input.securityComplianceReport.retention.stalePolicyCount;
  const rules = [
    rule({
      evidence: `${input.securityComplianceReport.retention.coveragePercent}% coverage, ${plural(missingPolicyCount, "active project")} missing policy coverage.`,
      id: "retention-policy-coverage",
      label: "Every active project has a retention policy",
      status: missingPolicyCount > 0 ? "fail" : "pass",
    }),
    rule({
      evidence: `${plural(windowIssueCount, "retention window")} outside the policy floor or ceiling.`,
      id: "retention-window-bounds",
      label: "Retention windows stay inside approved bounds",
      status: windowIssueCount > 0 ? "fail" : "pass",
    }),
    rule({
      evidence: `${plural(stalePolicyCount, "policy")} older than the 90 day review window.`,
      id: "retention-freshness",
      label: "Retention policies are reviewed every 90 days",
      status: stalePolicyCount > 0 ? "warn" : "pass",
    }),
    rule({
      evidence: `${plural(changesRequestedCount, "purge review")} with changes requested, ${plural(requestedPurgeCount, "review")} awaiting approval.`,
      id: "retention-purge-approvals",
      label: "Destructive purge manifests have clear approval state",
      status: changesRequestedCount > 0 ? "fail" : requestedPurgeCount > 0 ? "warn" : "pass",
    }),
  ];

  return row({
    evidence: `${plural(activePolicies.length, "policy")} checked, ${plural(windowIssueCount, "window issue")}, ${plural(stalePolicyCount, "stale policy")}.`,
    id: "retention-windows",
    label: "Retention windows",
    nextAction:
      missingPolicyCount > 0 || windowIssueCount > 0 || changesRequestedCount > 0
        ? "Add missing policies, adjust unsafe retention windows, and resolve rejected purge reviews."
        : stalePolicyCount > 0 || requestedPurgeCount > 0
          ? "Refresh stale policies and finish requested purge approvals."
          : "Keep retention policy reviews attached to the governance packet.",
    ownerHint: "Compliance owner",
    rules,
  });
}

function createReleaseApprovalsRow(input: {
  releaseArchiveExplorer: PolicyAsCodeReleaseArchiveSource;
  reviewerHandoffPacket: PolicyAsCodeReviewerHandoffSource;
  workspaceRiskDigest: PolicyAsCodeWorkspaceRiskSource;
}) {
  const archive = input.releaseArchiveExplorer.summary;
  const handoff = input.reviewerHandoffPacket.summary;
  const risk = input.workspaceRiskDigest;
  const rules = [
    rule({
      evidence: `${plural(archive.blockedCount, "blocked archive row")}, ${plural(archive.watchCount, "watched archive row")}, governance ${archive.governanceScore}/100.`,
      id: "release-archive-ready",
      label: "Release archive has no blocked evidence rows",
      status: archive.blockedCount > 0 || archive.worstStatus === "blocked" ? "fail" : archive.watchCount > 0 || archive.worstStatus === "watch" ? "warn" : "pass",
    }),
    rule({
      evidence: `Reviewer handoff is ${handoff.status} with ${handoff.handoffScore}/100 handoff score.`,
      id: "reviewer-handoff-ready",
      label: "Reviewer handoff packet is ready",
      status: handoff.status === "blocked" ? "fail" : handoff.status === "watch" ? "warn" : "pass",
    }),
    rule({
      evidence: `${handoff.signedAttestationCount}/${handoff.totalAttestationCount} attestations signed, ${plural(handoff.pendingAttestationCount, "pending attestation")}.`,
      id: "owner-attestations-signed",
      label: "Required owner attestations are signed",
      status: handoff.blockedAttestationCount > 0 ? "fail" : handoff.pendingAttestationCount > 0 ? "warn" : "pass",
    }),
    rule({
      evidence: `Workspace risk is ${risk.riskLevel} with ${risk.score}/100 score and ${plural(risk.actionItems.length, "action item")}.`,
      id: "workspace-risk-approved",
      label: "Workspace risk is approved for release",
      status: risk.riskLevel === "critical" ? "fail" : risk.riskLevel === "watch" ? "warn" : "pass",
    }),
  ];

  return row({
    evidence: `${plural(archive.totalCount, "archive row")} checked, handoff ${handoff.status}, risk ${risk.riskLevel}.`,
    id: "release-approvals",
    label: "Release approvals",
    nextAction:
      archive.blockedCount > 0 || handoff.status === "blocked" || risk.riskLevel === "critical"
        ? "Clear blocked release evidence and regenerate the reviewer packet."
        : archive.watchCount > 0 || handoff.status === "watch" || risk.riskLevel === "watch"
          ? "Resolve watched release evidence before external review."
          : "Keep release approval hashes and attestations with the archive.",
    ownerHint: "Launch owner",
    rules,
  });
}

function createPublicSurfaceGuardrailsRow(input: {
  projects: PolicyAsCodeProjectSource[];
  publicSurfaceHealthReport: PolicyAsCodePublicSurfaceHealthSource;
}) {
  const publishedCount = input.projects.filter((project) => !isArchived(project.archivedAt) && hasPublishedSurface(project)).length;
  const summary = input.publicSurfaceHealthReport.summary;
  const rules = [
    rule({
      evidence: `${plural(summary.totalCount, "public surface")} monitored for ${plural(publishedCount, "published project")}.`,
      id: "public-surface-coverage",
      label: "Published surfaces have health snapshots",
      status: publishedCount > 0 && summary.totalCount === 0 ? "fail" : "pass",
    }),
    rule({
      evidence: `${plural(summary.failCount, "failed public surface")} in the latest health snapshot.`,
      id: "public-surface-failures",
      label: "Public surface checks have zero failures",
      status: summary.failCount > 0 ? "fail" : "pass",
    }),
    rule({
      evidence: `${plural(summary.warnCount, "warning")} and ${plural(summary.screenshotPendingCount, "pending screenshot")} in public health.`,
      id: "public-surface-warnings",
      label: "Public surface warnings are triaged",
      status: summary.warnCount > 0 || summary.screenshotPendingCount > 0 ? "warn" : "pass",
    }),
    rule({
      evidence: `${plural(summary.screenshotDiffCount, "visual diff")} awaiting review.`,
      id: "public-surface-visual-diffs",
      label: "Screenshot diffs are reviewed",
      status: summary.screenshotDiffCount > 0 ? "warn" : "pass",
    }),
  ];

  return row({
    evidence: `${summary.passCount}/${summary.totalCount} checks passing, ${plural(summary.failCount, "failure")}, ${plural(summary.warnCount, "warning")}.`,
    id: "public-surface-guardrails",
    label: "Public surface guardrails",
    nextAction:
      summary.failCount > 0 || (publishedCount > 0 && summary.totalCount === 0)
        ? "Fix failing public viewer, embed, API, or app package surfaces before release."
        : summary.warnCount > 0 || summary.screenshotPendingCount > 0 || summary.screenshotDiffCount > 0
          ? "Capture pending screenshots and review warning snapshots."
          : "Keep public health snapshots fresh after every meaningful release.",
    ownerHint: "Release operator",
    rules,
  });
}

function summarizeRows(rows: PolicyAsCodeCheckRow[]): PolicyAsCodeReport["summary"] {
  const worstStatus = rows.reduce<PolicyAsCodeStatus>((worst, entry) => (statusRank[entry.status] < statusRank[worst] ? entry.status : worst), "ready");

  return {
    blockedCount: rows.filter((entry) => entry.status === "blocked").length,
    failedRuleCount: rows.reduce((sum, entry) => sum + entry.failCount, 0),
    passedRuleCount: rows.reduce((sum, entry) => sum + entry.passCount, 0),
    policyScore: Math.round(rows.reduce((sum, entry) => sum + statusScore[entry.status], 0) / Math.max(rows.length, 1)),
    readyCount: rows.filter((entry) => entry.status === "ready").length,
    totalCount: rows.length,
    warningRuleCount: rows.reduce((sum, entry) => sum + entry.warningCount, 0),
    watchCount: rows.filter((entry) => entry.status === "watch").length,
    worstStatus,
  };
}

export function createPolicyAsCodeReport(input: CreatePolicyAsCodeReportInput): PolicyAsCodeReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const rows = [
    createPublishPermissionsRow(input),
    createRetentionWindowsRow(input),
    createReleaseApprovalsRow(input),
    createPublicSurfaceGuardrailsRow(input),
  ];

  return {
    generatedAt,
    rows,
    summary: summarizeRows(rows),
  };
}
