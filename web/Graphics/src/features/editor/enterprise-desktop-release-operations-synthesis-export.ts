import type {
  EnterpriseDesktopReleaseOperationsRow,
  EnterpriseDesktopReleaseOperationsSynthesisReport,
  EnterpriseDesktopReleasePacket,
} from "@/features/editor/enterprise-desktop-release-operations-synthesis-types";

export function getEnterpriseDesktopReleaseOperationsSynthesisCsv(
  report: EnterpriseDesktopReleaseOperationsSynthesisReport,
  rows: EnterpriseDesktopReleaseOperationsRow[] = report.rows,
) {
  const rowHeader: Array<keyof EnterpriseDesktopReleaseOperationsRow> = [
    "id",
    "status",
    "category",
    "label",
    "detail",
    "sourceScore",
    "blockerCount",
    "reviewCount",
    "evidenceCount",
    "releasePacketIds",
    "recommendation",
  ];
  const packetHeader: Array<keyof EnterpriseDesktopReleasePacket> = [
    "id",
    "kind",
    "category",
    "status",
    "label",
    "detail",
    "source",
    "evidenceCount",
  ];

  return [
    [
      "score",
      "status",
      "desktop_release_decision",
      "sources",
      "blockers",
      "review_items",
      "evidence",
      "release_packets",
      "offline_readiness_evidence",
      "admin_evidence",
      "rollback_evidence",
      "minimum_category",
    ].join(","),
    [
      report.score,
      report.status,
      report.desktopReleaseDecision,
      report.sourceCount,
      report.blockerCount,
      report.reviewItemCount,
      report.evidenceCount,
      report.releasePacketCount,
      report.offlineReadinessEvidenceCount,
      report.adminEvidenceCount,
      report.rollbackEvidenceCount,
      report.minimumScoreCategory,
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
    ...report.releasePackets.map((packet) =>
      packetHeader
        .map((key) => escapeCsvCell(packet[key]))
        .join(","),
    ),
  ].join("\n");
}

export function getEnterpriseDesktopReleaseOperationsSynthesisMarkdown(
  report: EnterpriseDesktopReleaseOperationsSynthesisReport,
  rows: EnterpriseDesktopReleaseOperationsRow[] = report.rows,
) {
  return [
    "# Enterprise Desktop Release Operations Synthesis",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Desktop release decision: ${report.desktopReleaseDecision}`,
    `Score: ${report.score}`,
    `Sources: ${report.sourceCount}`,
    `Blockers: ${report.blockerCount}`,
    `Review items: ${report.reviewItemCount}`,
    `Release packets: ${report.releasePacketCount}`,
    `Offline readiness evidence: ${report.offlineReadinessEvidenceCount}`,
    `Admin evidence: ${report.adminEvidenceCount}`,
    `Rollback evidence: ${report.rollbackEvidenceCount}`,
    `Minimum score category: ${report.minimumScoreCategory}`,
    "",
    "## Executive Summary",
    ...report.executiveSummary.map((item) => `- ${item}`),
    "",
    "## Signoff Checklist",
    ...report.signoffChecklist.map((item) => `- ${item}`),
    "",
    "## Ship Gate Rows",
    ...rows.map(
      (row) =>
        `- [${row.status}] ${row.category} / ${row.label}: score ${row.sourceScore}, ${row.blockerCount} blockers, ${row.reviewCount} review items, ${row.evidenceCount} evidence items. ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Release Packets",
    ...report.releasePackets.map(
      (packet) =>
        `- [${packet.status}] ${packet.kind} / ${packet.label}: ${packet.detail} Evidence: ${packet.evidence.join(" ")}`,
    ),
  ].join("\n");
}

export function getEnterpriseDesktopReleaseOperationsSynthesisJson(
  report: EnterpriseDesktopReleaseOperationsSynthesisReport,
  rows: EnterpriseDesktopReleaseOperationsRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.enterprise-desktop-release-operations-synthesis",
      version: 1,
      generatedAt: report.generatedAt,
      summary: {
        status: report.status,
        desktopReleaseDecision: report.desktopReleaseDecision,
        score: report.score,
        sourceCount: report.sourceCount,
        readyCount: report.readyCount,
        reviewCount: report.reviewCount,
        blockedCount: report.blockedCount,
        blockerCount: report.blockerCount,
        reviewItemCount: report.reviewItemCount,
        evidenceCount: report.evidenceCount,
        releasePacketCount: report.releasePacketCount,
        offlineReadinessEvidenceCount: report.offlineReadinessEvidenceCount,
        adminEvidenceCount: report.adminEvidenceCount,
        rollbackEvidenceCount: report.rollbackEvidenceCount,
        minimumScoreCategory: report.minimumScoreCategory,
      },
      sourceScores: report.sourceScores,
      executiveSummary: report.executiveSummary,
      signoffChecklist: report.signoffChecklist,
      releasePackets: report.releasePackets,
      rows,
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
