import type { ProjectSummary } from "@/features/editor/types";
import type {
  ProductionSupportDesk,
  ProductionSupportDeskInput,
  ProductionSupportIssue,
  ProductionSupportResolutionPacket,
  ProductionSupportSeverity,
  ProductionSupportView,
} from "@/features/support/production-support-desk-types";
import {
  createDeskStatus,
  createResolutionDownload,
  findAuditContext,
  isPastDue,
  scoreSupportDesk,
  sortIssues,
} from "@/features/support/production-support-desk-utils";

export type {
  ProductionSupportDesk,
  ProductionSupportDeskInput,
  ProductionSupportDeskStatus,
  ProductionSupportIssue,
  ProductionSupportIssueKind,
  ProductionSupportResolutionPacket,
  ProductionSupportSeverity,
  ProductionSupportView,
} from "@/features/support/production-support-desk-types";

export function createProductionSupportDesk(
  input: ProductionSupportDeskInput,
): ProductionSupportDesk {
  const now = new Date(input.now ?? new Date().toISOString());
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const projectById = new Map(
    activeProjects.map((project) => [project.id, project]),
  );
  const issues = sortIssues([
    ...createUserReportedIssues(input, projectById, now),
    ...createExportFailureIssues(input, projectById),
    ...createPublishingDomainIssues(input, projectById),
    ...createReadinessIssues(input, projectById),
  ]);
  const views = createViews(issues);
  const resolutionPackets = issues
    .slice(0, 8)
    .map((issue) => createResolutionPacket(issue, input));

  return {
    status: createDeskStatus(issues),
    score: scoreSupportDesk(issues),
    views,
    resolutionPackets,
    nextActions: createNextActions(issues, resolutionPackets),
    totals: {
      openIssues: issues.length,
      userReportedIssues: issues.filter(
        (issue) => issue.kind === "user-reported",
      ).length,
      productionFailures: issues.filter(
        (issue) =>
          issue.kind === "export-failure" || issue.kind === "publishing-domain",
      ).length,
      readinessIssues: issues.filter(
        (issue) => issue.kind === "readiness-audit",
      ).length,
      urgentIssues: issues.filter((issue) => issue.severity === "urgent")
        .length,
      resolutionPackets: resolutionPackets.length,
    },
  };
}

function createUserReportedIssues(
  input: ProductionSupportDeskInput,
  projectById: Map<string, ProjectSummary>,
  now: Date,
): ProductionSupportIssue[] {
  return input.reviewTasks
    .filter((task) => !task.resolved && task.taskStatus !== "done")
    .map((task) => {
      const project = projectById.get(task.projectId);
      const severity: ProductionSupportSeverity = isPastDue(task.taskDueAt, now)
        ? "urgent"
        : task.taskStatus === "in-progress"
          ? "medium"
          : "high";
      const auditContext = findAuditContext({
        logs: input.auditLogs,
        projectId: task.projectId,
        targetIds: [task.id],
      });

      return {
        id: `support-task-${task.id}`,
        kind: "user-reported",
        severity,
        title: `${task.projectName}: ${task.body.slice(0, 72)}`,
        summary: task.body,
        affectedProjectId: task.projectId,
        affectedProjectName: project?.name ?? task.projectName,
        affectedProjectHref: `/editor/${task.projectId}`,
        sourceLabel: "Review task",
        reportedBy: task.authorName,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        statusLabel: task.taskStatus,
        auditContext,
        reproductionNotes: [
          `Open /editor/${task.projectId}.`,
          `Inspect page ${task.pageId}${task.elementId ? ` and element ${task.elementId}` : ""}.`,
          `Reproduce the reported behavior: ${task.body}`,
        ],
        resolutionChecklist: [
          "Confirm the issue with the reporter note.",
          "Apply the design or publishing fix.",
          "Mark the review task done and add a resolution note.",
        ],
      };
    });
}

function createExportFailureIssues(
  input: ProductionSupportDeskInput,
  projectById: Map<string, ProjectSummary>,
): ProductionSupportIssue[] {
  return input.serverExportJobs
    .filter((job) => job.status === "failed")
    .map((job) => {
      const project = projectById.get(job.projectId);
      const auditContext = findAuditContext({
        logs: input.auditLogs,
        projectId: job.projectId,
        targetIds: [job.id],
      });

      return {
        id: `support-export-${job.id}`,
        kind: "export-failure",
        severity: "high",
        title: `Failed export: ${job.projectName}`,
        summary: job.failureMessage ?? `${job.formatLabel} export failed.`,
        affectedProjectId: job.projectId,
        affectedProjectName: project?.name ?? job.projectName,
        affectedProjectHref: `/editor/${job.projectId}`,
        sourceLabel: job.formatLabel,
        reportedBy: null,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        statusLabel: job.status,
        auditContext,
        reproductionNotes: [
          `Open /editor/${job.projectId}.`,
          `Run the ${job.formatLabel} export path again.`,
          `Compare the retry result with failure: ${job.failureMessage ?? "Unknown export failure."}`,
        ],
        resolutionChecklist: [
          "Retry the durable export.",
          "Capture the new artifact or failure reason.",
          "Attach the export result to the support packet.",
        ],
      };
    });
}

