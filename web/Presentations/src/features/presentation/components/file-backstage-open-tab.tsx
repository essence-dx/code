"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  FileText,
  FileUp,
  FolderOpen,
  HardDrive,
  ImagePlus,
  Link2,
  Pin,
  PinOff,
  Search,
  Trash2,
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

import {
  organizeRecentLocalDeckFiles,
  type RecentLocalDeckFile,
} from "../recent-local-deck-files"

import { FileBackstageCloudDecks } from "./file-backstage-cloud-decks"
import {
  fileBackstageActionClassName,
  formatBackstageBytes,
  formatBackstageDate,
  type FileBackstageDialogProps,
} from "./file-backstage-types"

type FileBackstageOpenTabProps = Pick<
  FileBackstageDialogProps,
  | "cloudDeckMessage"
  | "cloudDecks"
  | "cloudDecksWorking"
  | "cloudPinnedDeckIds"
  | "cloudSignedIn"
  | "deck"
  | "recentDecks"
  | "onClearRecentDecks"
  | "onClearStaleRecentDecks"
  | "onForgetRecentDeck"
  | "onForgetRecentCloudDeck"
  | "onImportImageSlides"
  | "onImportGoogleSlides"
  | "onImportOutline"
  | "onImportPptx"
  | "onOpenDeck"
  | "onOpenRecentCloudDeck"
  | "onOpenRecentDeck"
  | "onRefreshCloudDeckShortcuts"
  | "onToggleCloudDeckPin"
  | "onToggleRecentDeckPin"
>

type RecentDeckListProps = {
  emptyLabel: string
  recents: RecentLocalDeckFile[]
  stale?: boolean
  title: string
  onForgetRecentDeck: (recentId: string) => void
  onOpenRecentDeck: (recentId: string) => void
  onToggleRecentDeckPin: (recentId: string, pinned: boolean) => void
}

