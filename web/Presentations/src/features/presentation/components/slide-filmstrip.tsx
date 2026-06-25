"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
} from "react"
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { IconButton } from "./icon-button"
import { ShapePreview } from "./shape-preview"
import { visibleElements } from "../element-visibility"
import {
  largeDeckWindowLimits,
  virtualFilmstripWindow,
} from "../large-deck-windowing"
import { presentationSmokeTestIds } from "../presentation-smoke-test-ids"
import {
  canMoveSlideSection,
  sectionRangeForSlide,
} from "../slide-sections"
import type { PresentationElement, Slide } from "../types"
import { usePresentationStore } from "../use-presentation-store"
import { workspaceDensityConfig } from "../workspace-ergonomics"

const FILMSTRIP_ROW_HEIGHT = largeDeckWindowLimits.filmstripRowHeight
const FILMSTRIP_ITEM_HEIGHT = 80
const FILMSTRIP_PADDING = 12
const FILMSTRIP_OVERSCAN = largeDeckWindowLimits.filmstripOverscanRows
const FILMSTRIP_FALLBACK_HEIGHT =
  largeDeckWindowLimits.filmstripFallbackViewportHeight
const FILMSTRIP_SHORTCUT_HELP_ID = "presentation-filmstrip-shortcut-help"

type SlideFilmstripProps = {
  width?: number
}

type FilmstripRow = {
  slide: Slide
  index: number
  startsSection: boolean
  collapsed: boolean
}

function elementPreviewFill(element: PresentationElement) {
  if (element.type === "video") return "#020617"
  if (element.type === "audio") return "#0f172a"

  return "transparent"
}

function FilmstripElementPreview({ element }: { element: PresentationElement }) {
  const isShape = element.type === "shape"

  return (
    <span
      className={cn(
        "absolute block overflow-hidden rounded-[2px]",
        !isShape && "border border-slate-400/45",
      )}
      style={{
        left: `${element.x}%`,
        top: `${element.y}%`,
        width: `${element.width}%`,
        height: `${element.height}%`,
        background: elementPreviewFill(element),
      }}
    >
      {isShape ? <ShapePreview element={element} /> : null}
    </span>
  )
}

function visibleFilmstripRows(
  slides: Slide[],
  collapsedSectionSlideIds: string[],
): FilmstripRow[] {
  const collapsedSections = new Set(collapsedSectionSlideIds)
  const rows: FilmstripRow[] = []
  let hideUntilNextSection = false

  slides.forEach((slide, index) => {
    const startsSection = Boolean(slide.sectionTitle)

    if (startsSection) {
      const collapsed = collapsedSections.has(slide.id)
      rows.push({ slide, index, startsSection, collapsed })
      hideUntilNextSection = collapsed
      return
    }

    if (!hideUntilNextSection) {
      rows.push({ slide, index, startsSection, collapsed: false })
    }
  })

  return rows
}

function sectionSlideIds(slides: Slide[], sectionStartIndex: number) {
  const ids: string[] = []

  for (let index = sectionStartIndex; index < slides.length; index += 1) {
    const slide = slides[index]
    if (!slide) break
    if (index > sectionStartIndex && slide.sectionTitle) break
    ids.push(slide.id)
  }

  return ids
}

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement
    ? Boolean(target.closest("input, textarea, [contenteditable='true']"))
    : false
}

