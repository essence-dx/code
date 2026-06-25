import type { SlideComment } from "./types"

const mentionPattern = /(^|[\s([{"'])@([A-Za-z0-9][A-Za-z0-9._-]{1,63})/g

export function extractCommentMentions(body: string) {
  const mentions: string[] = []
  const seen = new Set<string>()

  for (const match of body.matchAll(mentionPattern)) {
    const value = match[2]?.trim()
    if (!value) continue

    const normalized = value.toLowerCase()
    if (seen.has(normalized)) continue

    seen.add(normalized)
    mentions.push(normalized)
  }

  return mentions
}

export function mentionLabel(mention: string) {
  return `@${mention}`
}

export function openMentionCount(comments: SlideComment[]) {
  return comments.reduce(
    (total, comment) =>
      comment.resolved ? total : total + (comment.mentions ?? []).length,
    0,
  )
}
