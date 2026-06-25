export type CloudDataHealthStatus = "attention" | "blocked" | "ready"

export type CloudDataHealthSnapshot = {
  activeSessions?: number
  admins?: number
  bannedAdmins?: number
  credentialAccounts?: number
  databaseError?: string
  databaseReachable: boolean
  decks?: number
  decksWithoutSlides?: number
  enabledShares?: number
  expiredEnabledShares?: number
  orphanCollaborators?: number
  orphanDecks?: number
  pendingInvites?: number
  revisions?: number
  slides?: number
  users?: number
  verifiedAdmins?: number
  verifiedUsers?: number
}

export type CloudDataHealthCheck = {
  detail: string
  id: string
  label: string
  status: CloudDataHealthStatus
}

export type CloudDataHealthReport = {
  checks: CloudDataHealthCheck[]
  readyCount: number
  snapshot: CloudDataHealthSnapshot
  status: CloudDataHealthStatus
  summary: string
  totalCount: number
}

function combineStatuses(
  statuses: CloudDataHealthStatus[],
): CloudDataHealthStatus {
  if (statuses.includes("blocked")) return "blocked"
  if (statuses.includes("attention")) return "attention"
  return "ready"
}

function check(
  checks: CloudDataHealthCheck[],
  id: string,
  label: string,
  status: CloudDataHealthStatus,
  detail: string,
) {
  checks.push({ detail, id, label, status })
}

function countValue(value: number | undefined) {
  return Number.isFinite(value) ? value ?? 0 : 0
}

export function cloudDataHealthReport(
  snapshot: CloudDataHealthSnapshot,
): CloudDataHealthReport {
  const checks: CloudDataHealthCheck[] = []
  const users = countValue(snapshot.users)
  const admins = countValue(snapshot.admins)
  const verifiedAdmins = countValue(snapshot.verifiedAdmins)
  const credentialAccounts = countValue(snapshot.credentialAccounts)
  const decks = countValue(snapshot.decks)
  const decksWithoutSlides = countValue(snapshot.decksWithoutSlides)
  const orphanDecks = countValue(snapshot.orphanDecks)
  const revisions = countValue(snapshot.revisions)
  const expiredEnabledShares = countValue(snapshot.expiredEnabledShares)
  const orphanCollaborators = countValue(snapshot.orphanCollaborators)

  check(
    checks,
    "database-reachable",
    "Database reachable",
    snapshot.databaseReachable ? "ready" : "blocked",
    snapshot.databaseReachable
      ? "Drizzle can read the configured presentation database."
      : `Database health query failed${snapshot.databaseError ? `: ${snapshot.databaseError}` : "."}`,
  )

  check(
    checks,
    "seed-admin-present",
    "Seed admin present",
    admins > 0 ? "ready" : "blocked",
    admins > 0
      ? `${admins} admin account(s) exist.`
      : "Run the seeded admin workflow before release smoke.",
  )

  check(
    checks,
    "verified-admin",
    "Verified admin",
    verifiedAdmins > 0 ? "ready" : "blocked",
    verifiedAdmins > 0
      ? `${verifiedAdmins} admin account(s) are email verified.`
      : "At least one admin must be email verified for production support access.",
  )

  check(
    checks,
    "credential-auth",
    "Credential auth",
    credentialAccounts > 0 ? "ready" : "blocked",
    credentialAccounts > 0
      ? `${credentialAccounts} credential account(s) are present for email/password sign-in.`
      : "No credential account rows were found; Better Auth email/password login cannot be smoke-tested.",
  )

  check(
    checks,
    "user-verification-ratio",
    "User verification ratio",
    users === 0 || countValue(snapshot.verifiedUsers) < users ? "attention" : "ready",
    users === 0
      ? "No users exist yet beyond release seed expectations."
      : `${countValue(snapshot.verifiedUsers)} of ${users} user(s) are email verified.`,
  )

  check(
    checks,
    "deck-owner-integrity",
    "Deck owner integrity",
    orphanDecks === 0 ? "ready" : "attention",
    orphanDecks === 0
      ? "Every persisted deck is attached to an owner or no deck rows exist."
      : `${orphanDecks} deck(s) have no owner; keep them out of production smoke fixtures.`,
  )

  check(
    checks,
    "deck-slide-integrity",
    "Deck slide integrity",
    decks === 0 ? "attention" : decksWithoutSlides === 0 ? "ready" : "blocked",
    decks === 0
      ? "No persisted cloud deck fixture exists yet."
      : decksWithoutSlides === 0
        ? `${decks} deck(s) have at least one slide.`
        : `${decksWithoutSlides} deck(s) have no slides and should not be used as smoke fixtures.`,
  )

  check(
    checks,
    "revision-coverage",
    "Revision coverage",
    decks === 0 ? "attention" : revisions >= decks ? "ready" : "attention",
    decks === 0
      ? "Revision coverage is waiting on the first saved cloud deck."
      : `${revisions} revision row(s) cover ${decks} deck(s).`,
  )

  check(
    checks,
    "share-expiry-hygiene",
    "Share expiry hygiene",
    expiredEnabledShares === 0 ? "ready" : "attention",
    expiredEnabledShares === 0
      ? `${countValue(snapshot.enabledShares)} enabled share link(s) have valid expiry state.`
      : `${expiredEnabledShares} expired share link(s) are still enabled.`,
  )

  check(
    checks,
    "collaborator-integrity",
    "Collaborator integrity",
    orphanCollaborators === 0 ? "ready" : "blocked",
    orphanCollaborators === 0
      ? `${countValue(snapshot.pendingInvites)} pending invite(s); collaborator rows point at real decks/users.`
      : `${orphanCollaborators} collaborator row(s) point at missing decks or users.`,
  )

  check(
    checks,
    "banned-admin-safety",
    "Banned admin safety",
    countValue(snapshot.bannedAdmins) === 0 ? "ready" : "blocked",
    countValue(snapshot.bannedAdmins) === 0
      ? "No admin account is banned."
      : `${snapshot.bannedAdmins} admin account(s) are banned.`,
  )

  const readyCount = checks.filter((item) => item.status === "ready").length

  return {
    checks,
    readyCount,
    snapshot,
    status: combineStatuses(checks.map((item) => item.status)),
    summary: `${readyCount} of ${checks.length} admin/auth/deck data health checks are ready.`,
    totalCount: checks.length,
  }
}

export function serializeCloudDataHealthReport(report: CloudDataHealthReport) {
  return [
    `Cloud data health: ${report.summary} Status: ${report.status}.`,
    ...report.checks.map(
      (check) => `- ${check.label}: ${check.status}. ${check.detail}`,
    ),
  ].join("\n")
}
