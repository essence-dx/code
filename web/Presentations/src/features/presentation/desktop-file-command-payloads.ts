import type { DesktopBridgeReadiness } from "./desktop-bridge-readiness"
import {
  desktopMenuContractFromReadiness,
  type DesktopMenuCommandChannel,
  type DesktopMenuCommandContract,
  type DesktopMenuCommandGroup,
  type DesktopMenuCommandId,
  type DesktopMenuCommandStatus,
  type DesktopMenuContractRuntime,
} from "./desktop-menu-contract"
import {
  deckFileAcceptExtensions,
  essenceDeckFileExtension,
} from "./deck-file-format"
import {
  isStaleRecentLocalDeckFile,
  recentLocalDeckStaleCutoff,
  sortRecentLocalDeckFiles,
  type RecentLocalDeckFile,
} from "./recent-local-deck-files"

export type DesktopFileCommandOperation =
  | "browse"
  | "export"
  | "import"
  | "open"
  | "recover"
  | "save"

export type DesktopFileDialogMode = "open" | "open-many" | "save" | "storage"

export type DesktopFilePermissionScope =
  | "read-deck-file"
  | "read-image-files"
  | "read-outline-file"
  | "read-presentation-file"
  | "read-recent-handle"
  | "read-recovery-storage"
  | "write-deck-file"
  | "write-export-file"

export type DesktopFileCommandDialog = {
  acceptExtensions: string[]
  mode: DesktopFileDialogMode
  suggestedExtension?: string
  title: string
}

export type DesktopFileCommandPayload = {
  channel: DesktopMenuCommandChannel
  commandId: DesktopMenuCommandId
  dialog: DesktopFileCommandDialog
  group: DesktopMenuCommandGroup
  label: string
  operation: DesktopFileCommandOperation
  permissionScope: DesktopFilePermissionScope
  rememberRecentOnSuccess: boolean
  selectedSlideRequired: boolean
  status: DesktopMenuCommandStatus
}

export type DesktopRecentFileHandoffItem = {
  detail: string
  id: string
  lastOpenedAt: number
  name: string
  nativeRecentEligible: boolean
  permissionScope: "read-recent-handle"
  pinned: boolean
  size: number
  stale: boolean
}

export type DesktopRecentFileHandoffSummary = {
  items: DesktopRecentFileHandoffItem[]
  label: string
  nativeReadyCount: number
  pinnedCount: number
  staleCount: number
  totalCount: number
}

type DesktopFileCommandPayloadDefinition = Omit<
  DesktopFileCommandPayload,
  | "channel"
  | "commandId"
  | "group"
  | "label"
  | "selectedSlideRequired"
  | "status"
>

