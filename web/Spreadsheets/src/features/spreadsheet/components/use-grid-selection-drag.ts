import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { getFillDragRange } from "@/features/spreadsheet/components/grid-geometry";
import type {
  GridCellHoverInput,
  GridCellPointerInput,
  GridTouchSelectionHandleInput,
} from "@/features/spreadsheet/components/grid-cell";
import { getTouchSelectionAnchor } from "@/features/spreadsheet/touch-selection";
import {
  normalizeRange as normalizeSelectionRange,
  selectionToRange,
  type CellRange,
  type CellSelection,
  type FillRangeMode,
} from "@/features/spreadsheet/state/selection-state";

type UseGridSelectionDragInput = {
  gridRootRef: RefObject<HTMLElement | null>;
  selectedRange: CellRange;
  onSelectCell: (selection: CellSelection, options?: { extend?: boolean }) => void;
  onSelectRange: (range: CellRange) => void;
  onSelectionCommit?: (range: CellRange) => void;
  onFillRange: (range: CellRange, mode: FillRangeMode) => void;
};

export function useGridSelectionDrag({
  gridRootRef,
  selectedRange,
  onSelectCell,
  onSelectRange,
  onSelectionCommit,
  onFillRange,
}: UseGridSelectionDragInput) {
  const dragAnchorRef = useRef<CellSelection | null>(null);
  const fillAnchorRangeRef = useRef<CellRange | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const pendingFillRef = useRef<{ range: CellRange; mode: FillRangeMode } | null>(
    null,
  );
  const pendingSelectionRangeRef = useRef(selectedRange);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [isDraggingFillHandle, setIsDraggingFillHandle] = useState(false);

  useEffect(() => {
    pendingSelectionRangeRef.current = selectedRange;
  }, [selectedRange]);

  const shouldHandlePointer = useCallback((event: PointerEvent) => {
    return (
      activePointerIdRef.current === null ||
      activePointerIdRef.current === event.pointerId
    );
  }, []);

  const continueGridDrag = useCallback(
    (targetSelection: CellSelection) => {
      if (isDraggingFillHandle) {
        const anchorRange = fillAnchorRangeRef.current ?? selectedRange;
        const fill = getFillDragRange(anchorRange, targetSelection);

        if (fill) {
          pendingFillRef.current = fill;
          pendingSelectionRangeRef.current = fill.range;
          onSelectRange(fill.range);
        } else {
          pendingFillRef.current = null;
          pendingSelectionRangeRef.current = anchorRange;
          onSelectRange(anchorRange);
        }

        return;
      }

      if (isDraggingSelection) {
        const anchor =
          dragAnchorRef.current ?? {
            rowIndex: selectedRange.startRowIndex,
            columnIndex: selectedRange.startColumnIndex,
          };

        pendingSelectionRangeRef.current = normalizeSelectionRange(
          anchor,
          targetSelection,
        );
        onSelectCell(targetSelection, { extend: true });
      }
    },
    [
      isDraggingFillHandle,
      isDraggingSelection,
      onSelectCell,
      onSelectRange,
      selectedRange,
    ],
  );

  useEffect(() => {
    if (!isDraggingSelection) {
      return;
    }

    function stopDragging(event: PointerEvent) {
      if (!shouldHandlePointer(event)) {
        return;
      }

      onSelectionCommit?.(pendingSelectionRangeRef.current);
      dragAnchorRef.current = null;
      activePointerIdRef.current = null;
      setIsDraggingSelection(false);
    }

    window.addEventListener("pointerup", stopDragging);

    return () => window.removeEventListener("pointerup", stopDragging);
  }, [isDraggingSelection, onSelectionCommit, shouldHandlePointer]);

  useEffect(() => {
    if (!isDraggingFillHandle) {
      return;
    }

    function stopDraggingFill(event: PointerEvent) {
      if (!shouldHandlePointer(event)) {
        return;
      }

      const pendingFill = pendingFillRef.current;

      if (pendingFill) {
        pendingSelectionRangeRef.current = pendingFill.range;
        onSelectRange(pendingFill.range);
        onSelectionCommit?.(pendingFill.range);
        onFillRange(pendingFill.range, pendingFill.mode);
      }

      fillAnchorRangeRef.current = null;
      pendingFillRef.current = null;
      activePointerIdRef.current = null;
      setIsDraggingFillHandle(false);
    }

    window.addEventListener("pointerup", stopDraggingFill);

    return () => window.removeEventListener("pointerup", stopDraggingFill);
  }, [
    isDraggingFillHandle,
    onFillRange,
    onSelectRange,
    onSelectionCommit,
    shouldHandlePointer,
  ]);

  useEffect(() => {
    if (!isDraggingSelection && !isDraggingFillHandle) {
      return;
    }

    function continueDragging(event: PointerEvent) {
      if (!shouldHandlePointer(event)) {
        return;
      }

      const targetSelection = getSelectionFromPoint(
        event.clientX,
        event.clientY,
        gridRootRef.current,
      );

      if (!targetSelection) {
        return;
      }

      event.preventDefault();
      continueGridDrag(targetSelection);
    }

    window.addEventListener("pointermove", continueDragging, { passive: false });

    return () => window.removeEventListener("pointermove", continueDragging);
  }, [
    continueGridDrag,
    gridRootRef,
    isDraggingFillHandle,
    isDraggingSelection,
    shouldHandlePointer,
  ]);

  function handleGridCellPointerDown({
    event,
    targetSelection,
    selection,
    mergedCell,
  }: GridCellPointerInput) {
    if (event.button !== 0) {
      return;
    }

    activePointerIdRef.current = event.pointerId;

    if (event.shiftKey) {
      const anchor = {
        rowIndex: selectedRange.startRowIndex,
        columnIndex: selectedRange.startColumnIndex,
      };

      pendingSelectionRangeRef.current = normalizeSelectionRange(
        anchor,
        targetSelection,
      );
      dragAnchorRef.current = anchor;
      onSelectCell(targetSelection, { extend: true });
    } else if (mergedCell) {
      pendingSelectionRangeRef.current = mergedCell;
      dragAnchorRef.current = {
        rowIndex: mergedCell.startRowIndex,
        columnIndex: mergedCell.startColumnIndex,
      };
      onSelectRange(mergedCell);
    } else {
      pendingSelectionRangeRef.current = selectionToRange(selection);
      dragAnchorRef.current = selection;
      onSelectCell(selection);
    }

    setIsDraggingSelection(true);
  }

  function handleGridCellPointerEnter({ targetSelection }: GridCellHoverInput) {
    continueGridDrag(targetSelection);
  }

  function selectRangeAndCommit(range: CellRange) {
    pendingSelectionRangeRef.current = range;
    onSelectRange(range);
    onSelectionCommit?.(range);
  }

  function startFillHandleDrag() {
    fillAnchorRangeRef.current = { ...selectedRange };
    pendingFillRef.current = null;
    setIsDraggingFillHandle(true);
  }

  function startTouchSelectionHandle({
    event,
    handle,
  }: GridTouchSelectionHandleInput) {
    event.preventDefault();
    event.stopPropagation();

    activePointerIdRef.current = event.pointerId;
    dragAnchorRef.current = getTouchSelectionAnchor(selectedRange, handle);
    pendingSelectionRangeRef.current = selectedRange;
    setIsDraggingSelection(true);

    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  return {
    handleGridCellPointerDown,
    handleGridCellPointerEnter,
    selectRangeAndCommit,
    startFillHandleDrag,
    startTouchSelectionHandle,
  };
}

function getSelectionFromPoint(
  clientX: number,
  clientY: number,
  gridRoot: HTMLElement | null,
) {
  const element = document
    .elementFromPoint(clientX, clientY)
    ?.closest<HTMLElement>("[data-grid-row-index][data-grid-column-index]");

  if (!element || (gridRoot && !gridRoot.contains(element))) {
    return null;
  }

  const rowIndex = Number(element?.dataset.gridRowIndex);
  const columnIndex = Number(element?.dataset.gridColumnIndex);

  if (!Number.isInteger(rowIndex) || !Number.isInteger(columnIndex)) {
    return null;
  }

  return { rowIndex, columnIndex };
}
