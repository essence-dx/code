import {
  cloudSyncE2eFlows,
  validateCloudSyncE2eContract,
  type CloudSyncE2eAction,
} from "./cloud-sync-e2e-contract"
import { cloudSyncTestIds } from "./cloud-sync-test-ids"
import { presentationSmokeTestIds } from "./presentation-smoke-test-ids"

export type PresentationBrowserSmokeAction = CloudSyncE2eAction

export type PresentationBrowserSmokeTestId =
  | (typeof cloudSyncTestIds)[keyof typeof cloudSyncTestIds]
  | (typeof presentationSmokeTestIds)[keyof typeof presentationSmokeTestIds]

export type PresentationBrowserSmokeStep = {
  action: PresentationBrowserSmokeAction
  testId: PresentationBrowserSmokeTestId
}

export type PresentationBrowserSmokeFlow = {
  category:
    | "auth"
    | "cloud-sync"
    | "desktop"
    | "export"
    | "performance"
    | "recovery"
    | "share"
    | "shell"
  id: string
  name: string
  passive?: boolean
  steps: readonly PresentationBrowserSmokeStep[]
}

export type PresentationBrowserSmokeContract = {
  duplicateTestIds: string[]
  emptyFlows: string[]
  flowCount: number
  flowsWithoutActions: string[]
  flowsWithoutAssertions: string[]
  missingTestIds: string[]
  stepCount: number
  uncoveredCriticalTestIds: string[]
  valid: boolean
}

export type PresentationBrowserSmokeReadinessStatus = "fail" | "pass" | "warn"

export type PresentationBrowserSmokeReadinessCheck = {
  detail: string
  label: string
  status: PresentationBrowserSmokeReadinessStatus
}

export type PresentationBrowserSmokeReadinessInput = {
  appUrl?: string
  flowId?: string
  requireUrl?: boolean
  timeoutMs?: string
}

export type PresentationBrowserSmokeReadinessReport = {
  checks: PresentationBrowserSmokeReadinessCheck[]
  failedCount: number
  selectedFlowCount: number
  status: PresentationBrowserSmokeReadinessStatus
  stepCount: number
  warningCount: number
}

const localSmokeFlows = [
  {
    category: "performance",
    id: "large-deck-status-pressure",
    name: "Observe large-deck pressure status badges",
    passive: true,
    steps: [
      { action: "expect-visible", testId: presentationSmokeTestIds.statusBar },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.statusDeckScaleBadge,
      },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.statusLargeDeckWindowBadge,
      },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.statusUndoBudgetBadge,
      },
    ],
  },
  {
    category: "shell",
    id: "app-shell-command-palette",
    name: "Search app-shell commands",
    steps: [
      {
        action: "click",
        testId: presentationSmokeTestIds.commandPaletteTrigger,
      },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.commandPaletteDialog,
      },
      { action: "fill", testId: presentationSmokeTestIds.commandPaletteSearch },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.commandPaletteResult,
      },
    ],
  },
  {
    category: "shell",
    id: "responsive-workspace-ergonomics",
    name: "Toggle responsive workspace panels and density",
    steps: [
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.workspaceDensityControls,
      },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.workspaceFilmstripPanel,
      },
      {
        action: "click",
        testId: presentationSmokeTestIds.workspaceFilmstripToggle,
      },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.workspacePropertiesPanel,
      },
      {
        action: "click",
        testId: presentationSmokeTestIds.workspacePropertiesToggle,
      },
    ],
  },
  {
    category: "auth",
    id: "auth-email-password-entry",
    name: "Verify email and password auth controls",
    steps: [
      { action: "expect-visible", testId: presentationSmokeTestIds.authPanel },
      { action: "fill", testId: presentationSmokeTestIds.authEmailInput },
      { action: "fill", testId: presentationSmokeTestIds.authPasswordInput },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.authSubmitButton,
      },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.authVerificationCodeButton,
      },
    ],
  },
  {
    category: "export",
    id: "backstage-export-preflight",
    name: "Open Backstage export preflight surfaces",
    steps: [
      { action: "click", testId: presentationSmokeTestIds.backstageTrigger },
      { action: "expect-visible", testId: presentationSmokeTestIds.backstageDialog },
      { action: "click", testId: presentationSmokeTestIds.backstageExportTab },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.backstageExportRoot,
      },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.exportPreflightPanel,
      },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.exportRepairLoopPanel,
      },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.exportRepairLoopCopyButton,
      },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.exportPptxButton,
      },
    ],
  },
  {
    category: "recovery",
    id: "backstage-recovery-info-readiness",
    name: "Open Backstage recovery and info readiness tabs",
    steps: [
      { action: "click", testId: presentationSmokeTestIds.backstageTrigger },
      { action: "expect-visible", testId: presentationSmokeTestIds.backstageDialog },
      { action: "click", testId: presentationSmokeTestIds.backstageRecoverTab },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.backstageRecoverRoot,
      },
      { action: "click", testId: presentationSmokeTestIds.backstageInfoTab },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.backstageInfoRoot,
      },
    ],
  },
  {
    category: "share",
    id: "share-link-download-permissions",
    name: "Inspect share link download permission controls",
    steps: [
      { action: "click", testId: presentationSmokeTestIds.shareTrigger },
      { action: "expect-visible", testId: presentationSmokeTestIds.shareDialog },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.shareCreateLinkButton,
      },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.shareDownloadPermissionToggle,
      },
    ],
  },
  {
    category: "desktop",
    id: "desktop-local-file-status",
    name: "Open desktop local-file packaging status",
    steps: [
      { action: "click", testId: presentationSmokeTestIds.desktopBridgeTrigger },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.desktopBridgeDialog,
      },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.desktopFileHandoffPanel,
      },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.desktopPackagingPanel,
      },
      {
        action: "expect-visible",
        testId: presentationSmokeTestIds.desktopReleasePanel,
      },
    ],
  },
] as const satisfies readonly PresentationBrowserSmokeFlow[]

