import type { PostDeploySyntheticDashboardSummary } from "@/features/deployment/post-deploy-synthetic-dashboard";
import type { ProjectAppPackageCertificateReport } from "@/features/projects/app-package-certificates";
import type { ProjectCadConversionQueueReport } from "@/features/projects/cad-conversion-worker";
import type { WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";
import type { WorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";

export type ReleaseDrillScenario = "cad-worker-outage" | "certificate-expiry" | "deploy-smoke-failure" | "rollback";
export type ReleaseDrillStatus = "blocked" | "missing" | "ready" | "watch";

export interface ReleaseDrillSimulationRow {
  blastRadius: string;
  evidence: string;
  exercise: string[];
  id: ReleaseDrillScenario;
  label: string;
  nextAction: string;
  ownerHint: string;
  recoveryTargetMinutes: number;
  status: ReleaseDrillStatus;
  successCriteria: string[];
}

export interface ReleaseDrillSimulationReport {
  generatedAt: string;
  rows: ReleaseDrillSimulationRow[];
  summary: {
    blockedCount: number;
    missingCount: number;
    readyCount: number;
    score: number;
    totalCount: number;
    watchCount: number;
    worstStatus: ReleaseDrillStatus;
  };
}

export interface CreateReleaseDrillSimulationReportInput {
  cadConversionQueueReport: ProjectCadConversionQueueReport;
  certificateReport: ProjectAppPackageCertificateReport;
  generatedAt?: string;
  postDeploySummary: PostDeploySyntheticDashboardSummary | null;
  releaseCalendar: WorkspaceReleaseCalendarReport;
  releaseRunbook: WorkspaceReleaseRunbookReport;
}

const statusRank: Record<ReleaseDrillStatus, number> = {
  blocked: 0,
  missing: 1,
  watch: 2,
  ready: 3,
};

const statusWeight: Record<ReleaseDrillStatus, number> = {
  blocked: 0,
  missing: 0.25,
  ready: 1,
  watch: 0.65,
};

function summarize(rows: ReleaseDrillSimulationRow[]): ReleaseDrillSimulationReport["summary"] {
  const weightedScore = rows.reduce((score, row) => score + statusWeight[row.status], 0);

  return {
    blockedCount: rows.filter((row) => row.status === "blocked").length,
    missingCount: rows.filter((row) => row.status === "missing").length,
    readyCount: rows.filter((row) => row.status === "ready").length,
    score: rows.length > 0 ? Math.round((weightedScore / rows.length) * 100) : 0,
    totalCount: rows.length,
    watchCount: rows.filter((row) => row.status === "watch").length,
    worstStatus: [...rows].sort((first, second) => statusRank[first.status] - statusRank[second.status])[0]?.status ?? "missing",
  };
}

function rollbackRow(input: {
  releaseCalendar: WorkspaceReleaseCalendarReport;
  releaseRunbook: WorkspaceReleaseRunbookReport;
}): ReleaseDrillSimulationRow {
  const hasPlan = input.releaseCalendar.summary.totalCount > 0 || input.releaseRunbook.summary.totalCount > 0;
  const blocked = input.releaseCalendar.summary.blockedCount + input.releaseRunbook.summary.blockedCount;
  const open = input.releaseCalendar.summary.dueCount + input.releaseCalendar.summary.scheduledCount + input.releaseRunbook.summary.inProgressCount + input.releaseRunbook.summary.scheduledCount;
  const status: ReleaseDrillStatus = !hasPlan ? "missing" : blocked > 0 ? "blocked" : open > 0 ? "watch" : "ready";

  return {
    blastRadius: "Production deploys, public viewer links, embeds, API helpers, and desktop updater channels.",
    evidence:
      hasPlan
        ? `${input.releaseRunbook.summary.completeCount}/${input.releaseRunbook.summary.totalCount} runbook records complete, ${input.releaseCalendar.summary.blockedCount} blocked milestones.`
        : "No release calendar or runbook evidence is available.",
    exercise: [
      "Pick the latest deploy candidate and identify the previous stable deploy evidence.",
      "Confirm who can pause promotion and who owns public surface verification.",
      "Walk through rollback communication, smoke rerun, and release-note amendment steps.",
    ],
    id: "rollback",
    label: "Rollback rehearsal",
    nextAction:
      status === "ready"
        ? "Schedule a short rollback tabletop before the next production promotion."
        : status === "missing"
          ? "Create release milestones and runbook records before rehearsing rollback."
          : "Clear blocked or open release runbook items, then rerun the rollback drill.",
    ownerHint: "Release owner",
    recoveryTargetMinutes: 30,
    status,
    successCriteria: ["Previous deploy is identified.", "Smoke rerun command is known.", "Runbook owner can declare promotion paused."],
  };
}

function certificateExpiryRow(report: ProjectAppPackageCertificateReport): ReleaseDrillSimulationRow {
  const blocked = report.summary.blockedCount;
  const expiring = report.summary.expiringCount;
  const status: ReleaseDrillStatus = report.summary.totalRequiredCount === 0 ? "missing" : blocked > 0 ? "blocked" : expiring > 0 ? "watch" : "ready";

  return {
    blastRadius: "Signed desktop bundles, Android packages, visionOS previews, and install/update trust prompts.",
    evidence:
      report.summary.totalRequiredCount > 0
        ? `${report.summary.validCount} valid, ${report.summary.expiringCount} expiring, ${report.summary.blockedCount} blocked certificate rows.`
        : "No certificate requirements were found for signed package artifacts.",
    exercise: [
      "Select the soonest expiring or missing package certificate.",
      "Simulate certificate replacement and fingerprint validation before promotion.",
      "Confirm the release evidence bundle shows the replacement certificate row.",
    ],
    id: "certificate-expiry",
    label: "Certificate expiry drill",
    nextAction:
      status === "ready"
        ? "Keep certificate renewal evidence attached to the release packet."
        : status === "missing"
          ? "Attach signed package artifacts or certificate requirements before running this drill."
          : "Replace blocked or expiring certificates and regenerate package evidence.",
    ownerHint: "Signing owner",
    recoveryTargetMinutes: 45,
    status,
    successCriteria: ["Replacement fingerprint is valid.", "Package platform matches.", "Release evidence bundle includes the new certificate."],
  };
}

function deploySmokeFailureRow(summary: PostDeploySyntheticDashboardSummary | null): ReleaseDrillSimulationRow {
  const status: ReleaseDrillStatus = !summary || summary.status === "missing" ? "missing" : summary.status === "fail" ? "blocked" : summary.currentPassStreak < 2 ? "watch" : "ready";

  return {
    blastRadius: "Public viewer, embed, public API helpers, and compliance download surfaces.",
    evidence: summary
      ? `${summary.statusLabel}, ${summary.completionPercent}% completion, ${summary.issueRows.length} issue rows, ${summary.currentPassStreak} pass streak.`
      : "No post-deploy synthetic smoke summary is available.",
    exercise: [
      "Force one public route to fail in the drill notes and trace the owning surface.",
      "Run the smoke command against the deployed URL.",
      "Record the recovery evidence and verify the pass streak resets after recovery.",
    ],
    id: "deploy-smoke-failure",
    label: "Deploy smoke failure drill",
    nextAction:
      status === "ready"
        ? "Keep collecting smoke evidence after every substantial release."
        : status === "missing"
          ? "Run the post-deploy smoke command and persist the report."
          : "Resolve failed public checks and rerun smoke until the report is passing.",
    ownerHint: "Web release owner",
    recoveryTargetMinutes: 20,
    status,
    successCriteria: ["Failed route has an owner.", "Smoke report is persisted.", "Latest smoke run passes after recovery."],
  };
}

function cadWorkerOutageRow(report: ProjectCadConversionQueueReport): ReleaseDrillSimulationRow {
  const active = report.summary.queuedCount + report.summary.runningCount;
  const blocked = report.summary.failedCount + report.summary.retryableCount;
  const status: ReleaseDrillStatus = report.summary.totalCount === 0 ? "missing" : blocked > 0 ? "blocked" : active > 0 ? "watch" : "ready";

  return {
    blastRadius: "Native CAD imports, STL/OBJ/GLB conversion evidence, and CAD-backed public asset readiness.",
    evidence: `${report.summary.succeededCount} succeeded, ${active} active, ${report.summary.retryableCount} retryable, ${report.summary.failedCount} failed CAD jobs.`,
    exercise: [
      "Mark one adapter unavailable and identify queued jobs that need rerouting.",
      "Confirm retryable failures keep worker logs and next attempt evidence.",
      "Verify CAD output provenance updates after the recovery job succeeds.",
    ],
    id: "cad-worker-outage",
    label: "CAD worker outage drill",
    nextAction:
      status === "ready"
        ? "Keep worker output paths attached to release evidence."
        : status === "missing"
          ? "Queue a representative native CAD conversion before running outage drills."
          : "Retry or reroute failed CAD jobs, then refresh CAD output provenance.",
    ownerHint: "CAD pipeline owner",
    recoveryTargetMinutes: 60,
    status,
    successCriteria: ["Affected jobs are identified.", "Retry or reroute path is documented.", "Recovered job has output path and diagnostics."],
  };
}

export function createReleaseDrillSimulationReport(input: CreateReleaseDrillSimulationReportInput): ReleaseDrillSimulationReport {
  const rows = [
    rollbackRow({
      releaseCalendar: input.releaseCalendar,
      releaseRunbook: input.releaseRunbook,
    }),
    certificateExpiryRow(input.certificateReport),
    deploySmokeFailureRow(input.postDeploySummary),
    cadWorkerOutageRow(input.cadConversionQueueReport),
  ].sort((first, second) => statusRank[first.status] - statusRank[second.status] || first.recoveryTargetMinutes - second.recoveryTargetMinutes || first.label.localeCompare(second.label));

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    rows,
    summary: summarize(rows),
  };
}
