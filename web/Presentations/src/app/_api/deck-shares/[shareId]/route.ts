import { NextResponse } from "next/server"

import {
  deleteDeckShareForUser,
  generateShareAccessCode,
  hashShareAccessCode,
  type DeckShareAccessCodePatch,
  updateDeckShareForUser,
} from "@/server/decks/repository"
import { resolveDeckShareUpdate } from "@/server/decks/share-update-policy"
import { getCurrentUser } from "@/server/session"

type RouteContext = {
  params: Promise<{
    shareId: string
  }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    accessCodeAction?: unknown
    allowDownloads?: unknown
    enabled?: unknown
    expiresAt?: unknown
  } | null

  const decision = resolveDeckShareUpdate({ body })

  if (!decision.ok) {
    return NextResponse.json(
      { error: decision.error },
      { status: decision.status },
    )
  }

  const { shareId } = await context.params

  try {
    let generatedAccessCode: string | undefined
    let accessCode: DeckShareAccessCodePatch | null | undefined

    if (decision.patch.accessCodeAction === "generate") {
      generatedAccessCode = generateShareAccessCode()
      accessCode = hashShareAccessCode(generatedAccessCode)
    }
    if (decision.patch.accessCodeAction === "clear") {
      accessCode = null
    }

    const share = await updateDeckShareForUser(shareId, user.id, {
      accessCode,
      allowDownloads: decision.patch.allowDownloads,
      enabled: decision.patch.enabled,
      expiresAt: decision.patch.expiresAt,
    })
    if (!share) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ accessCode: generatedAccessCode, share })
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

  const { shareId } = await context.params

  try {
    const deleted = await deleteDeckShareForUser(shareId, user.id)
    return NextResponse.json({ deleted })
  } catch (error) {
    if (error instanceof Error && error.message === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    throw error
  }
}
