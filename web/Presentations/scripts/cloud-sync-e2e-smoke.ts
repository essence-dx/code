import { readFile } from "node:fs/promises"

import {
  cloudSyncE2eFlows,
  type CloudSyncE2eFlow,
} from "../src/features/presentation/cloud-sync-e2e-contract"
import { cloudSyncE2eReadinessReport } from "../src/features/presentation/cloud-sync-e2e-readiness"
import { cloudSyncTestIds } from "../src/features/presentation/cloud-sync-test-ids"
import {
  createCloudSyncLocatorDriver,
  runCloudSyncE2eFlows,
  type CloudSyncLocatorPage,
} from "../src/features/presentation/cloud-sync-e2e-runner"

type BrowserContextLike = {
  newPage: () => Promise<CloudSyncLocatorPage & PageLike>
}

type BrowserLike = {
  close: () => Promise<void>
  newContext: (options?: { storageState?: string }) => Promise<BrowserContextLike>
}

type PageLike = {
  goto: (
    url: string,
    options?: { waitUntil?: "load" | "domcontentloaded" | "networkidle" },
  ) => Promise<void>
}

type PlaywrightLike = {
  chromium: {
    launch: (options?: { headless?: boolean }) => Promise<BrowserLike>
  }
}

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required.`)
  }

  return value
}

async function loadPlaywright(): Promise<PlaywrightLike> {
  const importer = new Function("specifier", "return import(specifier)") as (
    specifier: string,
  ) => Promise<unknown>

  const loaded = await importer("@playwright/test").catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)

    throw new Error(
      `@playwright/test is not installed or not resolvable. Install it in CI/dev before running this smoke check. ${message}`,
    )
  })
  const playwright = loaded as Partial<PlaywrightLike>

  if (!playwright.chromium?.launch) {
    throw new Error("@playwright/test did not expose chromium.launch.")
  }

  return playwright as PlaywrightLike
}

function selectedFlows(flowId: string | undefined): readonly CloudSyncE2eFlow[] {
  if (!flowId) return cloudSyncE2eFlows

  const flow = cloudSyncE2eFlows.find((item) => item.id === flowId)
  if (!flow) {
    throw new Error(
      `Unknown CLOUD_SYNC_E2E_FLOW_ID "${flowId}". Available: ${cloudSyncE2eFlows
        .map((item) => item.id)
        .join(", ")}`,
    )
  }

  return [flow]
}

const url = readRequiredEnv("CLOUD_SYNC_E2E_URL")
const readiness = cloudSyncE2eReadinessReport({
  appUrl: url,
  flowId: process.env.CLOUD_SYNC_E2E_FLOW_ID,
  requireUrl: true,
  storageStatePath: process.env.CLOUD_SYNC_E2E_STORAGE_STATE,
  storageStateText: process.env.CLOUD_SYNC_E2E_STORAGE_STATE
    ? await readFile(process.env.CLOUD_SYNC_E2E_STORAGE_STATE, "utf8").catch(
        () => undefined,
      )
    : undefined,
  timeoutMs: process.env.CLOUD_SYNC_E2E_TIMEOUT_MS,
})

if (readiness.failedCount > 0) {
  throw new Error(
    `Cloud sync e2e readiness failed: ${readiness.checks
      .filter((check) => check.status === "fail")
      .map((check) => `${check.label}: ${check.detail}`)
      .join("; ")}`,
  )
}

const playwright = await loadPlaywright()
const browser = await playwright.chromium.launch({
  headless: process.env.CLOUD_SYNC_E2E_HEADLESS !== "false",
})

try {
  const context = await browser.newContext(
    process.env.CLOUD_SYNC_E2E_STORAGE_STATE
      ? { storageState: process.env.CLOUD_SYNC_E2E_STORAGE_STATE }
      : undefined,
  )
  const page = await context.newPage()

  await page.goto(url, { waitUntil: "networkidle" })
  const results = await runCloudSyncE2eFlows({
    driver: createCloudSyncLocatorDriver(page, {
      timeoutMs: Number(process.env.CLOUD_SYNC_E2E_TIMEOUT_MS) || 5000,
    }),
    fillValues: {
      [cloudSyncTestIds.searchInput]:
        process.env.CLOUD_SYNC_E2E_SEARCH_QUERY ?? "",
    },
    flows: selectedFlows(process.env.CLOUD_SYNC_E2E_FLOW_ID),
    onStep(step) {
      console.log(
        `${step.flowId} #${step.stepIndex + 1} ${step.action} ${step.testId}`,
      )
    },
  })

  console.log(
    `Cloud sync e2e smoke completed ${results.length} flow(s), ${results.reduce(
      (total, result) => total + result.stepCount,
      0,
    )} step(s).`,
  )
} finally {
  await browser.close()
}
