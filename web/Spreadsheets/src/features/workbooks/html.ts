import { cellKey } from "@/features/workbooks/addresses";
import { cellFontFamilyToCss } from "@/features/workbooks/font-families";
import {
  expandPrintFieldText,
  type PrintFieldContext,
} from "@/features/workbooks/print-fields";
import {
  getEffectiveSheetPrintSettings,
  printMarginValues,
} from "@/features/workbooks/print-settings";
import {
  getSheetPrintPageRanges,
  getSheetPrintVisibleIndexes,
  type SheetPrintPageRange,
} from "@/features/workbooks/print-pages";
import { cellStyleToExcelNumberFormat } from "@/features/workbooks/number-formats";
import { cellRichTextRunsToHtml } from "@/features/workbooks/rich-text";
import type {
  CellStyle,
  SheetData,
  SheetPrintSettings,
} from "@/features/workbooks/types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textDecorationToCss(style: CellStyle) {
  const decorations = [
    style.underline ? "underline" : null,
    style.strikethrough ? "line-through" : null,
  ].filter(Boolean);

  return decorations.length ? `text-decoration:${decorations.join(" ")}` : null;
}

function cellStyleToCss(style?: CellStyle) {
  if (!style) {
    return "";
  }

  const numberFormat = cellStyleToExcelNumberFormat(style);
  const rules = [
    style.bold ? "font-weight:700" : null,
    style.italic ? "font-style:italic" : null,
    textDecorationToCss(style),
    style.align ? `text-align:${style.align}` : null,
    style.verticalAlign ? `vertical-align:${style.verticalAlign}` : null,
    style.background ? `background-color:${style.background}` : null,
    style.foreground ? `color:${style.foreground}` : null,
    style.fontFamily ? `font-family:${cellFontFamilyToCss(style.fontFamily)}` : null,
    style.fontSize ? `font-size:${style.fontSize}px` : null,
    style.indent ? `padding-left:${8 + style.indent * 12}px` : null,
    style.wrap ? "white-space:pre-wrap" : null,
    style.shrinkToFit ? "font-stretch:condensed" : null,
    style.verticalText ? "writing-mode:vertical-rl;text-orientation:mixed" : null,
    style.textRotation && !style.verticalText
      ? `transform:rotate(${style.textRotation}deg);transform-origin:center`
      : null,
    style.borders?.top ? `border-top:1px solid ${style.borders.color ?? "#111827"}` : null,
    style.borders?.right ? `border-right:1px solid ${style.borders.color ?? "#111827"}` : null,
    style.borders?.bottom ? `border-bottom:1px solid ${style.borders.color ?? "#111827"}` : null,
    style.borders?.left ? `border-left:1px solid ${style.borders.color ?? "#111827"}` : null,
    numberFormat ? `mso-number-format:'${numberFormat}'` : null,
  ].filter(Boolean);

  return rules.length ? ` style="${escapeHtml(rules.join(";"))}"` : "";
}

function renderSheetHtml({
  sheet,
  computedValues,
  settings,
  fieldContext,
  visibleRows,
  visibleColumns,
  useManualPageBreaks,
  title,
}: {
  sheet: SheetData;
  computedValues: Record<string, string>;
  settings: SheetPrintSettings;
  fieldContext: PrintFieldContext;
  visibleRows: number[];
  visibleColumns: number[];
  useManualPageBreaks: boolean;
  title: string;
}) {
  const borderColor = settings.printGridlines ? "#d1d5db" : "transparent";
  const scale = settings.scale / 100;
  const rowPageBreaks = useManualPageBreaks
    ? new Set(settings.rowPageBreaks)
    : new Set<number>();
  const columnPageBreaks = useManualPageBreaks
    ? new Set(settings.columnPageBreaks)
    : new Set<number>();
  const columnSegments = visibleColumns.reduce<number[][]>(
    (segments, columnIndex, columnOffset) => {
      if (
        columnOffset > 0 &&
        columnPageBreaks.has(columnIndex) &&
        segments[segments.length - 1]?.length
      ) {
        segments.push([]);
      }

      segments[segments.length - 1]?.push(columnIndex);

      return segments;
    },
    [[]],
  );
  const repeatColumnIndex = settings.repeatFirstColumn
    ? visibleColumns[0]
    : undefined;
  const columnsForSegment = (columns: number[]) =>
    repeatColumnIndex !== undefined &&
    columns.length > 0 &&
    !columns.includes(repeatColumnIndex)
      ? [repeatColumnIndex, ...columns]
      : columns;
  const columnMarkup = (columns: number[]) =>
    columns
      .map((columnIndex) => {
        const width = sheet.columnWidths[String(columnIndex)] ?? 112;

        return `<col style="width:${width}px">`;
      })
      .join("");
  const rowMarkup = (rowIndex: number, columns: number[]) => {
    const pageBreak = rowPageBreaks.has(rowIndex)
      ? ' style="break-before:page;page-break-before:always"'
      : "";
    const cells = columns
      .map((columnIndex) => {
        const key = cellKey(rowIndex, columnIndex);
        const cell = sheet.cells[key];
        const value = computedValues[key] ?? cell?.raw ?? "";
        const formula =
          cell?.raw.startsWith("=")
            ? ` data-formula="${escapeHtml(cell.raw)}"`
            : "";
        const content = cell?.richTextRuns?.length
          ? cellRichTextRunsToHtml(cell.richTextRuns, escapeHtml)
          : escapeHtml(value);

        return `<td${formula}${cellStyleToCss(cell?.style)}>${content}</td>`;
      })
      .join("");

    return `<tr${pageBreak}>${cells}</tr>`;
  };
  const bodyStartIndex = settings.repeatHeaderRows ? 1 : 0;
  const tableMarkup = columnSegments
    .filter((columns) => columns.length > 0 || visibleColumns.length === 0)
    .map((segmentColumns, segmentIndex) => {
      const columns = columnsForSegment(segmentColumns);
      const headerRows =
        settings.repeatHeaderRows && visibleRows[0] !== undefined
          ? `<thead>${rowMarkup(visibleRows[0], columns)}</thead>`
          : "";
      const rows = visibleRows
        .slice(bodyStartIndex)
        .map((rowIndex) => rowMarkup(rowIndex, columns))
        .join("");
      const pageBreakClass =
        segmentIndex === 0 ? "" : " sheet-print-page-break";

      return `<table class="sheet-print-table${pageBreakClass}">
      <colgroup>${columnMarkup(columns)}</colgroup>
      ${headerRows}
      <tbody>${rows}</tbody>
    </table>`;
    })
    .join("");
  const headerTextValue = expandPrintFieldText(
    settings.headerText,
    fieldContext,
  );
  const footerTextValue = expandPrintFieldText(
    settings.footerText,
    fieldContext,
  );
  const headerText = headerTextValue
    ? `<header>${escapeHtml(headerTextValue)}</header>`
    : "";
  const footerText = footerTextValue
    ? `<footer>${escapeHtml(footerTextValue)}</footer>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: ${settings.orientation}; margin: ${printMarginValues[settings.margins]}; }
    body { margin: 24px; font-family: Arial, sans-serif; color: #111827; }
    header, footer { color: #4b5563; font-size: 12px; margin: 0 0 12px; }
    footer { margin: 12px 0 0; }
    .sheet-print-scale { transform: scale(${scale}); transform-origin: top left; width: ${100 / scale}%; }
    .sheet-print-table { border-collapse: collapse; }
    .sheet-print-table + .sheet-print-table { margin-top: 24px; }
    .sheet-print-page-break { break-before: page; page-break-before: always; }
    thead { display: table-header-group; }
    td { min-width: 72px; min-height: 24px; border: 1px solid ${borderColor}; padding: 4px 8px; vertical-align: top; white-space: pre-line; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  ${headerText}
  <div class="sheet-print-scale">
    ${tableMarkup}
  </div>
  ${footerText}
</body>
</html>`;
}

