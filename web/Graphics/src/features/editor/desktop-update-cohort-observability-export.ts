import type {
  DesktopUpdateCohortObservabilityReport,
  DesktopUpdateCohortRow,
  DesktopUpdateEvidencePacket,
} from "@/features/editor/desktop-update-cohort-observability-types";

export function getDesktopUpdateCohortObservabilityCsv(
  report: DesktopUpdateCohortObservabilityReport,
  rows: DesktopUpdateCohortRow[] = report.rows,
) {
  const rowHeader: Array<keyof DesktopUpdateCohortRow> = [
    "id",
    "status",
    "category",
    "label",
    "detail",
    "metric",
    "threshold",
    "channel",
    "evidenceIds",
    "recommendation",
  ];
  const packetHeader: Array<keyof DesktopUpdateEvidencePacket> = [
    "id",
    "kind",
    "status",
    "label",
    "detail",
    "evidenceCount",
  ];

  return [
    [
      "score",
      "status",
      "channels",
      "devices",
      "updated_devices",
      "rollout_coverage",
      "updater_failures",
      "updater_failure_rate",
      "rollback_cohorts",
      "rollback_devices",
      "signed_evidence",
      "unsigned_devices",
    ].join(","),
    [
      report.score,
      report.status,
      report.channelCount,
      report.totalDeviceCount,
      report.updatedDeviceCount,
      report.rolloutCoveragePercent,
      report.updaterFailureCount,
      report.updaterFailureRate,
      report.rollbackCohortCount,
      report.rollbackDeviceCount,
      report.signedEvidenceCount,
      report.unsignedDeviceCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    rowHeader.join(","),
    ...rows.map((row) =>
      rowHeader
        .map((key) =>
          escapeCsvCell(
            Array.isArray(row[key]) ? row[key].join("; ") : row[key],
          ),
        )
        .join(","),
    ),
    "",
    packetHeader.join(","),
    ...report.evidencePackets.map((packet) =>
      packetHeader
        .map((key) => escapeCsvCell(packet[key]))
        .join(","),
    ),
  ].join("\n");
}

export function getDesktopUpdateCohortObservabilityMarkdown(
  report: DesktopUpdateCohortObservabilityReport,
  rows: DesktopUpdateCohortRow[] = report.rows,
) {
  return [
    "# Desktop Update Cohort Observability",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Channels: ${report.channelCount}`,
    `Devices: ${report.totalDeviceCount}`,
    `Rollout coverage: ${report.rolloutCoveragePercent}%`,
    `Updater failures: ${report.updaterFailureCount}`,
    `Rollback cohorts: ${report.rollbackCohortCount}`,
    `Signed evidence exports: ${report.signedEvidenceCount}`,
    `Unsigned devices: ${report.unsignedDeviceCount}`,
    "",
    "This packet covers stable, beta, and canary update cohort health, updater failures, rollback cohorts, and signed evidence exports.",
    "",
    "## Review Queue",
    ...rows.map(
      (row) =>
        `- [${row.status}] ${row.category} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Cohorts",
    ...report.cohorts.map(
      (cohort) =>
        `- ${cohort.channel}: ${cohort.updatedDevices}/${cohort.totalDevices} updated, ${cohort.failedUpdateCount} failures, ${cohort.rollbackDeviceCount} rollback devices, ${cohort.signatureVerifiedCount} signed devices.`,
    ),
    "",
    "## Evidence Packets",
    ...report.evidencePackets.flatMap((packet) => [
      `- [${packet.status}] ${packet.kind} / ${packet.label}: ${packet.detail}`,
      ...packet.evidence.map((item) => `  - ${item}`),
    ]),
    "",
    "## Signed Evidence Exports",
    ...report.signedEvidenceExports.map((item) => `- ${item}`),
  ].join("\n");
}

export function getDesktopUpdateCohortObservabilityJson(
  report: DesktopUpdateCohortObservabilityReport,
  rows: DesktopUpdateCohortRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.desktop-update-cohort-observability",
      version: 1,
      generatedAt: report.generatedAt,
      summary: {
        status: report.status,
        score: report.score,
        channelCount: report.channelCount,
        stableCohortCount: report.stableCohortCount,
        betaCohortCount: report.betaCohortCount,
        canaryCohortCount: report.canaryCohortCount,
        totalDeviceCount: report.totalDeviceCount,
        updatedDeviceCount: report.updatedDeviceCount,
        rolloutCoveragePercent: report.rolloutCoveragePercent,
        updaterFailureCount: report.updaterFailureCount,
        updaterFailureRate: report.updaterFailureRate,
        rollbackCohortCount: report.rollbackCohortCount,
        rollbackDeviceCount: report.rollbackDeviceCount,
        signedEvidenceCount: report.signedEvidenceCount,
        unsignedDeviceCount: report.unsignedDeviceCount,
        readyCount: report.readyCount,
        reviewCount: report.reviewCount,
        blockedCount: report.blockedCount,
      },
      rows,
      cohorts: report.cohorts,
      evidencePackets: report.evidencePackets,
      signedEvidenceExports: report.signedEvidenceExports,
    },
    null,
    2,
  );
}

function escapeCsvCell(
  value: boolean | number | string | string[] | null | undefined,
) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = Array.isArray(value) ? value.join("; ") : String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
