import { NextResponse } from "next/server"

import { openSharedDeckByToken } from "@/server/decks/repository"

type RouteContext = {
  params: Promise<{
    token: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  const body = (await request.json().catch(() => null)) as {
    accessCode?: unknown
  } | null

  if (typeof body?.accessCode !== "string") {
    return NextResponse.json(
      { error: "Access code is required" },
      { status: 400 },
    )
  }

  const { token } = await context.params
  const result = await openSharedDeckByToken(
    token,
    {
      referrer: request.headers.get("referer"),
      userAgent: request.headers.get("user-agent"),
    },
    body.accessCode,
  )

  if (!result) {
    return NextResponse.json(
      { error: "Invalid or expired access code" },
      { status: 401 },
    )
  }

  return NextResponse.json(result)
}
