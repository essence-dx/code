"use client"

import { useMemo, useState } from "react"
import {
  Cloud,
  CloudDownload,
  GitCompareArrows,
  RefreshCw,
  Search,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

import { organizeCloudDecks } from "../cloud-deck-browser"
import { cloudDeckShortcutReadiness } from "../recent-cloud-decks"

import { CloudDeckRow } from "./cloud-deck-row"
import type { FileBackstageDialogProps } from "./file-backstage-types"

type FileBackstageCloudDecksProps = Pick<
  FileBackstageDialogProps,
  | "cloudDeckMessage"
  | "cloudDecks"
  | "cloudDecksWorking"
  | "cloudPinnedDeckIds"
  | "cloudSignedIn"
  | "deck"
  | "onForgetRecentCloudDeck"
  | "onOpenRecentCloudDeck"
  | "onRefreshCloudDeckShortcuts"
  | "onToggleCloudDeckPin"
>

export function FileBackstageCloudDecks({
  cloudDeckMessage,
  cloudDecks,
  cloudDecksWorking,
  cloudPinnedDeckIds,
  cloudSignedIn,
  deck,
  onForgetRecentCloudDeck,
  onOpenRecentCloudDeck,
  onRefreshCloudDeckShortcuts,
  onToggleCloudDeckPin,
}: FileBackstageCloudDecksProps) {
  const [cloudSearch, setCloudSearch] = useState("")
  const readiness = useMemo(
    () =>
      cloudDeckShortcutReadiness({
        currentDeckId: deck.id,
        pinnedDeckIds: cloudPinnedDeckIds,
        recentDecks: cloudDecks,
        signedIn: cloudSignedIn,
      }),
    [cloudDecks, cloudPinnedDeckIds, cloudSignedIn, deck.id],
  )
  const organizedCloudDecks = useMemo(
    () =>
      organizeCloudDecks({
        decks: cloudDecks,
        pinnedDeckIds: cloudPinnedDeckIds,
        query: cloudSearch,
        sort: "updated-desc",
      }),
    [cloudDecks, cloudPinnedDeckIds, cloudSearch],
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-1">
            <CardTitle>Recent cloud decks</CardTitle>
            <CardDescription>
              Backstage shortcuts for saved decks, pins, and cloud readiness.
            </CardDescription>
          </div>
          <Badge
            variant={
              readiness.state === "signed-out"
                ? "destructive"
                : readiness.state === "empty"
                  ? "outline"
                  : "secondary"
            }
          >
            <Cloud className="size-3" />
            {readiness.title}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CloudDownload className="mt-0.5 size-4" />
            <span>{readiness.detail}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{readiness.recentCount} recent</Badge>
            <Badge variant="outline">{readiness.pinnedCount} pinned</Badge>
            <Badge variant={readiness.currentDeckTracked ? "secondary" : "outline"}>
              {readiness.currentDeckTracked ? "Current deck tracked" : "Not tracked"}
            </Badge>
          </div>
          {cloudDeckMessage ? (
            <div className="flex items-start gap-2">
              <GitCompareArrows className="mt-0.5 size-4" />
              <span>{cloudDeckMessage}</span>
            </div>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search recent cloud decks"
              className="pl-8"
              placeholder="Search cloud shortcuts"
              value={cloudSearch}
              onChange={(event) => setCloudSearch(event.currentTarget.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={cloudDecksWorking}
            onClick={onRefreshCloudDeckShortcuts}
          >
            <RefreshCw className="size-4" />
            Refresh shortcuts
          </Button>
        </div>

        {organizedCloudDecks.resultCount ? (
          <div className="grid gap-4">
            {organizedCloudDecks.pinnedDecks.length ? (
              <section className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                  Pinned
                </div>
                {organizedCloudDecks.pinnedDecks.map((cloudDeck) => (
                  <CloudDeckRow
                    key={cloudDeck.id}
                    deck={cloudDeck}
                    disabled={!cloudSignedIn || cloudDecksWorking}
                    pinned
                    onForget={onForgetRecentCloudDeck}
                    onOpen={onOpenRecentCloudDeck}
                    onTogglePin={onToggleCloudDeckPin}
                  />
                ))}
              </section>
            ) : null}

            <section className="grid gap-2">
              <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                <span>Recent</span>
                <span>{organizedCloudDecks.otherDecks.length} shown</span>
              </div>
              {organizedCloudDecks.otherDecks.length ? (
                organizedCloudDecks.otherDecks.map((cloudDeck) => (
                  <CloudDeckRow
                    key={cloudDeck.id}
                    deck={cloudDeck}
                    disabled={!cloudSignedIn || cloudDecksWorking}
                    muted
                    pinned={cloudPinnedDeckIds.includes(cloudDeck.id)}
                    onForget={onForgetRecentCloudDeck}
                    onOpen={onOpenRecentCloudDeck}
                    onTogglePin={onToggleCloudDeckPin}
                  />
                ))
              ) : (
                <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  No unpinned cloud shortcuts.
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            {cloudSearch.trim()
              ? "No recent cloud decks match that search."
              : "No recent cloud deck shortcuts yet."}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
