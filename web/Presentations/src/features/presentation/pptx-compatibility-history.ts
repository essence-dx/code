import type { Deck } from "./types"
import type {
  PptxCompatibilityWarning,
  PptxCompatibilityWarningId,
} from "./pptx-compatibility"

export type PptxCompatibilityReport = {
  deckId: string
  deckTitle: string
  id: string
  importedAt: string
  sourceFileName: string
  version: 1
  warnings: PptxCompatibilityWarning[]
}

export type PptxCompatibilityReportArchive = {
  activeReportId: string | null
  reports: PptxCompatibilityReport[]
  version: 1
}

const storageKey = "essence-powerpoint:pptx-compatibility-report"
const maxStoredReports = 6
const maxStoredWarnings = 12
const warningIds = new Set<PptxCompatibilityWarningId>([
  "activex-controls",
  "comments-skipped",
  "embedded-objects",
  "macros-skipped",
  "media-skipped",
  "smartart-skipped",
  "animations-reset",
  "transitions-reset",
])

function canUseLocalStorage() {
  return typeof window !== "undefined" && "localStorage" in window
}

function isWarningSeverity(value: unknown) {
  return value === "info" || value === "warning"
}

function reportId(input: {
  deckId: string
  importedAt: string
  sourceFileName: string
}) {
  return `${input.deckId}:${input.sourceFileName}:${input.importedAt}`
}

function safeFileStem(value: string) {
  return (
    value
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "pptx-import"
  )
}

function parseWarning(value: unknown): PptxCompatibilityWarning | null {
  if (!value || typeof value !== "object") return null

  const warning = value as Partial<PptxCompatibilityWarning>

  if (
    typeof warning.id !== "string" ||
    !warningIds.has(warning.id as PptxCompatibilityWarningId) ||
    typeof warning.label !== "string" ||
    typeof warning.detail !== "string" ||
    !isWarningSeverity(warning.severity)
  ) {
    return null
  }

  return {
    detail: warning.detail,
    id: warning.id as PptxCompatibilityWarningId,
    label: warning.label,
    severity: warning.severity,
  }
}

export function pptxCompatibilityReportFromWarnings(
  input: {
    deck: Pick<Deck, "id" | "title">
    sourceFileName: string
    warnings: PptxCompatibilityWarning[]
  },
  now = new Date(),
): PptxCompatibilityReport | null {
  const warnings = input.warnings.slice(0, maxStoredWarnings)

  if (!warnings.length) return null

  const importedAt = now.toISOString()

  return {
    deckId: input.deck.id,
    deckTitle: input.deck.title,
    id: reportId({
      deckId: input.deck.id,
      importedAt,
      sourceFileName: input.sourceFileName,
    }),
    importedAt,
    sourceFileName: input.sourceFileName,
    version: 1,
    warnings,
  }
}

export function parsePptxCompatibilityReport(
  value: unknown,
): PptxCompatibilityReport | null {
  if (!value || typeof value !== "object") return null

  const report = value as Partial<PptxCompatibilityReport>

  if (
    report.version !== 1 ||
    typeof report.deckId !== "string" ||
    typeof report.deckTitle !== "string" ||
    typeof report.importedAt !== "string" ||
    Number.isNaN(Date.parse(report.importedAt)) ||
    typeof report.sourceFileName !== "string" ||
    !Array.isArray(report.warnings)
  ) {
    return null
  }

  const warnings = report.warnings
    .map(parseWarning)
    .filter((warning): warning is PptxCompatibilityWarning =>
      Boolean(warning),
    )
    .slice(0, maxStoredWarnings)

  if (!warnings.length) return null

  return {
    deckId: report.deckId,
    deckTitle: report.deckTitle,
    id:
      typeof report.id === "string" && report.id.trim()
        ? report.id
        : reportId({
            deckId: report.deckId,
            importedAt: report.importedAt,
            sourceFileName: report.sourceFileName,
          }),
    importedAt: report.importedAt,
    sourceFileName: report.sourceFileName,
    version: 1,
    warnings,
  }
}

function sortReports(reports: PptxCompatibilityReport[]) {
  return reports
    .slice()
    .sort((left, right) => right.importedAt.localeCompare(left.importedAt))
    .slice(0, maxStoredReports)
}

