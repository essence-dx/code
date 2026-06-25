import type {
  PptxExportPreflightMetric,
  PptxExportPreflightReport,
} from "./pptx-export-preflight"

export type PptxExportPreflightSnapshotSection = {
  metrics: PptxExportPreflightMetric[]
  title: string
}

const snapshotSectionDefinitions = [
  {
    metricIds: [
      "compatibility-repair-actions",
      "office-interop-actions",
      "linked-data-workflows",
      "linked-data-workflow-steps",
      "linked-chart-data-review",
      "chart-editability-repairs",
      "table-preset-mapping",
      "table-structure-readiness",
      "linked-chart-repairs",
      "odp-table-preset-repairs",
      "theme-file-repairs",
    ],
    title: "Compatibility repair plan",
  },
  {
    metricIds: [
      "native-office-package-parity",
      "smartart-conversion-plan",
      "theme-application-path",
      "master-layout-relationship-checks",
      "native-office-package-actions",
      "native-package-parts",
      "native-package-merge-parts",
    ],
    title: "Native Office package parity",
  },
  {
    metricIds: [
      "native-master-placeholders",
      "native-layout-candidates",
      "native-master-xml-parts",
      "native-master-authoring",
      "master-layout-xml-parts",
      "master-layout-xml-placeholders",
      "native-master-handoffs",
      "theme-file-handoff",
      "theme-package-parts",
      "theme-package-file",
      "theme-package-xml-parts",
      "theme-package-xml-size",
      "placeholder-inheritance",
      "layout-placeholder-slots",
      "theme-fonts",
      "theme-colors",
    ],
    title: "Native master/layout readiness",
  },
  {
    metricIds: [
      "pptx-comment-threads",
      "pptx-comment-replies",
      "manual-comment-handoffs",
      "pptx-comment-anchors",
      "pptx-comment-xml-parts",
      "pptx-comment-xml-comments",
    ],
    title: "Review comment XML",
  },
  {
    metricIds: [
      "diagram-layouts",
      "diagram-template-coverage",
      "diagram-conversion-groups",
    ],
    title: "Diagram authoring",
  },
  {
    metricIds: [
      "office-action-animation-objects",
      "office-action-catalog",
      "office-action-blockers",
      "native-action-settings",
      "action-xml-parts",
      "action-xml-links",
      "action-links",
      "office-animation-targets",
      "office-advanced-animation-xml",
      "office-animation-triggers",
      "office-custom-motion-paths",
      "office-emphasis-handoffs",
      "office-exit-handoffs",
      "office-motion-handoffs",
      "office-animation-target-reviews",
      "animation-kinds",
    ],
    title: "Action and animation metadata",
  },
  {
    metricIds: [
      "editable-charts",
      "chart-fallbacks",
      "native-tables",
      "table-structure-readiness",
      "merged-table-cells",
      "office-table-styles",
      "cell-border-variants",
    ],
    title: "Chart and table fidelity",
  },
  {
    metricIds: [
      "native-media",
      "resolved-media",
      "media-fallbacks",
      "media-source-candidates",
      "media-caption-cues",
      "media-trim-handoffs",
    ],
    title: "Media packaging decisions",
  },
] satisfies Array<{ metricIds: string[]; title: string }>

function safeFileStem(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "deck"
  )
}

export function pptxExportPreflightSnapshotFileName(
  deckTitle: string,
  date = new Date(),
) {
  const day = date.toISOString().slice(0, 10)
  return `${safeFileStem(deckTitle)}-${day}-pptx-preflight.txt`
}

export function pptxExportPreflightSnapshotSections(
  report: PptxExportPreflightReport,
): PptxExportPreflightSnapshotSection[] {
  const metrics = new Map(report.metrics.map((metric) => [metric.id, metric]))

  return snapshotSectionDefinitions.flatMap((section) => {
    const sectionMetrics = section.metricIds.flatMap((metricId) => {
      const metric = metrics.get(metricId)

      return metric ? [metric] : []
    })

    return sectionMetrics.length
      ? [
          {
            metrics: sectionMetrics,
            title: section.title,
          },
        ]
      : []
  })
}

export function serializePptxExportPreflightSnapshot(
  report: PptxExportPreflightReport,
  deckTitle: string,
) {
  const reviewSections = pptxExportPreflightSnapshotSections(report)
  const lines = [
    "PPTX preflight snapshot",
    `Deck: ${deckTitle.trim() || "Untitled deck"}`,
    `Status: ${report.status}`,
    `Summary: ${report.summary}`,
    `Attention: ${report.attentionCount}`,
    `Warnings: ${report.warningCount}`,
    "",
    "Metrics",
    ...report.metrics.map(
      (metric) => `- ${metric.label}: ${metric.value} (${metric.detail})`,
    ),
    "",
    "Review focus",
    ...(reviewSections.length
      ? reviewSections.flatMap((section) => [
          `${section.title}:`,
          ...section.metrics.map(
            (metric) =>
              `- ${metric.label}: ${metric.value} (${metric.detail})`,
          ),
        ])
      : ["- None"]),
    "",
    "Issues",
    ...(report.issues.length
      ? report.issues.map((issue) => {
          const slides = issue.slideTitles.length
            ? ` Slides: ${issue.slideTitles.join(", ")}.`
            : ""
          const repairs = issue.repairSteps?.length
            ? ` Repairs: ${issue.repairSteps.join(" | ")}.`
            : ""

          return `- [${issue.severity}] ${issue.label}: ${issue.count}. ${issue.detail}${slides}${repairs}`
        })
      : ["- None"]),
  ]

  return `${lines.join("\n")}\n`
}
