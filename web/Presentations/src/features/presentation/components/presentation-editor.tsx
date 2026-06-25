"use client"

import {
  useCallback,
  useState,
  type PointerEvent,
} from "react"

import { EditorToolbar } from "./editor-toolbar"
import { PropertiesPanel } from "./properties-panel"
import { SlideCanvas } from "./slide-canvas"
import { SlideFilmstrip } from "./slide-filmstrip"
import { SpeakerNotes } from "./speaker-notes"
import { StatusBar } from "./status-bar"
import { WorkspacePanelRail } from "./workspace-panel-rail"
import { deckThemes } from "../themes"
import { usePresentationStore } from "../use-presentation-store"

type PresentationEditorProps = {
  embedded?: boolean
}

type ResizablePanelId = "filmstrip" | "properties"

type PanelResizeHandleProps = {
  active: boolean
  label: string
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void
  side: "left" | "right"
}

function PanelResizeHandle({
  active,
  label,
  onPointerDown,
  side,
}: PanelResizeHandleProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={[
        "group hidden w-2 shrink-0 cursor-col-resize items-center justify-center bg-background/80 transition hover:bg-primary/10 active:bg-primary/15",
        side === "left" ? "border-r md:flex" : "border-l lg:flex",
        active ? "bg-primary/10" : "",
      ].join(" ")}
      onPointerDown={onPointerDown}
    >
      <span className="h-10 w-px rounded-full bg-border transition group-hover:bg-primary/70" />
    </button>
  )
}

export function PresentationEditor({ embedded = false }: PresentationEditorProps) {
  const theme = usePresentationStore((state) => state.deck.theme)
  const workspacePanels = usePresentationStore((state) => state.workspacePanels)
  const workspacePanelWidths = usePresentationStore(
    (state) => state.workspacePanelWidths,
  )
  const setWorkspacePanelWidth = usePresentationStore(
    (state) => state.setWorkspacePanelWidth,
  )
  const setWorkspacePanelOpen = usePresentationStore(
    (state) => state.setWorkspacePanelOpen,
  )
  const [resizingPanelId, setResizingPanelId] =
    useState<ResizablePanelId | null>(null)

  const startPanelResize = useCallback(
    (
      event: PointerEvent<HTMLButtonElement>,
      panelId: ResizablePanelId,
    ) => {
      event.preventDefault()

      const startX = event.clientX
      const startWidth = workspacePanelWidths[panelId]
      const direction = panelId === "filmstrip" ? 1 : -1
      const previousCursor = document.body.style.cursor
      const previousUserSelect = document.body.style.userSelect

      setResizingPanelId(panelId)
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"

      function handlePointerMove(moveEvent: globalThis.PointerEvent) {
        setWorkspacePanelWidth(
          panelId,
          startWidth + (moveEvent.clientX - startX) * direction,
        )
      }

      function stopResize() {
        window.removeEventListener("pointermove", handlePointerMove)
        window.removeEventListener("pointerup", stopResize)
        window.removeEventListener("pointercancel", stopResize)
        document.body.style.cursor = previousCursor
        document.body.style.userSelect = previousUserSelect
        setResizingPanelId(null)
      }

      window.addEventListener("pointermove", handlePointerMove)
      window.addEventListener("pointerup", stopResize)
      window.addEventListener("pointercancel", stopResize)
    },
    [setWorkspacePanelWidth, workspacePanelWidths],
  )

  return (
    <div className={deckThemes[theme].app}>
      <div className="flex h-dvh min-h-[560px] flex-col overflow-hidden bg-background text-foreground">
        <EditorToolbar embedded={embedded} />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {workspacePanels.filmstripOpen ? (
            <>
              <SlideFilmstrip width={workspacePanelWidths.filmstrip} />
              <PanelResizeHandle
                active={resizingPanelId === "filmstrip"}
                label="Resize slide navigator"
                side="left"
                onPointerDown={(event) =>
                  startPanelResize(event, "filmstrip")
                }
              />
            </>
          ) : (
            <WorkspacePanelRail
              label="Show slide navigator"
              side="left"
              onOpen={() => setWorkspacePanelOpen("filmstrip", true)}
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <SlideCanvas />
            <SpeakerNotes />
          </div>
          {workspacePanels.propertiesOpen ? (
            <>
              <PanelResizeHandle
                active={resizingPanelId === "properties"}
                label="Resize format panel"
                side="right"
                onPointerDown={(event) =>
                  startPanelResize(event, "properties")
                }
              />
              <PropertiesPanel width={workspacePanelWidths.properties} />
            </>
          ) : (
            <WorkspacePanelRail
              label="Show format panel"
              side="right"
              onOpen={() => setWorkspacePanelOpen("properties", true)}
            />
          )}
        </div>
        <StatusBar />
      </div>
    </div>
  )
}
