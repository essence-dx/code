import { deckActionButtonHandoffReport } from "./action-button-handoff"
import { compatibilityRepairReport } from "./compatibility-repair-report"
import { imageFilterValue, imageOpacityValue } from "./image-corrections"
import { elementImageMask } from "./image-masks"
import { linkedDataRepairWorkflowReport } from "./linked-data-repair-workflows"
import { deckMediaHandoffReport } from "./media-handoff"
import { nativeOfficePackageParityReport } from "./native-office-package-parity"
import type { OdpImportPreflightReport } from "./odp-import-preflight"
import { officeActionAnimationReviewPlan } from "./office-action-animation-review"
import { officeInteroperabilityRepairPlan } from "./office-interoperability-repair-plan"
import {
  deckAnimationHandoffReport,
  slideAnimationHandoffCues,
} from "./pptx-animation-handoff"
import { pptxActionXmlAuthoring } from "./pptx-action-xml-authoring"
import { pptxCommentXmlAuthoring } from "./pptx-comment-xml-authoring"
import { isPptxNativeChartElement } from "./pptx-chart-export"
import { pptxCommentThreadPlan } from "./pptx-comment-thread-plan"
import { slideConnectorHandoffCues } from "./pptx-connector-handoff"
import { nativePptxMasterLayoutPlan } from "./pptx-master-layout-export"
import {
  deckPptxMediaExportReport,
  pptxMediaExportDecision,
  type PptxMediaExportOptions,
} from "./pptx-media-export"
import { slideTransitionHandoffCue } from "./pptx-transition-handoff"
import { masterHasVisibleContent } from "./slide-master"
import { tableCellMerges, tableCellStyles } from "./table-formatting"
import type { Deck, PresentationElement, Slide } from "./types"

export type PptxExportPreflightSeverity = "ready" | "warning" | "attention"

export type PptxExportPreflightIssueId =
  | "action-links"
  | "chart-editability"
  | "comments"
  | "compatibility-repairs"
  | "groups"
  | "hidden-objects"
  | "image-effects"
  | "master-layouts"
  | "master-overlays"
  | "media-placeholders"
  | "object-animations"
  | "slide-transitions"
  | "text-columns"
  | "text-lists"

export type PptxExportPreflightIssue = {
  count: number
  detail: string
  id: PptxExportPreflightIssueId
  label: string
  repairSteps?: string[]
  severity: Exclude<PptxExportPreflightSeverity, "ready">
  slideTitles: string[]
}

export type PptxExportPreflightMetric = {
  detail: string
  id: string
  label: string
  value: string
}

export type PptxExportPreflightReport = {
  attentionCount: number
  issues: PptxExportPreflightIssue[]
  metrics: PptxExportPreflightMetric[]
  status: PptxExportPreflightSeverity
  summary: string
  warningCount: number
}

export type PptxExportPreflightOptions = PptxMediaExportOptions & {
  odpImportReport?: OdpImportPreflightReport | null
}

type IssueDefinition = Pick<
  PptxExportPreflightIssue,
  "detail" | "id" | "label" | "severity"
>

type IssueAccumulator = IssueDefinition & {
  count: number
  slideTitles: Set<string>
}

