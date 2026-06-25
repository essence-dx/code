"use client"

import { Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import {
  themeBundleCleanupAudit,
  type CustomThemeBundle,
} from "../theme-bundles"

type ThemeBundleMaintenancePanelProps = {
  bundles: CustomThemeBundle[]
  onDeleteBundle: (bundleId: CustomThemeBundle["id"]) => void
  onDeleteBundles: (bundleIds: CustomThemeBundle["id"][]) => void
}

function reasonLabel(reason: "duplicate" | "stale" | "unused") {
  if (reason === "duplicate") return "Duplicate"
  if (reason === "stale") return "Stale"
  return "Unused"
}

export function ThemeBundleMaintenancePanel({
  bundles,
  onDeleteBundle,
  onDeleteBundles,
}: ThemeBundleMaintenancePanelProps) {
  const audit = themeBundleCleanupAudit(bundles)
  const staleBundleIds = Array.from(
    new Set(
      audit.issues
        .filter((issue) => issue.reason === "stale")
        .map((issue) => issue.bundleId),
    ),
  )

  if (!audit.totalBundles) return null

  return (
    <div className="grid gap-2 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Theme bundle maintenance
        </div>
        <Badge variant={audit.issueCount ? "secondary" : "outline"}>
          {audit.issueCount} issue{audit.issueCount === 1 ? "" : "s"}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <Badge variant="outline">{audit.unusedCount} unused</Badge>
        <Badge variant="outline">{audit.staleCount} stale</Badge>
        <Badge variant="outline">{audit.duplicateCount} duplicate</Badge>
      </div>
      {staleBundleIds.length ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit gap-2"
          onClick={() => onDeleteBundles(staleBundleIds)}
        >
          <Trash2 className="size-4" />
          Delete stale
        </Button>
      ) : null}
      {audit.issues.length ? (
        <div className="grid gap-1.5">
          {audit.issues.map((issue) => (
            <div
              key={issue.id}
              className="grid gap-1 rounded-md border bg-background px-2 py-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium">
                  {issue.label}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <Badge
                    variant={
                      issue.severity === "warning" ? "secondary" : "outline"
                    }
                  >
                    {reasonLabel(issue.reason)}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[11px]"
                    onClick={() => onDeleteBundle(issue.bundleId)}
                  >
                    Delete
                  </Button>
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {issue.detail}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border bg-background px-2 py-1.5 text-xs text-muted-foreground">
          Saved theme bundles are current.
        </div>
      )}
    </div>
  )
}
