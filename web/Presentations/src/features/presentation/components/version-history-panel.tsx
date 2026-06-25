"use client"

import { useState } from "react"
import { GitCompareArrows, History, RefreshCw, RotateCcw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

import {
  listCloudDeckVersions,
  loadCloudDeckVersion,
  restoreCloudDeckVersion,
  type CloudDeckVersionSummary,
} from "../cloud-api"
import { compareDeckVersions, type DeckConflictPreview } from "../deck-conflict-preview"
import type { Deck } from "../types"
import { CloudConflictPreview } from "./cloud-conflict-preview"

type VersionHistoryPanelProps = {
  accessRole: "owner" | "editor" | "viewer"
  canRestore: boolean
  currentDeck: Deck
  deckId: string
  disabled: boolean
  onRestore: (deck: Deck) => void
}

const versionSourceLabels: Record<CloudDeckVersionSummary["source"], string> = {
  autosave: "Autosave",
  manual: "Manual",
  restore: "Restore",
}

function formatVersionDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function VersionHistoryPanel({
  accessRole,
  canRestore,
  currentDeck,
  deckId,
  disabled,
  onRestore,
}: VersionHistoryPanelProps) {
  const [open, setOpen] = useState(false)
  const [versions, setVersions] = useState<CloudDeckVersionSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(
    null,
  )
  const [comparingVersionId, setComparingVersionId] = useState<string | null>(
    null,
  )
  const [comparison, setComparison] = useState<DeckConflictPreview | null>(null)
  const [message, setMessage] = useState("")

  async function refreshVersions() {
    setLoading(true)
    setMessage("")
    try {
      setVersions(await listCloudDeckVersions(deckId))
      setComparison(null)
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load versions",
      )
    } finally {
      setLoading(false)
    }
  }

  async function restoreVersion(versionId: string) {
    setRestoringVersionId(versionId)
    setMessage("")
    try {
      const restoredDeck = await restoreCloudDeckVersion(deckId, versionId)
      onRestore(restoredDeck)
      setOpen(false)
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not restore version",
      )
    } finally {
      setRestoringVersionId(null)
    }
  }

  async function compareVersion(versionId: string) {
    setComparingVersionId(versionId)
    setMessage("")
    try {
      const versionDeck = await loadCloudDeckVersion(deckId, versionId)
      setComparison(compareDeckVersions(currentDeck, versionDeck))
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not compare version",
      )
    } finally {
      setComparingVersionId(null)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          void refreshVersions()
        }
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" variant="ghost" size="sm" disabled={disabled} />
        }
      >
        <History className="size-4" />
        Versions
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{versions.length} saved versions</Badge>
            <Badge variant={accessRole === "owner" ? "secondary" : "outline"}>
              {accessRole}
            </Badge>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || Boolean(restoringVersionId)}
            onClick={() => void refreshVersions()}
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
        <ScrollArea className="h-80 rounded-md border">
          <div className="space-y-2 p-3">
            {versions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between gap-3 rounded-md border bg-background p-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="truncate text-sm font-medium">
                    {version.title}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatVersionDate(version.createdAt)}</span>
                    <span>{version.slideCount} slides</span>
                    <Badge variant="outline">
                      {versionSourceLabels[version.source]}
                    </Badge>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      loading ||
                      Boolean(restoringVersionId) ||
                      Boolean(comparingVersionId)
                    }
                    onClick={() => void compareVersion(version.id)}
                  >
                    <GitCompareArrows className="size-4" />
                    {comparingVersionId === version.id ? "Comparing" : "Compare"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      !canRestore || loading || Boolean(restoringVersionId)
                    }
                    title={
                      canRestore
                        ? "Restore this version"
                        : "Viewer access can compare versions but cannot restore"
                    }
                    onClick={() => void restoreVersion(version.id)}
                  >
                    <RotateCcw className="size-4" />
                    {restoringVersionId === version.id
                      ? "Restoring"
                      : "Restore"}
                  </Button>
                </div>
              </div>
            ))}
            {!versions.length ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                {loading ? "Loading versions..." : "No saved versions yet."}
              </div>
            ) : null}
          </div>
        </ScrollArea>
        {comparison ? (
          <CloudConflictPreview
            cloudLabel="Saved version"
            localLabel="Current deck"
            loading={false}
            preview={comparison}
            title="Version comparison"
          />
        ) : null}
        {message ? (
          <div className="text-xs text-muted-foreground">{message}</div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
