export type DeckShareAccessCodeAction = "generate" | "clear"

export type DeckShareUpdateBody = {
  accessCodeAction?: unknown
  allowDownloads?: unknown
  enabled?: unknown
  expiresAt?: unknown
} | null

export type DeckShareUpdatePatch = {
  accessCodeAction?: DeckShareAccessCodeAction
  allowDownloads?: boolean
  enabled?: boolean
  expiresAt?: Date | null
}

export type DeckShareUpdateDecision =
  | { ok: true; patch: DeckShareUpdatePatch }
  | { ok: false; status: 400; error: string }

function ownsProperty(value: object | null, key: string) {
  return Boolean(value) && Object.prototype.hasOwnProperty.call(value, key)
}

function parseExpiresAt(value: unknown, now: Date) {
  if (value === undefined) {
    return { valid: true, provided: false, value: undefined }
  }
  if (value === null) {
    return { valid: true, provided: true, value: null }
  }
  if (typeof value !== "string") {
    return { valid: false, provided: true, value: undefined }
  }

  const date = new Date(value)
  if (!Number.isFinite(date.getTime()) || date.getTime() <= now.getTime()) {
    return { valid: false, provided: true, value: undefined }
  }

  return { valid: true, provided: true, value: date }
}

export function resolveDeckShareUpdate(input: {
  body: DeckShareUpdateBody
  now?: Date
}): DeckShareUpdateDecision {
  const body = input.body
  const now = input.now ?? new Date()
  const accessCodeAction = body?.accessCodeAction
  const accessCodeProvided =
    accessCodeAction !== undefined &&
    (accessCodeAction === "generate" || accessCodeAction === "clear")
  const invalidAccessCodeAction =
    accessCodeAction !== undefined && !accessCodeProvided
  const enabledProvided = ownsProperty(body, "enabled")
  const enabled = typeof body?.enabled === "boolean" ? body.enabled : undefined
  const allowDownloadsProvided = ownsProperty(body, "allowDownloads")
  const allowDownloads =
    typeof body?.allowDownloads === "boolean" ? body.allowDownloads : undefined
  const expiresAt = parseExpiresAt(body?.expiresAt, now)

  if (
    invalidAccessCodeAction ||
    !expiresAt.valid ||
    (enabledProvided && enabled === undefined) ||
    (allowDownloadsProvided && allowDownloads === undefined) ||
    (enabled === undefined &&
      allowDownloads === undefined &&
      !expiresAt.provided &&
      !accessCodeProvided)
  ) {
    return { ok: false, status: 400, error: "Invalid share state" }
  }

  const patch: DeckShareUpdatePatch = {
    allowDownloads,
    enabled,
    expiresAt: expiresAt.value,
  }

  if (accessCodeProvided) {
    patch.accessCodeAction = accessCodeAction
  }

  return { ok: true, patch }
}
