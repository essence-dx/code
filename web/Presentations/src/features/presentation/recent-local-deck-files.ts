import {
  ensureFileHandlePermission,
  type FileHandle,
} from "./browser-downloads"

export type RecentLocalDeckFile = {
  id: string
  name: string
  nativePath?: string
  pinned: boolean
  size: number
  lastModified: number
  lastOpenedAt: number
}

export type RecentLocalDeckOpenResult = {
  file: File
  handle: FileHandle
  recent: RecentLocalDeckFile
}

const metadataStorageKey = "essence-powerpoint:recent-local-deck-files"
const databaseName = "essence-powerpoint-local-files"
const storeName = "deck-handles"
const maxRecentDecks = 8
export const recentLocalDeckStaleDays = 30

const dayInMs = 24 * 60 * 60 * 1000

export function recentLocalDeckStaleCutoff(
  now: number | Date = Date.now(),
  staleDays = recentLocalDeckStaleDays,
) {
  const timestamp = typeof now === "number" ? now : now.getTime()

  return timestamp - staleDays * dayInMs
}

export function isStaleRecentLocalDeckFile(
  recent: RecentLocalDeckFile,
  cutoff = recentLocalDeckStaleCutoff(),
) {
  return !recent.pinned && recent.lastOpenedAt < cutoff
}

export function sortRecentLocalDeckFiles(recents: RecentLocalDeckFile[]) {
  return [...recents].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      b.lastOpenedAt - a.lastOpenedAt ||
      a.name.localeCompare(b.name),
  )
}

export function organizeRecentLocalDeckFiles(
  recents: RecentLocalDeckFile[],
  options: {
    query?: string
    now?: number | Date
    staleDays?: number
  } = {},
) {
  const normalizedQuery = options.query?.trim().toLowerCase() ?? ""
  const cutoff = recentLocalDeckStaleCutoff(
    options.now ?? Date.now(),
    options.staleDays ?? recentLocalDeckStaleDays,
  )
  const matchingRecents = sortRecentLocalDeckFiles(recents).filter((recent) =>
    normalizedQuery ? recent.name.toLowerCase().includes(normalizedQuery) : true,
  )
  const pinned = matchingRecents.filter((recent) => recent.pinned)
  const stale = matchingRecents.filter((recent) =>
    isStaleRecentLocalDeckFile(recent, cutoff),
  )
  const recent = matchingRecents.filter(
    (entry) => !entry.pinned && !isStaleRecentLocalDeckFile(entry, cutoff),
  )

  return {
    hiddenMatches: recents.length - matchingRecents.length,
    pinned,
    recent,
    stale,
    totalMatches: matchingRecents.length,
  }
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && "localStorage" in window
}

function canUseIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window
}

function readStoredMetadata(): RecentLocalDeckFile[] {
  if (!canUseLocalStorage()) {
    return []
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(metadataStorageKey) ?? "[]",
    ) as unknown

    if (!Array.isArray(parsed)) {
      return []
    }

    return sortRecentLocalDeckFiles(
      parsed.flatMap((entry): RecentLocalDeckFile[] => {
        const candidate = entry as Partial<RecentLocalDeckFile>
        const id = candidate.id
        const name = candidate.name
        const size = candidate.size
        const lastModified = candidate.lastModified
        const lastOpenedAt = candidate.lastOpenedAt
        const valid =
          typeof id === "string" &&
          typeof name === "string" &&
          typeof size === "number" &&
          typeof lastModified === "number" &&
          typeof lastOpenedAt === "number"

        if (!valid) {
          return []
        }

        return [
          {
            id,
            name,
            nativePath:
              typeof candidate.nativePath === "string"
                ? candidate.nativePath
                : undefined,
            pinned: candidate.pinned === true,
            size,
            lastModified,
            lastOpenedAt,
          },
        ]
      }),
    ).slice(0, maxRecentDecks)
  } catch {
    return []
  }
}

function writeStoredMetadata(recents: RecentLocalDeckFile[]) {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.setItem(
    metadataStorageKey,
    JSON.stringify(sortRecentLocalDeckFiles(recents).slice(0, maxRecentDecks)),
  )
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (!canUseIndexedDb()) {
    return Promise.resolve(null)
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, 1)

    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName)
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

async function withHandleStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const database = await openDatabase()

  if (!database) {
    return null
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode)
    const request = action(transaction.objectStore(storeName))

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => {
      database.close()
      reject(transaction.error)
    }
  })
}

