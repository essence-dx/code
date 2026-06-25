import type { OfflineDesktopHandoffKitSummary } from "@/features/projects/offline-desktop-handoff-kit";
import type { ReleaseEvidenceBundleSummary } from "@/features/projects/release-evidence-bundle";
import type { ReleaseEvidenceDiffMetricSource } from "@/features/projects/release-evidence-diff";

export type ReleaseEvidenceDiffMetricPreference = "higher" | "lower" | "neutral";

export interface ReleaseEvidenceDiffMetric {
  detail: string;
  id: string;
  label: string;
  preference: ReleaseEvidenceDiffMetricPreference;
  source: ReleaseEvidenceDiffMetricSource;
  value: number;
}

function releaseEvidenceMetrics(summary: ReleaseEvidenceBundleSummary | null): ReleaseEvidenceDiffMetric[] {
  if (!summary) {
    return [];
  }

  return [
    {
      detail: `${summary.riskLevel} workspace risk level`,
      id: "release:risk-score",
      label: "Risk score",
      preference: "higher",
      source: "release-evidence",
      value: summary.riskScore,
    },
    {
      detail: "High-priority actions plus public, runbook, signing, and CAD blockers.",
      id: "release:blockers",
      label: "Release blockers",
      preference: "lower",
      source: "release-evidence",
      value: summary.releaseBlockerCount,
    },
    {
      detail: "High-priority release action items.",
      id: "release:high-priority-actions",
      label: "High-priority actions",
      preference: "lower",
      source: "release-evidence",
      value: summary.highPriorityActionCount,
    },
    {
      detail: "Projects included in the launch evidence scope.",
      id: "release:projects",
      label: "Projects covered",
      preference: "neutral",
      source: "release-evidence",
      value: summary.projectCount,
    },
    {
      detail: "Compliance reports packaged for reviewer handoff.",
      id: "release:compliance-reports",
      label: "Compliance reports",
      preference: "neutral",
      source: "release-evidence",
      value: summary.complianceReportCount,
    },
    {
      detail: "Public viewer, embed, API, and app-package health snapshots.",
      id: "release:public-health",
      label: "Public health snapshots",
      preference: "neutral",
      source: "release-evidence",
      value: summary.publicSurfaceSnapshotCount,
    },
    {
      detail: "Audit rows available for the release handoff.",
      id: "release:audit-events",
      label: "Audit events",
      preference: "neutral",
      source: "release-evidence",
      value: summary.auditEventCount,
    },
    {
      detail: "Release runbook records in the bundle.",
      id: "release:runbook-records",
      label: "Runbook records",
      preference: "neutral",
      source: "release-evidence",
      value: summary.runbookRecordCount,
    },
    {
      detail: "Native package certificate records in scope.",
      id: "release:certificate-records",
      label: "Certificate records",
      preference: "neutral",
      source: "release-evidence",
      value: summary.certificateRecordCount,
    },
    {
      detail: "CAD conversion worker records in scope.",
      id: "release:cad-jobs",
      label: "CAD jobs",
      preference: "neutral",
      source: "release-evidence",
      value: summary.cadJobCount,
    },
    {
      detail: "Files included in the exported release evidence bundle.",
      id: "release:files",
      label: "Bundle files",
      preference: "neutral",
      source: "release-evidence",
      value: summary.fileCount,
    },
  ];
}

function offlineDesktopHandoffMetrics(summary: OfflineDesktopHandoffKitSummary | null): ReleaseEvidenceDiffMetric[] {
  if (!summary) {
    return [];
  }

  return [
    {
      detail: "Offline desktop handoff readiness score.",
      id: "desktop:handoff-score",
      label: "Desktop handoff score",
      preference: "higher",
      source: "desktop-handoff",
      value: summary.handoffScore,
    },
    {
      detail: "Desktop, signing, app-package, and CAD blockers in the handoff.",
      id: "desktop:blockers",
      label: "Desktop handoff blockers",
      preference: "lower",
      source: "desktop-handoff",
      value: summary.releaseBlockerCount,
    },
    {
      detail: "Release channels blocked by desktop updater state.",
      id: "desktop:blocked-channels",
      label: "Blocked channels",
      preference: "lower",
      source: "desktop-handoff",
      value: summary.desktopBlockedChannelCount,
    },
    {
      detail: "Selected desktop artifacts that still lack signatures.",
      id: "desktop:unsigned-artifacts",
      label: "Unsigned artifacts",
      preference: "lower",
      source: "desktop-handoff",
      value: summary.unsignedDesktopArtifactCount,
    },
    {
      detail: "Required signing environment secrets not present for the handoff.",
      id: "desktop:missing-secrets",
      label: "Missing signing secrets",
      preference: "lower",
      source: "desktop-handoff",
      value: summary.signingMissingSecretCount,
    },
    {
      detail: "Native and mobile app package certificate blockers.",
      id: "desktop:app-package-blockers",
      label: "App package blockers",
      preference: "lower",
      source: "desktop-handoff",
      value: summary.appPackageBlockedCount,
    },
    {
      detail: "Open, failed, running, queued, or retryable CAD worker records.",
      id: "desktop:cad-unresolved",
      label: "Unresolved CAD outputs",
      preference: "lower",
      source: "desktop-handoff",
      value: summary.cadUnresolvedCount,
    },
    {
      detail: "Desktop platforms ready for signing.",
      id: "desktop:ready-platforms",
      label: "Signing-ready platforms",
      preference: "higher",
      source: "desktop-handoff",
      value: summary.signingReadyPlatformCount,
    },
    {
      detail: "Selected artifacts included in the desktop handoff scope.",
      id: "desktop:selected-artifacts",
      label: "Selected desktop artifacts",
      preference: "neutral",
      source: "desktop-handoff",
      value: summary.selectedDesktopArtifactCount,
    },
    {
      detail: "Files included in the offline desktop handoff kit.",
      id: "desktop:files",
      label: "Desktop handoff files",
      preference: "neutral",
      source: "desktop-handoff",
      value: summary.fileCount,
    },
  ];
}

export function createReleaseEvidenceDiffMetrics(input: {
  offlineDesktopHandoffSummary: OfflineDesktopHandoffKitSummary | null;
  releaseEvidenceSummary: ReleaseEvidenceBundleSummary | null;
}) {
  return [...releaseEvidenceMetrics(input.releaseEvidenceSummary), ...offlineDesktopHandoffMetrics(input.offlineDesktopHandoffSummary)];
}
