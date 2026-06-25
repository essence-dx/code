import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import { readProductionDataSnapshots } from "../src/server/admin/production-data-snapshots"
import { cloudDataHealthReport } from "../src/features/presentation/cloud-data-health"
import { desktopBridgeReadinessFromCapabilities } from "../src/features/presentation/desktop-bridge-readiness"
import { desktopLocalFileDiagnosticsReport } from "../src/features/presentation/desktop-local-file-diagnostics"
import { deckFileAcceptExtensions } from "../src/features/presentation/deck-file-format"
import {
  localDeckFileStatus,
  type LocalDeckFileSession,
} from "../src/features/presentation/local-deck-file-state"
import {
  productionReadinessHealthReport,
  serializeProductionReadinessHealthJson,
  serializeProductionReadinessHealthReport,
} from "../src/features/presentation/production-readiness-health"
import { productionDataOperationsReport } from "../src/features/presentation/production-data-operations"
import { smokeFixtureLifecyclePlanFromEnv } from "../src/features/presentation/smoke-fixture-lifecycle"
import { createDefaultDeck } from "../src/features/presentation/default-deck"
import type { NativeDesktopFileCapabilities } from "../src/features/presentation/desktop-native-file-api"

type JsonObject = Record<string, unknown>

const args = new Set(process.argv.slice(2))
const outputJson =
  args.has("--json") || process.env.PRODUCTION_HEALTH_FORMAT === "json"
const root = process.cwd()

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {}
}

async function readJson(path: string) {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown
  } catch {
    return null
  }
}

function nativeCapabilities(withGlobalTauri: boolean): NativeDesktopFileCapabilities | null {
  if (!withGlobalTauri) return null

  return {
    maxFileBytes: 50 * 1024 * 1024,
    scopes: [
      {
        acceptExtensions: [...deckFileAcceptExtensions],
        canRead: true,
        canWrite: false,
        permissionScope: "read-deck-file",
      },
      {
        acceptExtensions: [...deckFileAcceptExtensions],
        canRead: false,
        canWrite: true,
        permissionScope: "write-deck-file",
      },
      {
        acceptExtensions: [".pptx", ".odp"],
        canRead: true,
        canWrite: false,
        permissionScope: "read-presentation-file",
      },
      {
        acceptExtensions: [".pptx", ".pdf", ".svg", ".png"],
        canRead: false,
        canWrite: true,
        permissionScope: "write-export-file",
      },
    ],
  }
}

async function readCloudDataReports() {
  try {
    const snapshots = await readProductionDataSnapshots()

    return {
      cloudData: cloudDataHealthReport(snapshots.cloudData),
      dataOperations: productionDataOperationsReport(snapshots.operations),
    }
  } catch (error) {
    const databaseError = error instanceof Error ? error.message : String(error)

    return {
      cloudData: cloudDataHealthReport({
        databaseError,
        databaseReachable: false,
      }),
      dataOperations: productionDataOperationsReport({
        databaseReachable: false,
      }),
    }
  }
}

const tauriConfig = asObject(
  await readJson(resolve(root, "src-tauri", "tauri.conf.json")),
)
const app = asObject(tauriConfig.app)
const withGlobalTauri = app.withGlobalTauri === true
const defaultDeck = createDefaultDeck()
const exportedDeck = { deck: defaultDeck, version: 1 as const }
const currentFileSession: LocalDeckFileSession | null = null
const desktopLocalFiles = desktopLocalFileDiagnosticsReport({
  currentFileSession,
  currentFileStatus: localDeckFileStatus({
    current: exportedDeck,
    session: currentFileSession,
  }),
  nativeCapabilities: nativeCapabilities(withGlobalTauri),
  readiness: desktopBridgeReadinessFromCapabilities({
    clipboard: true,
    desktopShell: withGlobalTauri,
    fileOpen: withGlobalTauri,
    fileSave: withGlobalTauri,
    persistentHandles: true,
    recoveryStorage: true,
  }),
  runtime: { canExportSelectedSlide: true },
})
const smokeFixtureLifecycle = smokeFixtureLifecyclePlanFromEnv(process.env)
const smokeFixtures = smokeFixtureLifecycle.readiness
const smokeExecutionPlan = smokeFixtureLifecycle.executionPlan
const { cloudData, dataOperations } = await readCloudDataReports()
const report = productionReadinessHealthReport({
  cloudData,
  dataOperations,
  desktopLocalFiles,
  smokeExecutionPlan,
  smokeFixtureLifecycle,
  smokeFixtures,
})

console.log(
  outputJson
    ? serializeProductionReadinessHealthJson(report)
    : serializeProductionReadinessHealthReport(report),
)

if (
  process.env.PRODUCTION_HEALTH_STRICT === "true" &&
  report.status === "blocked"
) {
  process.exitCode = 1
}
