import {
  createRun,
  createStep,
  findChannelPackage,
  findManifestArtifact,
  getRowsStatus,
  type AdminOperatorRehearsalRun,
} from "@/features/admin/admin-operator-rehearsal-core";
import type { AdminReleaseArtifactManifestReport } from "@/features/admin/admin-release-artifact-manifest";
import type { AdminReleaseChannelsReport } from "@/features/admin/admin-release-channels";
import type { AdminRollbackReadinessReport } from "@/features/admin/admin-rollback-readiness";
import type { AdminSelfHostedBackupReadinessReport } from "@/features/admin/admin-self-hosted-backup-readiness";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";

export function getDesktopHandoffRun({
  generatedAt,
  releaseArtifactManifest,
  releaseChannels,
}: {
  generatedAt: string;
  releaseArtifactManifest: AdminReleaseArtifactManifestReport;
  releaseChannels: AdminReleaseChannelsReport;
}): AdminOperatorRehearsalRun {
  const runId = "desktop-package-handoff-drill";
  const desktopPackage = findChannelPackage(releaseChannels, "desktop");
  const desktopArtifact = findManifestArtifact(releaseArtifactManifest, "desktop");
  const staticExport = desktopPackage?.rows.find(
    (row) => row.id === "desktop-static-export",
  );
  const bundleArtifacts = desktopPackage?.rows.find(
    (row) => row.id === "desktop-bundle-artifacts",
  );
  const desktopApproval = desktopPackage?.rows.find(
    (row) => row.id === "desktop-approval",
  );
  const desktopCommand = desktopPackage?.artifacts.find(
    (artifact) => artifact.kind === "command" && artifact.label.includes("bundle"),
  );

  return createRun({
    cadence: "Before desktop installer signing or handoff",
    generatedAt,
    id: runId,
    kind: "desktop-handoff",
    label: "Desktop package handoff drill",
    objective:
      "Confirm Tauri metadata, static export handoff, installer artifacts, and approval anchors are ready for desktop release operators.",
    ownerRole: "Desktop release operator",
    steps: [
      createStep({
        command: desktopCommand?.value ?? "bun run tauri:build",
        evidence:
          desktopPackage?.rows
            .map((row) => `${row.label}: ${row.detail}`)
            .join(" ") ?? "Desktop release channel package is missing.",
        expectedResult:
          "Desktop package metadata and operator commands are visible in the release channel package.",
        id: "desktop-handoff-channel-package",
        label: "Review desktop release package",
        ownerRole: "Desktop release operator",
        runId,
        sourceId: desktopPackage?.channel ?? null,
        status: desktopPackage?.status ?? "blocked",
      }),
      createStep({
        command: "Export signed release artifact manifest JSON.",
        evidence:
          desktopArtifact?.detail ??
          "Desktop artifact is missing from signed release manifest.",
        expectedResult:
          "Desktop manifest artifact has checksum and signing evidence.",
        id: "desktop-handoff-manifest-artifact",
        label: "Verify desktop manifest artifact",
        ownerRole: "Release manager",
        runId,
        sourceId: desktopArtifact?.id ?? null,
        status: desktopArtifact?.status ?? "blocked",
      }),
      createStep({
        command: "bun run build",
        evidence:
          staticExport?.detail ?? "Static export readiness row is unavailable.",
        expectedResult:
          "Next.js static export output is configured for the Tauri frontendDist handoff.",
        id: "desktop-handoff-static-export",
        label: "Confirm static export handoff",
        ownerRole: "Desktop release operator",
        runId,
        sourceId: staticExport?.id ?? null,
        status: staticExport?.status ?? "review",
      }),
      createStep({
        command: desktopCommand?.value ?? "bun run tauri:build",
        evidence:
          bundleArtifacts?.detail ??
          "Installer bundle artifact row is unavailable.",
        expectedResult:
          "Bundle targets and icons are ready for platform installer creation.",
        id: "desktop-handoff-bundle-artifacts",
        label: "Check installer bundle artifacts",
        ownerRole: "Desktop release operator",
        runId,
        sourceId: bundleArtifacts?.id ?? null,
        status: bundleArtifacts?.status ?? "review",
      }),
      createStep({
        command:
          "Save Admin > Release approval snapshot after desktop bundle verification.",
        evidence:
          desktopApproval?.detail ??
          "Desktop approval anchor is missing from release channel rows.",
        expectedResult:
          "The desktop package has a release approval snapshot tied to commit and deployment evidence.",
        id: "desktop-handoff-approval-anchor",
        label: "Verify desktop approval anchor",
        ownerRole: "Release manager",
        runId,
        sourceId: desktopApproval?.id ?? null,
        status: desktopApproval?.status ?? "review",
      }),
    ],
  });
}

