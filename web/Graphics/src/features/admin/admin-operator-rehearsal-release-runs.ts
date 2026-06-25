import type { AccessibilityPrivacyReleaseChecklist } from "@/features/admin/admin-accessibility-privacy-release";
import {
  createRun,
  createStep,
  findManifestArtifact,
  findSmokeRows,
  getRowsStatus,
  type AdminOperatorRehearsalRun,
} from "@/features/admin/admin-operator-rehearsal-core";
import type { RetentionPrivacyReport } from "@/features/admin/admin-retention-privacy";
import type { AdminReleaseArtifactManifestReport } from "@/features/admin/admin-release-artifact-manifest";
import type { AdminReleaseIncidentTimelineReport } from "@/features/admin/admin-release-incident-timeline";
import type { AdminRollbackReadinessReport } from "@/features/admin/admin-rollback-readiness";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";

export function getRestoreRun({
  generatedAt,
  productionDeploySmoke,
  releaseArtifactManifest,
  rollbackReadiness,
}: {
  generatedAt: string;
  productionDeploySmoke: ProductionDeploySmokeReport;
  releaseArtifactManifest: AdminReleaseArtifactManifestReport;
  rollbackReadiness: AdminRollbackReadinessReport;
}): AdminOperatorRehearsalRun {
  const runId = "restore-drill";
  const databaseRow = rollbackReadiness.rows.find(
    (row) => row.category === "database",
  );
  const versionRow = rollbackReadiness.rows.find(
    (row) => row.category === "versions",
  );
  const deploymentRow = rollbackReadiness.rows.find(
    (row) => row.category === "deployment",
  );
  const manifestRow = releaseArtifactManifest.rows.find(
    (row) => row.id === "release-manifest-signature-coverage",
  );

  return createRun({
    cadence: "Every production release and before risky migrations",
    generatedAt,
    id: runId,
    kind: "restore",
    label: "Restore drill",
    objective:
      "Prove operators can restore database state, named design-file versions, and deployment links from release evidence.",
    ownerRole: "Release operator",
    steps: [
      createStep({
        command: "Export Admin > Release rollback readiness JSON.",
        evidence: databaseRow?.detail ?? "Rollback database evidence is missing.",
        expectedResult:
          "Database kind, auth readiness, and active workspace counts are visible before restore.",
        id: "restore-database-state",
        label: "Confirm database restore source",
        ownerRole: "Release operator",
        runId,
        sourceId: databaseRow?.id ?? null,
        status: databaseRow?.status ?? "review",
      }),
      createStep({
        command: "Export Admin > Release rollback readiness Markdown.",
        evidence: versionRow?.detail ?? "Version restore anchor evidence is missing.",
        expectedResult:
          "Release-critical files have named version anchors or documented exclusions.",
        id: "restore-version-anchors",
        label: "Verify named version anchors",
        ownerRole: "Design systems lead",
        runId,
        sourceId: versionRow?.id ?? null,
        status: versionRow?.status ?? "review",
      }),
      createStep({
        command: productionDeploySmoke.commands[2] ?? null,
        evidence:
          deploymentRow?.detail ?? "Deployment URL evidence is not configured.",
        expectedResult:
          "The active deployment URL is available for route probes and rollback comparison.",
        id: "restore-deployment-link",
        label: "Probe deployment rollback target",
        ownerRole: "Release operator",
        runId,
        sourceId: deploymentRow?.id ?? null,
        status: deploymentRow?.status ?? "review",
      }),
      createStep({
        command: "Export signed release artifact manifest JSON.",
        evidence:
          manifestRow?.detail ??
          `${releaseArtifactManifest.artifactCount} artifacts are listed in the release manifest.`,
        expectedResult:
          "Checksums and signatures can be archived beside restore evidence.",
        id: "restore-manifest-signature",
        label: "Archive signed manifest evidence",
        ownerRole: "Release manager",
        runId,
        sourceId: manifestRow?.id ?? releaseArtifactManifest.manifestId,
        status: manifestRow?.status ?? releaseArtifactManifest.status,
      }),
    ],
  });
}

