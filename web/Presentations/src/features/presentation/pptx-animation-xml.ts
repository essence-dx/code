import { strFromU8, strToU8, unzipSync, zipSync } from "fflate"

import {
  elementAnimationDelay,
  elementAnimationDuration,
  elementAnimationKind,
  elementAnimationMotionX,
  elementAnimationMotionY,
  elementAnimationTrigger,
} from "./animation-effects"
import { chartData } from "./chart-formatting"
import { deckAssetMap, resolveElementImageSrc } from "./deck-assets"
import { elementLinkUrl, elementSlideTarget } from "./element-links"
import { visibleElements } from "./element-visibility"
import { isPptxNativeChartElement } from "./pptx-chart-export"
import { tableDisplayCells } from "./table-formatting"
import {
  clampTextColumns,
  elementTextColumns,
  formattedTextRows,
} from "./text-formatting"
import type { Deck, ElementAnimation, PresentationElement, Slide } from "./types"

type ZipEntries = Record<string, Uint8Array>
export type NativePptxAnimationEffect = Extract<
  ElementAnimation,
  | "fade"
  | "fadeOut"
  | "fadeOutDown"
  | "flyLeft"
  | "flyRight"
  | "growShrink"
  | "motionLeft"
  | "motionRight"
  | "motionCustom"
  | "pulse"
  | "rise"
  | "spin"
  | "teeter"
  | "wipe"
  | "zoom"
>

export type NativePptxAnimationExportSupport =
  | "native-pptx-xml"
  | "native-target-review"
  | "speaker-note-handoff"

type AnimationTarget = {
  delayMs: number
  durationMs: number
  effect: NativePptxAnimationEffect
  motionX: number
  motionY: number
  shapeId: string
  trigger: ReturnType<typeof elementAnimationTrigger>
}

type AnimationXmlResult = {
  changed: boolean
  entries: ZipEntries
}

type ElementObjectPlan = {
  count: number
  targetIndex: number | null
}

export type NativePptxAnimationExportPlanItem = {
  delayMs: number
  detail: string
  durationMs: number
  effect: ElementAnimation
  elementId: string
  motionX: number
  motionY: number
  nativeEffect: boolean
  objectCount: number
  shapeId: string
  status: NativePptxAnimationExportSupport
  targetIndex: number | null
  trigger: ReturnType<typeof elementAnimationTrigger>
}

const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"

const timingElementPattern = /<p:timing\b[^>]*(?:\/>|>[\s\S]*?<\/p:timing>)/
const shapeIdPattern = /<p:cNvPr\b[^>]*\bid="(\d+)"/g

function blobFromUint8Array(value: Uint8Array) {
  const buffer = new ArrayBuffer(value.byteLength)
  new Uint8Array(buffer).set(value)

  return new Blob([buffer], {
    type: PPTX_MIME,
  })
}

function slidePath(index: number) {
  return `ppt/slides/slide${index + 1}.xml`
}

function hasRenderableBackground(element: PresentationElement) {
  return Boolean(element.background && element.background !== "transparent")
}

function hasLinkOverlay(element: PresentationElement, deck: Deck) {
  return Boolean(elementLinkUrl(element) || elementSlideTarget(element, deck.slides))
}

function plainTextColumnCount(element: PresentationElement) {
  const columns = clampTextColumns(elementTextColumns(element))
  const rows = formattedTextRows(element)
  const rowsPerColumn = Math.ceil(rows.length / columns)

  return Array.from({ length: columns }).filter((_, columnIndex) =>
    rows
      .slice(columnIndex * rowsPerColumn, (columnIndex + 1) * rowsPerColumn)
      .some((row) => row.text.trim() || row.marker),
  ).length
}

