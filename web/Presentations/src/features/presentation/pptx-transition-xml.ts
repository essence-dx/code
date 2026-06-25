import { strFromU8, strToU8, unzipSync, zipSync } from "fflate"

import type { Deck, Slide, SlideTransition } from "./types"

type ZipEntries = Record<string, Uint8Array>

type TransitionXmlResult = {
  changed: boolean
  entries: ZipEntries
}

const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"

const transitionElementPattern =
  /<p:transition\b[^>]*(?:\/>|>[\s\S]*?<\/p:transition>)/

function clampPositiveMs(value: number, fallback: number) {
  if (!Number.isFinite(value) || value <= 0) return fallback

  return Math.min(10_000, Math.max(100, Math.round(value)))
}

function transitionChildXml(transition: SlideTransition) {
  if (transition === "fade") return "<p:fade />"
  if (transition === "push") return '<p:push dir="l" />'
  if (transition === "zoom") return "<p:zoom />"

  return ""
}

function slidePath(index: number) {
  return `ppt/slides/slide${index + 1}.xml`
}

function blobFromUint8Array(value: Uint8Array) {
  const buffer = new ArrayBuffer(value.byteLength)
  new Uint8Array(buffer).set(value)

  return new Blob([buffer], {
    type: PPTX_MIME,
  })
}

export function nativePptxTransitionXmlForSlide(slide: Slide) {
  const transition = slide.transition ?? "none"
  const autoAdvanceMs = clampPositiveMs(slide.autoAdvanceAfterMs ?? 0, 0)
  const child = transitionChildXml(transition)

  if (!child && !autoAdvanceMs) return ""

  const attributes = [
    transition !== "none"
      ? `dur="${clampPositiveMs(slide.transitionDurationMs ?? 350, 350)}"`
      : "",
    'advClick="1"',
    autoAdvanceMs ? `advTm="${autoAdvanceMs}"` : "",
  ].filter(Boolean)

  return child
    ? `<p:transition ${attributes.join(" ")}>${child}</p:transition>`
    : `<p:transition ${attributes.join(" ")} />`
}

export function applyNativeTransitionXmlToSlideXml(
  slideXml: string,
  transitionXml: string,
) {
  const withoutExistingTransition = slideXml.replace(transitionElementPattern, "")

  if (!transitionXml) return withoutExistingTransition

  if (withoutExistingTransition.includes("</p:clrMapOvr>")) {
    return withoutExistingTransition.replace(
      "</p:clrMapOvr>",
      `</p:clrMapOvr>${transitionXml}`,
    )
  }

  if (withoutExistingTransition.includes("</p:cSld>")) {
    return withoutExistingTransition.replace("</p:cSld>", `</p:cSld>${transitionXml}`)
  }

  return withoutExistingTransition.replace("</p:sld>", `${transitionXml}</p:sld>`)
}

export function applyNativePptxTransitionsToEntries(
  entries: ZipEntries,
  deck: Deck,
): TransitionXmlResult {
  let changed = false
  const nextEntries = { ...entries }

  deck.slides.forEach((slide, index) => {
    const path = slidePath(index)
    const entry = nextEntries[path]
    if (!entry) return

    const currentXml = strFromU8(entry)
    const transitionXml = nativePptxTransitionXmlForSlide(slide)
    const nextXml = applyNativeTransitionXmlToSlideXml(currentXml, transitionXml)

    if (nextXml === currentXml) return

    nextEntries[path] = strToU8(nextXml)
    changed = true
  })

  return {
    changed,
    entries: nextEntries,
  }
}

export async function applyNativePptxTransitionsToBlob(deck: Deck, blob: Blob) {
  const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()))
  const result = applyNativePptxTransitionsToEntries(entries, deck)

  if (!result.changed) return blob

  return blobFromUint8Array(
    zipSync(result.entries, {
      level: 6,
    }),
  )
}
