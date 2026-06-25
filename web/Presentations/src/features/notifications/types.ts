export type AppNotificationType =
  | "share_view"
  | "share_created"
  | "share_updated"
  | "share_deleted"
  | "version_restored"
  | "comment_mention"
  | "collaborator_added"
  | "collaborator_updated"
  | "collaborator_removed"

export type AppNotification = {
  id: string
  type: AppNotificationType
  deckId: string | null
  title: string
  body: string
  href: string
  readAt: string | null
  createdAt: string
}

export type NotificationsResponse = {
  notifications: AppNotification[]
  unreadCount: number
}
