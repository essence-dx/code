import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";
import {
  defaultRangeExtractor,
  useVirtualizer,
  type VirtualItem,
} from "@tanstack/react-virtual";
import {
  clampColumnWidth,
  getColumnWidth,
  scaleSize,
} from "@/features/spreadsheet/components/grid-geometry";
import { getContiguousIndexes } from "@/features/spreadsheet/index-cache";
import { getEffectiveHiddenColumns } from "@/features/spreadsheet/outline-groups";
import type { SheetData } from "@/features/workbooks/types";

type UseGridColumnSizingInput = {
  scrollAreaRef: RefObject<HTMLDivElement | null>;
  autoScrollSelection?: boolean;
  sheet: SheetData;
  selectedColumnIndex: number;
  frozenColumnCount: number;
  isRightToLeft: boolean;
  zoomScale: number;
  onResizeColumn: (columnIndex: number, width: number) => void;
};

export type GridColumnSpacer = {
  gridColumnStart: number;
  width: number;
};

export type RenderedGridColumn = {
  columnIndex: number;
  frozenLeft?: number;
  gridColumnStart: number;
  isFrozen: boolean;
};

export function useGridColumnSizing({
  scrollAreaRef,
  autoScrollSelection = true,
  sheet,
  selectedColumnIndex,
  frozenColumnCount,
  isRightToLeft,
  zoomScale,
  onResizeColumn,
}: UseGridColumnSizingInput) {
  const [draftColumnWidths, setDraftColumnWidths] = useState<Record<string, number>>(
    {},
  );
  const resizeAnimationFrameRef = useRef<number | null>(null);
  const pendingDraftWidthRef = useRef<{
    columnIndex: number;
    width: number;
  } | null>(null);
  const visibleColumnIndexes = useMemo(() => {
    const hiddenColumns = getEffectiveHiddenColumns(sheet);
    const columnIndexes = getContiguousIndexes(sheet.columnCount);

    if (hiddenColumns.size === 0) {
      return columnIndexes;
    }

    return columnIndexes.filter((columnIndex) => !hiddenColumns.has(columnIndex));
  }, [sheet.columnCount, sheet.columnGroups, sheet.hiddenColumns]);
  const frozenVirtualColumnCount = Math.min(
    frozenColumnCount,
    visibleColumnIndexes.length,
  );
  const selectedVirtualIndex = visibleColumnIndexes.indexOf(selectedColumnIndex);
  const columnVirtualizer = useVirtualizer({
    count: visibleColumnIndexes.length,
    getScrollElement: () => scrollAreaRef.current,
    estimateSize: (index) =>
      scaleSize(
        draftColumnWidths[String(visibleColumnIndexes[index] ?? index)] ??
          getColumnWidth(sheet, visibleColumnIndexes[index] ?? index),
        zoomScale,
      ),
    horizontal: true,
    isRtl: isRightToLeft,
    overscan: 6,
    rangeExtractor: frozenVirtualColumnCount > 0
      ? (range) =>
          Array.from(
            new Set([
              ...Array.from(
                { length: frozenVirtualColumnCount },
                (_, columnIndex) => columnIndex,
              ),
              ...defaultRangeExtractor(range),
            ]),
          )
      : undefined,
  });
  const columnVirtualItems = columnVirtualizer.getVirtualItems();
  const scrollVirtualItems = columnVirtualItems.filter(
    (virtualColumn) => virtualColumn.index >= frozenVirtualColumnCount,
  );
  const frozenColumns = visibleColumnIndexes
    .slice(0, frozenVirtualColumnCount)
    .map((columnIndex) => ({
      columnIndex,
      width: getColumnPixelWidth({
        columnIndex,
        draftColumnWidths,
        sheet,
        zoomScale,
      }),
    }));
  const frozenColumnsWidth = frozenColumns.reduce(
    (total, column) => total + column.width,
    0,
  );
  const firstScrollVirtualItem = scrollVirtualItems[0] ?? null;
  const lastScrollVirtualItem =
    scrollVirtualItems[scrollVirtualItems.length - 1] ?? null;
  const leftColumnSpacer =
    firstScrollVirtualItem &&
    Math.max(0, firstScrollVirtualItem.start - frozenColumnsWidth) > 0
      ? {
          gridColumnStart: 2 + frozenColumns.length,
          width: Math.max(0, firstScrollVirtualItem.start - frozenColumnsWidth),
        }
      : null;
  const rightColumnSpacerWidth = lastScrollVirtualItem
    ? Math.max(0, columnVirtualizer.getTotalSize() - lastScrollVirtualItem.end)
    : Math.max(0, columnVirtualizer.getTotalSize() - frozenColumnsWidth);
  const renderedColumns = buildRenderedColumns({
    frozenColumns,
    leftColumnSpacer,
    scrollVirtualItems,
    visibleColumnIndexes,
  });
  const rightColumnSpacer =
    rightColumnSpacerWidth > 0
      ? {
          gridColumnStart:
            Math.max(1, ...renderedColumns.map((column) => column.gridColumnStart)) +
            1,
          width: rightColumnSpacerWidth,
        }
      : null;
  const gridTemplateColumns = buildGridTemplateColumns({
    leftColumnSpacer,
    rightColumnSpacer,
    frozenColumns,
    scrollVirtualItems,
    visibleColumnIndexes,
  });

  useEffect(() => {
    columnVirtualizer.measure();
  }, [
    columnVirtualizer,
    draftColumnWidths,
    sheet.columnWidths,
    sheet.columnGroups,
    sheet.hiddenColumns,
    zoomScale,
  ]);

  useEffect(() => {
    if (!autoScrollSelection) {
      return;
    }

    if (selectedVirtualIndex >= 0) {
      columnVirtualizer.scrollToIndex(selectedVirtualIndex, { align: "auto" });
    }
  }, [autoScrollSelection, columnVirtualizer, selectedVirtualIndex]);

  useEffect(
    () => () => {
      if (resizeAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeAnimationFrameRef.current);
      }
    },
    [],
  );

  function startColumnResize(
    event: PointerEvent<HTMLButtonElement>,
    columnIndex: number,
  ) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth =
      draftColumnWidths[String(columnIndex)] ?? getColumnWidth(sheet, columnIndex);
    const flushDraftWidth = () => {
      const pendingDraftWidth = pendingDraftWidthRef.current;

      resizeAnimationFrameRef.current = null;

      if (!pendingDraftWidth) {
        return;
      }

      setDraftColumnWidths((widths) => {
        if (widths[String(pendingDraftWidth.columnIndex)] === pendingDraftWidth.width) {
          return widths;
        }

        return {
          ...widths,
          [String(pendingDraftWidth.columnIndex)]: pendingDraftWidth.width,
        };
      });
    };

    function handleMove(moveEvent: globalThis.PointerEvent) {
      pendingDraftWidthRef.current = {
        columnIndex,
        width: clampColumnWidth(startWidth + (moveEvent.clientX - startX) / zoomScale),
      };

      if (resizeAnimationFrameRef.current === null) {
        resizeAnimationFrameRef.current =
          window.requestAnimationFrame(flushDraftWidth);
      }
    }

    function handleUp(upEvent: globalThis.PointerEvent) {
      const nextWidth = clampColumnWidth(
        startWidth + (upEvent.clientX - startX) / zoomScale,
      );

      if (resizeAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeAnimationFrameRef.current);
        resizeAnimationFrameRef.current = null;
      }

      pendingDraftWidthRef.current = null;
      onResizeColumn(columnIndex, nextWidth);
      setDraftColumnWidths((widths) => {
        const next = { ...widths };
        delete next[String(columnIndex)];
        return next;
      });
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  return {
  gridTemplateColumns,
  leftColumnSpacer,
  renderedColumns,
  rightColumnSpacer,
  startColumnResize,
  totalColumnWidth: columnVirtualizer.getTotalSize(),
  visibleColumnIndexes,
  };
}

