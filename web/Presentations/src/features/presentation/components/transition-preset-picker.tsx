"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

import type { SlideTransition } from "../types"

const transitionPresets: Array<{
  value: SlideTransition
  label: string
}> = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "push", label: "Push" },
  { value: "zoom", label: "Zoom" },
]

type TransitionPresetPickerProps = {
  value: SlideTransition
  onChange: (value: SlideTransition) => void
}

export function TransitionPresetPicker({
  value,
  onChange,
}: TransitionPresetPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {transitionPresets.map((preset) => {
        const isActive = preset.value === value

        return (
          <button
            key={preset.value}
            type="button"
            aria-pressed={isActive}
            className={cn(
              "grid gap-2 rounded-md border bg-background p-2 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive && "border-primary bg-primary/5 ring-1 ring-primary/30",
            )}
            onClick={() => onChange(preset.value)}
          >
            <TransitionSwatch transition={preset.value} active={isActive} />
            <span className="flex items-center justify-between gap-2 text-xs font-medium text-foreground">
              {preset.label}
              {isActive ? <Check className="size-3.5 text-primary" /> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function TransitionSwatch({
  transition,
  active,
}: {
  transition: SlideTransition
  active: boolean
}) {
  return (
    <span className="relative block h-10 overflow-hidden rounded border bg-muted/60">
      <span className="absolute inset-1 rounded-sm border bg-background shadow-sm" />
      {transition === "fade" ? (
        <span className="absolute inset-1 rounded-sm border border-primary/30 bg-primary/20 opacity-60" />
      ) : null}
      {transition === "push" ? (
        <>
          <span className="absolute inset-y-1 left-1 w-7 rounded-sm border bg-background shadow-sm" />
          <span className="absolute inset-y-1 right-1 w-7 rounded-sm border border-primary/30 bg-primary/20" />
        </>
      ) : null}
      {transition === "zoom" ? (
        <span className="absolute left-1/2 top-1/2 h-5 w-8 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-primary/40 bg-primary/20 shadow-sm" />
      ) : null}
      <span
        className={cn(
          "absolute bottom-1 left-1 right-1 h-1 rounded-full bg-muted-foreground/20",
          active && "bg-primary/50",
        )}
      />
    </span>
  )
}
