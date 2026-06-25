import type { DesktopFileCommandPayload } from "./desktop-file-command-payloads"

type TauriInvoke = <T>(
  command: string,
  args?: Record<string, unknown>,
) => Promise<T>

type WindowWithTauriInvoke = Window & {
  __TAURI__?: {
    core?: {
      invoke?: TauriInvoke
    }
  }
  __TAURI_INTERNALS__?: {
    invoke?: TauriInvoke
  }
}

export type NativeDesktopFile = {
  dataUrl?: string | null
  extension: string
  lastModified: number
  mimeType: string
  name: string
  path: string
  size: number
  text?: string | null
}

export type NativeDesktopReadResponse = {
  files: NativeDesktopFile[]
  permissionScope: DesktopFileCommandPayload["permissionScope"]
  status: "cancelled" | "picked"
}

export type NativeDesktopWriteResponse = {
  bytesWritten: number
  extension: string
  fileName: string
  path: string
  permissionScope: DesktopFileCommandPayload["permissionScope"]
  status: "cancelled" | "saved"
}

export type NativeDesktopRecentDocumentResponse = {
  fileName: string
  path: string
  permissionScope: "read-recent-handle"
  platform: string
  status: "registered"
}

export type NativeDesktopFileCapabilities = {
  maxFileBytes: number
  scopes: Array<{
    acceptExtensions: string[]
    canRead: boolean
    canWrite: boolean
    permissionScope: DesktopFileCommandPayload["permissionScope"]
  }>
}

export type NativeDesktopInvoker = TauriInvoke

type NativeDesktopReadOptions = {
  invoker?: NativeDesktopInvoker
  path?: string
}

type NativeDesktopWriteOptions = {
  dataUrl?: string
  invoker?: NativeDesktopInvoker
  path?: string | null
  text?: string
}

type NativeDesktopRecentDocumentOptions = {
  invoker?: NativeDesktopInvoker
}

function tauriInvoker(target: Window | undefined = globalThis.window) {
  if (!target) return null
  const tauri = target as WindowWithTauriInvoke

  return (
    tauri.__TAURI__?.core?.invoke ??
    tauri.__TAURI_INTERNALS__?.invoke ??
    null
  )
}

export function hasNativeDesktopFileApi(
  target: Window | undefined = globalThis.window,
) {
  return typeof tauriInvoker(target) === "function"
}

function commandDialog(payload: DesktopFileCommandPayload) {
  return {
    acceptExtensions: payload.dialog.acceptExtensions,
    mode: payload.dialog.mode,
    permissionScope: payload.permissionScope,
    suggestedExtension: payload.dialog.suggestedExtension,
    suggestedName: undefined as string | undefined,
    title: payload.dialog.title,
  }
}

export function desktopFileDialogRequest(
  payload: DesktopFileCommandPayload,
  suggestedName?: string,
) {
  return {
    ...commandDialog(payload),
    suggestedName,
  }
}

async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read this file payload."))
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
        return
      }

      reject(new Error("Could not convert this file payload."))
    }
    reader.readAsDataURL(blob)
  })
}

function requireInvoker(invoker?: NativeDesktopInvoker) {
  const resolved = invoker ?? tauriInvoker()

  if (!resolved) {
    throw new Error("Native desktop file APIs are unavailable.")
  }

  return resolved
}

export async function readNativeDesktopFiles(
  payload: DesktopFileCommandPayload,
  options: NativeDesktopReadOptions = {},
) {
  return requireInvoker(options.invoker)<NativeDesktopReadResponse>(
    "desktop_pick_and_read_file",
    {
      request: {
        dialog: desktopFileDialogRequest(payload),
        path: options.path ?? null,
      },
    },
  )
}

export async function writeNativeDesktopFile(
  payload: DesktopFileCommandPayload,
  input: {
    blob?: Blob
    path?: string | null
    suggestedName?: string
    text?: string
  },
  options: NativeDesktopWriteOptions = {},
) {
  const dataUrl = input.blob ? await blobToDataUrl(input.blob) : options.dataUrl

  return requireInvoker(options.invoker)<NativeDesktopWriteResponse>(
    "desktop_save_file",
    {
      request: {
        dataUrl,
        dialog: desktopFileDialogRequest(payload, input.suggestedName),
        path: input.path ?? options.path ?? null,
        text: input.text ?? options.text,
      },
    },
  )
}

export async function readNativeDesktopCapabilities(
  invoker?: NativeDesktopInvoker,
) {
  return requireInvoker(invoker)<NativeDesktopFileCapabilities>(
    "desktop_file_bridge_capabilities",
  )
}

export async function registerNativeDesktopRecentDocument(
  input: { path: string },
  options: NativeDesktopRecentDocumentOptions = {},
) {
  return requireInvoker(options.invoker)<NativeDesktopRecentDocumentResponse>(
    "desktop_register_recent_document",
    {
      request: {
        path: input.path,
        permissionScope: "read-recent-handle",
      },
    },
  )
}

export async function nativeDesktopFileToFile(file: NativeDesktopFile) {
  if (file.text != null) {
    return new File([file.text], file.name, {
      lastModified: file.lastModified,
      type: file.mimeType,
    })
  }

  if (!file.dataUrl) {
    throw new Error("Native desktop file payload is empty.")
  }

  const response = await fetch(file.dataUrl)
  const blob = await response.blob()

  return new File([blob], file.name, {
    lastModified: file.lastModified,
    type: file.mimeType,
  })
}
