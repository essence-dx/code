import { nanoid } from "nanoid"

import { defaultChartData } from "./chart-formatting"
import { defaultImageCorrections } from "./image-corrections"
import type { OutlineSlideInput } from "./outline-import"
import { defaultDeckMaster } from "./slide-master"
import { defaultTableCells } from "./table-formatting"
import type { Deck, PresentationElement, Slide } from "./types"

function element(
  overrides: Partial<PresentationElement> & Pick<PresentationElement, "type">,
): PresentationElement {
  const { type, ...rest } = overrides

  return {
    id: nanoid(),
    type,
    x: 8,
    y: 12,
    width: 84,
    height: 16,
    content: "",
    fontSize: overrides.type === "title" ? 44 : 24,
    fontFamily: overrides.type === "title" ? "geist" : "system",
    fontWeight: overrides.type === "title" ? 700 : 500,
    textAlign: "left",
    lineHeight: overrides.type === "title" ? 1.05 : 1.2,
    listStyle: "none",
    textColumns: 1,
    textFit: "clip",
    textRanges: [],
    tableRows: 3,
    tableColumns: 3,
    tableCells: defaultTableCells(),
    tableCellMerges: [],
    tableCellStyles: [],
    tableHeaderRow: true,
    tableTotalRow: false,
    tableBorderColor: "#cbd5e1",
    tableOfficeStyleId: "",
    tableOfficeStyleName: "",
    tableStyle: "plain",
    tableBandedRows: false,
    tableBandedColumns: false,
    tableFirstColumn: false,
    tableLastColumn: false,
    tableVerticalAlign: "middle",
    chartType: "bar",
    chartData: defaultChartData(),
    chartSeries: [],
    chartShowLegend: true,
    chartShowValues: true,
    chartAxisColor: "#94a3b8",
    color: "#111827",
    background: "transparent",
    radius: 0,
    shapeKind: "rectangle",
    shapeConnectorControlX: 50,
    shapeConnectorControlY: 50,
    shapeConnectorEndX: 92,
    shapeConnectorEndY: 84,
    shapeConnectorStartX: 8,
    shapeConnectorStartY: 16,
    shapeStrokeColor: "#2563eb",
    shapeStrokeWidth: 2,
    shapeStrokeDash: "solid",
    shapeStartArrowhead: "none",
    shapeEndArrowhead: "none",
    iconName: "sparkle",
    rotation: 0,
    animation: "none",
    animationDurationMs: 500,
    animationDelayMs: 0,
    animationMotionX: 16,
    animationMotionY: 0,
    animationTrigger: "onClick",
    linkUrl: "",
    linkSlideId: "",
    hidden: false,
    locked: false,
    groupId: "",
    placeholderRole: "none",
    assetId: "",
    src: "",
    alt: "",
    fit: "cover",
    mediaStartSeconds: 0,
    mediaEndSeconds: 0,
    mediaCaption: "",
    mediaCaptionCues: [],
    mediaAutoplay: false,
    imageMask: "rectangle",
    imagePositionX: 50,
    imagePositionY: 50,
    ...defaultImageCorrections(),
    ...rest,
  }
}

function slide(overrides: Partial<Slide>): Slide {
  return {
    id: nanoid(),
    title: "Untitled slide",
    sectionTitle: "",
    layout: "title-body",
    background: "#f8fafc",
    transition: "none",
    transitionDurationMs: 350,
    autoAdvanceAfterMs: 0,
    rehearsalDurationMs: 0,
    notes: "",
    comments: [],
    elements: [],
    ...overrides,
  }
}

export function createDefaultDeck(): Deck {
  const now = new Date().toISOString()

  return {
    id: nanoid(),
    title: "Essence presentation",
    theme: "midnight",
    master: defaultDeckMaster,
    assets: [],
    updatedAt: now,
    slides: [
      slide({
        title: "Opening",
        sectionTitle: "Opening",
        layout: "title",
        background: "#111827",
        notes: "Open with the core promise and one concrete example.",
        elements: [
          element({
            type: "title",
            x: 8,
            y: 18,
            width: 78,
            height: 18,
            content: "Build the story clearly",
            color: "#f8fafc",
          }),
          element({
            type: "text",
            x: 9,
            y: 42,
            width: 58,
            height: 12,
            content: "A focused deck editor with real slide state.",
            fontSize: 24,
            fontWeight: 500,
            color: "#cbd5e1",
          }),
        ],
      }),
      slide({
        title: "Plan",
        layout: "title-body",
        background: "#020617",
        elements: [
          element({
            type: "title",
            x: 8,
            y: 10,
            width: 76,
            height: 12,
            content: "The first useful milestone",
            fontSize: 34,
            color: "#f8fafc",
          }),
          element({
            type: "text",
            x: 9,
            y: 31,
            width: 72,
            height: 28,
            content:
              "Slide thumbnails, canvas selection, element editing, notes, import, export, and local persistence.",
            fontSize: 22,
            color: "#cbd5e1",
          }),
        ],
      }),
    ],
  }
}

