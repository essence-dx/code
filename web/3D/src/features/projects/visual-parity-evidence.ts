import { createHash } from "node:crypto";
import type { ProjectPublicSurfaceHealthReport, ProjectPublicSurfaceHealthSnapshot } from "@/features/projects/public-surface-health";
import type { SceneQaSnapshotReport } from "@/features/projects/scene-qa-snapshots";

export type VisualParityEvidenceSurface = "app-package" | "editor" | "embed" | "public-viewer";
export type VisualParityEvidenceStatus = "blocked" | "ready" | "review";

export interface VisualParityEvidenceArtifact {
  byteSize: number;
  capturedAt: string;
  diffScore: number;
  diffSummary: string;
  height: number;
  path: string;
  screenshotHash: string;
  surface: VisualParityEvidenceSurface;
  targetId: string;
  targetName: string;
  width: number;
}

export interface VisualParityEvidenceRow {
  byteSize: number | null;
  capturedAt: string | null;
  diffScore: number | null;
  diffSummary: string | null;
  evidenceHash: string;
  height: number | null;
  nextAction: string;
  screenshotHash: string | null;
  screenshotPath: string | null;
  status: VisualParityEvidenceStatus;
  surface: VisualParityEvidenceSurface;
  targetId: string;
  targetName: string;
  width: number | null;
}

export interface VisualParityEvidenceReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: VisualParityEvidenceRow[];
  summary: {
    blockedCount: number;
    capturedCount: number;
    diffCount: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: VisualParityEvidenceStatus;
    visualParityHash: string;
    visualParityScore: number;
  };
  workspaceId: string;
}

export interface CreateVisualParityEvidenceReportInput {
  generatedAt?: string;
  publicSurfaceHealthReport: ProjectPublicSurfaceHealthReport;
  sceneQaSnapshotReport: SceneQaSnapshotReport;
  supplementalArtifacts?: VisualParityEvidenceArtifact[];
  workspaceId?: string;
}

