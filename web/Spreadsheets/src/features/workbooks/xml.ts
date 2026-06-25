import { cellKey, parseCellKey } from "@/features/workbooks/addresses";
import {
  getEffectiveHiddenColumns,
  getEffectiveHiddenRows,
} from "@/features/spreadsheet/outline-groups";
import type { SheetData } from "@/features/workbooks/types";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getExportRange(sheet: SheetData) {
  let maxRowIndex = 0;
  let maxColumnIndex = 0;

  Object.entries(sheet.cells).forEach(([key, cell]) => {
    if (!cell.raw && !cell.style && !cell.richTextRuns?.length) {
      return;
    }

    const position = parseCellKey(key);

    if (!position) {
      return;
    }

    maxRowIndex = Math.max(maxRowIndex, position.rowIndex);
    maxColumnIndex = Math.max(maxColumnIndex, position.columnIndex);
  });

  return {
    rowCount: Math.min(sheet.rowCount, maxRowIndex + 1),
    columnCount: Math.min(sheet.columnCount, maxColumnIndex + 1),
  };
}

function xmlDataType(value: string) {
  return value.trim() !== "" && Number.isFinite(Number(value))
    ? "Number"
    : "String";
}

export function sheetToXml(
  sheet: SheetData,
  computedValues: Record<string, string>,
) {
  const hiddenRows = getEffectiveHiddenRows(sheet);
  const hiddenColumns = getEffectiveHiddenColumns(sheet);
  const exportRange = getExportRange(sheet);
  const columns = Array.from(
    { length: exportRange.columnCount },
    (_, columnIndex) => {
      const hidden = hiddenColumns.has(columnIndex) ? ' ss:Hidden="1"' : "";
      const width = sheet.columnWidths[String(columnIndex)] ?? 112;

      return `<Column ss:Width="${width}"${hidden}/>`;
    },
  ).join("");
  const rows = Array.from({ length: exportRange.rowCount }, (_, rowIndex) => {
    const hidden = hiddenRows.has(rowIndex) ? ' ss:Hidden="1"' : "";
    const cells = Array.from(
      { length: exportRange.columnCount },
      (_, columnIndex) => {
        const key = cellKey(rowIndex, columnIndex);
        const value = computedValues[key] ?? sheet.cells[key]?.raw ?? "";
        const type = xmlDataType(value);

        return `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
      },
    ).join("");

    return `<Row${hidden}>${cells}</Row>`;
  }).join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${escapeXml(sheet.name.slice(0, 31) || "Sheet")}">
    <Table>${columns}${rows}</Table>
  </Worksheet>
</Workbook>`;
}
