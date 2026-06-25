import type { ProjectExportLineageArtifact, ProjectExportLineageArtifactKind, ProjectExportLineageReport } from "@/features/projects/project-export-lineage";

export type ProjectPublicSurfaceHealthSurface = "api-payload" | "app-package" | "embed" | "public-viewer";
export type ProjectPublicSurfaceHealthStatus = "fail" | "pass" | "warn";
export type ProjectPublicSurfaceScreenshotState = "captured" | "not-applicable" | "pending" | "unavailable";

export interface ProjectPublicSurfaceHealthSnapshot {
  batchId: string;
  checkedAt: string;
  id?: string;
  issues: string[];
  label: string;
  latencyMs: number | null;
  path: string | null;
  projectId: string;
  projectName: string;
  screenshotArtifactId: string | null;
  screenshotByteSize: number | null;
  screenshotCapturedAt: string | null;
  screenshotDiffScore: number | null;
  screenshotDiffSummary: string | null;
  screenshotHash: string | null;
  screenshotHeight: number | null;
  screenshotPath: string | null;
  screenshotState: ProjectPublicSurfaceScreenshotState;
  screenshotWidth: number | null;
  sourceKey: string;
  sourceVersionId: string;
  status: ProjectPublicSurfaceHealthStatus;
  statusCode: number | null;
  surface: ProjectPublicSurfaceHealthSurface;
  url: string | null;
  workspaceId?: string;
}

export interface ProjectPublicSurfaceHealthBatchSummary {
  batchId: string;
  checkedAt: string;
  failCount: number;
  passCount: number;
  screenshotPendingCount: number;
  totalCount: number;
  warnCount: number;
}

export interface ProjectPublicSurfaceHealthReport {
  generatedAt: string;
  history: {
    batchCount: number;
    recentBatches: ProjectPublicSurfaceHealthBatchSummary[];
    snapshotCount: number;
  };
  snapshots: ProjectPublicSurfaceHealthSnapshot[];
  summary: {
    apiPayloadCount: number;
    appPackageCount: number;
    embedCount: number;
    failCount: number;
    passCount: number;
    publicViewerCount: number;
    screenshotCapturedCount: number;
    screenshotDiffCount: number;
    screenshotPendingCount: number;
    totalCount: number;
    warnCount: number;
  };
}

export interface CreateProjectPublicSurfaceHealthReportInput {
  batchId?: string;
  generatedAt?: string;
  historySnapshots?: ProjectPublicSurfaceHealthSnapshot[];
  lineageReports: ProjectExportLineageReport[];
}

const statusRank: Record<ProjectPublicSurfaceHealthStatus, number> = {
  fail: 0,
  warn: 1,
  pass: 2,
};

const surfaceRank: Record<ProjectPublicSurfaceHealthSurface, number> = {
  "public-viewer": 0,
  embed: 1,
  "api-payload": 2,
  "app-package": 3,
};

function surfaceForArtifact(kind: ProjectExportLineageArtifactKind): ProjectPublicSurfaceHealthSurface | null {
  if (kind === "public-link") {
    return "public-viewer";
  }

  if (kind === "embed") {
    return "embed";
  }

  if (kind === "api-payload") {
    return "api-payload";
  }

  if (kind === "app-package") {
    return "app-package";
  }

  return null;
}

function statusForArtifact(artifact: ProjectExportLineageArtifact): ProjectPublicSurfaceHealthStatus {
  if (artifact.status === "available") {
    return "pass";
  }

  return artifact.status === "blocked" ? "fail" : "warn";
}

function screenshotStateForSurface(input: {
  path: string | null;
  status: ProjectPublicSurfaceHealthStatus;
  surface: ProjectPublicSurfaceHealthSurface;
  url: string | null;
}): ProjectPublicSurfaceScreenshotState {
  if (input.status === "fail" || (!input.path && !input.url)) {
    return "unavailable";
  }

  if (input.surface === "public-viewer" || input.surface === "embed") {
    return "pending";
  }

  return "not-applicable";
}

function issuesForArtifact(artifact: ProjectExportLineageArtifact, status: ProjectPublicSurfaceHealthStatus) {
  if (status === "pass") {
    return [];
  }

  return [artifact.blockedReason ?? `${artifact.label} is not available yet.`];
}

function createSnapshot(input: {
  artifact: ProjectExportLineageArtifact;
  batchId: string;
  checkedAt: string;
  project: ProjectExportLineageReport["project"];
  surface: ProjectPublicSurfaceHealthSurface;
}): ProjectPublicSurfaceHealthSnapshot {
  const status = statusForArtifact(input.artifact);

  return {
    batchId: input.batchId,
    checkedAt: input.checkedAt,
    issues: issuesForArtifact(input.artifact, status),
    label: input.artifact.label,
    latencyMs: null,
    path: input.artifact.path,
    projectId: input.project.id,
    projectName: input.project.name,
    screenshotArtifactId: null,
    screenshotByteSize: null,
    screenshotCapturedAt: null,
    screenshotDiffScore: null,
    screenshotDiffSummary: null,
    screenshotHash: null,
    screenshotHeight: null,
    screenshotPath: null,
    screenshotState: screenshotStateForSurface({
      path: input.artifact.path,
      status,
      surface: input.surface,
      url: input.artifact.url,
    }),
    screenshotWidth: null,
    sourceKey: `${input.project.id}:${input.surface}:${input.artifact.id}`,
    sourceVersionId: input.artifact.sourceVersionId,
    status,
    statusCode: status === "pass" ? 200 : null,
    surface: input.surface,
    url: input.artifact.url,
  };
}

