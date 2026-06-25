import {
  presentationBrowserSmokeFlows,
  type PresentationBrowserSmokeFlow,
  type PresentationBrowserSmokeTestId,
} from "./presentation-browser-smoke-contract"

export type PresentationSmokeDriver = {
  click: (testId: PresentationBrowserSmokeTestId) => Promise<void> | void
  expectDisabled: (
    testId: PresentationBrowserSmokeTestId,
  ) => Promise<void> | void
  expectHidden: (testId: PresentationBrowserSmokeTestId) => Promise<void> | void
  expectVisible: (testId: PresentationBrowserSmokeTestId) => Promise<void> | void
  fill: (
    testId: PresentationBrowserSmokeTestId,
    value: string,
  ) => Promise<void> | void
}

export type PresentationSmokeLocator = {
  click: () => Promise<void> | void
  fill?: (value: string) => Promise<void> | void
  isDisabled?: () => Promise<boolean> | boolean
  waitFor: (options: {
    state: "hidden" | "visible"
    timeout?: number
  }) => Promise<void> | void
}

export type PresentationSmokeLocatorPage = {
  locator: (selector: string) => PresentationSmokeLocator
}

export type PresentationBrowserSmokeRunOptions = {
  driver: PresentationSmokeDriver
  fillValues?: Partial<Record<PresentationBrowserSmokeTestId, string>>
  flows?: readonly PresentationBrowserSmokeFlow[]
  onStep?: (step: {
    action: string
    flowId: string
    stepIndex: number
    testId: PresentationBrowserSmokeTestId
  }) => Promise<void> | void
}

export type PresentationBrowserSmokeRunResult = {
  flowId: string
  stepCount: number
}

export function presentationSmokeSelector(
  testId: PresentationBrowserSmokeTestId,
) {
  return `[data-testid="${testId}"]`
}

export function selectedPresentationBrowserSmokeFlows(
  flowIds: readonly string[] | undefined,
): readonly PresentationBrowserSmokeFlow[] {
  if (!flowIds?.length) return presentationBrowserSmokeFlows

  const flows = new Map(
    presentationBrowserSmokeFlows.map((flow) => [flow.id, flow]),
  )

  return flowIds.map((flowId) => {
    const flow = flows.get(flowId)

    if (!flow) {
      throw new Error(
        `Unknown presentation smoke flow "${flowId}". Available: ${presentationBrowserSmokeFlows
          .map((item) => item.id)
          .join(", ")}`,
      )
    }

    return flow
  })
}

export function createPresentationSmokeLocatorDriver(
  page: PresentationSmokeLocatorPage,
  options: { timeoutMs?: number } = {},
): PresentationSmokeDriver {
  const timeout = options.timeoutMs

  function locator(testId: PresentationBrowserSmokeTestId) {
    return page.locator(presentationSmokeSelector(testId))
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

export async function runPresentationBrowserSmokeFlow(
  flow: PresentationBrowserSmokeFlow,
  options: Omit<PresentationBrowserSmokeRunOptions, "flows">,
): Promise<PresentationBrowserSmokeRunResult> {
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

export async function runPresentationBrowserSmokeFlows(
  options: PresentationBrowserSmokeRunOptions,
): Promise<PresentationBrowserSmokeRunResult[]> {
  const flows = options.flows ?? presentationBrowserSmokeFlows
  const results: PresentationBrowserSmokeRunResult[] = []

  for (const flow of flows) {
    results.push(await runPresentationBrowserSmokeFlow(flow, options))
  }

  return results
}
