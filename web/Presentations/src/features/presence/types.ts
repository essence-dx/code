export type DeckPresenceSummary = {
  email: string
  initials: string
  isCurrentUser: boolean
  lastSeenAt: string
  name: string
  role: "owner" | "editor" | "viewer"
  slideId: string | null
  userId: string
}

export type DeckPresenceResponse = {
  presences: DeckPresenceSummary[]
}
