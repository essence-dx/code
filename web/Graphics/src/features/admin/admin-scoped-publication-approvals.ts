import type { AdminAuditMetadata } from "@/db/schema";
import type {
  AdminBranchReviewInboxReport,
  AdminBranchReviewRequest,
} from "@/features/admin/admin-branch-review-inbox";
import type {
  AdminPublishChannel,
  AdminPublishChannelManagerReport,
} from "@/features/admin/admin-publish-channel-manager";
import type {
  AdminReleasePublicationGateReport,
  AdminReleasePublicationGateRow,
} from "@/features/admin/admin-release-publication-gates";
import type {
  AdminRollbackReadinessReport,
  AdminRollbackVersionRow,
} from "@/features/admin/admin-rollback-readiness";

export const SCOPED_PUBLICATION_APPROVAL_ACTION =
  "publication_scope.approval_decision";

export type ScopedPublicationStatus = "ready" | "review" | "blocked";
export type ScopedPublicationDecision = "approved" | "changes-requested";

export type ScopedPublicationFile = {
  id: string;
  name: string;
  ownerEmail: string;
  teamName: string;
  projectName: string;
  updatedAt: string;
  trashedAt: string | null;
};

export type ScopedPublicationAuditEvent = {
  action: string;
  actorEmail: string;
  targetId: string;
  targetLabel: string;
  metadata: AdminAuditMetadata;
  createdAt: string;
};

export type ScopedPublicationApprovalDecisionRecord = {
  id: string;
  scopeKey: string;
  teamName: string;
  projectName: string;
  decision: ScopedPublicationDecision;
  reviewerName: string;
  reviewerEmail: string;
  note: string;
  channelCount: number;
  blockerCount: number;
  evidenceDiffCount: number;
  rollbackAnchorCount: number;
  slaDueAt: string | null;
  createdAt: string;
};

export type ScopedPublicationApprovalScope = {
  scopeKey: string;
  teamName: string;
  projectName: string;
  status: ScopedPublicationStatus;
  approvalState: "approved" | "missing" | "stale" | "changes-requested";
  reviewerSummary: string;
  reviewerEmail: string | null;
  slaStatus: "clear" | "due-soon" | "overdue" | "unscheduled";
  slaDueAt: string | null;
  fileCount: number;
  channelCount: number;
  readyChannelCount: number;
  blockedChannelCount: number;
  rollbackAnchorCount: number;
  branchRequestCount: number;
  branchBlockerCount: number;
  releaseEvidenceDiffCount: number;
  latestActivityAt: string | null;
  latestDecision: ScopedPublicationApprovalDecisionRecord | null;
  evidence: string[];
  blockers: string[];
  recommendation: string;
};

export type ScopedPublicationApprovalRow = {
  id: string;
  scopeKey: string;
  teamName: string;
  projectName: string;
  category: "approval" | "channels" | "evidence" | "rollback" | "sla";
  status: ScopedPublicationStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
  latestAt: string | null;
};

export type ScopedPublicationApprovalReport = {
  generatedAt: string;
  status: ScopedPublicationStatus;
  score: number;
  scopeCount: number;
  readyScopeCount: number;
  reviewScopeCount: number;
  blockedScopeCount: number;
  approvedScopeCount: number;
  missingApprovalCount: number;
  staleApprovalCount: number;
  overdueScopeCount: number;
  rollbackAnchoredScopeCount: number;
  releaseEvidenceDiffCount: number;
  scopes: ScopedPublicationApprovalScope[];
  rows: ScopedPublicationApprovalRow[];
  commands: string[];
};

export type ScopedPublicationApprovalInput = {
  auditEvents: ScopedPublicationAuditEvent[];
  branchReviewInbox: AdminBranchReviewInboxReport;
  files: ScopedPublicationFile[];
  generatedAt?: string;
  now?: number;
  publishChannels: AdminPublishChannelManagerReport;
  releasePublicationGates: AdminReleasePublicationGateReport;
  rollbackReadiness: AdminRollbackReadinessReport;
  slaHours?: number;
};

export type ScopedPublicationApprovalDecisionInput = {
  blockerCount: number;
  channelCount: number;
  createdAt: string;
  decision: ScopedPublicationDecision;
  evidenceDiffCount: number;
  note: string;
  projectName: string;
  reviewerEmail: string;
  reviewerName: string;
  rollbackAnchorCount: number;
  scopeKey: string;
  slaDueAt: string | null;
  teamName: string;
};

