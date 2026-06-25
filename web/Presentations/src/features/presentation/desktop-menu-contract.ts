import type {
  DesktopBridgeCapabilityId,
  DesktopBridgeReadiness,
} from "./desktop-bridge-readiness"

export const DESKTOP_MENU_COMMAND_EVENT =
  "essence-powerpoint:desktop-menu-command"

export type DesktopMenuCommandId =
  | "file.open"
  | "file.save"
  | "file.saveAsJson"
  | "file.importOutline"
  | "file.importPresentation"
  | "file.importImageSlides"
  | "file.exportPptx"
  | "file.exportPdf"
  | "file.exportSlideSvg"
  | "file.exportSlidePng"
  | "file.recentLocalDecks"
  | "file.recoverySnapshots"

export type DesktopMenuCommandGroup = "File" | "Import" | "Export" | "Recover"

export type DesktopMenuCommandChannel =
  | "browser-download"
  | "browser-picker"
  | "browser-storage"
  | "hidden-input"
  | "native-shell"
  | "unavailable"

export type DesktopMenuCommandStatus = "ready" | "fallback" | "blocked"

export type DesktopMenuCommandDefinition = {
  group: DesktopMenuCommandGroup
  id: DesktopMenuCommandId
  label: string
  fallbackChannel: DesktopMenuCommandChannel
  fallbackDetail: string
  readyChannel: DesktopMenuCommandChannel
  readyDetail: string
  requires: DesktopBridgeCapabilityId[]
  requiresSelectedSlide?: boolean
  shortcut?: string
}

export type DesktopMenuCommandContract = DesktopMenuCommandDefinition & {
  channel: DesktopMenuCommandChannel
  detail: string
  status: DesktopMenuCommandStatus
}

export type DesktopMenuContractSummary = {
  blockedCount: number
  commands: DesktopMenuCommandContract[]
  fallbackCount: number
  label: string
  readyCount: number
  totalCount: number
}

export type DesktopMenuContractRuntime = {
  canExportSelectedSlide?: boolean
}

export type DesktopMenuCommandHandlers = Partial<
  Record<DesktopMenuCommandId, () => void>
>

export const desktopMenuCommandDefinitions = [
  {
    fallbackChannel: "hidden-input",
    fallbackDetail: "Falls back to the browser upload input.",
    group: "File",
    id: "file.open",
    label: "Open deck",
    readyChannel: "browser-picker",
    readyDetail: "Uses the system open-file picker.",
    requires: ["fileOpen"],
    shortcut: "Ctrl/Command O",
  },
  {
    fallbackChannel: "browser-download",
    fallbackDetail: "Falls back to creating a downloaded deck-file copy.",
    group: "File",
    id: "file.save",
    label: "Save",
    readyChannel: "browser-picker",
    readyDetail: "Writes to the current local deck handle.",
    requires: ["fileSave"],
    shortcut: "Ctrl/Command S",
  },
  {
    fallbackChannel: "browser-download",
    fallbackDetail: "Falls back to a browser deck-file download.",
    group: "File",
    id: "file.saveAsJson",
    label: "Save as deck file",
    readyChannel: "browser-picker",
    readyDetail: "Uses the system save-file picker.",
    requires: ["fileSave"],
  },
  {
    fallbackChannel: "hidden-input",
    fallbackDetail: "Falls back to the outline upload input.",
    group: "Import",
    id: "file.importOutline",
    label: "Import outline",
    readyChannel: "browser-picker",
    readyDetail: "Uses the system open-file picker.",
    requires: ["fileOpen"],
  },
  {
    fallbackChannel: "hidden-input",
    fallbackDetail: "Falls back to the PPTX/ODP upload input.",
    group: "Import",
    id: "file.importPresentation",
    label: "Import PPTX or ODP",
    readyChannel: "browser-picker",
    readyDetail: "Uses the system open-file picker.",
    requires: ["fileOpen"],
  },
  {
    fallbackChannel: "hidden-input",
    fallbackDetail: "Falls back to the image-slide upload input.",
    group: "Import",
    id: "file.importImageSlides",
    label: "Import image slides",
    readyChannel: "browser-picker",
    readyDetail: "Uses the system multi-file picker.",
    requires: ["fileOpen"],
  },
  {
    fallbackChannel: "browser-download",
    fallbackDetail: "Falls back to downloading the PowerPoint PPTX export.",
    group: "Export",
    id: "file.exportPptx",
    label: "Export PowerPoint PPTX",
    readyChannel: "browser-picker",
    readyDetail: "Uses the system save-file picker.",
    requires: ["fileSave"],
  },
  {
    fallbackChannel: "browser-download",
    fallbackDetail: "Falls back to downloading the PDF export.",
    group: "Export",
    id: "file.exportPdf",
    label: "Export PDF",
    readyChannel: "browser-picker",
    readyDetail: "Uses the system save-file picker.",
    requires: ["fileSave"],
  },
  {
    fallbackChannel: "browser-download",
    fallbackDetail: "Requires a selected slide; otherwise unavailable.",
    group: "Export",
    id: "file.exportSlideSvg",
    label: "Export slide SVG",
    readyChannel: "browser-picker",
    readyDetail: "Uses the system save-file picker for the selected slide.",
    requires: ["fileSave"],
    requiresSelectedSlide: true,
  },
  {
    fallbackChannel: "browser-download",
    fallbackDetail: "Requires a selected slide; otherwise unavailable.",
    group: "Export",
    id: "file.exportSlidePng",
    label: "Export slide PNG",
    readyChannel: "browser-picker",
    readyDetail: "Uses the system save-file picker for the selected slide.",
    requires: ["fileSave"],
    requiresSelectedSlide: true,
  },
  {
    fallbackChannel: "unavailable",
    fallbackDetail: "Recent local deck handles are unavailable here.",
    group: "File",
    id: "file.recentLocalDecks",
    label: "Recent local decks",
    readyChannel: "browser-storage",
    readyDetail: "Can reopen remembered local deck handles.",
    requires: ["persistentHandles"],
  },
  {
    fallbackChannel: "unavailable",
    fallbackDetail: "Recovery snapshots are unavailable in this context.",
    group: "Recover",
    id: "file.recoverySnapshots",
    label: "Recovery snapshots",
    readyChannel: "browser-storage",
    readyDetail: "Can store and restore local recovery snapshots.",
    requires: ["recoveryStorage"],
  },
] satisfies DesktopMenuCommandDefinition[]

