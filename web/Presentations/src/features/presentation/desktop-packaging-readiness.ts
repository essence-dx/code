import type { DesktopBridgeReadiness } from "./desktop-bridge-readiness"
import {
  desktopFileCommandPayloadForCommand,
  desktopFileCommandPayloadsFromReadiness,
  type DesktopFileCommandPayload,
  type DesktopFilePermissionScope,
} from "./desktop-file-command-payloads"
import { desktopRecentDocumentWriterPlan } from "./desktop-recent-documents"
import type {
  DesktopMenuCommandId,
  DesktopMenuContractRuntime,
} from "./desktop-menu-contract"
import {
  deckFileAcceptExtensions,
  essenceDeckFileExtension,
  legacyDeckFileExtension,
} from "./deck-file-format"
import type { RecentLocalDeckFile } from "./recent-local-deck-files"

export type DesktopPackagingReadinessStatus =
  | "attention"
  | "blocked"
  | "ready"

export type DesktopPackagingMetadata = {
  appIdentifier?: string
  bundleTargets?: string[]
  codeSigningIdentity?: string
  notarizationProfile?: string
  productName?: string
  version?: string
}

export type DesktopFileAssociationPlan = {
  commandIds: DesktopMenuCommandId[]
  detail: string
  extensions: string[]
  id: string
  label: string
  permissionScopes: DesktopFilePermissionScope[]
  status: DesktopPackagingReadinessStatus
}

export type DesktopRecentDocumentRegistrationItem = {
  commandId?: string
  detail: string
  extension: string
  id: string
  lastOpenedAt: number
  name: string
  nativePath?: string
  osRecentDocumentEligible: boolean
  pinned: boolean
  stale: boolean
}

export type DesktopRecentDocumentRegistrationSummary = {
  blockedCount: number
  detail: string
  items: DesktopRecentDocumentRegistrationItem[]
  label: string
  legacyJsonCount: number
  missingNativePathCount: number
  osEligibleCount: number
  pinnedCount: number
  staleCount: number
  status: DesktopPackagingReadinessStatus
  totalCount: number
  writerCommandCount: number
}

export type DesktopSignedPackageCheck = {
  detail: string
  id: string
  label: string
  status: DesktopPackagingReadinessStatus
}

export type DesktopOpenSaveEdgeCase = {
  commandId: DesktopMenuCommandId
  detail: string
  expected: string
  id: string
  label: string
  status: DesktopPackagingReadinessStatus
}

export type DesktopPackagingReadinessReport = {
  fileAssociations: DesktopFileAssociationPlan[]
  label: string
  openSaveEdgeCases: DesktopOpenSaveEdgeCase[]
  readyCheckCount: number
  recentDocuments: DesktopRecentDocumentRegistrationSummary
  signedPackageChecks: DesktopSignedPackageCheck[]
  status: DesktopPackagingReadinessStatus
  summary: string
  totalCheckCount: number
}

type FileAssociationRequirement = {
  commandIds: DesktopMenuCommandId[]
  detail: string
  extensions: string[]
  id: string
  label: string
  permissionScopes: DesktopFilePermissionScope[]
}

const fileAssociationRequirements = [
  {
    commandIds: ["file.open", "file.save", "file.saveAsJson"],
    detail:
      "Current deck files use an app-owned Essence extension while legacy JSON decks remain openable through the scoped native file bridge.",
    extensions: [...deckFileAcceptExtensions],
    id: "essence-deck-file",
    label: "Essence deck files",
    permissionScopes: ["read-deck-file", "write-deck-file"],
  },
  {
    commandIds: ["file.importPresentation"],
    detail:
      "PowerPoint and OpenDocument files should route into the existing import flow rather than broad read access.",
    extensions: [".pptx", ".odp"],
    id: "presentation-import",
    label: "Presentation imports",
    permissionScopes: ["read-presentation-file"],
  },
  {
    commandIds: ["file.exportPptx"],
    detail:
      "PPTX exports should be advertised as save targets without claiming native editable ownership yet.",
    extensions: [".pptx"],
    id: "pptx-export",
    label: "PowerPoint export targets",
    permissionScopes: ["write-export-file"],
  },
] satisfies FileAssociationRequirement[]

