import type {
  DesktopUpdateChannelKind,
  DesktopUpdateCohortObservabilityInput,
  DesktopUpdateCohortObservabilityReport,
  DesktopUpdateCohortRow,
  DesktopUpdateCohortSnapshot,
  DesktopUpdateCohortStatus,
  DesktopUpdateEvidencePacket,
} from "@/features/editor/desktop-update-cohort-observability-types";

export {
  getDesktopUpdateCohortObservabilityCsv,
  getDesktopUpdateCohortObservabilityJson,
  getDesktopUpdateCohortObservabilityMarkdown,
} from "@/features/editor/desktop-update-cohort-observability-export";
export type {
  DesktopUpdateChannelKind,
  DesktopUpdateCohortCategory,
  DesktopUpdateCohortObservabilityInput,
  DesktopUpdateCohortObservabilityReport,
  DesktopUpdateCohortRow,
  DesktopUpdateCohortSnapshot,
  DesktopUpdateCohortStatus,
  DesktopUpdateEvidencePacket,
  DesktopUpdateEvidencePacketKind,
} from "@/features/editor/desktop-update-cohort-observability-types";

const requiredChannels = ["stable", "beta", "canary"] as const;

export function getDesktopUpdateCohortObservabilityReport({
  cohorts,
  enterpriseReleaseOperations,
  generatedAt = new Date().toISOString(),
  tauriDesktopPackaging,
}: DesktopUpdateCohortObservabilityInput): DesktopUpdateCohortObservabilityReport {
  const normalizedCohorts =
    cohorts && cohorts.length > 0
      ? cohorts.map(normalizeCohort)
      : getDefaultCohorts({
          enterpriseReleaseOperations,
          generatedAt,
          tauriDesktopPackaging,
        });
  const totalDeviceCount = normalizedCohorts.reduce(
    (total, cohort) => total + cohort.totalDevices,
    0,
  );
  const updatedDeviceCount = normalizedCohorts.reduce(
    (total, cohort) => total + cohort.updatedDevices,
    0,
  );
  const updaterFailureCount = normalizedCohorts.reduce(
    (total, cohort) => total + cohort.failedUpdateCount,
    0,
  );
  const rollbackDeviceCount = normalizedCohorts.reduce(
    (total, cohort) => total + cohort.rollbackDeviceCount,
    0,
  );
  const unsignedDeviceCount = normalizedCohorts.reduce(
    (total, cohort) =>
      total + Math.max(0, cohort.totalDevices - cohort.signatureVerifiedCount),
    0,
  );
  const signedEvidenceExports = getSignedEvidenceExports({
    cohorts: normalizedCohorts,
    enterpriseReleaseOperations,
    tauriDesktopPackaging,
  });
  const rows = [
    getChannelHealthRow(normalizedCohorts),
    getUpdaterFailuresRow(normalizedCohorts, tauriDesktopPackaging),
    getRollbackCohortsRow(normalizedCohorts, enterpriseReleaseOperations),
    getSignedEvidenceRow(
      normalizedCohorts,
      signedEvidenceExports,
      tauriDesktopPackaging,
    ),
    getReleaseGateRow(enterpriseReleaseOperations, tauriDesktopPackaging),
  ];
  const evidencePackets = getEvidencePackets({
    enterpriseReleaseOperations,
    normalizedCohorts,
    rows,
    signedEvidenceExports,
    tauriDesktopPackaging,
  });
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const rolloutCoveragePercent =
    totalDeviceCount === 0
      ? 0
      : Math.round((updatedDeviceCount / totalDeviceCount) * 100);
  const updaterFailureRate =
    totalDeviceCount === 0
      ? 0
      : Math.round((updaterFailureCount / totalDeviceCount) * 1000) / 10;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(
      0,
      Math.min(enterpriseReleaseOperations.score, tauriDesktopPackaging.score) -
        blockedCount * 12 -
        reviewCount * 4 -
        Math.min(12, updaterFailureCount) -
        Math.min(10, rollbackDeviceCount),
    ),
    channelCount: getChannelCount(normalizedCohorts),
    stableCohortCount: getCohortChannelCount(normalizedCohorts, "stable"),
    betaCohortCount: getCohortChannelCount(normalizedCohorts, "beta"),
    canaryCohortCount: getCohortChannelCount(normalizedCohorts, "canary"),
    totalDeviceCount,
    updatedDeviceCount,
    rolloutCoveragePercent,
    updaterFailureCount,
    updaterFailureRate,
    rollbackCohortCount: normalizedCohorts.filter(
      (cohort) => cohort.rollbackDeviceCount > 0,
    ).length,
    rollbackDeviceCount,
    signedEvidenceCount: signedEvidenceExports.length,
    unsignedDeviceCount,
    readyCount,
    reviewCount,
    blockedCount,
    rows: rows.sort(sortRows),
    cohorts: normalizedCohorts,
    evidencePackets,
    signedEvidenceExports,
  };
}

