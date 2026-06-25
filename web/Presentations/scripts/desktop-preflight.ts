import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import { desktopBridgeReadinessFromCapabilities } from "../src/features/presentation/desktop-bridge-readiness"
import {
  desktopPackagingReadinessReport,
  serializeDesktopPackagingReadinessReport,
} from "../src/features/presentation/desktop-packaging-readiness"
import {
  desktopReleaseRegistrationReport,
  serializeDesktopReleaseRegistrationReport,
  type DesktopTauriFileAssociation,
} from "../src/features/presentation/desktop-release-registration"

type DesktopMode = "hosted-web" | "static-export" | "local-native-backend"

type DesktopProfile = {
  mode: DesktopMode
  productionUrl: string
  devUrl: string
  serverRequired: boolean
  requiresNetworkForLaunch: boolean
  offlineEditingFallback: string
  releaseGates: string[]
}

type CheckStatus = "pass" | "warn" | "fail"

type Check = {
  status: CheckStatus
  label: string
  detail: string
}

type JsonObject = Record<string, unknown>

const root = process.cwd()
const profilePath = resolve(root, "src-tauri", "desktop.profile.json")
const tauriConfigPath = resolve(root, "src-tauri", "tauri.conf.json")
const capabilitiesPath = resolve(root, "src-tauri", "capabilities", "default.json")