export type SheetPrintPreviewPage = SheetPrintPageRange & {
  html: string;
};

export function sheetToHtml(
  sheet: SheetData,
  computedValues: Record<string, string>,
  printSettings?: SheetPrintSettings,
  options?: {
    fileName?: string;
    generatedAt?: Date;
  },
) {
  const settings = getEffectiveSheetPrintSettings(sheet.id, printSettings);
  const pages = getSheetPrintPageRanges(sheet, settings);
  const { visibleRows, visibleColumns } = getSheetPrintVisibleIndexes(
    sheet,
    settings,
  );

  return renderSheetHtml({
    sheet,
    computedValues,
    settings,
    fieldContext: {
      fileName: options?.fileName ?? sheet.name,
      sheetName: sheet.name,
      pageNumber: 1,
      pageCount: pages.length,
      generatedAt: options?.generatedAt,
    },
    visibleRows,
    visibleColumns,
    useManualPageBreaks: true,
    title: sheet.name,
  });
}

export function sheetToPrintPreviewPages(
  sheet: SheetData,
  computedValues: Record<string, string>,
  printSettings?: SheetPrintSettings,
  options?: {
    fileName?: string;
    generatedAt?: Date;
  },
): SheetPrintPreviewPage[] {
  const settings = getEffectiveSheetPrintSettings(sheet.id, printSettings);
  const pages = getSheetPrintPageRanges(sheet, settings);
  const { visibleRows, visibleColumns } = getSheetPrintVisibleIndexes(
    sheet,
    settings,
  );
  const firstVisibleRow = visibleRows[0];
  const firstVisibleColumn = visibleColumns[0];

  return pages.map((page) => {
    const pageRows = visibleRows.filter(
      (rowIndex) =>
        rowIndex >= page.range.startRowIndex &&
        rowIndex <= page.range.endRowIndex,
    );
    const pageColumns = visibleColumns.filter(
      (columnIndex) =>
        columnIndex >= page.range.startColumnIndex &&
        columnIndex <= page.range.endColumnIndex,
    );
    const rows =
      settings.repeatHeaderRows &&
      firstVisibleRow !== undefined &&
      !pageRows.includes(firstVisibleRow)
        ? [firstVisibleRow, ...pageRows]
        : pageRows;
    const columns =
      settings.repeatFirstColumn &&
      firstVisibleColumn !== undefined &&
      !pageColumns.includes(firstVisibleColumn)
        ? [firstVisibleColumn, ...pageColumns]
        : pageColumns;

    return {
      ...page,
      html: renderSheetHtml({
        sheet,
        computedValues,
        settings,
        fieldContext: {
          fileName: options?.fileName ?? sheet.name,
          sheetName: sheet.name,
          pageNumber: page.pageNumber,
          pageCount: pages.length,
          generatedAt: options?.generatedAt,
        },
        visibleRows: rows,
        visibleColumns: columns,
        useManualPageBreaks: false,
        title: `${sheet.name} page ${page.pageNumber}`,
      }),
    };
  });
}
