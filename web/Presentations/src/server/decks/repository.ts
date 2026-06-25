import { Buffer } from "node:buffer"
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto"

import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm"

import { getDb } from "@/server/db"
import {
  acceptPendingDeckInvitesForUser,
  assertDeckOperationForUser,
} from "@/server/decks/collaborators"
import { decodeDataUrl } from "@/server/storage/data-url"
import {
  deckAssetObjectKey,
  deleteAssetObjects,
  getAssetObject,
  objectStoreEnabled,
  objectStoreMinBytes,
  putAssetObject,
} from "@/server/storage/object-store"
import {
  createCommentMentionNotifications,
  createShareCreatedNotification,
  createShareDeletedNotification,
  createShareUpdatedNotification,
  createShareViewNotification,
  createVersionRestoredNotification,
} from "@/server/notifications/repository"
import {
  deck as deckTable,
  deckAsset as deckAssetTable,
  deckCollaborator as deckCollaboratorTable,
  deckRevision as deckRevisionTable,
  deckShare as deckShareTable,
  deckShareView as deckShareViewTable,
  slide as slideTable,
  user as userTable,
} from "@/server/db/schema"
import type {
  Deck,
  DeckAsset,
  PresentationElement,
  Slide,
  SlideComment,
} from "@/features/presentation/types"
import {
  mergeDeckVersions,
  type DeckMergeConflict,
} from "@/features/presentation/deck-merge"
import { normalizeDeckMaster } from "@/features/presentation/slide-master"

export type DeckSummary = {
  id: string
  accessRole: "owner" | "editor" | "viewer"
  ownerName: string | null
  title: string
  theme: Deck["theme"]
  slideCount: number
  updatedAt: string
}

export type DeckRevisionSource = "autosave" | "manual" | "restore"

export type DeckRevisionSummary = {
  id: string
  deckId: string
  title: string
  theme: Deck["theme"]
  slideCount: number
  source: DeckRevisionSource
  createdAt: string
}

export type DeckSharePermission = "view"

export type DeckShareSummary = {
  id: string
  deckId: string
  token: string
  permission: DeckSharePermission
  enabled: boolean
  expiresAt: string | null
  expired: boolean
  allowDownloads: boolean
  requiresAccessCode: boolean
  viewCount: number
  lastViewedAt: string | null
  createdAt: string
  updatedAt: string
}

export type DeckShareAccessCodePatch = {
  hash: string
  salt: string
}

export type DeckShareViewMetadata = {
  referrer?: string | null
  userAgent?: string | null
}

export type SharedDeckAccess = {
  allowDownloads: boolean
  deck: Deck | null
  requiresAccessCode: boolean
}

export type SharedDeckOpenResult = {
  allowDownloads: boolean
  deck: Deck
}

export type MergeDeckForUserResult =
  | {
      status: "merged"
      deck: Deck
      conflicts: []
      mergedAssets: number
      mergedSlides: number
    }
  | {
      status: "conflict"
      deck: null
      conflicts: DeckMergeConflict[]
      mergedAssets: number
      mergedSlides: number
    }

type SaveDeckOptions = {
  knownUpdatedAt?: string | null
  revisionSource?: DeckRevisionSource
}

type DeckTransaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0]

const AUTOSAVE_REVISION_INTERVAL_MS = 10 * 60 * 1000
const MAX_REVISIONS_PER_DECK = 50
const REMOTE_ASSET_RESPONSE_MIN_BYTES = 512 * 1024

type AssetDeliveryMode = "inline" | "manifest"

type AssetContent = {
  bytes: Buffer
  mimeType: string
  name: string
  sizeBytes: number
}

type PersistedDeckAsset = DeckAsset & {
  storageKey: string | null
  storageProvider: string
}

function ownerAssetContentPath(deckId: string, assetId: string) {
  return `/api/decks/${encodeURIComponent(deckId)}/assets/${encodeURIComponent(
    assetId,
  )}/content`
}

function toIsoDate(value: Date | number | string) {
  return new Date(value).toISOString()
}

function toDate(value: string, fallback: Date) {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp) : fallback
}

function hasRemoteConflict(
  existing: typeof deckTable.$inferSelect | undefined,
  knownUpdatedAt: string | null | undefined,
) {
  if (!existing || !knownUpdatedAt) return false

  const knownTime = Date.parse(knownUpdatedAt)
  if (!Number.isFinite(knownTime)) return false

  return new Date(existing.updatedAt).getTime() > knownTime
}