export function getScopedPublicationApprovalReport({
  auditEvents,
  branchReviewInbox,
  files,
  generatedAt = new Date().toISOString(),
  now = Date.now(),
  publishChannels,
  releasePublicationGates,
  rollbackReadiness,
  slaHours = 48,
}: ScopedPublicationApprovalInput): ScopedPublicationApprovalReport {
  const activeFiles = files.filter((file) => !file.trashedAt);
  const scopes = getScopes(activeFiles).map((scopeFiles) =>
    getScopedApproval({
      branchRequests: branchReviewInbox.requests,
      decisions: getDecisionRecords(auditEvents),
      files: scopeFiles,
      now,
      publishChannels: publishChannels.channels,
      releaseGateRows: releasePublicationGates.rows,
      rollbackVersions: rollbackReadiness.latestVersions,
      slaHours,
    }),
  );
  const rows = scopes.flatMap(getRowsForScope).sort(sortRows);
  const blockedScopeCount = scopes.filter((scope) => scope.status === "blocked")
    .length;
  const reviewScopeCount = scopes.filter((scope) => scope.status === "review")
    .length;
  const readyScopeCount = scopes.filter((scope) => scope.status === "ready")
    .length;
  const status: ScopedPublicationStatus =
    blockedScopeCount > 0
      ? "blocked"
      : reviewScopeCount > 0
        ? "review"
        : "ready";

  return {
    generatedAt,
    status,
    score: Math.max(0, 100 - blockedScopeCount * 18 - reviewScopeCount * 6),
    scopeCount: scopes.length,
    readyScopeCount,
    reviewScopeCount,
    blockedScopeCount,
    approvedScopeCount: scopes.filter((scope) => scope.approvalState === "approved")
      .length,
    missingApprovalCount: scopes.filter((scope) => scope.approvalState === "missing")
      .length,
    staleApprovalCount: scopes.filter((scope) => scope.approvalState === "stale")
      .length,
    overdueScopeCount: scopes.filter((scope) => scope.slaStatus === "overdue")
      .length,
    rollbackAnchoredScopeCount: scopes.filter(
      (scope) => scope.rollbackAnchorCount > 0,
    ).length,
    releaseEvidenceDiffCount: scopes.reduce(
      (total, scope) => total + scope.releaseEvidenceDiffCount,
      0,
    ),
    scopes: scopes.sort(sortScopes),
    rows,
    commands: getScopedPublicationCommands(),
  };
}

export function createScopedPublicationApprovalMetadata(
  input: ScopedPublicationApprovalDecisionInput,
): AdminAuditMetadata {
  return {
    blockerCount: input.blockerCount,
    channelCount: input.channelCount,
    createdAt: input.createdAt,
    decision: input.decision,
    evidenceDiffCount: input.evidenceDiffCount,
    note: input.note,
    projectName: input.projectName,
    reviewerEmail: input.reviewerEmail,
    reviewerName: input.reviewerName,
    rollbackAnchorCount: input.rollbackAnchorCount,
    scopeKey: input.scopeKey,
    slaDueAt: input.slaDueAt,
    teamName: input.teamName,
  };
}

function getScopes(files: ScopedPublicationFile[]) {
  const scopes = new Map<string, ScopedPublicationFile[]>();

  for (const file of files) {
    const scopeKey = getScopeKey(file.teamName, file.projectName);
    scopes.set(scopeKey, [...(scopes.get(scopeKey) ?? []), file]);
  }

  return Array.from(scopes.values());
}

