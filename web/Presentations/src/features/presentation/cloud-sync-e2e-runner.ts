import {
  cloudSyncE2eFlows,
  type CloudSyncE2eFlow,
  type CloudSyncTestId,
} from "./cloud-sync-e2e-contract"

export type CloudSyncE2eDriver = {
  click: (testId: CloudSyncTestId) => Promise<void> | void
  expectDisabled: (testId: CloudSyncTestId) => Promise<void> | void
  expectHidden: (testId: CloudSyncTestId) => Promise<void> | void
  expectVisible: (testId: CloudSyncTestId) => Promise<void> | void
  fill: (testId: CloudSyncTestId, value: string) => Promise<void> | void
}

export type CloudSyncLocator = {
  click: () => Promise<void> | void
  fill?: (value: string) => Promise<void> | void
  isDisabled?: () => Promise<boolean> | boolean
  waitFor: (options: {
    state: "hidden" | "visible"
    timeout?: number
  }) => Promise<void> | void
}

export type CloudSyncLocatorPage = {
  locator: (selector: string) => CloudSyncLocator
}

export type CloudSyncE2eRunOptions = {
  driver: CloudSyncE2eDriver
  fillValues?: Partial<Record<CloudSyncTestId, string>>
  flows?: readonly CloudSyncE2eFlow[]
  onStep?: (step: {
    action: string
    flowId: string
    stepIndex: number
    testId: CloudSyncTestId
  }) => Promise<void> | void
}

export type CloudSyncE2eRunResult = {
  flowId: string
  stepCount: number
}

export function cloudSyncSelector(testId: CloudSyncTestId) {
  return `[data-testid="${testId}"]`
}

export function createCloudSyncLocatorDriver(
  page: CloudSyncLocatorPage,
  options: { timeoutMs?: number } = {},
): CloudSyncE2eDriver {
  const timeout = options.timeoutMs

  function locator(testId: CloudSyncTestId) {
    return page.locator(cloudSyncSelector(testId))
  }

  return {
    async click(testId) {
      const target = locator(testId)

      await target.waitFor({ state: "visible", timeout })
      await target.click()
    },
    async expectDisabled(testId) {
      const target = locator(testId)

      await target.waitFor({ state: "visible", timeout })
      if (!target.isDisabled) {
        throw new Error(`Expected ${testId} to expose disabled state.`)
      }
      if (!(await target.isDisabled())) {
        throw new Error(`Expected ${testId} to be disabled.`)
      }
    },
    async expectHidden(testId) {
      await locator(testId).waitFor({ state: "hidden", timeout })
    },
    async expectVisible(testId) {
      await locator(testId).waitFor({ state: "visible", timeout })
    },
    async fill(testId, value) {
      const target = locator(testId)

      await target.waitFor({ state: "visible", timeout })
      if (!target.fill) {
        throw new Error(`Expected ${testId} to be fillable.`)
      }
      await target.fill(value)
    },
  }
}

export async function runCloudSyncE2eFlow(
  flow: CloudSyncE2eFlow,
  options: Omit<CloudSyncE2eRunOptions, "flows">,
): Promise<CloudSyncE2eRunResult> {
  for (const [stepIndex, step] of flow.steps.entries()) {
    await options.onStep?.({
      action: step.action,
      flowId: flow.id,
      stepIndex,
      testId: step.testId,
    })

    if (step.action === "click") {
      await options.driver.click(step.testId)
      continue
    }
    if (step.action === "fill") {
      await options.driver.fill(
        step.testId,
        options.fillValues?.[step.testId] ?? "",
      )
      continue
    }
    if (step.action === "expect-disabled") {
      await options.driver.expectDisabled(step.testId)
      continue
    }
    if (step.action === "expect-hidden") {
      await options.driver.expectHidden(step.testId)
      continue
    }

    await options.driver.expectVisible(step.testId)
  }

  return {
    flowId: flow.id,
    stepCount: flow.steps.length,
  }
}

export async function runCloudSyncE2eFlows(
  options: CloudSyncE2eRunOptions,
): Promise<CloudSyncE2eRunResult[]> {
  const flows = options.flows ?? cloudSyncE2eFlows
  const results: CloudSyncE2eRunResult[] = []

  for (const flow of flows) {
    results.push(await runCloudSyncE2eFlow(flow, options))
  }

  return results
}

function isElementVisible(element: Element) {
  if (element.getAttribute("hidden") !== null) return false
  if (element.getAttribute("aria-hidden") === "true") return false

  const rects = element.getClientRects()

  return rects.length > 0
}

async function waitForCondition(
  condition: () => boolean,
  timeoutMs: number,
  intervalMs: number,
) {
  const startedAt = Date.now()

  while (!condition()) {
    if (Date.now() - startedAt >= timeoutMs) return false
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs))
  }

  return true
}

export function createCloudSyncDomDriver(options: {
  intervalMs?: number
  root: ParentNode
  timeoutMs?: number
}): CloudSyncE2eDriver {
  const timeoutMs = options.timeoutMs ?? 2000
  const intervalMs = options.intervalMs ?? 50

  function find(testId: CloudSyncTestId) {
    return options.root.querySelector(cloudSyncSelector(testId))
  }

  async function waitForVisible(testId: CloudSyncTestId) {
    const found = await waitForCondition(() => {
      const element = find(testId)

      return Boolean(element && isElementVisible(element))
    }, timeoutMs, intervalMs)

    if (!found) {
      throw new Error(`Expected ${testId} to be visible.`)
    }

    return find(testId) as HTMLElement
  }

  return {
    async click(testId) {
      const element = await waitForVisible(testId)

      element.click()
    },
    async expectDisabled(testId) {
      const element = await waitForVisible(testId)
      const disabled =
        element.getAttribute("aria-disabled") === "true" ||
        ("disabled" in element && Boolean(element.disabled))

      if (!disabled) {
        throw new Error(`Expected ${testId} to be disabled.`)
      }
    },
    async expectHidden(testId) {
      const hidden = await waitForCondition(() => {
        const element = find(testId)

        return !element || !isElementVisible(element)
      }, timeoutMs, intervalMs)

      if (!hidden) {
        throw new Error(`Expected ${testId} to be hidden.`)
      }
    },
    async expectVisible(testId) {
      await waitForVisible(testId)
    },
    async fill(testId, value) {
      const element = await waitForVisible(testId)

      if (!("value" in element)) {
        throw new Error(`Expected ${testId} to be fillable.`)
      }

      element.value = value
      element.dispatchEvent(new Event("input", { bubbles: true }))
      element.dispatchEvent(new Event("change", { bubbles: true }))
    },
  }
}