export function getSelfHostedRecoveryRun({
  generatedAt,
  productionDeploySmoke,
  releaseArtifactManifest,
  releaseChannels,
  rollbackReadiness,
  selfHostedBackupReadiness,
}: {
  generatedAt: string;
  productionDeploySmoke: ProductionDeploySmokeReport;
  releaseArtifactManifest: AdminReleaseArtifactManifestReport;
  releaseChannels: AdminReleaseChannelsReport;
  rollbackReadiness: AdminRollbackReadinessReport;
  selfHostedBackupReadiness: AdminSelfHostedBackupReadinessReport;
}): AdminOperatorRehearsalRun {
  const runId = "self-hosted-recovery-drill";
  const selfHostedPackage = findChannelPackage(releaseChannels, "self-hosted");
  const selfHostedArtifact = findManifestArtifact(
    releaseArtifactManifest,
    "self-hosted",
  );
  const backupRow = selfHostedBackupReadiness.rows.find(
    (row) => row.kind === "schedule",
  );
  const smokeRows = productionDeploySmoke.rows.filter((row) => row.required);

  return createRun({
    cadence: "Monthly and before self-hosted package publication",
    generatedAt,
    id: runId,
    kind: "self-hosted-recovery",
    label: "Self-hosted recovery drill",
    objective:
      "Confirm backup schedule, restore commands, package metadata, route smoke, and rollback evidence are ready for self-hosted operators.",
    ownerRole: "Self-hosted operator",
    steps: [
      createStep({
        command:
          selfHostedBackupReadiness.commands[0] ??
          "Export Admin > Governance self-hosted backup readiness.",
        evidence:
          backupRow?.detail ??
          "Self-hosted backup schedule evidence is unavailable.",
        expectedResult:
          "Backup cadence, destination, and runnable restore command are documented.",
        id: "self-hosted-recovery-backup-command",
        label: "Run backup and restore command review",
        ownerRole: "Self-hosted operator",
        runId,
        sourceId: backupRow?.id ?? null,
        status: backupRow?.status ?? selfHostedBackupReadiness.status,
      }),
      createStep({
        command:
          selfHostedPackage?.artifacts.find(
            (artifact) => artifact.kind === "command",
          )?.value ?? selfHostedBackupReadiness.commands[0] ?? null,
        evidence:
          selfHostedPackage?.rows
            .map((row) => `${row.label}: ${row.detail}`)
            .join(" ") ?? "Self-hosted release package is missing.",
        expectedResult:
          "Self-hosted package includes backup, smoke, rollback, approval, and deployment evidence.",
        id: "self-hosted-recovery-channel-package",
        label: "Review self-hosted package",
        ownerRole: "Self-hosted operator",
        runId,
        sourceId: selfHostedPackage?.channel ?? null,
        status: selfHostedPackage?.status ?? "blocked",
      }),
      createStep({
        command: "Export signed release artifact manifest JSON.",
        evidence:
          selfHostedArtifact?.detail ??
          "Self-hosted artifact is missing from signed release manifest.",
        expectedResult:
          "Self-hosted manifest artifact is archived with checksum and package metadata.",
        id: "self-hosted-recovery-manifest-artifact",
        label: "Verify self-hosted manifest artifact",
        ownerRole: "Release manager",
        runId,
        sourceId: selfHostedArtifact?.id ?? null,
        status: selfHostedArtifact?.status ?? "blocked",
      }),
      createStep({
        command: productionDeploySmoke.commands[2] ?? null,
        evidence: `${productionDeploySmoke.requiredRouteCount} required routes are registered for recovery smoke coverage.`,
        expectedResult:
          "Required auth, editor, admin, share, prototype, and release handoff routes are exercised after recovery.",
        id: "self-hosted-recovery-route-smoke",
        label: "Run required route smoke",
        ownerRole: "Self-hosted operator",
        runId,
        sourceId: "required-production-smoke",
        status: getRowsStatus(smokeRows.map((row) => row.status)),
      }),
      createStep({
        command: "Export Admin > Release rollback readiness Markdown.",
        evidence: `${rollbackReadiness.versionAnchorCount} version anchors, ${rollbackReadiness.deploymentLinkCount} deployment links, and ${rollbackReadiness.shareAuditEventCount} share audit events are available.`,
        expectedResult:
          "Recovered self-hosted workspace has design-file versions, public share review, and deployment rollback evidence.",
        id: "self-hosted-recovery-rollback-evidence",
        label: "Compare rollback readiness",
        ownerRole: "Release operator",
        runId,
        sourceId: "rollback-readiness",
        status: rollbackReadiness.status,
      }),
    ],
  });
}