function RecentDeckList({
  emptyLabel,
  recents,
  stale = false,
  title,
  onForgetRecentDeck,
  onOpenRecentDeck,
  onToggleRecentDeckPin,
}: RecentDeckListProps) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          {title}
        </h4>
        <Badge variant="outline">{recents.length}</Badge>
      </div>
      {recents.length ? (
        <div className="grid gap-2">
          {recents.map((recent) => (
            <div
              key={recent.id}
              className="flex items-center gap-2 rounded-md border p-2"
            >
              <Button
                type="button"
                variant="ghost"
                className="h-auto min-w-0 flex-1 justify-start gap-2 px-2 py-1.5 text-left"
                onClick={() => onOpenRecentDeck(recent.id)}
              >
                <FileText className="size-4 text-muted-foreground" />
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate text-sm font-medium">
                    {recent.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    Opened {formatBackstageDate(recent.lastOpenedAt)} -{" "}
                    {formatBackstageBytes(recent.size)}
                  </span>
                </span>
              </Button>
              {recent.pinned ? (
                <Badge variant="secondary">Pinned</Badge>
              ) : stale ? (
                <Badge variant="destructive">Stale</Badge>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={recent.pinned ? "Unpin recent deck" : "Pin recent deck"}
                onClick={() => onToggleRecentDeckPin(recent.id, !recent.pinned)}
              >
                {recent.pinned ? (
                  <PinOff className="size-4" />
                ) : (
                  <Pin className="size-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Forget recent deck"
                onClick={() => onForgetRecentDeck(recent.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      )}
    </div>
  )
}

export function FileBackstageOpenTab({
  cloudDeckMessage,
  cloudDecks,
  cloudDecksWorking,
  cloudPinnedDeckIds,
  cloudSignedIn,
  deck,
  recentDecks,
  onClearRecentDecks,
  onClearStaleRecentDecks,
  onForgetRecentCloudDeck,
  onForgetRecentDeck,
  onImportImageSlides,
  onImportGoogleSlides,
  onImportOutline,
  onImportPptx,
  onOpenDeck,
  onOpenRecentCloudDeck,
  onOpenRecentDeck,
  onRefreshCloudDeckShortcuts,
  onToggleCloudDeckPin,
  onToggleRecentDeckPin,
}: FileBackstageOpenTabProps) {
  const [recentSearch, setRecentSearch] = useState("")
  const groupedRecentDecks = useMemo(
    () => organizeRecentLocalDeckFiles(recentDecks, { query: recentSearch }),
    [recentDecks, recentSearch],
  )
  const staleDeckCount = useMemo(
    () => organizeRecentLocalDeckFiles(recentDecks).stale.length,
    [recentDecks],
  )
  const hasSearch = Boolean(recentSearch.trim())

  return (
    <div className="grid gap-3">
      <Card>
        <CardHeader>
          <CardTitle>Open and import</CardTitle>
          <CardDescription>
            Local deck, presentation, outline, and image-slide entry points.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className={fileBackstageActionClassName}
            onClick={onOpenDeck}
          >
            <FolderOpen className="size-4" />
            Open local deck
          </Button>
          <Button
            type="button"
            variant="outline"
            className={fileBackstageActionClassName}
            onClick={onImportPptx}
          >
            <FileUp className="size-4" />
            Import PPTX or ODP
          </Button>
          <Button
            type="button"
            variant="outline"
            className={fileBackstageActionClassName}
            onClick={onImportGoogleSlides}
          >
            <Link2 className="size-4" />
            Import public Google Slides link
          </Button>
          <Button
            type="button"
            variant="outline"
            className={fileBackstageActionClassName}
            onClick={onImportOutline}
          >
            <FileText className="size-4" />
            Import outline
          </Button>
          <Button
            type="button"
            variant="outline"
            className={fileBackstageActionClassName}
            onClick={onImportImageSlides}
          >
            <ImagePlus className="size-4" />
            Import image slides
          </Button>
        </CardContent>
      </Card>

      <FileBackstageCloudDecks
        cloudDeckMessage={cloudDeckMessage}
        cloudDecks={cloudDecks}
        cloudDecksWorking={cloudDecksWorking}
        cloudPinnedDeckIds={cloudPinnedDeckIds}
        cloudSignedIn={cloudSignedIn}
        deck={deck}
        onForgetRecentCloudDeck={onForgetRecentCloudDeck}
        onOpenRecentCloudDeck={onOpenRecentCloudDeck}
        onRefreshCloudDeckShortcuts={onRefreshCloudDeckShortcuts}
        onToggleCloudDeckPin={onToggleCloudDeckPin}
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent local decks</CardTitle>
          <CardDescription>
            Saved file handles with quick reopen, pinning, and cleanup controls.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {recentDecks.length ? (
            <>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Search recent local decks"
                    className="pl-8"
                    placeholder="Search recent decks"
                    value={recentSearch}
                    onChange={(event) => setRecentSearch(event.currentTarget.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!staleDeckCount}
                  onClick={onClearStaleRecentDecks}
                >
                  <Trash2 className="size-4" />
                  Clear stale
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClearRecentDecks}
                >
                  Clear all
                </Button>
              </div>

              <div className="grid gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <HardDrive className="mt-0.5 size-4" />
                  <span>
                    Recent decks depend on this browser or desktop shell keeping
                    file-handle permission. If a file moved, reopen it from disk.
                  </span>
                </div>
                {staleDeckCount ? (
                  <div className="flex items-start gap-2 text-destructive">
                    <AlertTriangle className="mt-0.5 size-4" />
                    <span>
                      {staleDeckCount} unpinned recent deck
                      {staleDeckCount === 1 ? "" : "s"} older than 30 days can be
                      cleaned.
                    </span>
                  </div>
                ) : null}
              </div>

              {groupedRecentDecks.totalMatches ? (
                <div className="grid gap-4">
                  <RecentDeckList
                    emptyLabel="No pinned recent decks."
                    recents={groupedRecentDecks.pinned}
                    title="Pinned"
                    onForgetRecentDeck={onForgetRecentDeck}
                    onOpenRecentDeck={onOpenRecentDeck}
                    onToggleRecentDeckPin={onToggleRecentDeckPin}
                  />
                  <RecentDeckList
                    emptyLabel="No fresh unpinned recent decks."
                    recents={groupedRecentDecks.recent}
                    title="Recent"
                    onForgetRecentDeck={onForgetRecentDeck}
                    onOpenRecentDeck={onOpenRecentDeck}
                    onToggleRecentDeckPin={onToggleRecentDeckPin}
                  />
                  <RecentDeckList
                    emptyLabel="No stale recent decks."
                    recents={groupedRecentDecks.stale}
                    stale
                    title="Stale"
                    onForgetRecentDeck={onForgetRecentDeck}
                    onOpenRecentDeck={onOpenRecentDeck}
                    onToggleRecentDeckPin={onToggleRecentDeckPin}
                  />
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  {hasSearch
                    ? "No recent local decks match that search."
                    : "No recent local decks."}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              No recent local decks.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
