"use client"

import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Rows3,
  ScanLine,
  StretchHorizontal,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { presentationSmokeTestIds } from "../presentation-smoke-test-ids"
import {
  workspaceDensityOptions,
  type WorkspaceDensity,
} from "../workspace-ergonomics"
import { usePresentationStore } from "../use-presentation-store"

function densityIcon(density: WorkspaceDensity) {
  return density === "comfortable"
    ? StretchHorizontal
    : density === "compact"
      ? Rows3
      : ScanLine
}

export function WorkspaceControls() {
  const workspaceDensity = usePresentationStore(
    (state) => state.workspaceDensity,
  )
  const workspacePanels = usePresentationStore((state) => state.workspacePanels)
  const setWorkspaceDensity = usePresentationStore(
    (state) => state.setWorkspaceDensity,
  )
  const toggleWorkspacePanel = usePresentationStore(
    (state) => state.toggleWorkspacePanel,
  )
  const filmstripLabel = workspacePanels.filmstripOpen
    ? "Hide slide navigator"
    : "Show slide navigator"
  const propertiesLabel = workspacePanels.propertiesOpen
    ? "Hide format panel"
    : "Show format panel"
  const FilmstripIcon = workspacePanels.filmstripOpen
    ? PanelLeftClose
    : PanelLeftOpen
  const PropertiesIcon = workspacePanels.propertiesOpen
    ? PanelRightClose
    : PanelRightOpen

  return (
    <div className="flex items-center gap-1" aria-label="Workspace controls">
      <Button
        type="button"
        variant={workspacePanels.filmstripOpen ? "secondary" : "ghost"}
        size="icon-sm"
        aria-pressed={workspacePanels.filmstripOpen}
        aria-label={filmstripLabel}
        title={filmstripLabel}
        data-testid={presentationSmokeTestIds.workspaceFilmstripToggle}
        onClick={() => toggleWorkspacePanel("filmstrip")}
      >
        <FilmstripIcon className="size-4" />
      </Button>
      <Button
        type="button"
        variant={workspacePanels.propertiesOpen ? "secondary" : "ghost"}
        size="icon-sm"
        aria-pressed={workspacePanels.propertiesOpen}
        aria-label={propertiesLabel}
        title={propertiesLabel}
        data-testid={presentationSmokeTestIds.workspacePropertiesToggle}
        onClick={() => toggleWorkspacePanel("properties")}
      >
        <PropertiesIcon className="size-4" />
      </Button>
      <div
        role="radiogroup"
        aria-label="Workspace density"
        className="flex items-center rounded-md border bg-muted/40 p-0.5"
        data-testid={presentationSmokeTestIds.workspaceDensityControls}
      >
        {workspaceDensityOptions.map((option) => {
          const Icon = densityIcon(option.id)
          const active = workspaceDensity === option.id

          return (
            <Button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              variant={active ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-7 gap-1 rounded px-2 text-[11px]",
                !active && "text-muted-foreground",
              )}
              title={option.description}
              onClick={() => setWorkspaceDensity(option.id)}
            >
              <Icon className="size-3.5" />
              <span className="hidden 2xl:inline">{option.shortLabel}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
