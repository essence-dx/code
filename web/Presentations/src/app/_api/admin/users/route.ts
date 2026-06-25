import { NextResponse } from "next/server"
import { desc, eq, like, or } from "drizzle-orm"

import { getAdminSessionUser } from "@/server/admin/access"
import { resolveAdminUserUpdate } from "@/server/admin/user-update-policy"
import { getDb } from "@/server/db"
import { user } from "@/server/db/schema"

export async function GET(request: Request) {
  const admin = await getAdminSessionUser()

  if (admin.status !== 200) {
    return NextResponse.json({ error: "Unauthorized" }, { status: admin.status })
  }

  const url = new URL(request.url)
  const query = url.searchParams.get("q")?.trim()
  const db = getDb()
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(
      query
        ? or(like(user.email, `%${query}%`), like(user.name, `%${query}%`))
        : undefined,
    )
    .orderBy(desc(user.createdAt))
    .limit(100)

  return NextResponse.json({
    users: rows.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  })
}

export async function PATCH(request: Request) {
  const admin = await getAdminSessionUser()

  if (admin.status !== 200) {
    return NextResponse.json({ error: "Unauthorized" }, { status: admin.status })
  }

  const body = (await request.json()) as {
    userId?: string
    role?: unknown
    emailVerified?: unknown
    banned?: unknown
  }

  const decision = resolveAdminUserUpdate({
    adminUserId: admin.user.id,
    body,
  })

  if (!decision.ok) {
    return NextResponse.json(
      { error: decision.error },
      { status: decision.status },
    )
  }

  await getDb().update(user).set(decision.patch).where(eq(user.id, decision.userId))

  return NextResponse.json({ ok: true })
}
