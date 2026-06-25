import { useEffect, useMemo, type RefObject } from "react";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import {
  getRowHeight,
  scaleSize,
} from "@/features/spreadsheet/components/grid-geometry";
import type { SheetData } from "@/features/workbooks/types";

type UseGridRowVirtualizerInput = {
  scrollAreaRef: RefObject<HTMLDivElement | null>;
  autoScrollSelection?: boolean;
  sheet: SheetData;
  selectedRowIndex: number;
  visibleRowIndexes: number[];
  frozenRowCount: number;
  zoomScale: number;
};

export function useGridRowVirtualizer({
  scrollAreaRef,
  autoScrollSelection = true,
  sheet,
  selectedRowIndex,
  visibleRowIndexes,
  frozenRowCount,
  zoomScale,
}: UseGridRowVirtualizerInput) {
  const frozenVirtualRowCount = Math.min(frozenRowCount, visibleRowIndexes.length);

  const rowVirtualizer = useVirtualizer({
    count: visibleRowIndexes.length,
    getScrollElement: () => scrollAreaRef.current,
    estimateSize: (index) =>
      scaleSize(getRowHeight(sheet, visibleRowIndexes[index] ?? index), zoomScale),
    overscan: 14,
    rangeExtractor: frozenVirtualRowCount > 0
      ? (range) =>
          Array.from(
            new Set([
              ...Array.from(
                { length: frozenVirtualRowCount },
                (_, rowIndex) => rowIndex,
              ),
              ...defaultRangeExtractor(range),
            ]),
          )
      : undefined,
  });
  const selectedVirtualIndex = useMemo(
    () => visibleRowIndexes.indexOf(selectedRowIndex),
    [selectedRowIndex, visibleRowIndexes],
  );

  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowVirtualizer, sheet.cells, visibleRowIndexes, zoomScale]);

  useEffect(() => {
    if (!autoScrollSelection) {
      return;
    }

    if (selectedVirtualIndex >= 0) {
      rowVirtualizer.scrollToIndex(selectedVirtualIndex, { align: "auto" });
    }
  }, [autoScrollSelection, rowVirtualizer, selectedVirtualIndex]);

  return rowVirtualizer;
}
