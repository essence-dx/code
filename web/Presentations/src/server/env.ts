const SERVER_ENV_KEYS = [
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "VERCEL_URL",
  "BREVO_API_KEY",
  "BREVO_SENDER_EMAIL",
  "BREVO_SENDER_NAME",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "ASSET_STORAGE_PROVIDER",
  "ASSET_STORAGE_ENDPOINT",
  "ASSET_STORAGE_BUCKET",
  "ASSET_STORAGE_REGION",
  "ASSET_STORAGE_ACCESS_KEY_ID",
  "ASSET_STORAGE_SECRET_ACCESS_KEY",
  "ASSET_STORAGE_PREFIX",
  "ASSET_STORAGE_MIN_BYTES",
  "ASSET_STORAGE_DELETE_STALE_OBJECTS",
] as const

function cleanEnv(value: string | undefined) {
  const cleaned = value?.replace(/^\uFEFF+/, "").trim()

  return cleaned || undefined
}

export function normalizeServerEnv() {
  for (const key of SERVER_ENV_KEYS) {
    const cleaned = cleanEnv(process.env[key])

    if (cleaned) {
      process.env[key] = cleaned
    } else if (process.env[key] !== undefined) {
      delete process.env[key]
    }
  }
}

export function getSiteUrl() {
  return (
    cleanEnv(process.env.BETTER_AUTH_URL) ??
    cleanEnv(process.env.NEXT_PUBLIC_APP_URL) ??
    cleanEnv(process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ??
    "http://localhost:3000"
  )
}

export function getAuthSecret() {
  return cleanEnv(process.env.BETTER_AUTH_SECRET)
}

export function getDatabaseUrl() {
  return cleanEnv(process.env.TURSO_DATABASE_URL) ?? "file:local.db"
}

export function getDatabaseAuthToken() {
  return cleanEnv(process.env.TURSO_AUTH_TOKEN)
}

export function getBrevoApiKey() {
  return cleanEnv(process.env.BREVO_API_KEY)
}

export function getBrevoSenderEmail() {
  return cleanEnv(process.env.BREVO_SENDER_EMAIL) ?? "ajju40959@gmail.com"
}

export function getBrevoSenderName() {
  return cleanEnv(process.env.BREVO_SENDER_NAME) ?? "Essence PowerPoint"
}

export function getSeedAdminEmail() {
  return cleanEnv(process.env.ADMIN_EMAIL) ?? "admin@mail.com"
}

export function getSeedAdminPassword() {
  return cleanEnv(process.env.ADMIN_PASSWORD) ?? "password"
}

export function getAssetStorageProvider() {
  return cleanEnv(process.env.ASSET_STORAGE_PROVIDER)?.toLowerCase()
}

export function getAssetStorageEndpoint() {
  return cleanEnv(process.env.ASSET_STORAGE_ENDPOINT)
}

export function getAssetStorageBucket() {
  return cleanEnv(process.env.ASSET_STORAGE_BUCKET)
}

export function getAssetStorageRegion() {
  return cleanEnv(process.env.ASSET_STORAGE_REGION) ?? "auto"
}

export function getAssetStorageAccessKeyId() {
  return cleanEnv(process.env.ASSET_STORAGE_ACCESS_KEY_ID)
}

export function getAssetStorageSecretAccessKey() {
  return cleanEnv(process.env.ASSET_STORAGE_SECRET_ACCESS_KEY)
}

export function getAssetStoragePrefix() {
  return cleanEnv(process.env.ASSET_STORAGE_PREFIX) ?? "deck-assets"
}

export function getAssetStorageMinBytes() {
  const value = Number(cleanEnv(process.env.ASSET_STORAGE_MIN_BYTES))

  return Number.isFinite(value) && value > 0 ? value : 512 * 1024
}

export function getAssetStorageDeleteStaleObjects() {
  const value = cleanEnv(process.env.ASSET_STORAGE_DELETE_STALE_OBJECTS)
  if (!value) return true

  return !["0", "false", "no", "off", "retain"].includes(value.toLowerCase())
}
