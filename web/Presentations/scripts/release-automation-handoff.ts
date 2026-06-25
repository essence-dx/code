import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import { cloudSyncE2eReadinessReport } from "../src/features/presentation/cloud-sync-e2e-readiness"
import { desktopBridgeReadinessFromCapabilities } from "../src/features/presentation/desktop-bridge-readiness"
import {
  desktopPackagingReadinessReport,
  type DesktopPackagingMetadata,
} from "../src/features/presentation/desktop-packaging-readiness"
import {
  desktopReleaseRegistrationReport,
  type DesktopTauriFileAssociation,
} from "../src/features/presentation/desktop-release-registration"
import {
  presentationSmokeExecutionReadinessReport,
  type PresentationSmokeExecutionFixtureMode,
} from "../src/features/presentation/presentation-smoke-execution-readiness"
import {
  releaseAutomationHandoffReport,
  serializeReleaseAutomationHandoffJson,
  serializeReleaseAutomationHandoffReport,
} from "../src/features/presentation/release-automation-handoff"
import { releaseEnvironmentReadinessReport } from "../src/features/presentation/release-environment-readiness"
import { smokeFixtureLifecyclePlanFromEnv } from "../src/features/presentation/smoke-fixture-lifecycle"

type JsonObject = Record<string, unknown>

type DesktopProfile = {
  productionUrl?: string
  releaseGates?: string[]
}

type VercelProjectLink = {
  orgId?: string
  projectId?: string
  projectName?: string
}

const root = process.cwd()
const args = new Set(process.argv.slice(2))
const outputJson =
  args.has("--json") || process.env.RELEASE_HANDOFF_FORMAT === "json"

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {}
}

function asOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

async function readJson(path: string) {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown
  } catch {
    return null
  }
}

async function readText(path: string | undefined) {
  if (!path) return undefined

  try {
    return await readFile(path, "utf8")
  } catch {
    return undefined
  }
}

function fixtureMode(value: string | undefined): PresentationSmokeExecutionFixtureMode {
  if (value === "mutation-safe" || value === "read-only") return value
  return "none"
}

const profile = asObject(
  await readJson(resolve(root, "src-tauri", "desktop.profile.json")),
) as DesktopProfile
const tauriConfig = asObject(
  await readJson(resolve(root, "src-tauri", "tauri.conf.json")),
)
const vercelProject = asObject(
  await readJson(resolve(root, ".vercel", "project.json")),
) as VercelProjectLink

const app = asObject(tauriConfig.app)
const bundle = asObject(tauriConfig.bundle)
const windowsBundle = asObject(bundle.windows)
const macOsBundle = asObject(bundle.macOS)
const withGlobalTauri = app.withGlobalTauri === true
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
const codeSigningIdentity =
  asOptionalString(windowsBundle.certificateThumbprint) ??
  asOptionalString(windowsBundle.signCommand) ??
  asOptionalString(macOsBundle.signingIdentity)
const notarizationProfile =
  asOptionalString(macOsBundle.notarizationTeamId) ??
  asOptionalString(macOsBundle.notarizationAppleId) ??
  asOptionalString(macOsBundle.notarizationPassword) ??
  asOptionalString(macOsBundle.providerShortName)
