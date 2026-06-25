export type ReleaseEnvironmentReadinessStatus = "fail" | "pass" | "warn"

export type ReleaseEnvironmentReadinessCheck = {
  detail: string
  id: string
  label: string
  status: ReleaseEnvironmentReadinessStatus
}

export type ReleaseEnvironmentReadinessInput = {
  adminEmail?: string
  adminPassword?: string
  betterAuthSecret?: string
  betterAuthUrl?: string
  brevoApiKey?: string
  brevoSenderEmail?: string
  nextPublicAppUrl?: string
  productionUrl?: string
  requireHostedDatabase?: boolean
  requireProductionSecrets?: boolean
  tursoAuthToken?: string
  tursoDatabaseUrl?: string
  vercelOrgId?: string
  vercelProjectId?: string
  vercelProjectName?: string
  vercelUrl?: string
}

export type ReleaseEnvironmentReadinessReport = {
  checks: ReleaseEnvironmentReadinessCheck[]
  failedCount: number
  readyCount: number
  status: ReleaseEnvironmentReadinessStatus
  summary: string
  totalCount: number
  warningCount: number
}

function clean(value: string | undefined) {
  return value?.trim() || undefined
}

function isHttpUrl(value: string | undefined) {
  if (!value) return false

  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function isHttpsUrl(value: string | undefined) {
  if (!value) return false

  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}

function isEmail(value: string | undefined) {
  return Boolean(clean(value)?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
}

function siteUrl(input: ReleaseEnvironmentReadinessInput) {
  return (
    clean(input.betterAuthUrl) ??
    clean(input.nextPublicAppUrl) ??
    (clean(input.vercelUrl) ? `https://${clean(input.vercelUrl)}` : undefined)
  )
}

function databaseUrlKind(value: string | undefined) {
  const url = clean(value)
  if (!url) return "missing"
  if (url.startsWith("file:")) return "local"
  if (url.startsWith("libsql://") || url.startsWith("https://")) return "hosted"
  return "unknown"
}

function secretLooksProductionReady(value: string | undefined) {
  const secret = clean(value)
  if (!secret) return false

  return (
    secret.length >= 32 &&
    !/replace|changeme|secret|password/i.test(secret)
  )
}

function combineStatus(
  statuses: ReleaseEnvironmentReadinessStatus[],
): ReleaseEnvironmentReadinessStatus {
  if (statuses.includes("fail")) return "fail"
  if (statuses.includes("warn")) return "warn"
  return "pass"
}

function check(
  checks: ReleaseEnvironmentReadinessCheck[],
  id: string,
  label: string,
  status: ReleaseEnvironmentReadinessStatus,
  detail: string,
) {
  checks.push({ detail, id, label, status })
}

function warnOrFail(strict: boolean) {
  return strict ? "fail" : "warn"
}

export function releaseEnvironmentReadinessReport(
  input: ReleaseEnvironmentReadinessInput = {},
): ReleaseEnvironmentReadinessReport {
  const strict = input.requireProductionSecrets === true
  const requireHostedDatabase = input.requireHostedDatabase === true
  const checks: ReleaseEnvironmentReadinessCheck[] = []
  const resolvedSiteUrl = siteUrl(input)
  const productionUrl = clean(input.productionUrl)
  const databaseKind = databaseUrlKind(input.tursoDatabaseUrl)

  check(
    checks,
    "vercel-project-link",
    "Vercel project link",
    input.vercelProjectId && input.vercelOrgId && input.vercelProjectName
      ? "pass"
      : "warn",
    input.vercelProjectId && input.vercelOrgId && input.vercelProjectName
      ? `Linked to ${input.vercelProjectName}.`
      : "No local .vercel project link was found; CLI env sync and deployments need an explicit project.",
  )

  check(
    checks,
    "hosted-app-url",
    "Hosted app URL",
    resolvedSiteUrl && isHttpUrl(resolvedSiteUrl)
      ? strict && !isHttpsUrl(resolvedSiteUrl)
        ? "fail"
        : "pass"
      : warnOrFail(strict),
    resolvedSiteUrl && isHttpUrl(resolvedSiteUrl)
      ? productionUrl && resolvedSiteUrl !== productionUrl
        ? `Auth/app URL is ${resolvedSiteUrl}; desktop production shell targets ${productionUrl}.`
        : `Auth/app URL is ${resolvedSiteUrl}.`
      : "Set BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL, or VERCEL_URL before release smoke runs.",
  )

  check(
    checks,
    "better-auth-secret",
    "Better Auth secret",
    secretLooksProductionReady(input.betterAuthSecret)
      ? "pass"
      : warnOrFail(strict),
    secretLooksProductionReady(input.betterAuthSecret)
      ? "BETTER_AUTH_SECRET is present and does not look like a placeholder."
      : "Set a strong BETTER_AUTH_SECRET outside source control before production.",
  )

  check(
    checks,
    "turso-database-url",
    "Turso database URL",
    databaseKind === "hosted"
      ? "pass"
      : databaseKind === "local" && requireHostedDatabase
        ? "fail"
        : databaseKind === "local"
          ? "warn"
          : "fail",
    databaseKind === "hosted"
      ? "TURSO_DATABASE_URL points at a hosted libSQL/Turso database."
      : databaseKind === "local"
        ? "TURSO_DATABASE_URL points at a local SQLite file; fine for local checks, not hosted release."
        : "Set TURSO_DATABASE_URL to a local file or hosted Turso/libSQL URL.",
  )

  check(
    checks,
    "turso-auth-token",
    "Turso auth token",
    databaseKind === "hosted"
      ? clean(input.tursoAuthToken)
        ? "pass"
        : "fail"
      : "pass",
    databaseKind === "hosted"
      ? clean(input.tursoAuthToken)
        ? "TURSO_AUTH_TOKEN is present for the hosted database."
        : "Hosted Turso databases require TURSO_AUTH_TOKEN."
      : "Local SQLite database mode does not need TURSO_AUTH_TOKEN.",
  )

  check(
    checks,
    "brevo-api-key",
    "Brevo API key",
    clean(input.brevoApiKey) ? "pass" : warnOrFail(strict),
    clean(input.brevoApiKey)
      ? "BREVO_API_KEY is present for email OTP delivery."
      : "Email verification uses Brevo OTP; set BREVO_API_KEY before production auth smoke runs.",
  )

  check(
    checks,
    "brevo-sender-email",
    "Brevo sender email",
    isEmail(input.brevoSenderEmail) ? "pass" : warnOrFail(strict),
    isEmail(input.brevoSenderEmail)
      ? `Brevo sender email is ${clean(input.brevoSenderEmail)}.`
      : "Set BREVO_SENDER_EMAIL to a verified sender email address.",
  )

  check(
    checks,
    "seed-admin-email",
    "Seed admin email",
    isEmail(input.adminEmail) ? "pass" : "fail",
    isEmail(input.adminEmail)
      ? `Seed admin account is ${clean(input.adminEmail)}.`
      : "ADMIN_EMAIL must be a valid email address for seeded admin setup.",
  )

  check(
    checks,
    "seed-admin-password",
    "Seed admin password",
    strict
      ? clean(input.adminPassword) && input.adminPassword !== "password"
        ? "pass"
        : "fail"
      : clean(input.adminPassword)
        ? input.adminPassword === "password"
          ? "warn"
          : "pass"
        : "warn",
    strict
      ? "Production release requires a non-default ADMIN_PASSWORD outside source control."
      : clean(input.adminPassword)
        ? input.adminPassword === "password"
          ? "Default local admin password is acceptable only for development fixtures."
          : "ADMIN_PASSWORD is set for seeded admin setup."
        : "ADMIN_PASSWORD is not set; the local seed helper will use its development fallback.",
  )

  const failedCount = checks.filter((item) => item.status === "fail").length
  const warningCount = checks.filter((item) => item.status === "warn").length
  const readyCount = checks.filter((item) => item.status === "pass").length

  return {
    checks,
    failedCount,
    readyCount,
    status: combineStatus(checks.map((item) => item.status)),
    summary: `${readyCount} of ${checks.length} release environment checks are ready.`,
    totalCount: checks.length,
    warningCount,
  }
}

export function serializeReleaseEnvironmentReadinessReport(
  report: ReleaseEnvironmentReadinessReport,
) {
  return [
    `Release environment readiness: ${report.summary} Status: ${report.status}.`,
    ...report.checks.map(
      (check) => `- ${check.label}: ${check.status}. ${check.detail}`,
    ),
  ].join("\n")
}
