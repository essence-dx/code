import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"

import { getAdminSessionUser } from "@/server/admin/access"
import { getDb } from "@/server/db"
import { session, user } from "@/server/db/schema"

export async function GET() {
  const admin = await getAdminSessionUser()

  if (admin.status !== 200) {
    return NextResponse.json({ error: "Unauthorized" }, { status: admin.status })
  }

  const rows = await getDb()
    .select({
      id: session.id,
      userId: session.userId,
      userName: user.name,
      userEmail: user.email,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
    })
    .from(session)
    .leftJoin(user, eq(session.userId, user.id))
    .orderBy(desc(session.updatedAt))
    .limit(100)

  return NextResponse.json({
    sessions: rows.map((item) => ({
      ...item,
      isCurrent: item.id === admin.session?.id,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      expiresAt: item.expiresAt.toISOString(),
    })),
  })
}

export async function DELETE(request: Request) {
  const admin = await getAdminSessionUser()

  if (admin.status !== 200) {
    return NextResponse.json({ error: "Unauthorized" }, { status: admin.status })
  }

  const body = (await request.json()) as { sessionId?: string }

  if (!body.sessionId) {
    return NextResponse.json({ error: "Missing session" }, { status: 400 })
  }

  if (body.sessionId === admin.session?.id) {
    return NextResponse.json(
      { error: "You cannot revoke your current session here" },
      { status: 400 },
    )
  }

  await getDb().delete(session).where(eq(session.id, body.sessionId))

  return NextResponse.json({ ok: true })
}
