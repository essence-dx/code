import { createHash } from "node:crypto";
import type { ReleaseDeploymentChecklist } from "@/features/deployment/release-deployment-checklist";
import type { PostDeploySyntheticDashboardSummary } from "@/features/deployment/post-deploy-synthetic-dashboard";
import type { CadRuntimeAcceptancePacketReport } from "@/features/projects/cad-runtime-acceptance-packet";
import type { NativeReleasePromotionApprovalReport } from "@/features/projects/native-release-promotion-approval";
import type { ProjectArtifactRegistryReport } from "@/features/projects/project-artifact-registry";
import type { ProjectPublicSurfaceHealthReport } from "@/features/projects/public-surface-health";
import type { SceneQaSnapshotReport } from "@/features/projects/scene-qa-snapshots";
import type { SignedNativePackageReadinessPacketReport } from "@/features/projects/signed-native-package-readiness-packet";

export type LiveProductionParityEvidenceKind = "cad-runtime" | "deployment" | "desktop-signing" | "editor" | "exports" | "release-approval" | "sharing";
export type LiveProductionParityEvidenceStatus = "blocked" | "ready" | "review";

export interface LiveProductionParityEvidenceRow {
  evidence: string;
  evidenceHash: string;
  id: string;
  kind: LiveProductionParityEvidenceKind;
  nextAction: string;
  status: LiveProductionParityEvidenceStatus;
  title: string;
}

export interface LiveProductionParityEvidenceDashboardReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: LiveProductionParityEvidenceRow[];
  summary: {
    blockedCount: number;
    nextAction: string;
    parityHash: string;
    parityScore: number;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: LiveProductionParityEvidenceStatus;
  };
  workspaceId: string;
}

export type ProductionParityHistoryTrend = "improved" | "regressed" | "stable";

export interface ProductionParityHistorySnapshotRecord {
  blockedDelta: number;
  blockedCount: number;
  driftSummary: string;
  generatedAt: string;
  id: string;
  parityHash: string;
  parityScore: number;
  readyCount: number;
  reviewCount: number;
  scoreDelta: number;
  snapshotHash: string;
  status: LiveProductionParityEvidenceStatus;
  statusChanged: boolean;
  trend: ProductionParityHistoryTrend;
}

export interface ProductionParityHistorySnapshotReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  records: ProductionParityHistorySnapshotRecord[];
  summary: {
    blockedDelta: number;
    historyHash: string;
    latestScore: number;
    latestStatus: LiveProductionParityEvidenceStatus;
    nextAction: string;
    scoreDelta: number;
    snapshotCount: number;
    trend: ProductionParityHistoryTrend;
  };
  workspaceId: string;
}

export interface CreateProductionParityHistorySnapshotsInput {
  current: LiveProductionParityEvidenceDashboardReport;
  previous?: LiveProductionParityEvidenceDashboardReport[];
}

export interface CreateLiveProductionParityEvidenceDashboardInput {
  artifactRegistryReport: ProjectArtifactRegistryReport;
  cadRuntimeAcceptance: CadRuntimeAcceptancePacketReport;
  generatedAt?: string;
  nativeReleasePromotionApproval: NativeReleasePromotionApprovalReport;
  postDeploySummary: PostDeploySyntheticDashboardSummary | null;
  publicSurfaceHealthReport: ProjectPublicSurfaceHealthReport;
  releaseDeploymentChecklist: ReleaseDeploymentChecklist | null;
  sceneQaSnapshotReport: SceneQaSnapshotReport;
  signedPackageReadiness: SignedNativePackageReadinessPacketReport;
  workspaceId?: string;
}

