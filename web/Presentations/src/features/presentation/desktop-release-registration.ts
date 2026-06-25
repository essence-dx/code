import {
  essenceDeckFileExtension,
  essenceDeckMimeType,
  legacyDeckFileExtension,
} from "./deck-file-format"

export type DesktopReleaseRegistrationStatus =
  | "attention"
  | "blocked"
  | "ready"

export type DesktopTauriFileAssociation = {
  contentTypes?: string[]
  description?: string
  ext?: string[]
  exportedType?: {
    conformsTo?: string[]
    identifier?: string
  }
  mimeType?: string
  name?: string
  rank?: string
  role?: string
}

export type DesktopReleaseRegistrationCheck = {
  detail: string
  id: string
  label: string
  status: DesktopReleaseRegistrationStatus
}

export type DesktopReleaseRegistrationReport = {
  checks: DesktopReleaseRegistrationCheck[]
  label: string
  readyCheckCount: number
  status: DesktopReleaseRegistrationStatus
  summary: string
  totalCheckCount: number
}

type DesktopReleaseRegistrationInput = {
  fileAssociations?: DesktopTauriFileAssociation[]
  hasNativeRecentPathMetadata?: boolean
  hasNotarizationInputs?: boolean
  hasOsRecentDocumentWriter?: boolean
  hasSigningInputs?: boolean
  recentDocumentWriterCommandCount?: number
  releaseGates?: string[]
}

const essenceDeckExtensionName = essenceDeckFileExtension.replace(".", "")
const legacyDeckExtensionName = legacyDeckFileExtension.replace(".", "")

function normalizeExtension(extension: string) {
  return extension.trim().replace(/^\./, "").toLowerCase()
}

function associationExtensions(association: DesktopTauriFileAssociation) {
  return (association.ext ?? []).map(normalizeExtension)
}

function combineStatuses(
  statuses: DesktopReleaseRegistrationStatus[],
): DesktopReleaseRegistrationStatus {
  if (statuses.includes("blocked")) return "blocked"
  if (statuses.includes("attention")) return "attention"
  return "ready"
}

export function essenceDeckAssociationConfigured(
  fileAssociations: DesktopTauriFileAssociation[] = [],
) {
  return fileAssociations.find((association) =>
    associationExtensions(association).includes(essenceDeckExtensionName),
  )
}

function releaseGateMatches(releaseGates: string[] | undefined, terms: string[]) {
  const lowerGates = (releaseGates ?? []).map((gate) => gate.toLowerCase())

  return terms.every((term) =>
    lowerGates.some((gate) => gate.includes(term.toLowerCase())),
  )
}

export function desktopReleaseRegistrationReport(
  input: DesktopReleaseRegistrationInput,
): DesktopReleaseRegistrationReport {
  const association = essenceDeckAssociationConfigured(input.fileAssociations)
  const registeredGenericJson = (input.fileAssociations ?? []).some((item) =>
    associationExtensions(item).includes(legacyDeckExtensionName),
  )
  const exportedTypeConformsTo = association?.exportedType?.conformsTo ?? []
  const associationHasMime = association?.mimeType === essenceDeckMimeType
  const associationHasJsonConformance = exportedTypeConformsTo.includes("public.json")
  const releaseGates = input.releaseGates ?? []
  const hasRecentGate = releaseGateMatches(releaseGates, ["recent-document"])
  const hasSigningGate = releaseGateMatches(releaseGates, ["signing"])
  const hasFileAssociationGate = releaseGateMatches(releaseGates, [
    "file association",
  ])
  const writerCommandCount = input.recentDocumentWriterCommandCount ?? 0

  const checks: DesktopReleaseRegistrationCheck[] = [
    {
      detail: association
        ? `${essenceDeckFileExtension} is registered as the app-owned deck file type.`
        : `Register ${essenceDeckFileExtension} before desktop installers are shipped.`,
      id: "essence-deck-file-association",
      label: "App-owned deck association",
      status: association ? "ready" : "blocked",
    },
    {
      detail: registeredGenericJson
        ? "The bundle currently claims generic .json ownership; keep JSON as legacy-open only."
        : `${legacyDeckFileExtension} stays a legacy import/open format instead of a claimed OS file type.`,
      id: "legacy-json-not-claimed",
      label: "Legacy JSON ownership",
      status: registeredGenericJson ? "blocked" : "ready",
    },
    {
      detail:
        associationHasMime && associationHasJsonConformance
          ? `${essenceDeckFileExtension} declares ${essenceDeckMimeType} and public JSON conformance.`
          : "Add MIME and exported-type metadata so platforms classify deck files correctly.",
      id: "essence-deck-type-metadata",
      label: "Deck type metadata",
      status: associationHasMime && associationHasJsonConformance ? "ready" : "attention",
    },
    {
      detail: input.hasNativeRecentPathMetadata
        ? "Dialog-backed open/save responses include native paths for OS recent-document handoff."
        : "Native recent-document handoff needs native path metadata from the file bridge.",
      id: "native-recent-path-metadata",
      label: "Native recent path metadata",
      status: input.hasNativeRecentPathMetadata ? "ready" : "blocked",
    },
    {
      detail: input.hasOsRecentDocumentWriter
        ? writerCommandCount > 0
          ? `The desktop shell can write eligible deck files into the OS recent-document list, with ${writerCommandCount} scoped command payloads currently ready.`
          : "The desktop shell exposes the OS recent-document writer; recent files will register once native-path deck metadata exists."
        : "Add a platform writer before relying on OS-level recent-document menus.",
      id: "os-recent-document-writer",
      label: "OS recent-document writer",
      status: input.hasOsRecentDocumentWriter ? "ready" : "attention",
    },
    {
      detail:
        hasFileAssociationGate && hasRecentGate && hasSigningGate
          ? "Release gates mention file association, recent-document, and signing checks."
          : "Document file association, recent-document, and signing gates in the desktop profile.",
      id: "release-gate-coverage",
      label: "Release gate coverage",
      status:
        hasFileAssociationGate && hasRecentGate && hasSigningGate
          ? "ready"
          : "attention",
    },
    {
      detail: input.hasSigningInputs
        ? "Platform signing inputs are configured outside source control."
        : "Keep signing secrets out of git, but require them before publishing installers.",
      id: "platform-signing-inputs",
      label: "Platform signing inputs",
      status: input.hasSigningInputs ? "ready" : "attention",
    },
    {
      detail: input.hasNotarizationInputs
        ? "Notarization or store-submission inputs are configured outside source control."
        : "macOS notarization and store-submission metadata still need release-time configuration.",
      id: "platform-notarization-inputs",
      label: "Platform notarization inputs",
      status: input.hasNotarizationInputs ? "ready" : "attention",
    },
  ]
  const readyCheckCount = checks.filter((check) => check.status === "ready").length
  const status = combineStatuses(checks.map((check) => check.status))

  return {
    checks,
    label: "Desktop release registration",
    readyCheckCount,
    status,
    summary: `${readyCheckCount} of ${checks.length} desktop release registration checks are ready.`,
    totalCheckCount: checks.length,
  }
}

export function serializeDesktopReleaseRegistrationReport(
  report: DesktopReleaseRegistrationReport,
) {
  return [
    `${report.label}: ${report.summary} Status: ${report.status}.`,
    ...report.checks.map(
      (check) => `- ${check.label}: ${check.status}. ${check.detail}`,
    ),
  ].join("\n")
}
