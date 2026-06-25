import { NextResponse } from "next/server"

import {
  clearDeckPresence,
  heartbeatDeckPresence,
  listDeckPresence,
} from "@/server/presence/repository"
import { resolvePresenceHeartbeat } from "@/server/presence/policy"
import { getCurrentUser } from "@/server/session"

type RouteContext = {
  params: Promise<{
    deckId: string
  }>
}

function presenceError(error: unknown) {
  if (error instanceof Error && error.message === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  throw error
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { deckId } = await context.params

  try {
    const presences = await listDeckPresence(deckId, user.id)
    if (!presences) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ presences })
  } catch (error) {
    return presenceError(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { deckId } = await context.params
  const body = (await request.json().catch(() => ({}))) as {
    slideId?: unknown
  }
  const { slideId } = resolvePresenceHeartbeat({ body })

  try {
    const presences = await heartbeatDeckPresence(deckId, user.id, slideId)
    if (!presences) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ presences })
  } catch (error) {
    return presenceError(error)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { deckId } = await context.params

  try {
    const deleted = await clearDeckPresence(deckId, user.id)
    return NextResponse.json({ deleted })
  } catch (error) {
    return presenceError(error)
  }
}
