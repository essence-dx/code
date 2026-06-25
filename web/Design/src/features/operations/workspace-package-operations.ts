import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import {
  createComponentKitSection,
  createDependencyHealthSection,
  createMigrationCheckSection,
  createProjectBundleSection,
} from "@/features/operations/workspace-package-operations-sections";
import type {
  WorkspacePackageContext,
  WorkspacePackageOperations,
} from "@/features/operations/workspace-package-operations-types";
import {
  average,
  countVersionedProjects,
  createNextActions,
  scoreToStatus,
} from "@/features/operations/workspace-package-operations-utils";

export type {
  WorkspacePackageContext,
  WorkspacePackageItem,
  WorkspacePackageOperations,
  WorkspacePackageSection,
  WorkspacePackageSectionId,
  WorkspacePackageStatus,
} from "@/features/operations/workspace-package-operations-types";

export function createWorkspacePackageOperations(input: {
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
  projectVersions: ProjectVersionSummary[];
  serverExportJobs: ServerExportJobSummary[];
  projectHandoffPackets: ProjectHandoffPacket[];
}): WorkspacePackageOperations {
  const context: WorkspacePackageContext = {
    activeProjects: input.projects.filter((project) => !project.deletedAt),
    templates: input.templates,
    projectVersions: input.projectVersions,
    serverExportJobs: input.serverExportJobs,
    projectHandoffPackets: input.projectHandoffPackets,
  };
  const sections = [
    createProjectBundleSection(context),
    createComponentKitSection(context),
    createDependencyHealthSection(context),
    createMigrationCheckSection(context),
  ];
  const score = average(sections.map((section) => section.score));

  return {
    status: scoreToStatus(
      score,
      sections.some((section) => section.status === "blocked"),
    ),
    score,
    sections,
    nextActions: createNextActions(sections),
    totals: {
      activeProjects: context.activeProjects.length,
      versionedProjects: countVersionedProjects(context),
      readyBundles: getSectionMetric(sections, "project-bundles"),
      componentKits: getSectionMetric(sections, "component-kits"),
      blockedDependencies: getSectionMetric(sections, "dependency-health"),
      migrationChecks: getSectionMetric(sections, "migration-checks"),
    },
  };
}

function getSectionMetric(
  sections: WorkspacePackageOperations["sections"],
  id: WorkspacePackageOperations["sections"][number]["id"],
) {
  return sections.find((section) => section.id === id)?.metricValue ?? 0;
}
