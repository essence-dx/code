import { readFile } from "node:fs/promises"

import { cloudSyncE2eReadinessReport } from "../src/features/presentation/cloud-sync-e2e-readiness"

async function readStorageState(path: string | undefined) {
  if (!path) return undefined

  try {
    return await readFile(path, "utf8")
  } catch {
    return undefined
  }
}

const report = cloudSyncE2eReadinessReport({
  appUrl: process.env.CLOUD_SYNC_E2E_URL,
  flowId: process.env.CLOUD_SYNC_E2E_FLOW_ID,
  requireUrl: process.env.CLOUD_SYNC_E2E_REQUIRE_URL === "true",
  storageStatePath: process.env.CLOUD_SYNC_E2E_STORAGE_STATE,
  storageStateText: await readStorageState(process.env.CLOUD_SYNC_E2E_STORAGE_STATE),
  timeoutMs: process.env.CLOUD_SYNC_E2E_TIMEOUT_MS,
})

for (const check of report.checks) {
  console.log(`${check.status.toUpperCase()} ${check.label}: ${check.detail}`)
}

console.log(
  `Cloud sync e2e readiness checked ${report.selectedFlowCount} flow(s), ${report.stepCount} step(s), ${report.failedCount} failure(s), and ${report.warningCount} warning(s).`,
)

if (report.failedCount > 0) {
  process.exitCode = 1
}