export const presentationBrowserSmokeFlows = [
  ...cloudSyncE2eFlows.map(
    (flow) =>
      ({
        category: "cloud-sync",
        id: `cloud-sync:${flow.id}`,
        name: flow.name,
        steps: flow.steps,
      }) satisfies PresentationBrowserSmokeFlow,
  ),
  ...localSmokeFlows,
] as const satisfies readonly PresentationBrowserSmokeFlow[]

const criticalPresentationSmokeTestIds: readonly PresentationBrowserSmokeTestId[] =
  [
    presentationSmokeTestIds.backstageDialog,
    presentationSmokeTestIds.backstageExportRoot,
    presentationSmokeTestIds.backstageExportTab,
    presentationSmokeTestIds.backstageInfoRoot,
    presentationSmokeTestIds.backstageInfoTab,
    presentationSmokeTestIds.backstageRecoverRoot,
    presentationSmokeTestIds.backstageRecoverTab,
    presentationSmokeTestIds.backstageTrigger,
    presentationSmokeTestIds.authEmailInput,
    presentationSmokeTestIds.authPanel,
    presentationSmokeTestIds.authPasswordInput,
    presentationSmokeTestIds.authSubmitButton,
    presentationSmokeTestIds.authVerificationCodeButton,
    presentationSmokeTestIds.commandPaletteDialog,
    presentationSmokeTestIds.commandPaletteResult,
    presentationSmokeTestIds.commandPaletteSearch,
    presentationSmokeTestIds.commandPaletteTrigger,
    presentationSmokeTestIds.workspaceDensityControls,
    presentationSmokeTestIds.workspaceFilmstripPanel,
    presentationSmokeTestIds.workspaceFilmstripToggle,
    presentationSmokeTestIds.workspacePropertiesPanel,
    presentationSmokeTestIds.workspacePropertiesToggle,
    cloudSyncTestIds.compactConflictBanner,
    cloudSyncTestIds.conflictPreviewPanel,
    cloudSyncTestIds.mergeReviewConflict,
    cloudSyncTestIds.mergeReviewConflictItem,
    cloudSyncTestIds.mergeReviewDialogButton,
    presentationSmokeTestIds.desktopBridgeDialog,
    presentationSmokeTestIds.desktopBridgeTrigger,
    presentationSmokeTestIds.desktopFileHandoffPanel,
    presentationSmokeTestIds.desktopPackagingPanel,
    presentationSmokeTestIds.desktopReleasePanel,
    presentationSmokeTestIds.exportPreflightPanel,
    presentationSmokeTestIds.exportPptxButton,
    presentationSmokeTestIds.exportRepairLoopCopyButton,
    presentationSmokeTestIds.exportRepairLoopPanel,
    presentationSmokeTestIds.shareCreateLinkButton,
    presentationSmokeTestIds.shareDialog,
    presentationSmokeTestIds.shareDownloadPermissionToggle,
    presentationSmokeTestIds.shareTrigger,
    presentationSmokeTestIds.statusBar,
    presentationSmokeTestIds.statusDeckScaleBadge,
    presentationSmokeTestIds.statusLargeDeckWindowBadge,
    presentationSmokeTestIds.statusUndoBudgetBadge,
  ]

const validFlowIds = new Set(
  presentationBrowserSmokeFlows.map((flow) => flow.id),
)

function hasAction(flow: PresentationBrowserSmokeFlow) {
  return flow.steps.some((step) => step.action === "click" || step.action === "fill")
}

function hasAssertion(flow: PresentationBrowserSmokeFlow) {
  return flow.steps.some((step) => step.action.startsWith("expect-"))
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value)

    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function selectedFlows(
  flowId: string | undefined,
): readonly PresentationBrowserSmokeFlow[] {
  if (!flowId) return presentationBrowserSmokeFlows

  return presentationBrowserSmokeFlows.filter((flow) => flow.id === flowId)
}

function addReadinessCheck(
  checks: PresentationBrowserSmokeReadinessCheck[],
  status: PresentationBrowserSmokeReadinessStatus,
  label: string,
  detail: string,
) {
  checks.push({ detail, label, status })
}

