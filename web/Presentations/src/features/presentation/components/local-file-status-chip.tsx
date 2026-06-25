"use client"

import { Badge } from "@/components/ui/badge"

import type { LocalDeckFileStatus } from "../local-deck-file-state"

type LocalFileStatusChipProps = {
  status: LocalDeckFileStatus
}

function statusVariant(kind: LocalDeckFileStatus["kind"]) {
  if (kind === "clean") return "outline"
  return "secondary"
}

export function LocalFileStatusChip({ status }: LocalFileStatusChipProps) {
  return (
    <div
      className="hidden min-w-0 max-w-56 items-center gap-1.5 text-xs text-muted-foreground lg:flex"
      title={status.detail}
    >
      <Badge variant={statusVariant(status.kind)}>{status.label}</Badge>
      <span className="truncate">{status.fileName}</span>
    </div>
  )
}
