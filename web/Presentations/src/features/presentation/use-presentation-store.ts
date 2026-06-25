"use client"

import { nanoid } from "nanoid"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import { extractCommentMentions } from "./comment-mentions"
import {
  applyCollaborationObjectMutation,
  type CollaborationMutationApplyResult,
} from "./collaboration-mutation-reconciliation"
import type { CollaborationObjectMutation } from "./collaboration-mutations"
import {
  applyBrandKitToDeck,
  type BrandKitPreset,
  type BrandKitScope,
} from "./brand-kits"
import { moveAnimatedElementInOrder } from "./animation-pane"
import {
  elementAnimationDelay,
  elementAnimationDuration,
} from "./animation-effects"
import {
  createDefaultDeck,
  createAudioElement,
  createElement,
  createImageElement,
  createImageSlide,
  createOutlineSlide,
  createSlide,
  createVideoElement,
} from "./default-deck"
import { compactDeckAssets } from "./asset-health"
import type { DeckAssetCleanupResult } from "./asset-health"
import {
  applyCustomSlideLayoutToSlides,
  type SlideLayoutPresetLike,
} from "./custom-slide-layouts"
import { migrateDeckAssets, withImageAsset } from "./deck-assets"
import { markDeckLayoutPresetUsed } from "./deck-layout-presets"
import { trimDeckHistory } from "./deck-performance"
import type { OutlineSlideInput } from "./outline-import"
import { applyLayoutPlaceholders } from "./slide-layouts"
import {
  moveSlideSection as moveSlidesInSection,
  renameSlideSection as renameSlidesInSection,
  sanitizeCollapsedSectionSlideIds,
  sectionBreakSlideIds,
  sectionRangeForSlide,
} from "./slide-sections"
import {
  alignSlideElements,
  distributeSlideElements,
  nudgeSlideElements,
  resolveSelectedElementIds,
  type Alignment,
  type DistributionAxis,
  type ElementPatch,
} from "./selection-commands"
import {
  createPresentationPersistenceSnapshot,
  mergePresentationPersistedState,
  type PresentationPersistenceState,
} from "./store-persistence"
import {
  defaultWorkspacePreferences,
  workspacePanelOpenKey,
  clampWorkspacePanelWidth,
  type WorkspaceDensity,
  type WorkspacePanelId,
  type WorkspacePanelWidths,
  type WorkspacePanelState,
} from "./workspace-ergonomics"
import {
  expandSelectionToGroups,
  groupableElementIds,
  selectedGroupIds,
} from "./element-groups"
import { isElementLocked } from "./element-visibility"
import {
  diagramElementSpecs,
  diagramGroupIdForTemplate,
  diagramTemplateIdFromGroupId,
  type DiagramTemplateId,
} from "./diagram-templates"
import type { StickerTemplate } from "./sticker-templates"
import { defaultConnectorGeometryForShape } from "./shape-geometry"
import {
  applyDesignPaletteToDeck,
  type DesignPalette,
  type DesignPaletteScope,
} from "./theme-palettes"
import {
  applyThemeBundleToDeck,
  type ThemeBundlePreset,
} from "./theme-bundles"
import {
  applyFontPairToDeck,
  type FontPairPreset,
  type FontPairScope,
} from "./font-pairs"
import type {
  Deck,
  DeckMaster,
  ExportedDeck,
  PresentationElement,
  Slide,
  SlideComment,
  IconName,
  ShapeKind,
  SlideLayout,
  ThemeName,
} from "./types"

type StoreState = {
  deck: Deck
  selectedSlideId: string
  selectedSlideIds: string[]
  selectedElementId: string | null
  selectedElementIds: string[]
  objectAnimationPreviewElementId: string | null
  objectAnimationPreviewKey: number
  collapsedSectionSlideIds: string[]
  transitionPreviewKey: number
  zoom: number
  showGrid: boolean
  showRulers: boolean
  workspaceDensity: WorkspaceDensity
  workspacePanelWidths: WorkspacePanelWidths
  workspacePanels: WorkspacePanelState
  copiedElements: PresentationElement[]
  copiedElementStyle: ElementStyleClipboard | null
  copiedSlides: Slide[]
  copiedSlideMode: SlideClipboardMode | null
  history: Deck[]
  future: Deck[]
}

type SlideClipboardMode = "copy" | "cut"

type ElementStyleClipboard = Pick<
  PresentationElement,
  | "fontSize"
  | "fontFamily"
  | "fontWeight"
  | "textAlign"
  | "lineHeight"
  | "listStyle"
  | "textColumns"
  | "textFit"
  | "color"
  | "background"
  | "radius"
  | "shapeStrokeColor"
  | "shapeStrokeWidth"
  | "shapeStrokeDash"
  | "shapeStartArrowhead"
  | "shapeEndArrowhead"
  | "tableHeaderRow"
  | "tableTotalRow"
  | "tableBorderColor"
  | "tableOfficeStyleId"
  | "tableOfficeStyleName"
  | "tableCellStyles"
  | "tableStyle"
  | "tableBandedRows"
  | "tableBandedColumns"
  | "tableFirstColumn"
  | "tableLastColumn"
  | "tableVerticalAlign"
  | "chartAxisColor"
  | "chartShowLegend"
  | "chartShowValues"
  | "fit"
  | "imageMask"
  | "imagePositionX"
  | "imagePositionY"
  | "imageOpacity"
  | "imageBrightness"
  | "imageContrast"
  | "imageSaturation"
>

