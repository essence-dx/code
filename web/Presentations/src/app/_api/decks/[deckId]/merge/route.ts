import { NextResponse } from "next/server"

import { mergeDeckForUser } from "@/server/decks/repository"
import { parseDeckPayload } from "@/server/decks/validation"
import { getCurrentUser } from "@/server/session"

type RouteContext = {
  params: Promise<{
    deckId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    baseDeck?: unknown
    localDeck?: unknown
  } | null
  const baseDeck = parseDeckPayload({ deck: body?.baseDeck })
  const localDeck = parseDeckPayload({ deck: body?.localDeck })
  const { deckId } = await context.params

  if (!baseDeck || !localDeck || baseDeck.id !== deckId || localDeck.id !== deckId) {
    return NextResponse.json({ error: "Invalid merge payload" }, { status: 400 })
  }

  try {
    const result = await mergeDeckForUser({
      baseDeck,
      deckId,
      localDeck,
      userId: user.id,
    })

    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    if (result.status === "conflict") {
      return NextResponse.json(result, { status: 409 })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === "invalid-merge") {
      return NextResponse.json({ error: "Invalid merge payload" }, { status: 400 })
    }
    if (error instanceof Error && error.message === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (error instanceof Error && error.message === "conflict") {
      return NextResponse.json(
        { error: "Cloud deck changed. Refresh the merge preview." },
        { status: 409 },
      )
    }

    throw error
  }
}