function getScopedApproval({
  branchRequests,
  decisions,
  files,
  now,
  publishChannels,
  releaseGateRows,
  rollbackVersions,
  slaHours,
}: {
  branchRequests: AdminBranchReviewRequest[];
  decisions: ScopedPublicationApprovalDecisionRecord[];
  files: ScopedPublicationFile[];
  now: number;
  publishChannels: AdminPublishChannel[];
  releaseGateRows: AdminReleasePublicationGateRow[];
  rollbackVersions: AdminRollbackVersionRow[];
  slaHours: number;
}): ScopedPublicationApprovalScope {
  const firstFile = files[0];

  if (!firstFile) {
    throw new Error("Scoped publication approval requires at least one file.");
  }

  const scopeKey = getScopeKey(firstFile.teamName, firstFile.projectName);
  const fileIds = new Set(files.map((file) => file.id));
  const scopedChannels = publishChannels.filter(
    (channel) => channel.fileId && fileIds.has(channel.fileId),
  );
  const scopedBranches = branchRequests.filter((request) =>
    fileIds.has(request.branchFileId),
  );
  const scopedRollbackVersions = rollbackVersions.filter((version) =>
    fileIds.has(version.fileId),
  );
  const latestDecision =
    decisions.find((decision) => decision.scopeKey === scopeKey) ?? null;
  const latestEvidenceAt = getLatestAt([
    ...files.map((file) => file.updatedAt),
    ...scopedChannels.map((channel) => channel.latestAt),
    ...scopedBranches.map((request) => request.updatedAt),
    ...scopedRollbackVersions.map((version) => version.createdAt),
  ]);
  const releaseEvidenceRows = releaseGateRows.filter(
    (row) => row.status !== "ready",
  );
  const releaseEvidenceDiffCount =
    releaseEvidenceRows.length +
    scopedChannels.filter((channel) => channel.status !== "ready").length +
    scopedBranches.reduce((total, request) => total + request.blockerCount, 0);
  const blockerCount =
    scopedChannels.filter((channel) => channel.status === "blocked").length +
    scopedBranches.filter((request) => request.status === "blocked").length +
    (scopedRollbackVersions.length === 0 ? 1 : 0) +
    releaseEvidenceRows.filter((row) => row.status === "blocked").length;
  const approvalState = getApprovalState(latestDecision, latestEvidenceAt);
  const slaDueAt = getSlaDueAt({
    latestDecision,
    latestEvidenceAt,
    now,
    slaHours,
  });
  const slaStatus = getSlaStatus(slaDueAt, now, approvalState);
  const status = getScopeStatus({
    approvalState,
    blockerCount,
    releaseEvidenceDiffCount,
    slaStatus,
  });
  const blockers = [
    ...scopedChannels
      .filter((channel) => channel.status === "blocked")
      .map((channel) => `${channel.label}: ${channel.blockers.join("; ")}`),
    ...scopedBranches
      .filter((request) => request.status === "blocked")
      .flatMap((request) => request.blockers),
    ...(scopedRollbackVersions.length === 0
      ? ["No named-version rollback anchor for this scope."]
      : []),
    ...releaseEvidenceRows
      .filter((row) => row.status === "blocked")
      .map((row) => `${row.label}: ${row.detail}`),
  ].slice(0, 8);
  const evidence = [
    `${scopedChannels.length} scoped publish channel${scopedChannels.length === 1 ? "" : "s"}`,
    `${scopedRollbackVersions.length} rollback anchor${scopedRollbackVersions.length === 1 ? "" : "s"}`,
    `${scopedBranches.length} branch review request${scopedBranches.length === 1 ? "" : "s"}`,
    `${releaseEvidenceRows.length} release gate diff${releaseEvidenceRows.length === 1 ? "" : "s"}`,
  ];

  return {
    scopeKey,
    teamName: firstFile.teamName,
    projectName: firstFile.projectName,
    status,
    approvalState,
    reviewerSummary: latestDecision
      ? `${latestDecision.reviewerName} (${latestDecision.decision})`
      : "No scoped reviewer decision",
    reviewerEmail: latestDecision?.reviewerEmail ?? null,
    slaStatus,
    slaDueAt,
    fileCount: files.length,
    channelCount: scopedChannels.length,
    readyChannelCount: scopedChannels.filter((channel) => channel.status === "ready")
      .length,
    blockedChannelCount: scopedChannels.filter(
      (channel) => channel.status === "blocked",
    ).length,
    rollbackAnchorCount: scopedRollbackVersions.length,
    branchRequestCount: scopedBranches.length,
    branchBlockerCount: scopedBranches.reduce(
      (total, request) => total + request.blockerCount,
      0,
    ),
    releaseEvidenceDiffCount,
    latestActivityAt: latestEvidenceAt,
    latestDecision,
    evidence,
    blockers,
    recommendation: getScopeRecommendation(status, approvalState, slaStatus),
  };
}

