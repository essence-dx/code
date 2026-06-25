import {
  getColumnWidth,
  getVisibleRowsHeightBefore,
  ROW_HEADER_WIDTH,
  scaleSize,
} from "@/features/spreadsheet/components/grid-geometry";
import type {
  InsertedObjectAnchor,
  SheetData,
} from "@/features/workbooks/types";

export type WorksheetObjectGeometry = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type WorksheetAlignmentGuides = {
  horizontal: number[];
  vertical: number[];
};

export function getObjectGeometry({
  object,
  sheet,
  visibleColumnIndexes,
  visibleRowIndexes,
  zoomScale,
}: {
  object: { anchor: InsertedObjectAnchor };
  sheet: SheetData;
  visibleColumnIndexes: number[];
  visibleRowIndexes: number[];
  zoomScale: number;
}): WorksheetObjectGeometry | null {
  const rowPosition = visibleRowIndexes.indexOf(object.anchor.rowIndex);
  const columnPosition = visibleColumnIndexes.indexOf(object.anchor.columnIndex);

  if (rowPosition === -1 || columnPosition === -1) {
    return null;
  }

  const top = getVisibleRowsHeightBefore(
    sheet,
    visibleRowIndexes,
    rowPosition,
    zoomScale,
  );
  const left = visibleColumnIndexes
    .slice(0, columnPosition)
    .reduce(
      (total, columnIndex) =>
        total + scaleSize(getColumnWidth(sheet, columnIndex), zoomScale),
      scaleSize(ROW_HEADER_WIDTH, zoomScale),
    );

  return {
    height: scaleSize(object.anchor.height, zoomScale),
    left: left + scaleSize(object.anchor.offsetX, zoomScale),
    top: top + scaleSize(object.anchor.offsetY, zoomScale),
    width: scaleSize(object.anchor.width, zoomScale),
  };
}

export function getAlignmentGuides(
  selected: WorksheetObjectGeometry,
  siblings: WorksheetObjectGeometry[],
): WorksheetAlignmentGuides {
  const selectedVertical = [
    selected.left,
    selected.left + selected.width / 2,
    selected.left + selected.width,
  ];
  const selectedHorizontal = [
    selected.top,
    selected.top + selected.height / 2,
    selected.top + selected.height,
  ];
  const vertical = new Set<number>();
  const horizontal = new Set<number>();

  siblings.forEach((sibling) => {
    [
      sibling.left,
      sibling.left + sibling.width / 2,
      sibling.left + sibling.width,
    ].forEach((value) => {
      if (selectedVertical.some((item) => Math.abs(item - value) <= 4)) {
        vertical.add(Math.round(value));
      }
    });
    [
      sibling.top,
      sibling.top + sibling.height / 2,
      sibling.top + sibling.height,
    ].forEach((value) => {
      if (selectedHorizontal.some((item) => Math.abs(item - value) <= 4)) {
        horizontal.add(Math.round(value));
      }
    });
  });

  return {
    horizontal: Array.from(horizontal),
    vertical: Array.from(vertical),
  };
}
