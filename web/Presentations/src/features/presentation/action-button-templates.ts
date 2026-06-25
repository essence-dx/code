import type { ShapeKind, Slide } from "./types"

export type ActionButtonTemplateId = "first" | "previous" | "next" | "last"

export type ActionButtonStyleVariantId = "solid" | "outline" | "soft" | "dark"

export type ActionButtonTemplate = {
  background: string
  description: string
  foreground: string
  id: ActionButtonTemplateId
  label: string
  radius: number
  shapeKind: ShapeKind
  stroke: string
  text: string
}

export type ActionButtonStyleVariant = {
  description: string
  id: ActionButtonStyleVariantId
  label: string
}

export type ActionButtonInsertPayload = {
  background: string
  foreground: string
  label: string
  linkSlideId: string
  radius: number
  shapeKind: ShapeKind
  stroke: string
}

export const actionButtonStyleVariants: ActionButtonStyleVariant[] = [
  {
    id: "solid",
    label: "Solid",
    description: "Filled button using the preset color",
  },
  {
    id: "outline",
    label: "Outline",
    description: "White button with a strong border",
  },
  {
    id: "soft",
    label: "Soft",
    description: "Light button for calmer navigation controls",
  },
  {
    id: "dark",
    label: "Dark",
    description: "High-contrast button for image-heavy slides",
  },
]

export const actionButtonTemplates: ActionButtonTemplate[] = [
  {
    id: "previous",
    label: "Previous",
    description: "Jump to the previous slide",
    text: "Back",
    background: "#475569",
    foreground: "#ffffff",
    radius: 12,
    shapeKind: "rounded",
    stroke: "#334155",
  },
  {
    id: "next",
    label: "Next",
    description: "Jump to the next slide",
    text: "Next",
    background: "#2563eb",
    foreground: "#ffffff",
    radius: 10,
    shapeKind: "rightArrow",
    stroke: "#1d4ed8",
  },
  {
    id: "first",
    label: "First",
    description: "Jump to the first slide",
    text: "First",
    background: "#0f766e",
    foreground: "#ffffff",
    radius: 12,
    shapeKind: "rounded",
    stroke: "#115e59",
  },
  {
    id: "last",
    label: "Last",
    description: "Jump to the last slide",
    text: "Last",
    background: "#7c3aed",
    foreground: "#ffffff",
    radius: 10,
    shapeKind: "chevron",
    stroke: "#6d28d9",
  },
]

function actionButtonStyleVariant(
  variantId: ActionButtonStyleVariantId = "solid",
) {
  return (
    actionButtonStyleVariants.find((variant) => variant.id === variantId) ??
    actionButtonStyleVariants[0]!
  )
}

export function actionButtonStylePayload(
  template: ActionButtonTemplate,
  variantId: ActionButtonStyleVariantId = "solid",
) {
  const variant = actionButtonStyleVariant(variantId)

  if (variant.id === "outline") {
    return {
      background: "#ffffff",
      foreground: template.stroke,
      radius: Math.max(6, template.radius),
      shapeKind: template.shapeKind,
      stroke: template.stroke,
    } satisfies Omit<ActionButtonInsertPayload, "label" | "linkSlideId">
  }

  if (variant.id === "soft") {
    return {
      background: "#eff6ff",
      foreground: "#1e3a8a",
      radius: Math.max(10, template.radius),
      shapeKind: template.shapeKind,
      stroke: "#bfdbfe",
    } satisfies Omit<ActionButtonInsertPayload, "label" | "linkSlideId">
  }

  if (variant.id === "dark") {
    return {
      background: "#111827",
      foreground: "#f8fafc",
      radius: Math.max(8, template.radius),
      shapeKind: template.shapeKind,
      stroke: "#020617",
    } satisfies Omit<ActionButtonInsertPayload, "label" | "linkSlideId">
  }

  return {
    background: template.background,
    foreground: template.foreground,
    radius: template.radius,
    shapeKind: template.shapeKind,
    stroke: template.stroke,
  } satisfies Omit<ActionButtonInsertPayload, "label" | "linkSlideId">
}

export function actionButtonTargetSlideId(
  templateId: ActionButtonTemplateId,
  slides: Pick<Slide, "id">[],
  currentSlideId: string,
) {
  const currentIndex = slides.findIndex((slide) => slide.id === currentSlideId)
  if (currentIndex < 0 || slides.length < 2) return ""

  const targetIndex =
    templateId === "first"
      ? 0
      : templateId === "last"
        ? slides.length - 1
        : templateId === "previous"
          ? currentIndex - 1
          : currentIndex + 1

  return targetIndex === currentIndex ? "" : (slides[targetIndex]?.id ?? "")
}

export function actionButtonInsertPayload(
  template: ActionButtonTemplate,
  slides: Pick<Slide, "id">[],
  currentSlideId: string,
  variantId: ActionButtonStyleVariantId = "solid",
): ActionButtonInsertPayload | null {
  const linkSlideId = actionButtonTargetSlideId(
    template.id,
    slides,
    currentSlideId,
  )

  if (!linkSlideId) return null
  const style = actionButtonStylePayload(template, variantId)

  return {
    background: style.background,
    foreground: style.foreground,
    label: template.text,
    linkSlideId,
    radius: style.radius,
    shapeKind: style.shapeKind,
    stroke: style.stroke,
  }
}
