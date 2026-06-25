import { NextRequest, NextResponse } from "next/server"

import {
  googleSlidesExportUrlFromShareUrl,
  googleSlidesPptxDownloadLimitBytes,
  googleSlidesPptxFileName,
} from "@/features/presentation/google-slides-import"
import { presentationPptxMimeType } from "@/features/presentation/presentation-interoperability"

export const runtime = "nodejs"

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function quotedFileName(fileName: string) {
  return fileName.replace(/["\r\n]/g, "")
}

function isPptxPackage(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 4))

  return bytes[0] === 0x50 && bytes[1] === 0x4b
}

export async function GET(request: NextRequest) {
  const sourceUrl = request.nextUrl.searchParams.get("url")?.trim()

  if (!sourceUrl) {
    return jsonError("Missing Google Slides URL.", 400)
  }

  const exportUrl = googleSlidesExportUrlFromShareUrl(sourceUrl)

  if (!exportUrl) {
    return jsonError(
      "Paste a Google Slides share link from docs.google.com/presentation.",
      400,
    )
  }

  const response = await fetch(exportUrl, {
    cache: "no-store",
    redirect: "follow",
  })

  if (!response.ok) {
    return jsonError(
      "Could not fetch a PPTX export from Google Slides. Make the deck public to anyone with the link, or download it as Microsoft PowerPoint (.pptx) and import that file.",
      response.status === 403 || response.status === 404 ? 400 : 502,
    )
  }

  const length = Number(response.headers.get("content-length") ?? 0)

  if (Number.isFinite(length) && length > googleSlidesPptxDownloadLimitBytes) {
    return jsonError("This Google Slides export is larger than 50 MB.", 413)
  }

  const buffer = await response.arrayBuffer()

  if (buffer.byteLength > googleSlidesPptxDownloadLimitBytes) {
    return jsonError("This Google Slides export is larger than 50 MB.", 413)
  }

  if (!isPptxPackage(buffer)) {
    return jsonError(
      "Google returned a page instead of a PPTX file. Make the deck public or download it as .pptx first.",
      400,
    )
  }

  const fileName = quotedFileName(googleSlidesPptxFileName(sourceUrl))

  return new NextResponse(buffer, {
    headers: {
      "content-disposition": `attachment; filename="${fileName}"`,
      "content-type": presentationPptxMimeType,
      "x-presentation-filename": fileName,
    },
  })
}