function chartFallbackObjectCount(element: PresentationElement) {
  const data = chartData(element)
  const backgroundCount = hasRenderableBackground(element) ? 1 : 0
  const legendCount = element.chartShowLegend ? Math.min(4, data.length) * 2 : 0
  const valueCount = element.chartShowValues ? data.length : 0
  const labelCount = data.length

  if (element.chartType === "pie" || element.chartType === "donut") {
    return backgroundCount + 1
  }

  if (element.chartType === "line" || element.chartType === "area") {
    const areaCount = element.chartType === "area" ? 1 : 0
    const lineCount = Math.max(0, data.length - 1)
    return backgroundCount + 2 + legendCount + areaCount + lineCount + data.length + valueCount + labelCount
  }

  return backgroundCount + 2 + legendCount + data.length + valueCount + labelCount
}

function elementObjectPlan(element: PresentationElement, deck: Deck): ElementObjectPlan {
  let plan: ElementObjectPlan

  if (element.type === "title" || element.type === "text") {
    const isPlainTextExport =
      clampTextColumns(elementTextColumns(element)) > 1 || element.listStyle !== "none"
    const count = isPlainTextExport ? plainTextColumnCount(element) : 1
    plan = {
      count,
      targetIndex: isPlainTextExport ? null : 0,
    }
  } else if (element.type === "shape" || element.type === "icon") {
    plan = {
      count: 1,
      targetIndex: 0,
    }
  } else if (element.type === "image") {
    const backgroundCount = hasRenderableBackground(element) ? 1 : 0
    const imageCount = resolveElementImageSrc(element, deckAssetMap(deck.assets)) ? 1 : 0
    plan = {
      count: backgroundCount + imageCount,
      targetIndex: imageCount ? backgroundCount : backgroundCount ? 0 : null,
    }
  } else if (element.type === "table") {
    plan = element.rotation
      ? {
          count: tableDisplayCells(element).length * 2,
          targetIndex: null,
        }
      : {
          count: 1,
          targetIndex: 0,
        }
  } else if (element.type === "chart") {
    plan = isPptxNativeChartElement(element)
      ? {
          count: 1,
          targetIndex: 0,
        }
      : {
          count: chartFallbackObjectCount(element),
          targetIndex: null,
        }
  } else {
    plan = {
      count: 2,
      targetIndex: null,
    }
  }

  return {
    count: plan.count + (hasLinkOverlay(element, deck) ? 1 : 0),
    targetIndex: plan.targetIndex,
  }
}

function slideShapeIds(slideXml: string) {
  return Array.from(slideXml.matchAll(shapeIdPattern))
    .map((match) => match[1])
    .filter((id): id is string => Boolean(id) && id !== "1")
}

export function isNativePptxAnimationEffect(
  effect: ElementAnimation,
): effect is NativePptxAnimationEffect {
  return effect !== "none"
}

function animationExportSupportDetail(
  effect: ElementAnimation,
  plan: ElementObjectPlan,
) {
  if (plan.targetIndex === null) {
    return "This effect is supported by native PPTX timing XML, but the object exports as multiple fallback shapes or has no stable Office target yet."
  }

  return `This ${elementAnimationKind(
    effect,
  )} effect can be mapped to a stable native PPTX timing target.`
}

export function nativePptxAnimationExportPlanForSlide(
  deck: Deck,
  slide: Slide,
  slideXml = "",
): NativePptxAnimationExportPlanItem[] {
  const shapeIds = slideXml ? slideShapeIds(slideXml) : []
  const items: NativePptxAnimationExportPlanItem[] = []
  let objectOffset = 0

  visibleElements(slide).forEach((element) => {
    const plan = elementObjectPlan(element, deck)

    if (element.animation !== "none") {
      const nativeEffect = isNativePptxAnimationEffect(element.animation)
      const shapeId =
        nativeEffect && plan.targetIndex !== null
          ? (shapeIds[objectOffset + plan.targetIndex] ?? "")
          : ""
      const status: NativePptxAnimationExportSupport = nativeEffect
        ? plan.targetIndex === null || (slideXml && !shapeId)
          ? "native-target-review"
          : "native-pptx-xml"
        : "speaker-note-handoff"

      items.push({
        delayMs: elementAnimationDelay(element),
        detail: slideXml && nativeEffect && plan.targetIndex !== null && !shapeId
          ? "This effect is supported by native PPTX timing XML, but the generated slide XML did not expose the expected target shape id."
          : animationExportSupportDetail(element.animation, plan),
        durationMs: elementAnimationDuration(element),
        effect: element.animation,
        elementId: element.id,
        motionX: elementAnimationMotionX(element),
        motionY: elementAnimationMotionY(element),
        nativeEffect,
        objectCount: plan.count,
        shapeId,
        status,
        targetIndex: plan.targetIndex,
        trigger: elementAnimationTrigger(element),
      })
    }

    objectOffset += plan.count
  })

  return items
}

