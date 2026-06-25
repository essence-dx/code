export type InteractionHarnessCategory =
  | "keyboard"
  | "pointer"
  | "selection"
  | "resize"
  | "text-edit"
  | "prototype"
  | "export";

export type InteractionHarnessStatus = "ready" | "review" | "blocked";

export type InteractionHarnessRow = {
  id: string;
  category: InteractionHarnessCategory;
  status: InteractionHarnessStatus;
  pageId: string;
  pageName: string;
  layerIds: string[];
  label: string;
  detail: string;
  evidence: string;
  steps: string[];
};

export type InteractionTestHarnessReport = {
  score: number;
  activePageId: string;
  activePageName: string;
  categoryCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  selectableLayerCount: number;
  keyboardFlowCount: number;
  pointerFlowCount: number;
  selectionFlowCount: number;
  resizeFlowCount: number;
  textEditFlowCount: number;
  prototypeFlowCount: number;
  exportFlowCount: number;
  rows: InteractionHarnessRow[];
};

export const interactionHarnessCategories = [
  "keyboard",
  "pointer",
  "selection",
  "resize",
  "text-edit",
  "prototype",
  "export",
] satisfies InteractionHarnessCategory[];
