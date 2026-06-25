import type {
  PrototypeInteractionInspectorReport,
  PrototypeInteractionInspectorRow,
} from "@/features/editor/prototype-interaction-inspector-types";

export function getPrototypeInteractionInspectorCsv(
  report: PrototypeInteractionInspectorReport,
  rows: PrototypeInteractionInspectorRow[] = report.rows,
) {
  return [
    [
      "status",
      "category",
      "page",
      "layer",
      "target",
      "trigger",
      "action",
      "transition",
      "durationMs",
      "scrollBehavior",
      "overlayPosition",
      "deviceFrame",
      "actionLabel",
      "detail",
      "routeEvidence",
    ],
    ...rows.map((row) => [
      row.status,
      row.category,
      row.pageName,
      row.layerName ?? "",
      row.targetPageName ?? row.targetPageId ?? "",
      row.trigger,
      row.prototypeAction,
      row.transition,
      row.durationMs,
      row.scrollBehavior,
      row.overlayPosition,
      row.deviceFrame,
      row.actionLabel,
      row.detail,
      row.routeEvidence,
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function getPrototypeInteractionInspectorMarkdown(
  report: PrototypeInteractionInspectorReport,
  rows: PrototypeInteractionInspectorRow[] = report.rows,
) {
  const lines = [
    "# Prototype Interaction Inspector",
    "",
    `Score: ${report.score}`,
    `Pages: ${report.pageCount}`,
    `Prototype route pages: ${report.routePageCount}`,
    `Hotspots: ${report.hotspotCount}`,
    `Start pages: ${report.startPageCount}`,
    `Ready rows: ${report.readyCount}`,
    `Review rows: ${report.reviewCount}`,
    `Blocked rows: ${report.blockedCount}`,
    `Repairable rows: ${report.repairableCount}`,
    `Overlay review rows: ${report.overlayReviewCount}`,
    `Scroll review rows: ${report.scrollReviewCount}`,
    `Transition review rows: ${report.transitionReviewCount}`,
    `Unsupported trigger rows: ${report.unsupportedTriggerCount}`,
    `Presentation route issue rows: ${report.presentationRouteIssueCount}`,
    "",
    "## Route Evidence",
    "",
    "- Shared prototype route: `/share/[token]/prototype`",
    "- Browser replay currently supports clickable hotspot activation, navigation transitions, overlays, scroll reset or preserve behavior, scroll lock for overlays, disabled broken hotspots, and manual page rail navigation.",
    "",
    "## Review Queue",
    "",
  ];

  if (rows.length === 0) {
    lines.push("- No prototype interaction rows match this queue.");
  }

  for (const row of rows) {
    const layer = row.layerName ? ` / ${row.layerName}` : "";
    lines.push(
      `- ${row.status.toUpperCase()} - ${row.pageName}${layer}: ${row.label}. ${row.detail} Action: ${row.actionLabel}. Evidence: ${row.routeEvidence}`,
    );
  }

  return lines.join("\n");
}

function formatCsvCell(value: string | number | undefined) {
  const text = String(value ?? "");

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
