import { NextResponse } from "next/server"

import { listDeckRevisionsForUser } from "@/server/decks/repository"
import { getCurrentUser } from "@/server/session"

type RouteContext = {
  params: Promise<{
    deckId: string
  }>
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { deckId } = await context.params

  try {
    const versions = await listDeckRevisionsForUser(deckId, user.id)
    if (!versions) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ versions })
  } catch (error) {
    if (error instanceof Error && error.message === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    throw error
  }
}
