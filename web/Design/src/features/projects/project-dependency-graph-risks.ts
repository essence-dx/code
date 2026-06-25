import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectSummary } from "@/features/editor/types";
import type { ProjectDependencyRisk } from "@/features/projects/project-dependency-graph-types";
import {
  exportNodeId,
  projectNodeId,
  websiteNodeId,
} from "@/features/projects/project-dependency-graph-utils";

export function createDependencyRisks(input: {
  projects: ProjectSummary[];
  exportJobs: ServerExportJobSummary[];
  websitePublishes: WebsitePublishSummary[];
}): ProjectDependencyRisk[] {
  const projectsById = new Map(
    input.projects.map((project) => [project.id, project] as const),
  );

  return [
    ...createSourceRisks(input.projects, projectsById),
    ...createExportRisks(input.exportJobs),
    ...createWebsiteRisks(input.websitePublishes),
    ...createPublicSurfaceRisks(input.projects),
  ].sort(
    (left, right) =>
      riskStatusWeight(left.status) - riskStatusWeight(right.status) ||
      left.title.localeCompare(right.title),
  );
}

function createSourceRisks(
  projects: ProjectSummary[],
  projectsById: Map<string, ProjectSummary>,
): ProjectDependencyRisk[] {
  return projects
    .filter((project) => project.sourceProjectId)
    .flatMap<ProjectDependencyRisk>((project) => {
      const source = projectsById.get(project.sourceProjectId ?? "");

      if (!source) {
        return [
          {
            id: `missing-source-${project.id}`,
            kind: "missing-source" as const,
            title: project.name,
            detail:
              "Variant points to a source design that is no longer visible.",
            status: "blocked" as const,
            nodeId: projectNodeId(project.id),
            href: `/editor/${project.id}`,
          },
        ];
      }

      if (Date.parse(source.updatedAt) > Date.parse(project.updatedAt)) {
        return [
          {
            id: `stale-variant-${project.id}`,
            kind: "stale-variant" as const,
            title: project.name,
            detail: `${source.name} changed after this variant was last updated.`,
            status: "review" as const,
            nodeId: projectNodeId(project.id),
            href: `/editor/${project.id}`,
          },
        ];
      }

      return [];
    });
}

function createExportRisks(
  exportJobs: ServerExportJobSummary[],
): ProjectDependencyRisk[] {
  return exportJobs
    .filter((job) => job.status === "failed")
    .map((job) => ({
      id: `failed-export-${job.id}`,
      kind: "failed-export" as const,
      title: job.fileName,
      detail: job.failureMessage ?? `${job.formatLabel} export failed.`,
      status: "blocked" as const,
      nodeId: exportNodeId(job.id),
      href: null,
    }));
}

function createWebsiteRisks(
  publishes: WebsitePublishSummary[],
): ProjectDependencyRisk[] {
  return publishes
    .filter((publish) => publish.status === "unpublished")
    .map((publish) => ({
      id: `paused-website-${publish.id}`,
      kind: "paused-website" as const,
      title: publish.title,
      detail: "Website dependency is currently unpublished.",
      status: "review" as const,
      nodeId: websiteNodeId(publish.id),
      href: `/site/${publish.slug}`,
    }));
}

function createPublicSurfaceRisks(
  projects: ProjectSummary[],
): ProjectDependencyRisk[] {
  return projects
    .filter(
      (project) =>
        project.editShareId && project.editSharePermission === "edit",
    )
    .map((project) => ({
      id: `editable-public-surface-${project.id}`,
      kind: "editable-public-surface" as const,
      title: project.name,
      detail:
        "Editable share link is active and should be reviewed before release.",
      status: "review" as const,
      nodeId: projectNodeId(project.id),
      href: `/editor/${project.id}`,
    }));
}

function riskStatusWeight(status: ProjectDependencyRisk["status"]) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}