export function SlideFilmstrip({ width }: SlideFilmstripProps) {
  const deck = usePresentationStore((state) => state.deck)
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const selectedSlideIds = usePresentationStore((state) => state.selectedSlideIds)
  const copiedSlides = usePresentationStore((state) => state.copiedSlides)
  const collapsedSectionSlideIds = usePresentationStore(
    (state) => state.collapsedSectionSlideIds,
  )
  const workspaceDensity = usePresentationStore(
    (state) => state.workspaceDensity,
  )
  const selectSlide = usePresentationStore((state) => state.selectSlide)
  const selectSlides = usePresentationStore((state) => state.selectSlides)
  const selectSlideSection = usePresentationStore(
    (state) => state.selectSlideSection,
  )
  const renameSlideSection = usePresentationStore(
    (state) => state.renameSlideSection,
  )
  const moveSlideSection = usePresentationStore(
    (state) => state.moveSlideSection,
  )
  const copySelectedSlide = usePresentationStore(
    (state) => state.copySelectedSlide,
  )
  const cutSelectedSlide = usePresentationStore(
    (state) => state.cutSelectedSlide,
  )
  const pasteCopiedSlides = usePresentationStore(
    (state) => state.pasteCopiedSlides,
  )
  const duplicateSlide = usePresentationStore((state) => state.duplicateSlide)
  const deleteSlide = usePresentationStore((state) => state.deleteSlide)
  const moveSlide = usePresentationStore((state) => state.moveSlide)
  const moveSlideToIndex = usePresentationStore(
    (state) => state.moveSlideToIndex,
  )
  const toggleSlideSection = usePresentationStore(
    (state) => state.toggleSlideSection,
  )
  const expandAllSlideSections = usePresentationStore(
    (state) => state.expandAllSlideSections,
  )
  const collapseAllSlideSections = usePresentationStore(
    (state) => state.collapseAllSlideSections,
  )
  const startSectionAtSelectedSlide = usePresentationStore(
    (state) => state.startSectionAtSelectedSlide,
  )
  const clearSelectedSectionBreaks = usePresentationStore(
    (state) => state.clearSelectedSectionBreaks,
  )
  const viewportRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState<number>(
    FILMSTRIP_FALLBACK_HEIGHT,
  )
  const [draggedSlideId, setDraggedSlideId] = useState<string | null>(null)
  const [sectionRenameValue, setSectionRenameValue] = useState("")
  const visibleRows = useMemo(
    () => visibleFilmstripRows(deck.slides, collapsedSectionSlideIds),
    [collapsedSectionSlideIds, deck.slides],
  )
  const activeSection = useMemo(
    () => sectionRangeForSlide(deck.slides, selectedSlideId),
    [deck.slides, selectedSlideId],
  )
  const activeExplicitSection = activeSection?.isExplicitSection
    ? activeSection
    : null
  const canMoveActiveSectionUp = activeExplicitSection
    ? canMoveSlideSection(deck.slides, activeExplicitSection.startSlideId, -1)
    : false
  const canMoveActiveSectionDown = activeExplicitSection
    ? canMoveSlideSection(deck.slides, activeExplicitSection.startSlideId, 1)
    : false
  const pendingSectionTitle = sectionRenameValue.trim()
  const canRenameActiveSection = Boolean(
    activeExplicitSection &&
      pendingSectionTitle &&
      pendingSectionTitle !== activeExplicitSection.title,
  )
  const selectedRowIndex = visibleRows.findIndex(
    (row) => row.slide.id === selectedSlideId,
  )
  const hasSelectedSectionBreak = deck.slides.some(
    (slide) => selectedSlideIds.includes(slide.id) && slide.sectionTitle,
  )
  const sectionBreakIds = deck.slides
    .filter((slide) => slide.sectionTitle)
    .map((slide) => slide.id)
  const densityConfig = workspaceDensityConfig(workspaceDensity)
  const allSectionsCollapsed =
    sectionBreakIds.length > 0 &&
    sectionBreakIds.every((slideId) => collapsedSectionSlideIds.includes(slideId))
  const windowedSlides = useMemo(() => {
    const window = virtualFilmstripWindow({
      overscan: FILMSTRIP_OVERSCAN,
      rowCount: visibleRows.length,
      rowHeight: FILMSTRIP_ROW_HEIGHT,
      scrollTop,
      viewportHeight,
    })

    return visibleRows
      .slice(window.startIndex, window.endIndexExclusive)
      .map((row, visibleIndex) => ({
        ...row,
        visibleIndex: window.startIndex + visibleIndex,
      }))
  }, [scrollTop, viewportHeight, visibleRows])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const measure = () => {
      setViewportHeight(viewport.clientHeight || FILMSTRIP_FALLBACK_HEIGHT)
    }
    const observer = new ResizeObserver(measure)

    measure()
    observer.observe(viewport)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setSectionRenameValue(activeExplicitSection?.title ?? "")
  }, [activeExplicitSection?.startSlideId, activeExplicitSection?.title])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || selectedRowIndex < 0) return

    const itemTop = selectedRowIndex * FILMSTRIP_ROW_HEIGHT
    const itemBottom = itemTop + FILMSTRIP_ROW_HEIGHT
    const viewportBottom = viewport.scrollTop + viewport.clientHeight

    if (itemTop < viewport.scrollTop) {
      viewport.scrollTo({ top: itemTop })
    } else if (itemBottom > viewportBottom) {
      viewport.scrollTo({ top: itemBottom - viewport.clientHeight })
    }
  }, [selectedRowIndex])

  useEffect(() => {
    if (selectedRowIndex >= 0 || !selectedSlideId) return

    const selectedIndex = deck.slides.findIndex(
      (slide) => slide.id === selectedSlideId,
    )
    if (selectedIndex < 0) return

    for (let index = selectedIndex; index >= 0; index -= 1) {
      const slide = deck.slides[index]
      if (slide?.sectionTitle) {
        selectSlide(slide.id)
        return
      }
    }
  }, [deck.slides, selectSlide, selectedRowIndex, selectedSlideId])

  function toggleSection(row: FilmstripRow) {
    if (!row.startsSection) return

    if (!row.collapsed) {
      const idsInSection = sectionSlideIds(deck.slides, row.index)
      if (
        idsInSection.includes(selectedSlideId) &&
        selectedSlideId !== row.slide.id
      ) {
        selectSlide(row.slide.id)
      }
    }

    toggleSlideSection(row.slide.id)
  }

  function commitSectionRename() {
    if (!activeExplicitSection) return

    const nextTitle = sectionRenameValue.trim()
    if (!nextTitle) {
      setSectionRenameValue(activeExplicitSection.title)
      return
    }

    if (nextTitle !== activeExplicitSection.title) {
      renameSlideSection(activeExplicitSection.startSlideId, nextTitle)
    }
  }

  function startSlideDrag(event: DragEvent<HTMLButtonElement>, slideId: string) {
    setDraggedSlideId(slideId)
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", slideId)
  }

  function dropSlide(event: DragEvent<HTMLButtonElement>, targetIndex: number) {
    event.preventDefault()
    const slideId = draggedSlideId || event.dataTransfer.getData("text/plain")
    if (!slideId) return

    const rect = event.currentTarget.getBoundingClientRect()
    const insertAfter = event.clientY > rect.top + rect.height / 2
    moveSlideToIndex(slideId, targetIndex + (insertAfter ? 1 : 0))
    setDraggedSlideId(null)
  }

  function handleFilmstripKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (isEditableTarget(event.target)) return

    const commandKey = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()

    if (!commandKey && !event.altKey && event.key === "ArrowUp") {
      event.preventDefault()
      const row = visibleRows[Math.max(0, selectedRowIndex - 1)]
      if (row) {
        selectSlide(row.slide.id, { range: event.shiftKey })
      }
      return
    }

    if (!commandKey && !event.altKey && event.key === "ArrowDown") {
      event.preventDefault()
      const row = visibleRows[Math.min(visibleRows.length - 1, selectedRowIndex + 1)]
      if (row) {
        selectSlide(row.slide.id, { range: event.shiftKey })
      }
      return
    }

    if (!commandKey && !event.altKey && event.key === "Home") {
      event.preventDefault()
      const row = visibleRows[0]
      if (row) {
        selectSlide(row.slide.id, { range: event.shiftKey })
      }
      return
    }

    if (!commandKey && !event.altKey && event.key === "End") {
      event.preventDefault()
      const row = visibleRows.at(-1)
      if (row) {
        selectSlide(row.slide.id, { range: event.shiftKey })
      }
      return
    }

    if (commandKey && key === "a") {
      event.preventDefault()
      selectSlides(deck.slides.map((slide) => slide.id))
      return
    }

    if (commandKey && key === "c") {
      event.preventDefault()
      copySelectedSlide()
      return
    }

    if (commandKey && key === "x") {
      event.preventDefault()
      cutSelectedSlide()
      return
    }

    if (commandKey && key === "v") {
      event.preventDefault()
      pasteCopiedSlides()
      return
    }

    if (commandKey && key === "d") {
      event.preventDefault()
      duplicateSlide()
      return
    }

    if (event.altKey && event.key === "ArrowUp") {
      event.preventDefault()
      moveSlide(-1)
      return
    }

    if (event.altKey && event.key === "ArrowDown") {
      event.preventDefault()
      moveSlide(1)
      return
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault()
      deleteSlide()
    }
  }

  return (
    <aside
      role="navigation"
      aria-label="Slide navigator"
      aria-describedby={FILMSTRIP_SHORTCUT_HELP_ID}
      className={cn(
        "hidden min-h-0 shrink-0 flex-col border-r bg-muted/30 md:flex",
        width ? "" : densityConfig.filmstripClassName,
      )}
      style={width ? ({ width } as CSSProperties) : undefined}
      data-testid={presentationSmokeTestIds.workspaceFilmstripPanel}
      onKeyDown={handleFilmstripKeyDown}
    >
      <span id={FILMSTRIP_SHORTCUT_HELP_ID} className="sr-only">
        Use arrow keys to move through slides, Shift with arrow keys to extend
        selection, Alt with arrow keys to reorder, and Delete to remove selected
        slides.
      </span>
      <div
        className={cn(
          "flex items-center justify-between border-b",
          densityConfig.panelHeaderClassName,
        )}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Slides
        </span>
        <div className="flex items-center gap-1">
          <IconButton
            label="Expand all slide sections"
            icon={ChevronDown}
            disabled={!collapsedSectionSlideIds.length}
            onClick={expandAllSlideSections}
          />
          <IconButton
            label="Collapse all slide sections"
            icon={ChevronRight}
            disabled={!sectionBreakIds.length || allSectionsCollapsed}
            onClick={collapseAllSlideSections}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Slide actions"
              title="Slide actions"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                "shrink-0",
              )}
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => selectSlideSection()}>
                Select current section
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canMoveActiveSectionUp}
                onClick={() => {
                  if (activeExplicitSection) {
                    moveSlideSection(activeExplicitSection.startSlideId, -1)
                  }
                }}
              >
                Move section up
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canMoveActiveSectionDown}
                onClick={() => {
                  if (activeExplicitSection) {
                    moveSlideSection(activeExplicitSection.startSlideId, 1)
                  }
                }}
              >
                Move section down
              </DropdownMenuItem>
              <DropdownMenuItem onClick={startSectionAtSelectedSlide}>
                Start section here
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!hasSelectedSectionBreak}
                onClick={clearSelectedSectionBreaks}
              >
                Clear selected section breaks
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={copySelectedSlide}>
                Copy selected slides
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={deck.slides.length <= selectedSlideIds.length}
                onClick={cutSelectedSlide}
              >
                Cut selected slides
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!copiedSlides.length}
                onClick={pasteCopiedSlides}
              >
                Paste copied slides
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={duplicateSlide}>
                Duplicate selected slides
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={deck.slides.length <= selectedSlideIds.length}
                variant="destructive"
                onClick={deleteSlide}
              >
                Delete selected slides
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <IconButton
            label="Move selected slide up"
            icon={ArrowUp}
            onClick={() => moveSlide(-1)}
          />
          <IconButton
            label="Move selected slide down"
            icon={ArrowDown}
            onClick={() => moveSlide(1)}
          />
        </div>
      </div>
      {activeExplicitSection ? (
        <form
          className="border-b bg-background/70 px-3 py-2"
          onSubmit={(event) => {
            event.preventDefault()
            commitSectionRename()
          }}
        >
          <label
            htmlFor="filmstrip-section-title"
            className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Current section
          </label>
          <div className="mt-1 flex items-center gap-1">
            <Input
              id="filmstrip-section-title"
              value={sectionRenameValue}
              className="h-7 rounded-md text-xs"
              aria-label="Rename current section"
              onBlur={commitSectionRename}
              onChange={(event) => setSectionRenameValue(event.target.value)}
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              className="h-7 rounded-md px-2 text-xs"
              disabled={!canRenameActiveSection}
            >
              Rename
            </Button>
          </div>
        </form>
      ) : null}
      <div
        ref={viewportRef}
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <div
          className="relative"
          style={{
            height:
              visibleRows.length * FILMSTRIP_ROW_HEIGHT +
              FILMSTRIP_PADDING * 2,
          }}
        >
          {windowedSlides.map(
            ({ slide, index, visibleIndex, startsSection, collapsed }) => (
              <div
                key={slide.id}
                className="absolute"
                style={{
                  top: FILMSTRIP_PADDING + visibleIndex * FILMSTRIP_ROW_HEIGHT,
                  left: FILMSTRIP_PADDING,
                  right: FILMSTRIP_PADDING,
                  height: FILMSTRIP_ITEM_HEIGHT,
                }}
              >
                {startsSection ? (
                  <button
                    type="button"
                    aria-label={`${collapsed ? "Expand" : "Collapse"} section ${
                      slide.sectionTitle
                    }`}
                    aria-expanded={!collapsed}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon-xs" }),
                      "absolute left-1 top-2 z-10",
                    )}
                    onClick={() =>
                      toggleSection({ slide, index, startsSection, collapsed })
                    }
                  >
                    {collapsed ? (
                      <ChevronRight className="size-3" />
                    ) : (
                      <ChevronDown className="size-3" />
                    )}
                  </button>
                ) : null}
                <button
                  type="button"
                  draggable
                  onClick={(event) =>
                    selectSlide(slide.id, {
                      additive:
                        !event.shiftKey && (event.ctrlKey || event.metaKey),
                      range: event.shiftKey,
                    })
                  }
                  onDragStart={(event) => startSlideDrag(event, slide.id)}
                  onDragEnd={() => setDraggedSlideId(null)}
                  onDragOver={(event) => {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = "move"
                  }}
                  onDrop={(event) => dropSlide(event, index)}
                  aria-current={
                    selectedSlideId === slide.id ? "true" : undefined
                  }
                  aria-label={`Select slide ${index + 1}: ${slide.title}`}
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-full w-full justify-start rounded-md border bg-background p-2 text-left shadow-sm",
                    startsSection && "pl-8",
                    selectedSlideIds.includes(slide.id) && "bg-primary/5",
                    selectedSlideId === slide.id &&
                      "border-primary ring-2 ring-primary/20",
                    draggedSlideId === slide.id && "opacity-50",
                  )}
                >
                  <span className="mr-2 w-5 shrink-0 text-xs text-muted-foreground">
                    {index + 1}
                  </span>
                  <span
                    className="relative block aspect-video w-28 shrink-0 overflow-hidden rounded border"
                    style={{ background: slide.background }}
                  >
                    {visibleElements(slide).slice(0, 4).map((element) => (
                      <FilmstripElementPreview key={element.id} element={element} />
                    ))}
                  </span>
                  <span className="ml-2 flex min-w-0 flex-1 flex-col gap-1">
                    {slide.sectionTitle ? (
                      <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {slide.sectionTitle}
                      </span>
                    ) : null}
                    <span className="truncate text-xs font-medium">
                      {slide.title}
                    </span>
                  </span>
                </button>
              </div>
            ),
          )}
        </div>
      </div>
    </aside>
  )
}
