import {
  normalizeCustomThemeBundle,
  themeBundleFromDeck,
  type CustomThemeBundle,
} from "./theme-bundles"
import {
  pptxThemePackagePlan,
  pptxThemeSafeFileStem,
  type PptxThemePackagePlan,
} from "./pptx-theme-package-plan"
import {
  pptxThemePackageXmlAuthoring,
  type PptxThemePackageXmlAuthoring,
} from "./pptx-theme-package-xml-authoring"
import type { Deck, OfficeThemeMetadata } from "./types"

export type StandaloneThemeFilePayload = {
  exportedAt: string
  kind: "essence-theme-file"
  officeTheme: OfficeThemeMetadata | null
  sourceDeckTitle: string
  themeBundle: CustomThemeBundle
  themePackage: PptxThemePackagePlan
  themePackageXml: PptxThemePackageXmlAuthoring
  version: 1
}

export type StandaloneThemeFileSummary = {
  colorCount: number
  fontPair: string
  packageFileName: string
  readyPartCount: number
  sourceDeckTitle: string
  themeName: string
  totalPartCount: number
  xmlLength: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function standaloneThemeFileName(deck: Deck) {
  const name =
    deck.master.officeTheme?.name.trim() || deck.title.trim() || "essence-theme"

  return `${pptxThemeSafeFileStem(name)}.ess-theme.json`
}

export function standaloneThemeFilePayloadFromDeck(
  deck: Deck,
  selectedSlideId: string,
  name: string,
  now = new Date(),
): StandaloneThemeFilePayload {
  return {
    exportedAt: now.toISOString(),
    kind: "essence-theme-file",
    officeTheme: deck.master.officeTheme ? clone(deck.master.officeTheme) : null,
    sourceDeckTitle: deck.title.trim() || "Untitled deck",
    themeBundle: themeBundleFromDeck(deck, selectedSlideId, name, now),
    themePackage: pptxThemePackagePlan(deck),
    themePackageXml: pptxThemePackageXmlAuthoring(deck),
    version: 1,
  }
}

export function standaloneThemeFileSummary(
  payload: StandaloneThemeFilePayload,
): StandaloneThemeFileSummary {
  return {
    colorCount: payload.themePackage.colorCount,
    fontPair: payload.themePackage.fontPair,
    packageFileName: payload.themePackage.packageFileName,
    readyPartCount: payload.themePackageXml.readyPartCount,
    sourceDeckTitle: payload.sourceDeckTitle,
    themeName: payload.themePackage.themeName,
    totalPartCount: payload.themePackageXml.totalPartCount,
    xmlLength: payload.themePackageXml.xmlLength,
  }
}

export function serializeStandaloneThemeFile(
  payload: StandaloneThemeFilePayload,
) {
  return JSON.stringify(payload, null, 2)
}

export function parseStandaloneThemeFile(
  value: string,
): StandaloneThemeFilePayload | null {
  try {
    const parsed = JSON.parse(value) as unknown
    if (!isRecord(parsed)) return null

    const bundle = normalizeCustomThemeBundle(parsed.themeBundle)
    if (
      parsed.kind !== "essence-theme-file" ||
      parsed.version !== 1 ||
      !bundle ||
      !isRecord(parsed.themePackage) ||
      !isRecord(parsed.themePackageXml)
    ) {
      return null
    }

    return {
      exportedAt:
        typeof parsed.exportedAt === "string"
          ? parsed.exportedAt
          : new Date().toISOString(),
      kind: "essence-theme-file",
      officeTheme: isRecord(parsed.officeTheme)
        ? (parsed.officeTheme as OfficeThemeMetadata)
        : null,
      sourceDeckTitle:
        typeof parsed.sourceDeckTitle === "string"
          ? parsed.sourceDeckTitle
          : "Untitled deck",
      themeBundle: bundle,
      themePackage: parsed.themePackage as PptxThemePackagePlan,
      themePackageXml:
        parsed.themePackageXml as PptxThemePackageXmlAuthoring,
      version: 1,
    }
  } catch {
    return null
  }
}

export function themeBundleFromStandaloneThemeFile(value: string) {
  return parseStandaloneThemeFile(value)?.themeBundle ?? null
}