function normalizeCohort(
  cohort: DesktopUpdateCohortSnapshot,
): DesktopUpdateCohortSnapshot {
  const totalDevices = Math.max(0, cohort.totalDevices);
  const updatedDevices = clamp(cohort.updatedDevices, 0, totalDevices);
  const failedUpdateCount = clamp(cohort.failedUpdateCount, 0, totalDevices);
  const rollbackDeviceCount = clamp(cohort.rollbackDeviceCount, 0, totalDevices);
  const signatureVerifiedCount = clamp(
    cohort.signatureVerifiedCount,
    0,
    totalDevices,
  );

  return {
    ...cohort,
    currentVersion: cohort.currentVersion.trim() || "unknown",
    targetVersion: cohort.targetVersion.trim() || cohort.currentVersion || "unknown",
    rolloutPercent: clamp(cohort.rolloutPercent, 0, 100),
    totalDevices,
    updatedDevices,
    failedUpdateCount,
    rollbackDeviceCount,
    signatureVerifiedCount,
    evidenceIds: cohort.evidenceIds.filter(Boolean),
  };
}

function getDefaultCohorts({
  enterpriseReleaseOperations,
  generatedAt,
  tauriDesktopPackaging,
}: {
  enterpriseReleaseOperations: DesktopUpdateCohortObservabilityInput["enterpriseReleaseOperations"];
  generatedAt: string;
  tauriDesktopPackaging: DesktopUpdateCohortObservabilityInput["tauriDesktopPackaging"];
}): DesktopUpdateCohortSnapshot[] {
  const ready =
    enterpriseReleaseOperations.status === "ready" &&
    tauriDesktopPackaging.updaterStatus === "ready";
  const baseVersion = tauriDesktopPackaging.appVersion;

  return [
    {
      id: "default-stable-desktop-cohort",
      channel: "stable",
      label: "Stable desktop cohort",
      currentVersion: baseVersion,
      targetVersion: baseVersion,
      rolloutPercent: ready ? 100 : 25,
      totalDevices: 100,
      updatedDevices: ready ? 96 : 72,
      failedUpdateCount: ready ? 0 : 4,
      rollbackDeviceCount: ready ? 0 : 3,
      signatureVerifiedCount: ready ? 100 : 86,
      latestSignalAt: generatedAt,
      evidenceIds: ["stable-signed-manifest", "stable-rollout-report"],
    },
    {
      id: "default-beta-desktop-cohort",
      channel: "beta",
      label: "Beta desktop cohort",
      currentVersion: baseVersion,
      targetVersion: baseVersion,
      rolloutPercent: ready ? 100 : 10,
      totalDevices: 32,
      updatedDevices: ready ? 31 : 20,
      failedUpdateCount: ready ? 0 : 2,
      rollbackDeviceCount: ready ? 0 : 1,
      signatureVerifiedCount: ready ? 32 : 25,
      latestSignalAt: generatedAt,
      evidenceIds: ["beta-signed-manifest", "beta-rollout-report"],
    },
    {
      id: "default-canary-desktop-cohort",
      channel: "canary",
      label: "Canary desktop cohort",
      currentVersion: baseVersion,
      targetVersion: baseVersion,
      rolloutPercent: 100,
      totalDevices: 8,
      updatedDevices: ready ? 8 : 7,
      failedUpdateCount: 0,
      rollbackDeviceCount: 0,
      signatureVerifiedCount: ready ? 8 : 7,
      latestSignalAt: generatedAt,
      evidenceIds: ["canary-signed-manifest", "canary-rollout-report"],
    },
  ];
}

