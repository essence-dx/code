import type { PresentationElement } from "./types"

const DEFAULT_CORRECTION = 100
const MIN_CORRECTION = 0
const MAX_CORRECTION = 200
const MAX_OPACITY = 100

type ImageCorrectionElement = Pick<
  PresentationElement,
  "imageOpacity" | "imageBrightness" | "imageContrast" | "imageSaturation"
>

export function normalizeImageCorrection(value: number | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_CORRECTION
  return Math.round(
    Math.max(MIN_CORRECTION, Math.min(MAX_CORRECTION, value ?? DEFAULT_CORRECTION)),
  )
}

export function normalizeImageOpacity(value: number | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_CORRECTION
  return Math.round(
    Math.max(MIN_CORRECTION, Math.min(MAX_OPACITY, value ?? DEFAULT_CORRECTION)),
  )
}

export function imageFilterValue(element: ImageCorrectionElement) {
  const brightness = normalizeImageCorrection(element.imageBrightness)
  const contrast = normalizeImageCorrection(element.imageContrast)
  const saturation = normalizeImageCorrection(element.imageSaturation)

  if (
    brightness === DEFAULT_CORRECTION &&
    contrast === DEFAULT_CORRECTION &&
    saturation === DEFAULT_CORRECTION
  ) {
    return undefined
  }

  return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
}

export function defaultImageCorrections() {
  return {
    imageOpacity: DEFAULT_CORRECTION,
    imageBrightness: DEFAULT_CORRECTION,
    imageContrast: DEFAULT_CORRECTION,
    imageSaturation: DEFAULT_CORRECTION,
  }
}

export function imageOpacityValue(element: ImageCorrectionElement) {
  return normalizeImageOpacity(element.imageOpacity) / 100
}