function recentIdForFile(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function recentIdForNativePath(path: string) {
  return `native:${path}`
}

export function readRecentLocalDeckFiles() {
  return readStoredMetadata()
}

export async function rememberRecentLocalDeckFile(input: {
  file: File
  handle: FileHandle
}) {
  const current = readStoredMetadata()
  const existing = current.find(
    (recent) => recent.id === recentIdForFile(input.file),
  )
  const nextRecent: RecentLocalDeckFile = {
    id: recentIdForFile(input.file),
    name: input.file.name,
    pinned: existing?.pinned ?? false,
    size: input.file.size,
    lastModified: input.file.lastModified,
    lastOpenedAt: Date.now(),
  }
  const withoutCurrent = current.filter(
    (recent) => recent.id !== nextRecent.id,
  )
  const recents = sortRecentLocalDeckFiles([
    nextRecent,
    ...withoutCurrent,
  ]).slice(0, maxRecentDecks)

  writeStoredMetadata(recents)

  try {
    await withHandleStore("readwrite", (store) =>
      store.put(input.handle, nextRecent.id),
    )
  } catch {
    // Metadata is still useful when a browser does not allow handle storage.
  }

  return recents
}

export function rememberNativeRecentLocalDeckFile(input: {
  file: File
  nativePath: string
}) {
  const current = readStoredMetadata()
  const id = recentIdForNativePath(input.nativePath)
  const existing = current.find((recent) => recent.id === id)
  const nextRecent: RecentLocalDeckFile = {
    id,
    name: input.file.name,
    nativePath: input.nativePath,
    pinned: existing?.pinned ?? false,
    size: input.file.size,
    lastModified: input.file.lastModified,
    lastOpenedAt: Date.now(),
  }
  const recents = sortRecentLocalDeckFiles([
    nextRecent,
    ...current.filter((recent) => recent.id !== id),
  ]).slice(0, maxRecentDecks)

  writeStoredMetadata(recents)

  return recents
}

export function readRecentLocalDeckFile(id: string) {
  return readStoredMetadata().find((recent) => recent.id === id) ?? null
}

export async function openRecentLocalDeckFile(
  id: string,
): Promise<RecentLocalDeckOpenResult | null> {
  const recent = readStoredMetadata().find((entry) => entry.id === id)

  if (!recent) {
    return null
  }

  const handle = await withHandleStore("readonly", (store) => store.get(id))

  if (!handle) {
    return null
  }

  const fileHandle = handle as FileHandle

  if (!(await ensureFileHandlePermission(fileHandle, "read"))) {
    return null
  }

  const file = await fileHandle.getFile()

  return { file, handle: fileHandle, recent }
}

export async function forgetRecentLocalDeckFile(id: string) {
  const recents = readStoredMetadata().filter((recent) => recent.id !== id)

  writeStoredMetadata(recents)

  try {
    await withHandleStore("readwrite", (store) => store.delete(id))
  } catch {
    // Local metadata is already cleared.
  }

  return recents
}

export async function setRecentLocalDeckFilePinned(
  id: string,
  pinned: boolean,
) {
  const recents = sortRecentLocalDeckFiles(
    readStoredMetadata().map((recent) =>
      recent.id === id ? { ...recent, pinned } : recent,
    ),
  ).slice(0, maxRecentDecks)

  writeStoredMetadata(recents)

  return recents
}

export async function clearStaleRecentLocalDeckFiles(
  now: number | Date = Date.now(),
  staleDays = recentLocalDeckStaleDays,
) {
  const cutoff = recentLocalDeckStaleCutoff(now, staleDays)
  const current = readStoredMetadata()
  const staleIds = current
    .filter((recent) => isStaleRecentLocalDeckFile(recent, cutoff))
    .map((recent) => recent.id)
  const recents = current.filter((recent) => !staleIds.includes(recent.id))

  writeStoredMetadata(recents)

  await Promise.all(
    staleIds.map(async (id) => {
      try {
        await withHandleStore("readwrite", (store) => store.delete(id))
      } catch {
        // Local metadata is already cleared.
      }
    }),
  )

  return recents
}

export async function clearRecentLocalDeckFiles() {
  writeStoredMetadata([])

  try {
    await withHandleStore("readwrite", (store) => store.clear())
  } catch {
    // Local metadata is already cleared.
  }

  return []
}