const issueDefinitions: Record<PptxExportPreflightIssueId, IssueDefinition> = {
  "action-links": {
    id: "action-links",
    label: "Some actions need review",
    severity: "warning",
    detail:
      "Internal slide jumps and external hyperlinks export as PowerPoint actions when targets are valid; broken or self-targeted actions need review.",
  },
  "chart-editability": {
    id: "chart-editability",
    label: "Some charts become rendered artwork",
    severity: "warning",
    detail:
      "Non-rotated charts export as editable Office chart data; rotated charts keep appearance as artwork until native chart rotation is supported.",
  },
  comments: {
    id: "comments",
    label: "Comments move to notes",
    severity: "warning",
    detail:
      "Open comments are copied into speaker notes instead of native PowerPoint comment threads.",
  },
  "compatibility-repairs": {
    id: "compatibility-repairs",
    label: "Compatibility repair plan available",
    severity: "warning",
    detail:
      "Repair actions are available for linked charts, ODP table presets, or Office theme-file handoff gaps.",
  },
  groups: {
    id: "groups",
    label: "Groups are flattened",
    severity: "warning",
    detail:
      "Grouped objects export as individual PowerPoint objects until native group export is added.",
  },
  "hidden-objects": {
    id: "hidden-objects",
    label: "Hidden objects are skipped",
    severity: "warning",
    detail: "Hidden slide objects are intentionally omitted from the PPTX file.",
  },
  "image-effects": {
    id: "image-effects",
    label: "Image effects are simplified",
    severity: "warning",
    detail:
      "Crop positions, opacity, color corrections, and non-rectangular masks may be simplified in PPTX.",
  },
  "master-overlays": {
    id: "master-overlays",
    label: "Master content is flattened",
    severity: "warning",
    detail:
      "Footer, date, and slide-number master content renders on slides instead of native master placeholders.",
  },
  "master-layouts": {
    id: "master-layouts",
    label: "Some master layouts need handoff",
    severity: "warning",
    detail:
      "Reusable master layout presets are analyzed for native Office placeholders; unsupported slot types remain Essence metadata for review.",
  },
  "media-placeholders": {
    id: "media-placeholders",
    label: "Some media becomes placeholders",
    severity: "attention",
    detail:
      "Supported inline audio/video exports as native PPTX media; unsupported, remote, blob, local-reference, or rotated media keeps a labeled fallback with handoff notes.",
  },
  "object-animations": {
    id: "object-animations",
    label: "Animations need review",
    severity: "warning",
    detail:
      "Supported effects with stable Office targets export as native PPTX timing XML with speaker-note handoff; emphasis, motion paths, and target-ambiguous variants still need review.",
  },
  "slide-transitions": {
    id: "slide-transitions",
    label: "Slide timings need review",
    severity: "warning",
    detail:
      "Supported slide transitions and auto-advance timings export as native PPTX XML with speaker-note handoff; sounds, morph, and advanced variants still need review.",
  },
  "text-columns": {
    id: "text-columns",
    label: "Text columns split",
    severity: "warning",
    detail:
      "Multi-column text exports as separate text boxes to preserve layout.",
  },
  "text-lists": {
    id: "text-lists",
    label: "Lists are flattened",
    severity: "warning",
    detail:
      "Bullet and numbered lists export as visible markers instead of native PowerPoint list formatting.",
  },
}

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralLabel}`
}

function slideLabel(slide: Slide, index: number) {
  return slide.title.trim() || `Slide ${index + 1}`
}

function visibleElements(slide: Slide) {
  return slide.elements.filter((element) => !element.hidden)
}

function hasImageEffectSimplification(element: PresentationElement) {
  if (element.type !== "image") return false

  return Boolean(
    imageFilterValue(element) ||
      imageOpacityValue(element) !== 1 ||
      elementImageMask(element) === "diamond" ||
      element.imagePositionX !== 50 ||
      element.imagePositionY !== 50,
  )
}

function addIssue(
  issues: Map<PptxExportPreflightIssueId, IssueAccumulator>,
  id: PptxExportPreflightIssueId,
  slideTitle: string,
  count = 1,
) {
  const definition = issueDefinitions[id]
  const issue =
    issues.get(id) ??
    ({
      ...definition,
      count: 0,
      slideTitles: new Set<string>(),
    } satisfies IssueAccumulator)

  issue.count += count
  issue.slideTitles.add(slideTitle)
  issues.set(id, issue)
}

function preflightStatus(issues: PptxExportPreflightIssue[]) {
  if (issues.some((issue) => issue.severity === "attention")) return "attention"
  if (issues.length) return "warning"

  return "ready"
}

function preflightSummary(
  status: PptxExportPreflightSeverity,
  attentionCount: number,
  warningCount: number,
) {
  if (status === "ready") {
    return "No known PPTX export compatibility gaps detected."
  }

  if (status === "attention") {
    return `${plural(attentionCount, "lossy export blocker")} and ${plural(
      warningCount,
      "review item",
    )} should be checked before sending the PPTX.`
  }

  return `${plural(warningCount, "PPTX review item")} should be checked after export.`
}

function finalizeIssues(
  issues: Map<PptxExportPreflightIssueId, IssueAccumulator>,
) {
  return Array.from(issues.values())
    .map(
      (issue): PptxExportPreflightIssue => ({
        count: issue.count,
        detail: issue.detail,
        id: issue.id,
        label: issue.label,
        severity: issue.severity,
        slideTitles: Array.from(issue.slideTitles).slice(0, 4),
      }),
    )
    .sort(compareIssues)
}

function compareIssues(
  first: PptxExportPreflightIssue,
  second: PptxExportPreflightIssue,
) {
  if (first.severity !== second.severity) {
    return first.severity === "attention" ? -1 : 1
  }

  return first.label.localeCompare(second.label)
}

export function pptxExportPreflight(
  deck: Deck,
  options?: PptxExportPreflightOptions,
): PptxExportPreflightReport {
  const issueMap = new Map<PptxExportPreflightIssueId, IssueAccumulator>()
  let animationCueCount = 0
  let connectorRouteCount = 0
  let editableChartCount = 0
  let mergedTableCellCount = 0
  let nativeTableCount = 0
  let officeTableStyleCount = 0
  let selectedCellBorderCount = 0
  let staticChartCount = 0
  let transitionCueCount = 0
  let visibleObjectCount = 0
  const animationReport = deckAnimationHandoffReport(deck)
  const mediaReport = deckMediaHandoffReport(deck)
  const mediaExportReport = deckPptxMediaExportReport(deck, options)
  const masterLayoutPlan = nativePptxMasterLayoutPlan(deck)
  const nativeOfficeParity = nativeOfficePackageParityReport(deck)
  const masterXmlPlan = nativeOfficeParity.masterXmlPlan
  const actionReport = deckActionButtonHandoffReport(deck)
  const actionXmlAuthoring = pptxActionXmlAuthoring(deck)
  const commentPlan = pptxCommentThreadPlan(deck)
  const commentXmlAuthoring = pptxCommentXmlAuthoring(deck)
  const nativePackageAuthoring = nativeOfficeParity.packageAuthoring
  const diagramAuthoringReport = nativeOfficeParity.diagramReport
  const officeMetadataPlan = officeActionAnimationReviewPlan(deck)
  const repairReport = compatibilityRepairReport(deck, {
    odpImportReport: options?.odpImportReport,
  })
  const interopRepairPlan = officeInteroperabilityRepairPlan(deck, {
    odpImportReport: options?.odpImportReport,
  })
  const linkedDataWorkflow = linkedDataRepairWorkflowReport(deck, {
    odpImportReport: options?.odpImportReport,
  })
  const repairItemById = new Map(
    repairReport.items.map((item) => [item.id, item]),
  )
  const interopActionById = new Map(
    interopRepairPlan.actions.map((action) => [action.id, action]),
  )
  const nativeOfficeSectionById = new Map(
    nativeOfficeParity.sections.map((section) => [section.id, section]),
  )
  const nativeOfficeActionById = new Map(
    nativeOfficeParity.actions.map((action) => [action.id, action]),
  )
  const firstLinkedDataWorkflowStep = linkedDataWorkflow.steps.find(
    (step) => step.status !== "ready",
  )

  deck.slides.forEach((slide, slideIndex) => {
    const title = slideLabel(slide, slideIndex)
    animationCueCount += slideAnimationHandoffCues(slide).length
    connectorRouteCount += slideConnectorHandoffCues(slide).length
    if (slideTransitionHandoffCue(slide)) {
      transitionCueCount += 1
    }
    const hiddenCount = slide.elements.filter((element) => element.hidden).length
    const openCommentCount = (slide.comments ?? []).filter(
      (comment) => !comment.resolved,
    ).length

    visibleObjectCount += visibleElements(slide).length

    if (hiddenCount) {
      addIssue(issueMap, "hidden-objects", title, hiddenCount)
    }

    if (openCommentCount) {
      addIssue(issueMap, "comments", title, openCommentCount)
    }

    if (slide.transition !== "none" || slide.autoAdvanceAfterMs > 0) {
      addIssue(issueMap, "slide-transitions", title)
    }

    visibleElements(slide).forEach((element) => {
      if (element.animation !== "none") {
        addIssue(issueMap, "object-animations", title)
      }

      if (element.groupId) {
        addIssue(issueMap, "groups", title)
      }

      if (element.type === "video" || element.type === "audio") {
        if (pptxMediaExportDecision(element, options).mode === "placeholder") {
          addIssue(issueMap, "media-placeholders", title)
        }
      }

      if (element.type === "chart" && isPptxNativeChartElement(element)) {
        editableChartCount += 1
      }

      if (element.type === "table" && !element.rotation) {
        nativeTableCount += 1
        mergedTableCellCount += tableCellMerges(element).length
        if (element.tableOfficeStyleId || element.tableOfficeStyleName) {
          officeTableStyleCount += 1
        }
        selectedCellBorderCount += tableCellStyles(element).filter(
          (style) =>
            style.borderBottomColor ||
            style.borderLeftColor ||
            style.borderRightColor ||
            style.borderTopColor,
        ).length
      }

      if (element.type === "chart" && !isPptxNativeChartElement(element)) {
        staticChartCount += 1
        addIssue(issueMap, "chart-editability", title)
      }

      if (hasImageEffectSimplification(element)) {
        addIssue(issueMap, "image-effects", title)
      }

      if (
        (element.type === "title" || element.type === "text") &&
        element.listStyle !== "none"
      ) {
        addIssue(issueMap, "text-lists", title)
      }

      if (
        (element.type === "title" || element.type === "text") &&
        element.textColumns > 1
      ) {
        addIssue(issueMap, "text-columns", title)
      }
    })
  })

  if (masterHasVisibleContent(deck.master)) {
    addIssue(issueMap, "master-overlays", "Master")
  }

  if (masterLayoutPlan.unsupportedSlotCount) {
    addIssue(
      issueMap,
      "master-layouts",
      "Master",
      masterLayoutPlan.unsupportedSlotCount,
    )
  }

  if (actionReport.warningCount) {
    addIssue(issueMap, "action-links", "Actions", actionReport.warningCount)
  }

  const actionObjectRepairSteps = officeMetadataPlan.actionItems
    .filter((item) => item.status === "warning")
    .map((item) => `${item.objectRef}: ${item.ownerAction}`)
  const animationObjectRepairSteps = officeMetadataPlan.animationItems
    .filter((item) => item.status === "warning")
    .map((item) => `${item.objectRef}: ${item.ownerAction}`)
  const preflightIssues = finalizeIssues(issueMap).map((issue) => {
    if (issue.id === "action-links" && actionObjectRepairSteps.length) {
      return {
        ...issue,
        detail: `${issue.detail} ${actionObjectRepairSteps.length} exact action object(s) are listed for repair.`,
        repairSteps: actionObjectRepairSteps.slice(0, 4),
      } satisfies PptxExportPreflightIssue
    }

    if (issue.id === "object-animations" && animationObjectRepairSteps.length) {
      return {
        ...issue,
        detail: `${issue.detail} ${animationObjectRepairSteps.length} exact animation object(s) are listed for repair.`,
        repairSteps: animationObjectRepairSteps.slice(0, 4),
      } satisfies PptxExportPreflightIssue
    }

    return issue
  })
  const repairIssue = repairReport.repairActionCount
    ? ({
        count: repairReport.repairActionCount,
        detail: repairReport.summary,
        id: "compatibility-repairs",
        label: "Compatibility repair plan available",
        repairSteps: repairReport.items.flatMap((item) =>
          item.status === "ready" ? [] : item.repairSteps.slice(0, 2),
        ).concat(
          linkedDataWorkflow.steps.flatMap((step) =>
            step.status === "ready" ? [] : [step.ownerAction],
          ),
        ),
        severity:
          repairReport.status === "attention" ? "attention" : "warning",
        slideTitles: repairReport.items
          .flatMap((item) => item.slideTitles)
          .slice(0, 4),
      } satisfies PptxExportPreflightIssue)
    : null
  const issues = [
    ...preflightIssues,
    ...(repairIssue ? [repairIssue] : []),
  ].sort(compareIssues)
  const status = preflightStatus(issues)
  const attentionCount = issues.filter(
    (issue) => issue.severity === "attention",
  ).length
  const warningCount = issues.filter((issue) => issue.severity === "warning").length

  return {
    attentionCount,
    issues,
    metrics: [
      {
        id: "compatibility-repair-actions",
        label: "Repair actions",
        value: String(repairReport.repairActionCount),
        detail: repairReport.summary,
      },
      {
        id: "office-interop-actions",
        label: "Office interop actions",
        value: String(interopRepairPlan.actionCount),
        detail: interopRepairPlan.summary,
      },
      {
        id: "linked-data-workflows",
        label: "Linked data workflows",
        value: `${linkedDataWorkflow.readyCount}/${linkedDataWorkflow.totalCount}`,
        detail: linkedDataWorkflow.summary,
      },
      {
        id: "linked-data-workflow-steps",
        label: "Linked workflow steps",
        value: String(linkedDataWorkflow.repairActionCount),
        detail:
          firstLinkedDataWorkflowStep?.ownerAction ??
          "No linked-data repair workflow step is needed.",
      },
      {
        id: "linked-chart-data-review",
        label: "Linked chart data",
        value: String(interopRepairPlan.linkedChartDataCount),
        detail:
          interopActionById.get("linked-chart-data-review")?.detail ??
          "No linked chart data review action.",
      },
      {
        id: "chart-editability-repairs",
        label: "Chart editability repairs",
        value: String(interopRepairPlan.chartFallbackCount),
        detail:
          interopActionById.get("chart-editability-repair")?.detail ??
          "No chart editability repair action.",
      },
      {
        id: "table-preset-mapping",
        label: "Table preset mapping",
        value: String(interopRepairPlan.tablePresetFallbackCount),
        detail:
          interopActionById.get("table-preset-mapping-repair")?.detail ??
          "No table preset mapping action.",
      },
      {
        id: "table-structure-readiness",
        label: "Table structure readiness",
        value: `${interopRepairPlan.tableStructureReadyCount}/${interopRepairPlan.tableCount}`,
        detail:
          interopActionById.get("table-structure-readiness")?.detail ??
          "No table structure readiness action.",
      },
      {
        id: "linked-chart-repairs",
        label: "Linked chart repairs",
        value: repairItemById.get("linked-chart-repair")?.count.toString() ?? "0",
        detail:
          repairItemById.get("linked-chart-repair")?.detail ??
          "No linked chart repair action.",
      },
      {
        id: "odp-table-preset-repairs",
        label: "ODP table repairs",
        value:
          repairItemById.get("odp-table-preset-repair")?.count.toString() ?? "0",
        detail:
          repairItemById.get("odp-table-preset-repair")?.detail ??
          "No ODP table preset repair action.",
      },
      {
        id: "theme-file-repairs",
        label: "Theme-file repairs",
        value:
          repairItemById.get("office-theme-file-repair")?.count.toString() ?? "0",
        detail:
          repairItemById.get("office-theme-file-repair")?.detail ??
          "No Office theme-file repair action.",
      },
      {
        id: "native-office-package-parity",
        label: "Office package parity",
        value: `${nativeOfficeParity.readySectionCount}/${nativeOfficeParity.totalSectionCount}`,
        detail: nativeOfficeParity.summary,
      },
      {
        id: "smartart-conversion-plan",
        label: "SmartArt conversion plan",
        value: `${
          nativeOfficeSectionById.get("smartart-diagrams")?.readyCount ?? 0
        }/${nativeOfficeSectionById.get("smartart-diagrams")?.totalCount ?? 0}`,
        detail:
          nativeOfficeActionById.get("complete-smartart-conversion-plan")
            ?.ownerAction ?? "No SmartArt conversion action is available.",
      },
      {
        id: "theme-application-path",
        label: ".thmx application path",
        value:
          nativeOfficeSectionById.get("theme-package-application")?.status ??
          "blocked",
        detail:
          nativeOfficeSectionById.get("theme-package-application")?.detail ??
          "No reusable Office theme package path is available.",
      },
      {
        id: "master-layout-relationship-checks",
        label: "Master/layout relationships",
        value: `${nativeOfficeParity.readyRelationshipCount}/${nativeOfficeParity.totalRelationshipCount}`,
        detail:
          nativeOfficeActionById.get("verify-master-layout-relationships")
            ?.ownerAction ??
          "No native master/layout relationship check is available.",
      },
      {
        id: "native-office-package-actions",
        label: "Office parity actions",
        value: `${nativeOfficeParity.readyActionCount}/${nativeOfficeParity.actionCount}`,
        detail:
          nativeOfficeParity.actions.find((action) => action.status !== "ready")
            ?.ownerAction ?? "All native Office package parity actions are ready.",
      },
      {
        id: "slides",
        label: "Slides",
        value: String(deck.slides.length),
        detail: "Included in the PPTX package",
      },
      {
        id: "objects",
        label: "Visible objects",
        value: String(visibleObjectCount),
        detail: "Objects considered by the exporter",
      },
      {
        id: "diagram-layouts",
        label: "Diagram layouts",
        value: String(diagramAuthoringReport.totalDiagramCount),
        detail: diagramAuthoringReport.summary,
      },
      {
        id: "diagram-template-coverage",
        label: "Diagram templates",
        value: `${diagramAuthoringReport.templateCoverageCount}/${diagramAuthoringReport.catalogTemplateCount}`,
        detail:
          diagramAuthoringReport.metrics.find(
            (metric) => metric.id === "diagram-template-coverage",
          )?.detail ?? "No diagram templates used",
      },
      {
        id: "diagram-conversion-groups",
        label: "Diagram conversion",
        value: `${diagramAuthoringReport.editableGroupCount}/${diagramAuthoringReport.totalDiagramCount}`,
        detail:
          "Recognized diagram groups keep editable shape/text structure plus Office layout metadata for PowerPoint rebuilds.",
      },
      {
        id: "animation-cues",
        label: "Animation cues",
        value: String(animationCueCount),
        detail: "Native PPTX XML plus speaker notes",
      },
      {
        id: "native-animation-xml",
        label: "Native animations",
        value: String(animationReport.nativeXmlCount),
        detail:
          "Supported effects mapped into PPTX timing XML with stable Office targets",
      },
      {
        id: "native-exit-animation-xml",
        label: "Native exits",
        value: String(animationReport.nativeExitXmlCount),
        detail: "Fade-out exit effects mapped into PPTX timing XML",
      },
      {
        id: "animation-handoffs",
        label: "Animation handoffs",
        value: String(animationReport.handoffOnlyCount),
        detail: animationReport.handoffReasons.length
          ? animationReport.handoffReasons.join(" ")
          : "No speaker-note-only animation effects",
      },
      {
        id: "animation-target-reviews",
        label: "Animation target reviews",
        value: String(animationReport.nativeTargetReviewCount),
        detail:
          "Supported effects that still need review because the exported object target is not stable",
      },
      {
        id: "animation-kinds",
        label: "Animation kinds",
        value: `${animationReport.entranceCount}/${animationReport.emphasisCount}/${animationReport.exitCount}/${animationReport.motionCount}`,
        detail: "Entrance / emphasis / exit / motion-path cues",
      },
      {
        id: "connector-routes",
        label: "Connector routes",
        value: String(connectorRouteCount),
        detail: "Editable custom geometry plus speaker notes",
      },
      {
        id: "transition-cues",
        label: "Transition cues",
        value: String(transitionCueCount),
        detail: "Native PPTX XML plus speaker notes",
      },
      {
        id: "action-links",
        label: "Actions",
        value: `${actionReport.readyCount}/${actionReport.totalCount}`,
        detail: `${actionReport.internalSlideCount} slide jumps, ${actionReport.externalLinkCount} external links, ${actionReport.telephoneOrEmailCount} mail/tel links, ${actionReport.warningCount} warnings`,
      },
      {
        id: "office-action-animation-objects",
        label: "Action/animation objects",
        value: `${officeMetadataPlan.readyCount}/${officeMetadataPlan.totalCount}`,
        detail: officeMetadataPlan.summary,
      },
      {
        id: "native-action-settings",
        label: "Native action settings",
        value: String(actionReport.nativeActionSettingCount),
        detail: `${actionReport.groupedActionCount} grouped action button(s), ${actionReport.blockedActionCount} blocked, ${actionReport.selfTargetCount} self-targeted`,
      },
      {
        id: "action-xml-parts",
        label: "Action XML",
        value: `${actionXmlAuthoring.readyPartCount}/${actionXmlAuthoring.totalPartCount}`,
        detail: actionXmlAuthoring.summary,
      },
      {
        id: "action-xml-links",
        label: "Action XML links",
        value: String(actionXmlAuthoring.nativeActionCount),
        detail: `${actionXmlAuthoring.internalRelationshipCount} slide relationship(s), ${actionXmlAuthoring.externalRelationshipCount} external hyperlink relationship(s), ${actionXmlAuthoring.xmlLength} XML characters authored`,
      },
      {
        id: "office-action-catalog",
        label: "Office action catalog",
        value: String(officeMetadataPlan.nativeActionCatalogCount),
        detail: `${officeMetadataPlan.externalActionCount} URL, ${officeMetadataPlan.emailActionCount} mail, ${officeMetadataPlan.telephoneActionCount} telephone, ${actionReport.internalSlideCount} slide action(s) mapped to safe Office click metadata`,
      },
      {
        id: "office-action-blockers",
        label: "Action blockers",
        value: String(officeMetadataPlan.blockedActionCount),
        detail: `${officeMetadataPlan.missingSlideActionCount} missing target(s), ${officeMetadataPlan.invalidUrlActionCount} invalid URL(s), ${officeMetadataPlan.selfTargetActionCount} self-targeted action(s)`,
      },
      {
        id: "office-animation-targets",
        label: "Animation targets",
        value: `${officeMetadataPlan.nativeAnimationXmlCount}/${officeMetadataPlan.animationItems.length}`,
        detail:
          "Animated slide objects mapped to native PPTX timing XML without exact-object review.",
      },
      {
        id: "office-advanced-animation-xml",
        label: "Advanced animation XML",
        value: `${animationReport.nativeEmphasisXmlCount}/${animationReport.nativeExitXmlCount}/${animationReport.nativeMotionXmlCount}`,
        detail:
          "Native emphasis / exit / motion-path timing XML targets with stable Office object ids.",
      },
      {
        id: "office-animation-triggers",
        label: "Animation triggers",
        value: `${officeMetadataPlan.animationOnClickTriggerCount}/${officeMetadataPlan.animationWithPreviousTriggerCount}/${officeMetadataPlan.animationAfterPreviousTriggerCount}`,
        detail: "On-click / with-previous / after-previous authoring choices.",
      },
      {
        id: "office-custom-motion-paths",
        label: "Custom motion paths",
        value: String(officeMetadataPlan.customMotionPathCount),
        detail:
          "Custom motion-path offsets are preserved in slideshow preview, review notes, and native PPTX timing XML where the target is stable.",
      },
      {
        id: "office-emphasis-handoffs",
        label: "Emphasis handoffs",
        value: String(officeMetadataPlan.emphasisHandoffCount),
        detail: "Emphasis effects that remain owner-visible PowerPoint rebuild notes.",
      },
      {
        id: "office-exit-handoffs",
        label: "Exit handoffs",
        value: String(officeMetadataPlan.exitHandoffCount),
        detail: "Exit effects that still need owner-visible PowerPoint review.",
      },
      {
        id: "office-motion-handoffs",
        label: "Motion handoffs",
        value: String(officeMetadataPlan.motionPathHandoffCount),
        detail: "Motion-path effects that need PowerPoint motion-path rebuild review.",
      },
      {
        id: "office-animation-target-reviews",
        label: "Target reviews",
        value: String(officeMetadataPlan.nativeTargetReviewAnimationCount),
        detail:
          "Native-supported effects blocked by unstable exported Office object targets.",
      },
      {
        id: "pptx-comment-threads",
        label: "Comment threads",
        value: String(commentPlan.nativeThreadCount),
        detail: commentPlan.missingAnchorCount
          ? `${commentPlan.missingAnchorCount} comment group(s) need anchor review before native XML`
          : "Imported PowerPoint threads have native XML planning metadata",
      },
      {
        id: "pptx-comment-replies",
        label: "Comment replies",
        value: String(commentPlan.nativeReplyCount),
        detail: "Imported PowerPoint replies with parent/thread context",
      },
      {
        id: "manual-comment-handoffs",
        label: "Comment notes",
        value: String(commentPlan.manualHandoffCount),
        detail: "Manual Essence comments carried through export review notes",
      },
      {
        id: "pptx-comment-anchors",
        label: "Comment anchors",
        value: `${commentPlan.anchorReadyCount}/${commentPlan.items.length}`,
        detail: "Thread groups with source coordinates or target element anchors",
      },
      {
        id: "pptx-comment-xml-parts",
        label: "Comment XML",
        value: `${commentXmlAuthoring.readyPartCount}/${commentXmlAuthoring.totalPartCount}`,
        detail: commentXmlAuthoring.summary,
      },
      {
        id: "pptx-comment-xml-comments",
        label: "Native comments",
        value: String(commentXmlAuthoring.nativeCommentCount),
        detail: `${commentXmlAuthoring.authorCount} author(s), ${commentXmlAuthoring.nativeThreadCount} thread(s), ${commentXmlAuthoring.nativeReplyCount} reply item(s), ${commentXmlAuthoring.xmlLength} XML characters authored`,
      },
      {
        id: "native-package-parts",
        label: "Native package parts",
        value: `${nativePackageAuthoring.readyPartCount}/${nativePackageAuthoring.totalPartCount}`,
        detail: nativePackageAuthoring.summary,
      },
      {
        id: "native-package-merge-parts",
        label: "Package merge parts",
        value: String(nativePackageAuthoring.mergePartCount),
        detail: `${nativePackageAuthoring.replacePartCount} replace part(s), ${nativePackageAuthoring.xmlLength} XML characters prepared`,
      },
      {
        id: "native-master-placeholders",
        label: "Master placeholders",
        value: String(masterLayoutPlan.nativeMasterPlaceholderCount),
        detail: masterLayoutPlan.nativeMasterPlaceholders.length
          ? `${masterLayoutPlan.nativeMasterPlaceholders.join(", ")} ready for native master XML planning`
          : "No footer/date/slide-number defaults enabled",
      },
      {
        id: "native-layout-candidates",
        label: "Native layouts",
        value: `${masterLayoutPlan.nativeLayoutCandidateCount}/${masterLayoutPlan.layoutPresetCount}`,
        detail: masterLayoutPlan.coveredRoles.length
          ? `${masterLayoutPlan.coveredRoles.join(", ")} placeholder roles covered`
          : "No reusable layout presets ready for native layout XML",
      },
      {
        id: "native-master-xml-parts",
        label: "Master XML parts",
        value: `${masterXmlPlan.readyPartCount}/${masterXmlPlan.totalPartCount}`,
        detail: masterXmlPlan.summary,
      },
      {
        id: "native-master-authoring",
        label: "Master authoring",
        value: `${masterXmlPlan.authoringPlan.readyTaskCount}/${masterXmlPlan.authoringPlan.totalTaskCount}`,
        detail: masterXmlPlan.authoringPlan.summary,
      },
      {
        id: "master-layout-xml-parts",
        label: "Master/layout XML",
        value: `${masterXmlPlan.masterLayoutXmlAuthoring.readyPartCount}/${masterXmlPlan.masterLayoutXmlAuthoring.totalPartCount}`,
        detail: masterXmlPlan.masterLayoutXmlAuthoring.summary,
      },
      {
        id: "master-layout-xml-placeholders",
        label: "Native placeholders",
        value: String(masterXmlPlan.masterLayoutXmlAuthoring.placeholderCount),
        detail: `${masterXmlPlan.masterLayoutXmlAuthoring.masterPartCount} master part(s), ${masterXmlPlan.masterLayoutXmlAuthoring.layoutPartCount} layout part(s), ${masterXmlPlan.masterLayoutXmlAuthoring.xmlLength} XML characters authored`,
      },
      {
        id: "native-master-handoffs",
        label: "Master handoffs",
        value: String(masterXmlPlan.authoringPlan.handoffTaskCount),
        detail:
          masterXmlPlan.authoringPlan.handoffTaskCount > 0
            ? "Some master/layout XML authoring tasks still need compatibility handoff."
            : "Theme, master placeholders, and layout placeholders have native authoring tasks.",
      },
      {
        id: "theme-file-handoff",
        label: "Theme file handoff",
        value:
          masterXmlPlan.themeFileHandoff.status === "ready"
            ? "Ready"
            : masterXmlPlan.themeFileHandoff.status === "needs-metadata"
              ? "Needs metadata"
              : "Manual theme",
        detail: `${masterXmlPlan.themeFileHandoff.themeName} -> ${masterXmlPlan.themeFileHandoff.exportFileName}`,
      },
      {
        id: "theme-package-parts",
        label: "Theme package",
        value: `${masterXmlPlan.themePackagePlan.readyPartCount}/${masterXmlPlan.themePackagePlan.totalPartCount}`,
        detail: masterXmlPlan.themePackagePlan.summary,
      },
      {
        id: "theme-package-file",
        label: "Theme package file",
        value:
          masterXmlPlan.themePackagePlan.status === "ready"
            ? "Ready"
            : masterXmlPlan.themePackagePlan.status === "partial"
              ? "Review"
              : "Blocked",
        detail: `${masterXmlPlan.themePackagePlan.packageFileName}; source review ${
          masterXmlPlan.themePackagePlan.importReviewFileName || "none"
        }`,
      },
      {
        id: "theme-package-xml-parts",
        label: "Theme package XML",
        value: `${masterXmlPlan.themePackageXmlAuthoring.readyPartCount}/${masterXmlPlan.themePackageXmlAuthoring.totalPartCount}`,
        detail: masterXmlPlan.themePackageXmlAuthoring.summary,
      },
      {
        id: "theme-package-xml-size",
        label: "Theme XML size",
        value: String(masterXmlPlan.themePackageXmlAuthoring.themeXmlLength),
        detail: `${masterXmlPlan.themePackageXmlAuthoring.packageFileName}; ${masterXmlPlan.themePackageXmlAuthoring.xmlLength} total XML characters authored`,
      },
      {
        id: "placeholder-inheritance",
        label: "Placeholder inheritance",
        value: `${masterXmlPlan.placeholderInheritanceReadyCount}/${masterXmlPlan.placeholderInheritance.length}`,
        detail: masterXmlPlan.placeholderInheritanceIssueCount
          ? `${masterXmlPlan.placeholderInheritanceIssueCount} inheritance diagnostic(s) need review`
          : "Placeholder inheritance diagnostics are clear",
      },
      {
        id: "layout-placeholder-slots",
        label: "Layout slots",
        value: `${masterLayoutPlan.candidateLayoutSlotCount}/${masterLayoutPlan.layoutSlotCount}`,
        detail: masterLayoutPlan.unsupportedSlotTypes.length
          ? `${masterLayoutPlan.unsupportedSlotTypes.join(", ")} slots need handoff`
          : "Saved layout slots map to native placeholder roles",
      },
      {
        id: "theme-fonts",
        label: "Theme fonts",
        value: masterLayoutPlan.themeFontReady ? "Ready" : "Fallback",
        detail: masterLayoutPlan.themeFontDetail,
      },
      {
        id: "theme-colors",
        label: "Theme colors",
        value: String(masterLayoutPlan.officeThemeColorCount),
        detail: masterLayoutPlan.themeColorReady
          ? "Office color scheme metadata available"
          : "Using deck color fallback",
      },
      {
        id: "native-media",
        label: "Native media",
        value: String(mediaExportReport.nativeMediaCount),
        detail: "Supported inline or resolved audio/video packaged in PPTX",
      },
      {
        id: "resolved-media",
        label: "Resolved media",
        value: String(mediaExportReport.resolvedMediaCount),
        detail: "Desktop/local handoff sources packaged in PPTX",
      },
      {
        id: "media-fallbacks",
        label: "Media fallbacks",
        value: String(mediaExportReport.placeholderCount),
        detail: "Media objects preserved as labeled placeholders",
      },
      {
        id: "media-source-candidates",
        label: "Media candidates",
        value: `${mediaReport.nativeSourceCandidateCount}/${mediaReport.totalMediaCount}`,
        detail: "Office-compatible source formats identified",
      },
      {
        id: "media-caption-cues",
        label: "Caption cues",
        value: String(mediaReport.captionCueCount),
        detail: "Timed VTT handoff cues in speaker notes",
      },
      {
        id: "media-trim-handoffs",
        label: "Media trims",
        value: String(mediaReport.trimHandoffCount),
        detail: "Trim settings preserved as handoff metadata",
      },
      {
        id: "editable-charts",
        label: "Editable charts",
        value: String(editableChartCount),
        detail: "Native Office chart data in PPTX",
      },
      {
        id: "native-tables",
        label: "Native tables",
        value: String(nativeTableCount),
        detail: "Editable Office table export",
      },
      {
        id: "merged-table-cells",
        label: "Merged cells",
        value: String(mergedTableCellCount),
        detail: "Native table spans preserved",
      },
      {
        id: "office-table-styles",
        label: "Office table styles",
        value: String(officeTableStyleCount),
        detail: "Imported table style metadata retained",
      },
      {
        id: "cell-border-variants",
        label: "Cell border variants",
        value: String(selectedCellBorderCount),
        detail: "Selected-cell edge borders preserved",
      },
      {
        id: "chart-fallbacks",
        label: "Chart fallbacks",
        value: String(staticChartCount),
        detail: "Charts exported as artwork",
      },
      {
        id: "attention",
        label: "Lossy blockers",
        value: String(attentionCount),
        detail: "Needs review before sending",
      },
      {
        id: "warnings",
        label: "Review items",
        value: String(warningCount),
        detail: "Known compatibility simplifications",
      },
    ],
    status,
    summary: preflightSummary(status, attentionCount, warningCount),
    warningCount,
  }
}
