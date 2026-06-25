import { chartText } from "./chart-formatting"
import { tableText } from "./table-formatting"
import type { Deck, PresentationElement, Slide } from "./types"

export type ProofingSeverity = "error" | "warning"

export type ProofingFinding = {
  id: string
  severity: ProofingSeverity
  slideId: string
  slideIndex: number
  slideTitle: string
  elementId?: string
  source: string
  title: string
  details: string
  suggestion?: string
  snippet: string
}

export type ProofingSummary = {
  errors: number
  warnings: number
  total: number
}

type TextSource = {
  key: string
  label: string
  text: string
  elementId?: string
}

const commonTypos = new Map([
  ["acommodate", "accommodate"],
  ["adress", "address"],
  ["adn", "and"],
  ["alot", "a lot"],
  ["becuase", "because"],
  ["definately", "definitely"],
  ["enviroment", "environment"],
  ["occured", "occurred"],
  ["recieve", "receive"],
  ["seperate", "separate"],
  ["sucess", "success"],
  ["teh", "the"],
  ["thier", "their"],
  ["untill", "until"],
  ["wich", "which"],
])

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function excerpt(text: string, index: number, length: number) {
  const start = Math.max(0, index - 28)
  const end = Math.min(text.length, index + length + 28)
  const prefix = start > 0 ? "..." : ""
  const suffix = end < text.length ? "..." : ""

  return `${prefix}${text.slice(start, end).replace(/\s+/g, " ")}${suffix}`
}

function createFinding(
  slide: Slide,
  slideIndex: number,
  source: TextSource,
  input: Omit<
    ProofingFinding,
    | "id"
    | "slideId"
    | "slideIndex"
    | "slideTitle"
    | "elementId"
    | "source"
    | "snippet"
  > & { matchIndex: number; matchLength: number },
): ProofingFinding {
  return {
    id: [
      slide.id,
      source.key,
      input.title,
      input.matchIndex,
      input.matchLength,
    ].join("-"),
    slideId: slide.id,
    slideIndex,
    slideTitle: slide.title || `Slide ${slideIndex + 1}`,
    elementId: source.elementId,
    source: source.label,
    severity: input.severity,
    title: input.title,
    details: input.details,
    suggestion: input.suggestion,
    snippet: excerpt(source.text, input.matchIndex, input.matchLength),
  }
}

function elementSource(element: PresentationElement): TextSource | null {
  if (element.type === "title" || element.type === "text") {
    return {
      key: `element-${element.id}`,
      label: element.type === "title" ? "Title text" : "Text box",
      text: element.content,
      elementId: element.id,
    }
  }

  if (element.type === "table") {
    return {
      key: `table-${element.id}`,
      label: "Table text",
      text: tableText(element),
      elementId: element.id,
    }
  }

  if (element.type === "chart") {
    return {
      key: `chart-${element.id}`,
      label: "Chart labels",
      text: chartText(element),
      elementId: element.id,
    }
  }

  if (element.type === "video") {
    return {
      key: `video-${element.id}`,
      label: "Video title",
      text: element.alt,
      elementId: element.id,
    }
  }

  if (element.type === "audio") {
    return {
      key: `audio-${element.id}`,
      label: "Audio title",
      text: element.alt,
      elementId: element.id,
    }
  }

  return null
}

function slideSources(slide: Slide): TextSource[] {
  const sources: TextSource[] = [
    { key: "slide-title", label: "Slide title", text: slide.title },
    { key: "section-title", label: "Section title", text: slide.sectionTitle },
    { key: "speaker-notes", label: "Speaker notes", text: slide.notes },
  ]

  for (const [index, comment] of (slide.comments ?? []).entries()) {
    sources.push({
      key: `comment-${comment.id || index}`,
      label: `Comment ${index + 1}`,
      text: comment.body,
      elementId: comment.targetElementId || undefined,
    })
  }

  for (const element of slide.elements) {
    const source = elementSource(element)
    if (source) sources.push(source)
  }

  return sources.filter((source) => source.text.trim())
}

function scanSource(slide: Slide, slideIndex: number, source: TextSource) {
  const findings: ProofingFinding[] = []

  for (const [typo, suggestion] of commonTypos.entries()) {
    const pattern = new RegExp(`\\b${escapeRegex(typo)}\\b`, "gi")

    for (const match of source.text.matchAll(pattern)) {
      findings.push(
        createFinding(slide, slideIndex, source, {
          severity: "error",
          title: "Possible typo",
          details: `"${match[0]}" may be misspelled.`,
          suggestion,
          matchIndex: match.index ?? 0,
          matchLength: match[0].length,
        }),
      )
    }
  }

  for (const match of source.text.matchAll(/[^\S\r\n]{2,}/g)) {
    findings.push(
      createFinding(slide, slideIndex, source, {
        severity: "warning",
        title: "Repeated spacing",
        details: "Multiple spaces can make deck text look uneven.",
        suggestion: "Use one space.",
        matchIndex: match.index ?? 0,
        matchLength: match[0].length,
      }),
    )
  }

  for (const match of source.text.matchAll(/([!?])\1+|,{2,}|\.{4,}/g)) {
    findings.push(
      createFinding(slide, slideIndex, source, {
        severity: "warning",
        title: "Repeated punctuation",
        details: "Repeated punctuation can feel accidental in slide copy.",
        suggestion: "Use a single punctuation mark.",
        matchIndex: match.index ?? 0,
        matchLength: match[0].length,
      }),
    )
  }

  return findings
}

export function scanDeckProofing(deck: Deck) {
  return deck.slides.flatMap((slide, slideIndex) =>
    slideSources(slide).flatMap((source) =>
      scanSource(slide, slideIndex, source),
    ),
  )
}

export function summarizeProofing(findings: ProofingFinding[]): ProofingSummary {
  return {
    errors: findings.filter((finding) => finding.severity === "error").length,
    warnings: findings.filter((finding) => finding.severity === "warning").length,
    total: findings.length,
  }
}
