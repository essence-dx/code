export type WorkspaceDensity = "comfortable" | "compact" | "focus"

export type WorkspacePanelId = "filmstrip" | "properties"

export type WorkspacePanelState = {
  filmstripOpen: boolean
  propertiesOpen: boolean
}

export type WorkspacePanelWidths = {
  filmstrip: number
  properties: number
}

export type WorkspacePreferences = {
  density: WorkspaceDensity
  panels: WorkspacePanelState
  panelWidths: WorkspacePanelWidths
}

export type WorkspaceDensityConfig = {
  description: string
  filmstripClassName: string
  id: WorkspaceDensity
  label: string
  panelHeaderClassName: string
  propertiesClassName: string
  shortLabel: string
  titleInputClassName: string
  toolbarClassName: string
}

export type WorkspaceErgonomicsReport = {
  density: WorkspaceDensity
  openPanelCount: number
  panelRestoreReady: boolean
  panels: WorkspacePanelState
  responsiveControlsReady: boolean
  status: "attention" | "ready"
  summary: string
}

export const workspaceDensityOptions = [
  {
    description: "Full controls and wider side panels for review-heavy editing.",
    filmstripClassName: "w-56",
    id: "comfortable",
    label: "Comfortable",
    panelHeaderClassName: "h-10 px-3",
    propertiesClassName: "w-80",
    shortLabel: "Comfort",
    titleInputClassName: "w-56",
    toolbarClassName: "gap-2 px-3",
  },
  {
    description: "Tighter ribbon spacing and narrower side panels for dense decks.",
    filmstripClassName: "w-48",
    id: "compact",
    label: "Compact",
    panelHeaderClassName: "h-9 px-2",
    propertiesClassName: "w-72",
    shortLabel: "Compact",
    titleInputClassName: "w-44",
    toolbarClassName: "gap-1 px-2",
  },
  {
    description: "Maximum canvas room with the most compact persistent chrome.",
    filmstripClassName: "w-44",
    id: "focus",
    label: "Focus",
    panelHeaderClassName: "h-9 px-2",
    propertiesClassName: "w-64",
    shortLabel: "Focus",
    titleInputClassName: "w-40",
    toolbarClassName: "gap-1 px-2",
  },
] as const satisfies WorkspaceDensityConfig[]

export const defaultWorkspacePreferences = {
  density: "comfortable",
  panelWidths: {
    filmstrip: 224,
    properties: 320,
  },
  panels: {
    filmstripOpen: true,
    propertiesOpen: true,
  },
} as const satisfies WorkspacePreferences

export const workspacePanelWidthLimits = {
  filmstrip: {
    max: 360,
    min: 176,
  },
  properties: {
    max: 520,
    min: 272,
  },
} as const satisfies Record<keyof WorkspacePanelWidths, { max: number; min: number }>

const densityIds = new Set<WorkspaceDensity>(
  workspaceDensityOptions.map((option) => option.id),
)

function booleanOr(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback
}

function numberOrClamped(value: unknown, fallback: number, min: number, max: number) {
  const nextValue =
    typeof value === "number" && Number.isFinite(value) ? value : fallback

  return Math.round(Math.max(min, Math.min(max, nextValue)))
}

export function clampWorkspacePanelWidth(
  panelId: keyof WorkspacePanelWidths,
  width: number,
) {
  const limits = workspacePanelWidthLimits[panelId]

  return numberOrClamped(width, defaultWorkspacePreferences.panelWidths[panelId], limits.min, limits.max)
}

export function workspaceDensityConfig(
  density: WorkspaceDensity,
): WorkspaceDensityConfig {
  return (
    workspaceDensityOptions.find((option) => option.id === density) ??
    workspaceDensityOptions[0]
  )
}

export function normalizeWorkspaceDensity(
  value: unknown,
  fallback: WorkspaceDensity = defaultWorkspacePreferences.density,
): WorkspaceDensity {
  return typeof value === "string" && densityIds.has(value as WorkspaceDensity)
    ? (value as WorkspaceDensity)
    : fallback
}

export function normalizeWorkspacePanelWidths(
  value: unknown,
  fallback: WorkspacePanelWidths = defaultWorkspacePreferences.panelWidths,
): WorkspacePanelWidths {
  const candidate = value as Partial<WorkspacePanelWidths> | undefined

  return {
    filmstrip: numberOrClamped(
      candidate?.filmstrip,
      fallback.filmstrip,
      workspacePanelWidthLimits.filmstrip.min,
      workspacePanelWidthLimits.filmstrip.max,
    ),
    properties: numberOrClamped(
      candidate?.properties,
      fallback.properties,
      workspacePanelWidthLimits.properties.min,
      workspacePanelWidthLimits.properties.max,
    ),
  }
}

export function normalizeWorkspacePanels(
  value: unknown,
  fallback: WorkspacePanelState = defaultWorkspacePreferences.panels,
): WorkspacePanelState {
  const candidate = value as Partial<WorkspacePanelState> | undefined

  return {
    filmstripOpen: booleanOr(candidate?.filmstripOpen, fallback.filmstripOpen),
    propertiesOpen: booleanOr(
      candidate?.propertiesOpen,
      fallback.propertiesOpen,
    ),
  }
}

export function normalizeWorkspacePreferences(
  value: Partial<WorkspacePreferences> | undefined,
  fallback: WorkspacePreferences = defaultWorkspacePreferences,
): WorkspacePreferences {
  return {
    density: normalizeWorkspaceDensity(value?.density, fallback.density),
    panelWidths: normalizeWorkspacePanelWidths(
      value?.panelWidths,
      fallback.panelWidths,
    ),
    panels: normalizeWorkspacePanels(value?.panels, fallback.panels),
  }
}

export function workspacePanelOpenKey(
  panelId: WorkspacePanelId,
): keyof WorkspacePanelState {
  return panelId === "filmstrip" ? "filmstripOpen" : "propertiesOpen"
}

export function workspaceErgonomicsReport(
  preferences: WorkspacePreferences,
): WorkspaceErgonomicsReport {
  const normalized = normalizeWorkspacePreferences(preferences)
  const openPanelCount = [
    normalized.panels.filmstripOpen,
    normalized.panels.propertiesOpen,
  ].filter(Boolean).length
  const responsiveControlsReady = workspaceDensityOptions.length >= 3
  const panelRestoreReady =
    typeof normalized.panels.filmstripOpen === "boolean" &&
    typeof normalized.panels.propertiesOpen === "boolean"
  const status =
    responsiveControlsReady && panelRestoreReady ? "ready" : "attention"

  return {
    density: normalized.density,
    openPanelCount,
    panelRestoreReady,
    panels: normalized.panels,
    responsiveControlsReady,
    status,
    summary:
      status === "ready"
        ? `${workspaceDensityConfig(normalized.density).label} density is saved with ${openPanelCount}/2 side panels open.`
        : "Workspace ergonomics need density controls and restorable panel state.",
  }
}
