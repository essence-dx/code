import { AlertTriangle, Cloud, Monitor } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { cloudSyncTestIds } from "../cloud-sync-test-ids"
import type { DeckConflictPreview, DeckVersionPreview } from "../deck-conflict-preview"

type CloudConflictPreviewProps = {
  accessRole?: "owner" | "editor" | "viewer"
  cloudLabel?: string
  localLabel?: string
  loading: boolean
  preview: DeckConflictPreview | null
  title?: string
}

function formatUpdatedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown update time"

  return date.toLocaleString()
}

function VersionCard({
  label,
  version,
  cloud,
  testId,
}: {
  label: string
  version: DeckVersionPreview
  cloud?: boolean
  testId: string
}) {
  return (
    <div className="rounded-md border bg-background p-3" data-testid={testId}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge variant={cloud ? "secondary" : "outline"}>
          {cloud ? <Cloud className="size-3" /> : <Monitor className="size-3" />}
          {label}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {version.slideCount} slides
        </span>
      </div>
      <div className="truncate text-sm font-semibold">{version.title}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        {version.elementCount} objects - {version.theme} -{" "}
        {formatUpdatedAt(version.updatedAt)}
      </div>
    </div>
  )
}

function DifferenceBadge({
  label,
  value,
  active,
  testId,
}: {
  label: string
  value: number | boolean
  active?: boolean
  testId: string
}) {
  const visibleValue = typeof value === "boolean" ? (value ? "Yes" : "No") : value

  return (
    <div
      className={cn(
        "rounded-md border px-2.5 py-2 text-xs",
        active
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "bg-muted/30 text-muted-foreground",
      )}
      data-testid={testId}
    >
      <div className="font-semibold">{visibleValue}</div>
      <div>{label}</div>
    </div>
  )
}

export function CloudConflictPreview({
  accessRole,
  cloudLabel = "Cloud",
  localLabel = "Local",
  loading,
  preview,
  title = "Cloud conflict preview",
}: CloudConflictPreviewProps) {
  if (loading) {
    return (
      <div
        className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
        data-testid={cloudSyncTestIds.conflictPreviewLoading}
      >
        Loading cloud comparison...
      </div>
    )
  }

  if (!preview) {
    return (
      <div
        className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
        data-testid={cloudSyncTestIds.conflictPreviewUnavailable}
      >
        Cloud changed, but the preview could not be loaded. You can still open
        the cloud copy or overwrite it.
      </div>
    )
  }

  return (
    <section
      className="space-y-3 rounded-md border border-amber-300 bg-amber-50/70 p-3"
      data-testid={cloudSyncTestIds.conflictPreviewPanel}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-amber-950">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4" />
          {title}
        </div>
        {accessRole ? <Badge variant="outline">{accessRole}</Badge> : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <VersionCard
          label={localLabel}
          version={preview.local}
          testId={cloudSyncTestIds.conflictPreviewLocalCard}
        />
        <VersionCard
          label={cloudLabel}
          version={preview.cloud}
          cloud
          testId={cloudSyncTestIds.conflictPreviewCloudCard}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <DifferenceBadge
          label="changed"
          value={preview.changedSlides}
          active={preview.changedSlides > 0}
          testId={cloudSyncTestIds.conflictPreviewChangedBadge}
        />
        <DifferenceBadge
          label="local only"
          value={preview.localOnlySlides}
          active={preview.localOnlySlides > 0}
          testId={cloudSyncTestIds.conflictPreviewLocalOnlyBadge}
        />
        <DifferenceBadge
          label="cloud only"
          value={preview.cloudOnlySlides}
          active={preview.cloudOnlySlides > 0}
          testId={cloudSyncTestIds.conflictPreviewCloudOnlyBadge}
        />
        <DifferenceBadge
          label="title/theme"
          value={preview.titleChanged || preview.themeChanged}
          active={preview.titleChanged || preview.themeChanged}
          testId={cloudSyncTestIds.conflictPreviewTitleThemeBadge}
        />
      </div>
    </section>
  )
}