function nativeEffectTransition(effect: NativePptxAnimationEffect) {
  return effect === "fadeOut" || effect === "fadeOutDown" ? "out" : "in"
}

function nativeEffectFilter(effect: NativePptxAnimationEffect) {
  if (effect === "fadeOut") return "fade"
  if (
    effect === "fadeOutDown" ||
    effect === "flyLeft" ||
    effect === "flyRight" ||
    effect === "rise"
  ) {
    return "fly"
  }

  return effect
}

function targetBehaviorXml(target: AnimationTarget, timingId: number) {
  return [
    "<p:cBhvr>",
    `<p:cTn id="${timingId}" dur="${target.durationMs}" fill="hold" />`,
    `<p:tgtEl><p:spTgt spid="${target.shapeId}" /></p:tgtEl>`,
    "</p:cBhvr>",
  ].join("")
}

function scaleByXml(effect: NativePptxAnimationEffect) {
  if (effect === "pulse") return '<p:by x="108000" y="108000"/>'
  if (effect === "growShrink") return '<p:by x="125000" y="125000"/>'

  return ""
}

function rotationByXml(effect: NativePptxAnimationEffect) {
  if (effect === "spin") return '<p:by val="21600000"/>'
  if (effect === "teeter") return '<p:by val="7200000"/>'

  return ""
}

function formatMotionPathNumber(value: number) {
  return Number((value / 64).toFixed(3)).toString()
}

function motionPath(target: AnimationTarget) {
  const { effect } = target

  if (effect === "motionLeft") return "M 0 0 L -0.25 0"
  if (effect === "motionRight") return "M 0 0 L 0.25 0"
  if (effect === "motionCustom") {
    return `M 0 0 L ${formatMotionPathNumber(
      target.motionX,
    )} ${formatMotionPathNumber(target.motionY)}`
  }

  return ""
}

function animationChildXml(target: AnimationTarget, timingId: number) {
  const scaleBy = scaleByXml(target.effect)
  if (scaleBy) {
    return `<p:animScale>${targetBehaviorXml(
      target,
      timingId,
    )}${scaleBy}</p:animScale>`
  }

  const rotationBy = rotationByXml(target.effect)
  if (rotationBy) {
    return `<p:animRot>${targetBehaviorXml(
      target,
      timingId,
    )}${rotationBy}</p:animRot>`
  }

  const path = motionPath(target)
  if (path) {
    return `<p:animMotion origin="layout" path="${path}" pathEditMode="relative">${targetBehaviorXml(
      target,
      timingId,
    )}</p:animMotion>`
  }

  return `<p:animEffect transition="${nativeEffectTransition(
    target.effect,
  )}" filter="${nativeEffectFilter(target.effect)}">${targetBehaviorXml(
    target,
    timingId,
  )}</p:animEffect>`
}

function animationEffectXml(target: AnimationTarget, wrapperId: number) {
  const timingId = wrapperId + 1

  return [
    "<p:par>",
    `<p:cTn id="${wrapperId}" fill="hold">`,
    `<p:stCondLst><p:cond delay="${target.delayMs}" /></p:stCondLst>`,
    "<p:childTnLst>",
    animationChildXml(target, timingId),
    "</p:childTnLst>",
    "</p:cTn>",
    "</p:par>",
  ].join("")
}