export function emptyPptxCompatibilityReportArchive(): PptxCompatibilityReportArchive {
  return {
    activeReportId: null,
    reports: [],
    version: 1,
  }
}

export function activePptxCompatibilityReport(
  archive: PptxCompatibilityReportArchive,
) {
  return (
    archive.reports.find((report) => report.id === archive.activeReportId) ??
    null
  )
}

export function parsePptxCompatibilityReportArchive(
  value: unknown,
): PptxCompatibilityReportArchive {
  const legacyReport = parsePptxCompatibilityReport(value)

  if (legacyReport) {
    return {
      activeReportId: legacyReport.id,
      reports: [legacyReport],
      version: 1,
    }
  }

  if (!value || typeof value !== "object") {
    return emptyPptxCompatibilityReportArchive()
  }

  const archive = value as Partial<PptxCompatibilityReportArchive>

  if (archive.version !== 1 || !Array.isArray(archive.reports)) {
    return emptyPptxCompatibilityReportArchive()
  }

  const reports = sortReports(
    archive.reports
      .map(parsePptxCompatibilityReport)
      .filter((report): report is PptxCompatibilityReport => Boolean(report)),
  )
  const activeReportId =
    typeof archive.activeReportId === "string" &&
    reports.some((report) => report.id === archive.activeReportId)
      ? archive.activeReportId
      : null

  return {
    activeReportId,
    reports,
    version: 1,
  }
}

function writePptxCompatibilityReportArchive(
  archive: PptxCompatibilityReportArchive,
) {
  if (!canUseLocalStorage()) return archive

  window.localStorage.setItem(storageKey, JSON.stringify(archive))

  return archive
}

export function readPptxCompatibilityReportArchive() {
  if (!canUseLocalStorage()) return emptyPptxCompatibilityReportArchive()

  try {
    return parsePptxCompatibilityReportArchive(
      JSON.parse(window.localStorage.getItem(storageKey) ?? "null"),
    )
  } catch {
    return emptyPptxCompatibilityReportArchive()
  }
}

export function readPptxCompatibilityReport() {
  return activePptxCompatibilityReport(readPptxCompatibilityReportArchive())
}

export function readPptxCompatibilityReports() {
  return readPptxCompatibilityReportArchive().reports
}

export function pptxCompatibilityReportFileName(
  report: PptxCompatibilityReport,
) {
  return `${safeFileStem(report.sourceFileName)}-compatibility.txt`
}

export function serializePptxCompatibilityReportText(
  report: PptxCompatibilityReport,
) {
  const lines = [
    "PPTX Compatibility Report",
    `File: ${report.sourceFileName}`,
    `Deck: ${report.deckTitle}`,
    `Imported: ${report.importedAt}`,
    `Warnings: ${report.warnings.length}`,
    "",
    ...report.warnings.flatMap((warning, index) => [
      `${index + 1}. [${warning.severity}] ${warning.label}`,
      `   ${warning.detail}`,
    ]),
  ]

  return `${lines.join("\n")}\n`
}

export function rememberPptxCompatibilityReport(input: {
  deck: Pick<Deck, "id" | "title">
  sourceFileName: string
  warnings: PptxCompatibilityWarning[]
}) {
  const report = pptxCompatibilityReportFromWarnings(input)
  const archive = readPptxCompatibilityReportArchive()

  if (!report) {
    return writePptxCompatibilityReportArchive({
      ...archive,
      activeReportId: null,
    })
  }

  const reports = sortReports([
    report,
    ...archive.reports.filter((item) => item.id !== report.id),
  ])

  return writePptxCompatibilityReportArchive({
    activeReportId: report.id,
    reports,
    version: 1,
  })
}

export function activatePptxCompatibilityReport(reportId: string) {
  const archive = readPptxCompatibilityReportArchive()

  return writePptxCompatibilityReportArchive({
    ...archive,
    activeReportId: archive.reports.some((report) => report.id === reportId)
      ? reportId
      : archive.activeReportId,
  })
}

export function clearPptxCompatibilityReport() {
  const archive = readPptxCompatibilityReportArchive()

  return writePptxCompatibilityReportArchive({
    ...archive,
    activeReportId: null,
  })
}

export function clearPptxCompatibilityReports() {
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(storageKey)
  }

  return emptyPptxCompatibilityReportArchive()
}