function rowToSlide(row: typeof slideTable.$inferSelect): Slide {
  return {
    id: row.id,
    title: row.title,
    sectionTitle: row.sectionTitle,
    layout: row.layout as Slide["layout"],
    background: row.background,
    transition: row.transition as Slide["transition"],
    transitionDurationMs: row.transitionDurationMs,
    autoAdvanceAfterMs: row.autoAdvanceAfterMs,
    rehearsalDurationMs: row.rehearsalDurationMs,
    notes: row.notes,
    comments: row.comments as SlideComment[],
    elements: row.elements as PresentationElement[],
  }
}

function rowToAsset(
  row: typeof deckAssetTable.$inferSelect,
  options: {
    deliveryMode?: AssetDeliveryMode
    deckId?: string
  } = {},
): DeckAsset {
  const hasObjectStoreContent = Boolean(row.storageKey)
  const shouldUseRemoteManifest =
    options.deliveryMode === "manifest" &&
    Boolean(options.deckId) &&
    (hasObjectStoreContent || row.sizeBytes >= REMOTE_ASSET_RESPONSE_MIN_BYTES)

  return {
    id: row.id,
    type: row.type as DeckAsset["type"],
    name: row.name,
    mimeType: row.mimeType,
    dataUrl: shouldUseRemoteManifest ? "" : row.dataUrl,
    storage: shouldUseRemoteManifest ? "remote" : "inline",
    remoteUrl: shouldUseRemoteManifest
      ? ownerAssetContentPath(options.deckId ?? "", row.id)
      : "",
    sizeBytes: row.sizeBytes,
    createdAt: toIsoDate(row.createdAt),
  }
}

function rowToRevisionSummary(
  row: typeof deckRevisionTable.$inferSelect,
): DeckRevisionSummary {
  return {
    id: row.id,
    deckId: row.deckId,
    title: row.title,
    theme: row.theme as Deck["theme"],
    slideCount: row.slideCount,
    source: row.source as DeckRevisionSource,
    createdAt: toIsoDate(row.createdAt),
  }
}

function rowToShareSummary(
  row: typeof deckShareTable.$inferSelect,
  activity: {
    lastViewedAt?: Date | number | string | null
    viewCount?: number
  } = {},
): DeckShareSummary {
  return {
    id: row.id,
    deckId: row.deckId,
    token: row.token,
    permission: row.permission as DeckSharePermission,
    enabled: row.enabled,
    expiresAt: row.expiresAt ? toIsoDate(row.expiresAt) : null,
    expired: shareExpired(row),
    allowDownloads: row.allowDownloads,
    requiresAccessCode: shareRequiresAccessCode(row),
    viewCount: activity.viewCount ?? 0,
    lastViewedAt: activity.lastViewedAt
      ? toIsoDate(activity.lastViewedAt)
      : null,
    createdAt: toIsoDate(row.createdAt),
    updatedAt: toIsoDate(row.updatedAt),
  }
}

function deckSnapshot(input: Deck, updatedAt: Date): Deck {
  return {
    id: input.id,
    title: input.title,
    theme: input.theme,
    master: normalizeDeckMaster(input.master),
    assets: input.assets,
    slides: input.slides,
    updatedAt: toIsoDate(updatedAt),
  }
}

function createShareToken() {
  return randomUUID().replaceAll("-", "")
}

function normalizeAccessCode(value: string) {
  return value.trim().toUpperCase()
}

export function generateShareAccessCode() {
  return randomBytes(4).toString("hex").toUpperCase()
}

export function hashShareAccessCode(
  accessCode: string,
): DeckShareAccessCodePatch {
  const salt = randomBytes(16).toString("hex")
  return {
    hash: shareAccessCodeHash(accessCode, salt),
    salt,
  }
}

function shareAccessCodeHash(accessCode: string, salt: string) {
  return createHash("sha256")
    .update(`${salt}:${normalizeAccessCode(accessCode)}`)
    .digest("hex")
}

