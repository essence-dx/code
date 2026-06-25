import {
  diagramTemplateById,
  diagramTemplateIdFromGroupId,
  diagramTemplates,
  type DiagramTemplateId,
} from "./diagram-templates"
import type { Deck, PresentationElement, Slide } from "./types"

export type DiagramAuthoringMetric = {
  detail: string
  id: string
  label: string
  value: string
}

export type DiagramAuthoringItem = {
  elementCount: number
  groupId: string
  officeLayout: string
  shapeCount: number
  slideTitle: string
  templateId: DiagramTemplateId
  templateLabel: string
  textCount: number
}

export type DiagramAuthoringReport = {
  catalogTemplateCount: number
  editableGroupCount: number
  items: DiagramAuthoringItem[]
  metrics: DiagramAuthoringMetric[]
  status: "ready" | "empty"
  summary: string
  templateCoverageCount: number
  totalDiagramCount: number
}

function slideLabel(slide: Slide, index: number) {
  return slide.title.trim() || `Slide ${index + 1}`
}

function visibleDiagramElements(elements: PresentationElement[]) {
  return elements.filter(
    (element) => !element.hidden && diagramTemplateIdFromGroupId(element.groupId),
  )
}

function diagramItem(
  groupId: string,
  elements: PresentationElement[],
  slideTitle: string,
): DiagramAuthoringItem | null {
  const templateId = diagramTemplateIdFromGroupId(groupId)
  if (!templateId) return null

  const template = diagramTemplateById(templateId)
  if (!template) return null

  return {
    elementCount: elements.length,
    groupId,
    officeLayout: template.officeLayout,
    shapeCount: elements.filter((element) => element.type === "shape").length,
    slideTitle,
    templateId,
    templateLabel: template.label,
    textCount: elements.filter(
      (element) => element.type === "text" || element.type === "title",
    ).length,
  }
}

export function deckDiagramAuthoringReport(
  deck: Deck,
): DiagramAuthoringReport {
  const items: DiagramAuthoringItem[] = []

  deck.slides.forEach((slide, slideIndex) => {
    const groupedElements = new Map<string, PresentationElement[]>()

    visibleDiagramElements(slide.elements).forEach((element) => {
      groupedElements.set(element.groupId, [
        ...(groupedElements.get(element.groupId) ?? []),
        element,
      ])
    })

    groupedElements.forEach((elements, groupId) => {
      const item = diagramItem(groupId, elements, slideLabel(slide, slideIndex))
      if (item) items.push(item)
    })
  })

  const coveredTemplates = new Set(items.map((item) => item.templateId))
  const editableGroupCount = items.filter(
    (item) => item.shapeCount > 0 && item.textCount > 0,
  ).length
  const summary = items.length
    ? `${items.length} editable diagram group${
        items.length === 1 ? "" : "s"
      } carry PowerPoint layout metadata.`
    : "No authored diagram groups in this deck."

  return {
    catalogTemplateCount: diagramTemplates.length,
    editableGroupCount,
    items,
    metrics: [
      {
        id: "diagram-layouts",
        label: "Diagram layouts",
        value: String(items.length),
        detail: summary,
      },
      {
        id: "diagram-template-coverage",
        label: "Diagram templates",
        value: `${coveredTemplates.size}/${diagramTemplates.length}`,
        detail: coveredTemplates.size
          ? Array.from(coveredTemplates).join(", ")
          : "No diagram templates used",
      },
      {
        id: "diagram-conversion-groups",
        label: "Diagram conversion",
        value: `${editableGroupCount}/${items.length}`,
        detail:
          "Recognized groups keep editable shapes, text slots, and target Office layout names for future SmartArt conversion.",
      },
    ],
    status: items.length ? "ready" : "empty",
    summary,
    templateCoverageCount: coveredTemplates.size,
    totalDiagramCount: items.length,
  }
}

export function serializeDiagramAuthoringReport(report: DiagramAuthoringReport) {
  const lines = [
    "Diagram authoring report",
    `Status: ${report.status}`,
    `Summary: ${report.summary}`,
    `Templates: ${report.templateCoverageCount}/${report.catalogTemplateCount}`,
    "",
    "Diagrams",
    ...(report.items.length
      ? report.items.map(
          (item) =>
            `- ${item.slideTitle}: ${item.templateLabel} (${item.officeLayout}); ${item.shapeCount} shape(s), ${item.textCount} text slot(s), group ${item.groupId}`,
        )
      : ["- None"]),
  ]

  return `${lines.join("\n")}\n`
}
