import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectVersionSummary } from "@/features/editor/types";
import type { OperationalHealthStatus } from "@/features/operations/operational-health";
import type {
  ReleaseReadinessGate,
  ReleaseReadinessStatus,
} from "@/features/operations/release-readiness-types";

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

export function createNextActions(gates: ReleaseReadinessGate[]) {
  return gates
    .filter((gate) => gate.status !== "ready")
    .sort(compareGates)
    .map((gate) => {
      const item = gate.items.find((candidate) => candidate.status !== "ready");

      return item
        ? `${gate.title}: ${item.title} - ${item.detail}`
        : `${gate.title}: ${gate.description}`;
    })
    .slice(0, 5);
}

export function compareGates(
  left: ReleaseReadinessGate,
  right: ReleaseReadinessGate,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    left.score - right.score ||
    left.title.localeCompare(right.title)
  );
}

export function operationalStatusToReleaseStatus(
  status: OperationalHealthStatus,
): ReleaseReadinessStatus {
  if (status === "healthy") return "ready";
  if (status === "warning") return "review";

  return "blocked";
}

export function operationalStatusLabel(status: OperationalHealthStatus) {
  if (status === "healthy") return "Healthy";
  if (status === "warning") return "Review";

  return "Critical";
}

export function statusScore(status: ReleaseReadinessStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 65;

  return 0;
}

export function statusWeight(status: ReleaseReadinessStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

export function scoreToStatus(
  score: number,
  hasBlocked: boolean,
): ReleaseReadinessStatus {
  if (hasBlocked || score < 50) return "blocked";
  if (score < 85) return "review";

  return "ready";
}

export function coverageScore(readyCount: number, totalCount: number) {
  if (totalCount <= 0) return 0;

  return clampScore((readyCount / totalCount) * 100);
}

export function average(values: number[]) {
  if (!values.length) return 0;

  return clampScore(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

export function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}