function cleanShareMetadata(value: string | null | undefined, maxLength: number) {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

function shareExpired(share: { expiresAt: Date | null }) {
  return Boolean(share.expiresAt && share.expiresAt.getTime() <= Date.now())
}

function shareRequiresAccessCode(share: {
  accessCodeHash: string | null
  accessCodeSalt: string | null
}) {
  return Boolean(share.accessCodeHash && share.accessCodeSalt)
}

function sameNullableTime(left: Date | null, right: Date | null) {
  return (left?.getTime() ?? null) === (right?.getTime() ?? null)
}

function shareUpdateLabels(
  share: typeof deckShareTable.$inferSelect,
  nextShare: typeof deckShareTable.$inferSelect,
) {
  const changes: string[] = []

  if (share.enabled !== nextShare.enabled) {
    changes.push(nextShare.enabled ? "link enabled" : "link disabled")
  }
  if (!sameNullableTime(share.expiresAt, nextShare.expiresAt)) {
    if (!nextShare.expiresAt) {
      changes.push("expiry removed")
    } else if (!share.expiresAt) {
      changes.push("expiry added")
    } else {
      changes.push("expiry changed")
    }
  }
  if (share.allowDownloads !== nextShare.allowDownloads) {
    changes.push(
      nextShare.allowDownloads ? "downloads allowed" : "downloads blocked",
    )
  }

  const hadAccessCode = shareRequiresAccessCode(share)
  const hasAccessCode = shareRequiresAccessCode(nextShare)
  if (hadAccessCode !== hasAccessCode) {
    changes.push(hasAccessCode ? "access code required" : "access code removed")
  } else if (
    hasAccessCode &&
    (share.accessCodeHash !== nextShare.accessCodeHash ||
      share.accessCodeSalt !== nextShare.accessCodeSalt)
  ) {
    changes.push("access code changed")
  }

  return changes
}

function shareAccessCodeMatches(
  share: {
    accessCodeHash: string | null
    accessCodeSalt: string | null
  },
  accessCode?: string | null,
) {
  if (!shareRequiresAccessCode(share)) return true

  const normalized = normalizeAccessCode(accessCode ?? "")
  if (!normalized || !share.accessCodeHash || !share.accessCodeSalt) {
    return false
  }

  const expected = Buffer.from(share.accessCodeHash, "hex")
  const actual = Buffer.from(
    shareAccessCodeHash(normalized, share.accessCodeSalt),
    "hex",
  )

  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

async function shareActivityById(
  shareIds: string[],
): Promise<
  Map<string, { lastViewedAt: Date | number | string | null; viewCount: number }>
> {
  if (!shareIds.length) return new Map()

  const rows = await getDb()
    .select({
      shareId: deckShareViewTable.shareId,
      viewCount: count(),
      lastViewedAt: sql<Date | number | string | null>`max(${deckShareViewTable.viewedAt})`,
    })
    .from(deckShareViewTable)
    .where(inArray(deckShareViewTable.shareId, shareIds))
    .groupBy(deckShareViewTable.shareId)

  return new Map(
    rows.map((row) => [
      row.shareId,
      {
        viewCount: row.viewCount,
        lastViewedAt: row.lastViewedAt,
      },
    ]),
  )
}

async function notifyDeckCommentMentions(deck: Deck, actorId: string) {
  for (const slide of deck.slides) {
    for (const comment of slide.comments ?? []) {
      if (comment.resolved || !comment.mentions?.length) continue

      await createCommentMentionNotifications({
        actorId,
        commentBody: comment.body,
        commentId: comment.id,
        deckId: deck.id,
        deckTitle: deck.title,
        mentions: comment.mentions,
        slideTitle: slide.title,
      })
    }
  }
}

async function loadDeckFromRow(
  row: typeof deckTable.$inferSelect,
  options: { assetDeliveryMode?: AssetDeliveryMode } = {},
): Promise<Deck> {
  const db = getDb()
  const slides = await db
    .select()
    .from(slideTable)
    .where(eq(slideTable.deckId, row.id))
    .orderBy(asc(slideTable.position))
  const assets = await db
    .select()
    .from(deckAssetTable)
    .where(eq(deckAssetTable.deckId, row.id))
    .orderBy(asc(deckAssetTable.createdAt))

  return {
    id: row.id,
    title: row.title,
    theme: row.theme as Deck["theme"],
    master: normalizeDeckMaster(row.master),
    assets: assets.map((asset) =>
      rowToAsset(asset, {
        deckId: row.id,
        deliveryMode: options.assetDeliveryMode,
      }),
    ),
    updatedAt: toIsoDate(row.updatedAt),
    slides: slides.map(rowToSlide),
  } satisfies Deck
}

function shouldCreateRevision(
  source: DeckRevisionSource,
  latestRevision: typeof deckRevisionTable.$inferSelect | undefined,
  now: Date,
) {
  if (source === "manual" || source === "restore") return true
  if (!latestRevision) return true

  return (
    now.getTime() - new Date(latestRevision.createdAt).getTime() >=
    AUTOSAVE_REVISION_INTERVAL_MS
  )
}

async function insertDeckRevision(
  tx: DeckTransaction,
  input: Deck,
  userId: string,
  source: DeckRevisionSource,
  now: Date,
) {
  const [latestRevision] = await tx
    .select()
    .from(deckRevisionTable)
    .where(eq(deckRevisionTable.deckId, input.id))
    .orderBy(desc(deckRevisionTable.createdAt))
    .limit(1)

  if (!shouldCreateRevision(source, latestRevision, now)) return

  await tx.insert(deckRevisionTable).values({
    id: randomUUID(),
    deckId: input.id,
    ownerId: userId,
    title: input.title,
    theme: input.theme,
    slideCount: input.slides.length,
    snapshot: deckSnapshot(input, now),
    source,
    createdAt: now,
  })

  const revisions = await tx
    .select({ id: deckRevisionTable.id })
    .from(deckRevisionTable)
    .where(eq(deckRevisionTable.deckId, input.id))
    .orderBy(desc(deckRevisionTable.createdAt))

  const staleIds = revisions
    .slice(MAX_REVISIONS_PER_DECK)
    .map((revision) => revision.id)

  if (staleIds.length) {
    await tx
      .delete(deckRevisionTable)
      .where(inArray(deckRevisionTable.id, staleIds))
  }
}

async function hydrateAssetsForSave(
  deckId: string,
  assets: DeckAsset[],
  hasExistingDeck: boolean,
): Promise<{
  assets: PersistedDeckAsset[]
  staleObjectKeys: string[]
  uploadedObjectKeys: string[]
}> {
  if (!assets.length) {
    return { assets: [], staleObjectKeys: [], uploadedObjectKeys: [] }
  }

  const existingAssets = hasExistingDeck
    ? await getDb()
        .select()
        .from(deckAssetTable)
        .where(eq(deckAssetTable.deckId, deckId))
    : []
  const existingAssetById = new Map(
    existingAssets.map((asset) => [asset.id, asset]),
  )
  const uploadedObjectKeys: string[] = []
  const persistedAssets: PersistedDeckAsset[] = []

  for (const asset of assets) {
    const existingAsset = existingAssetById.get(asset.id)
    const incomingDataUrl = asset.dataUrl || ""
    const existingDataUrl = existingAsset?.dataUrl || ""
    const existingStorageKey = existingAsset?.storageKey ?? null
    const existingStorageProvider = existingAsset?.storageProvider ?? "database"
    const createdAt =
      asset.createdAt || toIsoDate(existingAsset?.createdAt ?? new Date())

    if (!incomingDataUrl && existingStorageKey) {
      persistedAssets.push({
        ...asset,
        dataUrl: "",
        storage: "remote",
        remoteUrl: "",
        mimeType: asset.mimeType || existingAsset?.mimeType || "image/png",
        sizeBytes: asset.sizeBytes || existingAsset?.sizeBytes || 0,
        createdAt,
        storageProvider: existingStorageProvider,
        storageKey: existingStorageKey,
      })
      continue
    }

    const dataUrl = incomingDataUrl || existingDataUrl
    if (!dataUrl) continue

    const decoded = decodeDataUrl(dataUrl)
    const mimeType =
      asset.mimeType ||
      existingAsset?.mimeType ||
      decoded?.mimeType ||
      "image/png"
    const sizeBytes =
      asset.sizeBytes ||
      existingAsset?.sizeBytes ||
      decoded?.bytes.byteLength ||
      dataUrl.length

    if (decoded && objectStoreEnabled() && sizeBytes >= objectStoreMinBytes()) {
      const storageKey =
        existingStorageKey ?? deckAssetObjectKey({ assetId: asset.id, deckId })

      await putAssetObject({
        bytes: decoded.bytes,
        key: storageKey,
        mimeType,
      })
      if (!existingStorageKey) {
        uploadedObjectKeys.push(storageKey)
      }
      persistedAssets.push({
        ...asset,
        dataUrl: "",
        storage: "remote",
        remoteUrl: "",
        mimeType,
        sizeBytes,
        createdAt,
        storageProvider: "s3",
        storageKey,
      })
      continue
    }

    persistedAssets.push({
      ...asset,
      dataUrl,
      storage: "inline",
      remoteUrl: "",
      mimeType,
      sizeBytes,
      createdAt,
      storageProvider: "database",
      storageKey: null,
    })
  }

  const nextObjectKeys = new Set(
    persistedAssets
      .map((asset) => asset.storageKey)
      .filter((key): key is string => Boolean(key)),
  )
  const staleObjectKeys = existingAssets
    .map((asset) => asset.storageKey)
    .filter(
      (key): key is string =>
        typeof key === "string" && key.length > 0 && !nextObjectKeys.has(key),
    )

  return { assets: persistedAssets, staleObjectKeys, uploadedObjectKeys }
}

export async function listDecksForUser(userId: string): Promise<DeckSummary[]> {
  const db = getDb()
  const [currentUser] = await db
    .select({ email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1)

  if (currentUser?.email) {
    await acceptPendingDeckInvitesForUser(userId, currentUser.email)
  }

  const [ownedDecks, collaboratedDecks, counts] = await Promise.all([
    db
      .select()
      .from(deckTable)
      .where(eq(deckTable.ownerId, userId))
      .orderBy(desc(deckTable.updatedAt)),
    db
      .select({
        id: deckTable.id,
        title: deckTable.title,
        theme: deckTable.theme,
        updatedAt: deckTable.updatedAt,
        role: deckCollaboratorTable.role,
        ownerName: userTable.name,
      })
      .from(deckCollaboratorTable)
      .innerJoin(deckTable, eq(deckCollaboratorTable.deckId, deckTable.id))
      .leftJoin(userTable, eq(deckTable.ownerId, userTable.id))
      .where(eq(deckCollaboratorTable.userId, userId))
      .orderBy(desc(deckTable.updatedAt)),
    db
      .select({
        deckId: slideTable.deckId,
        value: count(),
      })
      .from(slideTable)
      .groupBy(slideTable.deckId),
  ])

  const countByDeck = new Map(counts.map((item) => [item.deckId, item.value]))

  const summaries = [
    ...ownedDecks.map((deck) => ({
      id: deck.id,
      accessRole: "owner" as const,
      ownerName: null,
      title: deck.title,
      theme: deck.theme as Deck["theme"],
      slideCount: countByDeck.get(deck.id) ?? 0,
      updatedAt: toIsoDate(deck.updatedAt),
    })),
    ...collaboratedDecks.map((deck) => ({
      id: deck.id,
      accessRole: deck.role === "editor" ? ("editor" as const) : ("viewer" as const),
      ownerName: deck.ownerName,
      title: deck.title,
      theme: deck.theme as Deck["theme"],
      slideCount: countByDeck.get(deck.id) ?? 0,
      updatedAt: toIsoDate(deck.updatedAt),
    })),
  ]

  return summaries.sort(
    (first, second) =>
      Date.parse(second.updatedAt) - Date.parse(first.updatedAt),
  )
}

export async function getDeckForUser(deckId: string, userId: string) {
  const db = getDb()
  const [deck] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, deckId))
    .limit(1)

  if (!deck) {
    return null
  }

  await assertDeckOperationForUser(deck, userId, "read")
  return loadDeckFromRow(deck, { assetDeliveryMode: "manifest" })
}

export async function getDeckAssetContentForUser(
  deckId: string,
  assetId: string,
  userId: string,
): Promise<AssetContent | null> {
  const db = getDb()
  const [deck] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, deckId))
    .limit(1)

  if (!deck) {
    return null
  }

  await assertDeckOperationForUser(deck, userId, "read")

  const [asset] = await db
    .select()
    .from(deckAssetTable)
    .where(and(eq(deckAssetTable.id, assetId), eq(deckAssetTable.deckId, deckId)))
    .limit(1)

  if (!asset) {
    return null
  }

  if (asset.storageKey) {
    const stored = await getAssetObject({
      key: asset.storageKey,
      mimeType: asset.mimeType,
    })

    if (!stored) return null

    return {
      bytes: stored.bytes,
      mimeType: stored.mimeType,
      name: asset.name,
      sizeBytes: asset.sizeBytes || stored.bytes.byteLength,
    }
  }

  const decoded = decodeDataUrl(asset.dataUrl)
  if (!decoded) {
    return null
  }

  return {
    bytes: decoded.bytes,
    mimeType: asset.mimeType,
    name: asset.name,
    sizeBytes: asset.sizeBytes,
  }
}

