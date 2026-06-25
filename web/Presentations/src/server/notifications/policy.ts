export const SHARE_VIEW_DEDUPE_MS = 15 * 60 * 1000

export function cleanNotificationMentionKey(value: string) {
  return value
    .trim()
    .replace(/^@/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
}

export function notificationMentionKeysForUser(input: {
  email: string
  name: string
}) {
  const emailLocal = input.email.split("@")[0] ?? ""
  const name = input.name.trim()

  return new Set(
    [
      emailLocal,
      name,
      name.replace(/\s+/g, "."),
      name.replace(/\s+/g, "-"),
      name.replace(/\s+/g, ""),
    ]
      .map(cleanNotificationMentionKey)
      .filter(Boolean),
  )
}

export function notificationCommentPreview(body: string) {
  const compact = body.replace(/\s+/g, " ").trim()
  return compact.length > 96 ? `${compact.slice(0, 93)}...` : compact
}

export function shareViewDedupeCutoff(now = new Date()) {
  return new Date(now.getTime() - SHARE_VIEW_DEDUPE_MS)
}
