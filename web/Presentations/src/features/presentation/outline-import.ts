export type OutlineSlideInput = {
  title: string
  body: string
}

function cleanTitle(value: string, fallback: string) {
  const title = value.replace(/^#{1,6}\s*/, "").trim()
  return title || fallback
}

export function parseOutlineSlides(text: string): OutlineSlideInput[] {
  return text
    .replaceAll("\r\n", "\n")
    .split(/\n{2,}/)
    .map((block, index) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)

      const [firstLine, ...bodyLines] = lines
      return {
        title: cleanTitle(firstLine ?? "", `Slide ${index + 1}`),
        body: bodyLines.join("\n"),
      }
    })
    .filter((slide) => slide.title || slide.body)
}