type StoreActions = {
  setDeckTitle: (title: string) => void
  setTheme: (theme: ThemeName) => void
  applyDesignPalette: (input: {
    palette: DesignPalette
    scope: DesignPaletteScope
  }) => void
  applyFontPair: (input: {
    preset: FontPairPreset
    scope: FontPairScope
  }) => void
  applyBrandKit: (input: {
    kit: BrandKitPreset
    scope: BrandKitScope
  }) => void
  applyThemeBundle: (input: { bundle: ThemeBundlePreset }) => void
  updateDeckMaster: (patch: Partial<DeckMaster>) => void
  setZoom: (zoom: number) => void
  toggleGrid: () => void
  toggleRulers: () => void
  setWorkspaceDensity: (density: WorkspaceDensity) => void
  setWorkspacePanelWidth: (
    panelId: keyof WorkspacePanelWidths,
    width: number,
  ) => void
  setWorkspacePanelOpen: (panelId: WorkspacePanelId, open: boolean) => void
  toggleWorkspacePanel: (panelId: WorkspacePanelId) => void
  previewSlideTransition: () => void
  previewElementAnimation: (elementId: string) => void
  selectSlide: (
    slideId: string,
    options?: { additive?: boolean; range?: boolean },
  ) => void
  selectSlides: (slideIds: string[]) => void
  selectSlideSection: (slideId?: string) => void
  renameSlideSection: (slideId: string, title: string) => void
  moveSlideSection: (slideId: string, direction: -1 | 1) => void
  selectElement: (
    elementId: string | null,
    options?: { additive?: boolean },
  ) => void
  selectElements: (elementIds: string[]) => void
  toggleSlideSection: (slideId: string) => void
  expandAllSlideSections: () => void
  collapseAllSlideSections: () => void
  startSectionAtSelectedSlide: () => void
  clearSelectedSectionBreaks: () => void
  addSlide: () => void
  copySelectedSlide: () => void
  cutSelectedSlide: () => void
  pasteCopiedSlides: () => void
  duplicateSlide: () => void
  deleteSlide: () => void
  moveSlide: (direction: -1 | 1) => void
  moveSlideToIndex: (slideId: string, insertIndex: number) => void
  updateSlide: (slideId: string, patch: Partial<Slide>) => void
  updateSlideLive: (slideId: string, patch: Partial<Slide>) => void
  applyCustomSlideLayout: (input: {
    layout: SlideLayoutPresetLike
    slideIds?: string[]
  }) => void
  applySlideLayout: (slideId: string, layout: SlideLayout) => void
  addSlideComment: (
    slideId: string,
    input: {
      body: string
      authorName?: string
      targetElementId?: string
    },
  ) => void
  updateSlideComment: (
    slideId: string,
    commentId: string,
    patch: Partial<Pick<SlideComment, "body" | "resolved">>,
  ) => void
  deleteSlideComment: (slideId: string, commentId: string) => void
  addElement: (type: PresentationElement["type"]) => void
  addShapeElement: (shapeKind: ShapeKind) => void
  addTextElement: (input: {
    content: string
    fontSize?: number
    width?: number
    height?: number
    x?: number
    y?: number
  }) => void
  addActionButton: (input: {
    label: string
    linkSlideId: string
    background: string
    foreground?: string
    radius?: number
    shapeKind?: ShapeKind
    stroke: string
  }) => void
  addDiagram: (templateId: DiagramTemplateId) => void
  addIconElement: (input: { iconName: IconName; alt?: string }) => void
  addSticker: (template: StickerTemplate) => void
  addAudioElement: (input: { src: string; alt?: string }) => void
  addImageElement: (input: {
    src: string
    alt?: string
    x?: number
    y?: number
  }) => void
  addVideoElement: (input: { src: string; alt?: string }) => void
  addImageSlides: (input: { src: string; alt?: string }[]) => void
  replaceImageElement: (
    elementId: string,
    input: { src: string; alt?: string },
  ) => void
  replaceAudioElement: (
    elementId: string,
    input: { src: string; alt?: string },
  ) => void
  replaceVideoElement: (
    elementId: string,
    input: { src: string; alt?: string },
  ) => void
  addOutlineSlides: (input: OutlineSlideInput[]) => void
  updateElement: (
    elementId: string,
    patch: Partial<Omit<PresentationElement, "id">>,
  ) => void
  updateElementLive: (
    elementId: string,
    patch: Partial<Omit<PresentationElement, "id">>,
  ) => void
  updateElementsLive: (patches: ElementPatch[]) => void
  applyRemoteObjectMutation: (
    mutation: CollaborationObjectMutation,
  ) => CollaborationMutationApplyResult
  captureHistory: () => void
  copySelectedElements: () => void
  cutSelectedElements: () => void
  pasteCopiedElements: () => void
  copySelectedElementStyle: () => void
  pasteCopiedElementStyle: () => void
  duplicateSelectedElements: () => void
  moveElementAnimationOrder: (elementId: string, direction: -1 | 1) => void
  moveSelectedElementLayer: (
    direction: -1 | 1,
    mode?: "step" | "boundary",
  ) => void
  nudgeSelectedElements: (deltaX: number, deltaY: number) => void
  alignSelectedElements: (alignment: Alignment) => void
  distributeSelectedElements: (axis: DistributionAxis) => void
  groupSelectedElements: () => void
  ungroupSelectedElements: () => void
  deleteElement: () => void
  undo: () => void
  redo: () => void
  replaceDeck: (deck: Deck) => void
  cleanUpDeckAssets: () => DeckAssetCleanupResult
  exportDeck: () => ExportedDeck
}

type PresentationStore = StoreState & StoreActions

function cloneDeck(deck: Deck): Deck {
  return JSON.parse(JSON.stringify(deck)) as Deck
}

function cloneElement(element: PresentationElement): PresentationElement {
  return JSON.parse(JSON.stringify(element)) as PresentationElement
}

function cloneSlide(slide: Slide): Slide {
  return JSON.parse(JSON.stringify(slide)) as Slide
}

