import { migrateDeckAssets } from "./deck-assets"
import { sanitizeCollapsedSectionSlideIds } from "./slide-sections"
import type { Deck } from "./types"
import {
  defaultWorkspacePreferences,
  normalizeWorkspacePreferences,
  type WorkspaceDensity,
  type WorkspacePanelWidths,
  type WorkspacePanelState,
} from "./workspace-ergonomics"

export type PresentationPersistenceState = {
  deck: Deck
  selectedSlideId: string
  selectedSlideIds: string[]
  selectedElementId: string | null
  selectedElementIds: string[]
  objectAnimationPreviewElementId: string | null
  objectAnimationPreviewKey: number
  collapsedSectionSlideIds: string[]
  zoom: number
  showGrid: boolean
  showRulers: boolean
  workspaceDensity: WorkspaceDensity
  workspacePanelWidths: WorkspacePanelWidths
  workspacePanels: WorkspacePanelState
  history: Deck[]
  future: Deck[]
}

export type PresentationPersistenceSnapshot = {
  deck: Deck
  selectedSlideId: string
  selectedSlideIds: string[]
  selectedElementId: string | null
  selectedElementIds: string[]
  objectAnimationPreviewElementId: null
  objectAnimationPreviewKey: 0
  collapsedSectionSlideIds: string[]
  zoom: number
  showGrid: boolean
  showRulers: boolean
  workspaceDensity: WorkspaceDensity
  workspacePanelWidths: WorkspacePanelWidths
  workspacePanels: WorkspacePanelState
  history: []
  future: []
}

const MIN_ZOOM = 45
const MAX_ZOOM = 140

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function uniqueValid(ids: string[], validIds: Set<string>) {
  const seen = new Set<string>()
  return ids.filter((id) => {
    if (!validIds.has(id) || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function clampZoom(value: unknown, fallback: number) {
  const zoom = typeof value === "number" && Number.isFinite(value) ? value : fallback
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
}

function booleanOr(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback
}

function normalizedSelection(input: {
  deck: Deck
  current?: Partial<PresentationPersistenceState>
  selectedSlideId?: unknown
  selectedSlideIds?: unknown
  selectedElementId?: unknown
  selectedElementIds?: unknown
  collapsedSectionSlideIds?: unknown
}) {
  const slideIds = new Set(input.deck.slides.map((slide) => slide.id))
  const currentSlideId =
    typeof input.current?.selectedSlideId === "string"
      ? input.current.selectedSlideId
      : ""
  const requestedSlideId =
    typeof input.selectedSlideId === "string" ? input.selectedSlideId : ""
  const selectedSlideId = slideIds.has(requestedSlideId)
    ? requestedSlideId
    : slideIds.has(currentSlideId)
      ? currentSlideId
      : input.deck.slides[0]?.id ?? ""
  const requestedSlideIds = uniqueValid(stringList(input.selectedSlideIds), slideIds)
  const currentSlideIds = uniqueValid(
    stringList(input.current?.selectedSlideIds),
    slideIds,
  )
  const selectedSlideIds = requestedSlideIds.length
    ? requestedSlideIds
    : currentSlideIds.length
      ? currentSlideIds
      : selectedSlideId
        ? [selectedSlideId]
        : []
  const normalizedSlideIds = selectedSlideIds.includes(selectedSlideId)
    ? selectedSlideIds
    : selectedSlideId
      ? [selectedSlideId]
      : []
  const activeSlide = input.deck.slides.find((slide) => slide.id === selectedSlideId)
  const elementIds = new Set(activeSlide?.elements.map((element) => element.id) ?? [])
  const requestedElementIds = uniqueValid(
    stringList(input.selectedElementIds),
    elementIds,
  )
  const requestedElementId =
    typeof input.selectedElementId === "string" ? input.selectedElementId : null
  const selectedElementId =
    requestedElementId && elementIds.has(requestedElementId)
      ? requestedElementId
      : requestedElementIds.at(0) ?? null
  const selectedElementIds =
    selectedElementId && !requestedElementIds.includes(selectedElementId)
      ? [selectedElementId]
      : requestedElementIds

  return {
    collapsedSectionSlideIds: sanitizeCollapsedSectionSlideIds(
      input.deck.slides,
      uniqueValid(
        stringList(input.collapsedSectionSlideIds),
        slideIds,
      ),
    ),
    selectedElementId,
    selectedElementIds,
    selectedSlideId,
    selectedSlideIds: normalizedSlideIds,
  }
}

export function createPresentationPersistenceSnapshot(
  state: PresentationPersistenceState,
): PresentationPersistenceSnapshot {
  const deck = migrateDeckAssets(state.deck)
  const workspacePreferences = normalizeWorkspacePreferences({
    density: state.workspaceDensity,
    panels: state.workspacePanels,
  })
  const selection = normalizedSelection({
    deck,
    current: state,
    selectedElementId: state.selectedElementId,
    selectedElementIds: state.selectedElementIds,
    selectedSlideId: state.selectedSlideId,
    selectedSlideIds: state.selectedSlideIds,
    collapsedSectionSlideIds: state.collapsedSectionSlideIds,
  })

  return {
    deck,
    ...selection,
    objectAnimationPreviewElementId: null,
    objectAnimationPreviewKey: 0,
    zoom: clampZoom(state.zoom, 100),
    showGrid: booleanOr(state.showGrid, false),
    showRulers: booleanOr(state.showRulers, false),
    workspaceDensity: workspacePreferences.density,
    workspacePanelWidths: workspacePreferences.panelWidths,
    workspacePanels: workspacePreferences.panels,
    history: [],
    future: [],
  }
}

export function mergePresentationPersistedState<
  TState extends PresentationPersistenceState,
>(persisted: Partial<PresentationPersistenceState> | undefined, current: TState) {
  const deck = persisted?.deck ? migrateDeckAssets(persisted.deck) : current.deck
  const workspacePreferences = normalizeWorkspacePreferences(
    {
      density: persisted?.workspaceDensity,
      panelWidths: persisted?.workspacePanelWidths,
      panels: persisted?.workspacePanels,
    },
    {
      density: current.workspaceDensity ?? defaultWorkspacePreferences.density,
      panelWidths:
        current.workspacePanelWidths ??
        defaultWorkspacePreferences.panelWidths,
      panels: current.workspacePanels ?? defaultWorkspacePreferences.panels,
    },
  )
  const selection = normalizedSelection({
    deck,
    current,
    selectedElementId: persisted?.selectedElementId,
    selectedElementIds: persisted?.selectedElementIds,
    selectedSlideId: persisted?.selectedSlideId,
    selectedSlideIds: persisted?.selectedSlideIds,
    collapsedSectionSlideIds: persisted?.collapsedSectionSlideIds,
  })

  return {
    ...current,
    ...persisted,
    deck,
    ...selection,
    objectAnimationPreviewElementId: null,
    objectAnimationPreviewKey: 0,
    zoom: clampZoom(persisted?.zoom, current.zoom),
    showGrid: booleanOr(persisted?.showGrid, current.showGrid),
    showRulers: booleanOr(persisted?.showRulers, current.showRulers),
    workspaceDensity: workspacePreferences.density,
    workspacePanelWidths: workspacePreferences.panelWidths,
    workspacePanels: workspacePreferences.panels,
    history: [],
    future: [],
  } as TState
}
