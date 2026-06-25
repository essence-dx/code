export type ProductionDataOperationStatus =
  | "attention"
  | "blocked"
  | "ready"

export type ProductionDataOperationsSnapshot = {
  activeSessions?: number
  admins?: number
  credentialAccounts?: number
  databaseAssetBytes?: number
  databaseAssets?: number
  databaseReachable: boolean
  deckAssets?: number
  decks?: number
  decksWithoutSlides?: number
  enabledShares?: number
  expiredEnabledShares?: number
  expiredSessions?: number
  objectStorageEnabled?: boolean
  objectStorageMinBytes?: number
  objectStorageProvider?: string
  orphanCollaborators?: number
  orphanDecks?: number
  oversizedDatabaseAssets?: number
  pendingInvites?: number
  remoteAssets?: number
  remoteAssetsMissingKeys?: number
  remoteAssetsWithInlinePayload?: number
  revisions?: number
  revisionsPastRetention?: number
  staleShareViews?: number
  verifiedAdmins?: number
}

export type ProductionDataOperation = {
  affectedCount: number
  detail: string
  id: string
  label: string
  ownerVisible: boolean
  remediation: string
  runbook: string
  status: ProductionDataOperationStatus
}

export type ProductionDataOperationsReport = {
  operations: ProductionDataOperation[]
  readyCount: number
  snapshot: ProductionDataOperationsSnapshot
  status: ProductionDataOperationStatus
  summary: string
  totalCount: number
}

function countValue(value: number | undefined) {
  return Number.isFinite(value) ? value ?? 0 : 0
}

function combineStatuses(
  statuses: ProductionDataOperationStatus[],
): ProductionDataOperationStatus {
  if (statuses.includes("blocked")) return "blocked"
  if (statuses.includes("attention")) return "attention"
  return "ready"
}

function operation(
  operations: ProductionDataOperation[],
  input: ProductionDataOperation,
) {
  operations.push(input)
}

