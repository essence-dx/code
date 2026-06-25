import type {
  DesktopSupportEscalation,
  DesktopSupportHandoffPacket,
  DesktopSupportHandoffRow,
  DesktopSupportHandoffSynthesisReport,
} from "@/features/editor/desktop-support-handoff-synthesis-types";

export function getDesktopSupportHandoffSynthesisCsv(
  report: DesktopSupportHandoffSynthesisReport,
  rows: DesktopSupportHandoffRow[] = report.rows,
) {
  const rowHeader: Array<keyof DesktopSupportHandoffRow> = [
    "id",
    "status",
    "category",
    "label",
    "detail",
    "sourceScore",
    "blockerCount",
    "reviewCount",
    "packetCount",
    "recommendation",
  ];
  const packetHeader: Array<keyof DesktopSupportHandoffPacket> = [
    "id",
    "status",
    "category",
    "label",
    "detail",
    "evidenceCount",
  ];
  const escalationHeader: Array<keyof DesktopSupportEscalation> = [
    "id",
    "status",
    "category",
    "label",
    "detail",
    "ownerHint",
  ];

  return [
    [
      "score",
      "status",
      "decision",
      "sources",
      "blockers",
      "review_items",
      "packets",
      "escalations",
      "minimum_score_category",
    ].join(","),
    [
      report.score,
      report.status,
      report.decision,
      report.sourceCount,
      report.blockerCount,
      report.reviewItemCount,
      report.packetCount,
      report.escalationCount,
      report.minimumScoreCategory,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    rowHeader.join(","),
    ...rows.map((row) =>
      rowHeader.map((key) => escapeCsvCell(row[key])).join(","),
    ),
    "",
    packetHeader.join(","),
    ...report.handoffPackets.map((packet) =>
      packetHeader.map((key) => escapeCsvCell(packet[key])).join(","),
    ),
    "",
    escalationHeader.join(","),
    ...report.escalationQueue.map((item) =>
      escalationHeader.map((key) => escapeCsvCell(item[key])).join(","),
    ),
  ].join("\n");
}

export function getDesktopSupportHandoffSynthesisMarkdown(
  report: DesktopSupportHandoffSynthesisReport,
  rows: DesktopSupportHandoffRow[] = report.rows,
) {
  return [
    "# Desktop Support Handoff Synthesis",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Decision: ${report.decision}`,
    `Score: ${report.score}`,
    `Blockers: ${report.blockerCount}`,
    `Review items: ${report.reviewItemCount}`,
    `Packets: ${report.packetCount}`,
    "",
    "This support gate joins update cohorts, crash/performance support bundles, offline workspace health, plugin telemetry, and enterprise release operations.",
    "",
    "## Executive Summary",
    ...report.executiveSummary.map((item) => `- ${item}`),
    "",
    "## Signoff Checklist",
    ...report.signoffChecklist.map((item) => `- ${item}`),
    "",
    "## Review Queue",
    ...rows.map(
      (row) =>
        `- [${row.status}] ${row.category} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Escalation Queue",
    ...(report.escalationQueue.length > 0
      ? report.escalationQueue.map(
          (item) =>
            `- [${item.status}] ${item.category} / ${item.label}: ${item.detail} Owner: ${item.ownerHint}`,
        )
      : ["- No support handoff escalations."]),
  ].join("\n");
}

export function getDesktopSupportHandoffSynthesisJson(
  report: DesktopSupportHandoffSynthesisReport,
  rows: DesktopSupportHandoffRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.desktop-support-handoff-synthesis",
      version: 1,
      generatedAt: report.generatedAt,
      summary: {
        status: report.status,
        decision: report.decision,
        score: report.score,
        sourceCount: report.sourceCount,
        blockerCount: report.blockerCount,
        reviewItemCount: report.reviewItemCount,
        packetCount: report.packetCount,
        escalationCount: report.escalationCount,
        readyCount: report.readyCount,
        reviewCount: report.reviewCount,
        blockedCount: report.blockedCount,
        minimumScoreCategory: report.minimumScoreCategory,
      },
      rows,
      handoffPackets: report.handoffPackets,
      escalationQueue: report.escalationQueue,
      executiveSummary: report.executiveSummary,
      signoffChecklist: report.signoffChecklist,
      sourceScores: {
        updateCohorts: report.desktopUpdateCohorts.score,
        crashPerformance: report.crashPerformanceSupport.score,
        offlineHealth: report.offlineWorkspaceHealth.score,
        pluginTelemetry: report.pluginTelemetryDigest.score,
        releaseOperations: report.enterpriseReleaseOperations.score,
      },
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
