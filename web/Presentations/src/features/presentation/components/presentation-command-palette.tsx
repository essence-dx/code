"use client"

import { useEffect, useMemo, useState } from "react"
import { Command, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

import {
  filterPresentationCommandPaletteActions,
  presentationCommandPaletteActions,
  type PresentationCommandPaletteAction,
} from "../app-shell-command-palette"
import { isElementEditable, isElementLocked } from "../element-visibility"
import { presentationSmokeTestIds } from "../presentation-smoke-test-ids"
import { usePresentationStore } from "../use-presentation-store"

const visibleResultLimit = 28

function groupLabel(group: PresentationCommandPaletteAction["group"]) {
  return group[0].toUpperCase() + group.slice(1)
}

function commandShortcutLabel() {
  if (typeof navigator === "undefined") return "Ctrl K"

  return navigator.platform.toLowerCase().includes("mac") ? "Cmd K" : "Ctrl K"
}

function ResultRow({
  action,
  onRun,
}: {
  action: PresentationCommandPaletteAction
  onRun: (action: PresentationCommandPaletteAction) => void
}) {
  return (
    <button
      type="button"
      className="grid w-full gap-1 rounded-md px-3 py-2 text-left outline-none hover:bg-muted focus-visible:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      disabled={action.disabled}
      data-testid={presentationSmokeTestIds.commandPaletteResult}
      onClick={() => onRun(action)}
    >
      <span className="flex min-w-0 items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{action.label}</span>
        <span className="flex shrink-0 items-center gap-1">
          {action.shortcut ? (
            <Badge variant="outline" className="text-[10px]">
              {action.shortcut}
            </Badge>
          ) : null}
          <Badge variant="secondary" className="text-[10px]">
            {groupLabel(action.group)}
          </Badge>
        </span>
      </span>
      <span className="truncate text-xs text-muted-foreground">
        {action.disabled ? action.disabledReason : action.detail}
      </span>
    </button>
  )
}

export function PresentationCommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const deck = usePresentationStore((state) => state.deck)
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const selectedSlideIds = usePresentationStore((state) => state.selectedSlideIds)
  const selectedElementId = usePresentationStore(
    (state) => state.selectedElementId,
  )
  const selectedElementIds = usePresentationStore(
    (state) => state.selectedElementIds,
  )
  const copiedElements = usePresentationStore((state) => state.copiedElements)
  const copiedSlides = usePresentationStore((state) => state.copiedSlides)
  const history = usePresentationStore((state) => state.history)
  const future = usePresentationStore((state) => state.future)
  const zoom = usePresentationStore((state) => state.zoom)
  const showGrid = usePresentationStore((state) => state.showGrid)
  const showRulers = usePresentationStore((state) => state.showRulers)
  const workspaceDensity = usePresentationStore(
    (state) => state.workspaceDensity,
  )
  const workspacePanels = usePresentationStore((state) => state.workspacePanels)
  const addElement = usePresentationStore((state) => state.addElement)
  const addSlide = usePresentationStore((state) => state.addSlide)
  const alignSelectedElements = usePresentationStore(
    (state) => state.alignSelectedElements,
  )
  const collapseAllSlideSections = usePresentationStore(
    (state) => state.collapseAllSlideSections,
  )
  const copySelectedElements = usePresentationStore(
    (state) => state.copySelectedElements,
  )
  const deleteElement = usePresentationStore((state) => state.deleteElement)
  const deleteSlide = usePresentationStore((state) => state.deleteSlide)
  const duplicateSelectedElements = usePresentationStore(
    (state) => state.duplicateSelectedElements,
  )
  const duplicateSlide = usePresentationStore((state) => state.duplicateSlide)
  const expandAllSlideSections = usePresentationStore(
    (state) => state.expandAllSlideSections,
  )
  const groupSelectedElements = usePresentationStore(
    (state) => state.groupSelectedElements,
  )
  const pasteCopiedElements = usePresentationStore(
    (state) => state.pasteCopiedElements,
  )
  const pasteCopiedSlides = usePresentationStore(
    (state) => state.pasteCopiedSlides,
  )
  const redo = usePresentationStore((state) => state.redo)
  const selectSlide = usePresentationStore((state) => state.selectSlide)
  const selectSlideSection = usePresentationStore(
    (state) => state.selectSlideSection,
  )
  const setZoom = usePresentationStore((state) => state.setZoom)
  const setWorkspaceDensity = usePresentationStore(
    (state) => state.setWorkspaceDensity,
  )
  const toggleGrid = usePresentationStore((state) => state.toggleGrid)
  const toggleRulers = usePresentationStore((state) => state.toggleRulers)
  const toggleWorkspacePanel = usePresentationStore(
    (state) => state.toggleWorkspacePanel,
  )
  const undo = usePresentationStore((state) => state.undo)
  const ungroupSelectedElements = usePresentationStore(
    (state) => state.ungroupSelectedElements,
  )
  const selectedSlide = deck.slides.find((slide) => slide.id === selectedSlideId)
  const selectedElements =
    selectedSlide?.elements.filter((element) =>
      selectedElementIds.includes(element.id),
    ) ?? []
  const selectedEditableElementCount =
    selectedElements.filter(isElementEditable).length
  const selectedUnlockedElementCount = selectedElements.filter(
    (element) => !isElementLocked(element),
  ).length
  const canGroupSelected = selectedEditableElementCount >= 2
  const canUngroupSelected = selectedElements.some((element) => element.groupId)
  const selectedSlideIndex = deck.slides.findIndex(
    (slide) => slide.id === selectedSlideId,
  )
  const shortcutLabel = commandShortcutLabel()
  const actions = useMemo(
    () =>
      presentationCommandPaletteActions({
        canGroupSelected,
        canUngroupSelected,
        copiedElementsCount: copiedElements.length,
        copiedSlidesCount: copiedSlides.length,
        futureCount: future.length,
        historyCount: history.length,
        selectedEditableElementCount,
        selectedElementCount: selectedUnlockedElementCount,
        selectedSlideId,
        selectedSlideIds,
        showGrid,
        showRulers,
        slideCount: deck.slides.length,
        slides: deck.slides.map((slide) => ({
          id: slide.id,
          title: slide.title,
        })),
        workspaceDensity,
        workspacePanels,
        zoom,
      }),
    [
      canGroupSelected,
      canUngroupSelected,
      copiedElements.length,
      copiedSlides.length,
      deck.slides,
      future.length,
      history.length,
      selectedEditableElementCount,
      selectedSlideId,
      selectedSlideIds,
      selectedUnlockedElementCount,
      showGrid,
      showRulers,
      workspaceDensity,
      workspacePanels,
      zoom,
    ],
  )
  const visibleActions = useMemo(
    () =>
      filterPresentationCommandPaletteActions(actions, query).slice(
        0,
        visibleResultLimit,
      ),
    [actions, query],
  )

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  function closePalette() {
    setOpen(false)
    setQuery("")
  }

  function runAction(action: PresentationCommandPaletteAction) {
    if (action.disabled) return

    if (action.id.startsWith("slide.select:")) {
      selectSlide(action.id.replace("slide.select:", ""))
      closePalette()
      return
    }

    if (action.id.startsWith("object.align.")) {
      const alignment = action.id.replace("object.align.", "")

      if (
        alignment === "left" ||
        alignment === "center" ||
        alignment === "right" ||
        alignment === "top" ||
        alignment === "middle" ||
        alignment === "bottom"
      ) {
        alignSelectedElements(alignment)
      }
      closePalette()
      return
    }

    const handlers: Record<string, () => void> = {
      "edit.paste-slides": pasteCopiedSlides,
      "edit.redo": redo,
      "edit.undo": undo,
      "insert.chart": () => addElement("chart"),
      "insert.table": () => addElement("table"),
      "insert.text": () => addElement("text"),
      "insert.title": () => addElement("title"),
      "object.copy": copySelectedElements,
      "object.delete": deleteElement,
      "object.duplicate": duplicateSelectedElements,
      "object.group": groupSelectedElements,
      "object.paste": pasteCopiedElements,
      "object.ungroup": ungroupSelectedElements,
      "section.collapse-all": collapseAllSlideSections,
      "section.expand-all": expandAllSlideSections,
      "section.select-current": () => selectSlideSection(),
      "slide.add": addSlide,
      "slide.delete": deleteSlide,
      "slide.duplicate": duplicateSlide,
      "slide.next": () => {
        const nextSlide = deck.slides[selectedSlideIndex + 1]
        if (nextSlide) selectSlide(nextSlide.id)
      },
      "slide.previous": () => {
        const previousSlide = deck.slides[selectedSlideIndex - 1]
        if (previousSlide) selectSlide(previousSlide.id)
      },
      "view.toggle-grid": toggleGrid,
      "view.toggle-filmstrip": () => toggleWorkspacePanel("filmstrip"),
      "view.toggle-properties": () => toggleWorkspacePanel("properties"),
      "view.toggle-rulers": toggleRulers,
      "view.density.comfortable": () => setWorkspaceDensity("comfortable"),
      "view.density.compact": () => setWorkspaceDensity("compact"),
      "view.density.focus": () => setWorkspaceDensity("focus"),
      "view.zoom-in": () => setZoom(zoom + 5),
      "view.zoom-out": () => setZoom(zoom - 5),
      "view.zoom-reset": () => setZoom(88),
    }

    handlers[action.id]?.()
    closePalette()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setQuery("")
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid={presentationSmokeTestIds.commandPaletteTrigger}
          />
        }
      >
        <Command className="size-4" />
        <span className="hidden xl:inline">Commands</span>
        <Badge variant="outline" className="hidden text-[10px] lg:inline-flex">
          {shortcutLabel}
        </Badge>
      </DialogTrigger>
      <DialogContent
        className="gap-3 p-0 sm:max-w-2xl"
        data-testid={presentationSmokeTestIds.commandPaletteDialog}
      >
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Command palette</DialogTitle>
        </DialogHeader>
        <div className="border-y px-4 py-3">
          <div className="flex items-center gap-2 rounded-md border bg-background px-2">
            <Search className="size-4 text-muted-foreground" />
            <Input
              autoFocus
              aria-label="Search presentation commands"
              className="h-9 border-0 px-0 shadow-none focus-visible:ring-0"
              data-testid={presentationSmokeTestIds.commandPaletteSearch}
              placeholder="Search commands or slide titles"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </div>
        </div>
        <ScrollArea className="h-[26rem] px-2 pb-2">
          {visibleActions.length ? (
            <div className="grid gap-1">
              {visibleActions.map((action) => (
                <ResultRow
                  key={action.id}
                  action={action}
                  onRun={runAction}
                />
              ))}
            </div>
          ) : (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No matching commands.
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