export function getImportExportRun({
  generatedAt,
  productionDeploySmoke,
  releaseArtifactManifest,
}: {
  generatedAt: string;
  productionDeploySmoke: ProductionDeploySmokeReport;
  releaseArtifactManifest: AdminReleaseArtifactManifestReport;
}): AdminOperatorRehearsalRun {
  const runId = "import-export-drill";
  const offlineVault = findManifestArtifact(
    releaseArtifactManifest,
    "offline-vault",
  );
  const supportBundle = findManifestArtifact(
    releaseArtifactManifest,
    "support-bundle",
  );
  const handoffSmoke = findSmokeRows(productionDeploySmoke, "release-handoff");
  const manifestCoverage = releaseArtifactManifest.rows.find(
    (row) => row.id === "release-manifest-artifact-coverage",
  );

  return createRun({
    cadence: "Before release handoff and before support bundle sharing",
    generatedAt,
    id: runId,
    kind: "import-export",
    label: "Import and export drill",
    objective:
      "Confirm offline vault, support bundle, and handoff exports can be generated, validated, and attached to release records.",
    ownerRole: "Support lead",
    steps: [
      createStep({
        command: "Export Admin > Support offline vault JSON.",
        evidence:
          offlineVault?.detail ?? "Offline vault package is absent from manifest.",
        expectedResult:
          "Offline vault payload has a checksum and includes design files, support evidence, and backup snapshots.",
        id: "import-export-offline-vault",
        label: "Export offline vault package",
        ownerRole: "Support lead",
        runId,
        sourceId: offlineVault?.id ?? null,
        status: offlineVault?.status ?? "blocked",
      }),
      createStep({
        command: "Export Admin > Support bundle JSON.",
        evidence:
          supportBundle?.detail ??
          "Support bundle package is absent from manifest.",
        expectedResult:
          "Support bundle can be exported with scoped users, files, shares, sessions, audit rows, and privacy settings.",
        id: "import-export-support-bundle",
        label: "Export support bundle",
        ownerRole: "Support lead",
        runId,
        sourceId: supportBundle?.id ?? null,
        status: supportBundle?.status ?? "blocked",
      }),
      createStep({
        command:
          handoffSmoke[0]?.command ??
          "Export JSON and Handoff from the Extensions production panels.",
        evidence:
          handoffSmoke[0]?.detail ??
          "Release handoff smoke coverage is not registered.",
        expectedResult:
          "Release handoff exports include performance, runtime, baseline, collaboration, and deploy-smoke evidence.",
        id: "import-export-release-handoff",
        label: "Exercise release handoff exports",
        ownerRole: "Release manager",
        runId,
        sourceId: handoffSmoke[0]?.id ?? null,
        status: getRowsStatus(handoffSmoke.map((row) => row.status)),
      }),
      createStep({
        command: "Export signed release artifact manifest CSV.",
        evidence:
          manifestCoverage?.detail ??
          `${releaseArtifactManifest.artifactCount} manifest artifacts are present.`,
        expectedResult:
          "All web, desktop, self-hosted, offline vault, and support bundle artifacts are listed before handoff.",
        id: "import-export-manifest-coverage",
        label: "Verify manifest coverage",
        ownerRole: "Release manager",
        runId,
        sourceId: manifestCoverage?.id ?? releaseArtifactManifest.manifestId,
        status: manifestCoverage?.status ?? releaseArtifactManifest.status,
      }),
    ],
  });
}

