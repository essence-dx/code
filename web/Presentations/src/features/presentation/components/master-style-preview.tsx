import {
  masterStylePresetPreview,
  type MasterStylePreset,
} from "../master-style-presets"

const previewDate = new Date("2026-05-15T00:00:00.000Z")

export function MasterStylePreview({ preset }: { preset: MasterStylePreset }) {
  const preview = masterStylePresetPreview(preset, {
    date: previewDate,
    slideCount: 12,
    slideNumber: 3,
  })

  return (
    <span
      aria-hidden="true"
      className="relative block aspect-video w-20 shrink-0 rounded border bg-muted/40"
    >
      <span
        className="absolute bottom-1 left-1 max-w-[34%] truncate text-[6px]"
        style={{ color: preview.color }}
      >
        {preview.left}
      </span>
      <span
        className="absolute bottom-1 left-1/2 max-w-[34%] -translate-x-1/2 truncate text-center text-[6px]"
        style={{ color: preview.color }}
      >
        {preview.center}
      </span>
      <span
        className="absolute right-1 bottom-1 max-w-[28%] truncate text-right text-[6px]"
        style={{ color: preview.color }}
      >
        {preview.right}
      </span>
    </span>
  )
}