function getRowsForScope(
  scope: ScopedPublicationApprovalScope,
): ScopedPublicationApprovalRow[] {
  return [
    {
      id: `${scope.scopeKey}-approval`,
      scopeKey: scope.scopeKey,
      teamName: scope.teamName,
      projectName: scope.projectName,
      category: "approval",
      status:
        scope.approvalState === "approved"
          ? "ready"
          : scope.approvalState === "changes-requested"
            ? "blocked"
            : "review",
      label: "Reviewer ownership",
      value: scope.approvalState,
      detail: scope.reviewerSummary,
      recommendation:
        "Assign an accountable reviewer and save a scoped approval after evidence diffs are reviewed.",
      latestAt: scope.latestDecision?.createdAt ?? null,
    },
    {
      id: `${scope.scopeKey}-sla`,
      scopeKey: scope.scopeKey,
      teamName: scope.teamName,
      projectName: scope.projectName,
      category: "sla",
      status: scope.slaStatus === "overdue" ? "blocked" : "ready",
      label: "Publication SLA",
      value: scope.slaStatus,
      detail: scope.slaDueAt
        ? `Scoped approval is due by ${scope.slaDueAt}.`
        : "No SLA timer is active for this scope.",
      recommendation:
        "Keep scoped publication decisions inside the team/project review window.",
      latestAt: scope.slaDueAt,
    },
    {
      id: `${scope.scopeKey}-rollback`,
      scopeKey: scope.scopeKey,
      teamName: scope.teamName,
      projectName: scope.projectName,
      category: "rollback",
      status: scope.rollbackAnchorCount > 0 ? "ready" : "blocked",
      label: "Rollback package anchors",
      value: `${scope.rollbackAnchorCount}`,
      detail: `${scope.rollbackAnchorCount} named version rollback anchor${scope.rollbackAnchorCount === 1 ? "" : "s"} cover ${scope.fileCount} file${scope.fileCount === 1 ? "" : "s"}.`,
      recommendation:
        "Create named versions for every publication scope before approving release.",
      latestAt: scope.latestActivityAt,
    },
    {
      id: `${scope.scopeKey}-channels`,
      scopeKey: scope.scopeKey,
      teamName: scope.teamName,
      projectName: scope.projectName,
      category: "channels",
      status: scope.blockedChannelCount > 0 ? "blocked" : "ready",
      label: "Scoped channels",
      value: `${scope.readyChannelCount}/${scope.channelCount}`,
      detail: `${scope.channelCount} channel${scope.channelCount === 1 ? "" : "s"} mapped to this team/project scope.`,
      recommendation:
        "Resolve blocked scoped channels before saving approval.",
      latestAt: scope.latestActivityAt,
    },
    {
      id: `${scope.scopeKey}-evidence`,
      scopeKey: scope.scopeKey,
      teamName: scope.teamName,
      projectName: scope.projectName,
      category: "evidence",
      status: scope.releaseEvidenceDiffCount === 0 ? "ready" : "review",
      label: "Release evidence diffs",
      value: `${scope.releaseEvidenceDiffCount}`,
      detail: scope.evidence.join("; "),
      recommendation:
        "Attach evidence diff exports to the scoped approval record.",
      latestAt: scope.latestActivityAt,
    },
  ];
}

