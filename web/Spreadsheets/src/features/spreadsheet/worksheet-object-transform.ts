import {
  getColumnWidth,
  getRowHeight,
} from "@/features/spreadsheet/components/grid-geometry";
import type {
  InsertedObjectAnchor,
  SheetData,
} from "@/features/workbooks/types";

type AnchorTarget = {
  anchor: InsertedObjectAnchor;
};

export type ObjectResizeHandle =
  | "north"
  | "northEast"
  | "east"
  | "southEast"
  | "south"
  | "southWest"
  | "west"
  | "northWest";

const minWidth = 32;
const minHeight = 24;
const maxWidth = 960;
const maxHeight = 720;

function columnStart(sheet: SheetData, columnIndex: number) {
  let total = 0;

  for (let index = 0; index < columnIndex; index += 1) {
    total += getColumnWidth(sheet, index);
  }

  return total;
}

function rowStart(sheet: SheetData, rowIndex: number) {
  let total = 0;

  for (let index = 0; index < rowIndex; index += 1) {
    total += getRowHeight(sheet, index);
  }

  return total;
}

function anchorToBox(sheet: SheetData, anchor: InsertedObjectAnchor) {
  const left = columnStart(sheet, anchor.columnIndex) + anchor.offsetX;
  const top = rowStart(sheet, anchor.rowIndex) + anchor.offsetY;

  return {
    bottom: top + anchor.height,
    left,
    right: left + anchor.width,
    top,
  };
}

function positionToAnchor(
  sheet: SheetData,
  left: number,
  top: number,
  size: Pick<InsertedObjectAnchor, "height" | "width">,
): InsertedObjectAnchor {
  const position = {
    columnIndex: 0,
    offsetX: Math.max(0, left),
    offsetY: Math.max(0, top),
    rowIndex: 0,
  };

  for (
    let columnIndex = 0;
    columnIndex < Math.max(sheet.columnCount - 1, 0);
    columnIndex += 1
  ) {
    const width = getColumnWidth(sheet, columnIndex);

    if (position.offsetX < width) {
      position.columnIndex = columnIndex;
      break;
    }

    position.offsetX -= width;
    position.columnIndex = columnIndex + 1;
  }

  for (
    let rowIndex = 0;
    rowIndex < Math.max(sheet.rowCount - 1, 0);
    rowIndex += 1
  ) {
    const height = getRowHeight(sheet, rowIndex);

    if (position.offsetY < height) {
      position.rowIndex = rowIndex;
      break;
    }

    position.offsetY -= height;
    position.rowIndex = rowIndex + 1;
  }

  return {
    columnIndex: Math.min(position.columnIndex, Math.max(sheet.columnCount - 1, 0)),
    height: clampSize(size.height, minHeight, maxHeight),
    offsetX: Math.max(0, Math.round(position.offsetX)),
    offsetY: Math.max(0, Math.round(position.offsetY)),
    rowIndex: Math.min(position.rowIndex, Math.max(sheet.rowCount - 1, 0)),
    width: clampSize(size.width, minWidth, maxWidth),
  };
}

function clampSize(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(value), min), max);
}

export function moveInsertedObjectAnchor({
  deltaX,
  deltaY,
  object,
  sheet,
}: {
  deltaX: number;
  deltaY: number;
  object: AnchorTarget;
  sheet: SheetData;
}) {
  const box = anchorToBox(sheet, object.anchor);

  return positionToAnchor(
    sheet,
    Math.max(0, box.left + deltaX),
    Math.max(0, box.top + deltaY),
    object.anchor,
  );
}

export function resizeInsertedObjectAnchor({
  deltaX,
  deltaY,
  handle,
  object,
  sheet,
}: {
  deltaX: number;
  deltaY: number;
  handle: ObjectResizeHandle;
  object: AnchorTarget;
  sheet: SheetData;
}) {
  const box = anchorToBox(sheet, object.anchor);
  const normalizedHandle = handle.toLowerCase();
  let left = box.left;
  let right = box.right;
  let top = box.top;
  let bottom = box.bottom;

  if (normalizedHandle.includes("west")) {
    left += deltaX;
  }

  if (normalizedHandle.includes("east")) {
    right += deltaX;
  }

  if (normalizedHandle.includes("north")) {
    top += deltaY;
  }

  if (normalizedHandle.includes("south")) {
    bottom += deltaY;
  }

  if (right - left < minWidth) {
    if (normalizedHandle.includes("west")) {
      left = right - minWidth;
    } else {
      right = left + minWidth;
    }
  }

  if (bottom - top < minHeight) {
    if (normalizedHandle.includes("north")) {
      top = bottom - minHeight;
    } else {
      bottom = top + minHeight;
    }
  }

  left = Math.max(0, left);
  top = Math.max(0, top);

  return positionToAnchor(sheet, left, top, {
    height: bottom - top,
    width: right - left,
  });
}