export async function listDeckRevisionsForUser(deckId: string, userId: string) {
  const db = getDb()
  const [deck] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, deckId))
    .limit(1)

  if (!deck) {
    return null
  }

  await assertDeckOperationForUser(deck, userId, "read")

  const revisions = await db
    .select()
    .from(deckRevisionTable)
    .where(eq(deckRevisionTable.deckId, deckId))
    .orderBy(desc(deckRevisionTable.createdAt))
    .limit(MAX_REVISIONS_PER_DECK)

  return revisions.map(rowToRevisionSummary)
}

export async function getDeckRevisionSnapshotForUser(
  deckId: string,
  revisionId: string,
  userId: string,
) {
  const db = getDb()
  const [deck] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, deckId))
    .limit(1)

  if (!deck) {
    return null
  }

  await assertDeckOperationForUser(deck, userId, "read")

  const [revision] = await db
    .select()
    .from(deckRevisionTable)
    .where(
      and(
        eq(deckRevisionTable.id, revisionId),
        eq(deckRevisionTable.deckId, deckId),
      ),
    )
    .limit(1)

  if (!revision) {
    return null
  }

  const snapshot = revision.snapshot as Deck

  return {
    ...snapshot,
    id: deckId,
    updatedAt: toIsoDate(revision.createdAt),
  } satisfies Deck
}

