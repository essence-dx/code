import {
  createDefaultDeck,
  createElement,
  createSlide,
} from "../default-deck"
import type {
  ChartDatum,
  Deck,
  DeckMaster,
  PresentationElement,
  Slide,
} from "../types"

export type ElementSpec = {
  type: PresentationElement["type"]
  patch: Partial<Omit<PresentationElement, "id" | "type">>
}

export type SlideSpec = Partial<Omit<Slide, "id" | "elements">> & {
  elements: ElementSpec[]
}

export type TemplateConfig<Id extends string = string> = {
  id: Id
  name: string
  deckTitle: string
  description: string
  accent: string
  slideCount: number
  theme: Deck["theme"]
  master: Partial<DeckMaster>
  slides: SlideSpec[]
}

export function text(
  content: string,
  patch: ElementSpec["patch"],
): ElementSpec {
  return { type: "text", patch: { content, ...patch } }
}

export function title(
  content: string,
  patch: ElementSpec["patch"],
): ElementSpec {
  return { type: "title", patch: { content, ...patch } }
}

export function shape(patch: ElementSpec["patch"]): ElementSpec {
  return { type: "shape", patch }
}

export function table(
  cells: string[],
  patch: ElementSpec["patch"],
): ElementSpec {
  return {
    type: "table",
    patch: {
      tableCells: cells,
      tableHeaderRow: true,
      tableTotalRow: false,
      tableStyle: "plain",
      tableBandedRows: false,
      tableBandedColumns: false,
      tableFirstColumn: false,
      tableLastColumn: false,
      tableVerticalAlign: "middle",
      background: "#ffffff",
      ...patch,
    },
  }
}

export function chart(
  data: ChartDatum[],
  patch: ElementSpec["patch"],
): ElementSpec {
  return {
    type: "chart",
    patch: {
      chartData: data,
      chartShowLegend: false,
      chartShowValues: true,
      ...patch,
    },
  }
}

export function chartData(items: [string, number, string][]): ChartDatum[] {
  return items.map(([label, value, color]) => ({ label, value, color }))
}

function materializeElement(spec: ElementSpec) {
  return {
    ...createElement(spec.type),
    ...spec.patch,
  }
}

function materializeSlide(spec: SlideSpec, index: number) {
  return {
    ...createSlide(index + 1),
    ...spec,
    elements: spec.elements.map(materializeElement),
  }
}

export function buildDeck(config: TemplateConfig): Deck {
  const base = createDefaultDeck()

  return {
    ...base,
    title: config.deckTitle,
    theme: config.theme,
    master: {
      ...base.master,
      ...config.master,
    },
    slides: config.slides.map(materializeSlide),
    updatedAt: new Date().toISOString(),
  }
}
