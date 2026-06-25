import type { PresentationElement } from "./types"

export type StickerTemplateId = "new" | "important" | "idea" | "quote"

export type StickerTemplate = {
  id: StickerTemplateId
  label: string
  description: string
  text: string
  fill: string
  stroke: string
  color: string
  shapeKind: PresentationElement["shapeKind"]
}

export const stickerTemplates: StickerTemplate[] = [
  {
    id: "new",
    label: "New",
    description: "Small announcement badge",
    text: "NEW",
    fill: "#dcfce7",
    stroke: "#16a34a",
    color: "#14532d",
    shapeKind: "rounded",
  },
  {
    id: "important",
    label: "Important",
    description: "High-priority callout",
    text: "Important",
    fill: "#fee2e2",
    stroke: "#ef4444",
    color: "#7f1d1d",
    shapeKind: "rounded",
  },
  {
    id: "idea",
    label: "Idea",
    description: "Idea marker for concepts",
    text: "Idea",
    fill: "#fef9c3",
    stroke: "#eab308",
    color: "#713f12",
    shapeKind: "ellipse",
  },
  {
    id: "quote",
    label: "Quote",
    description: "Quote label for pull statements",
    text: "Quote",
    fill: "#ede9fe",
    stroke: "#7c3aed",
    color: "#3b0764",
    shapeKind: "diamond",
  },
]