export async function saveDeckForUser(
  input: Deck,
  userId: string,
  options: SaveDeckOptions = {},
) {
  const db = getDb()
  const now = new Date()
  const [existing] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, input.id))
    .limit(1)

  if (existing) {
    await assertDeckOperationForUser(existing, userId, "save")
  }
  if (hasRemoteConflict(existing, options.knownUpdatedAt)) {
    throw new Error("conflict")
  }

  const revisionSource = options.revisionSource ?? "manual"
  const hydratedAssets = await hydrateAssetsForSave(
    input.id,
    input.assets,
    Boolean(existing),
  )
  const deckForPersistence = {
    ...input,
    assets: hydratedAssets.assets,
  }

  try {
    await db.transaction(async (tx) => {
      if (existing) {
        await tx
          .update(deckTable)
          .set({
            title: input.title,
            theme: input.theme,
            master: normalizeDeckMaster(input.master),
            updatedAt: now,
          })
          .where(eq(deckTable.id, input.id))
        await tx.delete(slideTable).where(eq(slideTable.deckId, input.id))
        await tx.delete(deckAssetTable).where(eq(deckAssetTable.deckId, input.id))
      } else {
        await tx.insert(deckTable).values({
          id: input.id,
          ownerId: userId,
          title: input.title,
          theme: input.theme,
          master: normalizeDeckMaster(input.master),
          createdAt: now,
          updatedAt: now,
        })
      }

      if (deckForPersistence.assets.length) {
        await tx.insert(deckAssetTable).values(
          deckForPersistence.assets.map((asset) => ({
            id: asset.id,
            deckId: input.id,
            type: asset.type,
            name: asset.name,
            mimeType: asset.mimeType,
            dataUrl: asset.dataUrl,
            storageProvider: asset.storageProvider,
            storageKey: asset.storageKey,
            sizeBytes: asset.sizeBytes,
            createdAt: toDate(asset.createdAt, now),
            updatedAt: now,
          })),
        )
      }

      if (input.slides.length) {
        await tx.insert(slideTable).values(
          input.slides.map((slide, position) => ({
            id: slide.id,
            deckId: input.id,
            position,
            title: slide.title,
            sectionTitle: slide.sectionTitle ?? "",
            layout: slide.layout,
            background: slide.background,
            transition: slide.transition,
            transitionDurationMs: slide.transitionDurationMs,
            autoAdvanceAfterMs: slide.autoAdvanceAfterMs,
            rehearsalDurationMs: slide.rehearsalDurationMs,
            elements: slide.elements,
            comments: slide.comments,
            notes: slide.notes,
            createdAt: now,
            updatedAt: now,
          })),
        )
      }

      await insertDeckRevision(tx, deckForPersistence, userId, revisionSource, now)
    })
  } catch (error) {
    await deleteAssetObjects(hydratedAssets.uploadedObjectKeys)
    throw error
  }

  await deleteAssetObjects(hydratedAssets.staleObjectKeys)

  const savedDeck = await getDeckForUser(input.id, userId)
  if (savedDeck) {
    await notifyDeckCommentMentions(savedDeck, userId)
  }

  return savedDeck
}