export function getPublicSharePrivacyRun({
  accessibilityPrivacyRelease,
  generatedAt,
  productionDeploySmoke,
  releaseIncidentTimeline,
  retentionPrivacy,
  rollbackReadiness,
}: {
  accessibilityPrivacyRelease: AccessibilityPrivacyReleaseChecklist;
  generatedAt: string;
  productionDeploySmoke: ProductionDeploySmokeReport;
  releaseIncidentTimeline: AdminReleaseIncidentTimelineReport;
  retentionPrivacy: RetentionPrivacyReport;
  rollbackReadiness: AdminRollbackReadinessReport;
}): AdminOperatorRehearsalRun {
  const runId = "public-share-privacy-drill";
  const shareSmoke = findSmokeRows(productionDeploySmoke, "share");
  const shareRows = accessibilityPrivacyRelease.rows.filter(
    (row) => row.surface === "share",
  );
  const shareExposure = rollbackReadiness.rows.find(
    (row) => row.category === "shares",
  );
  const shareCorrelation = releaseIncidentTimeline.correlations.find(
    (correlation) => correlation.id === "rollback-share-correlation",
  );

  return createRun({
    cadence: "Before enabling public links after any restore or deploy",
    generatedAt,
    id: runId,
    kind: "public-share-privacy",
    label: "Public share privacy drill",
    objective:
      "Confirm public shares render without admin leakage, risky links are reviewable, and support evidence is redacted.",
    ownerRole: "Privacy reviewer",
    steps: [
      createStep({
        command: shareSmoke[0]?.command ?? productionDeploySmoke.commands[2] ?? null,
        evidence:
          shareSmoke[0]?.detail ?? "Public share route smoke is not registered.",
        expectedResult:
          "A public share loads without authenticated controls or admin-only data.",
        id: "share-privacy-route-smoke",
        label: "Probe public share route",
        ownerRole: "Privacy reviewer",
        runId,
        sourceId: shareSmoke[0]?.id ?? null,
        status: getRowsStatus(shareSmoke.map((row) => row.status)),
      }),
      createStep({
        command: "Export Admin > Release accessibility and privacy checklist.",
        evidence:
          shareRows.map((row) => `${row.label}: ${row.detail}`).join(" ") ||
          "Share privacy release rows are not available.",
        expectedResult:
          "Share and support evidence privacy checks are visible with public route smoke evidence.",
        id: "share-privacy-release-checklist",
        label: "Review share privacy checklist",
        ownerRole: "Privacy reviewer",
        runId,
        sourceId: shareRows[0]?.id ?? null,
        status: getRowsStatus(shareRows.map((row) => row.status)),
      }),
      createStep({
        command: "Export Admin > Release rollback readiness CSV.",
        evidence:
          shareExposure?.detail ??
          "Share exposure evidence is missing from rollback readiness.",
        expectedResult:
          "Stale and elevated links are reviewed before restore or release.",
        id: "share-privacy-exposure-review",
        label: "Review public link exposure",
        ownerRole: "Release operator",
        runId,
        sourceId: shareExposure?.id ?? null,
        status: shareExposure?.status ?? "review",
      }),
      createStep({
        command: "Export Admin > Governance retention privacy Markdown.",
        evidence: retentionPrivacy.supportBundleRedactionEnabled
          ? `Support bundle privacy mode is ${retentionPrivacy.settings.supportBundlePrivacyMode}.`
          : "Support bundle redaction is disabled.",
        expectedResult:
          "Support evidence uses redacted or minimal mode before public-link diagnostics leave the workspace.",
        id: "share-privacy-support-redaction",
        label: "Confirm support evidence redaction",
        ownerRole: "Support lead",
        runId,
        sourceId: "retention-privacy-support-redaction",
        status: retentionPrivacy.supportBundleRedactionEnabled ? "ready" : "review",
      }),
      createStep({
        command: "Export Admin > Release incident timeline Markdown.",
        evidence:
          shareCorrelation?.detail ??
          "Rollback and share correlation evidence is unavailable.",
        expectedResult:
          "Share exposure and rollback evidence are correlated in the release incident timeline.",
        id: "share-privacy-timeline-correlation",
        label: "Check share timeline correlation",
        ownerRole: "Release manager",
        runId,
        sourceId: shareCorrelation?.id ?? null,
        status: shareCorrelation?.status ?? releaseIncidentTimeline.status,
      }),
    ],
  });
}
