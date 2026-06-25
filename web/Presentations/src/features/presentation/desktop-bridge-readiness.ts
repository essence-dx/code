import { hasNativeDesktopFileApi } from "./desktop-native-file-api"

export type DesktopBridgeCapabilityId =
  | "clipboard"
  | "desktopShell"
  | "fileOpen"
  | "fileSave"
  | "persistentHandles"
  | "recoveryStorage"

export type DesktopBridgeCapability = {
  detail: string
  id: DesktopBridgeCapabilityId
  label: string
  ready: boolean
}

export type DesktopBridgeReadiness = {
  capabilities: DesktopBridgeCapability[]
  detail: string
  label: string
  readyCount: number
  totalCount: number
  variant: "fallback" | "local" | "shell"
}

export type DesktopBridgeCapabilityInput = Partial<
  Record<DesktopBridgeCapabilityId, boolean>
>

type WindowWithDesktopBridgeApis = Window & {
  __TAURI__?: unknown
  __TAURI_INTERNALS__?: unknown
  showOpenFilePicker?: unknown
  showSaveFilePicker?: unknown
}

const capabilityDefinitions = [
  {
    id: "fileOpen",
    label: "Open files",
    readyDetail: "System file opening is available.",
    fallbackDetail: "File opening uses the browser upload fallback.",
  },
  {
    id: "fileSave",
    label: "Save files",
    readyDetail: "System save dialogs are available.",
    fallbackDetail: "Exports and saves use browser downloads.",
  },
  {
    id: "persistentHandles",
    label: "Recent files",
    readyDetail: "Recent local files can keep file handles.",
    fallbackDetail: "Recent files cannot reopen handles here.",
  },
  {
    id: "recoveryStorage",
    label: "Recovery",
    readyDetail: "Local recovery snapshots can be stored.",
    fallbackDetail: "Recovery snapshots are unavailable in this context.",
  },
  {
    id: "clipboard",
    label: "Clipboard",
    readyDetail: "Copy actions can write to the clipboard.",
    fallbackDetail: "Copy actions may need manual selection.",
  },
  {
    id: "desktopShell",
    label: "Desktop shell",
    readyDetail: "Running inside the desktop shell.",
    fallbackDetail: "Running as a browser app.",
  },
] satisfies Array<{
  fallbackDetail: string
  id: DesktopBridgeCapabilityId
  label: string
  readyDetail: string
}>

function canUseLocalStorage(target: Window) {
  try {
    const key = "essence-powerpoint:desktop-bridge-check"

    target.localStorage.setItem(key, "1")
    target.localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export function desktopBridgeReadinessFromCapabilities(
  input: DesktopBridgeCapabilityInput,
): DesktopBridgeReadiness {
  const capabilities = capabilityDefinitions.map((definition) => {
    const ready = Boolean(input[definition.id])

    return {
      detail: ready ? definition.readyDetail : definition.fallbackDetail,
      id: definition.id,
      label: definition.label,
      ready,
    }
  })
  const readyCount = capabilities.filter((capability) => capability.ready).length
  const hasDesktopShell = Boolean(input.desktopShell)
  const hasLocalFileCore =
    Boolean(input.fileOpen) &&
    Boolean(input.fileSave) &&
    Boolean(input.recoveryStorage)
  const variant = hasDesktopShell
    ? "shell"
    : hasLocalFileCore
      ? "local"
      : "fallback"

  return {
    capabilities,
    detail:
      variant === "shell"
        ? "Desktop shell and local file features are available."
        : variant === "local"
          ? "Local file features are available in this browser."
          : "Local file features are using browser fallbacks.",
    label:
      variant === "shell"
        ? "Desktop ready"
        : variant === "local"
          ? "Local files ready"
          : "Download fallback",
    readyCount,
    totalCount: capabilities.length,
    variant,
  }
}

export function readDesktopBridgeReadiness(): DesktopBridgeReadiness {
  if (typeof window === "undefined") {
    return desktopBridgeReadinessFromCapabilities({})
  }

  const target = window as WindowWithDesktopBridgeApis
  const hasNativeFileApi = hasNativeDesktopFileApi(target)

  return desktopBridgeReadinessFromCapabilities({
    clipboard: typeof navigator.clipboard?.writeText === "function",
    desktopShell:
      typeof target.__TAURI__ !== "undefined" ||
      typeof target.__TAURI_INTERNALS__ !== "undefined",
    fileOpen:
      typeof target.showOpenFilePicker === "function" || hasNativeFileApi,
    fileSave:
      typeof target.showSaveFilePicker === "function" || hasNativeFileApi,
    persistentHandles:
      typeof target.indexedDB !== "undefined" || hasNativeFileApi,
    recoveryStorage: canUseLocalStorage(target),
  })
}
