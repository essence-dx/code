export type VariableGovernanceStatus = "ready" | "review" | "blocked";

export type VariableGovernanceCategory =
  | "modes"
  | "alias"
  | "coverage"
  | "collection"
  | "orphan"
  | "duplicate"
  | "ready";

export type VariableGovernanceAction =
  | "normalize-modes"
  | "fill-mode-values"
  | "clear-alias"
  | "move-collection"
  | "remove-orphans"
  | "select-variable";

export type VariableGovernanceReviewRow = {
  id: string;
  status: VariableGovernanceStatus;
  category: VariableGovernanceCategory;
  label: string;
  detail: string;
  recommendation: string;
  variableIds: string[];
  variableNames: string[];
  modeIds: string[];
  collectionIds: string[];
  aliasPath: string[];
  action: VariableGovernanceAction;
  actionLabel: string;
  repairable: boolean;
  metric: number;
};

export type VariableGovernanceReviewReport = {
  score: number;
  status: VariableGovernanceStatus;
  modeCount: number;
  collectionCount: number;
  variableCount: number;
  aliasCount: number;
  dependencyEdgeCount: number;
  brokenAliasCount: number;
  aliasCycleCount: number;
  missingModeValueCount: number;
  orphanTokenCount: number;
  duplicateNameCount: number;
  collectionMismatchCount: number;
  repairableCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  rows: VariableGovernanceReviewRow[];
};

export const variableGovernanceStatusRank = {
  blocked: 0,
  review: 1,
  ready: 2,
} satisfies Record<VariableGovernanceStatus, number>;
