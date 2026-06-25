import { NextResponse } from "next/server"

import { getCurrentUser } from "@/server/session"
import { listDecksForUser, saveDeckForUser } from "@/server/decks/repository"
import { parseDeckPayload } from "@/server/decks/validation"

function saveSourceFromHeader(value: string | null) {
  return value === "autosave" || value === "restore" ? value : "manual"
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({ decks: await listDecksForUser(user.id) })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const deck = parseDeckPayload(await request.json().catch(() => null))
  if (!deck) {
    return NextResponse.json({ error: "Invalid deck" }, { status: 400 })
  }

  try {
    return NextResponse.json({
      deck: await saveDeckForUser(deck, user.id, {
        knownUpdatedAt: request.headers.get("x-deck-known-updated-at"),
        revisionSource: saveSourceFromHeader(
          request.headers.get("x-deck-save-source"),
        ),
      }),
    })
  } catch (error) {
    if (error instanceof Error && error.message === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (error instanceof Error && error.message === "conflict") {
      return NextResponse.json(
        { error: "Cloud deck changed. Open the cloud copy before saving again." },
        { status: 409 },
      )
    }

    throw error
  }
}
