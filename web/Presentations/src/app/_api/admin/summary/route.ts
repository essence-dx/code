import { NextResponse } from "next/server"
import { count, desc, eq } from "drizzle-orm"

import { getAdminSessionUser } from "@/server/admin/access"
import { readProductionDataSnapshots } from "@/server/admin/production-data-snapshots"
import { getDb } from "@/server/db"
import { deck, session, user } from "@/server/db/schema"
import { productionDataOperationsReport } from "@/features/presentation/production-data-operations"

export async function GET() {
  const admin = await getAdminSessionUser()

  if (admin.status !== 200) {
    return NextResponse.json({ error: "Unauthorized" }, { status: admin.status })
  }

  const db = getDb()
  const [userCount] = await db.select({ value: count() }).from(user)
  const [verifiedCount] = await db
    .select({ value: count() })
    .from(user)
    .where(eq(user.emailVerified, true))
  const [adminCount] = await db
    .select({ value: count() })
    .from(user)
    .where(eq(user.role, "admin"))
  const [deckCount] = await db.select({ value: count() }).from(deck)
  const [sessionCount] = await db.select({ value: count() }).from(session)
  const recentUsers = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(6)
  const productionSnapshots = await readProductionDataSnapshots()
  const dataOperations = productionDataOperationsReport(
    productionSnapshots.operations,
  )

  return NextResponse.json({
    currentUser: {
      id: admin.user.id,
      name: admin.user.name,
      email: admin.user.email,
      role: admin.user.role,
    },
    metrics: {
      users: userCount.value,
      verifiedUsers: verifiedCount.value,
      admins: adminCount.value,
      activeSessions: sessionCount.value,
      decks: deckCount.value,
      verificationRate:
        userCount.value > 0
          ? Math.round((verifiedCount.value / userCount.value) * 100)
          : 0,
    },
    recentUsers: recentUsers.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
    dataOperations,
    generatedAt: new Date().toISOString(),
  })
}
