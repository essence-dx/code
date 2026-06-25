import type {
  ReleaseReadinessContext,
  ReleaseReadinessGate,
  ReleaseReadinessItem,
} from "@/features/operations/release-readiness-types";
import {
  clampScore,
  createLatestCompletedExportMap,
  createLatestVersionMap,
  scoreToStatus,
} from "@/features/operations/release-readiness-utils";

export function createMigrationDriftGate(
  context: ReleaseReadinessContext,
): ReleaseReadinessGate {
  const latestVersions = createLatestVersionMap(context.projectVersions);
  const latestCompletedExports = createLatestCompletedExportMap(
    context.serverExportJobs,
  );
  const missingSnapshots = context.activeProjects.filter(
    (project) => !latestVersions.has(project.id),
  );
  const staleSnapshots = context.activeProjects.filter((project) => {
    const latestVersion = latestVersions.get(project.id);

    return (
      latestVersion !== undefined &&
      Date.parse(project.updatedAt) > Date.parse(latestVersion.createdAt)
    );
  });
  const missingExports = context.activeProjects.filter(
    (project) => !latestCompletedExports.has(project.id),
  );
  const failedExports = context.serverExportJobs.filter(
    (job) => job.status === "failed",
  );
  const restoreAuditLogs = context.auditLogs.filter((log) =>
    log.action.includes("version"),
  );
  const score = clampScore(
    context.activeProjects.length
      ? 100 -
          missingSnapshots.length * 18 -
          staleSnapshots.length * 14 -
          missingExports.length * 8 -
          failedExports.length * 6
      : 45,
  );
  const items: ReleaseReadinessItem[] = [
    {
      id: "snapshot-coverage",
      title: "Snapshot coverage",
      detail: missingSnapshots.length
        ? "Some active projects cannot be restored from a release snapshot."
        : "Active projects have version snapshots available for rollback.",
      href: null,
      status: missingSnapshots.length ? "blocked" : "ready",
      badge: `${latestVersions.size}/${context.activeProjects.length}`,
      meta: [
        `${missingSnapshots.length} missing snapshots`,
        `${context.projectVersions.length} total snapshots`,
      ],
    },
    {
      id: "snapshot-freshness",
      title: "Snapshot freshness",
      detail: staleSnapshots.length
        ? "Some projects were updated after their latest snapshot."
        : "Latest snapshots are aligned with saved project timestamps.",
      href: null,
      status: staleSnapshots.length ? "review" : "ready",
      badge: `${staleSnapshots.length} stale`,
      meta: [
        `${staleSnapshots.length} stale snapshots`,
        `${restoreAuditLogs.length} version audit logs`,
      ],
    },
    {
      id: "export-runway",
      title: "Export runway",
      detail: missingExports.length
        ? "Some active projects do not have a completed server export artifact."
        : "Active projects have completed export artifacts for release checks.",
      href: null,
      status: missingExports.length ? "review" : "ready",
      badge: `${missingExports.length} missing`,
      meta: [
        `${latestCompletedExports.size} exported projects`,
        `${failedExports.length} failed jobs`,
      ],
    },
  ];

  return {
    id: "migration-drift",
    title: "Migration drift",
    description:
      "Snapshot, restore, and export drift checks before data or deployment changes go live.",
    status: scoreToStatus(
      score,
      context.activeProjects.length > 0 && missingSnapshots.length > 0,
    ),
    score,
    metricLabel: "projects without drift",
    metricValue:
      context.activeProjects.length - missingSnapshots.length - staleSnapshots.length,
    items,
  };
}
