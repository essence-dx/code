import {
  essenceDeckFileExtension,
  legacyDeckFileExtension,
} from "./deck-file-format"
import {
  isStaleRecentLocalDeckFile,
  recentLocalDeckStaleCutoff,
  sortRecentLocalDeckFiles,
  type RecentLocalDeckFile,
} from "./recent-local-deck-files"

export type DesktopRecentDocumentPlanStatus =
  | "attention"
  | "blocked"
  | "ready"

export type DesktopRecentDocumentWriterCommand = {
  command: "desktop_register_recent_document"
  request: {
    path: string
    permissionScope: "read-recent-handle"
  }
}

export type DesktopRecentDocumentWriterItem = {
  command?: DesktopRecentDocumentWriterCommand
  detail: string
  extension: string
  id: string
  lastOpenedAt: number
  name: string
  nativePath?: string
  pinned: boolean
  stale: boolean
  status: DesktopRecentDocumentPlanStatus
}

export type DesktopRecentDocumentWriterPlan = {
  blockedCount: number
  items: DesktopRecentDocumentWriterItem[]
  legacyJsonCount: number
  missingNativePathCount: number
  readyCount: number
  staleCount: number
  status: DesktopRecentDocumentPlanStatus
  summary: string
  totalCount: number
  writerCommandCount: number
}

function extensionFromName(name: string) {
  const match = name.match(/\.([^.\\/]+)$/)

  return match ? `.${match[1].toLowerCase()}` : ""
}

function extensionForRecentFile(recent: RecentLocalDeckFile) {
  return extensionFromName(recent.nativePath ?? recent.name)
}

function recentDocumentItem(
  recent: RecentLocalDeckFile,
  cutoff: number,
): DesktopRecentDocumentWriterItem {
  const stale = isStaleRecentLocalDeckFile(recent, cutoff)
  const extension = extensionForRecentFile(recent)

  if (stale) {
    return {
      detail: "Reopen this file before writing it into the OS recent-document list.",
      extension,
      id: recent.id,
      lastOpenedAt: recent.lastOpenedAt,
      name: recent.name,
      nativePath: recent.nativePath,
      pinned: recent.pinned,
      stale,
      status: "attention",
    }
  }

  if (!recent.nativePath) {
    return {
      detail: "Browser-only recent files need native path metadata first.",
      extension,
      id: recent.id,
      lastOpenedAt: recent.lastOpenedAt,
      name: recent.name,
      pinned: recent.pinned,
      stale,
      status: "blocked",
    }
  }

  if (extension === legacyDeckFileExtension) {
    return {
      detail: "Legacy JSON decks stay open-compatible but are not registered as OS recent documents.",
      extension,
      id: recent.id,
      lastOpenedAt: recent.lastOpenedAt,
      name: recent.name,
      nativePath: recent.nativePath,
      pinned: recent.pinned,
      stale,
      status: "attention",
    }
  }

  if (extension !== essenceDeckFileExtension) {
    return {
      detail: `Only app-owned ${essenceDeckFileExtension} files are safe for OS recent-document registration.`,
      extension,
      id: recent.id,
      lastOpenedAt: recent.lastOpenedAt,
      name: recent.name,
      nativePath: recent.nativePath,
      pinned: recent.pinned,
      stale,
      status: "blocked",
    }
  }

  return {
    command: {
      command: "desktop_register_recent_document",
      request: {
        path: recent.nativePath,
        permissionScope: "read-recent-handle",
      },
    },
    detail: "Ready for scoped OS recent-document registration.",
    extension,
    id: recent.id,
    lastOpenedAt: recent.lastOpenedAt,
    name: recent.name,
    nativePath: recent.nativePath,
    pinned: recent.pinned,
    stale,
    status: "ready",
  }
}

export function desktopRecentDocumentWriterPlan(
  recents: RecentLocalDeckFile[],
  options: {
    now?: number | Date
    staleDays?: number
  } = {},
): DesktopRecentDocumentWriterPlan {
  const cutoff = recentLocalDeckStaleCutoff(options.now, options.staleDays)
  const items = sortRecentLocalDeckFiles(recents).map((recent) =>
    recentDocumentItem(recent, cutoff),
  )
  const readyCount = items.filter((item) => item.status === "ready").length
  const blockedCount = items.filter((item) => item.status === "blocked").length
  const staleCount = items.filter((item) => item.stale).length
  const missingNativePathCount = items.filter((item) => !item.nativePath).length
  const legacyJsonCount = items.filter(
    (item) => item.extension === legacyDeckFileExtension,
  ).length
  const writerCommandCount = items.filter((item) => item.command).length
  const status =
    items.length === 0
      ? "attention"
      : readyCount === 0
        ? "blocked"
        : readyCount === items.length
          ? "ready"
          : "attention"

  return {
    blockedCount,
    items,
    legacyJsonCount,
    missingNativePathCount,
    readyCount,
    staleCount,
    status,
    summary: items.length
      ? `${writerCommandCount} of ${items.length} recent files have scoped OS writer commands.`
      : "No recent local files are available for OS recent-document registration.",
    totalCount: items.length,
    writerCommandCount,
  }
}

export function serializeDesktopRecentDocumentWriterPlan(
  plan: DesktopRecentDocumentWriterPlan,
) {
  return [
    `OS recent-document writer: ${plan.summary} Status: ${plan.status}.`,
    ...plan.items.map((item) => {
      const command = item.command
        ? ` Command ${item.command.command} uses ${item.command.request.permissionScope}.`
        : ""

      return `- ${item.name}: ${item.status}. ${item.detail}${command}`
    }),
  ].join("\n")
}
