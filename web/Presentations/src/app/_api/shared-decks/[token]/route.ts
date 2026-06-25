import { NextResponse } from "next/server"

import {
  getSharedDeckAccessByToken,
  openSharedDeckByToken,
} from "@/server/decks/repository"

type RouteContext = {
  params: Promise<{
    token: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  const { token } = await context.params
  const access = await getSharedDeckAccessByToken(token)
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (access.requiresAccessCode) {
    return NextResponse.json(
      { error: "Access code required", requiresAccessCode: true },
      { status: 403 },
    )
  }

  const result = await openSharedDeckByToken(token, {
    referrer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
  })
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(result)
}
