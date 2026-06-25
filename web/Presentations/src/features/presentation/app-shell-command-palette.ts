import {
  workspaceDensityOptions,
  type WorkspaceDensity,
  type WorkspacePanelState,
} from "./workspace-ergonomics"

export type PresentationCommandPaletteGroup =
  | "edit"
  | "insert"
  | "object"
  | "section"
  | "slide"
  | "view"

export type PresentationCommandPaletteAction = {
  detail: string
  disabled?: boolean
  disabledReason?: string
  group: PresentationCommandPaletteGroup
  id: string
  keywords: string[]
  label: string
  shortcut?: string
}

export type PresentationCommandPaletteContext = {
  canGroupSelected: boolean
  canUngroupSelected: boolean
  copiedElementsCount: number
  copiedSlidesCount: number
  futureCount: number
  historyCount: number
  selectedEditableElementCount: number
  selectedElementCount: number
  selectedSlideId: string
  selectedSlideIds: string[]
  showGrid: boolean
  showRulers: boolean
  slideCount: number
  slides: Array<{ id: string; title: string }>
  workspaceDensity: WorkspaceDensity
  workspacePanels: WorkspacePanelState
  zoom: number
}

const groupOrder: PresentationCommandPaletteGroup[] = [
  "slide",
  "insert",
  "object",
  "edit",
  "view",
  "section",
]

function command(input: PresentationCommandPaletteAction) {
  return input
}

function disabledWhen(
  disabled: boolean,
  disabledReason: string,
): Pick<PresentationCommandPaletteAction, "disabled" | "disabledReason"> {
  return disabled ? { disabled, disabledReason } : {}
}