const packaging: DesktopPackagingMetadata = {
  appIdentifier: asOptionalString(tauriConfig.identifier),
  bundleTargets,
  codeSigningIdentity,
  notarizationProfile,
  productName: asOptionalString(tauriConfig.productName),
  version: asOptionalString(tauriConfig.version),
}
const bridgeReadiness = desktopBridgeReadinessFromCapabilities({
  clipboard: true,
  desktopShell: withGlobalTauri,
  fileOpen: withGlobalTauri,
  fileSave: withGlobalTauri,
  persistentHandles: true,
  recoveryStorage: true,
})
const desktopPackaging = desktopPackagingReadinessReport(bridgeReadiness, {
  packaging,
  runtime: { canExportSelectedSlide: true },
})
const desktopRegistration = desktopReleaseRegistrationReport({
  fileAssociations,
  hasNativeRecentPathMetadata: withGlobalTauri,
  hasNotarizationInputs: Boolean(notarizationProfile),
  hasOsRecentDocumentWriter: withGlobalTauri,
  hasSigningInputs: Boolean(codeSigningIdentity),
  recentDocumentWriterCommandCount:
    desktopPackaging.recentDocuments.writerCommandCount,
  releaseGates: profile.releaseGates ?? [],
})
const smokeExecution = presentationSmokeExecutionReadinessReport({
  appUrl: process.env.PRESENTATION_SMOKE_URL,
  fixtureDeckId: process.env.PRESENTATION_SMOKE_FIXTURE_DECK_ID,
  fixtureMode: fixtureMode(process.env.PRESENTATION_SMOKE_FIXTURE_MODE),
  flowId: process.env.PRESENTATION_SMOKE_FLOW_ID,
  requireMutationSafeFixture:
    process.env.PRESENTATION_SMOKE_REQUIRE_MUTATION_SAFE_FIXTURE === "true",
  requireSeededCredentials:
    process.env.PRESENTATION_SMOKE_REQUIRE_SEEDED_CREDENTIALS === "true",
  requireUrl: process.env.PRESENTATION_SMOKE_REQUIRE_URL === "true",
  seededEmail:
    process.env.PRESENTATION_SMOKE_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL,
  seededPassword:
    process.env.PRESENTATION_SMOKE_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD,
  timeoutMs: process.env.PRESENTATION_SMOKE_TIMEOUT_MS,
})
const smokeFixtureLifecycle = smokeFixtureLifecyclePlanFromEnv(process.env)
const smokeExecutionPlan = smokeFixtureLifecycle.executionPlan
const cloudSyncReadiness = cloudSyncE2eReadinessReport({
  appUrl: process.env.CLOUD_SYNC_E2E_URL,
  flowId: process.env.CLOUD_SYNC_E2E_FLOW_ID,
  requireUrl: process.env.CLOUD_SYNC_E2E_REQUIRE_URL === "true",
  storageStatePath: process.env.CLOUD_SYNC_E2E_STORAGE_STATE,
  storageStateText: await readText(process.env.CLOUD_SYNC_E2E_STORAGE_STATE),
  timeoutMs: process.env.CLOUD_SYNC_E2E_TIMEOUT_MS,
})
const environment = releaseEnvironmentReadinessReport({
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
  betterAuthSecret: process.env.BETTER_AUTH_SECRET,
  betterAuthUrl: process.env.BETTER_AUTH_URL,
  brevoApiKey: process.env.BREVO_API_KEY,
  brevoSenderEmail: process.env.BREVO_SENDER_EMAIL,
  nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
  productionUrl: profile.productionUrl,
  requireHostedDatabase:
    process.env.RELEASE_REQUIRE_HOSTED_DATABASE === "true",
  requireProductionSecrets:
    process.env.RELEASE_REQUIRE_PRODUCTION_SECRETS === "true",
  tursoAuthToken: process.env.TURSO_AUTH_TOKEN,
  tursoDatabaseUrl: process.env.TURSO_DATABASE_URL,
  vercelOrgId: vercelProject.orgId,
  vercelProjectId: vercelProject.projectId,
  vercelProjectName: vercelProject.projectName,
  vercelUrl: process.env.VERCEL_URL,
})
const report = releaseAutomationHandoffReport({
  cloudSyncReadiness,
  desktopPackaging,
  desktopRegistration,
  environment,
  smokeExecution,
  smokeExecutionPlan,
  smokeFixtureLifecycle,
  target: profile.productionUrl ?? "essence-powerpoint",
})

console.log(
  outputJson
    ? serializeReleaseAutomationHandoffJson(report)
    : serializeReleaseAutomationHandoffReport(report),
)

if (process.env.RELEASE_HANDOFF_STRICT === "true" && report.status === "blocked") {
  process.exitCode = 1
}
