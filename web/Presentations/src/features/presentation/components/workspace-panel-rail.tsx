"use client"

import {
  PanelLeftOpen,
  PanelRightOpen,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type WorkspacePanelRailProps = {
  className?: string
  label: string
  side: "left" | "right"
  onOpen: () => void
}

function iconForSide(side: WorkspacePanelRailProps["side"]): LucideIcon {
  return side === "left" ? PanelLeftOpen : PanelRightOpen
}

export function WorkspacePanelRail({
  className,
  label,
  side,
  onOpen,
}: WorkspacePanelRailProps) {
  const Icon = iconForSide(side)

  return (
    <aside
      aria-label={label}
      className={cn(
        "hidden w-10 shrink-0 items-start justify-center bg-muted/20 p-1 md:flex",
        side === "left" ? "border-r" : "border-l",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        title={label}
        onClick={onOpen}
      >
        <Icon className="size-4" />
      </Button>
    </aside>
  )
}
