import type { ReviewTaskSummary } from "@/db/project-comments";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import { isReviewTaskOverdue } from "@/features/review/review-tasks";
import type { MixedFormatWorkspaceOrchestration } from "@/features/visual-suite/mixed-format-orchestration";

export type WorkspaceIntegrationStatus = "ready" | "review" | "blocked";

export type WorkspaceIntegrationSectionId =
  | "handoffs"
  | "template-shelves"
  | "production-review";

export type WorkspaceIntegrationItem = {
  id: string;
  title: string;
  detail: string;
  href: string | null;
  status: WorkspaceIntegrationStatus;
  badge: string;
  meta: string[];
};

export type WorkspaceIntegrationSection = {
  id: WorkspaceIntegrationSectionId;
  title: string;
  description: string;
  status: WorkspaceIntegrationStatus;
  score: number;
  metricLabel: string;
  metricValue: number;
  emptyState: string;
  items: WorkspaceIntegrationItem[];
};

export type WorkspaceIntegrationSurface = {
  status: WorkspaceIntegrationStatus;
  score: number;
  sections: WorkspaceIntegrationSection[];
  nextActions: string[];
  totals: {
    activeProjects: number;
    handoffReady: number;
    templateShelves: number;
    reviewItems: number;
    mixedFormatProjects: number;
  };
};

export function createWorkspaceIntegrationSurface(input: {
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
  projectAudits: ProjectAuditSummary[];
  projectHandoffPackets: ProjectHandoffPacket[];
  reviewTasks: ReviewTaskSummary[];
  serverExportJobs: ServerExportJobSummary[];
  mixedFormatOrchestration: MixedFormatWorkspaceOrchestration;
  now?: Date;
}): WorkspaceIntegrationSurface {
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const sections = [
    createHandoffSection({
      activeProjects,
      packets: input.projectHandoffPackets,
      exportJobs: input.serverExportJobs,
    }),
    createTemplateShelfSection(input.templates),
    createProductionReviewSection({
      audits: input.projectAudits,
      reviewTasks: input.reviewTasks,
      templates: input.templates,
      now: input.now,
    }),
  ];
  const score = sections.length
    ? Math.round(
        sections.reduce((total, section) => total + section.score, 0) /
          sections.length,
      )
    : 0;

  return {
    status: scoreToStatus(score, sections.some((section) => section.status === "blocked")),
    score,
    sections,
    nextActions: createIntegrationNextActions(sections),
    totals: {
      activeProjects: activeProjects.length,
      handoffReady: input.projectHandoffPackets.filter(
        (packet) => packet.status === "ready",
      ).length,
      templateShelves: sections.find((section) => section.id === "template-shelves")
        ?.metricValue ?? 0,
      reviewItems: sections.find((section) => section.id === "production-review")
        ?.metricValue ?? 0,
      mixedFormatProjects:
        input.mixedFormatOrchestration.totals.mixedFormatProjects,
    },
  };
}

function createHandoffSection(input: {
  activeProjects: ProjectSummary[];
  packets: ProjectHandoffPacket[];
  exportJobs: ServerExportJobSummary[];
}): WorkspaceIntegrationSection {
  const latestExportByProject = createLatestExportMap(input.exportJobs);
  const items = input.packets
    .map((packet) => {
      const latestExport = latestExportByProject.get(packet.projectId);

      return {
        id: packet.projectId,
        title: packet.projectName,
        detail: packet.nextAction,
        href: `/editor/${packet.projectId}`,
        status: packet.status,
        badge: `${packet.packetScore}/100`,
        meta: [
          packet.exportBundle.latestFormatLabel ?? "No export bundle",
          latestExport ? exportJobLabel(latestExport) : "No recent export job",
          `${packet.stakeholderNotes.unresolvedCount} unresolved notes`,
        ],
      } satisfies WorkspaceIntegrationItem;
    })
    .sort(compareIntegrationItems)
    .slice(0, 5);
  const score = input.packets.length
    ? Math.round(
        input.packets.reduce((total, packet) => total + packet.packetScore, 0) /
          input.packets.length,
      )
    : input.activeProjects.length
      ? 20
      : 0;

  return {
    id: "handoffs",
    title: "Import and export handoffs",
    description:
      "Final delivery packets, stored artifacts, and project handoff readiness.",
    status: scoreToStatus(score, input.packets.some((packet) => packet.status === "blocked")),
    score,
    metricLabel: "ready packets",
    metricValue: input.packets.filter((packet) => packet.status === "ready")
      .length,
    emptyState: input.activeProjects.length
      ? "Run a project audit and export once to prepare handoff packets."
      : "Create a project before preparing handoff packets.",
    items,
  };
}

function createTemplateShelfSection(
  templates: DesignTemplateSummary[],
): WorkspaceIntegrationSection {
  const shelves = [
    createTemplateShelfItem({
      id: "marketplace",
      title: "Marketplace install shelf",
      templates: templates.filter(
        (template) => template.marketplaceStatus === "published",
      ),
      detail: "Published templates ready for install or reuse.",
    }),
    createTemplateShelfItem({
      id: "team",
      title: "Team template shelf",
      templates: templates.filter((template) => template.isTeamTemplate),
      detail: "Workspace templates available to teammates.",
    }),
    createTemplateShelfItem({
      id: "brand",
      title: "Brand template shelf",
      templates: templates.filter((template) => template.isBrandTemplate),
      detail: "Brand-governed templates for repeatable campaigns.",
    }),
  ];
  const visibleShelves = shelves.filter((shelf) => shelf.metric > 0);
  const approvedTemplates = templates.filter(
    (template) =>
      template.approvalStatus === "approved" ||
      template.marketplaceStatus === "published",
  );
  const score = templates.length
    ? Math.round(
        (visibleShelves.length / shelves.length) * 70 +
          (approvedTemplates.length / templates.length) * 30,
      )
    : 0;

  return {
    id: "template-shelves",
    title: "Template installation shelves",
    description:
      "Reusable entry points for marketplace, team, and brand templates.",
    status: scoreToStatus(score, false),
    score,
    metricLabel: "active shelves",
    metricValue: visibleShelves.length,
    emptyState:
      "Publish or approve templates to fill reusable installation shelves.",
    items: shelves.map((shelf) => ({
      id: shelf.id,
      title: shelf.title,
      detail: shelf.detail,
      href: null,
      status: shelf.metric > 0 ? "ready" : "review",
      badge: `${shelf.metric}`,
      meta: shelf.examples.length
        ? shelf.examples
        : ["No templates assigned to this shelf yet"],
    })),
  };
}

