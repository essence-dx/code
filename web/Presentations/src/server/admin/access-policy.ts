export type AdminSessionUser = {
  id: string
}

export type AdminDatabaseUser = {
  id: string
  role: string
  banned: boolean | null
}

export type AdminAccessDecision<TUser extends AdminDatabaseUser> =
  | { status: 200; user: TUser }
  | { status: 401; user: null }
  | { status: 403; user: TUser | null }

export function resolveAdminAccess<TUser extends AdminDatabaseUser>(input: {
  sessionUser: AdminSessionUser | null | undefined
  dbUser: TUser | null | undefined
}): AdminAccessDecision<TUser> {
  if (!input.sessionUser) {
    return { status: 401, user: null }
  }

  if (!input.dbUser || input.dbUser.role !== "admin" || input.dbUser.banned) {
    return { status: 403, user: input.dbUser ?? null }
  }

  return { status: 200, user: input.dbUser }
}
