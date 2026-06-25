import { readFile } from "node:fs/promises"

import { cloudSyncTestIds } from "../src/features/presentation/cloud-sync-test-ids"
import {
  createPresentationSmokeLocatorDriver,
  runPresentationBrowserSmokeFlows,
  selectedPresentationBrowserSmokeFlows,
  type PresentationSmokeLocatorPage,
} from "../src/features/presentation/presentation-browser-smoke-runner"
import { presentationSmokeTestIds } from "../src/features/presentation/presentation-smoke-test-ids"
import {
  presentationSmokeRunnerBridgeReport,
  serializePresentationSmokeRunnerBridgeReport,
} from "../src/features/presentation/presentation-smoke-runner-bridge"
import type { PresentationSmokeExecutionFixtureMode } from "../src/features/presentation/presentation-smoke-execution-readiness"
import type { SmokeFixtureExecutionHandoffMode } from "../src/features/presentation/smoke-fixture-execution-plan"

type BrowserContextLike = {
  newPage: () => Promise<PresentationSmokeLocatorPage & PageLike>
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

async function loadPlaywright(): Promise<PlaywrightLike> {
  const importer = new Function("specifier", "return import(specifier)") as (
    specifier: string,
  ) => Promise<unknown>
  const loaded = await importer("@playwright/test").catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)

    throw new Error(
      `@playwright/test is not installed or not resolvable. Install it before running the live smoke bridge. ${message}`,
    )
  })
  const playwright = loaded as Partial<PlaywrightLike>

  if (!playwright.chromium?.launch) {
    throw new Error("@playwright/test did not expose chromium.launch.")
  }

  return playwright as PlaywrightLike
}

function envFlag(name: string) {
  return process.env[name] === "true" || process.env[name] === "1"
}

function fixtureMode(value: string | undefined): PresentationSmokeExecutionFixtureMode {
  if (value === "mutation-safe" || value === "read-only") return value
  return "none"
}

function browserMode(value: string | undefined): SmokeFixtureExecutionHandoffMode {
  if (value === "manual" || value === "playwright") return value
  return "disabled"
}

function flowIds() {
  const raw =
    process.env.PRESENTATION_SMOKE_FLOW_IDS ??
    process.env.PRESENTATION_SMOKE_FLOW_ID

  return raw
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean)
}

async function readStorageState(path: string | undefined) {
  if (!path) return undefined

  return readFile(path, "utf8").catch(() => undefined)
}

const storageStatePath = process.env.PRESENTATION_SMOKE_STORAGE_STATE
const storageStateText = await readStorageState(storageStatePath)
const approvedByFlag = envFlag("PRESENTATION_SMOKE_RUN_APPROVED")
const report = presentationSmokeRunnerBridgeReport({
  allowBrowserExecution:
    approvedByFlag || process.env.PRESENTATION_SMOKE_APPROVAL === "RUN_PRESENTATION_SMOKE",
  appUrl: process.env.PRESENTATION_SMOKE_URL,
  approvalPhrase: approvedByFlag
    ? "RUN_PRESENTATION_SMOKE"
    : process.env.PRESENTATION_SMOKE_APPROVAL,
  browserHandoffMode: browserMode(process.env.PRESENTATION_SMOKE_BROWSER_HANDOFF),
  fixtureDeckId: process.env.PRESENTATION_SMOKE_FIXTURE_DECK_ID,
  fixtureMode: fixtureMode(process.env.PRESENTATION_SMOKE_FIXTURE_MODE),
  flowIds: flowIds(),
  maxFlowCount: Number(process.env.PRESENTATION_SMOKE_MAX_FLOW_COUNT) || 3,
  storageStatePath,
  storageStateText,
  timeoutMs: process.env.PRESENTATION_SMOKE_TIMEOUT_MS,
})

console.log(serializePresentationSmokeRunnerBridgeReport(report))

if (!report.canRun) {
  throw new Error(
    "Presentation smoke runner bridge is not approved or not ready for live browser execution.",
  )
}

const playwright = await loadPlaywright()
const browser = await playwright.chromium.launch({
  headless: process.env.PRESENTATION_SMOKE_HEADLESS !== "false",
})

try {
  const context = await browser.newContext({ storageState: storageStatePath })
  const page = await context.newPage()

  await page.goto(process.env.PRESENTATION_SMOKE_URL ?? "", {
    waitUntil: "networkidle",
  })

  const results = await runPresentationBrowserSmokeFlows({
    driver: createPresentationSmokeLocatorDriver(page, {
      timeoutMs: Number(process.env.PRESENTATION_SMOKE_TIMEOUT_MS) || 5000,
    }),
    fillValues: {
      [cloudSyncTestIds.searchInput]:
        process.env.PRESENTATION_SMOKE_CLOUD_SEARCH_QUERY ?? "",
      [presentationSmokeTestIds.authEmailInput]:
        process.env.PRESENTATION_SMOKE_SEEDED_EMAIL ?? "",
      [presentationSmokeTestIds.authPasswordInput]:
        process.env.PRESENTATION_SMOKE_SEEDED_PASSWORD ?? "",
      [presentationSmokeTestIds.commandPaletteSearch]:
        process.env.PRESENTATION_SMOKE_COMMAND_QUERY ?? "chart",
    },
    flows: selectedPresentationBrowserSmokeFlows(report.selectedFlowIds),
    onStep(step) {
      console.log(
        `${step.flowId} #${step.stepIndex + 1} ${step.action} ${step.testId}`,
      )
    },
  })

  console.log(
    `Presentation smoke runner completed ${results.length} flow(s), ${results.reduce(
      (total, result) => total + result.stepCount,
      0,
    )} step(s).`,
  )
} finally {
  await browser.close()
}