function getDecisionRecords(
  events: ScopedPublicationAuditEvent[],
): ScopedPublicationApprovalDecisionRecord[] {
  return events
    .filter((event) => event.action === SCOPED_PUBLICATION_APPROVAL_ACTION)
    .map(parseDecisionRecord)
    .filter(
      (record): record is ScopedPublicationApprovalDecisionRecord =>
        Boolean(record),
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function parseDecisionRecord(
  event: ScopedPublicationAuditEvent,
): ScopedPublicationApprovalDecisionRecord | null {
  const metadata = event.metadata;
  const scopeKey = getString(metadata.scopeKey);
  const teamName = getString(metadata.teamName);
  const projectName = getString(metadata.projectName);
  const decision = getDecision(metadata.decision);

  if (!scopeKey || !teamName || !projectName || !decision) {
    return null;
  }

  return {
    id: `${event.targetId}-${event.createdAt}`,
    scopeKey,
    teamName,
    projectName,
    decision,
    reviewerName: getString(metadata.reviewerName) || event.actorEmail,
    reviewerEmail: getString(metadata.reviewerEmail) || event.actorEmail,
    note: getString(metadata.note),
    channelCount: getNumber(metadata.channelCount),
    blockerCount: getNumber(metadata.blockerCount),
    evidenceDiffCount: getNumber(metadata.evidenceDiffCount),
    rollbackAnchorCount: getNumber(metadata.rollbackAnchorCount),
    slaDueAt: getString(metadata.slaDueAt) || null,
    createdAt: event.createdAt,
  };
}

function getScopeKey(teamName: string, projectName: string) {
  return `${teamName || "Personal"} / ${projectName || "Drafts"}`;
}

function getApprovalState(
  latestDecision: ScopedPublicationApprovalDecisionRecord | null,
  latestEvidenceAt: string | null,
): ScopedPublicationApprovalScope["approvalState"] {
  if (!latestDecision) {
    return "missing";
  }

  if (latestDecision.decision === "changes-requested") {
    return "changes-requested";
  }

  if (
    latestEvidenceAt &&
    new Date(latestDecision.createdAt).getTime() <
      new Date(latestEvidenceAt).getTime()
  ) {
    return "stale";
  }

  return "approved";
}

function getSlaDueAt({
  latestDecision,
  latestEvidenceAt,
  now,
  slaHours,
}: {
  latestDecision: ScopedPublicationApprovalDecisionRecord | null;
  latestEvidenceAt: string | null;
  now: number;
  slaHours: number;
}) {
  if (latestDecision?.slaDueAt) {
    return latestDecision.slaDueAt;
  }

  if (latestDecision?.decision === "approved") {
    return null;
  }

  const base = latestEvidenceAt ? new Date(latestEvidenceAt).getTime() : now;

  return new Date(base + slaHours * 60 * 60 * 1000).toISOString();
}

function getSlaStatus(
  slaDueAt: string | null,
  now: number,
  approvalState: ScopedPublicationApprovalScope["approvalState"],
): ScopedPublicationApprovalScope["slaStatus"] {
  if (!slaDueAt || approvalState === "approved") {
    return "clear";
  }

  const dueMs = new Date(slaDueAt).getTime();

  if (!Number.isFinite(dueMs)) {
    return "unscheduled";
  }

  if (dueMs < now) {
    return "overdue";
  }

  return dueMs - now <= 12 * 60 * 60 * 1000 ? "due-soon" : "clear";
}

function getScopeStatus({
  approvalState,
  blockerCount,
  releaseEvidenceDiffCount,
  slaStatus,
}: {
  approvalState: ScopedPublicationApprovalScope["approvalState"];
  blockerCount: number;
  releaseEvidenceDiffCount: number;
  slaStatus: ScopedPublicationApprovalScope["slaStatus"];
}): ScopedPublicationStatus {
  if (
    blockerCount > 0 ||
    approvalState === "changes-requested" ||
    slaStatus === "overdue"
  ) {
    return "blocked";
  }

  if (approvalState !== "approved" || releaseEvidenceDiffCount > 0) {
    return "review";
  }

  return "ready";
}

function getScopeRecommendation(
  status: ScopedPublicationStatus,
  approvalState: ScopedPublicationApprovalScope["approvalState"],
  slaStatus: ScopedPublicationApprovalScope["slaStatus"],
) {
  if (status === "ready") {
    return "Scoped publication approval is current and ready for release.";
  }

  if (slaStatus === "overdue") {
    return "Escalate this team/project approval because the publication SLA is overdue.";
  }

  if (approvalState === "missing" || approvalState === "stale") {
    return "Review scoped evidence diffs and save a fresh team/project approval.";
  }

  return "Resolve blockers or requested changes before publication.";
}

function getLatestAt(values: Array<string | null>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function getString(value: AdminAuditMetadata[string]) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: AdminAuditMetadata[string]) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getDecision(
  value: AdminAuditMetadata[string],
): ScopedPublicationDecision | null {
  return value === "approved" || value === "changes-requested" ? value : null;
}

function sortScopes(
  left: ScopedPublicationApprovalScope,
  right: ScopedPublicationApprovalScope,
) {
  return (
    getStatusWeight(left.status) - getStatusWeight(right.status) ||
    right.releaseEvidenceDiffCount - left.releaseEvidenceDiffCount ||
    left.scopeKey.localeCompare(right.scopeKey)
  );
}

function sortRows(
  left: ScopedPublicationApprovalRow,
  right: ScopedPublicationApprovalRow,
) {
  return (
    getStatusWeight(left.status) - getStatusWeight(right.status) ||
    left.scopeKey.localeCompare(right.scopeKey) ||
    left.category.localeCompare(right.category)
  );
}

function getStatusWeight(status: ScopedPublicationStatus) {
  if (status === "blocked") {
    return 0;
  }

  if (status === "review") {
    return 1;
  }

  return 2;
}

function getScopedPublicationCommands() {
  return [
    "Save scoped approvals per team/project after release-gate and channel evidence has been reviewed.",
    "Treat stale approvals as invalid when scoped files, channels, branches, or rollback anchors changed later.",
    "Keep rollback package anchors attached before approving a scoped publication.",
    "Escalate overdue scopes before publishing public links or prototype routes.",
  ];
}