const kindRank: Record<LiveProductionParityEvidenceKind, number> = {
  editor: 0,
  sharing: 1,
  exports: 2,
  "desktop-signing": 3,
  "cad-runtime": 4,
  deployment: 5,
  "release-approval": 6,
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

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
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

function trendFromDelta(scoreDelta: number, blockedDelta: number): ProductionParityHistoryTrend {
  if (blockedDelta > 0 || scoreDelta < 0) {
    return "regressed";
  }

  if (blockedDelta < 0 || scoreDelta > 0) {
    return "improved";
  }

  return "stable";
}

function statusFromReadyReviewBlocked(status: "blocked" | "ready" | "review"): LiveProductionParityEvidenceStatus {
  return status;
}

function nextActionFor(input: { kind: LiveProductionParityEvidenceKind; status: LiveProductionParityEvidenceStatus }) {
  if (input.status === "blocked") {
    return `Resolve live production parity blockers for ${input.kind}.`;
  }

  if (input.status === "review") {
    return `Review live production parity evidence for ${input.kind}.`;
  }

  return `Keep live production parity evidence current for ${input.kind}.`;
}

function createRow(input: {
  evidence: string;
  id: string;
  kind: LiveProductionParityEvidenceKind;
  status: LiveProductionParityEvidenceStatus;
  title: string;
}) {
  const nextAction = nextActionFor({
    kind: input.kind,
    status: input.status,
  });
  const evidenceHash = sha256({
    evidence: input.evidence,
    id: input.id,
    kind: input.kind,
    nextAction,
    status: input.status,
    title: input.title,
  });

  return {
    ...input,
    evidenceHash,
    nextAction,
  } satisfies LiveProductionParityEvidenceRow;
}

function editorStatus(report: SceneQaSnapshotReport): LiveProductionParityEvidenceStatus {
  if (report.summary.failedCount > 0) {
    return "blocked";
  }

  return report.summary.warningCount > 0 ? "review" : "ready";
}

function sharingStatus(report: ProjectPublicSurfaceHealthReport): LiveProductionParityEvidenceStatus {
  if (report.summary.failCount > 0) {
    return "blocked";
  }

  return report.summary.warnCount > 0 || report.summary.screenshotPendingCount > 0 ? "review" : "ready";
}

function exportsStatus(report: ProjectArtifactRegistryReport): LiveProductionParityEvidenceStatus {
  if (report.summary.blockedCount > 0) {
    return "blocked";
  }

  return report.summary.draftCount > 0 ? "review" : "ready";
}

function deploymentStatus(input: {
  postDeploySummary: PostDeploySyntheticDashboardSummary | null;
  releaseDeploymentChecklist: ReleaseDeploymentChecklist | null;
}): LiveProductionParityEvidenceStatus {
  if (input.releaseDeploymentChecklist?.status === "fail" || input.postDeploySummary?.status === "fail") {
    return "blocked";
  }

  if (!input.releaseDeploymentChecklist || !input.postDeploySummary || input.releaseDeploymentChecklist.status === "warning" || input.postDeploySummary.status === "missing") {
    return "review";
  }

  return "ready";
}

function createRows(input: CreateLiveProductionParityEvidenceDashboardInput & { workspaceId: string }) {
  return [
    createRow({
      evidence: `${input.sceneQaSnapshotReport.summary.passedCount}/${input.sceneQaSnapshotReport.summary.totalCount} editor QA surfaces passing; ${input.sceneQaSnapshotReport.summary.failedCount} failed, ${input.sceneQaSnapshotReport.summary.warningCount} warnings.`,
      id: `live-production-parity:${slug(input.workspaceId)}:editor`,
      kind: "editor",
      status: editorStatus(input.sceneQaSnapshotReport),
      title: "Editor parity evidence",
    }),
    createRow({
      evidence: `${input.publicSurfaceHealthReport.summary.passCount}/${input.publicSurfaceHealthReport.summary.totalCount} public surfaces passing; ${input.publicSurfaceHealthReport.summary.screenshotPendingCount} screenshots pending.`,
      id: `live-production-parity:${slug(input.workspaceId)}:sharing`,
      kind: "sharing",
      status: sharingStatus(input.publicSurfaceHealthReport),
      title: "Sharing and embed evidence",
    }),
    createRow({
      evidence: `${input.artifactRegistryReport.summary.availableCount}/${input.artifactRegistryReport.summary.totalCount} artifacts available; ${input.artifactRegistryReport.summary.signedBundleCount} signed bundle entries, ${input.artifactRegistryReport.summary.draftCount} drafts.`,
      id: `live-production-parity:${slug(input.workspaceId)}:exports`,
      kind: "exports",
      status: exportsStatus(input.artifactRegistryReport),
      title: "Export and package evidence",
    }),
    createRow({
      evidence: `${input.signedPackageReadiness.summary.readinessScore}/100 signed package readiness, ${input.signedPackageReadiness.summary.packetHash}`,
      id: `live-production-parity:${slug(input.workspaceId)}:desktop-signing`,
      kind: "desktop-signing",
      status: statusFromReadyReviewBlocked(input.signedPackageReadiness.summary.status),
      title: "Desktop signing evidence",
    }),
    createRow({
      evidence: `${input.cadRuntimeAcceptance.summary.acceptanceScore}/100 CAD runtime acceptance, ${input.cadRuntimeAcceptance.summary.acceptanceHash}`,
      id: `live-production-parity:${slug(input.workspaceId)}:cad-runtime`,
      kind: "cad-runtime",
      status: statusFromReadyReviewBlocked(input.cadRuntimeAcceptance.summary.status),
      title: "CAD runtime evidence",
    }),
    createRow({
      evidence: `Deployment checklist ${input.releaseDeploymentChecklist?.status ?? "missing"}; post-deploy synthetic ${input.postDeploySummary?.status ?? "missing"} at ${input.postDeploySummary?.baseUrl ?? "no live URL"}.`,
      id: `live-production-parity:${slug(input.workspaceId)}:deployment`,
      kind: "deployment",
      status: deploymentStatus({
        postDeploySummary: input.postDeploySummary,
        releaseDeploymentChecklist: input.releaseDeploymentChecklist,
      }),
      title: "Deployment verification evidence",
    }),
    createRow({
      evidence: `${input.nativeReleasePromotionApproval.summary.approvalScore}/100 release approval, ${input.nativeReleasePromotionApproval.summary.approvalHash}`,
      id: `live-production-parity:${slug(input.workspaceId)}:release-approval`,
      kind: "release-approval",
      status: statusFromReadyReviewBlocked(input.nativeReleasePromotionApproval.summary.status),
      title: "Release approval evidence",
    }),
  ].sort((first, second) => kindRank[first.kind] - kindRank[second.kind]);
}

function summarize(rows: LiveProductionParityEvidenceRow[]): LiveProductionParityEvidenceDashboardReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: LiveProductionParityEvidenceStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const parityScore = Math.max(0, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 10 - blockedCount * 16));

  return {
    blockedCount,
    nextAction:
      status === "blocked"
        ? "Resolve live production parity blockers before calling the Spline-class delivery gate complete."
        : status === "review"
          ? "Review live production parity evidence before calling the Spline-class delivery gate complete."
          : "Live production parity evidence dashboard is ready.",
    parityHash: sha256(rows.map((row) => row.evidenceHash)),
    parityScore,
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: LiveProductionParityEvidenceRow[]) {
  const header = ["evidence_id", "kind", "title", "status", "evidence_hash", "next_action"];
  const body = rows.map((row) => [row.id, row.kind, row.title, row.status, row.evidenceHash, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createHistoryCsv(records: ProductionParityHistorySnapshotRecord[]) {
  const header = ["snapshot_id", "generated_at", "status", "parity_score", "score_delta", "blocked_delta", "trend", "snapshot_hash"];
  const body = records.map((record) =>
    [record.id, record.generatedAt, record.status, record.parityScore, record.scoreDelta, record.blockedDelta, record.trend, record.snapshotHash].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: LiveProductionParityEvidenceRow[];
  summary: LiveProductionParityEvidenceDashboardReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createLiveProductionParityEvidenceDashboard(input: CreateLiveProductionParityEvidenceDashboardInput): LiveProductionParityEvidenceDashboardReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.signedPackageReadiness.workspaceId ?? input.cadRuntimeAcceptance.workspaceId ?? "workspace";
  const rows = createRows({
    ...input,
    workspaceId,
  });
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-live-production-parity-evidence-dashboard-${dateStamp(generatedAt)}`;

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

export function createProductionParityHistorySnapshots(input: CreateProductionParityHistorySnapshotsInput): ProductionParityHistorySnapshotReport {
  const snapshots = [...(input.previous ?? []), input.current].sort((first, second) => new Date(first.generatedAt).getTime() - new Date(second.generatedAt).getTime());
  const records = snapshots.map((snapshot, index) => {
    const previous = snapshots[index - 1];
    const scoreDelta = previous ? snapshot.summary.parityScore - previous.summary.parityScore : 0;
    const blockedDelta = previous ? snapshot.summary.blockedCount - previous.summary.blockedCount : 0;
    const trend = trendFromDelta(scoreDelta, blockedDelta);
    const statusChanged = previous ? previous.summary.status !== snapshot.summary.status : false;
    const driftSummary =
      index === 0
        ? `Initial production parity snapshot at ${snapshot.summary.parityScore}/100 with ${snapshot.summary.blockedCount} blockers.`
        : `${trend === "improved" ? "Parity improved" : trend === "regressed" ? "Parity regressed" : "Parity stayed stable"} by ${Math.abs(scoreDelta)} points with ${blockedDelta} blocker delta.`;
    const id = `production-parity-history:${slug(snapshot.workspaceId)}:${dateStamp(snapshot.generatedAt)}:${index + 1}`;
    const recordBody = {
      blockedDelta,
      blockedCount: snapshot.summary.blockedCount,
      generatedAt: snapshot.generatedAt,
      id,
      parityHash: snapshot.summary.parityHash,
      parityScore: snapshot.summary.parityScore,
      readyCount: snapshot.summary.readyCount,
      reviewCount: snapshot.summary.reviewCount,
      scoreDelta,
      status: snapshot.summary.status,
      statusChanged,
      trend,
    };

    return {
      ...recordBody,
      driftSummary,
      snapshotHash: sha256(recordBody),
    } satisfies ProductionParityHistorySnapshotRecord;
  });
  const firstRecord = records[0];
  const latest = records.at(-1);
  const scoreDelta = latest && firstRecord ? latest.parityScore - firstRecord.parityScore : 0;
  const blockedDelta = latest && firstRecord ? latest.blockedCount - firstRecord.blockedCount : 0;
  const trend = trendFromDelta(scoreDelta, blockedDelta);
  const latestStatus = latest?.status ?? input.current.summary.status;
  const latestScore = latest?.parityScore ?? input.current.summary.parityScore;
  const summary = {
    blockedDelta,
    historyHash: sha256(records.map((record) => record.snapshotHash)),
    latestScore,
    latestStatus,
    nextAction:
      trend === "regressed"
        ? "Investigate production parity regression before approving the next release."
        : latestStatus === "ready"
          ? "Keep production parity snapshots current on every deployment."
          : "Review production parity drift before calling the gate complete.",
    scoreDelta,
    snapshotCount: records.length,
    trend,
  };
  const generatedAt = input.current.generatedAt;
  const workspaceId = input.current.workspaceId;
  const csvContent = createHistoryCsv(records);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      records,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-production-parity-history-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    records,
    summary,
    workspaceId,
  };
}
