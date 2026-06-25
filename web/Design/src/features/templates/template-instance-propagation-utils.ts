import type { CampaignBoardSummary } from "@/db/campaigns";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type {
  TemplateInstanceGroup,
  TemplateInstancePropagationStatus,
  TemplateInstanceUpdatePreview,
} from "@/features/templates/template-instance-propagation-types";

export type CampaignProjectReference = {
  campaignId: string;
  campaignName: string;
  deliverableId: string;
  deliverableStatus: CampaignBoardSummary["deliverables"][number]["status"];
  deliverableApprovalStatus: CampaignBoardSummary["deliverables"][number]["approvalStatus"];
  role: string;
  channel: string;
};

export function findTemplateInstances(input: {
  template: DesignTemplateSummary;
  projects: ProjectSummary[];
  campaignReferences: Map<string, CampaignProjectReference[]>;
}) {
  const templateName = normalizeSearchText(input.template.name);

  return input.projects.filter((project) => {
    if (project.sourceProjectId === input.template.id) return true;

    const campaignRefs = input.campaignReferences.get(project.id) ?? [];
    if (
      campaignRefs.length > 0 &&
      project.width === input.template.width &&
      project.height === input.template.height &&
      normalizeSearchText(project.name).includes(templateName)
    ) {
      return true;
    }

    return (
      project.width === input.template.width &&
      project.height === input.template.height &&
      normalizeSearchText(project.name).includes(templateName)
    );
  });
}

export function createCampaignReferenceMap(campaigns: CampaignBoardSummary[]) {
  const references = new Map<string, CampaignProjectReference[]>();

  for (const campaign of campaigns) {
    for (const deliverable of campaign.deliverables) {
      if (!deliverable.projectId) continue;

      const list = references.get(deliverable.projectId) ?? [];
      list.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        deliverableId: deliverable.id,
        deliverableStatus: deliverable.status,
        deliverableApprovalStatus: deliverable.approvalStatus,
        role: deliverable.role,
        channel: deliverable.channel,
      });
      references.set(deliverable.projectId, list);
    }
  }

  return references;
}

export function createLatestVersionMap(versions: ProjectVersionSummary[]) {
  const latest = new Map<string, ProjectVersionSummary>();

  for (const version of versions) {
    const current = latest.get(version.projectId);

    if (
      !current ||
      Date.parse(version.createdAt) > Date.parse(current.createdAt)
    ) {
      latest.set(version.projectId, version);
    }
  }

  return latest;
}

export function latestAuditForTemplate(input: {
  template: DesignTemplateSummary;
  auditLogs: WorkspaceAuditLogSummary[];
}) {
  const latest = input.auditLogs
    .filter(
      (log) =>
        log.targetId === input.template.id ||
        normalizeSearchText(log.summary).includes(
          normalizeSearchText(input.template.name),
        ),
    )
    .sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    )[0];

  return latest?.createdAt ?? null;
}

export function aggregateStatus(
  statuses: TemplateInstancePropagationStatus[],
): TemplateInstancePropagationStatus {
  if (!statuses.length) return "blocked";
  if (statuses.some((status) => status === "blocked")) return "blocked";
  if (statuses.some((status) => status === "review")) return "review";

  return "ready";
}

export function average(values: number[], fallback = 100) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

export function compareGroups(
  left: TemplateInstanceGroup,
  right: TemplateInstanceGroup,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    right.rejectedCount - left.rejectedCount ||
    right.instanceCount - left.instanceCount ||
    left.templateName.localeCompare(right.templateName)
  );
}

export function comparePreviews(
  left: TemplateInstanceUpdatePreview,
  right: TemplateInstanceUpdatePreview,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    left.projectName.localeCompare(right.projectName)
  );
}

export function statusWeight(status: TemplateInstancePropagationStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

export function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function normalizeDate(value: Date | string | undefined) {
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);

  return new Date();
}

export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function formatDateLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toISOString().slice(0, 10);
}

export function slugify(value: string) {
  return (
    normalizeSearchText(value)
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "") || "template"
  );
}
