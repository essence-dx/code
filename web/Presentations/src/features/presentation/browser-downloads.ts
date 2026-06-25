export type FilePickerType = {
  description: string
  accept: Record<string, string[]>
}

type SaveFilePickerOptions = {
  suggestedName?: string
  types?: FilePickerType[]
  excludeAcceptAllOption?: boolean
}

type OpenFilePickerOptions = {
  multiple?: boolean
  types?: FilePickerType[]
  excludeAcceptAllOption?: boolean
}

type FileWritable = {
  write: (data: Blob | BufferSource | string) => Promise<void>
  close: () => Promise<void>
}

export type FileWritableHandle = {
  createWritable: () => Promise<FileWritable>
}

export type FileHandlePermissionMode = "read" | "readwrite"

export type FileHandle = FileWritableHandle & {
  getFile: () => Promise<File>
  queryPermission?: (descriptor?: {
    mode?: FileHandlePermissionMode
  }) => Promise<PermissionState>
  requestPermission?: (descriptor?: {
    mode?: FileHandlePermissionMode
  }) => Promise<PermissionState>
}

type WindowWithFilePickers = Window & {
  showOpenFilePicker?: (options?: OpenFilePickerOptions) => Promise<FileHandle[]>
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileHandle>
}

export type FilePickResult =
  | { status: "picked"; file: File; handle: FileHandle }
  | { status: "cancelled" }
  | { status: "unsupported" }

export type FilePickManyResult =
  | { status: "picked"; files: File[]; handles: FileHandle[] }
  | { status: "cancelled" }
  | { status: "unsupported" }

export type FileSaveResult =
  | { status: "saved"; handle: FileHandle }
  | { status: "downloaded" }
  | { status: "cancelled" }

export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadTextFile(name: string, value: string, type: string) {
  downloadBlob(
    name,
    new Blob([value], {
      type,
    }),
  )
}

function isPickerCancelled(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

export async function pickSingleFileWithPicker(
  types: FilePickerType[],
): Promise<FilePickResult> {
  const picker = (window as WindowWithFilePickers).showOpenFilePicker

  if (!picker) {
    return { status: "unsupported" }
  }

  try {
    const [handle] = await picker({
      excludeAcceptAllOption: false,
      multiple: false,
      types,
    })

    if (!handle) {
      return { status: "cancelled" }
    }

    return {
      status: "picked",
      file: await handle.getFile(),
      handle,
    }
  } catch (error) {
    if (isPickerCancelled(error)) {
      return { status: "cancelled" }
    }

    throw error
  }
}

export async function pickMultipleFilesWithPicker(
  types: FilePickerType[],
): Promise<FilePickManyResult> {
  const picker = (window as WindowWithFilePickers).showOpenFilePicker

  if (!picker) {
    return { status: "unsupported" }
  }

  try {
    const handles = await picker({
      excludeAcceptAllOption: false,
      multiple: true,
      types,
    })

    if (!handles.length) {
      return { status: "cancelled" }
    }

    return {
      status: "picked",
      files: await Promise.all(handles.map((handle) => handle.getFile())),
      handles,
    }
  } catch (error) {
    if (isPickerCancelled(error)) {
      return { status: "cancelled" }
    }

    throw error
  }
}

export async function writeBlobToFileHandle(
  handle: FileWritableHandle,
  blob: Blob,
) {
  const writable = await handle.createWritable()

  await writable.write(blob)
  await writable.close()
}

export async function ensureFileHandlePermission(
  handle: FileHandle,
  mode: FileHandlePermissionMode,
) {
  if (!handle.queryPermission || !handle.requestPermission) {
    return true
  }

  const descriptor = { mode }
  const currentPermission = await handle.queryPermission(descriptor)

  if (currentPermission === "granted") {
    return true
  }

  return (await handle.requestPermission(descriptor)) === "granted"
}

export async function saveBlobWithPicker(
  name: string,
  blob: Blob,
  types: FilePickerType[],
): Promise<FileSaveResult> {
  const picker = (window as WindowWithFilePickers).showSaveFilePicker

  if (!picker) {
    downloadBlob(name, blob)
    return { status: "downloaded" }
  }

  try {
    const handle = await picker({
      excludeAcceptAllOption: false,
      suggestedName: name,
      types,
    })
    await writeBlobToFileHandle(handle, blob)

    return { status: "saved", handle }
  } catch (error) {
    if (isPickerCancelled(error)) {
      return { status: "cancelled" }
    }

    throw error
  }
}

export async function saveTextFileWithPicker(
  name: string,
  value: string,
  type: string,
  pickerTypes: FilePickerType[],
) {
  return saveBlobWithPicker(
    name,
    new Blob([value], {
      type,
    }),
    pickerTypes,
  )
}