export function nativePptxAnimationTargetsForSlide(
  deck: Deck,
  slide: Slide,
  slideXml: string,
) {
  return nativePptxAnimationExportPlanForSlide(deck, slide, slideXml)
    .filter(
      (item): item is NativePptxAnimationExportPlanItem & {
        effect: NativePptxAnimationEffect
        shapeId: string
      } =>
        item.status === "native-pptx-xml" &&
        isNativePptxAnimationEffect(item.effect) &&
        Boolean(item.shapeId),
    )
    .map((item) => ({
      delayMs: item.delayMs,
      durationMs: item.durationMs,
      effect: item.effect,
      motionX: item.motionX,
      motionY: item.motionY,
      shapeId: item.shapeId,
      trigger: item.trigger,
    }))
}

export function nativePptxTimingXmlForTargets(targets: AnimationTarget[]) {
  if (!targets.length) return ""

  const effects = targets
    .map((target, index) => animationEffectXml(target, 3 + index * 2))
    .join("")

  return [
    "<p:timing>",
    "<p:tnLst>",
    "<p:par>",
    '<p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot">',
    "<p:childTnLst>",
    '<p:seq concurrent="1" nextAc="seek">',
    '<p:cTn id="2" dur="indefinite" nodeType="mainSeq">',
    "<p:childTnLst>",
    effects,
    "</p:childTnLst>",
    "</p:cTn>",
    '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt /></p:tgtEl></p:cond></p:prevCondLst>',
    '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt /></p:tgtEl></p:cond></p:nextCondLst>',
    "</p:seq>",
    "</p:childTnLst>",
    "</p:cTn>",
    "</p:par>",
    "</p:tnLst>",
    "</p:timing>",
  ].join("")
}

export function applyNativeTimingXmlToSlideXml(slideXml: string, timingXml: string) {
  const withoutExistingTiming = slideXml.replace(timingElementPattern, "")

  if (!timingXml) return withoutExistingTiming

  if (withoutExistingTiming.includes("</p:transition>")) {
    return withoutExistingTiming.replace(
      "</p:transition>",
      `</p:transition>${timingXml}`,
    )
  }

  if (withoutExistingTiming.match(/<p:transition\b[^>]*\/>/)) {
    return withoutExistingTiming.replace(
      /<p:transition\b[^>]*\/>/,
      (transition) => `${transition}${timingXml}`,
    )
  }

  if (withoutExistingTiming.includes("</p:clrMapOvr>")) {
    return withoutExistingTiming.replace(
      "</p:clrMapOvr>",
      `</p:clrMapOvr>${timingXml}`,
    )
  }

  if (withoutExistingTiming.includes("</p:cSld>")) {
    return withoutExistingTiming.replace("</p:cSld>", `</p:cSld>${timingXml}`)
  }

  return withoutExistingTiming.replace("</p:sld>", `${timingXml}</p:sld>`)
}

export function applyNativePptxAnimationsToEntries(
  entries: ZipEntries,
  deck: Deck,
): AnimationXmlResult {
  let changed = false
  const nextEntries = { ...entries }

  deck.slides.forEach((slide, index) => {
    const path = slidePath(index)
    const entry = nextEntries[path]
    if (!entry) return

    const currentXml = strFromU8(entry)
    const targets = nativePptxAnimationTargetsForSlide(deck, slide, currentXml)
    const timingXml = nativePptxTimingXmlForTargets(targets)
    const nextXml = applyNativeTimingXmlToSlideXml(currentXml, timingXml)

    if (nextXml === currentXml) return

    nextEntries[path] = strToU8(nextXml)
    changed = true
  })

  return {
    changed,
    entries: nextEntries,
  }
}

export async function applyNativePptxAnimationsToBlob(deck: Deck, blob: Blob) {
  const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()))
  const result = applyNativePptxAnimationsToEntries(entries, deck)

  if (!result.changed) return blob

  return blobFromUint8Array(
    zipSync(result.entries, {
      level: 6,
    }),
  )
}
