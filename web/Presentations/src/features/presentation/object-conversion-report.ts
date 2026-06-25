import { imageFilterValue, imageOpacityValue } from "./image-corrections"
import { elementImageMask } from "./image-masks"
import { isPptxNativeChartElement } from "./pptx-chart-export"
import { isNativePptxMediaElement } from "./pptx-media-export"
import { shapeKind, shapeKindLabels } from "./shape-formatting"
import type { Deck, PresentationElement, ShapeKind, Slide } from "./types"

export type ObjectConversionStatus = "ready" | "warning" | "attention"

export type ObjectConversionIssueId =
  | "connector-artwork"
  | "custom-shape-artwork"
  | "media-placeholder"
  | "chart-artwork"
  | "icon-svg"
  | "table-grid"
  | "group-flattening"
  | "hidden-skipped"
  | "animation-metadata"
  | "image-effects"
  | "text-layout"

export type ObjectConversionIssue = {
  count: number
  detail: string
  id: ObjectConversionIssueId
  label: string
  severity: Exclude<ObjectConversionStatus, "ready">
  slideTitles: string[]
}

export type ObjectConversionMetric = {
  detail: string
  id: string
  label: string
  value: string
}

export type ObjectConversionReport = {
  attentionCount: number
  issues: ObjectConversionIssue[]
  metrics: ObjectConversionMetric[]
  nativeObjectCount: number
  placeholderObjectCount: number
  simplifiedObjectCount: number
  skippedObjectCount: number
  status: ObjectConversionStatus
  summary: string
  totalObjectCount: number
  warningCount: number
}

type IssueDefinition = Pick<
  ObjectConversionIssue,
  "detail" | "id" | "label" | "severity"
>

type IssueAccumulator = IssueDefinition & {
  count: number
  slideTitles: Set<string>
}

const nativeShapeKinds = new Set<ShapeKind>([
  "rectangle",
  "rounded",
  "ellipse",
  "diamond",
  "triangle",
  "pentagon",
  "hexagon",
  "parallelogram",
  "trapezoid",
  "rightArrow",
  "chevron",
  "plus",
  "star",
  "speechBubble",
  "line",
  "arrow",
  "doubleArrow",
])

