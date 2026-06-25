"use client"

import { useMemo, useState } from "react"
import { HardDrive, ImagePlus, Trash2 } from "lucide-react"

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

import { analyzeDeckAssets, formatBytes } from "../asset-health"
import { usePresentationStore } from "../use-presentation-store"

function healthVariant(issueCount: number) {
  return issueCount ? "destructive" : "secondary"
}

export function AssetHealthPanel() {
  const deck = usePresentationStore((state) => state.deck)
  const cleanUpDeckAssets = usePresentationStore(
    (state) => state.cleanUpDeckAssets,
  )
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const report = useMemo(() => analyzeDeckAssets(deck), [deck])
  const cleanupDisabled =
    !report.reclaimableBytes && !report.duplicateGroups.length

  function cleanUpAssets() {
    const result = cleanUpDeckAssets()

    if (!result.changed) {
      setMessage("Asset library already clean.")
      return
    }

    setMessage(
      `Removed ${result.removedAssets} assets and reclaimed ${formatBytes(
        result.removedBytes,
      )}.`,
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setMessage("")
      }}
    >
      <DialogTrigger
        render={<Button type="button" variant="ghost" size="sm" />}
      >
        <HardDrive className="size-4" />
        Assets
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Asset health</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-5">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Stored</div>
            <div className="text-lg font-semibold">{report.totalAssets}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Used</div>
            <div className="text-lg font-semibold">{report.usedAssets}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Remote</div>
            <div className="text-lg font-semibold">{report.remoteAssets}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Size</div>
            <div className="text-lg font-semibold">
              {formatBytes(report.totalBytes)}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Reclaimable</div>
            <div className="text-lg font-semibold">
              {formatBytes(report.reclaimableBytes)}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant={healthVariant(report.issues.length)}>
            {report.issues.length ? `${report.issues.length} issues` : "Healthy"}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={cleanupDisabled}
            onClick={cleanUpAssets}
          >
            <Trash2 className="size-4" />
            Clean up
          </Button>
        </div>
        {report.issues.length ? (
          <div className="grid gap-2">
            {report.issues.map((issue) => (
              <div
                key={issue.id}
                className="rounded-md border bg-background p-3 text-sm"
              >
                <div className="font-medium">{issue.label}</div>
                <div className="text-muted-foreground">{issue.details}</div>
              </div>
            ))}
          </div>
        ) : null}
        <ScrollArea className="h-56 rounded-md border">
          <div className="space-y-2 p-3">
            {report.largestAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between gap-3 rounded-md border bg-background p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <ImagePlus className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {asset.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {asset.mimeType}
                      {asset.storage === "remote" ? " / remote" : ""}
                    </div>
                  </div>
                </div>
                <Badge variant="outline">{formatBytes(asset.sizeBytes)}</Badge>
              </div>
            ))}
            {!report.largestAssets.length ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No stored image assets.
              </div>
            ) : null}
          </div>
        </ScrollArea>
        {message ? (
          <div className="text-xs text-muted-foreground">{message}</div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