export async function mergeDeckForUser(input: {
  baseDeck: Deck
  deckId: string
  localDeck: Deck
  userId: string
}): Promise<MergeDeckForUserResult | null> {
  if (input.baseDeck.id !== input.deckId || input.localDeck.id !== input.deckId) {
    throw new Error("invalid-merge")
  }

  const db = getDb()
  const [deck] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, input.deckId))
    .limit(1)

  if (!deck) {
    return null
  }

  await assertDeckOperationForUser(deck, input.userId, "merge")
  const cloudDeck = await loadDeckFromRow(deck, { assetDeliveryMode: "manifest" })

  const result = mergeDeckVersions({
    baseDeck: input.baseDeck,
    cloudDeck,
    localDeck: input.localDeck,
  })

  if (result.status === "conflict") {
    return result
  }

  const savedDeck = await saveDeckForUser(result.deck, input.userId, {
    knownUpdatedAt: cloudDeck.updatedAt,
    revisionSource: "manual",
  })

  if (!savedDeck) {
    return null
  }

  return {
    ...result,
    deck: savedDeck,
  }
}

export async function restoreDeckRevisionForUser(
  deckId: string,
  revisionId: string,
  userId: string,
) {
  const db = getDb()
  const [deck] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, deckId))
    .limit(1)

  if (!deck) {
    return null
  }

  await assertDeckOperationForUser(deck, userId, "restore")

  const [revision] = await db
    .select()
    .from(deckRevisionTable)
    .where(
      and(
        eq(deckRevisionTable.id, revisionId),
        eq(deckRevisionTable.deckId, deckId),
      ),
    )
    .limit(1)

  if (!revision) {
    return null
  }

  const snapshot = revision.snapshot as Deck

  const restored = await saveDeckForUser(
    {
      ...snapshot,
      id: deckId,
      updatedAt: toIsoDate(new Date()),
    },
    userId,
    {
      revisionSource: "restore",
    },
  )

  if (restored) {
    await createVersionRestoredNotification({
      deckId,
      deckTitle: restored.title,
      ownerId: userId,
      revisionId,
      revisionTitle: revision.title,
    })
  }

  return restored
}