const issueDefinitions: Record<ObjectConversionIssueId, IssueDefinition> = {
  "connector-artwork": {
    id: "connector-artwork",
    label: "Connectors need live bindings",
    severity: "warning",
    detail:
      "Elbow and curved connectors export as editable custom Office geometry with route handoff cues; live PowerPoint object-bound connector relationships are not authored yet.",
  },
  "custom-shape-artwork": {
    id: "custom-shape-artwork",
    label: "Custom paths become artwork",
    severity: "warning",
    detail:
      "Shapes outside the native export mapping keep visual fidelity through artwork fallback instead of full Office geometry.",
  },
  "media-placeholder": {
    id: "media-placeholder",
    label: "Some media becomes placeholders",
    severity: "attention",
    detail:
      "Supported inline audio/video exports as native PPTX media; unsupported or unresolved media sources keep a placeholder fallback for PowerPoint review.",
  },
  "chart-artwork": {
    id: "chart-artwork",
    label: "Some charts become artwork",
    severity: "warning",
    detail:
      "Non-rotated charts export as editable Office chart data; rotated charts use artwork fallback to preserve slide appearance.",
  },
  "icon-svg": {
    id: "icon-svg",
    label: "Icons export as SVG",
    severity: "warning",
    detail:
      "Icons remain crisp, but their individual strokes are not converted into separately editable PowerPoint shapes.",
  },
  "table-grid": {
    id: "table-grid",
    label: "Rotated tables flatten",
    severity: "warning",
    detail:
      "Non-rotated tables export as native Office tables with merged-cell metadata; rotated tables use per-cell shapes to preserve appearance.",
  },
  "group-flattening": {
    id: "group-flattening",
    label: "Groups are flattened",
    severity: "warning",
    detail:
      "Grouped objects export as separate objects until native group export and group-level edit handles are added.",
  },
  "hidden-skipped": {
    id: "hidden-skipped",
    label: "Hidden objects are skipped",
    severity: "attention",
    detail:
      "Hidden objects are intentionally left out of the exported PowerPoint handoff.",
  },
  "animation-metadata": {
    id: "animation-metadata",
    label: "Animations need review",
    severity: "warning",
    detail:
      "Supported object entrance effects export as native PPTX timing XML with speaker-note cues; advanced PowerPoint animation variants still need review.",
  },
  "image-effects": {
    id: "image-effects",
    label: "Image effects are simplified",
    severity: "warning",
    detail:
      "Masks, crop offsets, opacity, and color corrections may need visual review after exporting.",
  },
  "text-layout": {
    id: "text-layout",
    label: "Text layout is flattened",
    severity: "warning",
    detail:
      "Lists and multi-column text preserve appearance but may not remain native editable Office paragraph structures.",
  },
}

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralLabel}`
}

function slideLabel(slide: Slide, index: number) {
  return slide.title.trim() || `Slide ${index + 1}`
}

function addIssue(
  issues: Map<ObjectConversionIssueId, IssueAccumulator>,
  id: ObjectConversionIssueId,
  slideTitle: string,
) {
  const definition = issueDefinitions[id]
  const issue =
    issues.get(id) ??
    ({
      ...definition,
      count: 0,
      slideTitles: new Set<string>(),
    } satisfies IssueAccumulator)

  issue.count += 1
  issue.slideTitles.add(slideTitle)
  issues.set(id, issue)
}

function hasSimplifiedImageEffect(element: PresentationElement) {
  if (element.type !== "image") return false

  return Boolean(
    imageFilterValue(element) ||
      imageOpacityValue(element) !== 1 ||
      elementImageMask(element) !== "rectangle" ||
      element.imagePositionX !== 50 ||
      element.imagePositionY !== 50,
  )
}

function hasSimplifiedTextLayout(element: PresentationElement) {
  return (
    (element.type === "title" || element.type === "text") &&
    (element.listStyle !== "none" || element.textColumns > 1)
  )
}

function isConnectorShape(kind: ShapeKind) {
  return kind === "elbowConnector" || kind === "curvedConnector"
}

function isNativeShape(kind: ShapeKind) {
  return nativeShapeKinds.has(kind)
}

function conversionClass(element: PresentationElement) {
  if (element.hidden) return "skipped" as const
  if (element.type === "video" || element.type === "audio") {
    return isNativePptxMediaElement(element)
      ? ("native" as const)
      : ("placeholder" as const)
  }

  if (
    (element.type === "chart" && !isPptxNativeChartElement(element)) ||
    element.type === "icon" ||
    (element.type === "table" && Boolean(element.rotation)) ||
    hasSimplifiedImageEffect(element) ||
    hasSimplifiedTextLayout(element)
  ) {
    return "simplified" as const
  }

  if (element.type === "shape") {
    const kind = shapeKind(element)

    if (isConnectorShape(kind) || !isNativeShape(kind)) {
      return "simplified" as const
    }
  }

  return "native" as const
}

function recordConversionIssues(
  element: PresentationElement,
  slideTitle: string,
  issues: Map<ObjectConversionIssueId, IssueAccumulator>,
) {
  if (element.hidden) {
    addIssue(issues, "hidden-skipped", slideTitle)
    return
  }

  if (element.animation !== "none") {
    addIssue(issues, "animation-metadata", slideTitle)
  }

  if (element.groupId) {
    addIssue(issues, "group-flattening", slideTitle)
  }

  if (element.type === "video" || element.type === "audio") {
    if (!isNativePptxMediaElement(element)) {
      addIssue(issues, "media-placeholder", slideTitle)
    }
  }

  if (element.type === "chart" && !isPptxNativeChartElement(element)) {
    addIssue(issues, "chart-artwork", slideTitle)
  }

  if (element.type === "icon") {
    addIssue(issues, "icon-svg", slideTitle)
  }

  if (element.type === "table" && element.rotation) {
    addIssue(issues, "table-grid", slideTitle)
  }

  if (hasSimplifiedImageEffect(element)) {
    addIssue(issues, "image-effects", slideTitle)
  }

  if (hasSimplifiedTextLayout(element)) {
    addIssue(issues, "text-layout", slideTitle)
  }

  if (element.type === "shape") {
    const kind = shapeKind(element)

    if (isConnectorShape(kind)) {
      addIssue(issues, "connector-artwork", slideTitle)
    } else if (!isNativeShape(kind)) {
      addIssue(issues, "custom-shape-artwork", slideTitle)
    }
  }
}

function finalizeIssues(issues: Map<ObjectConversionIssueId, IssueAccumulator>) {
  return Array.from(issues.values())
    .map(
      (issue): ObjectConversionIssue => ({
        count: issue.count,
        detail: issue.detail,
        id: issue.id,
        label: issue.label,
        severity: issue.severity,
        slideTitles: Array.from(issue.slideTitles).slice(0, 4),
      }),
    )
    .sort((first, second) => {
      if (first.severity !== second.severity) {
        return first.severity === "attention" ? -1 : 1
      }

      return first.label.localeCompare(second.label)
    })
}

function reportStatus(issues: ObjectConversionIssue[]): ObjectConversionStatus {
  if (issues.some((issue) => issue.severity === "attention")) return "attention"
  if (issues.length) return "warning"

  return "ready"
}

function reportSummary(
  status: ObjectConversionStatus,
  nativeObjectCount: number,
  simplifiedObjectCount: number,
  placeholderObjectCount: number,
  skippedObjectCount: number,
) {
  if (status === "ready") {
    return `${plural(nativeObjectCount, "object")} should remain PowerPoint-friendly after export.`
  }

  if (status === "attention") {
    return `${plural(
      placeholderObjectCount + skippedObjectCount,
      "object",
    )} need attention and ${plural(
      simplifiedObjectCount,
      "object",
    )} export with simplified editability.`
  }

  return `${plural(
    simplifiedObjectCount,
    "object",
  )} export with simplified PowerPoint editability.`
}

function shapeCatalogDetail(deck: Deck) {
  const usedShapeKinds = new Set<ShapeKind>()

  deck.slides.forEach((slide) => {
    slide.elements.forEach((element) => {
      if (element.type === "shape" && !element.hidden) {
        usedShapeKinds.add(shapeKind(element))
      }
    })
  })

  if (!usedShapeKinds.size) return "No visible shapes in this deck"

  const labels = Array.from(usedShapeKinds)
    .slice(0, 4)
    .map((kind) => shapeKindLabels[kind])

  return `${labels.join(", ")}${usedShapeKinds.size > 4 ? ", ..." : ""}`
}

export function objectConversionReport(deck: Deck): ObjectConversionReport {
  const issues = new Map<ObjectConversionIssueId, IssueAccumulator>()
  let nativeObjectCount = 0
  let placeholderObjectCount = 0
  let simplifiedObjectCount = 0
  let skippedObjectCount = 0
  let totalObjectCount = 0

  deck.slides.forEach((slide, slideIndex) => {
    const title = slideLabel(slide, slideIndex)

    slide.elements.forEach((element) => {
      totalObjectCount += 1
      recordConversionIssues(element, title, issues)

      const conversion = conversionClass(element)
      if (conversion === "native") nativeObjectCount += 1
      if (conversion === "simplified") simplifiedObjectCount += 1
      if (conversion === "placeholder") placeholderObjectCount += 1
      if (conversion === "skipped") skippedObjectCount += 1
    })
  })

  const finalizedIssues = finalizeIssues(issues)
  const status = reportStatus(finalizedIssues)
  const attentionCount = finalizedIssues.filter(
    (issue) => issue.severity === "attention",
  ).length
  const warningCount = finalizedIssues.filter(
    (issue) => issue.severity === "warning",
  ).length

  return {
    attentionCount,
    issues: finalizedIssues,
    metrics: [
      {
        id: "native",
        label: "Native-like",
        value: String(nativeObjectCount),
        detail: "Expected to stay directly editable",
      },
      {
        id: "simplified",
        label: "Simplified",
        value: String(simplifiedObjectCount),
        detail: "Keeps appearance with reduced editability",
      },
      {
        id: "placeholder",
        label: "Placeholders",
        value: String(placeholderObjectCount),
        detail: "Requires manual replacement in PowerPoint",
      },
      {
        id: "shape-catalog",
        label: "Shape presets",
        value: shapeCatalogDetail(deck),
        detail: "Visible Essence presets used in this deck",
      },
    ],
    nativeObjectCount,
    placeholderObjectCount,
    simplifiedObjectCount,
    skippedObjectCount,
    status,
    summary: reportSummary(
      status,
      nativeObjectCount,
      simplifiedObjectCount,
      placeholderObjectCount,
      skippedObjectCount,
    ),
    totalObjectCount,
    warningCount,
  }
}
