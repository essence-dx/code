import { headers } from "next/headers"
import { eq } from "drizzle-orm"

import { auth } from "@/server/auth"
import { getDb } from "@/server/db"
import { user } from "@/server/db/schema"
import { resolveAdminAccess } from "@/server/admin/access-policy"

export async function getAdminSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return { status: 401 as const, user: null, session: null }
  }

  const dbUser = await getDb().query.user.findFirst({
    where: eq(user.id, session.user.id),
  })
  const access = resolveAdminAccess({
    sessionUser: session.user,
    dbUser,
  })

  if (access.status !== 200) {
    return { status: access.status, user: access.user, session: null }
  }

  return { status: 200 as const, user: access.user, session: session.session }
}
