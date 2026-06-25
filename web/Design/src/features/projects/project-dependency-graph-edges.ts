import type { CampaignBoardSummary } from "@/db/campaigns";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import type { ProjectDependencyEdge } from "@/features/projects/project-dependency-graph-types";
import {
  campaignNodeId,
  exportNodeId,
  packageNodeId,
  projectNodeId,
  publicLinkNodeId,
  websiteNodeId,
} from "@/features/projects/project-dependency-graph-utils";

export function createVariantEdges(
  projects: ProjectSummary[],
): ProjectDependencyEdge[] {
  return projects
    .filter((project) => project.sourceProjectId)
    .map((project) => ({
      id: `variant-${project.sourceProjectId}-${project.id}`,
      type: "variant",
      sourceNodeId: projectNodeId(project.sourceProjectId ?? ""),
      targetNodeId: projectNodeId(project.id),
      label: project.variantName ?? "Variant",
      status: "ready",
    }));
}

export function createPackageEdges(input: {
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
}): ProjectDependencyEdge[] {
  const activeProjects = input.projects.filter((project) => !project.deletedAt);

  return input.templates
    .filter((template) => template.marketplaceStatus !== "archived")
    .flatMap((template) =>
      activeProjects
        .filter((project) => isPackageProjectMatch(template, project))
        .slice(0, 8)
        .map((project) => ({
          id: `package-${template.id}-${project.id}`,
          type: "package" as const,
          sourceNodeId: packageNodeId(template.id),
          targetNodeId: projectNodeId(project.id),
          label: "Package dependency",
          status: template.approvalStatus === "approved" ? "ready" : "review",
        })),
    );
}

export function createExportEdges(
  exportJobs: ServerExportJobSummary[],
): ProjectDependencyEdge[] {
  return exportJobs.map((job) => ({
    id: `export-${job.projectId}-${job.id}`,
    type: "export",
    sourceNodeId: projectNodeId(job.projectId),
    targetNodeId: exportNodeId(job.id),
    label: job.formatLabel,
    status:
      job.status === "failed"
        ? "blocked"
        : job.status === "completed"
          ? "ready"
          : "review",
  }));
}

export function createWebsiteEdges(
  publishes: WebsitePublishSummary[],
): ProjectDependencyEdge[] {
  return publishes.map((publish) => ({
    id: `website-${publish.projectId}-${publish.id}`,
    type: "website",
    sourceNodeId: projectNodeId(publish.projectId),
    targetNodeId: websiteNodeId(publish.id),
    label: publish.slug,
    status: publish.status === "published" ? "ready" : "review",
  }));
}

export function createCampaignEdges(
  campaigns: CampaignBoardSummary[],
): ProjectDependencyEdge[] {
  return campaigns.flatMap((campaign) =>
    campaign.deliverables
      .filter((deliverable) => deliverable.projectId)
      .map((deliverable) => ({
        id: `campaign-${campaign.id}-${deliverable.id}`,
        type: "campaign" as const,
        sourceNodeId: campaignNodeId(campaign.id),
        targetNodeId: projectNodeId(deliverable.projectId ?? ""),
        label: deliverable.role,
        status:
          deliverable.status === "done" ||
          deliverable.approvalStatus === "approved"
            ? "ready"
            : "review",
      })),
  );
}

export function createPublicLinkEdges(
  projects: ProjectSummary[],
): ProjectDependencyEdge[] {
  return projects.flatMap((project) => {
    const edges: ProjectDependencyEdge[] = [];

    if (project.publicShareId) {
      edges.push({
        id: `public-link-view-${project.id}`,
        type: "public-link",
        sourceNodeId: projectNodeId(project.id),
        targetNodeId: publicLinkNodeId(project.id, "view"),
        label: "Public view",
        status: "ready",
      });
    }

    if (project.editShareId) {
      edges.push({
        id: `public-link-edit-${project.id}`,
        type: "public-link",
        sourceNodeId: projectNodeId(project.id),
        targetNodeId: publicLinkNodeId(project.id, "edit"),
        label: `${project.editSharePermission} edit link`,
        status: project.editSharePermission === "edit" ? "review" : "ready",
      });
    }

    return edges;
  });
}

function isPackageProjectMatch(
  template: DesignTemplateSummary,
  project: ProjectSummary,
) {
  const normalizedTemplateName = normalizeText(template.name);
  const normalizedProjectName = normalizeText(project.name);

  return (
    (normalizedTemplateName &&
      normalizedProjectName.includes(normalizedTemplateName)) ||
    (template.width === project.width && template.height === project.height)
  );
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
