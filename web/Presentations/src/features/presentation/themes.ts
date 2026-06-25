import type { ThemeName } from "./types"

export const deckThemes: Record<
  ThemeName,
  {
    label: string
    app: string
    canvas: string
    accent: string
  }
> = {
  studio: {
    label: "Studio",
    app: "bg-slate-100 text-slate-950",
    canvas: "#f8fafc",
    accent: "#2563eb",
  },
  midnight: {
    label: "Midnight",
    app: "bg-zinc-950 text-zinc-50",
    canvas: "#111827",
    accent: "#22d3ee",
  },
  paper: {
    label: "Paper",
    app: "bg-stone-100 text-stone-950",
    canvas: "#fffaf0",
    accent: "#16a34a",
  },
  signal: {
    label: "Signal",
    app: "bg-neutral-100 text-neutral-950",
    canvas: "#fef2f2",
    accent: "#dc2626",
  },
}

export const canvasPalette = [
  "#f8fafc",
  "#ffffff",
  "#fff7ed",
  "#eef2ff",
  "#ecfeff",
  "#111827",
  "#1f2937",
]

export const textPalette = [
  "#111827",
  "#374151",
  "#ffffff",
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#9333ea",
]
