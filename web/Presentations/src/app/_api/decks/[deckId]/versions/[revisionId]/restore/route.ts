import { NextResponse } from "next/server"

import { restoreDeckRevisionForUser } from "@/server/decks/repository"
import { getCurrentUser } from "@/server/session"

type RouteContext = {
  params: Promise<{
    deckId: string
    revisionId: string
  }>
}

export async function POST(_request: Request, context: RouteContext) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { deckId, revisionId } = await context.params

  try {
    const deck = await restoreDeckRevisionForUser(deckId, revisionId, user.id)
    if (!deck) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ deck })
  } catch (error) {
    if (error instanceof Error && error.message === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    throw error
  }
}
