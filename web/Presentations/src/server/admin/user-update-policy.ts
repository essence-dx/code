export type AdminUserRole = "admin" | "user"

export type AdminUserUpdateBody = {
  userId?: string
  role?: unknown
  emailVerified?: unknown
  banned?: unknown
}

export type AdminUserUpdatePatch = {
  updatedAt: Date
  role?: AdminUserRole
  emailVerified?: boolean
  banned?: boolean
  banReason?: string | null
  banExpires?: Date | null
}

export type AdminUserUpdateDecision =
  | { ok: true; userId: string; patch: AdminUserUpdatePatch }
  | { ok: false; status: 400; error: string }

function isRole(value: unknown): value is AdminUserRole {
  return value === "admin" || value === "user"
}

export function resolveAdminUserUpdate(input: {
  adminUserId: string
  body: AdminUserUpdateBody
  now?: Date
}): AdminUserUpdateDecision {
  const userId = input.body.userId?.trim()

  if (!userId) {
    return { ok: false, status: 400, error: "Missing user" }
  }

  if (
    userId === input.adminUserId &&
    (input.body.role === "user" || input.body.banned === true)
  ) {
    return { ok: false, status: 400, error: "You cannot demote or ban yourself" }
  }

  const patch: AdminUserUpdatePatch = {
    updatedAt: input.now ?? new Date(),
  }

  if (isRole(input.body.role)) {
    patch.role = input.body.role
  }
  if (typeof input.body.emailVerified === "boolean") {
    patch.emailVerified = input.body.emailVerified
  }
  if (typeof input.body.banned === "boolean") {
    patch.banned = input.body.banned
    patch.banReason = input.body.banned ? "Disabled by admin" : null
    patch.banExpires = null
  }

  return { ok: true, userId, patch }
}
