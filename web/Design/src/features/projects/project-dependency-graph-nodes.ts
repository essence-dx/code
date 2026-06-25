import type { CampaignBoardSummary } from "@/db/campaigns";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import type { ProjectDependencyNode } from "@/features/projects/project-dependency-graph-types";
import {
  campaignNodeId,
  exportNodeId,
  packageNodeId,
  projectNodeId,
  publicLinkNodeId,
  websiteNodeId,
} from "@/features/projects/project-dependency-graph-utils";

export function createProjectNodes(
  projects: ProjectSummary[],
): ProjectDependencyNode[] {
  return projects.map((project) => ({
    id: projectNodeId(project.id),
    type: "project",
    label: project.name,
    detail: project.sourceProjectId
      ? `${project.variantName ?? "Variant"} from source design`
      : `${project.width} x ${project.height} source design`,
    status: project.deletedAt ? "blocked" : "ready",
    href: `/editor/${project.id}`,
    meta: [
      `${project.width} x ${project.height}`,
      project.approvalStatus,
      project.sourceProjectId ? "Variant" : "Source",
    ],
  }));
}

export function createPackageNodes(
  templates: DesignTemplateSummary[],
): ProjectDependencyNode[] {
  return templates
    .filter((template) => template.marketplaceStatus !== "archived")
    .map((template) => ({
      id: packageNodeId(template.id),
      type: "package",
      label: template.name,
      detail: `${template.marketplaceStatus} template package for ${template.width} x ${template.height} work.`,
      status:
        template.approvalStatus === "approved" ||
        template.marketplaceStatus === "published"
          ? "ready"
          : "review",
      href: `/templates/${template.id}`,
      meta: [
        template.marketplaceStatus,
        `${template.marketplaceUseCount} uses`,
        `${template.width} x ${template.height}`,
      ],
    }));
}

export function createExportNodes(
  exportJobs: ServerExportJobSummary[],
): ProjectDependencyNode[] {
  return exportJobs.map((job) => ({
    id: exportNodeId(job.id),
    type: "export",
    label: job.fileName,
    detail:
      job.status === "failed"
        ? (job.failureMessage ?? `${job.formatLabel} export failed.`)
        : `${job.formatLabel} export is ${job.status}.`,
    status:
      job.status === "failed"
        ? "blocked"
        : job.status === "completed"
          ? "ready"
          : "review",
    href: null,
    meta: [job.formatLabel, `${job.progress}%`, job.status],
  }));
}

export function createWebsiteNodes(
  publishes: WebsitePublishSummary[],
): ProjectDependencyNode[] {
  return publishes.map((publish) => ({
    id: websiteNodeId(publish.id),
    type: "website",
    label: publish.title,
    detail: `${publish.slug} is ${publish.status}.`,
    status: publish.status === "published" ? "ready" : "review",
    href: `/site/${publish.slug}`,
    meta: [
      publish.status,
      `${publish.viewCount} views`,
      `${publish.clickCount} clicks`,
    ],
  }));
}

export function createCampaignNodes(
  campaigns: CampaignBoardSummary[],
): ProjectDependencyNode[] {
  return campaigns.map((campaign) => ({
    id: campaignNodeId(campaign.id),
    type: "campaign",
    label: campaign.name,
    detail: `${campaign.deliverables.length} deliverables for ${campaign.goal}.`,
    status:
      campaign.status === "complete"
        ? "ready"
        : campaign.deliverables.some((deliverable) => !deliverable.projectId)
          ? "review"
          : "ready",
    href: null,
    meta: [campaign.status, `${campaign.deliverables.length} deliverables`],
  }));
}

export function createPublicLinkNodes(
  projects: ProjectSummary[],
): ProjectDependencyNode[] {
  return projects.flatMap((project) => {
    const nodes: ProjectDependencyNode[] = [];

    if (project.publicShareId) {
      nodes.push({
        id: publicLinkNodeId(project.id, "view"),
        type: "public-link",
        label: `${project.name} public view`,
        detail: "Public share view is enabled.",
        status: "ready",
        href: `/view/${project.publicShareId}`,
        meta: ["view", "public"],
      });
    }

    if (project.editShareId) {
      nodes.push({
        id: publicLinkNodeId(project.id, "edit"),
        type: "public-link",
        label: `${project.name} edit link`,
        detail: `${project.editSharePermission} edit-share permission is enabled.`,
        status: project.editSharePermission === "edit" ? "review" : "ready",
        href: `/edit/${project.editShareId}`,
        meta: ["edit", project.editSharePermission],
      });
    }

    return nodes;
  });
}
