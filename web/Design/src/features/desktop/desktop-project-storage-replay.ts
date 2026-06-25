import type {
  DesktopProjectConflictReplayAction,
  DesktopProjectConflictReplayStep,
  DesktopProjectMutationRecord,
} from "@/features/desktop/desktop-project-storage-types";

export function createDesktopProjectConflictReplayPlan(
  mutations: DesktopProjectMutationRecord[],
): DesktopProjectConflictReplayStep[] {
  return mutations
    .filter(
      (mutation) =>
        mutation.status === "queued" ||
        mutation.status === "failed" ||
        mutation.status === "conflict",
    )
    .flatMap((mutation, mutationIndex) =>
      createReplayStepsForMutation({
        mutation,
        baseOrder: mutationIndex * 10,
      }),
    );
}

function createReplayStepsForMutation(input: {
  mutation: DesktopProjectMutationRecord;
  baseOrder: number;
}): DesktopProjectConflictReplayStep[] {
  const hasResumableAssets = input.mutation.assetReferences.some(
    (asset) => asset.resumeStatus === "resumable",
  );
  const hasBlockedAssets = input.mutation.assetReferences.some(
    (asset) => asset.resumeStatus === "blocked",
  );
  const steps: DesktopProjectConflictReplayStep[] = [
    createReplayStep({
      mutation: input.mutation,
      order: input.baseOrder + 1,
      action: "load-base",
      status: "ready",
      detail: `Load local base from ${input.mutation.baseUpdatedAt}.`,
      evidenceIds: [input.mutation.baseUpdatedAt],
    }),
  ];

  if (input.mutation.assetReferences.length) {
    steps.push(
      createReplayStep({
        mutation: input.mutation,
        order: input.baseOrder + 2,
        action: "resume-assets",
        status: hasBlockedAssets
          ? "blocked"
          : hasResumableAssets
            ? "review"
            : "ready",
        detail: hasBlockedAssets
          ? "One or more asset references exceed the local cache limit."
          : hasResumableAssets
            ? "Resume large asset references before replaying the document mutation."
            : "Asset references are ready for replay.",
        evidenceIds: input.mutation.assetReferences.map(
          (asset) => asset.cacheKey,
        ),
      }),
    );
  }

  steps.push(
    createReplayStep({
      mutation: input.mutation,
      order: input.baseOrder + 3,
      action: "apply-local-document",
      status: "ready",
      detail: `Apply local revision ${input.mutation.localRevision}.`,
      evidenceIds: [String(input.mutation.localRevision)],
    }),
    createReplayStep({
      mutation: input.mutation,
      order: input.baseOrder + 4,
      action: "compare-remote",
      status: input.mutation.remoteUpdatedAt ? "review" : "ready",
      detail: input.mutation.remoteUpdatedAt
        ? `Compare against remote update ${input.mutation.remoteUpdatedAt}.`
        : "No newer remote update is attached to this mutation.",
      evidenceIds: [
        input.mutation.remoteUpdatedAt,
        input.mutation.failureReason,
      ].filter((value): value is string => Boolean(value)),
    }),
    createReplayStep({
      mutation: input.mutation,
      order: input.baseOrder + 5,
      action:
        input.mutation.status === "conflict" ? "mark-conflict" : "confirm-sync",
      status: input.mutation.status === "conflict" ? "blocked" : "ready",
      detail:
        input.mutation.status === "conflict"
          ? (input.mutation.failureReason ??
            "Manual conflict review is required.")
          : "Mutation can sync when connectivity is restored.",
      evidenceIds: [input.mutation.id],
    }),
  );

  return steps;
}

function createReplayStep(input: {
  mutation: DesktopProjectMutationRecord;
  order: number;
  action: DesktopProjectConflictReplayAction;
  status: "ready" | "review" | "blocked";
  detail: string;
  evidenceIds: string[];
}): DesktopProjectConflictReplayStep {
  return {
    id: `${input.mutation.id}-${input.action}`,
    order: input.order,
    mutationId: input.mutation.id,
    projectId: input.mutation.projectId,
    action: input.action,
    status: input.status,
    detail: input.detail,
    evidenceIds: unique(input.evidenceIds),
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
