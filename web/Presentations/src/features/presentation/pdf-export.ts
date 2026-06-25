import { PDFDocument, rgb } from "pdf-lib"

import { rasterizeSlideToPng } from "./slide-raster-export"
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "./slide-svg-export"
import type { Deck } from "./types"

function fileSafeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export function deckPdfFileName(deck: Deck) {
  return `${fileSafeName(deck.title || "deck")}.pdf`
}

export async function exportDeckToPdfBlob(deck: Deck) {
  const pdf = await PDFDocument.create()

  pdf.setAuthor("essencefromexistence")
  pdf.setCreator("Essence PowerPoint")
  pdf.setProducer("Essence PowerPoint")
  pdf.setSubject("Essence PowerPoint deck")
  pdf.setTitle(deck.title || "Untitled deck")

  if (!deck.slides.length) {
    const page = pdf.addPage([SLIDE_WIDTH, SLIDE_HEIGHT])
    page.drawRectangle({
      color: rgb(1, 1, 1),
      height: SLIDE_HEIGHT,
      width: SLIDE_WIDTH,
      x: 0,
      y: 0,
    })
  }

  for (const [index, slide] of deck.slides.entries()) {
    const imageBlob = await rasterizeSlideToPng(slide, deck.assets, {
      master: deck.master,
      slideNumber: index + 1,
      slideCount: deck.slides.length,
    })
    const image = await pdf.embedPng(await imageBlob.arrayBuffer())
    const page = pdf.addPage([SLIDE_WIDTH, SLIDE_HEIGHT])

    page.drawImage(image, {
      height: SLIDE_HEIGHT,
      width: SLIDE_WIDTH,
      x: 0,
      y: 0,
    })
  }

  const bytes = await pdf.save()
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)

  return new Blob([buffer], {
    type: "application/pdf",
  })
}
