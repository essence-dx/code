"use client"

import { useEffect, useRef, useState } from "react"
import {
  Cloud,
  CloudDownload,
  CloudUpload,
  GitCompareArrows,
  History,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { authClient } from "@/lib/auth-client"

import {
  cloudDeckSortLabels,
  organizeCloudDecks,
  type CloudDeckSort,
} from "../cloud-deck-browser"
import {
  deleteCloudDeck,
  listCloudDecks,
  loadCloudDeck,
  mergeCloudDeck,
  saveCloudDeck,
  type CloudDeckSummary,
} from "../cloud-api"
import { cloudSyncTestIds } from "../cloud-sync-test-ids"
import {
  cloudDeckOpenedEventName,
  isCloudDeckOpenedEvent,
} from "../cloud-sync-events"
import {
  compareDeckVersions,
  type DeckConflictPreview as DeckConflictPreviewData,
} from "../deck-conflict-preview"
import {
  mergeDeckVersions,
  type DeckMergeResult,
} from "../deck-merge"
import {
  forgetPinnedCloudDeck,
  forgetRecentCloudDeck,
  readPinnedCloudDeckIds,
  readRecentCloudDecks,
  rememberRecentCloudDeck,
  togglePinnedCloudDeck,
} from "../recent-cloud-decks"
import type { Deck } from "../types"
import { usePresentationStore } from "../use-presentation-store"
import { CloudDeckRow } from "./cloud-deck-row"
import { CloudConflictPreview } from "./cloud-conflict-preview"
import { CloudMergeReview } from "./cloud-merge-review"
import { DeckSharePanel } from "./deck-share-panel"
import { VersionHistoryPanel } from "./version-history-panel"

type SyncState = "idle" | "working" | "saved" | "error"

const AUTOSAVE_DELAY_MS = 2500
const CONFLICT_MESSAGE =
  "Cloud deck changed. Open the cloud copy before saving again."

type MergeCandidate = {
  cloudUpdatedAt: string
  result: DeckMergeResult
}

export function CloudSyncPanel() {
  const { data: session } = authClient.useSession()
  const userId = session?.user?.id
  const deck = usePresentationStore((state) => state.deck)
  const replaceDeck = usePresentationStore((state) => state.replaceDeck)
  const [open, setOpen] = useState(false)
  const [syncState, setSyncState] = useState<SyncState>("idle")
  const [message, setMessage] = useState("")
  const [decks, setDecks] = useState<CloudDeckSummary[]>([])
  const [recentDecks, setRecentDecks] = useState<CloudDeckSummary[]>([])
  const [currentAccessRole, setCurrentAccessRole] =
    useState<CloudDeckSummary["accessRole"]>("owner")
  const [currentOwnerName, setCurrentOwnerName] =
    useState<CloudDeckSummary["ownerName"]>(null)
  const [pinnedDeckIds, setPinnedDeckIds] = useState<string[]>([])
  const [deckQuery, setDeckQuery] = useState("")
  const [deckSort, setDeckSort] = useState<CloudDeckSort>("updated-desc")
  const [autosaveEnabled, setAutosaveEnabled] = useState(true)
  const [conflictDeckId, setConflictDeckId] = useState<string | null>(null)
  const [conflictPreview, setConflictPreview] =
    useState<DeckConflictPreviewData | null>(null)
  const [mergeCandidate, setMergeCandidate] = useState<MergeCandidate | null>(
    null,
  )
  const [conflictPreviewLoading, setConflictPreviewLoading] = useState(false)
  const autosaveReadyRef = useRef(false)
  const baseDeckRef = useRef<Deck | null>(null)
  const lastSavedLocalUpdatedAtRef = useRef(deck.updatedAt)
  const cloudVersionRef = useRef<{
    deckId: string
    updatedAt: string
  } | null>(null)

  const disabled = !session?.user || syncState === "working"
  const knownUpdatedAt =
    cloudVersionRef.current?.deckId === deck.id
      ? cloudVersionRef.current.updatedAt
      : undefined
  const currentDeckSaved = cloudVersionRef.current?.deckId === deck.id
  const canWriteCurrentDeck = currentAccessRole !== "viewer"
  const canManageCurrentDeck = currentAccessRole === "owner"
  const conflictDifferenceCount = conflictPreview
    ? conflictPreview.changedSlides +
      conflictPreview.localOnlySlides +
      conflictPreview.cloudOnlySlides +
      Number(conflictPreview.titleChanged || conflictPreview.themeChanged)
    : 0
  const mergeConflictCount =
    mergeCandidate?.result.status === "conflict"
      ? mergeCandidate.result.conflicts.length
      : 0
  const { pinnedDecks, otherDecks, resultCount } = organizeCloudDecks({
    decks,
    pinnedDeckIds,
    query: deckQuery,
    sort: deckSort,
  })

  function deckSummaryForId(deckId: string) {
    return (
      decks.find((item) => item.id === deckId) ??
      recentDecks.find((item) => item.id === deckId) ??
      null
    )
  }

  function rememberSavedDeck(
    savedDeck: typeof deck,
    localUpdatedAt: string,
    access: Pick<CloudDeckSummary, "accessRole" | "ownerName"> = {
      accessRole: currentAccessRole,
      ownerName: currentOwnerName,
    },
  ) {
    baseDeckRef.current = savedDeck
    cloudVersionRef.current = {
      deckId: savedDeck.id,
      updatedAt: savedDeck.updatedAt,
    }
    lastSavedLocalUpdatedAtRef.current = localUpdatedAt
    setCurrentAccessRole(access.accessRole)
    setCurrentOwnerName(access.ownerName)
    setRecentDecks((items) => rememberRecentCloudDeck(savedDeck, items, access))
  }

  function clearConflictState() {
    setConflictDeckId(null)
    setConflictPreview(null)
    setMergeCandidate(null)
  }

  function handleSyncError(error: unknown, fallback: string) {
    const text = error instanceof Error ? error.message : fallback

    if (text === CONFLICT_MESSAGE) {
      setConflictDeckId(deck.id)
      void loadConflictPreview(deck.id)
      setAutosaveEnabled(false)
    }

    setSyncState("error")
    setMessage(text)
  }

  async function loadConflictPreview(deckId: string) {
    setConflictPreviewLoading(true)
    try {
      const cloudDeck = await loadCloudDeck(deckId)
      setConflictPreview(compareDeckVersions(deck, cloudDeck))
      setMergeCandidate(
        baseDeckRef.current?.id === deckId
          ? {
              cloudUpdatedAt: cloudDeck.updatedAt,
              result: mergeDeckVersions({
                baseDeck: baseDeckRef.current,
                cloudDeck,
                localDeck: deck,
              }),
            }
          : null,
      )
    } catch {
      setConflictPreview(null)
      setMergeCandidate(null)
    } finally {
      setConflictPreviewLoading(false)
    }
  }

  useEffect(() => {
    setRecentDecks(readRecentCloudDecks())
    setPinnedDeckIds(readPinnedCloudDeckIds())
  }, [])

  useEffect(() => {
    function handleCloudDeckOpened(event: Event) {
      if (!isCloudDeckOpenedEvent(event)) return

      const { access, deck: openedDeck } = event.detail

      baseDeckRef.current = openedDeck
      cloudVersionRef.current = {
        deckId: openedDeck.id,
        updatedAt: openedDeck.updatedAt,
      }
      lastSavedLocalUpdatedAtRef.current = openedDeck.updatedAt
      setCurrentAccessRole(access.accessRole)
      setCurrentOwnerName(access.ownerName)
      setRecentDecks((items) => rememberRecentCloudDeck(openedDeck, items, access))
      setConflictDeckId(null)
      setConflictPreview(null)
      setMergeCandidate(null)
      setSyncState("idle")
      setMessage("Opened from backstage")
    }

    window.addEventListener(cloudDeckOpenedEventName, handleCloudDeckOpened)
    return () =>
      window.removeEventListener(cloudDeckOpenedEventName, handleCloudDeckOpened)
  }, [])

  useEffect(() => {
    if (!session?.user || !autosaveEnabled || !canWriteCurrentDeck) {
      autosaveReadyRef.current = false
      return
    }

    if (!autosaveReadyRef.current) {
      autosaveReadyRef.current = true
      lastSavedLocalUpdatedAtRef.current = deck.updatedAt
      return
    }

    if (lastSavedLocalUpdatedAtRef.current === deck.updatedAt) {
      return
    }

    setSyncState("working")
    setMessage("Autosaving...")
    const localUpdatedAt = deck.updatedAt
    const timeout = window.setTimeout(() => {
      void saveCloudDeck(deck, {
        knownUpdatedAt:
          cloudVersionRef.current?.deckId === deck.id
            ? cloudVersionRef.current.updatedAt
            : undefined,
        source: "autosave",
      })
        .then((savedDeck) => {
          rememberSavedDeck(savedDeck, localUpdatedAt)
          setSyncState("saved")
          setMessage("Autosaved")
        })
        .catch((error) => {
          handleSyncError(error, "Autosave failed")
        })
    }, AUTOSAVE_DELAY_MS)

    return () => window.clearTimeout(timeout)
  }, [autosaveEnabled, canWriteCurrentDeck, deck, userId])

  async function refreshDecks() {
    setSyncState("working")
    setMessage("")
    try {
      setDecks(await listCloudDecks())
      setSyncState("idle")
    } catch (error) {
      setSyncState("error")
      setMessage(error instanceof Error ? error.message : "Could not load decks")
    }
  }

  async function saveDeck() {
    if (!canWriteCurrentDeck) {
      setSyncState("error")
      setMessage("Viewers cannot save this deck")
      return
    }

    setSyncState("working")
    setMessage("")
    try {
      const savedDeck = await saveCloudDeck(deck, {
        knownUpdatedAt,
        source: "manual",
      })
      rememberSavedDeck(savedDeck, savedDeck.updatedAt, {
        accessRole: currentDeckSaved ? currentAccessRole : "owner",
        ownerName: currentDeckSaved ? currentOwnerName : null,
      })
      replaceDeck(savedDeck)
      clearConflictState()
      setSyncState("saved")
      setMessage("Saved")
    } catch (error) {
      handleSyncError(error, "Could not save")
    }
  }

  async function overwriteCloudDeck() {
    if (!canWriteCurrentDeck) {
      setSyncState("error")
      setMessage("Viewers cannot overwrite this deck")
      return
    }

    setSyncState("working")
    setMessage("Overwriting cloud...")
    try {
      const savedDeck = await saveCloudDeck(deck, { source: "manual" })
      rememberSavedDeck(savedDeck, savedDeck.updatedAt)
      replaceDeck(savedDeck)
      clearConflictState()
      setAutosaveEnabled(true)
      setSyncState("saved")
      setMessage("Cloud overwritten")
    } catch (error) {
      handleSyncError(error, "Could not overwrite cloud deck")
    }
  }

  async function openDeck(deckId: string) {
    setSyncState("working")
    setMessage("")
    try {
      const summary = deckSummaryForId(deckId)
      const cloudDeck = await loadCloudDeck(deckId)
      rememberSavedDeck(cloudDeck, cloudDeck.updatedAt, {
        accessRole: summary?.accessRole ?? "owner",
        ownerName: summary?.ownerName ?? null,
      })
      replaceDeck(cloudDeck)
      clearConflictState()
      setSyncState("idle")
      setOpen(false)
    } catch (error) {
      handleSyncError(error, "Could not open")
    }
  }

  async function removeDeck(deckId: string) {
    setSyncState("working")
    setMessage("")
    try {
      await deleteCloudDeck(deckId)
      setDecks((items) => items.filter((item) => item.id !== deckId))
      if (cloudVersionRef.current?.deckId === deckId) {
        cloudVersionRef.current = null
      }
      if (baseDeckRef.current?.id === deckId) {
        baseDeckRef.current = null
      }
      setRecentDecks((items) => forgetRecentCloudDeck(deckId, items))
      setPinnedDeckIds((items) => forgetPinnedCloudDeck(deckId, items))
      if (conflictDeckId === deckId) {
        clearConflictState()
      }
      setSyncState("idle")
    } catch (error) {
      handleSyncError(error, "Could not delete")
    }
  }

  function togglePinnedDeck(deckId: string) {
    setPinnedDeckIds((items) => togglePinnedCloudDeck(deckId, items))
  }

  function restoreVersion(restoredDeck: typeof deck) {
    rememberSavedDeck(restoredDeck, restoredDeck.updatedAt)
    replaceDeck(restoredDeck)
    clearConflictState()
    setAutosaveEnabled(true)
    setSyncState("saved")
    setMessage("Version restored")
  }

  async function mergeCloudChanges() {
    if (!canWriteCurrentDeck) {
      setSyncState("error")
      setMessage("Viewers cannot merge cloud changes")
      return
    }

    if (
      !conflictDeckId ||
      !baseDeckRef.current ||
      !mergeCandidate ||
      mergeCandidate.result.status !== "merged"
    ) {
      setSyncState("error")
      setMessage("Automatic merge is blocked by conflicting edits")
      return
    }

    setSyncState("working")
    setMessage("Merging changes...")

    try {
      const result = await mergeCloudDeck(conflictDeckId, {
        baseDeck: baseDeckRef.current,
        localDeck: deck,
      })

      if (result.status === "conflict") {
        setMergeCandidate({
          cloudUpdatedAt: mergeCandidate.cloudUpdatedAt,
          result,
        })
        setSyncState("error")
        setMessage("Merge needs manual choices")
        return
      }

      rememberSavedDeck(result.deck, result.deck.updatedAt)
      replaceDeck(result.deck)
      clearConflictState()
      setAutosaveEnabled(true)
      setSyncState("saved")
      setMessage("Merged and saved")
    } catch (error) {
      handleSyncError(error, "Could not merge cloud changes")
    }
  }

  return (
    <div className="flex items-center gap-2" data-testid={cloudSyncTestIds.root}>
      <label className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
        <Switch
          size="sm"
          checked={autosaveEnabled}
          disabled={
            !session?.user || !canWriteCurrentDeck || syncState === "working"
          }
          data-testid={cloudSyncTestIds.autosaveToggle}
          onCheckedChange={setAutosaveEnabled}
        />
        Autosave
      </label>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || !canWriteCurrentDeck}
        data-testid={cloudSyncTestIds.saveButton}
        onClick={() => void saveDeck()}
      >
        <CloudUpload className="size-4" />
        Save
      </Button>
      <VersionHistoryPanel
        accessRole={currentAccessRole}
        canRestore={canWriteCurrentDeck}
        currentDeck={deck}
        deckId={deck.id}
        disabled={!session?.user || syncState === "working"}
        onRestore={restoreVersion}
      />
      <DeckSharePanel
        deckId={deck.id}
        canShare={Boolean(
          session?.user && currentDeckSaved && canManageCurrentDeck,
        )}
        disabled={!session?.user || syncState === "working"}
      />
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (nextOpen && session?.user) {
            void refreshDecks()
            if (conflictDeckId) {
              void loadConflictPreview(conflictDeckId)
            }
          }
        }}
      >
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!session?.user}
              data-testid={cloudSyncTestIds.openDialogButton}
            />
          }
        >
          <CloudDownload className="size-4" />
          Open
        </DialogTrigger>
        <DialogContent
          className="sm:max-w-2xl"
          data-testid={cloudSyncTestIds.dialog}
        >
          <DialogHeader>
            <DialogTitle>Cloud decks</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <Badge variant={session?.user ? "secondary" : "destructive"}>
              <Cloud className="size-3" />
              {session?.user ? session.user.email : "Sign in required"}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!session?.user || syncState === "working"}
              data-testid={cloudSyncTestIds.refreshButton}
              onClick={() => void refreshDecks()}
            >
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </div>
          {conflictDeckId ? (
            <div className="space-y-2">
              <CloudConflictPreview
                accessRole={currentAccessRole}
                loading={conflictPreviewLoading}
                preview={conflictPreview}
              />
              <CloudMergeReview
                accessRole={currentAccessRole}
                disabled={syncState === "working"}
                result={mergeCandidate?.result ?? null}
                onMerge={() => void mergeCloudChanges()}
              />
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={deckQuery}
                onChange={(event) => setDeckQuery(event.target.value)}
                placeholder="Search cloud decks"
                className="pl-8"
                data-testid={cloudSyncTestIds.searchInput}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid={cloudSyncTestIds.sortButton}
                  />
                }
              >
                <SlidersHorizontal className="size-4" />
                {cloudDeckSortLabels[deckSort]}
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-44" align="end">
                <DropdownMenuRadioGroup
                  value={deckSort}
                  onValueChange={(value) =>
                    setDeckSort(value as CloudDeckSort)
                  }
                >
                  {Object.entries(cloudDeckSortLabels).map(([value, label]) => (
                    <DropdownMenuRadioItem key={value} value={value}>
                      {label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {recentDecks.length ? (
            <section
              className="grid gap-2"
              data-testid={cloudSyncTestIds.recentDecksSection}
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <History className="size-3.5" />
                Recent
              </div>
              <div className="grid gap-2">
                {recentDecks.map((item) => (
                  <CloudDeckRow
                    key={item.id}
                    deck={item}
                    disabled={syncState === "working"}
                    muted
                    pinned={pinnedDeckIds.includes(item.id)}
                    onForget={(deckId) =>
                      setRecentDecks((items) =>
                        forgetRecentCloudDeck(deckId, items),
                      )
                    }
                    onOpen={(deckId) => void openDeck(deckId)}
                    onTogglePin={togglePinnedDeck}
                  />
                ))}
              </div>
            </section>
          ) : null}
          <ScrollArea className="h-80 rounded-md border">
            <div className="space-y-2 p-3">
              {pinnedDecks.length ? (
                <section
                  className="space-y-2"
                  data-testid={cloudSyncTestIds.pinnedDecksSection}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Pinned
                  </div>
                  {pinnedDecks.map((item) => (
                    <CloudDeckRow
                      key={item.id}
                      deck={item}
                      disabled={syncState === "working"}
                      pinned
                      onDelete={
                        item.accessRole === "owner"
                          ? (deckId) => void removeDeck(deckId)
                          : undefined
                      }
                      onOpen={(deckId) => void openDeck(deckId)}
                      onTogglePin={togglePinnedDeck}
                    />
                  ))}
                </section>
              ) : null}
              {otherDecks.length ? (
                <section
                  className="space-y-2"
                  data-testid={cloudSyncTestIds.allDecksSection}
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>All cloud decks</span>
                    <span>{otherDecks.length} shown</span>
                  </div>
                  {otherDecks.map((item) => (
                    <CloudDeckRow
                      key={item.id}
                      deck={item}
                      disabled={syncState === "working"}
                      pinned={pinnedDeckIds.includes(item.id)}
                      onDelete={
                        item.accessRole === "owner"
                          ? (deckId) => void removeDeck(deckId)
                          : undefined
                      }
                      onOpen={(deckId) => void openDeck(deckId)}
                      onTogglePin={togglePinnedDeck}
                    />
                  ))}
                </section>
              ) : null}
              {!decks.length ? (
                <div
                  className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground"
                  data-testid={cloudSyncTestIds.emptyDecks}
                >
                  No saved decks yet.
                </div>
              ) : null}
              {decks.length && !resultCount ? (
                <div
                  className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground"
                  data-testid={cloudSyncTestIds.searchEmpty}
                >
                  No cloud decks match the current search.
                </div>
              ) : null}
            </div>
          </ScrollArea>
          {message ? (
            <div
              className="text-xs text-muted-foreground"
              data-testid={cloudSyncTestIds.dialogMessage}
              role="status"
            >
              {message}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      {message && !open ? (
        <span
          className="max-w-28 truncate text-xs text-muted-foreground"
          data-testid={cloudSyncTestIds.compactMessage}
          role="status"
        >
          {message}
        </span>
      ) : null}
      {conflictDeckId && !open ? (
        <div
          className="flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900"
          data-testid={cloudSyncTestIds.compactConflictBanner}
          role="status"
        >
          <GitCompareArrows className="size-3.5" />
          <span className="hidden xl:inline">Cloud changed</span>
          {conflictPreview ? (
            <span className="hidden whitespace-nowrap xl:inline">
              {conflictDifferenceCount} differences
            </span>
          ) : null}
          {mergeConflictCount ? (
            <span className="hidden whitespace-nowrap xl:inline">
              {mergeConflictCount} conflicts
            </span>
          ) : null}
          {mergeCandidate?.result.status === "merged" ? (
            <Button
              type="button"
              size="sm"
              disabled={syncState === "working"}
              data-testid={cloudSyncTestIds.compactMergeButton}
              onClick={() => void mergeCloudChanges()}
            >
              Merge
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={syncState === "working"}
            data-testid={cloudSyncTestIds.compactPreviewButton}
            onClick={() => {
              setOpen(true)
              if (session?.user) {
                void refreshDecks()
              }
              if (conflictDeckId) {
                void loadConflictPreview(conflictDeckId)
              }
            }}
          >
            Preview
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={syncState === "working"}
            data-testid={cloudSyncTestIds.compactOpenCloudButton}
            onClick={() => void openDeck(conflictDeckId)}
          >
            Open cloud
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={syncState === "working"}
            data-testid={cloudSyncTestIds.compactOverwriteButton}
            onClick={() => void overwriteCloudDeck()}
          >
            Overwrite
          </Button>
        </div>
      ) : null}
    </div>
  )
}