const desktopMenuCommandIds = new Set<DesktopMenuCommandId>(
  desktopMenuCommandDefinitions.map((command) => command.id),
)

function capabilityMap(readiness: DesktopBridgeReadiness) {
  return new Map(
    readiness.capabilities.map((capability) => [
      capability.id,
      capability.ready,
    ]),
  )
}

function commandHasRequiredCapabilities(
  command: DesktopMenuCommandDefinition,
  capabilities: Map<DesktopBridgeCapabilityId, boolean>,
) {
  return command.requires.every((capabilityId) => capabilities.get(capabilityId))
}

function fallbackStatus(command: DesktopMenuCommandDefinition) {
  return command.fallbackChannel === "unavailable" ? "blocked" : "fallback"
}

function fallbackDetail(command: DesktopMenuCommandDefinition) {
  if (command.fallbackChannel === "unavailable") {
    return command.fallbackDetail
  }

  return `${command.fallbackDetail} Native menu wiring can call the same command id.`
}

export function desktopMenuContractFromReadiness(
  readiness: DesktopBridgeReadiness,
  runtime: DesktopMenuContractRuntime = {},
): DesktopMenuContractSummary {
  const capabilities = capabilityMap(readiness)
  const hasDesktopShell = Boolean(capabilities.get("desktopShell"))
  const commands = desktopMenuCommandDefinitions.map((command) => {
    const missingSelection =
      command.requiresSelectedSlide && !runtime.canExportSelectedSlide

    if (missingSelection) {
      return {
        ...command,
        channel: "unavailable",
        detail: "Select a slide before running this export command.",
        status: "blocked",
      } satisfies DesktopMenuCommandContract
    }

    if (commandHasRequiredCapabilities(command, capabilities)) {
      return {
        ...command,
        channel: hasDesktopShell ? "native-shell" : command.readyChannel,
        detail: command.readyDetail,
        status: "ready",
      } satisfies DesktopMenuCommandContract
    }

    return {
      ...command,
      channel: command.fallbackChannel,
      detail: fallbackDetail(command),
      status: fallbackStatus(command),
    } satisfies DesktopMenuCommandContract
  })
  const readyCount = commands.filter((command) => command.status === "ready").length
  const fallbackCount = commands.filter(
    (command) => command.status === "fallback",
  ).length
  const blockedCount = commands.filter(
    (command) => command.status === "blocked",
  ).length

  return {
    blockedCount,
    commands,
    fallbackCount,
    label: hasDesktopShell
      ? "Native shell command contract"
      : "Browser command contract",
    readyCount,
    totalCount: commands.length,
  }
}

export function isDesktopMenuCommandId(
  value: unknown,
): value is DesktopMenuCommandId {
  return (
    typeof value === "string" &&
    desktopMenuCommandIds.has(value as DesktopMenuCommandId)
  )
}

export function dispatchDesktopMenuCommand(
  commandId: DesktopMenuCommandId,
  target: Window = window,
) {
  target.dispatchEvent(
    new CustomEvent(DESKTOP_MENU_COMMAND_EVENT, {
      detail: { commandId },
    }),
  )
}

export function listenForDesktopMenuCommands(
  handlers: DesktopMenuCommandHandlers,
  target: Window = window,
) {
  function onCommand(event: Event) {
    const detail = (event as CustomEvent<{ commandId?: unknown }>).detail
    const commandId = detail?.commandId

    if (!isDesktopMenuCommandId(commandId)) return

    handlers[commandId]?.()
  }

  target.addEventListener(DESKTOP_MENU_COMMAND_EVENT, onCommand)

  return () => {
    target.removeEventListener(DESKTOP_MENU_COMMAND_EVENT, onCommand)
  }
}