function normalizeQuery(query: string) {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

function searchableText(action: PresentationCommandPaletteAction) {
  return [
    action.group,
    action.label,
    action.detail,
    action.shortcut ?? "",
    ...action.keywords,
  ]
    .join(" ")
    .toLowerCase()
}

export function presentationCommandPaletteActions(
  context: PresentationCommandPaletteContext,
): PresentationCommandPaletteAction[] {
  const canDeleteSlide = context.slideCount > 1
  const canSelectPreviousSlide =
    context.slides.findIndex((slide) => slide.id === context.selectedSlideId) > 0
  const canSelectNextSlide =
    context.slides.findIndex((slide) => slide.id === context.selectedSlideId) <
    context.slideCount - 1
  const selectedSlideCount = context.selectedSlideIds.length || 1
  const selectedObjectLabel =
    context.selectedElementCount === 1
      ? "selected object"
      : `${context.selectedElementCount} selected objects`

  return [
    command({
      detail: "Create a new slide after the current slide.",
      group: "slide",
      id: "slide.add",
      keywords: ["new", "page"],
      label: "Add slide",
      shortcut: "Ctrl M",
    }),
    command({
      detail: `Duplicate ${selectedSlideCount} selected slide${
        selectedSlideCount === 1 ? "" : "s"
      }.`,
      group: "slide",
      id: "slide.duplicate",
      keywords: ["copy", "clone"],
      label: "Duplicate slide",
      shortcut: "Ctrl Shift D",
    }),
    command({
      detail: `Remove ${selectedSlideCount} selected slide${
        selectedSlideCount === 1 ? "" : "s"
      }.`,
      group: "slide",
      id: "slide.delete",
      keywords: ["remove"],
      label: "Delete slide",
      ...disabledWhen(
        !canDeleteSlide,
        "The deck needs at least one slide.",
      ),
    }),
    command({
      detail: "Move selection to the previous slide.",
      group: "slide",
      id: "slide.previous",
      keywords: ["back", "navigate"],
      label: "Previous slide",
      shortcut: "PageUp",
      ...disabledWhen(!canSelectPreviousSlide, "Already on the first slide."),
    }),
    command({
      detail: "Move selection to the next slide.",
      group: "slide",
      id: "slide.next",
      keywords: ["forward", "navigate"],
      label: "Next slide",
      shortcut: "PageDown",
      ...disabledWhen(!canSelectNextSlide, "Already on the last slide."),
    }),
    ...context.slides.map((slide, index) =>
      command({
        detail: `Go to slide ${index + 1}.`,
        group: "slide",
        id: `slide.select:${slide.id}`,
        keywords: ["go", "navigate", String(index + 1)],
        label: `Open slide ${index + 1}: ${slide.title || "Untitled"}`,
      }),
    ),
    command({
      detail: "Insert an editable title placeholder on the current slide.",
      group: "insert",
      id: "insert.title",
      keywords: ["heading"],
      label: "Insert title",
    }),
    command({
      detail: "Insert an editable text box on the current slide.",
      group: "insert",
      id: "insert.text",
      keywords: ["textbox", "body"],
      label: "Insert text box",
    }),
    command({
      detail: "Insert an editable table object.",
      group: "insert",
      id: "insert.table",
      keywords: ["grid", "cells"],
      label: "Insert table",
    }),
    command({
      detail: "Insert an editable chart object.",
      group: "insert",
      id: "insert.chart",
      keywords: ["graph", "data"],
      label: "Insert chart",
    }),
    command({
      detail: `Copy ${selectedObjectLabel}.`,
      group: "object",
      id: "object.copy",
      keywords: ["clipboard"],
      label: "Copy object",
      shortcut: "Ctrl C",
      ...disabledWhen(
        !context.selectedEditableElementCount,
        "Select an editable object first.",
      ),
    }),
    command({
      detail: "Paste copied objects onto the current slide.",
      group: "object",
      id: "object.paste",
      keywords: ["clipboard"],
      label: "Paste object",
      shortcut: "Ctrl V",
      ...disabledWhen(
        !context.copiedElementsCount,
        "Copy an object before pasting.",
      ),
    }),
    command({
      detail: `Duplicate ${selectedObjectLabel}.`,
      group: "object",
      id: "object.duplicate",
      keywords: ["clone"],
      label: "Duplicate object",
      shortcut: "Ctrl D",
      ...disabledWhen(
        !context.selectedEditableElementCount,
        "Select an editable object first.",
      ),
    }),
    command({
      detail: `Delete ${selectedObjectLabel}.`,
      group: "object",
      id: "object.delete",
      keywords: ["remove"],
      label: "Delete object",
      shortcut: "Delete",
      ...disabledWhen(
        !context.selectedElementCount,
        "Select an object first.",
      ),
    }),
    command({
      detail: "Group the selected objects.",
      group: "object",
      id: "object.group",
      keywords: ["combine"],
      label: "Group objects",
      shortcut: "Ctrl G",
      ...disabledWhen(
        !context.canGroupSelected,
        "Select at least two editable objects.",
      ),
    }),
    command({
      detail: "Ungroup the selected group.",
      group: "object",
      id: "object.ungroup",
      keywords: ["separate"],
      label: "Ungroup objects",
      shortcut: "Ctrl Shift G",
      ...disabledWhen(!context.canUngroupSelected, "Select a grouped object."),
    }),
    ...["left", "center", "right", "top", "middle", "bottom"].map((alignment) =>
      command({
        detail: `Align ${selectedObjectLabel} to ${alignment}.`,
        group: "object",
        id: `object.align.${alignment}`,
        keywords: ["arrange", alignment],
        label: `Align ${alignment}`,
        ...disabledWhen(
          !context.selectedEditableElementCount,
          "Select an editable object first.",
        ),
      }),
    ),
    command({
      detail: "Undo the last deck edit.",
      group: "edit",
      id: "edit.undo",
      keywords: ["history"],
      label: "Undo",
      shortcut: "Ctrl Z",
      ...disabledWhen(!context.historyCount, "No undo history is available."),
    }),
    command({
      detail: "Redo the next deck edit.",
      group: "edit",
      id: "edit.redo",
      keywords: ["history"],
      label: "Redo",
      shortcut: "Ctrl Y",
      ...disabledWhen(!context.futureCount, "No redo history is available."),
    }),
    command({
      detail: "Paste copied slides after the current slide.",
      group: "edit",
      id: "edit.paste-slides",
      keywords: ["clipboard"],
      label: "Paste copied slides",
      ...disabledWhen(
        !context.copiedSlidesCount,
        "Copy or cut slides before pasting.",
      ),
    }),
    command({
      detail: `${context.showGrid ? "Hide" : "Show"} the slide grid.`,
      group: "view",
      id: "view.toggle-grid",
      keywords: ["canvas", "snap"],
      label: context.showGrid ? "Hide grid" : "Show grid",
    }),
    command({
      detail: `${context.showRulers ? "Hide" : "Show"} canvas rulers.`,
      group: "view",
      id: "view.toggle-rulers",
      keywords: ["measure"],
      label: context.showRulers ? "Hide rulers" : "Show rulers",
    }),
    command({
      detail: `${context.workspacePanels.filmstripOpen ? "Hide" : "Show"} the slide filmstrip panel.`,
      group: "view",
      id: "view.toggle-filmstrip",
      keywords: ["workspace", "slides", "sidebar", "panel"],
      label: context.workspacePanels.filmstripOpen
        ? "Hide slide filmstrip"
        : "Show slide filmstrip",
    }),
    command({
      detail: `${context.workspacePanels.propertiesOpen ? "Hide" : "Show"} the properties panel.`,
      group: "view",
      id: "view.toggle-properties",
      keywords: ["workspace", "format", "sidebar", "panel"],
      label: context.workspacePanels.propertiesOpen
        ? "Hide properties panel"
        : "Show properties panel",
    }),
    ...workspaceDensityOptions.map((option) =>
      command({
        detail: option.description,
        group: "view",
        id: `view.density.${option.id}`,
        keywords: ["workspace", "density", "layout", option.id],
        label: `Use ${option.label.toLowerCase()} density`,
        ...disabledWhen(
          context.workspaceDensity === option.id,
          `${option.label} density is already active.`,
        ),
      }),
    ),
    command({
      detail: "Zoom the canvas in by 5%.",
      group: "view",
      id: "view.zoom-in",
      keywords: ["scale"],
      label: "Zoom in",
      ...disabledWhen(context.zoom >= 140, "Already at maximum zoom."),
    }),
    command({
      detail: "Zoom the canvas out by 5%.",
      group: "view",
      id: "view.zoom-out",
      keywords: ["scale"],
      label: "Zoom out",
      ...disabledWhen(context.zoom <= 45, "Already at minimum zoom."),
    }),
    command({
      detail: "Return the canvas to the default 88% zoom.",
      group: "view",
      id: "view.zoom-reset",
      keywords: ["scale", "default"],
      label: "Reset zoom",
      ...disabledWhen(context.zoom === 88, "Zoom is already at 88%."),
    }),
    command({
      detail: "Select every slide in the current section.",
      group: "section",
      id: "section.select-current",
      keywords: ["slides"],
      label: "Select current section",
    }),
    command({
      detail: "Expand all collapsed filmstrip sections.",
      group: "section",
      id: "section.expand-all",
      keywords: ["filmstrip"],
      label: "Expand all sections",
    }),
    command({
      detail: "Collapse every filmstrip section.",
      group: "section",
      id: "section.collapse-all",
      keywords: ["filmstrip"],
      label: "Collapse all sections",
    }),
  ].sort((a, b) => {
    const groupDelta = groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group)

    return groupDelta || a.label.localeCompare(b.label)
  })
}

export function filterPresentationCommandPaletteActions(
  actions: PresentationCommandPaletteAction[],
  query: string,
) {
  const terms = normalizeQuery(query)

  if (!terms.length) return actions

  return actions.filter((action) => {
    const text = searchableText(action)

    return terms.every((term) => text.includes(term))
  })
}