function capabilityReady(
  readiness: DesktopBridgeReadiness,
  capabilityId: string,
) {
  return readiness.capabilities.some(
    (capability) => capability.id === capabilityId && capability.ready,
  )
}

function payloadIsNativeReady(payload: DesktopFileCommandPayload | undefined) {
  return payload?.status === "ready" && payload.channel === "native-shell"
}

function combineStatuses(
  statuses: DesktopPackagingReadinessStatus[],
): DesktopPackagingReadinessStatus {
  if (statuses.includes("blocked")) return "blocked"
  if (statuses.includes("attention")) return "attention"
  return "ready"
}

function planFileAssociation(
  requirement: FileAssociationRequirement,
  readiness: DesktopBridgeReadiness,
  runtime: DesktopMenuContractRuntime,
): DesktopFileAssociationPlan {
  const payloads = requirement.commandIds.map((commandId) =>
    desktopFileCommandPayloadForCommand(commandId, readiness, runtime),
  )
  const hasDesktopShell = capabilityReady(readiness, "desktopShell")
  const missingPayload = payloads.some((payload) => !payload)
  const nonNativePayload = payloads.some(
    (payload) => payload && !payloadIsNativeReady(payload),
  )
  const status = !hasDesktopShell || missingPayload
    ? "blocked"
    : nonNativePayload
      ? "attention"
      : "ready"

  return {
    commandIds: requirement.commandIds,
    detail:
      status === "ready"
        ? `${requirement.detail} Native shell command payloads are ready.`
        : status === "attention"
          ? `${requirement.detail} Browser fallbacks still cover the flow, but native shell registration is not complete.`
          : `${requirement.detail} Desktop shell support is required before this association is safe to register.`,
    extensions: requirement.extensions,
    id: requirement.id,
    label: requirement.label,
    permissionScopes: requirement.permissionScopes,
    status,
  }
}

function recentRegistrationSummary(
  recents: RecentLocalDeckFile[],
  options: {
    now?: number | Date
    staleDays?: number
  },
): DesktopRecentDocumentRegistrationSummary {
  const writerPlan = desktopRecentDocumentWriterPlan(recents, options)
  const items = writerPlan.items.map(
    (item): DesktopRecentDocumentRegistrationItem => ({
      commandId: item.command?.command,
      detail: item.detail,
      extension: item.extension,
      id: item.id,
      lastOpenedAt: item.lastOpenedAt,
      name: item.name,
      nativePath: item.nativePath,
      osRecentDocumentEligible: item.status === "ready",
      pinned: item.pinned,
      stale: item.stale,
    }),
  )
  const pinnedCount = items.filter((item) => item.pinned).length

  return {
    blockedCount: writerPlan.blockedCount,
    detail:
      writerPlan.status === "ready"
        ? `Every current recent file can be registered through the scoped ${essenceDeckFileExtension} OS writer.`
        : writerPlan.status === "attention"
          ? "Some recent files are OS-ready, while stale, browser-only, or legacy JSON entries need review."
          : "No recent local file is ready for OS recent-document registration.",
    items,
    label: `${writerPlan.writerCommandCount} of ${items.length} recent files OS-ready`,
    legacyJsonCount: writerPlan.legacyJsonCount,
    missingNativePathCount: writerPlan.missingNativePathCount,
    osEligibleCount: writerPlan.readyCount,
    pinnedCount,
    staleCount: writerPlan.staleCount,
    status: writerPlan.status,
    totalCount: writerPlan.totalCount,
    writerCommandCount: writerPlan.writerCommandCount,
  }
}

