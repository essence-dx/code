import { NextResponse } from "next/server"

import {
  listNotificationsForUser,
  markAllNotificationsRead,
} from "@/server/notifications/repository"
import { getCurrentUser } from "@/server/session"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json(await listNotificationsForUser(user.id))
}

export async function PATCH() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json(await markAllNotificationsRead(user.id))
}
