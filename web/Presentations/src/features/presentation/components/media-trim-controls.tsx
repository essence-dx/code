"use client"

import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { normalizeMediaTrimSeconds } from "../media-trim"

type MediaTrimControlsProps = {
  start: number
  end: number
  onChange: (
    patch: Partial<{
      mediaStartSeconds: number
      mediaEndSeconds: number
    }>,
  ) => void
}

export function MediaTrimControls({
  start,
  end,
  onChange,
}: MediaTrimControlsProps) {
  return (
    <div className="grid gap-3 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-muted-foreground">Trim</div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Reset media trim"
          title="Reset media trim"
          onClick={() =>
            onChange({
              mediaStartSeconds: 0,
              mediaEndSeconds: 0,
            })
          }
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Start s
          <Input
            type="number"
            min={0}
            max={86_400}
            step={0.1}
            value={normalizeMediaTrimSeconds(start)}
            onChange={(event) =>
              onChange({
                mediaStartSeconds: normalizeMediaTrimSeconds(
                  Number(event.currentTarget.value),
                ),
              })
            }
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          End s
          <Input
            type="number"
            min={0}
            max={86_400}
            step={0.1}
            value={normalizeMediaTrimSeconds(end)}
            onChange={(event) =>
              onChange({
                mediaEndSeconds: normalizeMediaTrimSeconds(
                  Number(event.currentTarget.value),
                ),
              })
            }
          />
        </label>
      </div>
    </div>
  )
}
