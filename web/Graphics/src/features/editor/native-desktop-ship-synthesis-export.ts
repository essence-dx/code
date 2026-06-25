import type {
  NativeDesktopReleasePacket,
  NativeDesktopShipSynthesisReport,
  NativeDesktopShipSynthesisRow,
} from "@/features/editor/native-desktop-ship-synthesis-types";

export function getNativeDesktopShipSynthesisCsv(
  report: NativeDesktopShipSynthesisReport,
  rows: NativeDesktopShipSynthesisRow[] = report.rows,
) {
  const rowHeader: Array<keyof NativeDesktopShipSynthesisRow> = [
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
  const packetHeader: Array<keyof NativeDesktopReleasePacket> = [
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
      "desktop_ship_decision",
      "sources",
      "blockers",
      "review_items",
      "evidence",
      "release_packets",
      "desktop_parity_evidence",
      "rollback_evidence",
      "offline_evidence",
      "minimum_category",
    ].join(","),
    [
      report.score,
      report.status,
      report.desktopShipDecision,
      report.sourceCount,
      report.blockerCount,
      report.reviewItemCount,
      report.evidenceCount,
      report.releasePacketCount,
      report.desktopParityEvidenceCount,
      report.rollbackEvidenceCount,
      report.offlineEvidenceCount,
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
        .map((key) =>
          escapeCsvCell(
            Array.isArray(packet[key]) ? packet[key].join("; ") : packet[key],
          ),
        )
        .join(","),
    ),
  ].join("\n");
}

export function getNativeDesktopShipSynthesisMarkdown(
  report: NativeDesktopShipSynthesisReport,
  rows: NativeDesktopShipSynthesisRow[] = report.rows,
) {
  return [
    "# Native Desktop Ship Synthesis",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Desktop ship decision: ${report.desktopShipDecision}`,
    `Score: ${report.score}`,
    `Sources: ${report.sourceCount}`,
    `Blockers: ${report.blockerCount}`,
    `Review items: ${report.reviewItemCount}`,
    `Release packets: ${report.releasePacketCount}`,
    `Desktop parity evidence: ${report.desktopParityEvidenceCount}`,
    `Rollback evidence: ${report.rollbackEvidenceCount}`,
    `Offline evidence: ${report.offlineEvidenceCount}`,
    `Minimum score category: ${report.minimumScoreCategory}`,
    "",
    "## Executive Summary",
    ...report.executiveSummary.map((item) => `- ${item}`),
    "",
    "## Signoff Checklist",
    ...report.signoffChecklist.map((item) => `- ${item}`),
    "",
    "## Desktop Gate Rows",
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

export function getNativeDesktopShipSynthesisJson(
  report: NativeDesktopShipSynthesisReport,
  rows: NativeDesktopShipSynthesisRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.native-desktop-ship-synthesis",
      version: 1,
      generatedAt: report.generatedAt,
      summary: {
        status: report.status,
        desktopShipDecision: report.desktopShipDecision,
        score: report.score,
        sourceCount: report.sourceCount,
        readyCount: report.readyCount,
        reviewCount: report.reviewCount,
        blockedCount: report.blockedCount,
        blockerCount: report.blockerCount,
        reviewItemCount: report.reviewItemCount,
        evidenceCount: report.evidenceCount,
        releasePacketCount: report.releasePacketCount,
        desktopParityEvidenceCount: report.desktopParityEvidenceCount,
        rollbackEvidenceCount: report.rollbackEvidenceCount,
        offlineEvidenceCount: report.offlineEvidenceCount,
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
  value: boolean | number | string | null | undefined,
) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
