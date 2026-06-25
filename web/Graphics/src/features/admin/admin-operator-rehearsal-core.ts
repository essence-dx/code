import type { AccessibilityPrivacyReleaseChecklist } from "@/features/admin/admin-accessibility-privacy-release";
import type { RetentionPrivacyReport } from "@/features/admin/admin-retention-privacy";
import type { AdminReleaseArtifactManifestReport } from "@/features/admin/admin-release-artifact-manifest";
import type {
  AdminReleaseChannelKind,
  AdminReleaseChannelsReport,
} from "@/features/admin/admin-release-channels";
import type { AdminReleaseIncidentTimelineReport } from "@/features/admin/admin-release-incident-timeline";
import type { AdminRollbackReadinessReport } from "@/features/admin/admin-rollback-readiness";
import type { AdminSelfHostedBackupReadinessReport } from "@/features/admin/admin-self-hosted-backup-readiness";
import type {
  ProductionDeploySmokeKind,
  ProductionDeploySmokeReport,
  ProductionDeploySmokeStatus,
} from "@/features/editor/production-deploy-smoke";

export type AdminOperatorRehearsalKind =
  | "desktop-handoff"
  | "import-export"
  | "public-share-privacy"
  | "restore"
  | "self-hosted-recovery";

export type AdminOperatorRehearsalStatus = "ready" | "review" | "blocked";

export type AdminOperatorRehearsalStep = {
  id: string;
  runId: string;
  status: AdminOperatorRehearsalStatus;
  label: string;
  ownerRole: string;
  evidence: string;
  expectedResult: string;
  command: string | null;
  sourceId: string | null;
};

export type AdminOperatorRehearsalRun = {
  id: string;
  kind: AdminOperatorRehearsalKind;
  label: string;
  objective: string;
  cadence: string;
  ownerRole: string;
  status: AdminOperatorRehearsalStatus;
  score: number;
  lastEvidenceAt: string;
  readyStepCount: number;
  reviewStepCount: number;
  blockedStepCount: number;
  commandCount: number;
  steps: AdminOperatorRehearsalStep[];
  commands: string[];
};

export type AdminOperatorRehearsalRow = {
  id: string;
  runId: string;
  runLabel: string;
  kind: AdminOperatorRehearsalKind;
  status: AdminOperatorRehearsalStatus;
  label: string;
  ownerRole: string;
  evidence: string;
  expectedResult: string;
  command: string | null;
};

export type AdminOperatorRehearsalReport = {
  generatedAt: string;
  status: AdminOperatorRehearsalStatus;
  score: number;
  runCount: number;
  readyRunCount: number;
  reviewRunCount: number;
  blockedRunCount: number;
  stepCount: number;
  readyStepCount: number;
  reviewStepCount: number;
  blockedStepCount: number;
  commandCount: number;
  runs: AdminOperatorRehearsalRun[];
  rows: AdminOperatorRehearsalRow[];
  commands: string[];
};

export type AdminOperatorRehearsalInput = {
  accessibilityPrivacyRelease: AccessibilityPrivacyReleaseChecklist;
  generatedAt?: string;
  productionDeploySmoke: ProductionDeploySmokeReport;
  releaseArtifactManifest: AdminReleaseArtifactManifestReport;
  releaseChannels: AdminReleaseChannelsReport;
  releaseIncidentTimeline: AdminReleaseIncidentTimelineReport;
  retentionPrivacy: RetentionPrivacyReport;
  rollbackReadiness: AdminRollbackReadinessReport;
  selfHostedBackupReadiness: AdminSelfHostedBackupReadinessReport;
};

export function createRun({
  cadence,
  generatedAt,
  id,
  kind,
  label,
  objective,
  ownerRole,
  steps,
}: {
  cadence: string;
  generatedAt: string;
  id: string;
  kind: AdminOperatorRehearsalKind;
  label: string;
  objective: string;
  ownerRole: string;
  steps: AdminOperatorRehearsalStep[];
}): AdminOperatorRehearsalRun {
  const readyStepCount = steps.filter((step) => step.status === "ready").length;
  const reviewStepCount = steps.filter((step) => step.status === "review").length;
  const blockedStepCount = steps.filter((step) => step.status === "blocked").length;
  const commands = uniqueStrings(
    steps.flatMap((step) => (step.command ? [step.command] : [])),
  );

  return {
    id,
    kind,
    label,
    objective,
    cadence,
    ownerRole,
    status:
      blockedStepCount > 0
        ? "blocked"
        : reviewStepCount > 0
          ? "review"
          : "ready",
    score: Math.max(0, 100 - blockedStepCount * 20 - reviewStepCount * 7),
    lastEvidenceAt: generatedAt,
    readyStepCount,
    reviewStepCount,
    blockedStepCount,
    commandCount: commands.length,
    steps,
    commands,
  };
}

export function createStep(input: AdminOperatorRehearsalStep) {
  return input;
}

export function findManifestArtifact(
  report: AdminReleaseArtifactManifestReport,
  kind: AdminReleaseArtifactManifestReport["artifacts"][number]["kind"],
) {
  return report.artifacts.find((artifact) => artifact.kind === kind);
}

export function findChannelPackage(
  report: AdminReleaseChannelsReport,
  channel: AdminReleaseChannelKind,
) {
  return report.packages.find((releasePackage) => releasePackage.channel === channel);
}

export function findSmokeRows(
  report: ProductionDeploySmokeReport,
  kind: ProductionDeploySmokeKind,
) {
  return report.rows.filter((row) => row.kind === kind);
}

export function getRowsStatus(
  statuses: Array<AdminOperatorRehearsalStatus | ProductionDeploySmokeStatus>,
): AdminOperatorRehearsalStatus {
  if (statuses.length === 0) {
    return "review";
  }

  if (statuses.includes("blocked")) {
    return "blocked";
  }

  return statuses.includes("review") ? "review" : "ready";
}

export function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}
