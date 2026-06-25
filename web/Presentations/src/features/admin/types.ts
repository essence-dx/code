import type { ProductionDataOperationsReport } from "@/features/presentation/production-data-operations"

export type AdminUserRow = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  role: string
  banned: boolean
  banReason: string | null
  createdAt: string
  updatedAt?: string
}

export type AdminSummary = {
  currentUser: {
    id: string
    name: string
    email: string
    role: string
  }
  metrics: {
    users: number
    verifiedUsers: number
    admins: number
    activeSessions: number
    decks: number
    verificationRate: number
  }
  dataOperations?: ProductionDataOperationsReport
  recentUsers: AdminUserRow[]
  generatedAt: string
}

export type AdminDeckRow = {
  id: string
  title: string
  theme: string
  ownerId: string | null
  ownerName: string | null
  ownerEmail: string | null
  slideCount: number
  createdAt: string
  updatedAt: string
}

export type AdminSessionRow = {
  id: string
  userId: string
  userName: string | null
  userEmail: string | null
  ipAddress: string | null
  userAgent: string | null
  isCurrent: boolean
  createdAt: string
  updatedAt: string
  expiresAt: string
}