function summarizeSnapshots(snapshots: ProjectPublicSurfaceHealthSnapshot[]): ProjectPublicSurfaceHealthReport["summary"] {
  return {
    apiPayloadCount: snapshots.filter((snapshot) => snapshot.surface === "api-payload").length,
    appPackageCount: snapshots.filter((snapshot) => snapshot.surface === "app-package").length,
    embedCount: snapshots.filter((snapshot) => snapshot.surface === "embed").length,
    failCount: snapshots.filter((snapshot) => snapshot.status === "fail").length,
    passCount: snapshots.filter((snapshot) => snapshot.status === "pass").length,
    publicViewerCount: snapshots.filter((snapshot) => snapshot.surface === "public-viewer").length,
    screenshotCapturedCount: snapshots.filter((snapshot) => snapshot.screenshotState === "captured").length,
    screenshotDiffCount: snapshots.filter((snapshot) => typeof snapshot.screenshotDiffScore === "number").length,
    screenshotPendingCount: snapshots.filter((snapshot) => snapshot.screenshotState === "pending").length,
    totalCount: snapshots.length,
    warnCount: snapshots.filter((snapshot) => snapshot.status === "warn").length,
  };
}

function summarizeBatch(batchId: string, snapshots: ProjectPublicSurfaceHealthSnapshot[]): ProjectPublicSurfaceHealthBatchSummary {
  const sorted = [...snapshots].sort((first, second) => second.checkedAt.localeCompare(first.checkedAt));

  return {
    batchId,
    checkedAt: sorted[0]?.checkedAt ?? "",
    failCount: snapshots.filter((snapshot) => snapshot.status === "fail").length,
    passCount: snapshots.filter((snapshot) => snapshot.status === "pass").length,
    screenshotPendingCount: snapshots.filter((snapshot) => snapshot.screenshotState === "pending").length,
    totalCount: snapshots.length,
    warnCount: snapshots.filter((snapshot) => snapshot.status === "warn").length,
  };
}

function createHistory(snapshots: ProjectPublicSurfaceHealthSnapshot[]) {
  const grouped = snapshots.reduce<Map<string, ProjectPublicSurfaceHealthSnapshot[]>>((batches, snapshot) => {
    const batch = batches.get(snapshot.batchId) ?? [];

    batch.push(snapshot);
    batches.set(snapshot.batchId, batch);

    return batches;
  }, new Map());
  const recentBatches = [...grouped.entries()]
    .map(([batchId, batchSnapshots]) => summarizeBatch(batchId, batchSnapshots))
    .sort((first, second) => second.checkedAt.localeCompare(first.checkedAt))
    .slice(0, 8);

  return {
    batchCount: grouped.size,
    recentBatches,
    snapshotCount: snapshots.length,
  };
}

export function createProjectPublicSurfaceHealthSnapshots(input: {
  batchId: string;
  generatedAt: string;
  lineageReports: ProjectExportLineageReport[];
}): ProjectPublicSurfaceHealthSnapshot[] {
  return input.lineageReports
    .flatMap((report) =>
      report.artifacts.flatMap((artifact) => {
        const surface = surfaceForArtifact(artifact.kind);

        return surface
          ? [
              createSnapshot({
                artifact,
                batchId: input.batchId,
                checkedAt: input.generatedAt,
                project: report.project,
                surface,
              }),
            ]
          : [];
      }),
    )
    .sort(
      (first, second) =>
        statusRank[first.status] - statusRank[second.status] ||
        first.projectName.localeCompare(second.projectName) ||
        surfaceRank[first.surface] - surfaceRank[second.surface] ||
        first.label.localeCompare(second.label),
    );
}

export function createProjectPublicSurfaceHealthReportFromSnapshots(
  snapshots: ProjectPublicSurfaceHealthSnapshot[],
  historySnapshots: ProjectPublicSurfaceHealthSnapshot[] = snapshots,
  generatedAt = new Date().toISOString(),
): ProjectPublicSurfaceHealthReport {
  return {
    generatedAt,
    history: createHistory(historySnapshots),
    snapshots: [...snapshots].sort(
      (first, second) =>
        statusRank[first.status] - statusRank[second.status] ||
        first.projectName.localeCompare(second.projectName) ||
        surfaceRank[first.surface] - surfaceRank[second.surface] ||
        first.label.localeCompare(second.label),
    ),
    summary: summarizeSnapshots(snapshots),
  };
}

export function createProjectPublicSurfaceHealthReport(input: CreateProjectPublicSurfaceHealthReportInput): ProjectPublicSurfaceHealthReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const batchId = input.batchId ?? "current";
  const snapshots = createProjectPublicSurfaceHealthSnapshots({
    batchId,
    generatedAt,
    lineageReports: input.lineageReports,
  });

  return createProjectPublicSurfaceHealthReportFromSnapshots(snapshots, input.historySnapshots ?? snapshots, generatedAt);
}
