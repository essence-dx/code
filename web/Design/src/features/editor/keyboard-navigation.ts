import type { DesignElement } from "@/features/editor/types";

export type KeyboardSelectionDirection = "previous" | "next";

export function getKeyboardSelectableElementIds(
  elements: readonly DesignElement[],
) {
  return elements.filter((element) => !element.hidden).map((element) => element.id);
}

export function getAdjacentKeyboardElementId({
  elements,
  selectedElementIds,
  direction,
}: {
  elements: readonly DesignElement[];
  selectedElementIds: readonly string[];
  direction: KeyboardSelectionDirection;
}) {
  const selectableIds = getKeyboardSelectableElementIds(elements);

  if (!selectableIds.length) {
    return null;
  }

  const anchorId = selectedElementIds.at(-1);
  const currentIndex = anchorId ? selectableIds.indexOf(anchorId) : -1;

  if (direction === "next") {
    return selectableIds[(currentIndex + 1) % selectableIds.length];
  }

  if (currentIndex <= 0) {
    return selectableIds[selectableIds.length - 1];
  }

  return selectableIds[currentIndex - 1];
}
