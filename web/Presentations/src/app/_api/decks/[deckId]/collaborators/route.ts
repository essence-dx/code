import { NextResponse } from "next/server"

import {
  listDeckCollaboratorsForOwner,
  parseDeckCollaboratorUpsert,
  removeDeckCollaboratorForOwner,
  upsertDeckCollaboratorForOwner,
} from "@/server/decks/collaborators"
import { getCurrentUser } from "@/server/session"

type RouteContext = {
  params: Promise<{
    deckId: string
  }>
}

function collaboratorError(error: unknown) {
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
    const collaborators = await listDeckCollaboratorsForOwner(deckId, user.id)
    if (!collaborators) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ collaborators })
  } catch (error) {
    return collaboratorError(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const input = parseDeckCollaboratorUpsert(
    await request.json().catch(() => null),
  )
  if (!input) {
    return NextResponse.json({ error: "Invalid collaborator" }, { status: 400 })
  }

  const { deckId } = await context.params

  try {
    const result = await upsertDeckCollaboratorForOwner(deckId, user.id, input)
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ collaborator: result.collaborator })
  } catch (error) {
    return collaboratorError(error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    collaboratorId?: unknown
  }
  if (typeof body.collaboratorId !== "string" || !body.collaboratorId.trim()) {
    return NextResponse.json({ error: "Invalid collaborator" }, { status: 400 })
  }

  const { deckId } = await context.params

  try {
    const deleted = await removeDeckCollaboratorForOwner(
      deckId,
      user.id,
      body.collaboratorId,
    )
    if (deleted === null) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ deleted })
  } catch (error) {
    return collaboratorError(error)
  }
}
