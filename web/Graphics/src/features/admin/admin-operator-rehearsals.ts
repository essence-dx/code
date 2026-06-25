import {
  uniqueStrings,
  type AdminOperatorRehearsalInput,
  type AdminOperatorRehearsalReport,
} from "@/features/admin/admin-operator-rehearsal-core";
import {
  getDesktopHandoffRun,
  getSelfHostedRecoveryRun,
} from "@/features/admin/admin-operator-rehearsal-package-runs";
import {
  getImportExportRun,
  getPublicSharePrivacyRun,
  getRestoreRun,
} from "@/features/admin/admin-operator-rehearsal-release-runs";

export type {
  AdminOperatorRehearsalInput,
  AdminOperatorRehearsalKind,
  AdminOperatorRehearsalReport,
  AdminOperatorRehearsalRow,
  AdminOperatorRehearsalRun,
  AdminOperatorRehearsalStatus,
  AdminOperatorRehearsalStep,
} from "@/features/admin/admin-operator-rehearsal-core";

export function getAdminOperatorRehearsalReport({
  accessibilityPrivacyRelease,
  generatedAt = new Date().toISOString(),
  productionDeploySmoke,
  releaseArtifactManifest,
  releaseChannels,
  releaseIncidentTimeline,
  retentionPrivacy,
  rollbackReadiness,
  selfHostedBackupReadiness,
}: AdminOperatorRehearsalInput): AdminOperatorRehearsalReport {
  const runs = [
    getRestoreRun({
      generatedAt,
      productionDeploySmoke,
      releaseArtifactManifest,
      rollbackReadiness,
    }),
    getImportExportRun({
      generatedAt,
      productionDeploySmoke,
      releaseArtifactManifest,
    }),
    getPublicSharePrivacyRun({
      accessibilityPrivacyRelease,
      generatedAt,
      productionDeploySmoke,
      releaseIncidentTimeline,
      retentionPrivacy,
      rollbackReadiness,
    }),
    getDesktopHandoffRun({
      generatedAt,
      releaseArtifactManifest,
      releaseChannels,
    }),
    getSelfHostedRecoveryRun({
      generatedAt,
      productionDeploySmoke,
      releaseArtifactManifest,
      releaseChannels,
      rollbackReadiness,
      selfHostedBackupReadiness,
    }),
  ];
  const rows = runs.flatMap((run) =>
    run.steps.map((step) => ({
      id: step.id,
      runId: run.id,
      runLabel: run.label,
      kind: run.kind,
      status: step.status,
      label: step.label,
      ownerRole: step.ownerRole,
      evidence: step.evidence,
      expectedResult: step.expectedResult,
      command: step.command,
    })),
  );
  const readyRunCount = runs.filter((run) => run.status === "ready").length;
  const reviewRunCount = runs.filter((run) => run.status === "review").length;
  const blockedRunCount = runs.filter((run) => run.status === "blocked").length;
  const readyStepCount = rows.filter((row) => row.status === "ready").length;
  const reviewStepCount = rows.filter((row) => row.status === "review").length;
  const blockedStepCount = rows.filter((row) => row.status === "blocked").length;
  const commands = uniqueStrings(runs.flatMap((run) => run.commands));

  return {
    generatedAt,
    status:
      blockedRunCount > 0 ? "blocked" : reviewRunCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedRunCount * 18 - reviewRunCount * 6),
    runCount: runs.length,
    readyRunCount,
    reviewRunCount,
    blockedRunCount,
    stepCount: rows.length,
    readyStepCount,
    reviewStepCount,
    blockedStepCount,
    commandCount: commands.length,
    runs,
    rows,
    commands,
  };
}
