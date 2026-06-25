import { getAssetStorageProvider } from "@/server/env"
import { getDb } from "@/server/db"
import {
  account,
  deck,
  deckAsset,
  deckCollaborator,
  deckCollaboratorInvite,
  deckRevision,
  deckShare,
  deckShareView,
  session,
  slide,
  user,
} from "@/server/db/schema"
import {
  objectStoreEnabled,
  objectStoreMinBytes,
} from "@/server/storage/object-store"
import type { CloudDataHealthSnapshot } from "@/features/presentation/cloud-data-health"
import type { ProductionDataOperationsSnapshot } from "@/features/presentation/production-data-operations"

type ProductionDataSnapshots = {
  cloudData: CloudDataHealthSnapshot
  operations: ProductionDataOperationsSnapshot
}

function revisionsPastRetention(
  revisions: Array<{ createdAt: Date; deckId: string }>,
  maxPerDeck = 50,
) {
  const revisionsByDeck = new Map<string, Array<{ createdAt: Date }>>()

  for (const revision of revisions) {
    revisionsByDeck.set(revision.deckId, [
      ...(revisionsByDeck.get(revision.deckId) ?? []),
      revision,
    ])
  }

  return Array.from(revisionsByDeck.values()).reduce((total, deckRevisions) => {
    const sorted = [...deckRevisions].sort(
      (first, second) => second.createdAt.getTime() - first.createdAt.getTime(),
    )

    return total + Math.max(0, sorted.length - maxPerDeck)
  }, 0)
}

export async function readProductionDataSnapshots(): Promise<ProductionDataSnapshots> {
  const db = getDb()
  const [
    users,
    accounts,
    decks,
    slides,
    revisions,
    shares,
    collaborators,
    invites,
    sessions,
    assets,
    shareViews,
  ] = await Promise.all([
    db.select().from(user),
    db.select().from(account),
    db.select().from(deck),
    db.select().from(slide),
    db.select().from(deckRevision),
    db.select().from(deckShare),
    db.select().from(deckCollaborator),
    db.select().from(deckCollaboratorInvite),
    db.select().from(session),
    db.select().from(deckAsset),
    db.select().from(deckShareView),
  ])
  const now = Date.now()
  const shareViewRetentionCutoff = now - 90 * 24 * 60 * 60 * 1000
  const deckIds = new Set(decks.map((item) => item.id))
  const userIds = new Set(users.map((item) => item.id))
  const slideDeckIds = new Set(slides.map((item) => item.deckId))
  const enabledShares = shares.filter((item) => item.enabled)
  const expiredEnabledShares = enabledShares.filter(
    (item) => item.expiresAt && item.expiresAt.getTime() <= now,
  ).length
  const orphanDecks = decks.filter((item) => !item.ownerId).length
  const orphanCollaborators = collaborators.filter(
    (item) => !deckIds.has(item.deckId) || !userIds.has(item.userId),
  ).length
  const databaseAssets = assets.filter(
    (item) => item.storageProvider === "database",
  )
  const remoteAssets = assets.filter(
    (item) => item.storageProvider !== "database",
  )
  const storageMinBytes = objectStoreMinBytes()
  const finiteStorageMinBytes = Number.isFinite(storageMinBytes)
    ? storageMinBytes
    : 512 * 1024
  const verifiedAdmins = users.filter(
    (item) => item.role === "admin" && item.emailVerified,
  ).length
  const credentialAccounts = accounts.filter(
    (item) => item.providerId === "credential" && item.password,
  ).length
  const pendingInvites = invites.filter((item) => item.status === "pending")
    .length

  return {
    cloudData: {
      activeSessions: sessions.length,
      admins: users.filter((item) => item.role === "admin").length,
      bannedAdmins: users.filter((item) => item.role === "admin" && item.banned)
        .length,
      credentialAccounts,
      databaseReachable: true,
      decks: decks.length,
      decksWithoutSlides: decks.filter((item) => !slideDeckIds.has(item.id))
        .length,
      enabledShares: enabledShares.length,
      expiredEnabledShares,
      orphanCollaborators,
      orphanDecks,
      pendingInvites,
      revisions: revisions.length,
      slides: slides.length,
      users: users.length,
      verifiedAdmins,
      verifiedUsers: users.filter((item) => item.emailVerified).length,
    },
    operations: {
      activeSessions: sessions.length,
      admins: users.filter((item) => item.role === "admin").length,
      credentialAccounts,
      databaseAssetBytes: databaseAssets.reduce(
        (total, item) => total + item.sizeBytes,
        0,
      ),
      databaseAssets: databaseAssets.length,
      databaseReachable: true,
      deckAssets: assets.length,
      decks: decks.length,
      decksWithoutSlides: decks.filter((item) => !slideDeckIds.has(item.id))
        .length,
      enabledShares: enabledShares.length,
      expiredEnabledShares,
      expiredSessions: sessions.filter((item) => item.expiresAt.getTime() <= now)
        .length,
      objectStorageEnabled: objectStoreEnabled(),
      objectStorageMinBytes: finiteStorageMinBytes,
      objectStorageProvider: getAssetStorageProvider(),
      orphanCollaborators,
      orphanDecks,
      oversizedDatabaseAssets: databaseAssets.filter(
        (item) => item.sizeBytes >= finiteStorageMinBytes,
      ).length,
      pendingInvites,
      remoteAssets: remoteAssets.length,
      remoteAssetsMissingKeys: remoteAssets.filter((item) => !item.storageKey)
        .length,
      remoteAssetsWithInlinePayload: remoteAssets.filter((item) => item.dataUrl)
        .length,
      revisions: revisions.length,
      revisionsPastRetention: revisionsPastRetention(revisions),
      staleShareViews: shareViews.filter(
        (item) => item.viewedAt.getTime() <= shareViewRetentionCutoff,
      ).length,
      verifiedAdmins,
    },
  }
}