const asObject = (value: unknown, label: string): JsonObject => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`)
  }

  return value as JsonObject
}

const asOptionalObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {}

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []

const parseJsonFile = async (path: string, label: string): Promise<JsonObject> => {
  const contents = await readFile(path, "utf8")
  return asObject(JSON.parse(contents), label)
}

const parseUrl = (value: string | undefined): URL | undefined => {
  if (!value) {
    return undefined
  }

  try {
    return new URL(value)
  } catch {
    return undefined
  }
}

const addCheck = (
  checks: Check[],
  status: CheckStatus,
  label: string,
  detail: string,
) => {
  checks.push({ status, label, detail })
}

const profile = (await parseJsonFile(profilePath, "Desktop profile")) as DesktopProfile
const tauriConfig = await parseJsonFile(tauriConfigPath, "Tauri config")
const capabilities = await parseJsonFile(capabilitiesPath, "Default capabilities")
const build = asObject(tauriConfig.build, "Tauri build config")
const app = asObject(tauriConfig.app, "Tauri app config")
const bundle = asObject(tauriConfig.bundle, "Tauri bundle config")
const security = asObject(app.security, "Tauri security config")
const withGlobalTauri = app.withGlobalTauri === true

const frontendDist = asString(build.frontendDist)
const devUrl = asString(build.devUrl)
const beforeBuildCommand = asString(build.beforeBuildCommand)
const productionUrl = parseUrl(frontendDist)
const localDevUrl = parseUrl(devUrl)
const windows = Array.isArray(app.windows) ? app.windows.map((window) => asObject(window, "Tauri window")) : []
const permissions = asStringArray(capabilities.permissions)
const releaseGates = asStringArray(profile.releaseGates)
const bundleTargets =
  typeof bundle.targets === "string"
    ? [bundle.targets]
    : asStringArray(bundle.targets)
const fileAssociations = Array.isArray(bundle.fileAssociations)
  ? (bundle.fileAssociations.filter(
      (association): association is DesktopTauriFileAssociation =>
        Boolean(association) &&
        typeof association === "object" &&
        !Array.isArray(association),
    ) as DesktopTauriFileAssociation[])
  : []
const windowsBundle = asOptionalObject(bundle.windows)
const macOsBundle = asOptionalObject(bundle.macOS)
const hasSigningInputs = Boolean(
  asString(windowsBundle.certificateThumbprint) ||
    asString(windowsBundle.signCommand) ||
    asString(macOsBundle.signingIdentity),
)
const hasNotarizationInputs = Boolean(
  asString(macOsBundle.notarizationTeamId) ||
    asString(macOsBundle.notarizationAppleId) ||
    asString(macOsBundle.notarizationPassword) ||
    asString(macOsBundle.providerShortName),
)

const checks: Check[] = []

addCheck(
  checks,
  profile.mode === "hosted-web" ? "pass" : "fail",
  "desktop packaging mode",
  `Expected hosted-web because the app depends on hosted auth, database, and route handlers; found ${profile.mode}.`,
)

addCheck(
  checks,
  productionUrl?.protocol === "https:" && frontendDist === profile.productionUrl ? "pass" : "fail",
  "production shell target",
  `Tauri frontendDist is ${frontendDist ?? "missing"}; profile production URL is ${profile.productionUrl}.`,
)

addCheck(
  checks,
  localDevUrl?.hostname === "localhost" && devUrl === profile.devUrl ? "pass" : "fail",
  "development shell target",
  `Tauri devUrl is ${devUrl ?? "missing"}; profile dev URL is ${profile.devUrl}.`,
)

addCheck(
  checks,
  beforeBuildCommand === "" ? "pass" : "fail",
  "release build command",
  "Hosted desktop releases should not run a local Next.js build from Tauri.",
)

addCheck(
  checks,
  profile.serverRequired && profile.requiresNetworkForLaunch ? "pass" : "warn",
  "network dependency",
  profile.serverRequired
    ? "The hosted shell correctly records that the app server is required."
    : "The profile should explicitly record whether the desktop app needs the hosted server.",
)

addCheck(
  checks,
  windows.length > 0 ? "pass" : "fail",
  "desktop window",
  `${windows.length} Tauri window definition(s) found.`,
)

const mainWindow = windows[0]
if (mainWindow) {
  const width = Number(mainWindow.width)
  const height = Number(mainWindow.height)

  addCheck(
    checks,
    Number.isFinite(width) && width >= 1280 && Number.isFinite(height) && height >= 800 ? "pass" : "warn",
    "editor viewport",
    `Main window is ${mainWindow.width ?? "unknown"}x${mainWindow.height ?? "unknown"}.`,
  )
}

addCheck(
  checks,
  permissions.length === 1 && permissions[0] === "core:default" ? "pass" : "warn",
  "tauri permissions",
  `Default permissions: ${permissions.length > 0 ? permissions.join(", ") : "none"}.`,
)

addCheck(
  checks,
  withGlobalTauri ? "pass" : "warn",
  "tauri global api",
  withGlobalTauri
    ? "window.__TAURI__ is available for the scoped native file bridge."
    : "The native file bridge expects the documented global Tauri API.",
)

addCheck(
  checks,
  security.csp === null ? "warn" : "pass",
  "content security policy",
  security.csp === null
    ? "CSP is delegated to the hosted web app for now."
    : "A Tauri-side CSP is configured.",
)

addCheck(
  checks,
  releaseGates.length >= 4 ? "pass" : "warn",
  "release gates",
  `${releaseGates.length} desktop release gate(s) are documented in the packaging profile.`,
)

const desktopPackaging = desktopPackagingReadinessReport(
  desktopBridgeReadinessFromCapabilities({
    clipboard: true,
    desktopShell: true,
    fileOpen: withGlobalTauri,
    fileSave: withGlobalTauri,
    persistentHandles: true,
    recoveryStorage: true,
  }),
  {
    packaging: {
      appIdentifier: asString(tauriConfig.identifier),
      bundleTargets,
      productName: asString(tauriConfig.productName),
      version: asString(tauriConfig.version),
    },
    runtime: { canExportSelectedSlide: true },
  },
)
const desktopRegistration = desktopReleaseRegistrationReport({
  fileAssociations,
  hasNativeRecentPathMetadata: withGlobalTauri,
  hasNotarizationInputs,
  hasOsRecentDocumentWriter: withGlobalTauri,
  hasSigningInputs,
  recentDocumentWriterCommandCount:
    desktopPackaging.recentDocuments.writerCommandCount,
  releaseGates,
})

addCheck(
  checks,
  desktopPackaging.status === "ready"
    ? "pass"
    : desktopPackaging.status === "attention"
      ? "warn"
      : "fail",
  "desktop packaging readiness",
  desktopPackaging.summary,
)

addCheck(
  checks,
  desktopRegistration.status === "ready"
    ? "pass"
    : desktopRegistration.status === "attention"
      ? "warn"
      : "fail",
  "desktop release registration",
  desktopRegistration.summary,
)

const failedChecks = checks.filter((check) => check.status === "fail")
const warningChecks = checks.filter((check) => check.status === "warn")

for (const check of checks) {
  const marker = check.status === "pass" ? "PASS" : check.status === "warn" ? "WARN" : "FAIL"
  console.log(`${marker} ${check.label}: ${check.detail}`)
}

console.log(
  `Desktop preflight finished with ${failedChecks.length} failure(s) and ${warningChecks.length} warning(s).`,
)
console.log(serializeDesktopPackagingReadinessReport(desktopPackaging))
console.log(serializeDesktopReleaseRegistrationReport(desktopRegistration))

if (failedChecks.length > 0) {
  process.exitCode = 1
}
