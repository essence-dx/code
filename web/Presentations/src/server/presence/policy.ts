export type PresenceHeartbeatBody = {
  slideId?: unknown
} | null

export function resolvePresenceHeartbeat(input: {
  body: PresenceHeartbeatBody
}) {
  const slideId =
    typeof input.body?.slideId === "string" ? input.body.slideId.trim() : ""

  return {
    slideId: slideId || null,
  }
}

export function presenceInitials(input: { email: string; name: string }) {
  const parts = input.name.trim().split(/\s+/).filter(Boolean)
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()

  return initials || input.email.slice(0, 2).toUpperCase()
}
