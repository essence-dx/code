import {
  cloudSyncE2eFlows,
  validateCloudSyncE2eContract,
  type CloudSyncE2eFlow,
} from "./cloud-sync-e2e-contract"

export type CloudSyncE2eReadinessStatus = "fail" | "pass" | "warn"

export type CloudSyncE2eReadinessCheck = {
  detail: string
  label: string
  status: CloudSyncE2eReadinessStatus
}

export type CloudSyncE2eReadinessInput = {
  appUrl?: string
  flowId?: string
  requireUrl?: boolean
  storageStatePath?: string
  storageStateText?: string
  timeoutMs?: string
}

export type CloudSyncE2eReadinessReport = {
  checks: CloudSyncE2eReadinessCheck[]
  failedCount: number
  selectedFlowCount: number
  status: CloudSyncE2eReadinessStatus
  stepCount: number
  warningCount: number
}

const validFlowIds = new Set<string>(cloudSyncE2eFlows.map((flow) => flow.id))

function check(
  checks: CloudSyncE2eReadinessCheck[],
  status: CloudSyncE2eReadinessStatus,
  label: string,
  detail: string,
) {
  checks.push({ detail, label, status })
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value)

    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function selectedFlows(flowId: string | undefined): readonly CloudSyncE2eFlow[] {
  if (!flowId) return cloudSyncE2eFlows

  return cloudSyncE2eFlows.filter((flow) => flow.id === flowId)
}

function flowHasAction(flow: CloudSyncE2eFlow) {
  return flow.steps.some((step) => step.action === "click" || step.action === "fill")
}

function flowHasAssertion(flow: CloudSyncE2eFlow) {
  return flow.steps.some(
    (step) =>
      step.action === "expect-disabled" ||
      step.action === "expect-hidden" ||
      step.action === "expect-visible",
  )
}

function storageStateStatus(input: CloudSyncE2eReadinessInput) {
  if (!input.storageStatePath && !input.storageStateText) {
    return {
      detail: "No Playwright storage state was provided; public or signed-out flows can still be validated.",
      status: "pass" as const,
    }
  }

  if (!input.storageStateText) {
    return {
      detail: `Storage state path ${input.storageStatePath} was provided but could not be read.`,
      status: "fail" as const,
    }
  }

  try {
    const parsed = JSON.parse(input.storageStateText) as {
      cookies?: unknown
      origins?: unknown
    }
    const hasStorageShape =
      Array.isArray(parsed.cookies) || Array.isArray(parsed.origins)

    return hasStorageShape
      ? {
          detail: `Storage state ${input.storageStatePath ?? "JSON"} is valid Playwright-compatible JSON.`,
          status: "pass" as const,
        }
      : {
          detail: "Storage state JSON must include a cookies or origins array.",
          status: "fail" as const,
        }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    return {
      detail: `Storage state JSON could not be parsed: ${message}`,
      status: "fail" as const,
    }
  }
}

export function cloudSyncE2eReadinessReport(
  input: CloudSyncE2eReadinessInput = {},
): CloudSyncE2eReadinessReport {
  const checks: CloudSyncE2eReadinessCheck[] = []
  const contract = validateCloudSyncE2eContract()
  const flows = selectedFlows(input.flowId)

  check(
    checks,
    contract.valid ? "pass" : "fail",
    "selector contract",
    contract.valid
      ? `${contract.flowCount} flow(s), ${contract.stepCount} step(s), and all critical selectors are covered.`
      : [
          contract.duplicateTestIds.length
            ? `duplicate ids: ${contract.duplicateTestIds.join(", ")}`
            : "",
          contract.missingTestIds.length
            ? `missing ids: ${contract.missingTestIds.join(", ")}`
            : "",
          contract.uncoveredCriticalTestIds.length
            ? `uncovered critical ids: ${contract.uncoveredCriticalTestIds.join(", ")}`
            : "",
          contract.emptyFlows.length
            ? `empty flows: ${contract.emptyFlows.join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join("; "),
  )

  check(
    checks,
    !input.flowId || validFlowIds.has(input.flowId) ? "pass" : "fail",
    "flow selection",
    input.flowId
      ? validFlowIds.has(input.flowId)
        ? `Selected ${input.flowId}.`
        : `Unknown flow "${input.flowId}". Available: ${Array.from(validFlowIds).join(", ")}.`
      : `All ${cloudSyncE2eFlows.length} flow(s) selected.`,
  )

  const flowsWithoutActions = flows.filter((flow) => !flowHasAction(flow))
  const flowsWithoutAssertions = flows.filter((flow) => !flowHasAssertion(flow))
  check(
    checks,
    flowsWithoutActions.length || flowsWithoutAssertions.length ? "fail" : "pass",
    "flow shape",
    flowsWithoutActions.length || flowsWithoutAssertions.length
      ? [
          flowsWithoutActions.length
            ? `without actions: ${flowsWithoutActions.map((flow) => flow.id).join(", ")}`
            : "",
          flowsWithoutAssertions.length
            ? `without assertions: ${flowsWithoutAssertions.map((flow) => flow.id).join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join("; ")
      : "Selected flows include both actions and assertions.",
  )

  check(
    checks,
    input.appUrl
      ? isHttpUrl(input.appUrl)
        ? "pass"
        : "fail"
      : input.requireUrl
        ? "fail"
        : "warn",
    "app url",
    input.appUrl
      ? isHttpUrl(input.appUrl)
        ? `Browser smoke target is ${input.appUrl}.`
        : `CLOUD_SYNC_E2E_URL must be an http(s) URL, got ${input.appUrl}.`
      : input.requireUrl
        ? "CLOUD_SYNC_E2E_URL is required for a live browser smoke run."
        : "No live app URL provided; readiness can still validate selectors and flow contracts.",
  )

  if (input.timeoutMs) {
    const timeout = Number(input.timeoutMs)

    check(
      checks,
      Number.isFinite(timeout) && timeout > 0 ? "pass" : "fail",
      "timeout",
      Number.isFinite(timeout) && timeout > 0
        ? `Step timeout is ${timeout}ms.`
        : `CLOUD_SYNC_E2E_TIMEOUT_MS must be a positive number, got ${input.timeoutMs}.`,
    )
  } else {
    check(checks, "pass", "timeout", "Using the smoke runner default timeout.")
  }

  const storage = storageStateStatus(input)
  check(checks, storage.status, "storage state", storage.detail)

  const failedCount = checks.filter((item) => item.status === "fail").length
  const warningCount = checks.filter((item) => item.status === "warn").length

  return {
    checks,
    failedCount,
    selectedFlowCount: flows.length,
    status: failedCount ? "fail" : warningCount ? "warn" : "pass",
    stepCount: flows.reduce((total, flow) => total + flow.steps.length, 0),
    warningCount,
  }
}