function getChannelHealthRow(
  cohorts: DesktopUpdateCohortSnapshot[],
): DesktopUpdateCohortRow {
  const missingChannels = requiredChannels.filter(
    (channel) => !cohorts.some((cohort) => cohort.channel === channel),
  );
  const emptyCohorts = cohorts.filter((cohort) => cohort.totalDevices === 0);
  const lowCoverage = cohorts.filter(
    (cohort) =>
      cohort.totalDevices > 0 &&
      cohort.updatedDevices / cohort.totalDevices < 0.85,
  );
  const status: DesktopUpdateCohortStatus =
    missingChannels.length > 0 || emptyCohorts.length > 0
      ? "blocked"
      : lowCoverage.length > 0
        ? "review"
        : "ready";

  return {
    id: "desktop-update-channel-health",
    status,
    category: "channel-health",
    label: "Stable beta canary channel health",
    detail:
      status === "ready"
        ? "Stable, beta, and canary update cohorts are represented with healthy rollout coverage."
        : `${missingChannels.length} missing channel${missingChannels.length === 1 ? "" : "s"}, ${emptyCohorts.length} empty cohort${emptyCohorts.length === 1 ? "" : "s"}, and ${lowCoverage.length} low-coverage cohort${lowCoverage.length === 1 ? "" : "s"} need review.`,
    metric: getChannelCount(cohorts),
    threshold: requiredChannels.length,
    channel: "all",
    evidenceIds: cohorts.flatMap((cohort) => cohort.evidenceIds),
    recommendation:
      status === "ready"
        ? "Keep all channel health evidence attached before increasing rollout."
        : "Restore stable, beta, and canary channel coverage before release owner signoff.",
  };
}

function getUpdaterFailuresRow(
  cohorts: DesktopUpdateCohortSnapshot[],
  tauriDesktopPackaging: DesktopUpdateCohortObservabilityInput["tauriDesktopPackaging"],
): DesktopUpdateCohortRow {
  const totalDevices = cohorts.reduce((total, cohort) => total + cohort.totalDevices, 0);
  const failures = cohorts.reduce(
    (total, cohort) => total + cohort.failedUpdateCount,
    0,
  );
  const failureRate = totalDevices === 0 ? 0 : failures / totalDevices;
  const status: DesktopUpdateCohortStatus =
    tauriDesktopPackaging.updaterStatus === "blocked" || failureRate >= 0.1
      ? "blocked"
      : failures > 0 || tauriDesktopPackaging.updaterStatus === "review"
        ? "review"
        : "ready";

  return {
    id: "desktop-update-updater-failures",
    status,
    category: "updater-failures",
    label: "Updater failure rate",
    detail: `${failures} updater failure${failures === 1 ? "" : "s"} across ${totalDevices} devices; Tauri updater evidence is ${tauriDesktopPackaging.updaterStatus}.`,
    metric: failures,
    threshold: 0,
    channel: "all",
    evidenceIds: cohorts.flatMap((cohort) =>
      cohort.failedUpdateCount > 0 ? cohort.evidenceIds : [],
    ),
    recommendation:
      status === "ready"
        ? "Updater failure evidence is clean for cohort promotion."
        : "Hold rollout growth until updater failures and Tauri updater blockers are cleared.",
  };
}

function getRollbackCohortsRow(
  cohorts: DesktopUpdateCohortSnapshot[],
  enterpriseReleaseOperations: DesktopUpdateCohortObservabilityInput["enterpriseReleaseOperations"],
): DesktopUpdateCohortRow {
  const rollbackCohorts = cohorts.filter(
    (cohort) => cohort.rollbackDeviceCount > 0,
  );
  const rollbackDevices = rollbackCohorts.reduce(
    (total, cohort) => total + cohort.rollbackDeviceCount,
    0,
  );
  const releaseBlocked =
    enterpriseReleaseOperations.desktopReleaseDecision === "do-not-ship";
  const status: DesktopUpdateCohortStatus =
    releaseBlocked || rollbackDevices > 10
      ? "blocked"
      : rollbackDevices > 0
        ? "review"
        : "ready";

  return {
    id: "desktop-update-rollback-cohorts",
    status,
    category: "rollback-cohorts",
    label: "Rollback cohorts",
    detail: `${rollbackCohorts.length} rollback cohorts include ${rollbackDevices} rollback device${rollbackDevices === 1 ? "" : "s"}; release decision is ${enterpriseReleaseOperations.desktopReleaseDecision}.`,
    metric: rollbackCohorts.length,
    threshold: 0,
    channel: "all",
    evidenceIds: rollbackCohorts.flatMap((cohort) => cohort.evidenceIds),
    recommendation:
      status === "ready"
        ? "No rollback cohorts are blocking update promotion."
        : "Attach rollback cohort evidence and keep rollout held until release owner clears it.",
  };
}