export function productionDataOperationsReport(
  snapshot: ProductionDataOperationsSnapshot,
): ProductionDataOperationsReport {
  const operations: ProductionDataOperation[] = []
  const admins = countValue(snapshot.admins)
  const verifiedAdmins = countValue(snapshot.verifiedAdmins)
  const credentialAccounts = countValue(snapshot.credentialAccounts)
  const decks = countValue(snapshot.decks)
  const decksWithoutSlides = countValue(snapshot.decksWithoutSlides)
  const revisions = countValue(snapshot.revisions)
  const expiredEnabledShares = countValue(snapshot.expiredEnabledShares)
  const orphanDecks = countValue(snapshot.orphanDecks)
  const orphanCollaborators = countValue(snapshot.orphanCollaborators)
  const oversizedDatabaseAssets = countValue(snapshot.oversizedDatabaseAssets)
  const remoteAssetsMissingKeys = countValue(snapshot.remoteAssetsMissingKeys)
  const remoteAssetsWithInlinePayload = countValue(
    snapshot.remoteAssetsWithInlinePayload,
  )
  const staleShareViews = countValue(snapshot.staleShareViews)
  const revisionsPastRetention = countValue(snapshot.revisionsPastRetention)
  const expiredSessions = countValue(snapshot.expiredSessions)

  operation(operations, {
    affectedCount:
      admins > 0 && verifiedAdmins > 0 && credentialAccounts > 0 ? 0 : 1,
    detail:
      admins > 0 && verifiedAdmins > 0 && credentialAccounts > 0
        ? "A verified admin credential path is present for support and smoke setup."
        : "Release setup needs a verified admin account with an email/password credential.",
    id: "seeded-admin-fixture",
    label: "Seeded admin fixture",
    ownerVisible: false,
    remediation:
      "Run the seeded admin workflow, verify the account email, and keep credentials in environment variables only.",
    runbook: "bun run db:seed-admin",
    status:
      admins > 0 && verifiedAdmins > 0 && credentialAccounts > 0
        ? "ready"
        : "blocked",
  })

  operation(operations, {
    affectedCount:
      decks === 0 ? 1 : decksWithoutSlides > 0 ? decksWithoutSlides : 0,
    detail:
      decks === 0
        ? "No persisted deck is available as a mutation-safe smoke fixture."
        : decksWithoutSlides === 0 && revisions >= decks
          ? `${decks} deck(s) have slides and revision coverage for fixture reset.`
          : `${decksWithoutSlides} deck(s) need slide content or revision coverage before fixture use.`,
    id: "smoke-deck-fixture",
    label: "Smoke deck fixture",
    ownerVisible: true,
    remediation:
      "Create or select a real deck fixture, keep a resettable revision, and point smoke env vars at that deck.",
    runbook:
      "Set PRESENTATION_SMOKE_FIXTURE_DECK_ID after saving a mutation-safe deck.",
    status:
      decks === 0
        ? "attention"
        : decksWithoutSlides === 0 && revisions >= decks
          ? "ready"
          : "blocked",
  })

  operation(operations, {
    affectedCount: expiredEnabledShares,
    detail:
      expiredEnabledShares === 0
        ? `${countValue(snapshot.enabledShares)} enabled share link(s) have valid expiry state.`
        : `${expiredEnabledShares} expired share link(s) are still enabled.`,
    id: "disable-expired-shares",
    label: "Disable expired shares",
    ownerVisible: true,
    remediation:
      "Disable expired links through the owner/admin share controls before public smoke runs.",
    runbook:
      "Open the deck share panel or admin deck review, disable expired links, then rerun production health.",
    status: expiredEnabledShares === 0 ? "ready" : "attention",
  })

  operation(operations, {
    affectedCount: orphanDecks + orphanCollaborators,
    detail:
      orphanDecks === 0 && orphanCollaborators === 0
        ? "Deck ownership and collaborator references are internally consistent."
        : `${orphanDecks} orphan deck(s) and ${orphanCollaborators} orphan collaborator row(s) need review.`,
    id: "orphan-record-review",
    label: "Orphan record review",
    ownerVisible: false,
    remediation:
      "Export affected ids, reassign ownership where possible, and delete only after an owner-approved review.",
    runbook:
      "Use admin deck/user tables plus a database backup before applying ownership or deletion fixes.",
    status:
      orphanDecks === 0 && orphanCollaborators === 0 ? "ready" : "blocked",
  })

  operation(operations, {
    affectedCount:
      oversizedDatabaseAssets +
      remoteAssetsMissingKeys +
      remoteAssetsWithInlinePayload,
    detail:
      remoteAssetsMissingKeys > 0
        ? `${remoteAssetsMissingKeys} remote asset(s) are missing storage keys.`
        : oversizedDatabaseAssets > 0
          ? `${oversizedDatabaseAssets} large asset(s) remain in database storage.`
          : `${countValue(snapshot.deckAssets)} asset row(s) are compatible with the configured storage policy.`,
    id: "asset-storage-hygiene",
    label: "Asset storage hygiene",
    ownerVisible: true,
    remediation:
      "Repair missing remote keys and move large image payloads into object storage when the provider is configured.",
    runbook: snapshot.objectStorageEnabled
      ? `Object storage is enabled${
          snapshot.objectStorageProvider
            ? ` through ${snapshot.objectStorageProvider}`
            : ""
        }; resave affected decks to rehydrate asset objects.`
      : "Configure ASSET_STORAGE_PROVIDER and related object-storage env vars before moving large assets out of the database.",
    status:
      remoteAssetsMissingKeys > 0
        ? "blocked"
        : oversizedDatabaseAssets > 0 || remoteAssetsWithInlinePayload > 0
          ? "attention"
          : "ready",
  })

  operation(operations, {
    affectedCount: staleShareViews + revisionsPastRetention + expiredSessions,
    detail:
      staleShareViews === 0 &&
      revisionsPastRetention === 0 &&
      expiredSessions === 0
        ? "Share analytics, deck revisions, and sessions are inside retention limits."
        : `${staleShareViews} stale share view(s), ${revisionsPastRetention} excess revision row(s), and ${expiredSessions} expired session(s) are ready for cleanup review.`,
    id: "retention-cleanup",
    label: "Retention cleanup",
    ownerVisible: false,
    remediation:
      "Apply retention cleanup from a backup-aware maintenance task; keep recent revisions and active sessions intact.",
    runbook:
      "Review stale share views older than 90 days, revisions beyond 50 per deck, and expired sessions before deletion.",
    status:
      staleShareViews === 0 &&
      revisionsPastRetention === 0 &&
      expiredSessions === 0
        ? "ready"
        : "attention",
  })

  const readyCount = operations.filter(
    (item) => item.status === "ready",
  ).length

  return {
    operations,
    readyCount,
    snapshot,
    status: snapshot.databaseReachable
      ? combineStatuses(operations.map((item) => item.status))
      : "blocked",
    summary: `${readyCount} of ${operations.length} production data operations are ready.`,
    totalCount: operations.length,
  }
}

export function serializeProductionDataOperationsReport(
  report: ProductionDataOperationsReport,
) {
  return [
    `Production data operations: ${report.summary} Status: ${report.status}.`,
    ...report.operations.map(
      (operation) =>
        `- ${operation.label}: ${operation.status}. ${operation.detail} Remediation: ${operation.remediation} Runbook: ${operation.runbook}`,
    ),
  ].join("\n")
}
