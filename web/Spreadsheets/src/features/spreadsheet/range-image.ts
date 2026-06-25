import { cellKey } from "@/features/workbooks/addresses";
import { cellFontFamilyToCss } from "@/features/workbooks/font-families";
import {
  getEffectiveHiddenColumns,
  getEffectiveHiddenRows,
} from "@/features/spreadsheet/outline-groups";
import type { ChartRange, SheetData } from "@/features/workbooks/types";

const ROW_HEIGHT = 30;
const MAX_CANVAS_SIZE = 8192;

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }

  let clipped = text;

  while (clipped.length > 1 && context.measureText(`${clipped}...`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }

  return `${clipped}...`;
}

function visibleIndexes(start: number, end: number, hiddenIndexes: Set<number>) {
  const indexes: number[] = [];

  for (let index = start; index <= end; index += 1) {
    if (!hiddenIndexes.has(index)) {
      indexes.push(index);
    }
  }

  return indexes;
}

export async function rangeToPngBlob(
  sheet: SheetData,
  range: ChartRange,
  computedValues: Record<string, string>,
) {
  const rowIndexes = visibleIndexes(
    range.startRowIndex,
    range.endRowIndex,
    getEffectiveHiddenRows(sheet),
  );
  const columnIndexes = visibleIndexes(
    range.startColumnIndex,
    range.endColumnIndex,
    getEffectiveHiddenColumns(sheet),
  );
  const columnWidths = columnIndexes.map(
    (columnIndex) => sheet.columnWidths[String(columnIndex)] ?? 112,
  );
  const width = columnWidths.reduce((total, value) => total + value, 0);
  const height = rowIndexes.length * ROW_HEIGHT;

  if (
    width <= 0 ||
    height <= 0 ||
    width > MAX_CANVAS_SIZE ||
    height > MAX_CANVAS_SIZE
  ) {
    return null;
  }

  const canvas = document.createElement("canvas");
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  canvas.width = Math.ceil(width * pixelRatio);
  canvas.height = Math.ceil(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.scale(pixelRatio, pixelRatio);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.textBaseline = "middle";

  let y = 0;

  for (const rowIndex of rowIndexes) {
    let x = 0;

    for (const [columnOffset, columnIndex] of columnIndexes.entries()) {
      const key = cellKey(rowIndex, columnIndex);
      const cell = sheet.cells[key];
      const style = cell?.style;
      const cellWidth = columnWidths[columnOffset];
      const value = computedValues[key] ?? cell?.raw ?? "";
      const fontSize = style?.fontSize ?? 13;
      const effectiveFontSize =
        style?.shrinkToFit && value
          ? Math.max(
              8,
              Math.min(
                fontSize,
                Math.floor((Math.max(cellWidth - 16, 20) / value.length) * 1.7),
              ),
            )
          : fontSize;
      const fontWeight = style?.bold ? "700" : "400";
      const fontStyle = style?.italic ? "italic" : "normal";
      const fontFamily = cellFontFamilyToCss(style?.fontFamily) ?? "Arial, sans-serif";

      context.fillStyle = style?.background ?? "#ffffff";
      context.fillRect(x, y, cellWidth, ROW_HEIGHT);
      context.strokeStyle = style?.borders?.color ?? "#d1d5db";
      context.lineWidth = 1;
      context.strokeRect(x + 0.5, y + 0.5, cellWidth, ROW_HEIGHT);
      context.font = `${fontStyle} ${fontWeight} ${effectiveFontSize}px ${fontFamily}`;
      context.fillStyle = style?.foreground ?? "#111827";

      const textPadding = 8 + (style?.indent ?? 0) * 12;
      const text = fitText(context, value, Math.max(cellWidth - textPadding * 2, 16));
      const textY =
        style?.verticalAlign === "top"
          ? y + textPadding
          : style?.verticalAlign === "bottom"
            ? y + ROW_HEIGHT - textPadding
            : y + ROW_HEIGHT / 2;
      const textX =
        style?.align === "right"
          ? x + cellWidth - textPadding
          : style?.align === "center"
            ? x + cellWidth / 2
            : x + textPadding;

      context.textAlign =
        style?.align === "right"
          ? "right"
          : style?.align === "center"
            ? "center"
            : "left";
      context.save();
      if (style?.verticalText) {
        context.translate(textX, y + ROW_HEIGHT / 2);
        context.rotate(Math.PI / 2);
        context.fillText(text, 0, 0);
      } else if (style?.textRotation) {
        context.translate(textX, textY);
        context.rotate((style.textRotation * Math.PI) / 180);
        context.fillText(text, 0, 0);
      } else {
        context.fillText(text, textX, textY);
      }
      context.restore();

      if ((style?.underline || style?.strikethrough) && text) {
        const textWidth = context.measureText(text).width;
        const startX =
          context.textAlign === "right"
            ? textX - textWidth
            : context.textAlign === "center"
              ? textX - textWidth / 2
              : textX;

        context.strokeStyle = style?.foreground ?? "#111827";

        if (style.underline) {
          const underlineY = textY + effectiveFontSize / 2 - 1;

          context.beginPath();
          context.moveTo(startX, underlineY);
          context.lineTo(startX + textWidth, underlineY);
          context.stroke();
        }

        if (style.strikethrough) {
          context.beginPath();
          context.moveTo(startX, textY);
          context.lineTo(startX + textWidth, textY);
          context.stroke();
        }
      }

      x += cellWidth;
    }

    y += ROW_HEIGHT;
  }

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
