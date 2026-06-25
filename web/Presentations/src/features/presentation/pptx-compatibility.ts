import { strFromU8 } from "fflate"

export type PptxCompatibilityWarningId =
  | "activex-controls"
  | "comments-skipped"
  | "embedded-objects"
  | "macros-skipped"
  | "media-skipped"
  | "smartart-skipped"
  | "animations-reset"
  | "transitions-reset"

export type PptxCompatibilityWarning = {
  detail: string
  id: PptxCompatibilityWarningId
  label: string
  severity: "info" | "warning"
}

const supportedImageExtensions = new Set([
  "gif",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
])

const supportedInlineMediaExtensions = new Set([
  "aac",
  "m4a",
  "m4v",
  "mov",
  "mp3",
  "mp4",
  "wav",
])

function entryText(entries: Record<string, Uint8Array>, path: string) {
  const value = entries[path]
  return value ? strFromU8(value) : ""
}

function parseXml(text: string) {
  if (!text) return null

  return new DOMParser().parseFromString(text, "application/xml")
}

function descendantElements(root: ParentNode | null) {
  if (!root) return []

  const rootWithSelectors = root as ParentNode & {
    getElementsByTagName?: (name: string) => HTMLCollectionOf<Element>
    querySelectorAll?: (selectors: string) => NodeListOf<Element>
  }

  if (typeof rootWithSelectors.querySelectorAll === "function") {
    return Array.from(rootWithSelectors.querySelectorAll("*"))
  }

  if (typeof rootWithSelectors.getElementsByTagName === "function") {
    return Array.from(rootWithSelectors.getElementsByTagName("*"))
  }

  return []
}

function elementsByName(root: ParentNode | null, localName: string) {
  if (!root) return []

  return descendantElements(root).filter(
    (element) => element.localName === localName,
  )
}

function slideEntryPaths(entries: Record<string, Uint8Array>) {
  return Object.keys(entries)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
}

function countSlidesWithElement(
  entries: Record<string, Uint8Array>,
  elementName: string,
) {
  return slideEntryPaths(entries).filter((path) => {
    return elementsByName(parseXml(entryText(entries, path)), elementName).length
  }).length
}

function countPaths(
  entries: Record<string, Uint8Array>,
  predicate: (path: string) => boolean,
) {
  return Object.keys(entries).filter(
    (path) => !path.endsWith("/") && predicate(path),
  ).length
}

function mediaExtension(path: string) {
  return path.split(".").pop()?.toLowerCase() ?? ""
}

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralLabel}`
}

export function pptxCompatibilityWarningsFromEntries(
  entries: Record<string, Uint8Array>,
): PptxCompatibilityWarning[] {
  const warnings: PptxCompatibilityWarning[] = []
  const transitionSlides = countSlidesWithElement(entries, "transition")
  const animationSlides = countSlidesWithElement(entries, "timing")
  const unsupportedMedia = countPaths(entries, (path) => {
    if (!path.startsWith("ppt/media/")) return false

    const extension = mediaExtension(path)

    return (
      !supportedImageExtensions.has(extension) &&
      !supportedInlineMediaExtensions.has(extension)
    )
  })
  const embeddedObjects = countPaths(entries, (path) =>
    path.startsWith("ppt/embeddings/"),
  )
  const activeXControls = countPaths(entries, (path) =>
    path.startsWith("ppt/activeX/"),
  )
  const smartArtParts = countPaths(entries, (path) =>
    path.startsWith("ppt/diagrams/"),
  )
  const commentParts = countPaths(
    entries,
    (path) =>
      path.startsWith("ppt/comments/") ||
      path.startsWith("ppt/threadedComments/") ||
      path === "ppt/commentAuthors.xml",
  )
  const macroProjects = countPaths(
    entries,
    (path) => path.toLowerCase() === "ppt/vbaproject.bin",
  )

  if (transitionSlides) {
    warnings.push({
      detail: `${plural(transitionSlides, "slide")} include PowerPoint transitions; Essence imports basic transition timing/type metadata and simplifies unsupported transition details.`,
      id: "transitions-reset",
      label: "Transitions simplified",
      severity: "info",
    })
  }

  if (animationSlides) {
    warnings.push({
      detail: `${plural(animationSlides, "slide")} include PowerPoint animation timelines; object animations are not preserved yet.`,
      id: "animations-reset",
      label: "Animations not preserved",
      severity: "warning",
    })
  }

  if (unsupportedMedia) {
    warnings.push({
      detail: `${plural(unsupportedMedia, "unsupported audio/video asset")} were detected; supported inline MP4/M4V/MOV/MP3/M4A/AAC/WAV media imports as editable playback objects, but these formats still need a manual handoff.`,
      id: "media-skipped",
      label: "Unsupported media skipped",
      severity: "warning",
    })
  }

  if (embeddedObjects) {
    warnings.push({
      detail: `${plural(embeddedObjects, "embedded Office object")} were detected; embedded files and OLE objects are skipped.`,
      id: "embedded-objects",
      label: "Embedded objects skipped",
      severity: "warning",
    })
  }

  if (activeXControls) {
    warnings.push({
      detail: `${plural(activeXControls, "ActiveX control")} were detected; interactive controls are skipped.`,
      id: "activex-controls",
      label: "ActiveX controls skipped",
      severity: "warning",
    })
  }

  if (smartArtParts) {
    warnings.push({
      detail: `${plural(smartArtParts, "SmartArt/diagram part")} were detected; SmartArt is not converted to editable diagrams yet.`,
      id: "smartart-skipped",
      label: "SmartArt not converted",
      severity: "warning",
    })
  }

  if (commentParts) {
    warnings.push({
      detail: `${plural(commentParts, "comment part")} were detected; Essence imports comment text, authors, anchors, thread identifiers, and basic reply hierarchy while simplifying unsupported rich conversation metadata.`,
      id: "comments-skipped",
      label: "Comments simplified",
      severity: "info",
    })
  }

  if (macroProjects) {
    warnings.push({
      detail: "A VBA macro project was detected; macros are not imported or executed.",
      id: "macros-skipped",
      label: "Macros skipped",
      severity: "warning",
    })
  }

  return warnings
}

export function pptxCompatibilityWarningMessage(
  warnings: PptxCompatibilityWarning[],
  limit = 5,
) {
  if (!warnings.length) return ""

  const visible = warnings.slice(0, Math.max(1, limit))
  const remaining = warnings.length - visible.length
  const details = visible
    .map((warning) => `${warning.label}: ${warning.detail}`)
    .join("\n")

  return remaining > 0
    ? `${details}\n${remaining} more compatibility warning${
        remaining === 1 ? "" : "s"
      }.`
    : details
}