const payloadDefinitions = {
  "file.open": {
    dialog: {
      acceptExtensions: [...deckFileAcceptExtensions],
      mode: "open",
      title: "Open Essence deck",
    },
    operation: "open",
    permissionScope: "read-deck-file",
    rememberRecentOnSuccess: true,
  },
  "file.save": {
    dialog: {
      acceptExtensions: [...deckFileAcceptExtensions],
      mode: "save",
      suggestedExtension: essenceDeckFileExtension,
      title: "Save Essence deck",
    },
    operation: "save",
    permissionScope: "write-deck-file",
    rememberRecentOnSuccess: true,
  },
  "file.saveAsJson": {
    dialog: {
      acceptExtensions: [...deckFileAcceptExtensions],
      mode: "save",
      suggestedExtension: essenceDeckFileExtension,
      title: "Save Essence deck file",
    },
    operation: "save",
    permissionScope: "write-deck-file",
    rememberRecentOnSuccess: true,
  },
  "file.importOutline": {
    dialog: {
      acceptExtensions: [".txt", ".md", ".outline"],
      mode: "open",
      title: "Import outline",
    },
    operation: "import",
    permissionScope: "read-outline-file",
    rememberRecentOnSuccess: false,
  },
  "file.importPresentation": {
    dialog: {
      acceptExtensions: [".pptx", ".odp", ".gslides"],
      mode: "open",
      title: "Import PPTX or ODP",
    },
    operation: "import",
    permissionScope: "read-presentation-file",
    rememberRecentOnSuccess: false,
  },
  "file.importImageSlides": {
    dialog: {
      acceptExtensions: [
        ".apng",
        ".avif",
        ".gif",
        ".jpeg",
        ".jpg",
        ".png",
        ".webp",
      ],
      mode: "open-many",
      title: "Import image slides",
    },
    operation: "import",
    permissionScope: "read-image-files",
    rememberRecentOnSuccess: false,
  },
  "file.exportPptx": {
    dialog: {
      acceptExtensions: [".pptx"],
      mode: "save",
      suggestedExtension: ".pptx",
      title: "Export PowerPoint presentation",
    },
    operation: "export",
    permissionScope: "write-export-file",
    rememberRecentOnSuccess: false,
  },
  "file.exportPdf": {
    dialog: {
      acceptExtensions: [".pdf"],
      mode: "save",
      suggestedExtension: ".pdf",
      title: "Export PDF",
    },
    operation: "export",
    permissionScope: "write-export-file",
    rememberRecentOnSuccess: false,
  },
  "file.exportSlideSvg": {
    dialog: {
      acceptExtensions: [".svg"],
      mode: "save",
      suggestedExtension: ".svg",
      title: "Export selected slide SVG",
    },
    operation: "export",
    permissionScope: "write-export-file",
    rememberRecentOnSuccess: false,
  },
  "file.exportSlidePng": {
    dialog: {
      acceptExtensions: [".png"],
      mode: "save",
      suggestedExtension: ".png",
      title: "Export selected slide PNG",
    },
    operation: "export",
    permissionScope: "write-export-file",
    rememberRecentOnSuccess: false,
  },
  "file.recentLocalDecks": {
    dialog: {
      acceptExtensions: [...deckFileAcceptExtensions],
      mode: "storage",
      title: "Recent local decks",
    },
    operation: "browse",
    permissionScope: "read-recent-handle",
    rememberRecentOnSuccess: false,
  },
  "file.recoverySnapshots": {
    dialog: {
      acceptExtensions: [".json"],
      mode: "storage",
      title: "Recovery snapshots",
    },
    operation: "recover",
    permissionScope: "read-recovery-storage",
    rememberRecentOnSuccess: false,
  },
} satisfies Record<DesktopMenuCommandId, DesktopFileCommandPayloadDefinition>

function payloadFromContract(
  command: DesktopMenuCommandContract,
): DesktopFileCommandPayload {
  const payload = payloadDefinitions[command.id]

  return {
    ...payload,
    channel: command.channel,
    commandId: command.id,
    group: command.group,
    label: command.label,
    selectedSlideRequired: command.requiresSelectedSlide === true,
    status: command.status,
  }
}

export function desktopFileCommandPayloadsFromReadiness(
  readiness: DesktopBridgeReadiness,
  runtime: DesktopMenuContractRuntime = {},
) {
  return desktopMenuContractFromReadiness(readiness, runtime).commands.map(
    payloadFromContract,
  )
}

export function desktopFileCommandPayloadForCommand(
  commandId: DesktopMenuCommandId,
  readiness: DesktopBridgeReadiness,
  runtime: DesktopMenuContractRuntime = {},
) {
  return desktopFileCommandPayloadsFromReadiness(readiness, runtime).find(
    (payload) => payload.commandId === commandId,
  )
}

export function desktopRecentFileHandoffSummary(
  recents: RecentLocalDeckFile[],
  options: {
    now?: number | Date
    staleDays?: number
  } = {},
): DesktopRecentFileHandoffSummary {
  const cutoff = recentLocalDeckStaleCutoff(options.now, options.staleDays)
  const items = sortRecentLocalDeckFiles(recents).map((recent) => {
    const stale = isStaleRecentLocalDeckFile(recent, cutoff)

    return {
      detail: stale
        ? "Reopen this file once before offering it to native recent-file menus."
        : recent.pinned
          ? "Pinned for native recent-file menus."
          : "Ready for native recent-file menus.",
      id: recent.id,
      lastOpenedAt: recent.lastOpenedAt,
      name: recent.name,
      nativeRecentEligible: !stale,
      permissionScope: "read-recent-handle",
      pinned: recent.pinned,
      size: recent.size,
      stale,
    } satisfies DesktopRecentFileHandoffItem
  })
  const pinnedCount = items.filter((item) => item.pinned).length
  const staleCount = items.filter((item) => item.stale).length
  const nativeReadyCount = items.filter(
    (item) => item.nativeRecentEligible,
  ).length

  return {
    items,
    label: items.length
      ? `${nativeReadyCount} of ${items.length} recent files ready`
      : "No recent local files",
    nativeReadyCount,
    pinnedCount,
    staleCount,
    totalCount: items.length,
  }
}
