"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { DeckPresenceSummary } from "@/features/presence/types"
import { authClient } from "@/lib/auth-client"

import {
  clearDeckPresence,
  createCloudDeckCollaborationEvent,
  heartbeatDeckPresence,
  listCloudDeckCollaborationEvents,
  type CloudDeckCollaborationEvent,
} from "../cloud-api"
import {
  collaborationActivityLabel,
  shouldShowPresenceActivity,
} from "../collaboration-activity"
import { usePresentationStore } from "../use-presentation-store"

const HEARTBEAT_MS = 25_000

function seenLabel(value: string) {
  const elapsed = Math.max(0, Date.now() - Date.parse(value))
  if (elapsed < 10_000) return "now"
  if (elapsed < 60_000) return `${Math.round(elapsed / 1000)}s ago`

  return `${Math.round(elapsed / 60_000)}m ago`
}

export function PresenceIndicator() {
  const { data: session } = authClient.useSession()
  const userId = session?.user?.id
  const deck = usePresentationStore((state) => state.deck)
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const selectedElementIds = usePresentationStore(
    (state) => state.selectedElementIds,
  )
  const slideIdRef = useRef(selectedSlideId)
  const [available, setAvailable] = useState(false)
  const [presences, setPresences] = useState<DeckPresenceSummary[]>([])
  const [events, setEvents] = useState<CloudDeckCollaborationEvent[]>([])
  const lastEventAtRef = useRef<string | null>(null)
  const selectedElementKey = selectedElementIds.join(":")

  const slideTitles = useMemo(
    () => new Map(deck.slides.map((slide) => [slide.id, slide.title])),
    [deck.slides],
  )
  const others = presences.filter((presence) => !presence.isCurrentUser)
  const recentEvents = events
    .filter(
      (event) => event.userId !== userId && shouldShowPresenceActivity(event),
    )
    .slice(-4)
    .reverse()

  useEffect(() => {
    slideIdRef.current = selectedSlideId
  }, [selectedSlideId])

  useEffect(() => {
    if (!userId) {
      setAvailable(false)
      setPresences([])
      return
    }

    let cancelled = false

    async function sendHeartbeat() {
      try {
        const [next, nextEvents] = await Promise.all([
          heartbeatDeckPresence(deck.id, slideIdRef.current),
          listCloudDeckCollaborationEvents(deck.id, lastEventAtRef.current ?? undefined),
        ])
        if (!cancelled) {
          setPresences(next)
          if (nextEvents.length) {
            lastEventAtRef.current = nextEvents.at(-1)?.createdAt ?? null
            setEvents((items) =>
              [...items, ...nextEvents]
                .filter(
                  (event, index, all) =>
                    all.findIndex((item) => item.id === event.id) === index,
                )
                .slice(-20),
            )
          }
          setAvailable(true)
        }
      } catch {
        if (!cancelled) {
          setPresences([])
          setAvailable(false)
        }
      }
    }

    void sendHeartbeat()
    const interval = window.setInterval(() => void sendHeartbeat(), HEARTBEAT_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      lastEventAtRef.current = null
      void clearDeckPresence(deck.id).catch(() => undefined)
    }
  }, [deck.id, userId])

  useEffect(() => {
    if (!userId || !available || !selectedSlideId) {
      return
    }

    const timeout = window.setTimeout(() => {
      void createCloudDeckCollaborationEvent(deck.id, {
        clientEventId: `selection:${Date.now()}:${selectedElementIds.length}`,
        payload: { elementIds: selectedElementIds, slideId: selectedSlideId },
        type: "selection",
      }).catch(() => undefined)
    }, 400)

    return () => window.clearTimeout(timeout)
  }, [available, deck.id, selectedElementIds, selectedElementKey, selectedSlideId, userId])

  if (!available) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            title="Deck presence"
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2"
          />
        }
      >
        <Users className="size-4" />
        Live
        {others.length ? (
          <Badge variant="secondary" className="h-5 px-1.5">
            {others.length}
          </Badge>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Active now</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {presences.map((presence) => {
          const slideTitle = presence.slideId
            ? slideTitles.get(presence.slideId)
            : null

          return (
            <DropdownMenuItem key={presence.userId} className="items-start gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                {presence.initials}
              </span>
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-xs font-semibold">
                    {presence.name}
                    {presence.isCurrentUser ? " (you)" : ""}
                  </span>
                  <Badge
                    variant={
                      presence.role === "owner" ? "secondary" : "outline"
                    }
                    className="h-4 shrink-0 px-1 text-[10px]"
                  >
                    {presence.role}
                  </Badge>
                </span>
                <span className="line-clamp-1 block text-[11px] text-muted-foreground">
                  {slideTitle ?? "Current deck"} - {seenLabel(presence.lastSeenAt)}
                </span>
              </span>
            </DropdownMenuItem>
          )
        })}
        {recentEvents.length ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Recent activity</DropdownMenuLabel>
            {recentEvents.map((event) => {
              const slideId =
                typeof event.payload.slideId === "string"
                  ? event.payload.slideId
                  : null
              const slideTitle = slideId ? slideTitles.get(slideId) : null

              return (
                <DropdownMenuItem
                  key={event.id}
                  className="items-start gap-2 text-xs"
                >
                  <Badge variant="outline" className="mt-0.5">
                    {event.role}
                  </Badge>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {collaborationActivityLabel(event)}
                    </span>
                    <span className="line-clamp-1 block text-[11px] text-muted-foreground">
                      {slideTitle ?? "Current deck"} - {seenLabel(event.createdAt)}
                    </span>
                  </span>
                </DropdownMenuItem>
              )
            })}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