function signedPackageChecks(
  readiness: DesktopBridgeReadiness,
  runtime: DesktopMenuContractRuntime,
  packaging: DesktopPackagingMetadata,
): DesktopSignedPackageCheck[] {
  const commandPayloads = desktopFileCommandPayloadsFromReadiness(readiness, {
    ...runtime,
    canExportSelectedSlide: true,
  })
  const nativeCommandCount = commandPayloads.filter(payloadIsNativeReady).length
  const bundleTargets = packaging.bundleTargets ?? []

  return [
    {
      detail:
        packaging.productName && packaging.appIdentifier && packaging.version
          ? `${packaging.productName} ${packaging.version} is identified as ${packaging.appIdentifier}.`
          : "Product name, app identifier, and version must be present before signing release packages.",
      id: "bundle-identity",
      label: "Bundle identity",
      status:
        packaging.productName && packaging.appIdentifier && packaging.version
          ? "ready"
          : "blocked",
    },
    {
      detail: bundleTargets.length
        ? `Configured bundle targets: ${bundleTargets.join(", ")}.`
        : "Configure at least one desktop bundle target before release packaging.",
      id: "bundle-targets",
      label: "Bundle targets",
      status: bundleTargets.length ? "ready" : "attention",
    },
    {
      detail:
        nativeCommandCount === commandPayloads.length
          ? "Every File, Import, Export, and Recover command can route through the native shell bridge."
          : `${nativeCommandCount} of ${commandPayloads.length} desktop commands are native-shell ready.`,
      id: "native-command-bridge",
      label: "Native command bridge",
      status:
        nativeCommandCount === commandPayloads.length ? "ready" : "attention",
    },
    {
      detail: packaging.codeSigningIdentity
        ? `Code signing identity configured: ${packaging.codeSigningIdentity}.`
        : "Add platform signing credentials before distributing desktop installers.",
      id: "code-signing",
      label: "Code signing identity",
      status: packaging.codeSigningIdentity ? "ready" : "attention",
    },
    {
      detail: packaging.notarizationProfile
        ? `Notarization profile configured: ${packaging.notarizationProfile}.`
        : "Add notarization or store-submission metadata for platforms that require it.",
      id: "notarization",
      label: "Notarization metadata",
      status: packaging.notarizationProfile ? "ready" : "attention",
    },
  ]
}

function edgeCaseFromPayload(
  id: string,
  label: string,
  commandId: DesktopMenuCommandId,
  expected: string,
  detail: string,
  readiness: DesktopBridgeReadiness,
  runtime: DesktopMenuContractRuntime,
): DesktopOpenSaveEdgeCase {
  const payload = desktopFileCommandPayloadForCommand(
    commandId,
    readiness,
    runtime,
  )
  const status = payloadIsNativeReady(payload)
    ? "ready"
    : payload?.status === "fallback"
      ? "attention"
      : "blocked"

  return {
    commandId,
    detail,
    expected,
    id,
    label,
    status,
  }
}

