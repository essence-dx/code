import { NextResponse } from "next/server"

import { getDeckAssetContentForUser } from "@/server/decks/repository"
import { getCurrentUser } from "@/server/session"

type RouteContext = {
  params: Promise<{
    assetId: string
    deckId: string
  }>
}

function attachmentSafeName(value: string) {
  return value.replace(/["\r\n]/g, "").trim() || "deck-asset"
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { assetId, deckId } = await context.params

  try {
    const asset = await getDeckAssetContentForUser(deckId, assetId, user.id)
    if (!asset) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const body = asset.bytes.buffer.slice(
      asset.bytes.byteOffset,
      asset.bytes.byteOffset + asset.bytes.byteLength,
    ) as ArrayBuffer

    return new Response(body, {
      headers: {
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="${attachmentSafeName(asset.name)}"`,
        "Content-Length": String(asset.bytes.byteLength || asset.sizeBytes),
        "Content-Type": asset.mimeType,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    throw error
  }
}