function getSignedEvidenceRow(
  cohorts: DesktopUpdateCohortSnapshot[],
  signedEvidenceExports: string[],
  tauriDesktopPackaging: DesktopUpdateCohortObservabilityInput["tauriDesktopPackaging"],
): DesktopUpdateCohortRow {
  const totalDevices = cohorts.reduce((total, cohort) => total + cohort.totalDevices, 0);
  const signedDevices = cohorts.reduce(
    (total, cohort) => total + cohort.signatureVerifiedCount,
    0,
  );
  const unsignedDevices = Math.max(0, totalDevices - signedDevices);
  const status: DesktopUpdateCohortStatus =
    unsignedDevices > 0 && tauriDesktopPackaging.updaterStatus === "blocked"
      ? "blocked"
      : unsignedDevices > 0 || signedEvidenceExports.length < 5
        ? "review"
        : "ready";

  return {
    id: "desktop-update-signed-evidence",
    status,
    category: "signed-evidence",
    label: "Signed evidence exports",
    detail: `${signedDevices}/${totalDevices} devices have signature verification and ${signedEvidenceExports.length} signed evidence export${signedEvidenceExports.length === 1 ? "" : "s"} are available.`,
    metric: signedEvidenceExports.length,
    threshold: 5,
    channel: "all",
    evidenceIds: cohorts.flatMap((cohort) => cohort.evidenceIds),
    recommendation:
      status === "ready"
        ? "Signed updater evidence is ready for release owner export."
        : "Collect signed manifests and close unsigned device gaps before rollout promotion.",
  };
}

function getReleaseGateRow(
  enterpriseReleaseOperations: DesktopUpdateCohortObservabilityInput["enterpriseReleaseOperations"],
  tauriDesktopPackaging: DesktopUpdateCohortObservabilityInput["tauriDesktopPackaging"],
): DesktopUpdateCohortRow {
  const status: DesktopUpdateCohortStatus =
    enterpriseReleaseOperations.status === "blocked" ||
    tauriDesktopPackaging.status === "blocked"
      ? "blocked"
      : enterpriseReleaseOperations.status === "review" ||
          tauriDesktopPackaging.status === "review"
        ? "review"
        : "ready";

  return {
    id: "desktop-update-release-gate",
    status,
    category: "release-gate",
    label: "Release gate alignment",
    detail: `Enterprise release decision is ${enterpriseReleaseOperations.desktopReleaseDecision}; Tauri packaging is ${tauriDesktopPackaging.status} with updater ${tauriDesktopPackaging.updaterStatus}.`,
    metric: Math.min(enterpriseReleaseOperations.score, tauriDesktopPackaging.score),
    threshold: 90,
    channel: "all",
    evidenceIds: enterpriseReleaseOperations.releasePackets.map((packet) => packet.id),
    recommendation:
      status === "ready"
        ? "Release gate is aligned for update cohort promotion."
        : "Keep update rollout held until enterprise release and Tauri updater evidence are cleared.",
  };
}

function getSignedEvidenceExports({
  cohorts,
  enterpriseReleaseOperations,
  tauriDesktopPackaging,
}: {
  cohorts: DesktopUpdateCohortSnapshot[];
  enterpriseReleaseOperations: DesktopUpdateCohortObservabilityInput["enterpriseReleaseOperations"];
  tauriDesktopPackaging: DesktopUpdateCohortObservabilityInput["tauriDesktopPackaging"];
}) {
  return [
    "Export Extensions > Desktop update cohort observability JSON.",
    "Export Extensions > Desktop update cohort observability CSV.",
    "Export Extensions > Desktop update cohort observability Markdown.",
    ...cohorts.map(
      (cohort) =>
        `Archive ${cohort.channel} signed manifest evidence for ${cohort.targetVersion}.`,
    ),
    ...tauriDesktopPackaging.releasePacketEvidence.filter((item) =>
      /sign|manifest|updater|channel/i.test(item),
    ),
    ...enterpriseReleaseOperations.releasePackets.flatMap((packet) =>
      packet.evidence.filter((item) => /sign|rollback|release/i.test(item)),
    ),
  ];
}

