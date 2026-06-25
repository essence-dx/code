import { NextResponse } from "next/server"

import {
  createDeckCollaborationEventForUser,
  listDeckCollaborationEventsForUser,
  parseDeckCollaborationEvent,
} from "@/server/decks/collaboration-events"
import { getCurrentUser } from "@/server/session"

type RouteContext = {
  params: Promise<{
    deckId: string
  }>
}

function collaborationEventError(error: unknown) {
  if (error instanceof Error && error.message === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  throw error
}

export async function GET(request: Request, context: RouteContext) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { deckId } = await context.params
  const since = new URL(request.url).searchParams.get("since")

  try {
    const events = await listDeckCollaborationEventsForUser(
      deckId,
      user.id,
      since,
    )
    if (!events) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ events })
  } catch (error) {
    return collaborationEventError(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const input = parseDeckCollaborationEvent(
    await request.json().catch(() => null),
  )
  if (!input) {
    return NextResponse.json(
      { error: "Invalid collaboration event" },
      { status: 400 },
    )
  }

  const { deckId } = await context.params

  try {
    const event = await createDeckCollaborationEventForUser(
      deckId,
      user.id,
      input,
    )
    if (!event) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ event })
  } catch (error) {
    return collaborationEventError(error)
  }
}
