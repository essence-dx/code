import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import type {
  WorkspacePackageContext,
  WorkspacePackageItem,
  WorkspacePackageSection,
  WorkspacePackageStatus,
} from "@/features/operations/workspace-package-operations-types";

export function createLatestVersionMap(versions: ProjectVersionSummary[]) {
  const latestByProject = new Map<string, ProjectVersionSummary>();

  for (const version of versions) {
    const current = latestByProject.get(version.projectId);
    if (!current || Date.parse(version.createdAt) > Date.parse(current.createdAt)) {
      latestByProject.set(version.projectId, version);
    }
  }

  return latestByProject;
}

export function createLatestCompletedExportMap(jobs: ServerExportJobSummary[]) {
  const latestByProject = new Map<string, ServerExportJobSummary>();

  for (const job of jobs) {
    if (job.status !== "completed") continue;

    const current = latestByProject.get(job.projectId);
    const jobTime = Date.parse(job.completedAt ?? job.updatedAt);
    const currentTime = current
      ? Date.parse(current.completedAt ?? current.updatedAt)
      : 0;

    if (!current || jobTime > currentTime) {
      latestByProject.set(job.projectId, job);
    }
  }

  return latestByProject;
}

export function createSourceFamilyCount(projects: ProjectSummary[]) {
  const families = new Set<string>();

  for (const project of projects) {
    if (project.sourceProjectId) {
      families.add(project.sourceProjectId);
    }
  }

  return families.size;
}

export function countVersionedProjects(context: WorkspacePackageContext) {
  const activeProjectIds = new Set(
    context.activeProjects.map((project) => project.id),
  );

  return new Set(
    context.projectVersions
      .filter((version) => activeProjectIds.has(version.projectId))
      .map((version) => version.projectId),
  ).size;
}

export function createNextActions(sections: WorkspacePackageSection[]) {
  return sections
    .filter((section) => section.status !== "ready")
    .sort((left, right) => left.score - right.score)
    .map((section) => {
      const item = section.items.find((candidate) => candidate.status !== "ready");

      return item
        ? `${section.title}: ${item.title} - ${item.detail}`
        : `${section.title}: ${section.emptyState}`;
    })
    .slice(0, 4);
}

export function comparePackageItems(
  left: WorkspacePackageItem,
  right: WorkspacePackageItem,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    Number.parseInt(left.badge, 10) - Number.parseInt(right.badge, 10) ||
    left.title.localeCompare(right.title)
  );
}

export function approvalScore(approvalStatus: ProjectSummary["approvalStatus"]) {
  if (approvalStatus === "approved") return 100;
  if (approvalStatus === "in-review") return 75;
  if (approvalStatus === "draft") return 55;

  return 20;
}

export function coverageScore(readyCount: number, totalCount: number) {
  if (totalCount <= 0) return 0;

  return Math.round((readyCount / totalCount) * 100);
}

export function average(values: number[]) {
  if (!values.length) return 0;

  return clampScore(
    Math.round(values.reduce((total, value) => total + value, 0) / values.length),
  );
}

export function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreToStatus(
  score: number,
  hasBlocked: boolean,
): WorkspacePackageStatus {
  if (hasBlocked || score < 50) return "blocked";
  if (score < 85) return "review";

  return "ready";
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

export function createBundleDetail(input: {
  latestVersion: ProjectVersionSummary | null;
  versionFresh: boolean;
  latestExport: ServerExportJobSummary | null;
  handoffPacket: ProjectHandoffPacket | null;
}) {
  if (!input.latestVersion) return "Create a project snapshot for rollback and reuse.";
  if (!input.versionFresh) return "Refresh the bundle snapshot after recent edits.";
  if (!input.latestExport) return "Run a completed export before packaging this design.";
  if (!input.handoffPacket) return "Run the project handoff audit before packaging.";
  if (input.handoffPacket.status !== "ready") return input.handoffPacket.nextAction;

  return "Bundle is ready for reuse, transfer, or client handoff.";
}

function statusWeight(status: WorkspacePackageStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}