export async function listDeckSharesForUser(deckId: string, userId: string) {
  const db = getDb()
  const [deck] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, deckId))
    .limit(1)

  if (!deck) {
    return null
  }

  await assertDeckOperationForUser(deck, userId, "share")

  const shares = await db
    .select()
    .from(deckShareTable)
    .where(eq(deckShareTable.deckId, deckId))
    .orderBy(desc(deckShareTable.createdAt))
  const activityByShareId = await shareActivityById(
    shares.map((share) => share.id),
  )

  return shares.map((share) =>
    rowToShareSummary(share, activityByShareId.get(share.id)),
  )
}

export async function createDeckShareForUser(deckId: string, userId: string) {
  const db = getDb()
  const [deck] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, deckId))
    .limit(1)

  if (!deck) {
    return null
  }

  await assertDeckOperationForUser(deck, userId, "share")

  const enabledShares = await db
    .select()
    .from(deckShareTable)
    .where(
      and(
        eq(deckShareTable.deckId, deckId),
        eq(deckShareTable.ownerId, userId),
        eq(deckShareTable.enabled, true),
      ),
    )
    .orderBy(desc(deckShareTable.createdAt))
  const existing = enabledShares.find((share) => !shareExpired(share))

  if (existing) {
    const activityByShareId = await shareActivityById([existing.id])
    return rowToShareSummary(existing, activityByShareId.get(existing.id))
  }

  const now = new Date()
  const share = {
    id: randomUUID(),
    deckId,
    ownerId: userId,
    token: createShareToken(),
    permission: "view" satisfies DeckSharePermission,
    enabled: true,
    expiresAt: null,
    accessCodeHash: null,
    accessCodeSalt: null,
    allowDownloads: true,
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(deckShareTable).values(share)
  await createShareCreatedNotification({
    deckId,
    deckTitle: deck.title,
    ownerId: userId,
    shareId: share.id,
    shareToken: share.token,
  })

  return rowToShareSummary(share)
}

export async function updateDeckShareForUser(
  shareId: string,
  userId: string,
  patch: {
    enabled?: boolean
    expiresAt?: Date | null
    accessCode?: DeckShareAccessCodePatch | null
    allowDownloads?: boolean
  },
) {
  const db = getDb()
  const [share] = await db
    .select()
    .from(deckShareTable)
    .where(eq(deckShareTable.id, shareId))
    .limit(1)

  if (!share) {
    return null
  }

  const [deck] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, share.deckId))
    .limit(1)

  if (!deck) {
    return null
  }

  await assertDeckOperationForUser(deck, userId, "share")

  const nextShare = {
    ...share,
    enabled: patch.enabled ?? share.enabled,
    expiresAt:
      patch.expiresAt === undefined ? share.expiresAt : patch.expiresAt,
    accessCodeHash:
      patch.accessCode === undefined
        ? share.accessCodeHash
        : patch.accessCode?.hash ?? null,
    accessCodeSalt:
      patch.accessCode === undefined
        ? share.accessCodeSalt
        : patch.accessCode?.salt ?? null,
    allowDownloads: patch.allowDownloads ?? share.allowDownloads,
    updatedAt: new Date(),
  }

  await db
    .update(deckShareTable)
    .set({
      enabled: nextShare.enabled,
      expiresAt: nextShare.expiresAt,
      accessCodeHash: nextShare.accessCodeHash,
      accessCodeSalt: nextShare.accessCodeSalt,
      allowDownloads: nextShare.allowDownloads,
      updatedAt: nextShare.updatedAt,
    })
    .where(eq(deckShareTable.id, shareId))

  await createShareUpdatedNotification({
    changes: shareUpdateLabels(share, nextShare),
    deckId: deck.id,
    deckTitle: deck.title,
    ownerId: userId,
    shareId,
    shareToken: nextShare.token,
  })

  const activityByShareId = await shareActivityById([shareId])
  return rowToShareSummary(nextShare, activityByShareId.get(shareId))
}