function buildRenderedColumns({
  frozenColumns,
  leftColumnSpacer,
  scrollVirtualItems,
  visibleColumnIndexes,
}: {
  frozenColumns: Array<{ columnIndex: number; width: number }>;
  leftColumnSpacer: GridColumnSpacer | null;
  scrollVirtualItems: VirtualItem[];
  visibleColumnIndexes: number[];
}) {
  let gridColumnStart = 2;
  let frozenLeft = 48;
  const renderedColumns: RenderedGridColumn[] = [];

  for (const frozenColumn of frozenColumns) {
    renderedColumns.push({
      columnIndex: frozenColumn.columnIndex,
      frozenLeft,
      gridColumnStart,
      isFrozen: true,
    });
    frozenLeft += frozenColumn.width;
    gridColumnStart += 1;
  }

  if (leftColumnSpacer) {
    gridColumnStart += 1;
  }

  for (const virtualColumn of scrollVirtualItems) {
    const columnIndex = visibleColumnIndexes[virtualColumn.index];

    if (typeof columnIndex !== "number") {
      continue;
    }

    renderedColumns.push({
      columnIndex,
      gridColumnStart,
      isFrozen: false,
    });
    gridColumnStart += 1;
  }

  return renderedColumns;
}

function buildGridTemplateColumns({
  leftColumnSpacer,
  rightColumnSpacer,
  frozenColumns,
  scrollVirtualItems,
  visibleColumnIndexes,
}: {
  leftColumnSpacer: GridColumnSpacer | null;
  rightColumnSpacer: GridColumnSpacer | null;
  frozenColumns: Array<{ columnIndex: number; width: number }>;
  scrollVirtualItems: VirtualItem[];
  visibleColumnIndexes: number[];
}) {
  const templateColumns = ["48px"];

  for (const frozenColumn of frozenColumns) {
    templateColumns.push(`${frozenColumn.width}px`);
  }

  if (leftColumnSpacer) {
    templateColumns.push(`${leftColumnSpacer.width}px`);
  }

  for (const virtualColumn of scrollVirtualItems) {
    if (typeof visibleColumnIndexes[virtualColumn.index] === "number") {
      templateColumns.push(`${virtualColumn.size}px`);
    }
  }

  if (rightColumnSpacer) {
    templateColumns.push(`${rightColumnSpacer.width}px`);
  }

  return templateColumns.join(" ");
}

function getColumnPixelWidth({
  columnIndex,
  draftColumnWidths,
  sheet,
  zoomScale,
}: {
  columnIndex: number;
  draftColumnWidths: Record<string, number>;
  sheet: SheetData;
  zoomScale: number;
}) {
  return scaleSize(
    draftColumnWidths[String(columnIndex)] ?? getColumnWidth(sheet, columnIndex),
    zoomScale,
  );
}