function createPublishingDomainIssues(
  input: ProductionSupportDeskInput,
  projectById: Map<string, ProjectSummary>,
): ProductionSupportIssue[] {
  return input.websitePublishes.flatMap((publish) =>
    publish.customDomains
      .filter(
        (domain) =>
          domain.status !== "verified" || domain.platformStatus === "error",
      )
      .map((domain) => {
        const project = projectById.get(publish.projectId);
        const auditContext = findAuditContext({
          logs: input.auditLogs,
          projectId: publish.projectId,
          targetIds: [publish.id, domain.id],
        });

        return {
          id: `support-domain-${domain.id}`,
          kind: "publishing-domain",
          severity: domain.platformStatus === "error" ? "urgent" : "medium",
          title: `Domain issue: ${domain.domain}`,
          summary:
            domain.platformError ??
            `${publish.title} custom domain still needs verification.`,
          affectedProjectId: publish.projectId,
          affectedProjectName:
            project?.name ?? publish.projectName ?? publish.title,
          affectedProjectHref: `/editor/${publish.projectId}`,
          sourceLabel: "Website domain",
          reportedBy: null,
          createdAt: domain.createdAt,
          updatedAt: domain.updatedAt,
          statusLabel: `${domain.status}/${domain.platformStatus}`,
          auditContext,
          reproductionNotes: [
            "Open the Website tab in the dashboard.",
            `Inspect ${domain.domain} on publish ${publish.slug}.`,
            "Refresh domain platform status and verify DNS records.",
          ],
          resolutionChecklist: [
            "Verify DNS ownership.",
            "Attach or refresh the platform domain record.",
            "Confirm the site resolves before closing the issue.",
          ],
        };
      }),
  );
}

function createReadinessIssues(
  input: ProductionSupportDeskInput,
  projectById: Map<string, ProjectSummary>,
): ProductionSupportIssue[] {
  return input.projectAudits
    .filter((audit) => audit.status !== "ready" || audit.overallScore < 85)
    .map((audit) => {
      const project = projectById.get(audit.projectId);
      const failingDimensions = audit.dimensions.filter(
        (dimension) => dimension.status !== "ready",
      );
      const auditContext = findAuditContext({
        logs: input.auditLogs,
        projectId: audit.projectId,
      });

      return {
        id: `support-audit-${audit.projectId}`,
        kind: "readiness-audit",
        severity: audit.status === "fix" ? "high" : "medium",
        title: `Readiness review: ${audit.projectName}`,
        summary: `${audit.projectName} is scoring ${audit.overallScore}/100 across production readiness checks.`,
        affectedProjectId: audit.projectId,
        affectedProjectName: project?.name ?? audit.projectName,
        affectedProjectHref: `/editor/${audit.projectId}`,
        sourceLabel: "Project audit",
        reportedBy: null,
        createdAt: audit.updatedAt,
        updatedAt: audit.updatedAt,
        statusLabel: audit.status,
        auditContext,
        reproductionNotes: [
          `Open /editor/${audit.projectId}.`,
          `Review failing dimensions: ${failingDimensions.map((dimension) => dimension.label).join(", ") || "overall readiness"}.`,
          "Run the project audit center again after fixes.",
        ],
        resolutionChecklist: [
          "Resolve failing audit dimensions.",
          "Refresh readiness scoring.",
          "Update the handoff packet before stakeholder reply.",
        ],
      };
    });
}

function createViews(
  issues: ProductionSupportIssue[],
): ProductionSupportView[] {
  return [
    createView({
      id: "user-reported",
      title: "User-reported issues",
      description: "Open review tasks and customer-facing reports.",
      issues: issues.filter((issue) => issue.kind === "user-reported"),
    }),
    createView({
      id: "production-failures",
      title: "Production failures",
      description: "Export and publishing failures that can block delivery.",
      issues: issues.filter(
        (issue) =>
          issue.kind === "export-failure" || issue.kind === "publishing-domain",
      ),
    }),
    createView({
      id: "readiness-review",
      title: "Readiness review",
      description: "Project audit issues that need support follow-through.",
      issues: issues.filter((issue) => issue.kind === "readiness-audit"),
    }),
  ];
}

function createView(input: {
  id: ProductionSupportView["id"];
  title: string;
  description: string;
  issues: ProductionSupportIssue[];
}): ProductionSupportView {
  return {
    ...input,
    status: createDeskStatus(input.issues),
    issues: sortIssues(input.issues).slice(0, 6),
  };
}

function createResolutionPacket(
  issue: ProductionSupportIssue,
  input: ProductionSupportDeskInput,
): ProductionSupportResolutionPacket {
  const handoffPacket =
    input.projectHandoffPackets.find(
      (packet) => packet.projectId === issue.affectedProjectId,
    ) ?? null;
  const checklist = [
    ...issue.resolutionChecklist,
    ...(handoffPacket?.checklist
      .filter((item) => !item.complete)
      .map((item) => `${item.label}: ${item.detail}`) ?? []),
  ];
  const auditLogIds = issue.auditContext.map((log) => log.id);
  const summary = `${issue.title} - ${issue.summary}`;

  return {
    id: `packet-${issue.id}`,
    issueId: issue.id,
    projectId: issue.affectedProjectId,
    projectName: issue.affectedProjectName,
    status: handoffPacket?.status ?? "needs-packet",
    summary,
    auditLogIds,
    handoffPacketScore: handoffPacket?.packetScore ?? null,
    checklist,
    download: createResolutionDownload({
      projectId: issue.affectedProjectId,
      issueId: issue.id,
      projectName: issue.affectedProjectName,
      summary,
      auditLogIds,
      checklist,
    }),
  };
}

function createNextActions(
  issues: ProductionSupportIssue[],
  packets: ProductionSupportResolutionPacket[],
) {
  return issues.slice(0, 4).map((issue) => {
    const packet = packets.find((item) => item.issueId === issue.id);
    const packetStatus = packet ? `packet ${packet.status}` : "no packet";

    return `${issue.affectedProjectName}: ${issue.title} (${packetStatus}).`;
  });
}
