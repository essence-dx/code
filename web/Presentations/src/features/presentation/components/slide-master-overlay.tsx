"use client"

import { masterFooterParts, masterHasVisibleContent } from "../slide-master"
import { fontFamilyStyle } from "../font-pairs"
import type { DeckMaster } from "../types"

type SlideMasterOverlayProps = {
  master: DeckMaster
  slideNumber: number
  slideCount: number
  scale?: number
}

export function SlideMasterOverlay({
  master,
  slideNumber,
  slideCount,
  scale = 1,
}: SlideMasterOverlayProps) {
  if (!masterHasVisibleContent(master)) return null

  const parts = masterFooterParts({ master, slideNumber, slideCount })
  const fontSize = Math.max(4, master.fontSize * scale)

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-[6%] bottom-[4%] grid grid-cols-3 items-end gap-3 truncate"
      style={{
        color: master.color,
        fontFamily: fontFamilyStyle(master.fontFamily),
        fontSize,
        lineHeight: 1.15,
      }}
    >
      <span className="min-w-0 truncate text-left">{parts.left}</span>
      <span className="min-w-0 truncate text-center">{parts.center}</span>
      <span className="min-w-0 truncate text-right">{parts.right}</span>
    </div>
  )
}