export async function deleteDeckShareForUser(shareId: string, userId: string) {
  const db = getDb()
  const [share] = await db
    .select()
    .from(deckShareTable)
    .where(eq(deckShareTable.id, shareId))
    .limit(1)

  if (!share) {
    return false
  }

  const [deck] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, share.deckId))
    .limit(1)

  if (!deck) {
    return false
  }

  await assertDeckOperationForUser(deck, userId, "share")

  await db.delete(deckShareTable).where(eq(deckShareTable.id, shareId))
  await createShareDeletedNotification({
    deckId: deck.id,
    deckTitle: deck.title,
    ownerId: userId,
    shareId,
  })

  return true
}

export async function getSharedDeckByToken(token: string) {
  const db = getDb()
  const [share] = await db
    .select()
    .from(deckShareTable)
    .where(and(eq(deckShareTable.token, token), eq(deckShareTable.enabled, true)))
    .limit(1)

  if (!share) {
    return null
  }
  if (shareExpired(share)) {
    return null
  }
  if (shareRequiresAccessCode(share)) {
    return null
  }

  const [deck] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, share.deckId))
    .limit(1)

  if (!deck) {
    return null
  }

  return loadDeckFromRow(deck)
}

export async function getSharedDeckAccessByToken(
  token: string,
): Promise<SharedDeckAccess | null> {
  const db = getDb()
  const [share] = await db
    .select()
    .from(deckShareTable)
    .where(and(eq(deckShareTable.token, token), eq(deckShareTable.enabled, true)))
    .limit(1)

  if (!share || shareExpired(share)) {
    return null
  }

  const [deck] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, share.deckId))
    .limit(1)

  if (!deck) {
    return null
  }

  if (shareRequiresAccessCode(share)) {
    return {
      allowDownloads: share.allowDownloads,
      deck: null,
      requiresAccessCode: true,
    }
  }

  return {
    allowDownloads: share.allowDownloads,
    deck: await loadDeckFromRow(deck),
    requiresAccessCode: false,
  }
}

export async function openSharedDeckByToken(
  token: string,
  metadata: DeckShareViewMetadata = {},
  accessCode?: string | null,
): Promise<SharedDeckOpenResult | null> {
  const db = getDb()
  const [share] = await db
    .select()
    .from(deckShareTable)
    .where(and(eq(deckShareTable.token, token), eq(deckShareTable.enabled, true)))
    .limit(1)

  if (!share) {
    return null
  }
  if (shareExpired(share)) {
    return null
  }
  if (!shareAccessCodeMatches(share, accessCode)) {
    return null
  }

  const [deck] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, share.deckId))
    .limit(1)

  if (!deck) {
    return null
  }

  await db.insert(deckShareViewTable).values({
    id: randomUUID(),
    deckId: deck.id,
    shareId: share.id,
    userAgent: cleanShareMetadata(metadata.userAgent, 500),
    referrer: cleanShareMetadata(metadata.referrer, 300),
    viewedAt: new Date(),
  })
  await createShareViewNotification({
    deckId: deck.id,
    deckTitle: deck.title,
    ownerId: deck.ownerId,
    shareId: share.id,
    shareToken: share.token,
  })

  return {
    allowDownloads: share.allowDownloads,
    deck: await loadDeckFromRow(deck),
  }
}

export async function deleteDeckForUser(deckId: string, userId: string) {
  const db = getDb()
  const [existing] = await db
    .select()
    .from(deckTable)
    .where(eq(deckTable.id, deckId))
    .limit(1)

  if (!existing) {
    return false
  }

  await assertDeckOperationForUser(existing, userId, "delete")
  await db.delete(deckTable).where(eq(deckTable.id, deckId))
  return true
}
