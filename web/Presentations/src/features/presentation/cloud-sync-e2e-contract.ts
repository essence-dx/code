import { cloudSyncTestIds } from "./cloud-sync-test-ids"

export type CloudSyncTestId =
  (typeof cloudSyncTestIds)[keyof typeof cloudSyncTestIds]

export type CloudSyncE2eAction =
  | "click"
  | "expect-disabled"
  | "expect-hidden"
  | "expect-visible"
  | "fill"

export type CloudSyncE2eStep = {
  action: CloudSyncE2eAction
  testId: CloudSyncTestId
}

export type CloudSyncE2eFlow = {
  id: string
  name: string
  steps: readonly CloudSyncE2eStep[]
}

export const cloudSyncE2eFlows = [
  {
    id: "open-cloud-deck-from-browser",
    name: "Open a saved cloud deck from the deck browser",
    steps: [
      { action: "click", testId: cloudSyncTestIds.openDialogButton },
      { action: "expect-visible", testId: cloudSyncTestIds.dialog },
      { action: "click", testId: cloudSyncTestIds.refreshButton },
      { action: "fill", testId: cloudSyncTestIds.searchInput },
      { action: "expect-visible", testId: cloudSyncTestIds.deckRow },
      { action: "click", testId: cloudSyncTestIds.deckOpenButton },
      { action: "expect-hidden", testId: cloudSyncTestIds.dialog },
    ],
  },
  {
    id: "merge-clean-cloud-conflict",
    name: "Merge a clean local/cloud conflict",
    steps: [
      { action: "expect-visible", testId: cloudSyncTestIds.compactConflictBanner },
      { action: "expect-visible", testId: cloudSyncTestIds.compactMessage },
      { action: "click", testId: cloudSyncTestIds.compactPreviewButton },
      { action: "expect-visible", testId: cloudSyncTestIds.dialog },
      { action: "expect-visible", testId: cloudSyncTestIds.conflictPreviewPanel },
      { action: "expect-visible", testId: cloudSyncTestIds.conflictPreviewLocalCard },
      { action: "expect-visible", testId: cloudSyncTestIds.conflictPreviewCloudCard },
      { action: "expect-visible", testId: cloudSyncTestIds.mergeReviewClean },
      { action: "click", testId: cloudSyncTestIds.mergeReviewDialogButton },
      { action: "expect-hidden", testId: cloudSyncTestIds.compactConflictBanner },
    ],
  },
  {
    id: "inspect-manual-cloud-conflict",
    name: "Inspect a conflict that requires manual choices",
    steps: [
      { action: "expect-visible", testId: cloudSyncTestIds.compactConflictBanner },
      { action: "click", testId: cloudSyncTestIds.compactPreviewButton },
      { action: "expect-visible", testId: cloudSyncTestIds.conflictPreviewChangedBadge },
      { action: "expect-visible", testId: cloudSyncTestIds.conflictPreviewLocalOnlyBadge },
      { action: "expect-visible", testId: cloudSyncTestIds.conflictPreviewCloudOnlyBadge },
      { action: "expect-visible", testId: cloudSyncTestIds.conflictPreviewTitleThemeBadge },
      { action: "expect-visible", testId: cloudSyncTestIds.mergeReviewConflict },
      { action: "expect-visible", testId: cloudSyncTestIds.mergeReviewConflictItem },
    ],
  },
  {
    id: "review-only-cloud-conflict",
    name: "Confirm viewer merge review stays read-only",
    steps: [
      { action: "expect-visible", testId: cloudSyncTestIds.compactConflictBanner },
      { action: "click", testId: cloudSyncTestIds.compactPreviewButton },
      { action: "expect-visible", testId: cloudSyncTestIds.dialog },
      { action: "expect-visible", testId: cloudSyncTestIds.mergeReviewClean },
      { action: "expect-disabled", testId: cloudSyncTestIds.mergeReviewDialogButton },
    ],
  },
  {
    id: "choose-cloud-conflict-escape-hatch",
    name: "Use open-cloud and overwrite escape hatches",
    steps: [
      { action: "expect-visible", testId: cloudSyncTestIds.compactConflictBanner },
      { action: "click", testId: cloudSyncTestIds.compactOpenCloudButton },
      { action: "expect-hidden", testId: cloudSyncTestIds.compactConflictBanner },
      { action: "expect-visible", testId: cloudSyncTestIds.compactConflictBanner },
      { action: "click", testId: cloudSyncTestIds.compactOverwriteButton },
      { action: "expect-hidden", testId: cloudSyncTestIds.compactConflictBanner },
    ],
  },
] as const satisfies readonly CloudSyncE2eFlow[]

const criticalCloudSyncE2eTestIds: readonly CloudSyncTestId[] = [
  cloudSyncTestIds.compactConflictBanner,
  cloudSyncTestIds.compactOpenCloudButton,
  cloudSyncTestIds.compactOverwriteButton,
  cloudSyncTestIds.compactPreviewButton,
  cloudSyncTestIds.conflictPreviewCloudCard,
  cloudSyncTestIds.conflictPreviewLocalCard,
  cloudSyncTestIds.conflictPreviewPanel,
  cloudSyncTestIds.deckOpenButton,
  cloudSyncTestIds.deckRow,
  cloudSyncTestIds.dialog,
  cloudSyncTestIds.mergeReviewClean,
  cloudSyncTestIds.mergeReviewConflict,
  cloudSyncTestIds.mergeReviewDialogButton,
  cloudSyncTestIds.openDialogButton,
  cloudSyncTestIds.refreshButton,
  cloudSyncTestIds.searchInput,
]

export function listCloudSyncTestIds() {
  return Object.values(cloudSyncTestIds)
}

export function validateCloudSyncE2eContract() {
  const allTestIds = listCloudSyncTestIds()
  const duplicateTestIds = allTestIds.filter(
    (testId, index) => allTestIds.indexOf(testId) !== index,
  )
  const knownTestIds = new Set(allTestIds)
  const referencedTestIds = Array.from(
    new Set(cloudSyncE2eFlows.flatMap((flow) => flow.steps.map((step) => step.testId))),
  )
  const referencedTestIdSet = new Set<CloudSyncTestId>(referencedTestIds)
  const missingTestIds = referencedTestIds.filter(
    (testId) => !knownTestIds.has(testId),
  )
  const uncoveredCriticalTestIds = criticalCloudSyncE2eTestIds.filter(
    (testId) => !referencedTestIdSet.has(testId),
  )
  const emptyFlows = cloudSyncE2eFlows
    .filter((flow) => !flow.steps.length)
    .map((flow) => flow.id)

  return {
    duplicateTestIds,
    emptyFlows,
    flowCount: cloudSyncE2eFlows.length,
    missingTestIds,
    stepCount: cloudSyncE2eFlows.reduce(
      (total, flow) => total + flow.steps.length,
      0,
    ),
    uncoveredCriticalTestIds,
    valid:
      !duplicateTestIds.length &&
      !emptyFlows.length &&
      !missingTestIds.length &&
      !uncoveredCriticalTestIds.length,
  }
}
