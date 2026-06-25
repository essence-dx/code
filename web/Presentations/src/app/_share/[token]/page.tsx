import { notFound } from "next/navigation"
import { headers } from "next/headers"

import { SharedDeckAccessGate } from "@/features/presentation/components/shared-deck-access-gate"
import { SharedDeckViewer } from "@/features/presentation/components/shared-deck-viewer"
import {
  getSharedDeckAccessByToken,
  openSharedDeckByToken,
} from "@/server/decks/repository"

export const dynamic = "force-dynamic"

type SharePageProps = {
  params: Promise<{
    token: string
  }>
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params
  const requestHeaders = await headers()
  const access = await getSharedDeckAccessByToken(token)

  if (!access) {
    notFound()
  }

  if (access.requiresAccessCode) {
    return <SharedDeckAccessGate token={token} />
  }

  const result = await openSharedDeckByToken(token, {
    referrer: requestHeaders.get("referer"),
    userAgent: requestHeaders.get("user-agent"),
  })

  if (!result) {
    notFound()
  }

  return (
    <SharedDeckViewer
      allowDownloads={result.allowDownloads}
      deck={result.deck}
    />
  )
}