export function listPresentationBrowserSmokeTestIds() {
  return [
    ...Object.values(cloudSyncTestIds),
    ...Object.values(presentationSmokeTestIds),
  ]
}

export function validatePresentationBrowserSmokeContract(): PresentationBrowserSmokeContract {
  const cloudContract = validateCloudSyncE2eContract()
  const allTestIds = listPresentationBrowserSmokeTestIds()
  const duplicateTestIds = allTestIds.filter(
    (testId, index) => allTestIds.indexOf(testId) !== index,
  )
  const knownTestIds = new Set<PresentationBrowserSmokeTestId>(allTestIds)
  const referencedTestIds = Array.from(
    new Set(
      presentationBrowserSmokeFlows.flatMap((flow) =>
        flow.steps.map((step) => step.testId),
      ),
    ),
  )
  const missingTestIds = referencedTestIds.filter(
    (testId) => !knownTestIds.has(testId),
  )
  const referencedTestIdSet = new Set<PresentationBrowserSmokeTestId>(
    referencedTestIds,
  )
  const uncoveredCriticalTestIds = criticalPresentationSmokeTestIds.filter(
    (testId) => !referencedTestIdSet.has(testId),
  )
  const emptyFlows = presentationBrowserSmokeFlows
    .filter((flow) => !flow.steps.length)
    .map((flow) => flow.id)
  const flowsWithoutAssertions = presentationBrowserSmokeFlows
    .filter((flow) => !hasAssertion(flow))
    .map((flow) => flow.id)
  const flowsWithoutActions = presentationBrowserSmokeFlows
    .filter((flow) => !("passive" in flow && flow.passive) && !hasAction(flow))
    .map((flow) => flow.id)

  return {
    duplicateTestIds,
    emptyFlows,
    flowCount: presentationBrowserSmokeFlows.length,
    flowsWithoutActions,
    flowsWithoutAssertions,
    missingTestIds: [...missingTestIds, ...cloudContract.missingTestIds],
    stepCount: presentationBrowserSmokeFlows.reduce<number>(
      (total, flow) => total + flow.steps.length,
      0,
    ),
    uncoveredCriticalTestIds,
    valid:
      cloudContract.valid &&
      !duplicateTestIds.length &&
      !emptyFlows.length &&
      !flowsWithoutActions.length &&
      !flowsWithoutAssertions.length &&
      !missingTestIds.length &&
      !uncoveredCriticalTestIds.length,
  }
}

export function presentationBrowserSmokeReadinessReport(
  input: PresentationBrowserSmokeReadinessInput = {},
): PresentationBrowserSmokeReadinessReport {
  const checks: PresentationBrowserSmokeReadinessCheck[] = []
  const contract = validatePresentationBrowserSmokeContract()
  const flows = selectedFlows(input.flowId)

  addReadinessCheck(
    checks,
    contract.valid ? "pass" : "fail",
    "browser smoke contract",
    contract.valid
      ? `${contract.flowCount} flow(s), ${contract.stepCount} step(s), and all production smoke selectors are covered.`
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
          contract.flowsWithoutActions.length
            ? `without actions: ${contract.flowsWithoutActions.join(", ")}`
            : "",
          contract.flowsWithoutAssertions.length
            ? `without assertions: ${contract.flowsWithoutAssertions.join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join("; "),
  )

  addReadinessCheck(
    checks,
    !input.flowId || validFlowIds.has(input.flowId) ? "pass" : "fail",
    "flow selection",
    input.flowId
      ? validFlowIds.has(input.flowId)
        ? `Selected ${input.flowId}.`
        : `Unknown flow "${input.flowId}". Available: ${Array.from(validFlowIds).join(", ")}.`
      : `All ${presentationBrowserSmokeFlows.length} flow(s) selected.`,
  )

  addReadinessCheck(
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
        : `PRESENTATION_SMOKE_URL must be an http(s) URL, got ${input.appUrl}.`
      : input.requireUrl
        ? "PRESENTATION_SMOKE_URL is required for a live browser smoke run."
        : "No live app URL provided; readiness can still validate selectors and flow contracts.",
  )

  if (input.timeoutMs) {
    const timeout = Number(input.timeoutMs)

    addReadinessCheck(
      checks,
      Number.isFinite(timeout) && timeout > 0 ? "pass" : "fail",
      "timeout",
      Number.isFinite(timeout) && timeout > 0
        ? `Step timeout is ${timeout}ms.`
        : `PRESENTATION_SMOKE_TIMEOUT_MS must be a positive number, got ${input.timeoutMs}.`,
    )
  } else {
    addReadinessCheck(
      checks,
      "pass",
      "timeout",
      "Using the smoke runner default timeout.",
    )
  }

  const failedCount = checks.filter((item) => item.status === "fail").length
  const warningCount = checks.filter((item) => item.status === "warn").length

  return {
    checks,
    failedCount,
    selectedFlowCount: flows.length,
    status: failedCount ? "fail" : warningCount ? "warn" : "pass",
    stepCount: flows.reduce<number>(
      (total, flow) => total + flow.steps.length,
      0,
    ),
    warningCount,
  }
}
