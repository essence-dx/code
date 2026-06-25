import { nanoid } from "nanoid"

export type ImageSlideOrientation =
  | "landscape"
  | "portrait"
  | "square"
  | "unknown"

export type ImageSlideImportItem = {
  alt: string
  height: number
  id: string
  orientation: ImageSlideOrientation
  size: number
  src: string
  type: string
  width: number
}

export type ImageSlideImportSummary = {
  duplicateNames: string[]
  fileTypes: string[]
  orientationCounts: Record<ImageSlideOrientation, number>
  totalBytes: number
  totalSlides: number
}

export type ImageSlideImportReportItem = Pick<
  ImageSlideImportItem,
  "alt" | "height" | "orientation" | "size" | "type" | "width"
> & {
  slideNumber: number
}

export type ImageSlideImportReport = {
  endingSlideNumber: number
  id: string
  importedAt: string
  items: ImageSlideImportReportItem[]
  startingSlideNumber: number
  summary: ImageSlideImportSummary
}

export type ImageSlideDimensions = {
  height: number
  width: number
}

const imageSlideImportReportStorageKey =
  "essence-powerpoint:last-image-slide-import-report"

function canUseLocalStorage() {
  return typeof window !== "undefined" && "localStorage" in window
}

function isOrientation(value: unknown): value is ImageSlideOrientation {
  return (
    value === "landscape" ||
    value === "portrait" ||
    value === "square" ||
    value === "unknown"
  )
}

function isImportReportItem(value: unknown): value is ImageSlideImportReportItem {
  const item = value as Partial<ImageSlideImportReportItem>

  return (
    typeof item.alt === "string" &&
    typeof item.height === "number" &&
    isOrientation(item.orientation) &&
    typeof item.size === "number" &&
    typeof item.slideNumber === "number" &&
    typeof item.type === "string" &&
    typeof item.width === "number"
  )
}

function isImageSlideImportReport(
  value: unknown,
): value is ImageSlideImportReport {
  const report = value as Partial<ImageSlideImportReport>

  return (
    typeof report.endingSlideNumber === "number" &&
    typeof report.id === "string" &&
    typeof report.importedAt === "string" &&
    Array.isArray(report.items) &&
    report.items.every(isImportReportItem) &&
    typeof report.startingSlideNumber === "number" &&
    report.summary !== undefined
  )
}

export function imageSlideOrientation(
  dimensions: ImageSlideDimensions,
): ImageSlideOrientation {
  if (dimensions.width <= 0 || dimensions.height <= 0) return "unknown"
  if (dimensions.width === dimensions.height) return "square"

  return dimensions.width > dimensions.height ? "landscape" : "portrait"
}

export function imageSlideDuplicateNames(items: ImageSlideImportItem[]) {
  const counts = new Map<string, number>()

  for (const item of items) {
    const name = item.alt.trim().toLowerCase()
    if (!name) continue

    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([name]) => name)
    .sort()
}

export function readImageSlideDimensions(
  src: string,
): Promise<ImageSlideDimensions> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ height: 0, width: 0 })
      return
    }

    const image = new window.Image()
    image.onload = () => {
      resolve({
        height: image.naturalHeight,
        width: image.naturalWidth,
      })
    }
    image.onerror = () => resolve({ height: 0, width: 0 })
    image.src = src
  })
}

export function imageSlideImportItemFromFile(
  file: File,
  src: string,
  dimensions: ImageSlideDimensions = { height: 0, width: 0 },
): ImageSlideImportItem {
  return {
    alt: file.name,
    height: dimensions.height,
    id: nanoid(),
    orientation: imageSlideOrientation(dimensions),
    size: file.size,
    src,
    type: file.type || "image",
    width: dimensions.width,
  }
}

export function imageSlideImportSummary(
  items: ImageSlideImportItem[],
): ImageSlideImportSummary {
  return {
    duplicateNames: imageSlideDuplicateNames(items),
    fileTypes: Array.from(new Set(items.map((item) => item.type))).sort(),
    orientationCounts: {
      landscape: items.filter((item) => item.orientation === "landscape")
        .length,
      portrait: items.filter((item) => item.orientation === "portrait").length,
      square: items.filter((item) => item.orientation === "square").length,
      unknown: items.filter((item) => item.orientation === "unknown").length,
    },
    totalBytes: items.reduce((total, item) => total + item.size, 0),
    totalSlides: items.length,
  }
}

export function imageSlideImportReportFromItems(
  items: ImageSlideImportItem[],
  input: {
    importedAt?: Date
    startingSlideNumber: number
  },
): ImageSlideImportReport {
  const importedAt = input.importedAt ?? new Date()
  const reportItems = items.map((item, index) => ({
    alt: item.alt,
    height: item.height,
    orientation: item.orientation,
    size: item.size,
    slideNumber: input.startingSlideNumber + index,
    type: item.type,
    width: item.width,
  }))

  return {
    endingSlideNumber: reportItems.at(-1)?.slideNumber ?? input.startingSlideNumber,
    id: nanoid(),
    importedAt: importedAt.toISOString(),
    items: reportItems,
    startingSlideNumber: input.startingSlideNumber,
    summary: imageSlideImportSummary(items),
  }
}

export function imageSlideImportReportFileName(
  report: ImageSlideImportReport,
) {
  const date = report.importedAt.slice(0, 10) || "image-slides"

  return `image-slide-import-${date}.txt`
}

export function serializeImageSlideImportReportText(
  report: ImageSlideImportReport,
) {
  const lines = [
    "Image Slide Import Report",
    `Imported: ${report.importedAt}`,
    `Slides: ${report.startingSlideNumber}-${report.endingSlideNumber}`,
    `Count: ${report.summary.totalSlides}`,
    `Total bytes: ${report.summary.totalBytes}`,
    `Types: ${report.summary.fileTypes.join(", ") || "Images"}`,
    `Orientation: ${report.summary.orientationCounts.landscape} landscape, ${report.summary.orientationCounts.portrait} portrait, ${report.summary.orientationCounts.square} square, ${report.summary.orientationCounts.unknown} unknown`,
    `Duplicate names: ${report.summary.duplicateNames.join(", ") || "None"}`,
    "",
    "Slides:",
    ...report.items.map(
      (item) =>
        `${item.slideNumber}. ${item.alt} (${item.orientation}, ${item.width} x ${item.height}, ${item.type}, ${item.size} bytes)`,
    ),
  ]

  return `${lines.join("\n")}\n`
}

export function readImageSlideImportReport() {
  if (!canUseLocalStorage()) return null

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(imageSlideImportReportStorageKey) ?? "null",
    ) as unknown

    return isImageSlideImportReport(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function rememberImageSlideImportReport(
  report: ImageSlideImportReport,
) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(
      imageSlideImportReportStorageKey,
      JSON.stringify(report),
    )
  }

  return report
}

export function clearImageSlideImportReport() {
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(imageSlideImportReportStorageKey)
  }

  return null
}

export function moveImageSlideImportItem(
  items: ImageSlideImportItem[],
  itemId: string,
  direction: -1 | 1,
) {
  const index = items.findIndex((item) => item.id === itemId)
  const nextIndex = index + direction

  if (index < 0 || nextIndex < 0 || nextIndex >= items.length) {
    return items
  }

  const nextItems = [...items]
  const [item] = nextItems.splice(index, 1)

  if (!item) return items

  nextItems.splice(nextIndex, 0, item)

  return nextItems
}

export function removeImageSlideImportItem(
  items: ImageSlideImportItem[],
  itemId: string,
) {
  return items.filter((item) => item.id !== itemId)
}
