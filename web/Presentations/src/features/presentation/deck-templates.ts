import { lessonTemplate } from "./templates/lesson-template"
import { pitchTemplate } from "./templates/pitch-template"
import { projectUpdateTemplate } from "./templates/project-update-template"
import { buildDeck, type TemplateConfig } from "./templates/template-builders"
import {
  applyTemplateThemeVariant,
  type TemplateThemeVariantId,
} from "./template-theme-variants"

export type DeckTemplateId = "pitch" | "project-update" | "lesson"

export type DeckTemplate = {
  id: DeckTemplateId
  name: string
  description: string
  accent: string
  slideCount: number
}

const templateConfigs = {
  pitch: pitchTemplate,
  "project-update": projectUpdateTemplate,
  lesson: lessonTemplate,
} satisfies Record<DeckTemplateId, TemplateConfig>

export const deckTemplates: DeckTemplate[] = Object.values(templateConfigs).map(
  ({ id, name, description, accent, slideCount }) => ({
    id,
    name,
    description,
    accent,
    slideCount,
  }),
)

export function createDeckFromTemplate(templateId: DeckTemplateId) {
  return buildDeck(templateConfigs[templateId])
}

export function createDeckFromTemplateVariant(
  templateId: DeckTemplateId,
  variantId: TemplateThemeVariantId,
) {
  return applyTemplateThemeVariant(createDeckFromTemplate(templateId), variantId)
}

export function templatePreviewDeck(
  templateId: DeckTemplateId,
  variantId: TemplateThemeVariantId = "original",
) {
  return createDeckFromTemplateVariant(templateId, variantId)
}
