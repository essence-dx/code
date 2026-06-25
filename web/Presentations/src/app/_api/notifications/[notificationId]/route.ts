import { NextResponse } from "next/server"

import { markNotificationRead } from "@/server/notifications/repository"
import { getCurrentUser } from "@/server/session"

type RouteContext = {
  params: Promise<{
    notificationId: string
  }>
}

export async function PATCH(_request: Request, context: RouteContext) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { notificationId } = await context.params
  const result = await markNotificationRead(user.id, notificationId)
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(result)
}
