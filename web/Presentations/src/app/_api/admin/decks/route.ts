import { NextResponse } from "next/server"
import { count, desc, eq } from "drizzle-orm"

import { getAdminSessionUser } from "@/server/admin/access"
import { getDb } from "@/server/db"
import { deck, slide, user } from "@/server/db/schema"

export async function GET() {
  const admin = await getAdminSessionUser()

  if (admin.status !== 200) {
    return NextResponse.json({ error: "Unauthorized" }, { status: admin.status })
  }

  const rows = await getDb()
    .select({
      id: deck.id,
      title: deck.title,
      theme: deck.theme,
      ownerId: deck.ownerId,
      ownerName: user.name,
      ownerEmail: user.email,
      slideCount: count(slide.id),
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    })
    .from(deck)
    .leftJoin(user, eq(deck.ownerId, user.id))
    .leftJoin(slide, eq(slide.deckId, deck.id))
    .groupBy(deck.id)
    .orderBy(desc(deck.updatedAt))
    .limit(100)

  return NextResponse.json({
    decks: rows.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  })
}

export async function DELETE(request: Request) {
  const admin = await getAdminSessionUser()

  if (admin.status !== 200) {
    return NextResponse.json({ error: "Unauthorized" }, { status: admin.status })
  }

  const body = (await request.json()) as { deckId?: string }

  if (!body.deckId) {
    return NextResponse.json({ error: "Missing deck" }, { status: 400 })
  }

  await getDb().delete(deck).where(eq(deck.id, body.deckId))

  return NextResponse.json({ ok: true })
}
