import type { DesignDocument, DesignPage } from "@/features/editor/types";
import {
  getPointerHarnessRows,
  getResizeHarnessRows,
  getSelectionHarnessRows,
  getTextEditHarnessRows,
} from "@/features/editor/interaction-test-harness-canvas-cases";
import {
  getExportHarnessRows,
  getKeyboardHarnessRows,
  getPrototypeHarnessRows,
} from "@/features/editor/interaction-test-harness-flow-cases";
import {
  interactionHarnessCategories,
  type InteractionHarnessCategory,
  type InteractionHarnessRow,
  type InteractionHarnessStatus,
  type InteractionTestHarnessReport,
} from "@/features/editor/interaction-test-harness-types";

type InteractionTestHarnessInput = {
  document: DesignDocument;
  activePageId: string;
  selectedLayerIds: string[];
};

export function getInteractionTestHarnessReport({
  document,
  activePageId,
  selectedLayerIds,
}: InteractionTestHarnessInput): InteractionTestHarnessReport {
  const activePage =
    document.pages.find((page) => page.id === activePageId) ??
    document.pages[0] ??
    createEmptyPage();
  const activityEvents = document.activityEvents ?? [];
  const rows = [
    ...getKeyboardHarnessRows(
      document,
      activePage,
      selectedLayerIds,
      activityEvents,
    ),
    ...getPointerHarnessRows(activePage),
    ...getSelectionHarnessRows(activePage, selectedLayerIds),
    ...getResizeHarnessRows(activePage, selectedLayerIds),
    ...getTextEditHarnessRows(activePage),
    ...getPrototypeHarnessRows(document, activePage),
    ...getExportHarnessRows(activePage, selectedLayerIds, activityEvents),
  ].sort(sortHarnessRows);
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const selectableLayerCount = new Set(
    rows.flatMap((row) => row.layerIds).filter(Boolean),
  ).size;

  return {
    score: Math.max(0, 100 - blockedCount * 15 - reviewCount * 5),
    activePageId: activePage.id,
    activePageName: activePage.name,
    categoryCount: interactionHarnessCategories.length,
    readyCount,
    reviewCount,
    blockedCount,
    selectableLayerCount,
    keyboardFlowCount: getCategoryCount(rows, "keyboard"),
    pointerFlowCount: getCategoryCount(rows, "pointer"),
    selectionFlowCount: getCategoryCount(rows, "selection"),
    resizeFlowCount: getCategoryCount(rows, "resize"),
    textEditFlowCount: getCategoryCount(rows, "text-edit"),
    prototypeFlowCount: getCategoryCount(rows, "prototype"),
    exportFlowCount: getCategoryCount(rows, "export"),
    rows,
  };
}

function sortHarnessRows(left: InteractionHarnessRow, right: InteractionHarnessRow) {
  if (left.status !== right.status) {
    return getStatusRank(left.status) - getStatusRank(right.status);
  }

  if (left.category !== right.category) {
    return left.category.localeCompare(right.category);
  }

  return left.label.localeCompare(right.label);
}

function getCategoryCount(
  rows: InteractionHarnessRow[],
  category: InteractionHarnessCategory,
) {
  return rows.filter((row) => row.category === category).length;
}

function createEmptyPage(): DesignPage {
  return {
    id: "missing-page",
    name: "Missing page",
    background: "#ffffff",
    layers: [],
    guides: [],
  };
}

function getStatusRank(status: InteractionHarnessStatus) {
  if (status === "blocked") {
    return 0;
  }

  if (status === "review") {
    return 1;
  }

  return 2;
}
