import type { SceneQaSnapshotComparison, SceneQaSnapshotReport, SceneQaSnapshotStatus, SceneQaSnapshotSurface } from "@/features/projects/scene-qa-snapshots";

export interface SceneQaBaselineRecord {
  actualSignature: string | null;
  capturedAt: string;
  comparisonId: string;
  deploymentId: string;
  expectedSignature: string | null;
  issueCount: number;
  issues: string[];
  path: string | null;
  projectId: string | null;
  snapshotComparisonId: string;
  status: SceneQaSnapshotStatus;
  surface: SceneQaSnapshotSurface;
  targetName: string;
  templateId: string | null;
  workspaceId: string;
}

export interface SceneQaBaselineDrift {
  comparisonId: string;
  fromStatus: SceneQaSnapshotStatus | null;
  previousDeploymentId: string | null;
  surface: SceneQaSnapshotSurface;
  targetName: string;
  toStatus: SceneQaSnapshotStatus;
  type: "new" | "removed" | "signature" | "status";
}

export interface SceneQaBaselineDeploymentTrend {
  capturedAt: string;
  changedSignatureCount: number;
  changedStatusCount: number;
  deploymentId: string;
  driftedCount: number;
  failedCount: number;
  newComparisonCount: number;
  passedCount: number;
  removedComparisonCount: number;
  topDrifts: SceneQaBaselineDrift[];
  totalCount: number;
  warningCount: number;
}

export interface SceneQaBaselineTrendReport {
  deployments: SceneQaBaselineDeploymentTrend[];
  latestTrend: SceneQaBaselineDeploymentTrend | null;
  summary: {
    deploymentCount: number;
    latestDeploymentId: string | null;
    latestDriftedCount: number;
    latestFailedCount: number;
    latestWarningCount: number;
    totalBaselineCount: number;
  };
}

function toTimestamp(value: string) {
  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function createComparisonId(comparison: SceneQaSnapshotComparison) {
  if (comparison.projectId) {
    return `project:${comparison.projectId}:${comparison.surface}`;
  }

  if (comparison.templateId) {
    return `template:${comparison.templateId}:${comparison.surface}`;
  }

  return `snapshot:${comparison.id}`;
}

export function createSceneQaBaselineRecordsFromReport(input: {
  deploymentId: string;
  report: SceneQaSnapshotReport;
  workspaceId: string;
}): SceneQaBaselineRecord[] {
  return input.report.comparisons.map((comparison) => ({
    actualSignature: comparison.actualSignature,
    capturedAt: input.report.generatedAt,
    comparisonId: createComparisonId(comparison),
    deploymentId: input.deploymentId,
    expectedSignature: comparison.expectedSignature,
    issueCount: comparison.issues.length,
    issues: comparison.issues,
    path: comparison.path,
    projectId: comparison.projectId ?? null,
    snapshotComparisonId: comparison.id,
    status: comparison.status,
    surface: comparison.surface,
    targetName: comparison.targetName,
    templateId: comparison.templateId ?? null,
    workspaceId: input.workspaceId,
  }));
}

function summarizeDeployment(records: SceneQaBaselineRecord[], previousRecords: SceneQaBaselineRecord[] | null): SceneQaBaselineDeploymentTrend {
  const previousByComparison = new Map(previousRecords?.map((record) => [record.comparisonId, record]) ?? []);
  const currentByComparison = new Map(records.map((record) => [record.comparisonId, record]));
  const topDrifts: SceneQaBaselineDrift[] = [];
  let changedSignatureCount = 0;
  let changedStatusCount = 0;
  let newComparisonCount = 0;

  for (const record of records) {
    const previous = previousByComparison.get(record.comparisonId);

    if (!previous) {
      if (previousRecords) {
        newComparisonCount += 1;
        topDrifts.push({
          comparisonId: record.comparisonId,
          fromStatus: null,
          previousDeploymentId: null,
          surface: record.surface,
          targetName: record.targetName,
          toStatus: record.status,
          type: "new",
        });
      }

      continue;
    }

    const statusChanged = previous.status !== record.status;
    const signatureChanged = previous.actualSignature !== record.actualSignature;

    if (statusChanged) {
      changedStatusCount += 1;
      topDrifts.push({
        comparisonId: record.comparisonId,
        fromStatus: previous.status,
        previousDeploymentId: previous.deploymentId,
        surface: record.surface,
        targetName: record.targetName,
        toStatus: record.status,
        type: "status",
      });
    } else if (signatureChanged) {
      changedSignatureCount += 1;
      topDrifts.push({
        comparisonId: record.comparisonId,
        fromStatus: previous.status,
        previousDeploymentId: previous.deploymentId,
        surface: record.surface,
        targetName: record.targetName,
        toStatus: record.status,
        type: "signature",
      });
    }
  }

  let removedComparisonCount = 0;

  if (previousRecords) {
    for (const previous of previousByComparison.values()) {
      if (!currentByComparison.has(previous.comparisonId)) {
        removedComparisonCount += 1;
        topDrifts.push({
          comparisonId: previous.comparisonId,
          fromStatus: previous.status,
          previousDeploymentId: previous.deploymentId,
          surface: previous.surface,
          targetName: previous.targetName,
          toStatus: previous.status,
          type: "removed",
        });
      }
    }
  }

  return {
    capturedAt: records.reduce((latest, record) => (toTimestamp(record.capturedAt) > toTimestamp(latest) ? record.capturedAt : latest), records[0]?.capturedAt ?? ""),
    changedSignatureCount,
    changedStatusCount,
    deploymentId: records[0]?.deploymentId ?? "",
    driftedCount: changedSignatureCount + changedStatusCount + newComparisonCount + removedComparisonCount,
    failedCount: records.filter((record) => record.status === "fail").length,
    newComparisonCount,
    passedCount: records.filter((record) => record.status === "pass").length,
    removedComparisonCount,
    topDrifts: topDrifts.slice(0, 6),
    totalCount: records.length,
    warningCount: records.filter((record) => record.status === "warn").length,
  };
}

export function createSceneQaBaselineTrendReport(records: SceneQaBaselineRecord[]): SceneQaBaselineTrendReport {
  const grouped = records.reduce<Map<string, SceneQaBaselineRecord[]>>((groups, record) => {
    const group = groups.get(record.deploymentId) ?? [];

    group.push(record);
    groups.set(record.deploymentId, group);

    return groups;
  }, new Map());
  const deploymentGroups = [...grouped.values()].sort((first, second) => toTimestamp(first[0]?.capturedAt ?? "") - toTimestamp(second[0]?.capturedAt ?? ""));
  const chronologicalTrends: SceneQaBaselineDeploymentTrend[] = [];

  for (let index = 0; index < deploymentGroups.length; index += 1) {
    chronologicalTrends.push(summarizeDeployment(deploymentGroups[index] ?? [], deploymentGroups[index - 1] ?? null));
  }

  const latestTrend = chronologicalTrends.at(-1) ?? null;
  const deployments = [...chronologicalTrends].reverse();

  return {
    deployments,
    latestTrend,
    summary: {
      deploymentCount: deployments.length,
      latestDeploymentId: latestTrend?.deploymentId ?? null,
      latestDriftedCount: latestTrend?.driftedCount ?? 0,
      latestFailedCount: latestTrend?.failedCount ?? 0,
      latestWarningCount: latestTrend?.warningCount ?? 0,
      totalBaselineCount: records.length,
    },
  };
}
