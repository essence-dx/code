import type { ProjectPublicSurfaceHealthReport, ProjectPublicSurfaceHealthSnapshot } from "@/features/projects/public-surface-health";

export type ProjectPublicSurfaceScreenshotDiffStatus = "changed" | "new" | "stable";

export interface ProjectPublicSurfaceScreenshotCaptureJob {
  label: string;
  projectId: string;
  projectName: string;
  sourceKey: string;
  surface: Extract<ProjectPublicSurfaceHealthSnapshot["surface"], "embed" | "public-viewer">;
  targetUrl: string;
}

export interface ProjectPublicSurfaceScreenshotCaptureArtifact {
  byteSize: number;
  capturedAt: string;
  contentHash: string;
  diffScore: number;
  diffStatus: ProjectPublicSurfaceScreenshotDiffStatus;
  diffSummary: string;
  height: number;
  id: string;
  path: string;
  sourceKey: string;
  width: number;
}

export interface ProjectPublicSurfaceScreenshotCaptureRun {
  artifacts: ProjectPublicSurfaceScreenshotCaptureArtifact[];
  completedAt: string;
  jobs: ProjectPublicSurfaceScreenshotCaptureJob[];
  summary: {
    capturedCount: number;
    changedCount: number;
    jobCount: number;
    stableCount: number;
  };
}

export interface ProjectPublicSurfaceScreenshotCaptureAdapter {
  capture(job: ProjectPublicSurfaceScreenshotCaptureJob): Promise<Omit<ProjectPublicSurfaceScreenshotCaptureArtifact, "diffScore" | "diffStatus" | "diffSummary" | "sourceKey">>;
}

export interface RunProjectPublicSurfaceScreenshotCaptureInput {
  adapter: ProjectPublicSurfaceScreenshotCaptureAdapter;
  baselineArtifacts?: ProjectPublicSurfaceScreenshotCaptureArtifact[];
  completedAt?: string;
  report: ProjectPublicSurfaceHealthReport;
}

function requiresScreenshot(snapshot: ProjectPublicSurfaceHealthSnapshot) {
  return (
    snapshot.status === "pass" &&
    snapshot.screenshotState === "pending" &&
    (snapshot.surface === "public-viewer" || snapshot.surface === "embed") &&
    Boolean(snapshot.url ?? snapshot.path)
  );
}

function targetUrl(snapshot: ProjectPublicSurfaceHealthSnapshot) {
  return snapshot.url ?? snapshot.path ?? "";
}

export function createProjectPublicSurfaceScreenshotCaptureJobs(report: ProjectPublicSurfaceHealthReport): ProjectPublicSurfaceScreenshotCaptureJob[] {
  return report.snapshots
    .filter(requiresScreenshot)
    .map((snapshot) => ({
      label: snapshot.label,
      projectId: snapshot.projectId,
      projectName: snapshot.projectName,
      sourceKey: snapshot.sourceKey,
      surface: snapshot.surface as ProjectPublicSurfaceScreenshotCaptureJob["surface"],
      targetUrl: targetUrl(snapshot),
    }))
    .sort((first, second) => first.projectName.localeCompare(second.projectName) || first.surface.localeCompare(second.surface) || first.label.localeCompare(second.label));
}

function diffAgainstBaseline(
  artifact: Omit<ProjectPublicSurfaceScreenshotCaptureArtifact, "diffScore" | "diffStatus" | "diffSummary" | "sourceKey">,
  baseline: ProjectPublicSurfaceScreenshotCaptureArtifact | null,
) {
  if (!baseline) {
    return {
      diffScore: 0,
      diffStatus: "new" as const,
      diffSummary: "No previous screenshot baseline exists for this surface.",
    };
  }

  if (baseline.contentHash === artifact.contentHash && baseline.width === artifact.width && baseline.height === artifact.height) {
    return {
      diffScore: 0,
      diffStatus: "stable" as const,
      diffSummary: "Screenshot matches the latest stored baseline hash and dimensions.",
    };
  }

  const dimensionDelta = Math.abs(baseline.width - artifact.width) + Math.abs(baseline.height - artifact.height);
  const byteDelta = Math.abs(baseline.byteSize - artifact.byteSize);
  const normalizedDimensionDelta = Math.min(1, dimensionDelta / Math.max(1, baseline.width + baseline.height));
  const normalizedByteDelta = Math.min(1, byteDelta / Math.max(1, baseline.byteSize));
  const diffScore = Math.round((normalizedDimensionDelta * 0.35 + normalizedByteDelta * 0.65) * 100);

  return {
    diffScore,
    diffStatus: "changed" as const,
    diffSummary: `Screenshot changed from baseline: ${dimensionDelta}px dimension delta and ${byteDelta} byte size delta.`,
  };
}

export async function runProjectPublicSurfaceScreenshotCapture(input: RunProjectPublicSurfaceScreenshotCaptureInput): Promise<ProjectPublicSurfaceScreenshotCaptureRun> {
  const jobs = createProjectPublicSurfaceScreenshotCaptureJobs(input.report);
  const baselineBySourceKey = new Map((input.baselineArtifacts ?? []).map((artifact) => [artifact.sourceKey, artifact]));
  const artifacts: ProjectPublicSurfaceScreenshotCaptureArtifact[] = [];

  for (const job of jobs) {
    const captured = await input.adapter.capture(job);
    const diff = diffAgainstBaseline(captured, baselineBySourceKey.get(job.sourceKey) ?? null);

    artifacts.push({
      ...captured,
      ...diff,
      sourceKey: job.sourceKey,
    });
  }

  return {
    artifacts,
    completedAt: input.completedAt ?? new Date().toISOString(),
    jobs,
    summary: {
      capturedCount: artifacts.length,
      changedCount: artifacts.filter((artifact) => artifact.diffStatus === "changed").length,
      jobCount: jobs.length,
      stableCount: artifacts.filter((artifact) => artifact.diffStatus === "stable").length,
    },
  };
}

export function applyProjectPublicSurfaceScreenshotCaptureArtifacts(
  report: ProjectPublicSurfaceHealthReport,
  artifacts: ProjectPublicSurfaceScreenshotCaptureArtifact[],
): ProjectPublicSurfaceHealthReport {
  const artifactBySourceKey = new Map(artifacts.map((artifact) => [artifact.sourceKey, artifact]));
  const snapshots = report.snapshots.map((snapshot) => {
    const artifact = artifactBySourceKey.get(snapshot.sourceKey);

    if (!artifact) {
      return snapshot;
    }

    return {
      ...snapshot,
      screenshotArtifactId: artifact.id,
      screenshotByteSize: artifact.byteSize,
      screenshotCapturedAt: artifact.capturedAt,
      screenshotDiffScore: artifact.diffScore,
      screenshotDiffSummary: artifact.diffSummary,
      screenshotHash: artifact.contentHash,
      screenshotHeight: artifact.height,
      screenshotPath: artifact.path,
      screenshotState: "captured" as const,
      screenshotWidth: artifact.width,
    };
  });

  return {
    ...report,
    snapshots,
    summary: {
      ...report.summary,
      screenshotCapturedCount: snapshots.filter((snapshot) => snapshot.screenshotState === "captured").length,
      screenshotDiffCount: snapshots.filter((snapshot) => typeof snapshot.screenshotDiffScore === "number").length,
      screenshotPendingCount: snapshots.filter((snapshot) => snapshot.screenshotState === "pending").length,
    },
  };
}