function cloneSlideForInsertion(slide: Slide, title: string): Slide {
  const source = cloneSlide(slide)
  const elementIdMap = new Map<string, string>()
  const groupIdMap = new Map<string, string>()
  const timestamp = new Date().toISOString()
  const elements = source.elements.map((element) => {
    const id = nanoid()
    elementIdMap.set(element.id, id)

    let groupId = ""
    if (element.groupId) {
      groupId = clonedGroupId(element.groupId, groupIdMap)
      groupIdMap.set(element.groupId, groupId)
    }

    return {
      ...element,
      id,
      groupId,
    }
  })

  return {
    ...source,
    id: nanoid(),
    title,
    elements,
    comments: (source.comments ?? []).map((comment) => ({
      ...comment,
      id: nanoid(),
      targetElementId: comment.targetElementId
        ? elementIdMap.get(comment.targetElementId) ?? ""
        : "",
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  }
}

function pickElementStyle(element: PresentationElement): ElementStyleClipboard {
  return {
    fontSize: element.fontSize,
    fontFamily: element.fontFamily,
    fontWeight: element.fontWeight,
    textAlign: element.textAlign,
    lineHeight: element.lineHeight,
    listStyle: element.listStyle,
    textColumns: element.textColumns,
    textFit: element.textFit,
    color: element.color,
    background: element.background,
    radius: element.radius,
    shapeStrokeColor: element.shapeStrokeColor,
    shapeStrokeWidth: element.shapeStrokeWidth,
    shapeStrokeDash: element.shapeStrokeDash,
    shapeStartArrowhead: element.shapeStartArrowhead,
    shapeEndArrowhead: element.shapeEndArrowhead,
    tableHeaderRow: element.tableHeaderRow,
    tableTotalRow: element.tableTotalRow,
    tableBorderColor: element.tableBorderColor,
    tableOfficeStyleId: element.tableOfficeStyleId,
    tableOfficeStyleName: element.tableOfficeStyleName,
    tableCellStyles: element.tableCellStyles,
    tableStyle: element.tableStyle,
    tableBandedRows: element.tableBandedRows,
    tableBandedColumns: element.tableBandedColumns,
    tableFirstColumn: element.tableFirstColumn,
    tableLastColumn: element.tableLastColumn,
    tableVerticalAlign: element.tableVerticalAlign,
    chartAxisColor: element.chartAxisColor,
    chartShowLegend: element.chartShowLegend,
    chartShowValues: element.chartShowValues,
    fit: element.fit,
    imageMask: element.imageMask,
    imagePositionX: element.imagePositionX,
    imagePositionY: element.imagePositionY,
    imageOpacity: element.imageOpacity,
    imageBrightness: element.imageBrightness,
    imageContrast: element.imageContrast,
    imageSaturation: element.imageSaturation,
  }
}

function clampElementPosition(value: number, size: number) {
  return Math.max(0, Math.min(100 - size, value))
}

function touch(deck: Deck): Deck {
  return {
    ...deck,
    updatedAt: new Date().toISOString(),
  }
}

function selectedSlide(state: StoreState) {
  return state.deck.slides.find((slide) => slide.id === state.selectedSlideId)
}

function selectedSlides(state: StoreState) {
  const ids = new Set(
    state.selectedSlideIds.length
      ? state.selectedSlideIds
      : [state.selectedSlideId],
  )
  const slides = state.deck.slides.filter((slide) => ids.has(slide.id))
  const activeSlide = selectedSlide(state)

  return slides.length ? slides : activeSlide ? [activeSlide] : []
}

function selectedElementIds(state: StoreState) {
  return resolveSelectedElementIds(
    state.selectedElementId,
    state.selectedElementIds,
  )
}

function withHistory(state: StoreState) {
  return {
    history: trimDeckHistory([...state.history, cloneDeck(state.deck)]),
    future: [],
  }
}

function selectedEditableElements(state: StoreState) {
  const slide = selectedSlide(state)
  if (!slide) return []

  const ids = new Set(selectedElementIds(state))
  return slide.elements.filter(
    (element) => ids.has(element.id) && !isElementLocked(element),
  )
}

function cloneElementsForInsertion(elements: PresentationElement[]) {
  const groupIdMap = new Map<string, string>()

  return elements.map((element) => {
    let groupId = ""

    if (element.groupId) {
      groupId = clonedGroupId(element.groupId, groupIdMap)
      groupIdMap.set(element.groupId, groupId)
    }

    const maxX = Math.max(0, 100 - element.width)
    const maxY = Math.max(0, 100 - element.height)

    return {
      ...cloneElement(element),
      id: nanoid(),
      groupId,
      x: Math.max(0, Math.min(maxX, element.x + 3)),
      y: Math.max(0, Math.min(maxY, element.y + 3)),
    }
  })
}

function clonedGroupId(sourceGroupId: string, groupIdMap: Map<string, string>) {
  const existingGroupId = groupIdMap.get(sourceGroupId)
  if (existingGroupId) return existingGroupId

  const diagramTemplateId = diagramTemplateIdFromGroupId(sourceGroupId)
  return diagramTemplateId
    ? diagramGroupIdForTemplate(diagramTemplateId, nanoid())
    : nanoid()
}

function createSlideComment(input: {
  body: string
  authorName?: string
  targetElementId?: string
}): SlideComment {
  const timestamp = new Date().toISOString()

  return {
    id: nanoid(),
    body: input.body.trim(),
    authorName: input.authorName?.trim() || "essencefromexistence",
    targetElementId: input.targetElementId ?? "",
    mentions: extractCommentMentions(input.body),
    resolved: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

const initialDeck = migrateDeckAssets(createDefaultDeck())

export const usePresentationStore = create<PresentationStore>()(
  persist(
    (set, get) => ({
      deck: initialDeck,
      selectedSlideId: initialDeck.slides[0]?.id ?? "",
      selectedSlideIds: initialDeck.slides[0]?.id ? [initialDeck.slides[0].id] : [],
      selectedElementId: null,
      selectedElementIds: [],
      objectAnimationPreviewElementId: null,
      objectAnimationPreviewKey: 0,
      collapsedSectionSlideIds: [],
      transitionPreviewKey: 0,
      zoom: 88,
      showGrid: false,
      showRulers: false,
      workspaceDensity: defaultWorkspacePreferences.density,
      workspacePanelWidths: { ...defaultWorkspacePreferences.panelWidths },
      workspacePanels: { ...defaultWorkspacePreferences.panels },
      copiedElements: [],
      copiedElementStyle: null,
      copiedSlides: [],
      copiedSlideMode: null,
      history: [],
      future: [],

      setDeckTitle(title) {
        set((state) => ({
          ...withHistory(state),
          deck: touch({ ...state.deck, title }),
        }))
      },

      setTheme(theme) {
        set((state) => ({
          ...withHistory(state),
          deck: touch({ ...state.deck, theme }),
        }))
      },

      applyDesignPalette(input) {
        set((state) => {
          const deck = applyDesignPaletteToDeck(
            state.deck,
            input.palette,
            input.scope,
            state.selectedSlideId,
          )

          if (deck === state.deck) return state

          return {
            ...withHistory(state),
            deck: touch(deck),
          }
        })
      },

      applyFontPair(input) {
        set((state) => {
          const deck = applyFontPairToDeck(
            state.deck,
            input.preset,
            input.scope,
            state.selectedSlideId,
          )

          if (deck === state.deck) return state

          return {
            ...withHistory(state),
            deck: touch(deck),
          }
        })
      },

      applyBrandKit(input) {
        set((state) => {
          const deck = applyBrandKitToDeck(
            state.deck,
            input.kit,
            input.scope,
            state.selectedSlideId,
          )

          if (deck === state.deck) return state

          return {
            ...withHistory(state),
            deck: touch(deck),
          }
        })
      },

      applyThemeBundle(input) {
        set((state) => ({
          ...withHistory(state),
          deck: touch(
            applyThemeBundleToDeck(
              state.deck,
              input.bundle,
              state.selectedSlideId,
            ),
          ),
        }))
      },

      updateDeckMaster(patch) {
        set((state) => ({
          ...withHistory(state),
          deck: touch({
            ...state.deck,
            master: {
              ...state.deck.master,
              ...patch,
            },
          }),
        }))
      },

      setZoom(zoom) {
        set({ zoom: Math.max(45, Math.min(140, zoom)) })
      },

      toggleGrid() {
        set((state) => ({ showGrid: !state.showGrid }))
      },

      toggleRulers() {
        set((state) => ({ showRulers: !state.showRulers }))
      },

      setWorkspaceDensity(density) {
        set({ workspaceDensity: density })
      },

      setWorkspacePanelWidth(panelId, width) {
        set((state) => ({
          workspacePanelWidths: {
            ...state.workspacePanelWidths,
            [panelId]: clampWorkspacePanelWidth(panelId, width),
          },
        }))
      },

      setWorkspacePanelOpen(panelId, open) {
        set((state) => ({
          workspacePanels: {
            ...state.workspacePanels,
            [workspacePanelOpenKey(panelId)]: open,
          },
        }))
      },

      toggleWorkspacePanel(panelId) {
        set((state) => {
          const key = workspacePanelOpenKey(panelId)

          return {
            workspacePanels: {
              ...state.workspacePanels,
              [key]: !state.workspacePanels[key],
            },
          }
        })
      },

      previewSlideTransition() {
        set((state) => ({
          transitionPreviewKey: state.transitionPreviewKey + 1,
        }))
      },

      previewElementAnimation(elementId) {
        let previewKey = 0
        let clearAfterMs = 700

        set((state) => {
          previewKey = state.objectAnimationPreviewKey + 1
          const element = state.deck.slides
            .flatMap((slide) => slide.elements)
            .find((item) => item.id === elementId)

          if (element) {
            clearAfterMs =
              elementAnimationDelay(element) + elementAnimationDuration(element) + 100
          }

          return {
            objectAnimationPreviewElementId: elementId,
            objectAnimationPreviewKey: previewKey,
          }
        })

        window.setTimeout(() => {
          set((state) =>
            state.objectAnimationPreviewElementId === elementId &&
            state.objectAnimationPreviewKey === previewKey
              ? { objectAnimationPreviewElementId: null }
              : state,
          )
        }, clearAfterMs)
      },

      selectSlide(slideId, options) {
        set((state) => {
          if (options?.range) {
            const activeIndex = state.deck.slides.findIndex(
              (slide) => slide.id === state.selectedSlideId,
            )
            const targetIndex = state.deck.slides.findIndex(
              (slide) => slide.id === slideId,
            )

            if (activeIndex >= 0 && targetIndex >= 0) {
              const startIndex = Math.min(activeIndex, targetIndex)
              const endIndex = Math.max(activeIndex, targetIndex)
              return {
                selectedSlideId: slideId,
                selectedSlideIds: state.deck.slides
                  .slice(startIndex, endIndex + 1)
                  .map((slide) => slide.id),
                selectedElementId: null,
                selectedElementIds: [],
                objectAnimationPreviewElementId: null,
              }
            }
          }

          if (!options?.additive) {
            return {
              selectedSlideId: slideId,
              selectedSlideIds: [slideId],
              selectedElementId: null,
              selectedElementIds: [],
              objectAnimationPreviewElementId: null,
            }
          }

          const selectedIds = new Set(state.selectedSlideIds)
          if (selectedIds.has(slideId)) {
            selectedIds.delete(slideId)
          } else {
            selectedIds.add(slideId)
          }

          const ids = Array.from(selectedIds)
          return {
            selectedSlideId: slideId,
            selectedSlideIds: ids.length ? ids : [slideId],
            selectedElementId: null,
            selectedElementIds: [],
            objectAnimationPreviewElementId: null,
          }
        })
      },

      selectSlides(slideIds) {
        set((state) => {
          const requestedIds = new Set(slideIds)
          const ids = state.deck.slides
            .filter((slide) => requestedIds.has(slide.id))
            .map((slide) => slide.id)
          const activeSlideId = ids.at(-1) ?? state.selectedSlideId

          return {
            selectedSlideId: activeSlideId,
            selectedSlideIds: ids.length ? ids : [state.selectedSlideId],
            selectedElementId: null,
            selectedElementIds: [],
            objectAnimationPreviewElementId: null,
          }
        })
      },

      selectSlideSection(slideId) {
        set((state) => {
          const activeSlideId = slideId ?? state.selectedSlideId
          const range = sectionRangeForSlide(state.deck.slides, activeSlideId)
          if (!range) return state

          return {
            selectedSlideId: activeSlideId,
            selectedSlideIds: range.slideIds.length
              ? range.slideIds
              : [activeSlideId],
            selectedElementId: null,
            selectedElementIds: [],
            objectAnimationPreviewElementId: null,
          }
        })
      },

      renameSlideSection(slideId, title) {
        set((state) => {
          const result = renameSlidesInSection(state.deck.slides, slideId, title)
          if (!result.changed) return state

          return {
            ...withHistory(state),
            deck: touch({ ...state.deck, slides: result.slides }),
            selectedSlideId: result.selectedSlideId,
            selectedSlideIds: result.selectedSlideIds,
            selectedElementId: null,
            selectedElementIds: [],
            objectAnimationPreviewElementId: null,
          }
        })
      },

      moveSlideSection(slideId, direction) {
        set((state) => {
          const result = moveSlidesInSection(
            state.deck.slides,
            slideId,
            direction,
          )
          if (!result.changed) return state

          return {
            ...withHistory(state),
            deck: touch({ ...state.deck, slides: result.slides }),
            selectedSlideId: result.selectedSlideId,
            selectedSlideIds: result.selectedSlideIds,
            selectedElementId: null,
            selectedElementIds: [],
            objectAnimationPreviewElementId: null,
            collapsedSectionSlideIds: sanitizeCollapsedSectionSlideIds(
              result.slides,
              state.collapsedSectionSlideIds,
            ),
          }
        })
      },

      selectElement(elementId, options) {
        set((state) => {
          if (!elementId) {
            return {
              selectedElementId: null,
              selectedElementIds: [],
              objectAnimationPreviewElementId: null,
            }
          }
          const slide = selectedSlide(state)
          const targetIds = slide
            ? expandSelectionToGroups(slide, [elementId])
            : [elementId]

          if (!options?.additive) {
            return {
              selectedElementId: elementId,
              selectedElementIds: targetIds,
              objectAnimationPreviewElementId: null,
            }
          }

          const current = new Set(selectedElementIds(state))
          const allTargetsSelected = targetIds.every((id) => current.has(id))

          if (allTargetsSelected) {
            for (const id of targetIds) {
              current.delete(id)
            }
          } else {
            for (const id of targetIds) {
              current.add(id)
            }
          }

          const ids = Array.from(current)
          return {
            selectedElementId: ids.at(-1) ?? null,
            selectedElementIds: ids,
            objectAnimationPreviewElementId: null,
          }
        })
      },

      selectElements(elementIds) {
        set((state) => {
          const slide = selectedSlide(state)
          const ids = slide
            ? expandSelectionToGroups(slide, elementIds)
            : elementIds

          return {
            selectedElementId: ids.at(-1) ?? null,
            selectedElementIds: ids,
            objectAnimationPreviewElementId: null,
          }
        })
      },

      toggleSlideSection(slideId) {
        set((state) => {
          const slide = state.deck.slides.find((item) => item.id === slideId)
          if (!slide?.sectionTitle) return state

          const collapsed = new Set(state.collapsedSectionSlideIds)
          if (collapsed.has(slideId)) {
            collapsed.delete(slideId)
          } else {
            collapsed.add(slideId)
          }

          return {
            collapsedSectionSlideIds: sanitizeCollapsedSectionSlideIds(
              state.deck.slides,
              Array.from(collapsed),
            ),
          }
        })
      },

      expandAllSlideSections() {
        set({ collapsedSectionSlideIds: [] })
      },

      collapseAllSlideSections() {
        set((state) => {
          const sectionSlideIds = sectionBreakSlideIds(state.deck.slides)
          if (!sectionSlideIds.length) return state

          const selectedIndex = state.deck.slides.findIndex(
            (slide) => slide.id === state.selectedSlideId,
          )
          const selectedSection = [...state.deck.slides]
            .slice(0, Math.max(0, selectedIndex) + 1)
            .reverse()
            .find((slide) => slide.sectionTitle)

          return {
            collapsedSectionSlideIds: sectionSlideIds,
            selectedSlideId: selectedSection?.id ?? state.selectedSlideId,
            selectedSlideIds: selectedSection
              ? [selectedSection.id]
              : state.selectedSlideIds,
            selectedElementId: selectedSection ? null : state.selectedElementId,
            selectedElementIds: selectedSection ? [] : state.selectedElementIds,
            objectAnimationPreviewElementId: null,
          }
        })
      },

      startSectionAtSelectedSlide() {
        set((state) => {
          const slide = selectedSlide(state)
          if (!slide) return state

          const sectionCount =
            state.deck.slides.filter((item) => item.sectionTitle.trim()).length +
            1
          const sectionTitle =
            slide.sectionTitle.trim() || `Section ${sectionCount}`

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id ? { ...item, sectionTitle } : item,
              ),
            }),
          }
        })
      },

      clearSelectedSectionBreaks() {
        set((state) => {
          const ids = new Set(
            state.selectedSlideIds.length
              ? state.selectedSlideIds
              : [state.selectedSlideId],
          )
          let changed = false
          const slides = state.deck.slides.map((slide) => {
            if (!ids.has(slide.id) || !slide.sectionTitle) return slide

            changed = true
            return { ...slide, sectionTitle: "" }
          })

          if (!changed) return state

          return {
            ...withHistory(state),
            deck: touch({ ...state.deck, slides }),
            collapsedSectionSlideIds: sanitizeCollapsedSectionSlideIds(
              slides,
              state.collapsedSectionSlideIds.filter((slideId) => !ids.has(slideId)),
            ),
          }
        })
      },

      addSlide() {
        set((state) => {
          const newSlide = createSlide(state.deck.slides.length + 1)
          const selectedIndex = state.deck.slides.findIndex(
            (slide) => slide.id === state.selectedSlideId,
          )
          const insertIndex =
            selectedIndex >= 0 ? selectedIndex + 1 : state.deck.slides.length
          const slides = [...state.deck.slides]
          slides.splice(insertIndex, 0, newSlide)

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides,
            }),
            selectedSlideId: newSlide.id,
            selectedSlideIds: [newSlide.id],
            selectedElementId: null,
            selectedElementIds: [],
          }
        })
      },

      copySelectedSlide() {
        set((state) => {
          const slides = selectedSlides(state)
          if (!slides.length) return state

          return {
            copiedSlides: slides.map(cloneSlide),
            copiedSlideMode: "copy" as const,
          }
        })
      },

      cutSelectedSlide() {
        set((state) => {
          const slidesToCut = selectedSlides(state)
          if (!slidesToCut.length) return state

          if (state.deck.slides.length <= slidesToCut.length) {
            return {
              copiedSlides: slidesToCut.map(cloneSlide),
              copiedSlideMode: "copy" as const,
            }
          }

          const cutIds = new Set(slidesToCut.map((slide) => slide.id))
          const index = state.deck.slides.findIndex((item) =>
            cutIds.has(item.id),
          )
          const slides = state.deck.slides.filter((item) => !cutIds.has(item.id))
          const nextSlide = slides[Math.max(0, index - 1)] ?? slides[0]

          return {
            ...withHistory(state),
            deck: touch({ ...state.deck, slides }),
            copiedSlides: slidesToCut.map(cloneSlide),
            copiedSlideMode: "cut" as const,
            collapsedSectionSlideIds: state.collapsedSectionSlideIds.filter(
              (slideId) => !cutIds.has(slideId),
            ),
            selectedSlideId: nextSlide.id,
            selectedSlideIds: [nextSlide.id],
            selectedElementId: null,
            selectedElementIds: [],
          }
        })
      },

      pasteCopiedSlides() {
        set((state) => {
          if (!state.copiedSlides.length) return state

          const selectedIndex = state.deck.slides.findIndex(
            (slide) => slide.id === state.selectedSlideId,
          )
          const insertIndex =
            selectedIndex >= 0 ? selectedIndex + 1 : state.deck.slides.length
          const pastedSlides = state.copiedSlides.map((slide) =>
            cloneSlideForInsertion(
              slide,
              state.copiedSlideMode === "cut"
                ? slide.title
                : `${slide.title} copy`,
            ),
          )
          const slides = [...state.deck.slides]
          slides.splice(insertIndex, 0, ...pastedSlides)

          return {
            ...withHistory(state),
            deck: touch({ ...state.deck, slides }),
            copiedSlideMode: "copy" as const,
            selectedSlideId: pastedSlides[0]?.id ?? state.selectedSlideId,
            selectedSlideIds: pastedSlides.map((slide) => slide.id),
            selectedElementId: null,
            selectedElementIds: [],
          }
        })
      },

      duplicateSlide() {
        set((state) => {
          const slidesToDuplicate = selectedSlides(state)
          if (!slidesToDuplicate.length) return state

          const selectedIds = new Set(
            slidesToDuplicate.map((slide) => slide.id),
          )
          const insertIndex =
            state.deck.slides.reduce(
              (lastIndex, slide, index) =>
                selectedIds.has(slide.id) ? index : lastIndex,
              -1,
            ) + 1
          const duplicates = slidesToDuplicate.map((slide) =>
            cloneSlideForInsertion(slide, `${slide.title} copy`),
          )
          const slides = [...state.deck.slides]
          slides.splice(insertIndex, 0, ...duplicates)

          return {
            ...withHistory(state),
            deck: touch({ ...state.deck, slides }),
            selectedSlideId: duplicates[0]?.id ?? state.selectedSlideId,
            selectedSlideIds: duplicates.map((slide) => slide.id),
            selectedElementId: null,
            selectedElementIds: [],
          }
        })
      },

      deleteSlide() {
        set((state) => {
          if (state.deck.slides.length <= 1) return state

          const slidesToDelete = selectedSlides(state)
          if (
            !slidesToDelete.length ||
            state.deck.slides.length <= slidesToDelete.length
          ) {
            return state
          }

          const deleteIds = new Set(slidesToDelete.map((slide) => slide.id))
          const index = state.deck.slides.findIndex((slide) =>
            deleteIds.has(slide.id),
          )
          const slides = state.deck.slides.filter(
            (slide) => !deleteIds.has(slide.id),
          )
          const nextSlide = slides[Math.max(0, index - 1)] ?? slides[0]

          return {
            ...withHistory(state),
            deck: touch({ ...state.deck, slides }),
            selectedSlideId: nextSlide.id,
            selectedSlideIds: [nextSlide.id],
            collapsedSectionSlideIds: sanitizeCollapsedSectionSlideIds(
              slides,
              state.collapsedSectionSlideIds.filter(
                (slideId) => !deleteIds.has(slideId),
              ),
            ),
            selectedElementId: null,
            selectedElementIds: [],
          }
        })
      },

      moveSlide(direction) {
        set((state) => {
          const selectedIds = new Set(
            state.selectedSlideIds.length
              ? state.selectedSlideIds
              : [state.selectedSlideId],
          )
          if (!selectedIds.size) return state

          const slides = [...state.deck.slides]
          let changed = false

          if (direction === -1) {
            for (let index = 1; index < slides.length; index += 1) {
              const slide = slides[index]
              const previousSlide = slides[index - 1]
              if (
                slide &&
                previousSlide &&
                selectedIds.has(slide.id) &&
                !selectedIds.has(previousSlide.id)
              ) {
                slides[index - 1] = slide
                slides[index] = previousSlide
                changed = true
              }
            }
          } else {
            for (let index = slides.length - 2; index >= 0; index -= 1) {
              const slide = slides[index]
              const nextSlide = slides[index + 1]
              if (
                slide &&
                nextSlide &&
                selectedIds.has(slide.id) &&
                !selectedIds.has(nextSlide.id)
              ) {
                slides[index + 1] = slide
                slides[index] = nextSlide
                changed = true
              }
            }
          }

          if (!changed) return state
          const selectedSlideIds = slides
            .filter((slide) => selectedIds.has(slide.id))
            .map((slide) => slide.id)

          return {
            ...withHistory(state),
            deck: touch({ ...state.deck, slides }),
            selectedSlideIds,
          }
        })
      },

      moveSlideToIndex(slideId, insertIndex) {
        set((state) => {
          const selectedIds = new Set(
            state.selectedSlideIds.includes(slideId)
              ? state.selectedSlideIds
              : [slideId],
          )
          const movingSlides = state.deck.slides.filter((slide) =>
            selectedIds.has(slide.id),
          )
          if (!movingSlides.length) return state

          const originalInsertIndex = Math.max(
            0,
            Math.min(state.deck.slides.length, insertIndex),
          )
          const movingSlidesBeforeTarget = state.deck.slides
            .slice(0, originalInsertIndex)
            .filter((slide) => selectedIds.has(slide.id)).length
          const remainingSlides = state.deck.slides.filter(
            (slide) => !selectedIds.has(slide.id),
          )
          const targetIndex = Math.max(
            0,
            Math.min(
              remainingSlides.length,
              originalInsertIndex - movingSlidesBeforeTarget,
            ),
          )
          const slides = [...remainingSlides]
          slides.splice(targetIndex, 0, ...movingSlides)

          const changed = slides.some(
            (slide, index) => slide.id !== state.deck.slides[index]?.id,
          )
          if (!changed) return state

          return {
            ...withHistory(state),
            deck: touch({ ...state.deck, slides }),
            selectedSlideId: slideId,
            selectedSlideIds: movingSlides.map((slide) => slide.id),
            selectedElementId: null,
            selectedElementIds: [],
          }
        })
      },

      updateSlide(slideId, patch) {
        set((state) => ({
          ...withHistory(state),
          deck: touch({
            ...state.deck,
            slides: state.deck.slides.map((slide) =>
              slide.id === slideId ? { ...slide, ...patch } : slide,
            ),
          }),
        }))
      },

      updateSlideLive(slideId, patch) {
        set((state) => ({
          deck: touch({
            ...state.deck,
            slides: state.deck.slides.map((slide) =>
              slide.id === slideId ? { ...slide, ...patch } : slide,
            ),
          }),
        }))
      },

      applyCustomSlideLayout(input) {
        set((state) => {
          const targetIds = input.slideIds?.length
            ? input.slideIds
            : [state.selectedSlideId]
          const result = applyCustomSlideLayoutToSlides(
            state.deck.slides,
            input.layout,
            targetIds,
          )

          if (!result.appliedCount) return state
          const master =
            input.layout.id?.startsWith("deck-layout:")
              ? markDeckLayoutPresetUsed(
                  state.deck.master,
                  input.layout.id as `deck-layout:${string}`,
                )
              : state.deck.master

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              master,
              slides: result.slides,
            }),
            selectedElementId: null,
            selectedElementIds: [],
          }
        })
      },

      applySlideLayout(slideId, layout) {
        set((state) => ({
          ...withHistory(state),
          deck: touch({
            ...state.deck,
            slides: state.deck.slides.map((slide) =>
              slide.id === slideId
                ? applyLayoutPlaceholders(slide, layout)
                : slide,
            ),
          }),
          selectedElementId: null,
          selectedElementIds: [],
        }))
      },

      addSlideComment(slideId, input) {
        const body = input.body.trim()
        if (!body) return

        set((state) => {
          const comment = createSlideComment({ ...input, body })

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((slide) =>
                slide.id === slideId
                  ? {
                      ...slide,
                      comments: [...(slide.comments ?? []), comment],
                    }
                  : slide,
              ),
            }),
          }
        })
      },

      updateSlideComment(slideId, commentId, patch) {
        set((state) => {
          let changed = false

          const slides = state.deck.slides.map((slide) => {
            if (slide.id !== slideId) return slide

            const comments = (slide.comments ?? []).map((comment) => {
              if (comment.id !== commentId) return comment

              changed = true

              const nextBody = patch.body?.trim() ?? comment.body

              return {
                ...comment,
                ...patch,
                body: nextBody,
                mentions:
                  patch.body === undefined
                    ? comment.mentions
                    : extractCommentMentions(nextBody),
                updatedAt: new Date().toISOString(),
              }
            })

            return { ...slide, comments }
          })

          if (!changed) return state

          return {
            ...withHistory(state),
            deck: touch({ ...state.deck, slides }),
          }
        })
      },

      deleteSlideComment(slideId, commentId) {
        set((state) => {
          let deleted = false

          const slides = state.deck.slides.map((slide) => {
            if (slide.id !== slideId) return slide

            const comments = (slide.comments ?? []).filter((comment) => {
              const shouldDelete = comment.id === commentId
              deleted ||= shouldDelete
              return !shouldDelete
            })

            return { ...slide, comments }
          })

          if (!deleted) return state

          return {
            ...withHistory(state),
            deck: touch({ ...state.deck, slides }),
          }
        })
      },

      addElement(type) {
        set((state) => {
          const slide = selectedSlide(state)
          if (!slide) return state
          const newElement = createElement(type)

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id
                  ? { ...item, elements: [...item.elements, newElement] }
                  : item,
              ),
            }),
            selectedElementId: newElement.id,
            selectedElementIds: [newElement.id],
          }
        })
      },

      addShapeElement(shapeKind) {
        set((state) => {
          const slide = selectedSlide(state)
          if (!slide) return state
          const isLinear =
            shapeKind === "line" ||
            shapeKind === "arrow" ||
            shapeKind === "doubleArrow" ||
            shapeKind === "elbowConnector" ||
            shapeKind === "curvedConnector"
          const connectorGeometry = defaultConnectorGeometryForShape(shapeKind)
          const newElement = {
            ...createElement("shape"),
            x: isLinear ? 24 : 30,
            y: isLinear ? 42 : 30,
            width: isLinear ? 42 : 32,
            height: isLinear ? 6 : 28,
            background: isLinear ? "transparent" : "#dbeafe",
            shapeKind,
            shapeConnectorControlX: connectorGeometry.controlX,
            shapeConnectorControlY: connectorGeometry.controlY,
            shapeConnectorEndX: connectorGeometry.endX,
            shapeConnectorEndY: connectorGeometry.endY,
            shapeConnectorStartX: connectorGeometry.startX,
            shapeConnectorStartY: connectorGeometry.startY,
            shapeStartArrowhead:
              shapeKind === "doubleArrow" ? ("triangle" as const) : ("none" as const),
            shapeEndArrowhead:
              shapeKind === "arrow" ||
              shapeKind === "doubleArrow" ||
              shapeKind === "elbowConnector" ||
              shapeKind === "curvedConnector"
                ? ("triangle" as const)
                : ("none" as const),
          }

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id
                  ? { ...item, elements: [...item.elements, newElement] }
                  : item,
              ),
            }),
            selectedElementId: newElement.id,
            selectedElementIds: [newElement.id],
          }
        })
      },

      addTextElement(input) {
        set((state) => {
          const slide = selectedSlide(state)
          if (!slide) return state
          const width = input.width ?? 42
          const height = input.height ?? 12
          const newElement = {
            ...createElement("text"),
            x: clampElementPosition(input.x ?? 14, width),
            y: clampElementPosition(input.y ?? 30, height),
            width,
            height,
            content: input.content,
            fontSize: input.fontSize ?? 26,
          }

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id
                  ? { ...item, elements: [...item.elements, newElement] }
                  : item,
              ),
            }),
            selectedElementId: newElement.id,
            selectedElementIds: [newElement.id],
          }
        })
      },

      addActionButton(input) {
        set((state) => {
          const slide = selectedSlide(state)
          if (!slide || !input.linkSlideId) return state
          const groupId = nanoid()
          const sharedAction = {
            groupId,
            linkSlideId: input.linkSlideId,
          }
          const shape = {
            ...createElement("shape"),
            ...sharedAction,
            x: 68,
            y: 78,
            width: 18,
            height: 8,
            background: input.background,
            radius: input.radius ?? 12,
            shapeKind: input.shapeKind ?? ("rounded" as const),
            shapeStrokeColor: input.stroke,
            shapeStrokeWidth: 2,
          }
          const label = {
            ...createElement("text"),
            ...sharedAction,
            x: 68,
            y: 78.5,
            width: 18,
            height: 7,
            background: "transparent",
            color: input.foreground ?? "#ffffff",
            content: input.label,
            fontSize: 16,
            fontWeight: 700 as const,
            lineHeight: 1.05,
            textAlign: "center" as const,
          }

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id
                  ? { ...item, elements: [...item.elements, shape, label] }
                  : item,
              ),
            }),
            selectedElementId: label.id,
            selectedElementIds: [shape.id, label.id],
          }
        })
      },

      addDiagram(templateId) {
        set((state) => {
          const slide = selectedSlide(state)
          if (!slide) return state
          const groupId = diagramGroupIdForTemplate(templateId, nanoid())
          const elements = diagramElementSpecs(templateId).map((spec) => ({
            ...createElement(spec.type),
            ...spec.patch,
            groupId,
          }))
          const ids = elements.map((element) => element.id)

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id
                  ? { ...item, elements: [...item.elements, ...elements] }
                  : item,
              ),
            }),
            selectedElementId: ids.at(-1) ?? null,
            selectedElementIds: ids,
          }
        })
      },

      addIconElement(input) {
        set((state) => {
          const slide = selectedSlide(state)
          if (!slide) return state
          const newElement = {
            ...createElement("icon"),
            iconName: input.iconName,
            alt: input.alt ?? "Inserted icon",
          }

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id
                  ? { ...item, elements: [...item.elements, newElement] }
                  : item,
              ),
            }),
            selectedElementId: newElement.id,
            selectedElementIds: [newElement.id],
          }
        })
      },

      addSticker(template) {
        set((state) => {
          const slide = selectedSlide(state)
          if (!slide) return state
          const groupId = nanoid()
          const isDiamond = template.shapeKind === "diamond"
          const shape = {
            ...createElement("shape"),
            groupId,
            x: 62,
            y: 12,
            width: 22,
            height: 10,
            background: template.fill,
            radius: template.shapeKind === "rounded" ? 12 : 0,
            shapeKind: template.shapeKind,
            shapeStrokeColor: template.stroke,
            shapeStrokeWidth: 2,
          }
          const label = {
            ...createElement("text"),
            groupId,
            x: 63.5,
            y: isDiamond ? 14 : 14.3,
            width: 19,
            height: 5.8,
            background: "transparent",
            color: template.color,
            content: template.text,
            fontSize: template.text.length > 6 ? 14 : 16,
            fontWeight: 700 as const,
            lineHeight: 1,
            textAlign: "center" as const,
          }

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id
                  ? { ...item, elements: [...item.elements, shape, label] }
                  : item,
              ),
            }),
            selectedElementId: label.id,
            selectedElementIds: [shape.id, label.id],
          }
        })
      },

      addAudioElement(input) {
        set((state) => {
          const slide = selectedSlide(state)
          if (!slide) return state
          const newElement = createAudioElement(input)

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id
                  ? { ...item, elements: [...item.elements, newElement] }
                  : item,
              ),
            }),
            selectedElementId: newElement.id,
            selectedElementIds: [newElement.id],
          }
        })
      },

      addImageElement(input) {
        set((state) => {
          const slide = selectedSlide(state)
          if (!slide) return state
          const imageAsset = withImageAsset(state.deck, {
            src: input.src,
            name: input.alt,
          })
          const imageElement = createImageElement({
            assetId: imageAsset.assetId,
            alt: input.alt,
          })
          const newElement = {
            ...imageElement,
            x: clampElementPosition(
              input.x ?? imageElement.x,
              imageElement.width,
            ),
            y: clampElementPosition(
              input.y ?? imageElement.y,
              imageElement.height,
            ),
          }

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              assets: imageAsset.assets,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id
                  ? { ...item, elements: [...item.elements, newElement] }
                  : item,
              ),
            }),
            selectedElementId: newElement.id,
            selectedElementIds: [newElement.id],
          }
        })
      },

      addVideoElement(input) {
        set((state) => {
          const slide = selectedSlide(state)
          if (!slide) return state
          const newElement = createVideoElement(input)

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id
                  ? { ...item, elements: [...item.elements, newElement] }
                  : item,
              ),
            }),
            selectedElementId: newElement.id,
            selectedElementIds: [newElement.id],
          }
        })
      },

      addImageSlides(input) {
        if (!input.length) return

        set((state) => {
          let assets = state.deck.assets ?? []
          const slides = input.map((item, index) => {
            const imageAsset = withImageAsset({ ...state.deck, assets }, {
              src: item.src,
              name: item.alt,
            })
            assets = imageAsset.assets

            return createImageSlide(state.deck.slides.length + index + 1, {
              assetId: imageAsset.assetId,
              alt: item.alt,
            })
          })

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              assets,
              slides: [...state.deck.slides, ...slides],
            }),
            selectedSlideId: slides[0]?.id ?? state.selectedSlideId,
            selectedSlideIds: slides.length
              ? slides.map((slide) => slide.id)
              : state.selectedSlideIds,
            selectedElementId: null,
            selectedElementIds: [],
          }
        })
      },

      replaceImageElement(elementId, input) {
        set((state) => {
          const imageAsset = withImageAsset(state.deck, {
            src: input.src,
            name: input.alt,
          })

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              assets: imageAsset.assets,
              slides: state.deck.slides.map((slide) => ({
                ...slide,
                elements: slide.elements.map((element) =>
                  element.id === elementId && element.type === "image"
                    ? {
                        ...element,
                        assetId: imageAsset.assetId,
                        src: "",
                        alt: input.alt ?? element.alt,
                      }
                    : element,
                ),
              })),
            }),
          }
        })
      },

      replaceAudioElement(elementId, input) {
        set((state) => ({
          ...withHistory(state),
          deck: touch({
            ...state.deck,
            slides: state.deck.slides.map((slide) => ({
              ...slide,
              elements: slide.elements.map((element) =>
                element.id === elementId && element.type === "audio"
                  ? {
                      ...element,
                      src: input.src,
                      alt: input.alt ?? element.alt,
                      mediaStartSeconds: 0,
                      mediaEndSeconds: 0,
                    }
                  : element,
              ),
            })),
          }),
        }))
      },

      replaceVideoElement(elementId, input) {
        set((state) => ({
          ...withHistory(state),
          deck: touch({
            ...state.deck,
            slides: state.deck.slides.map((slide) => ({
              ...slide,
              elements: slide.elements.map((element) =>
                element.id === elementId && element.type === "video"
                  ? {
                      ...element,
                      src: input.src,
                      alt: input.alt ?? element.alt,
                      mediaStartSeconds: 0,
                      mediaEndSeconds: 0,
                    }
                  : element,
              ),
            })),
          }),
        }))
      },

      addOutlineSlides(input) {
        if (!input.length) return

        set((state) => {
          const slides = input.map((item, index) =>
            createOutlineSlide(state.deck.slides.length + index + 1, item),
          )

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: [...state.deck.slides, ...slides],
            }),
            selectedSlideId: slides[0]?.id ?? state.selectedSlideId,
            selectedSlideIds: slides.length
              ? slides.map((slide) => slide.id)
              : state.selectedSlideIds,
            selectedElementId: null,
            selectedElementIds: [],
          }
        })
      },

      updateElement(elementId, patch) {
        set((state) => ({
          ...withHistory(state),
          deck: touch({
            ...state.deck,
            slides: state.deck.slides.map((slide) => ({
              ...slide,
              elements: slide.elements.map((element) =>
                element.id === elementId ? { ...element, ...patch } : element,
              ),
            })),
          }),
        }))
      },

      updateElementLive(elementId, patch) {
        set((state) => ({
          deck: touch({
            ...state.deck,
            slides: state.deck.slides.map((slide) => ({
              ...slide,
              elements: slide.elements.map((element) =>
                element.id === elementId ? { ...element, ...patch } : element,
              ),
            })),
          }),
        }))
      },

      updateElementsLive(patches) {
        const patchesById = new Map(
          patches.map((item) => [item.id, item.patch]),
        )
        set((state) => ({
          deck: touch({
            ...state.deck,
            slides: state.deck.slides.map((slide) => ({
              ...slide,
              elements: slide.elements.map((element) => {
                const patch = patchesById.get(element.id)
                return patch ? { ...element, ...patch } : element
              }),
            })),
          }),
        }))
      },

      applyRemoteObjectMutation(mutation) {
        let result: CollaborationMutationApplyResult = {
          appliedCount: 0,
          deck: get().deck,
          skipped: [],
        }

        set((state) => {
          result = applyCollaborationObjectMutation(state.deck, mutation)

          if (!result.appliedCount) {
            return state
          }

          return {
            ...withHistory(state),
            deck: touch(result.deck),
          }
        })

        return result
      },

      captureHistory() {
        set((state) => ({
          ...withHistory(state),
        }))
      },

      copySelectedElements() {
        set((state) => {
          const elements = selectedEditableElements(state)
          if (!elements.length) return state

          return {
            copiedElements: elements.map(cloneElement),
          }
        })
      },

      cutSelectedElements() {
        set((state) => {
          const elementsToCut = selectedEditableElements(state)
          if (!elementsToCut.length) return state

          const ids = new Set(elementsToCut.map((element) => element.id))
          const slides = state.deck.slides.map((slide) => {
            const cutElementIds = new Set<string>()
            const elements = slide.elements.filter((element) => {
              const shouldCut = ids.has(element.id) && !isElementLocked(element)
              if (shouldCut) {
                cutElementIds.add(element.id)
              }
              return !shouldCut
            })

            return {
              ...slide,
              elements,
              comments: (slide.comments ?? []).map((comment) =>
                cutElementIds.has(comment.targetElementId)
                  ? { ...comment, targetElementId: "" }
                  : comment,
              ),
            }
          })

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides,
            }),
            copiedElements: elementsToCut.map(cloneElement),
            selectedElementId: null,
            selectedElementIds: [],
          }
        })
      },

      pasteCopiedElements() {
        set((state) => {
          const slide = selectedSlide(state)
          if (!slide || !state.copiedElements.length) return state

          const insertedElements = cloneElementsForInsertion(state.copiedElements)
          const insertedIds = insertedElements.map((element) => element.id)

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id
                  ? {
                      ...item,
                      elements: [...item.elements, ...insertedElements],
                    }
                  : item,
              ),
            }),
            copiedElements: insertedElements.map(cloneElement),
            selectedElementId: insertedIds.at(-1) ?? null,
            selectedElementIds: insertedIds,
          }
        })
      },

      copySelectedElementStyle() {
        set((state) => {
          const [element] = selectedEditableElements(state)
          if (!element) return state

          return {
            copiedElementStyle: pickElementStyle(element),
          }
        })
      },

      pasteCopiedElementStyle() {
        set((state) => {
          const style = state.copiedElementStyle
          const slide = selectedSlide(state)
          const ids = new Set(
            selectedEditableElements(state).map((element) => element.id),
          )

          if (!style || !slide || !ids.size) return state

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id
                  ? {
                      ...item,
                      elements: item.elements.map((element) =>
                        ids.has(element.id) && !isElementLocked(element)
                          ? { ...element, ...style }
                          : element,
                      ),
                    }
                  : item,
              ),
            }),
          }
        })
      },

      duplicateSelectedElements() {
        set((state) => {
          const slide = selectedSlide(state)
          if (!slide) return state

          const duplicatedElements = cloneElementsForInsertion(
            selectedEditableElements(state),
          )
          if (!duplicatedElements.length) return state

          const duplicatedIds = duplicatedElements.map((element) => element.id)

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id
                  ? {
                      ...item,
                      elements: [...item.elements, ...duplicatedElements],
                    }
                  : item,
              ),
            }),
            selectedElementId: duplicatedIds.at(-1) ?? null,
            selectedElementIds: duplicatedIds,
          }
        })
      },

      moveElementAnimationOrder(elementId, direction) {
        set((state) => {
          const slide = selectedSlide(state)
          if (!slide) return state

          const result = moveAnimatedElementInOrder(slide, elementId, direction)
          if (!result.moved) return state

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id ? result.slide : item,
              ),
            }),
            selectedElementId: elementId,
            selectedElementIds: [elementId],
          }
        })
      },

      moveSelectedElementLayer(direction, mode = "step") {
        set((state) => {
          const slide = selectedSlide(state)
          if (!slide) return state

          const movingIds = new Set(selectedElementIds(state))
          if (!movingIds.size) return state

          const indexedElements = slide.elements.map((element, itemIndex) => ({
            element,
            itemIndex,
          }))
          const moving = indexedElements.filter((item) =>
            movingIds.has(item.element.id),
          )

          if (!moving.length || moving.some((item) => isElementLocked(item.element))) {
            return state
          }

          const remaining = indexedElements.filter(
            (item) => !movingIds.has(item.element.id),
          )

          let nextElements: PresentationElement[]

          if (mode === "boundary") {
            nextElements =
              direction === 1
                ? [...remaining, ...moving].map(({ element }) => element)
                : [...moving, ...remaining].map(({ element }) => element)
          } else {
            const boundary =
              direction === 1
                ? Math.max(...moving.map((item) => item.itemIndex))
                : Math.min(...moving.map((item) => item.itemIndex))
            const neighbor =
              direction === 1
                ? indexedElements.find(
                    (item) =>
                      item.itemIndex > boundary &&
                      !movingIds.has(item.element.id),
                  )
                : [...indexedElements]
                    .reverse()
                    .find(
                      (item) =>
                        item.itemIndex < boundary &&
                        !movingIds.has(item.element.id),
                    )

            if (!neighbor) return state

            const neighborIndex = remaining.findIndex(
              (item) => item.element.id === neighbor.element.id,
            )
            const insertIndex = direction === 1 ? neighborIndex + 1 : neighborIndex
            remaining.splice(insertIndex, 0, ...moving)
            nextElements = remaining.map(({ element }) => element)
          }

          const changed = nextElements.some(
            (element, index) => element.id !== slide.elements[index]?.id,
          )
          if (!changed) return state

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id
                  ? {
                      ...item,
                      elements: nextElements,
                    }
                  : item,
              ),
            }),
          }
        })
      },

      nudgeSelectedElements(deltaX, deltaY) {
        set((state) => {
          const ids = selectedElementIds(state)
          if (!ids.length) return state

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((slide) =>
                slide.id === state.selectedSlideId
                  ? nudgeSlideElements(slide, ids, deltaX, deltaY)
                  : slide,
              ),
            }),
          }
        })
      },

      alignSelectedElements(alignment) {
        set((state) => {
          const slide = selectedSlide(state)
          const ids = selectedElementIds(state)
          if (!slide || !ids.length) return state

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id
                  ? alignSlideElements(item, ids, alignment)
                  : item,
              ),
            }),
          }
        })
      },

      distributeSelectedElements(axis) {
        set((state) => {
          const slide = selectedSlide(state)
          const ids = selectedElementIds(state)
          if (!slide || ids.length < 3) return state

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id
                  ? distributeSlideElements(item, ids, axis)
                  : item,
              ),
            }),
          }
        })
      },

      groupSelectedElements() {
        set((state) => {
          const slide = selectedSlide(state)
          if (!slide) return state

          const ids = groupableElementIds(slide, selectedElementIds(state))
          if (ids.length < 2) return state

          const groupId = nanoid()
          const selectedIds = new Set(ids)

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id
                  ? {
                      ...item,
                      elements: item.elements.map((element) =>
                        selectedIds.has(element.id)
                          ? { ...element, groupId }
                          : element,
                      ),
                    }
                  : item,
              ),
            }),
            selectedElementId: ids.at(-1) ?? state.selectedElementId,
            selectedElementIds: ids,
          }
        })
      },

      ungroupSelectedElements() {
        set((state) => {
          const slide = selectedSlide(state)
          if (!slide) return state

          const ids = selectedElementIds(state)
          const groupIds = selectedGroupIds(slide, ids)
          if (!groupIds.size) return state

          const selectedIds = new Set(ids)
          const ungroupedIds = slide.elements
            .filter(
              (element) =>
                selectedIds.has(element.id) ||
                (element.groupId && groupIds.has(element.groupId)),
            )
            .map((element) => element.id)

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides: state.deck.slides.map((item) =>
                item.id === slide.id
                  ? {
                      ...item,
                      elements: item.elements.map((element) =>
                        element.groupId && groupIds.has(element.groupId)
                          ? { ...element, groupId: "" }
                          : element,
                      ),
                    }
                  : item,
              ),
            }),
            selectedElementId: ungroupedIds.at(-1) ?? state.selectedElementId,
            selectedElementIds: ungroupedIds,
          }
        })
      },

      deleteElement() {
        set((state) => {
          const ids = new Set(selectedElementIds(state))
          if (!ids.size) return state

          let deleted = false
          const slides = state.deck.slides.map((slide) => {
            const deletedElementIds = new Set<string>()
            const elements = slide.elements.filter((element) => {
              const shouldDelete = ids.has(element.id) && !isElementLocked(element)
              deleted ||= shouldDelete
              if (shouldDelete) {
                deletedElementIds.add(element.id)
              }
              return !shouldDelete
            })

            return {
              ...slide,
              elements,
              comments: (slide.comments ?? []).map((comment) =>
                deletedElementIds.has(comment.targetElementId)
                  ? { ...comment, targetElementId: "" }
                  : comment,
              ),
            }
          })

          if (!deleted) return state

          return {
            ...withHistory(state),
            deck: touch({
              ...state.deck,
              slides,
            }),
            selectedElementId: null,
            selectedElementIds: [],
          }
        })
      },

      undo() {
        set((state) => {
          const previous = state.history.at(-1)
          if (!previous) return state

          return {
            deck: previous,
            selectedSlideId: previous.slides[0]?.id ?? "",
            selectedSlideIds: previous.slides[0]?.id
              ? [previous.slides[0].id]
              : [],
            selectedElementId: null,
            selectedElementIds: [],
            collapsedSectionSlideIds: state.collapsedSectionSlideIds,
            zoom: state.zoom,
            showGrid: state.showGrid,
            showRulers: state.showRulers,
            copiedElements: state.copiedElements,
            copiedElementStyle: state.copiedElementStyle,
            copiedSlides: state.copiedSlides,
            copiedSlideMode: state.copiedSlideMode,
            history: state.history.slice(0, -1),
            future: trimDeckHistory(
              [cloneDeck(state.deck), ...state.future],
              "newest-first",
            ),
          }
        })
      },

      redo() {
        set((state) => {
          const next = state.future[0]
          if (!next) return state

          return {
            deck: next,
            selectedSlideId: next.slides[0]?.id ?? "",
            selectedSlideIds: next.slides[0]?.id ? [next.slides[0].id] : [],
            selectedElementId: null,
            selectedElementIds: [],
            collapsedSectionSlideIds: state.collapsedSectionSlideIds,
            zoom: state.zoom,
            showGrid: state.showGrid,
            showRulers: state.showRulers,
            copiedElements: state.copiedElements,
            copiedElementStyle: state.copiedElementStyle,
            copiedSlides: state.copiedSlides,
            copiedSlideMode: state.copiedSlideMode,
            history: trimDeckHistory([...state.history, cloneDeck(state.deck)]),
            future: state.future.slice(1),
          }
        })
      },

      replaceDeck(deck) {
        const migratedDeck = migrateDeckAssets(deck)
        set((state) => ({
          ...withHistory(state),
          deck: touch(migratedDeck),
          selectedSlideId: migratedDeck.slides[0]?.id ?? "",
          selectedSlideIds: migratedDeck.slides[0]?.id
            ? [migratedDeck.slides[0].id]
            : [],
          selectedElementId: null,
          selectedElementIds: [],
          objectAnimationPreviewElementId: null,
          collapsedSectionSlideIds: [],
        }))
      },

      cleanUpDeckAssets() {
        let cleanupResult = compactDeckAssets(get().deck)

        set((state) => {
          const result = compactDeckAssets(state.deck)
          cleanupResult = result
          if (!result.changed) return state

          return {
            ...withHistory(state),
            deck: touch(result.deck),
          }
        })

        return cleanupResult
      },

      exportDeck() {
        return {
          version: 1,
          deck: migrateDeckAssets(get().deck),
        }
      },
    }),
    {
      name: "essence-powerpoint-deck",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => createPresentationPersistenceSnapshot(state),
      merge: (persisted, current) => {
        return mergePresentationPersistedState(
          persisted as Partial<PresentationPersistenceState> | undefined,
          current,
        )
      },
    },
  ),
)
