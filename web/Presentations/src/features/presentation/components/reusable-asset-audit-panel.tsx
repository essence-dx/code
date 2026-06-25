"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { reusableAssetAudit } from "../reusable-asset-audit"
import type { CustomDeckTemplate } from "../custom-deck-templates"
import type { DeckLayoutPreset } from "../types"

type ReusableAssetAuditPanelProps = {
  layoutPresets: DeckLayoutPreset[]
  onDeleteLayoutPreset: (presetId: DeckLayoutPreset["id"]) => void
  onDeleteTemplate: (templateId: string) => void
  templates: CustomDeckTemplate[]
}

function assetTypeLabel(type: "master-layout" | "template") {
  return type === "master-layout" ? "Master layout" : "Template"
}

export function ReusableAssetAuditPanel({
  layoutPresets,
  onDeleteLayoutPreset,
  onDeleteTemplate,
  templates,
}: ReusableAssetAuditPanelProps) {
  const audit = reusableAssetAudit({ layoutPresets, templates, limit: 5 })

  if (!audit.totalAssets) return null

  return (
    <div className="grid gap-2 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Reusable asset audit
        </div>
        <Badge variant={audit.issueCount ? "secondary" : "outline"}>
          {audit.issueCount} issue{audit.issueCount === 1 ? "" : "s"}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <Badge variant="outline">{audit.unusedCount} unused</Badge>
        <Badge variant="outline">{audit.staleCount} stale</Badge>
        <Badge variant="outline">{audit.unpairedTemplateCount} unpaired</Badge>
      </div>
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
                    {assetTypeLabel(issue.assetType)}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[11px]"
                    onClick={() => {
                      if (issue.assetType === "master-layout") {
                        onDeleteLayoutPreset(issue.assetId as DeckLayoutPreset["id"])
                        return
                      }

                      onDeleteTemplate(issue.assetId)
                    }}
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
          Templates and master layouts are current.
        </div>
      )}
    </div>
  )
}
