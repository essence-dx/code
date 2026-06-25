import type { ContentScheduleSummary } from "@/db/content-planner";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import type {
  PolicyAsCodeAffectedItem,
  PolicyAsCodeDomain,
  PolicyAsCodeGovernanceCenter,
} from "@/features/governance/policy-as-code-governance";
import {
  createLatestCompletedExportMap,
  statusScore,
} from "@/features/operations/release-readiness-utils";
import type {
  PublishExportApprovalEvidence,
  PublishExportOverrideRequest,
  PublishExportOverrideStatus,
  PublishExportReleaseGate,
  PublishExportReleaseGateCenter,
  PublishExportReleaseGateId,
  PublishExportReleaseGateItem,
  PublishExportReleasePacket,
  PublishExportReleaseStatus,
} from "@/features/operations/publish-export-release-gates-types";

export type {
  PublishExportApprovalEvidence,
  PublishExportOverrideRequest,
  PublishExportOverrideStatus,
  PublishExportReleaseGate,
  PublishExportReleaseGateCenter,
  PublishExportReleaseGateId,
  PublishExportReleaseGateItem,
  PublishExportReleasePacket,
  PublishExportReleaseStatus,
} from "@/features/operations/publish-export-release-gates-types";

export type PublishExportReleaseGateCenterInput = {
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
  contentScheduleItems: ContentScheduleSummary[];
  serverExportJobs: ServerExportJobSummary[];
  websitePublishes: WebsitePublishSummary[];
  policyAsCode: PolicyAsCodeGovernanceCenter;
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

export function createPublishExportReleaseGateCenter(
  input: PublishExportReleaseGateCenterInput,
): PublishExportReleaseGateCenter {
  const checkedAt = normalizeNow(input.now).toISOString();
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const releaseCandidates = createReleaseCandidates({
    activeProjects,
    contentScheduleItems: input.contentScheduleItems,
    serverExportJobs: input.serverExportJobs,
    websitePublishes: input.websitePublishes,
  });
  const policyGate = createPolicyDecisionGate(input.policyAsCode);
  const exportGate = createExportReadinessGate({
    releaseCandidates,
    serverExportJobs: input.serverExportJobs,
  });
  const publishGate = createPublishReadinessGate({
    projects: activeProjects,
    templates: input.templates,
    contentScheduleItems: input.contentScheduleItems,
    websitePublishes: input.websitePublishes,
  });
  const overrideRequests = createOverrideRequests({
    policyAsCode: input.policyAsCode,
    auditLogs: input.auditLogs,
  });
  const approvalEvidence = createApprovalEvidence({
    releaseCandidates,
    auditLogs: input.auditLogs,
  });
  const overrideGate = createOverrideGate(overrideRequests);
  const approvalGate = createApprovalEvidenceGate(approvalEvidence);
  const gates = [
    policyGate,
    exportGate,
    publishGate,
    overrideGate,
    approvalGate,
  ];
  const status = aggregateStatus(gates);
  const score = average(gates.map((gate) => gate.score));
  const nextActions = createNextActions({ gates, overrideRequests });
  const releasePacket = createReleasePacket({
    checkedAt,
    status,
    score,
    gates,
    overrideRequests,
    approvalEvidence,
    nextActions,
  });
  const completedExports = input.serverExportJobs.filter(
    (job) => job.status === "completed",
  );
  const failedExports = input.serverExportJobs.filter(
    (job) => job.status === "failed",
  );

  return {
    status,
    score,
    checkedAt,
    gates,
    overrideRequests,
    approvalEvidence,
    releasePacket,
    nextActions,
    totals: {
      gates: gates.length,
      blockedGates: gates.filter((gate) => gate.status === "blocked").length,
      reviewGates: gates.filter((gate) => gate.status === "review").length,
      policyExceptions: input.policyAsCode.totals.violations,
      exportJobs: input.serverExportJobs.length,
      completedExports: completedExports.length,
      failedExports: failedExports.length,
      publishedSurfaces: input.websitePublishes.filter(
        (publish) => publish.status === "published",
      ).length,
      overrideRequests: overrideRequests.length,
      requestedOverrides: overrideRequests.filter(
        (request) => request.status === "requested",
      ).length,
      approvalEvidence: approvalEvidence.length,
      auditableApprovals: approvalEvidence.filter(
        (evidence) => evidence.auditLogId,
      ).length,
    },
  };
}

function createPolicyDecisionGate(
  policyAsCode: PolicyAsCodeGovernanceCenter,
): PublishExportReleaseGate {
  const nonReadyReports = policyAsCode.dryRunReports.filter(
    (report) => report.status !== "ready",
  );
  const items = nonReadyReports.length
    ? nonReadyReports.map(
        (report): PublishExportReleaseGateItem => ({
          id: report.id,
          title: report.title,
          detail: report.summary,
          status: report.status,
          badge: `${report.affectedItems.length} exceptions`,
          sourceId: report.id,
          sourceKind: "policy-dry-run",
          href: null,
          meta: [
            `${report.plannedActions.length} planned actions`,
            `${report.auditLogIds.length} audit links`,
            report.domain,
          ],
        }),
      )
    : [
        createReadyItem({
          id: "policy-clean",
          title: "Policy decisions clean",
          detail:
            "Policy-as-code dry-runs are ready for publish and export release gates.",
          badge: "Clean",
          sourceKind: "policy-dry-run",
        }),
      ];

  return createGate({
    id: "policy-decisions",
    title: "Policy decisions",
    description:
      "Policy-as-code dry-run outcomes are connected directly to publish and export release decisions.",
    items,
    metricLabel: "policy domains checked",
    metricValue: policyAsCode.totals.policyDomains,
    score: policyAsCode.score,
    status: policyAsCode.status,
  });
}

function createExportReadinessGate(input: {
  releaseCandidates: ProjectSummary[];
  serverExportJobs: ServerExportJobSummary[];
}): PublishExportReleaseGate {
  const latestCompletedExports = createLatestCompletedExportMap(
    input.serverExportJobs,
  );
  const completedExports = input.serverExportJobs.filter(
    (job) => job.status === "completed",
  );
  const failedExports = input.serverExportJobs.filter(
    (job) => job.status === "failed",
  );
  const missingExports = input.releaseCandidates.filter(
    (project) => !latestCompletedExports.has(project.id),
  );
  const staleExports = input.releaseCandidates.filter((project) => {
    const exportJob = latestCompletedExports.get(project.id);

    return (
      exportJob &&
      Date.parse(exportJob.completedAt ?? exportJob.updatedAt) <
        Date.parse(project.updatedAt)
    );
  });
  const artifactlessExports = completedExports.filter(
    (job) => !job.artifactDataUrl,
  );
  const items: PublishExportReleaseGateItem[] = [
    {
      id: "export-failures",
      title: "Export failure queue",
      detail: failedExports.length
        ? `${failedExports.length} export job${
            failedExports.length === 1 ? "" : "s"
          } failed before release.`
        : "No failed export jobs are blocking release.",
      status: failedExports.length ? "blocked" : "ready",
      badge: `${failedExports.length} failed`,
      sourceId: failedExports[0]?.id ?? null,
      sourceKind: "server-export-job",
      href: null,
      meta: failedExports
        .slice(0, 3)
        .map((job) => job.failureMessage ?? `${job.projectName} failed`),
    },
    {
      id: "export-coverage",
      title: "Release export coverage",
      detail: missingExports.length
        ? `${missingExports.length} release candidate${
            missingExports.length === 1 ? "" : "s"
          } need completed server export artifacts.`
        : "Release candidates have completed server export artifacts.",
      status: missingExports.length ? "review" : "ready",
      badge: `${latestCompletedExports.size}/${input.releaseCandidates.length}`,
      sourceId: missingExports[0]?.id ?? null,
      sourceKind: "project",
      href: missingExports[0] ? `/editor/${missingExports[0].id}` : null,
      meta: missingExports.slice(0, 3).map((project) => project.name),
    },
    {
      id: "export-freshness",
      title: "Export freshness",
      detail: staleExports.length
        ? "Some release exports are older than their project updates."
        : "Completed exports are fresh against project update timestamps.",
      status: staleExports.length ? "review" : "ready",
      badge: `${staleExports.length} stale`,
      sourceId: staleExports[0]?.id ?? null,
      sourceKind: "project",
      href: staleExports[0] ? `/editor/${staleExports[0].id}` : null,
      meta: staleExports.slice(0, 3).map((project) => project.name),
    },
    {
      id: "artifact-download-evidence",
      title: "Artifact download evidence",
      detail: artifactlessExports.length
        ? "Some completed exports exceeded storage limits and need external artifact evidence."
        : completedExports.length
          ? "Completed exports include downloadable artifact evidence."
          : "Create at least one completed server export artifact for release evidence.",
      status: artifactlessExports.length
        ? "review"
        : completedExports.length
          ? "ready"
          : "review",
      badge: `${completedExports.length} artifacts`,
      sourceId: artifactlessExports[0]?.id ?? completedExports[0]?.id ?? null,
      sourceKind: "server-export-job",
      href: null,
      meta: [
        `${completedExports.length} completed`,
        `${artifactlessExports.length} external evidence needed`,
      ],
    },
  ];

  return createGate({
    id: "export-readiness",
    title: "Export readiness",
    description:
      "Completed export artifacts, freshness, failures, and downloadable evidence for release candidates.",
    items,
    metricLabel: "completed exports",
    metricValue: completedExports.length,
  });
}

function createPublishReadinessGate(input: {
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
  contentScheduleItems: ContentScheduleSummary[];
  websitePublishes: WebsitePublishSummary[];
}): PublishExportReleaseGate {
  const projectsById = new Map(
    input.projects.map((project) => [project.id, project]),
  );
  const plannedWithoutCopy = input.contentScheduleItems.filter(
    (item) => item.status === "planned" && !item.caption.trim(),
  );
  const publishedWebsites = input.websitePublishes.filter(
    (publish) => publish.status === "published",
  );
  const unapprovedPublishedProjects = publishedWebsites.filter((publish) => {
    const project = projectsById.get(publish.projectId);

    return project && project.approvalStatus !== "approved";
  });
  const unapprovedPublishedTemplates = input.templates.filter(
    (template) =>
      template.marketplaceStatus === "published" &&
      template.approvalStatus !== "approved",
  );
  const domainIssues = publishedWebsites.flatMap((publish) =>
    publish.customDomains
      .filter(
        (domain) =>
          domain.status !== "verified" || domain.platformStatus === "error",
      )
      .map((domain) => ({ publish, domain })),
  );
  const hasDomainError = domainIssues.some(
    ({ domain }) => domain.platformStatus === "error",
  );
  const items: PublishExportReleaseGateItem[] = [
    {
      id: "scheduled-copy",
      title: "Scheduled publishing copy",
      detail: plannedWithoutCopy.length
        ? `${plannedWithoutCopy.length} planned publishing item${
            plannedWithoutCopy.length === 1 ? "" : "s"
          } need release copy before publish.`
        : "Planned publishing items include release copy.",
      status: plannedWithoutCopy.length ? "blocked" : "ready",
      badge: `${plannedWithoutCopy.length} gaps`,
      sourceId: plannedWithoutCopy[0]?.id ?? null,
      sourceKind: "schedule",
      href: null,
      meta: plannedWithoutCopy.slice(0, 3).map((item) => item.title),
    },
    {
      id: "published-project-approval",
      title: "Published project approvals",
      detail: unapprovedPublishedProjects.length
        ? "Published website surfaces include projects that are not approved."
        : "Published website surfaces point at approved project states.",
      status: unapprovedPublishedProjects.length ? "blocked" : "ready",
      badge: `${unapprovedPublishedProjects.length} unapproved`,
      sourceId: unapprovedPublishedProjects[0]?.projectId ?? null,
      sourceKind: "website-publish",
      href: unapprovedPublishedProjects[0]
        ? `/editor/${unapprovedPublishedProjects[0].projectId}`
        : null,
      meta: unapprovedPublishedProjects
        .slice(0, 3)
        .map((publish) => publish.title),
    },
    {
      id: "marketplace-template-approval",
      title: "Marketplace template approvals",
      detail: unapprovedPublishedTemplates.length
        ? "Published marketplace templates need approval evidence."
        : "Published marketplace templates are approved.",
      status: unapprovedPublishedTemplates.length ? "blocked" : "ready",
      badge: `${unapprovedPublishedTemplates.length} unapproved`,
      sourceId: unapprovedPublishedTemplates[0]?.id ?? null,
      sourceKind: "template",
      href: unapprovedPublishedTemplates[0]
        ? `/templates/${unapprovedPublishedTemplates[0].id}`
        : null,
      meta: unapprovedPublishedTemplates
        .slice(0, 3)
        .map((template) => template.name),
    },
    {
      id: "domain-readiness",
      title: "Published domain readiness",
      detail: domainIssues.length
        ? "Some custom domains are pending verification or platform attachment."
        : "Published website domains are verified or do not require custom domain release work.",
      status: hasDomainError
        ? "blocked"
        : domainIssues.length
          ? "review"
          : "ready",
      badge: `${domainIssues.length} domain issues`,
      sourceId: domainIssues[0]?.domain.id ?? null,
      sourceKind: "website-domain",
      href: null,
      meta: domainIssues
        .slice(0, 3)
        .map(
          ({ domain }) =>
            `${domain.domain}: ${domain.status}/${domain.platformStatus}`,
        ),
    },
  ];

  return createGate({
    id: "publish-readiness",
    title: "Publish readiness",
    description:
      "Scheduled content, websites, domains, and marketplace templates checked against approval and launch evidence.",
    items,
    metricLabel: "published surfaces",
    metricValue: publishedWebsites.length,
  });
}

function createOverrideRequests(input: {
  policyAsCode: PolicyAsCodeGovernanceCenter;
  auditLogs: WorkspaceAuditLogSummary[];
}): PublishExportOverrideRequest[] {
  return input.policyAsCode.dryRunReports.flatMap((report) =>
    report.affectedItems.map((item) => {
      const matchingLogs = findOverrideLogs({
        item,
        domain: report.domain,
        auditLogs: input.auditLogs,
      });
      const latestLog = newestLog(matchingLogs);
      const status = overrideStatusFromLogs(matchingLogs);

      return {
        id: `override-${report.domain}-${item.id}`,
        status,
        severity: item.severity,
        sourcePolicyDomain: report.domain,
        affectedItemId: item.id,
        affectedItemKind: item.kind,
        title: `${report.title}: ${item.name}`,
        detail: item.detail,
        sourceIds: item.sourceIds,
        auditLogIds: matchingLogs.map((log) => log.id),
        requestedAt: latestLog?.createdAt ?? null,
        requesterEmail: latestLog?.actorEmail ?? null,
        approvalRequired: item.severity === "blocked",
        form: {
          targetType: item.kind,
          targetId: item.id,
          gateId: "policy-decisions",
          policyDomain: report.domain,
          summary: `Requested release override for ${item.name}: ${item.detail}`,
        },
      } satisfies PublishExportOverrideRequest;
    }),
  );
}

function createApprovalEvidence(input: {
  releaseCandidates: ProjectSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
}): PublishExportApprovalEvidence[] {
  return input.releaseCandidates
    .filter(
      (project) =>
        project.approvalStatus === "approved" || hasPublicSurface(project),
    )
    .map((project) => {
      const approvalLog = newestLog(findApprovalLogs(project, input.auditLogs));
      const status: PublishExportReleaseStatus =
        project.approvalStatus !== "approved"
          ? "blocked"
          : approvalLog
            ? "ready"
            : "review";

      return {
        id: `approval-project-${project.id}`,
        subjectType: "project",
        subjectId: project.id,
        title: `${project.name} approval evidence`,
        status,
        summary:
          project.approvalStatus !== "approved"
            ? `${project.name} is ${project.approvalStatus}; publish/export gates need approval.`
            : approvalLog
              ? approvalLog.summary
              : `${project.name} is approved but no matching approval audit log was found.`,
        auditLogId: approvalLog?.id ?? null,
        approvedAt: approvalLog?.createdAt ?? null,
        actorEmail: approvalLog?.actorEmail ?? null,
        href: `/editor/${project.id}`,
        meta: [
          `status: ${project.approvalStatus}`,
          approvalLog ? `audit: ${approvalLog.id}` : "audit: missing",
        ],
      };
    });
}

function createOverrideGate(
  requests: PublishExportOverrideRequest[],
): PublishExportReleaseGate {
  const items = requests.length
    ? requests.map((request): PublishExportReleaseGateItem => {
        const status = overrideRequestStatusToReleaseStatus(request);

        return {
          id: request.id,
          title: request.title,
          detail:
            request.status === "needed"
              ? `${request.detail} Request an auditable release override or resolve the policy exception.`
              : `${request.detail} Override status is ${request.status}.`,
          status,
          badge: request.status,
          sourceId: request.affectedItemId,
          sourceKind: request.affectedItemKind,
          href: null,
          meta: [
            request.sourcePolicyDomain,
            `${request.auditLogIds.length} audit logs`,
            request.approvalRequired ? "Approval required" : "Review path",
          ],
        };
      })
    : [
        createReadyItem({
          id: "no-overrides",
          title: "No override requests",
          detail: "Publish and export gates do not need release overrides.",
          badge: "Clean",
          sourceKind: "release-override",
        }),
      ];

  return createGate({
    id: "override-requests",
    title: "Override requests",
    description:
      "Policy exceptions can be converted into auditable release override requests without mutating the original policy dry-run.",
    items,
    metricLabel: "override requests",
    metricValue: requests.length,
  });
}

function createApprovalEvidenceGate(
  evidence: PublishExportApprovalEvidence[],
): PublishExportReleaseGate {
  const items: PublishExportReleaseGateItem[] = evidence.length
    ? evidence.map(
        (item): PublishExportReleaseGateItem => ({
          id: item.id,
          title: item.title,
          detail: item.summary,
          status: item.status,
          badge: item.auditLogId ? "Audited" : "Needs audit",
          sourceId: item.subjectId,
          sourceKind: item.subjectType,
          href: item.href,
          meta: item.meta,
        }),
      )
    : [
        {
          id: "approval-evidence-missing",
          title: "Approval evidence missing",
          detail:
            "No release candidate approval audit evidence is available for publish/export gates.",
          status: "review",
          badge: "Needs evidence",
          sourceId: null,
          sourceKind: "project",
          href: null,
          meta: [],
        },
      ];

  return createGate({
    id: "approval-evidence",
    title: "Approval evidence",
    description:
      "Auditable project approvals are attached to publish and export release decisions.",
    items,
    metricLabel: "auditable approvals",
    metricValue: evidence.filter((item) => item.auditLogId).length,
  });
}

function createGate(input: {
  id: PublishExportReleaseGateId;
  title: string;
  description: string;
  items: PublishExportReleaseGateItem[];
  metricLabel: string;
  metricValue: number;
  status?: PublishExportReleaseStatus;
  score?: number;
}): PublishExportReleaseGate {
  const score =
    input.score ?? average(input.items.map((item) => statusScore(item.status)));

  return {
    id: input.id,
    title: input.title,
    description: input.description,
    status: input.status ?? aggregateStatus(input.items),
    score,
    metricLabel: input.metricLabel,
    metricValue: input.metricValue,
    items: input.items,
  };
}

function createReadyItem(input: {
  id: string;
  title: string;
  detail: string;
  badge: string;
  sourceKind: string;
}): PublishExportReleaseGateItem {
  return {
    id: input.id,
    title: input.title,
    detail: input.detail,
    status: "ready",
    badge: input.badge,
    sourceId: null,
    sourceKind: input.sourceKind,
    href: null,
    meta: [],
  };
}

function createReleaseCandidates(input: {
  activeProjects: ProjectSummary[];
  contentScheduleItems: ContentScheduleSummary[];
  serverExportJobs: ServerExportJobSummary[];
  websitePublishes: WebsitePublishSummary[];
}) {
  const candidateIds = new Set<string>();

  for (const project of input.activeProjects) {
    if (project.approvalStatus === "approved" || hasPublicSurface(project)) {
      candidateIds.add(project.id);
    }
  }

  for (const item of input.contentScheduleItems) {
    if (item.projectId) candidateIds.add(item.projectId);
  }

  for (const job of input.serverExportJobs) {
    candidateIds.add(job.projectId);
  }

  for (const publish of input.websitePublishes) {
    candidateIds.add(publish.projectId);
  }

  if (!candidateIds.size) {
    return input.activeProjects;
  }

  return input.activeProjects.filter((project) => candidateIds.has(project.id));
}

function hasPublicSurface(project: ProjectSummary) {
  return Boolean(project.publicShareId || project.editShareId);
}

function findOverrideLogs(input: {
  item: PolicyAsCodeAffectedItem;
  domain: PolicyAsCodeDomain;
  auditLogs: WorkspaceAuditLogSummary[];
}) {
  const sourceIds = new Set([input.item.id, ...input.item.sourceIds]);

  return input.auditLogs.filter((log) => {
    const action = log.action.toLowerCase();
    const policyDomain = String(log.metadata.policyDomain ?? "");
    const affectedItemId = String(log.metadata.affectedItemId ?? "");
    const targetMatches = Boolean(log.targetId && sourceIds.has(log.targetId));
    const metadataMatches = sourceIds.has(affectedItemId);

    return (
      action.includes("override") &&
      (targetMatches || metadataMatches) &&
      (!policyDomain || policyDomain === input.domain)
    );
  });
}

function overrideStatusFromLogs(
  logs: WorkspaceAuditLogSummary[],
): PublishExportOverrideStatus {
  if (
    logs.some((log) => {
      const action = log.action.toLowerCase();
      const metadataStatus = String(log.metadata.status ?? "").toLowerCase();

      return action.includes("approved") || metadataStatus === "approved";
    })
  ) {
    return "approved";
  }

  return logs.length ? "requested" : "needed";
}

function overrideRequestStatusToReleaseStatus(
  request: PublishExportOverrideRequest,
): PublishExportReleaseStatus {
  if (request.status === "approved") return "ready";
  if (request.status === "requested") return "review";

  return request.severity === "blocked" ? "blocked" : "review";
}

function findApprovalLogs(
  project: ProjectSummary,
  auditLogs: WorkspaceAuditLogSummary[],
) {
  return auditLogs.filter((log) => {
    if (log.action !== "approval.updated") return false;
    const metadataProjectId = String(log.metadata.projectId ?? "");

    return (
      (log.targetType === "project" && log.targetId === project.id) ||
      metadataProjectId === project.id
    );
  });
}

function createNextActions(input: {
  gates: PublishExportReleaseGate[];
  overrideRequests: PublishExportOverrideRequest[];
}) {
  const gateActions = input.gates
    .filter((gate) => gate.status !== "ready")
    .map((gate) => {
      const item = gate.items.find((candidate) => candidate.status !== "ready");

      return item
        ? `${gate.title}: ${item.title} - ${item.detail}`
        : `${gate.title}: ${gate.description}`;
    });
  const overrideActions = input.overrideRequests
    .filter((request) => request.status === "needed")
    .map(
      (request) =>
        `Request or resolve override for ${request.title} before release approval.`,
    );

  return unique([...gateActions, ...overrideActions]).slice(0, 6);
}

function createReleasePacket(input: {
  checkedAt: string;
  status: PublishExportReleaseStatus;
  score: number;
  gates: PublishExportReleaseGate[];
  overrideRequests: PublishExportOverrideRequest[];
  approvalEvidence: PublishExportApprovalEvidence[];
  nextActions: string[];
}): PublishExportReleasePacket {
  const payload: PublishExportReleasePacket["payload"] = {
    kind: "essence-studio.publish-export-release-gates",
    version: 1,
    generatedAt: input.checkedAt,
    status: input.status,
    score: input.score,
    gates: input.gates.map((gate) => ({
      id: gate.id,
      title: gate.title,
      status: gate.status,
      score: gate.score,
      metric: `${gate.metricValue} ${gate.metricLabel}`,
      items: gate.items,
    })),
    overrideRequests: input.overrideRequests.map((request) => ({
      id: request.id,
      status: request.status,
      sourcePolicyDomain: request.sourcePolicyDomain,
      affectedItemId: request.affectedItemId,
      severity: request.severity,
      auditLogIds: request.auditLogIds,
    })),
    approvalEvidence: input.approvalEvidence.map((evidence) => ({
      id: evidence.id,
      subjectId: evidence.subjectId,
      status: evidence.status,
      auditLogId: evidence.auditLogId,
    })),
    nextActions: input.nextActions,
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    fileName: `essence-publish-export-release-gates-${input.checkedAt.slice(0, 10)}.json`,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    payload,
  };
}

function aggregateStatus(
  items: Array<{ status: PublishExportReleaseStatus }>,
): PublishExportReleaseStatus {
  if (items.some((item) => item.status === "blocked")) return "blocked";
  if (items.some((item) => item.status === "review")) return "review";

  return "ready";
}

function average(values: number[]) {
  if (!values.length) return 0;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        values.reduce((total, value) => total + value, 0) / values.length,
      ),
    ),
  );
}

function newestLog(logs: WorkspaceAuditLogSummary[]) {
  return [...logs].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  )[0];
}

function normalizeNow(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