export function createSlide(index: number): Slide {
  return slide({
    title: `Slide ${index}`,
    layout: "title-body",
    background: "#111827",
    elements: [
      element({
        type: "title",
        content: `Slide ${index}`,
        x: 8,
        y: 10,
        width: 72,
        height: 12,
        fontSize: 34,
        color: "#f8fafc",
      }),
      element({
        type: "text",
        content: "Add your point here.",
        x: 9,
        y: 31,
        width: 68,
        height: 16,
        fontSize: 22,
        color: "#cbd5e1",
      }),
    ],
  })
}

export function createImageSlide(
  index: number,
  input: { src?: string; assetId?: string; alt?: string },
): Slide {
  return slide({
    title: input.alt || `Image slide ${index}`,
    layout: "blank",
    background: "#020617",
    elements: [
      element({
        type: "image",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        assetId: input.assetId ?? "",
        src: input.src ?? "",
        alt: input.alt ?? "Imported image slide",
        fit: "contain",
        background: "#020617",
      }),
    ],
  })
}

export function createOutlineSlide(index: number, input: OutlineSlideInput): Slide {
  return slide({
    title: input.title || `Slide ${index}`,
    layout: input.body ? "title-body" : "title",
    background: "#111827",
    elements: [
      element({
        type: "title",
        content: input.title || `Slide ${index}`,
        x: 8,
        y: 10,
        width: 76,
        height: input.body ? 12 : 18,
        fontSize: input.body ? 34 : 44,
        color: "#f8fafc",
      }),
      ...(input.body
        ? [
            element({
              type: "text",
              content: input.body,
              x: 9,
              y: 30,
              width: 74,
              height: 42,
              fontSize: 22,
              color: "#cbd5e1",
            }),
          ]
        : []),
    ],
  })
}

export function createElement(type: PresentationElement["type"]) {
  if (type === "image") {
    return element({
      type,
      x: 14,
      y: 20,
      width: 48,
      height: 42,
      background: "#e5e7eb",
      alt: "Inserted image",
      fit: "cover",
    })
  }

  if (type === "video") {
    return element({
      type,
      x: 16,
      y: 22,
      width: 58,
      height: 36,
      background: "#020617",
      alt: "Inserted video",
      fit: "contain",
    })
  }

  if (type === "audio") {
    return element({
      type,
      x: 18,
      y: 36,
      width: 42,
      height: 14,
      background: "#0f172a",
      alt: "Inserted audio",
      fit: "contain",
      radius: 8,
    })
  }

  if (type === "shape") {
    return element({
      type,
      x: 20,
      y: 34,
      width: 28,
      height: 18,
      background: "#2563eb",
      shapeKind: "rounded",
      shapeStrokeColor: "#1d4ed8",
      shapeStrokeWidth: 2,
      radius: 8,
    })
  }

  if (type === "icon") {
    return element({
      type,
      x: 18,
      y: 28,
      width: 16,
      height: 16,
      background: "transparent",
      color: "#2563eb",
      iconName: "sparkle",
      shapeStrokeWidth: 2.4,
      alt: "Sparkle icon",
    })
  }

  if (type === "table") {
    return element({
      type,
      x: 14,
      y: 24,
      width: 64,
      height: 32,
      content: "",
      fontSize: 16,
      fontWeight: 500,
      background: "#ffffff",
      tableRows: 3,
      tableColumns: 3,
      tableCells: defaultTableCells(),
      tableCellMerges: [],
      tableCellStyles: [],
      tableHeaderRow: true,
      tableTotalRow: false,
      tableBorderColor: "#cbd5e1",
      tableOfficeStyleId: "",
      tableOfficeStyleName: "",
      tableStyle: "plain",
      tableBandedRows: false,
      tableBandedColumns: false,
      tableFirstColumn: false,
      tableLastColumn: false,
      tableVerticalAlign: "middle",
    })
  }

  if (type === "chart") {
    return element({
      type,
      x: 14,
      y: 22,
      width: 64,
      height: 38,
      content: "",
      fontSize: 15,
      fontWeight: 500,
      background: "#ffffff",
      radius: 8,
      chartType: "bar",
      chartData: defaultChartData(),
      chartSeries: [],
      chartShowLegend: true,
      chartShowValues: true,
      chartAxisColor: "#94a3b8",
    })
  }

  return element({
    type,
    x: type === "title" ? 8 : 12,
    y: type === "title" ? 10 : 36,
    width: type === "title" ? 76 : 56,
    height: type === "title" ? 12 : 16,
    content: type === "title" ? "New title" : "New text",
  })
}

export function createImageElement(input: {
  src?: string
  assetId?: string
  alt?: string
}) {
  return element({
    type: "image",
    x: 14,
    y: 18,
    width: 52,
    height: 42,
    background: "#e5e7eb",
    radius: 8,
    assetId: input.assetId ?? "",
    src: input.src ?? "",
    alt: input.alt ?? "Inserted image",
    fit: "cover",
  })
}

export function createVideoElement(input: { src: string; alt?: string }) {
  return element({
    type: "video",
    x: 16,
    y: 22,
    width: 58,
    height: 36,
    background: "#020617",
    src: input.src,
    alt: input.alt ?? "Inserted video",
    fit: "contain",
  })
}

export function createAudioElement(input: { src: string; alt?: string }) {
  return element({
    type: "audio",
    x: 18,
    y: 36,
    width: 42,
    height: 14,
    background: "#0f172a",
    src: input.src,
    alt: input.alt ?? "Inserted audio",
    fit: "contain",
    radius: 8,
  })
}