function openSaveEdgeCases(
  readiness: DesktopBridgeReadiness,
  runtime: DesktopMenuContractRuntime,
): DesktopOpenSaveEdgeCase[] {
  const selectedSlideGuard = desktopFileCommandPayloadForCommand(
    "file.exportSlidePng",
    readiness,
    { ...runtime, canExportSelectedSlide: false },
  )

  return [
    edgeCaseFromPayload(
      "open-essence-deck",
      "Open Essence deck",
      "file.open",
      `Native open dialog accepts app-owned ${essenceDeckFileExtension} files and legacy ${legacyDeckFileExtension} decks.`,
      "Covers double-click/open-file handoff into the scoped deck reader.",
      readiness,
      runtime,
    ),
    edgeCaseFromPayload(
      "same-file-save",
      "Same-file save",
      "file.save",
      "Native save reuses the current path and stays scoped to deck writes.",
      "Covers Ctrl/Command+S and native current-file save reuse.",
      readiness,
      runtime,
    ),
    edgeCaseFromPayload(
      "save-as-deck-file",
      "Save as deck file",
      "file.saveAsJson",
      `Native save-as dialog suggests the ${essenceDeckFileExtension} deck extension.`,
      "Covers explicit save-as without mutating import/export permissions.",
      readiness,
      runtime,
    ),
    edgeCaseFromPayload(
      "presentation-import",
      "PPTX or ODP import",
      "file.importPresentation",
      "Native import accepts only PPTX and ODP presentation files.",
      "Covers Office-package import through the read-presentation scope.",
      readiness,
      runtime,
    ),
    edgeCaseFromPayload(
      "image-batch-import",
      "Image slide batch import",
      "file.importImageSlides",
      "Native multi-open dialog accepts only image-slide source formats.",
      "Covers multi-select import without broad read permissions.",
      readiness,
      runtime,
    ),
    {
      commandId: "file.exportSlidePng",
      detail:
        selectedSlideGuard?.status === "blocked"
          ? "The command stays unavailable until a slide is selected."
          : "Selected-slide export should be blocked when no slide is active.",
      expected: "Selected-slide exports are blocked without an active slide.",
      id: "selected-slide-export-guard",
      label: "Selected-slide export guard",
      status: selectedSlideGuard?.status === "blocked" ? "ready" : "blocked",
    },
  ]
}

export function desktopPackagingReadinessReport(
  readiness: DesktopBridgeReadiness,
  options: {
    now?: number | Date
    packaging?: DesktopPackagingMetadata
    recentFiles?: RecentLocalDeckFile[]
    runtime?: DesktopMenuContractRuntime
    staleDays?: number
  } = {},
): DesktopPackagingReadinessReport {
  const runtime = options.runtime ?? {}
  const fileAssociations = fileAssociationRequirements.map((requirement) =>
    planFileAssociation(requirement, readiness, runtime),
  )
  const recentDocuments = recentRegistrationSummary(options.recentFiles ?? [], {
    now: options.now,
    staleDays: options.staleDays,
  })
  const signedChecks = signedPackageChecks(
    readiness,
    runtime,
    options.packaging ?? {},
  )
  const edgeCases = openSaveEdgeCases(readiness, runtime)
  const statusInputs = [
    ...fileAssociations.map((item) => item.status),
    recentDocuments.status,
    ...signedChecks.map((item) => item.status),
    ...edgeCases.map((item) => item.status),
  ]
  const readyCheckCount = statusInputs.filter(
    (status) => status === "ready",
  ).length
  const status = combineStatuses(statusInputs)

  return {
    fileAssociations,
    label: "Desktop packaging readiness",
    openSaveEdgeCases: edgeCases,
    readyCheckCount,
    recentDocuments,
    signedPackageChecks: signedChecks,
    status,
    summary: `${readyCheckCount} of ${statusInputs.length} desktop packaging checks are ready.`,
    totalCheckCount: statusInputs.length,
  }
}

export function serializeDesktopPackagingReadinessReport(
  report: DesktopPackagingReadinessReport,
) {
  return [
    `${report.label}: ${report.summary} Status: ${report.status}.`,
    "File associations:",
    ...report.fileAssociations.map(
      (item) =>
        `- ${item.label} (${item.extensions.join(", ")}): ${item.status}. ${item.detail}`,
    ),
    "OS recent documents:",
    `- ${report.recentDocuments.label}: ${report.recentDocuments.status}. ${report.recentDocuments.detail}`,
    `- Writer commands: ${report.recentDocuments.writerCommandCount}; stale: ${report.recentDocuments.staleCount}; browser-only: ${report.recentDocuments.missingNativePathCount}; legacy JSON: ${report.recentDocuments.legacyJsonCount}.`,
    "Signed package checks:",
    ...report.signedPackageChecks.map(
      (item) => `- ${item.label}: ${item.status}. ${item.detail}`,
    ),
    "Native open/save edge cases:",
    ...report.openSaveEdgeCases.map(
      (item) => `- ${item.label}: ${item.status}. ${item.expected}`,
    ),
  ].join("\n")
}