const surfaceRank: Record<VisualParityEvidenceSurface, number> = {
  editor: 0,
  "public-viewer": 1,
  embed: 2,
  "app-package": 3,
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex")}`;
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function statusFor(input: {
  diffScore: number | null;
  hasBlockingSignal: boolean;
  hasReviewSignal: boolean;
  screenshotHash: string | null;
}): VisualParityEvidenceStatus {
  if (input.hasBlockingSignal) {
    return "blocked";
  }

  if (!input.screenshotHash || input.hasReviewSignal || (input.diffScore ?? 0) > 0) {
    return "review";
  }

  return "ready";
}

function nextActionFor(row: Pick<VisualParityEvidenceRow, "screenshotHash" | "status" | "surface">) {
  if (!row.screenshotHash) {
    return `Capture and attach ${row.surface} screenshot evidence before the next parity gate.`;
  }

  if (row.status === "blocked") {
    return `Resolve screenshot-backed visual parity blockers for ${row.surface}.`;
  }

  if (row.status === "review") {
    return `Review ${row.surface} screenshot diff before release approval.`;
  }

  return `Keep ${row.surface} screenshot evidence current on each production parity run.`;
}

function artifactRow(input: {
  artifact: VisualParityEvidenceArtifact;
  hasBlockingSignal?: boolean;
  hasReviewSignal?: boolean;
}): VisualParityEvidenceRow {
  const status = statusFor({
    diffScore: input.artifact.diffScore,
    hasBlockingSignal: input.hasBlockingSignal ?? false,
    hasReviewSignal: input.hasReviewSignal ?? false,
    screenshotHash: input.artifact.screenshotHash,
  });
  const base = {
    byteSize: input.artifact.byteSize,
    capturedAt: input.artifact.capturedAt,
    diffScore: input.artifact.diffScore,
    diffSummary: input.artifact.diffSummary,
    height: input.artifact.height,
    screenshotHash: input.artifact.screenshotHash,
    screenshotPath: input.artifact.path,
    status,
    surface: input.artifact.surface,
    targetId: input.artifact.targetId,
    targetName: input.artifact.targetName,
    width: input.artifact.width,
  };
  const nextAction = nextActionFor(base);

  return {
    ...base,
    evidenceHash: sha256({
      ...base,
      nextAction,
    }),
    nextAction,
  };
}

function publicSurfaceRow(snapshot: ProjectPublicSurfaceHealthSnapshot): VisualParityEvidenceRow {
  const surface = snapshot.surface as Extract<VisualParityEvidenceSurface, "app-package" | "embed" | "public-viewer">;
  const status = statusFor({
    diffScore: snapshot.screenshotDiffScore,
    hasBlockingSignal: snapshot.status === "fail" || snapshot.screenshotState === "unavailable",
    hasReviewSignal: snapshot.status === "warn" || snapshot.screenshotState !== "captured",
    screenshotHash: snapshot.screenshotHash,
  });
  const base = {
    byteSize: snapshot.screenshotByteSize,
    capturedAt: snapshot.screenshotCapturedAt,
    diffScore: snapshot.screenshotDiffScore,
    diffSummary: snapshot.screenshotDiffSummary,
    height: snapshot.screenshotHeight,
    screenshotHash: snapshot.screenshotHash,
    screenshotPath: snapshot.screenshotPath,
    status,
    surface,
    targetId: snapshot.sourceKey,
    targetName: `${snapshot.projectName} ${snapshot.label}`,
    width: snapshot.screenshotWidth,
  };
  const nextAction = nextActionFor(base);

  return {
    ...base,
    evidenceHash: sha256({
      ...base,
      nextAction,
    }),
    nextAction,
  };
}

function missingRow(input: {
  hasBlockingSignal?: boolean;
  hasReviewSignal?: boolean;
  surface: VisualParityEvidenceSurface;
  targetName: string;
}): VisualParityEvidenceRow {
  const status = statusFor({
    diffScore: null,
    hasBlockingSignal: input.hasBlockingSignal ?? false,
    hasReviewSignal: input.hasReviewSignal ?? true,
    screenshotHash: null,
  });
  const base = {
    byteSize: null,
    capturedAt: null,
    diffScore: null,
    diffSummary: null,
    height: null,
    screenshotHash: null,
    screenshotPath: null,
    status,
    surface: input.surface,
    targetId: `${input.surface}:missing`,
    targetName: input.targetName,
    width: null,
  };
  const nextAction = nextActionFor(base);

  return {
    ...base,
    evidenceHash: sha256({
      ...base,
      nextAction,
    }),
    nextAction,
  };
}

function choosePublicSnapshot(snapshots: ProjectPublicSurfaceHealthSnapshot[], surface: "app-package" | "embed" | "public-viewer") {
  return snapshots
    .filter((snapshot) => snapshot.surface === surface)
    .sort((first, second) => {
      const firstCaptured = first.screenshotState === "captured" ? 0 : 1;
      const secondCaptured = second.screenshotState === "captured" ? 0 : 1;

      return firstCaptured - secondCaptured || first.projectName.localeCompare(second.projectName) || first.label.localeCompare(second.label);
    })[0];
}

function createRows(input: CreateVisualParityEvidenceReportInput): VisualParityEvidenceRow[] {
  const artifacts = input.supplementalArtifacts ?? [];
  const artifactBySurface = new Map(artifacts.map((artifact) => [artifact.surface, artifact]));
  const editorArtifact = artifactBySurface.get("editor");
  const appPackageArtifact = artifactBySurface.get("app-package");
  const rows: VisualParityEvidenceRow[] = [
    editorArtifact
      ? artifactRow({
          artifact: editorArtifact,
          hasBlockingSignal: input.sceneQaSnapshotReport.summary.failedCount > 0,
          hasReviewSignal: input.sceneQaSnapshotReport.summary.warningCount > 0,
        })
      : missingRow({
          hasBlockingSignal: input.sceneQaSnapshotReport.summary.failedCount > 0,
          hasReviewSignal: input.sceneQaSnapshotReport.summary.warningCount > 0,
          surface: "editor",
          targetName: "Editor workspace",
        }),
  ];

  for (const surface of ["public-viewer", "embed"] as const) {
    const snapshot = choosePublicSnapshot(input.publicSurfaceHealthReport.snapshots, surface);

    rows.push(
      snapshot
        ? publicSurfaceRow(snapshot)
        : missingRow({
            surface,
            targetName: `${surface} surface`,
          }),
    );
  }

  rows.push(
    appPackageArtifact
      ? artifactRow({ artifact: appPackageArtifact })
      : publicSurfaceRow(
          choosePublicSnapshot(input.publicSurfaceHealthReport.snapshots, "app-package") ??
            ({
              label: "Package download",
              projectName: "App package",
              screenshotByteSize: null,
              screenshotCapturedAt: null,
              screenshotDiffScore: null,
              screenshotDiffSummary: null,
              screenshotHash: null,
              screenshotHeight: null,
              screenshotPath: null,
              screenshotState: "pending",
              screenshotWidth: null,
              sourceKey: "app-package:missing",
              status: "warn",
              surface: "app-package",
            } as ProjectPublicSurfaceHealthSnapshot),
        ),
  );

  return rows.sort((first, second) => surfaceRank[first.surface] - surfaceRank[second.surface]);
}

function summarize(rows: VisualParityEvidenceRow[]): VisualParityEvidenceReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const capturedCount = rows.filter((row) => row.screenshotHash).length;
  const diffCount = rows.filter((row) => typeof row.diffScore === "number").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: VisualParityEvidenceStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const visualParityScore = Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + capturedCount * 5 - reviewCount * 5 - blockedCount * 20)));

  return {
    blockedCount,
    capturedCount,
    diffCount,
    nextAction:
      status === "blocked"
        ? "Resolve screenshot-backed visual parity blockers before release approval."
        : status === "review"
          ? "Review screenshot diffs and missing visual evidence before calling parity complete."
          : "Screenshot-backed visual parity evidence is ready.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
    visualParityHash: sha256(rows.map((row) => row.evidenceHash)),
    visualParityScore,
  };
}

function createCsv(rows: VisualParityEvidenceRow[]) {
  const header = ["surface", "target", "status", "screenshot_hash", "diff_score", "screenshot_path", "next_action"];
  const body = rows.map((row) => [row.surface, row.targetName, row.status, row.screenshotHash, row.diffScore, row.screenshotPath, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createVisualParityEvidenceReport(input: CreateVisualParityEvidenceReportInput): VisualParityEvidenceReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows(input);
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-visual-parity-evidence-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    rows,
    summary,
    workspaceId,
  };
}