function getEvidencePackets({
  enterpriseReleaseOperations,
  normalizedCohorts,
  rows,
  signedEvidenceExports,
  tauriDesktopPackaging,
}: {
  enterpriseReleaseOperations: DesktopUpdateCohortObservabilityInput["enterpriseReleaseOperations"];
  normalizedCohorts: DesktopUpdateCohortSnapshot[];
  rows: DesktopUpdateCohortRow[];
  signedEvidenceExports: string[];
  tauriDesktopPackaging: DesktopUpdateCohortObservabilityInput["tauriDesktopPackaging"];
}): DesktopUpdateEvidencePacket[] {
  return [
    {
      id: "desktop-update-channel-health-packet",
      kind: "channel-health",
      status: getRowStatus(rows, "channel-health"),
      label: "Channel health packet",
      detail: `${getChannelCount(normalizedCohorts)} desktop update channels are represented.`,
      evidence: normalizedCohorts.map(
        (cohort) =>
          `${cohort.channel}: ${cohort.updatedDevices}/${cohort.totalDevices} devices updated.`,
      ),
      evidenceCount: normalizedCohorts.length,
    },
    {
      id: "desktop-update-updater-failure-packet",
      kind: "updater-failure",
      status: getRowStatus(rows, "updater-failures"),
      label: "Updater failure packet",
      detail: `${normalizedCohorts.reduce((total, cohort) => total + cohort.failedUpdateCount, 0)} updater failures captured.`,
      evidence: normalizedCohorts
        .filter((cohort) => cohort.failedUpdateCount > 0)
        .map(
          (cohort) =>
            `${cohort.channel}: ${cohort.failedUpdateCount} update failures.`,
        ),
      evidenceCount: normalizedCohorts.reduce(
        (total, cohort) => total + cohort.failedUpdateCount,
        0,
      ),
    },
    {
      id: "desktop-update-rollback-cohort-packet",
      kind: "rollback-cohort",
      status: getRowStatus(rows, "rollback-cohorts"),
      label: "Rollback cohort packet",
      detail: `${normalizedCohorts.filter((cohort) => cohort.rollbackDeviceCount > 0).length} rollback cohorts captured.`,
      evidence: normalizedCohorts
        .filter((cohort) => cohort.rollbackDeviceCount > 0)
        .map(
          (cohort) =>
            `${cohort.channel}: ${cohort.rollbackDeviceCount} rollback devices.`,
        ),
      evidenceCount: normalizedCohorts.reduce(
        (total, cohort) => total + cohort.rollbackDeviceCount,
        0,
      ),
    },
    {
      id: "desktop-update-signed-evidence-packet",
      kind: "signed-evidence",
      status: getRowStatus(rows, "signed-evidence"),
      label: "Signed evidence packet",
      detail: `${signedEvidenceExports.length} signed update evidence exports are available.`,
      evidence: signedEvidenceExports,
      evidenceCount: signedEvidenceExports.length,
    },
    {
      id: "desktop-update-release-gate-packet",
      kind: "release-gate",
      status: getRowStatus(rows, "release-gate"),
      label: "Release gate packet",
      detail: `Enterprise release ${enterpriseReleaseOperations.desktopReleaseDecision}; Tauri updater ${tauriDesktopPackaging.updaterStatus}.`,
      evidence: [
        `Enterprise release score: ${enterpriseReleaseOperations.score}.`,
        `Tauri packaging score: ${tauriDesktopPackaging.score}.`,
        `Updater status: ${tauriDesktopPackaging.updaterStatus}.`,
      ],
      evidenceCount: 3,
    },
  ];
}

function getRowStatus(
  rows: DesktopUpdateCohortRow[],
  category: DesktopUpdateCohortRow["category"],
) {
  return rows.find((row) => row.category === category)?.status ?? "review";
}

function getChannelCount(cohorts: DesktopUpdateCohortSnapshot[]) {
  return new Set(cohorts.map((cohort) => cohort.channel)).size;
}

function getCohortChannelCount(
  cohorts: DesktopUpdateCohortSnapshot[],
  channel: DesktopUpdateChannelKind,
) {
  return cohorts.filter((cohort) => cohort.channel === channel).length;
}

function sortRows(left: DesktopUpdateCohortRow, right: DesktopUpdateCohortRow) {
  const rank: Record<DesktopUpdateCohortStatus, number> = {
    blocked: 0,
    review: 1,
    ready: 2,
  };

  return rank[left.status] - rank[right.status] || left.id.localeCompare(right.id);
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}
