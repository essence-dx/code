import {
  serializeSlideToSvg,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
} from "./slide-svg-export"
import type { DeckAsset, DeckMaster, Slide } from "./types"

function fileSafeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Could not render the slide image."))
    image.src = src
  })
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
        return
      }

      reject(new Error("Could not create a PNG file from the selected slide."))
    }, "image/png")
  })
}

export function slidePngFileName(slide: Slide, index: number) {
  return `${String(index + 1).padStart(2, "0")}-${fileSafeName(
    slide.title || "slide",
  )}.png`
}

export async function rasterizeSlideToPng(
  slide: Slide,
  assets: DeckAsset[] = [],
  master?: { master: DeckMaster; slideNumber: number; slideCount: number },
) {
  const svg = serializeSlideToSvg(slide, assets, master)
  const url = URL.createObjectURL(
    new Blob([svg], {
      type: "image/svg+xml;charset=utf-8",
    }),
  )

  try {
    const image = await loadImage(url)
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")

    if (!context) {
      throw new Error("Canvas rendering is unavailable in this browser.")
    }

    canvas.width = SLIDE_WIDTH
    canvas.height = SLIDE_HEIGHT
    context.drawImage(image, 0, 0, SLIDE_WIDTH, SLIDE_HEIGHT)

    return await canvasToPngBlob(canvas)
  } finally {
    URL.revokeObjectURL(url)
  }
}
