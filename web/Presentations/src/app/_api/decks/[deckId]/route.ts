import { NextResponse } from "next/server"

import {
  deleteDeckForUser,
  getDeckForUser,
} from "@/server/decks/repository"
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
    const deck = await getDeckForUser(deckId, user.id)
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

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { deckId } = await context.params

  try {
    const deleted = await deleteDeckForUser(deckId, user.id)
    return NextResponse.json({ deleted })
  } catch (error) {
    if (error instanceof Error && error.message === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    throw error
  }
}
