const GOOGLE_SLIDES_HOST = "docs.google.com"

export const googleSlidesPptxDownloadLimitBytes = 50 * 1024 * 1024
export const googleSlidesImportPrompt =
  "Paste a public Google Slides share link to import its PPTX export. For private decks, use File > Download > Microsoft PowerPoint (.pptx), then import that file."

function googleSlidesFileIdFromPath(pathname: string) {
  const normalPath = pathname.replace(/\/+/g, "/")
  const documentMatch = normalPath.match(
    /^\/presentation(?:\/u\/\d+)?\/d\/([^/]+)/,
  )

  if (documentMatch?.[1] && documentMatch[1] !== "e") {
    return { id: documentMatch[1], published: false }
  }

  const publishedMatch = normalPath.match(/^\/presentation\/d\/e\/([^/]+)/)

  if (publishedMatch?.[1]) {
    return { id: publishedMatch[1], published: true }
  }

  return null
}

export function googleSlidesExportUrlFromShareUrl(value: string) {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    return null
  }

  if (url.hostname.toLowerCase() !== GOOGLE_SLIDES_HOST) {
    return null
  }

  const file = googleSlidesFileIdFromPath(url.pathname)

  if (!file) {
    return null
  }

  if (file.published) {
    const exportUrl = new URL(
      `https://${GOOGLE_SLIDES_HOST}/presentation/d/e/${file.id}/pub`,
    )

    exportUrl.searchParams.set("output", "pptx")
    return exportUrl
  }

  return new URL(
    `https://${GOOGLE_SLIDES_HOST}/presentation/d/${file.id}/export/pptx`,
  )
}

export function googleSlidesPptxFileName(value: string) {
  const exportUrl = googleSlidesExportUrlFromShareUrl(value)
  const file = exportUrl ? googleSlidesFileIdFromPath(exportUrl.pathname) : null
  const suffix = file?.id ? `-${file.id.slice(0, 10)}` : ""

  return `google-slides${suffix}.pptx`
}