function createProductionReviewSection(input: {
  audits: ProjectAuditSummary[];
  reviewTasks: ReviewTaskSummary[];
  templates: DesignTemplateSummary[];
  now?: Date;
}): WorkspaceIntegrationSection {
  const auditItems = input.audits
    .filter((audit) => audit.status !== "ready")
    .map((audit) => ({
      id: `audit-${audit.projectId}`,
      title: audit.projectName,
      detail: audit.dimensions.find((dimension) => dimension.status !== "ready")
        ?.detail ?? "Project needs production review.",
      href: `/editor/${audit.projectId}`,
      status: audit.status === "fix" ? "blocked" : "review",
      badge: `${audit.overallScore}/100`,
      meta: audit.dimensions
        .filter((dimension) => dimension.status !== "ready")
        .slice(0, 3)
        .map((dimension) => dimension.label),
    })) satisfies WorkspaceIntegrationItem[];
  const taskItems = input.reviewTasks
    .filter((task) => task.taskStatus !== "none" && task.taskStatus !== "done")
    .map((task) => {
      const overdue = isReviewTaskOverdue({
        taskStatus: task.taskStatus,
        taskDueAt: task.taskDueAt,
        now: input.now,
      });

      return {
        id: `task-${task.id}`,
        title: task.projectName,
        detail: task.body,
        href: `/editor/${task.projectId}`,
        status: overdue ? "blocked" : "review",
        badge: task.taskStatus,
        meta: [
          task.taskAssigneeName ?? "Unassigned",
          task.taskDueAt ? `Due ${formatDate(task.taskDueAt)}` : "No due date",
        ],
      } satisfies WorkspaceIntegrationItem;
    });
  const templateItems = input.templates
    .filter(
      (template) =>
        template.marketplaceStatus === "review" ||
        template.approvalStatus === "changes-requested",
    )
    .map((template) => ({
      id: `template-${template.id}`,
      title: template.name,
      detail:
        template.marketplaceReviewNote ||
        "Template needs approval or marketplace review.",
      href: null,
      status:
        template.approvalStatus === "changes-requested" ? "blocked" : "review",
      badge: template.marketplaceStatus,
      meta: [
        template.isBrandTemplate ? "Brand template" : "Private template",
        template.marketplaceCollection ?? "No collection",
      ],
    })) satisfies WorkspaceIntegrationItem[];
  const items = [...auditItems, ...taskItems, ...templateItems]
    .sort(compareIntegrationItems)
    .slice(0, 6);
  const blockedCount = items.filter((item) => item.status === "blocked").length;
  const score = Math.max(0, 100 - blockedCount * 30 - (items.length - blockedCount) * 15);

  return {
    id: "production-review",
    title: "Production review queue",
    description:
      "Audit failures, comment tasks, and template approvals that need action.",
    status: scoreToStatus(score, blockedCount > 0),
    score,
    metricLabel: "open items",
    metricValue: items.length,
    emptyState: "No production review items need attention right now.",
    items,
  };
}

function createTemplateShelfItem(input: {
  id: string;
  title: string;
  templates: DesignTemplateSummary[];
  detail: string;
}) {
  return {
    id: input.id,
    title: input.title,
    detail: input.detail,
    metric: input.templates.length,
    examples: input.templates.slice(0, 3).map((template) => template.name),
  };
}

function createLatestExportMap(exportJobs: ServerExportJobSummary[]) {
  const latestExportByProject = new Map<string, ServerExportJobSummary>();

  for (const job of exportJobs) {
    const current = latestExportByProject.get(job.projectId);
    if (!current || Date.parse(job.updatedAt) > Date.parse(current.updatedAt)) {
      latestExportByProject.set(job.projectId, job);
    }
  }

  return latestExportByProject;
}

function createIntegrationNextActions(
  sections: WorkspaceIntegrationSection[],
) {
  return sections
    .filter((section) => section.status !== "ready")
    .sort((left, right) => left.score - right.score)
    .map((section) => {
      const item = section.items.find((candidate) => candidate.status !== "ready");

      return item
        ? `${section.title}: ${item.title} - ${item.detail}`
        : `${section.title}: ${section.emptyState}`;
    })
    .slice(0, 3);
}

function compareIntegrationItems(
  left: WorkspaceIntegrationItem,
  right: WorkspaceIntegrationItem,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    left.title.localeCompare(right.title)
  );
}

function statusWeight(status: WorkspaceIntegrationStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

function scoreToStatus(score: number, hasBlocked: boolean): WorkspaceIntegrationStatus {
  if (hasBlocked || score < 50) return "blocked";
  if (score < 85) return "review";

  return "ready";
}

function exportJobLabel(job: ServerExportJobSummary) {
  if (job.status === "completed") return `${job.formatLabel} export ready`;
  if (job.status === "failed") return `${job.formatLabel} export failed`;

  return `${job.formatLabel} export ${job.status}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
