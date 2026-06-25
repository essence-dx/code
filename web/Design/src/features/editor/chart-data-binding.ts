import {
  defaultChartData,
  maxChartDataPoints,
  normalizeChartData,
} from "@/features/editor/chart";
import {
  createTableView,
  getTableRawRows,
} from "@/features/editor/table-view";
import type {
  ChartDataPoint,
  ChartElement,
  DesignElement,
  TableElement,
} from "@/features/editor/types";

export const manualChartDataSourceId = "__manual__";

export function getTableElements(elements: readonly DesignElement[]) {
  return elements.filter(
    (element): element is TableElement => element.type === "table",
  );
}

export function resolveChartData(
  element: ChartElement,
  pageElements: readonly DesignElement[] = [],
) {
  const linkedData = getLinkedChartData(element, pageElements);

  if (linkedData.length > 0) {
    return normalizeChartData(linkedData);
  }

  return normalizeChartData(element.data);
}

export function getLinkedChartData(
  element: ChartElement,
  pageElements: readonly DesignElement[],
) {
  const table = getLinkedTable(element, pageElements);

  if (!table) return [];

  return createChartDataFromTable({
    fallbackData: element.data,
    labelColumnIndex: element.dataSourceLabelColumnIndex ?? 0,
    table,
    useFilteredRows: element.dataSourceUseFilteredRows ?? true,
    valueColumnIndex: element.dataSourceValueColumnIndex ?? 1,
  });
}

export function getLinkedTable(
  element: ChartElement,
  pageElements: readonly DesignElement[],
) {
  if (!element.dataSourceTableId) return null;

  return (
    getTableElements(pageElements).find(
      (table) => table.id === element.dataSourceTableId,
    ) ?? null
  );
}

export function createChartDataFromTable({
  fallbackData = defaultChartData,
  labelColumnIndex,
  table,
  useFilteredRows,
  valueColumnIndex,
}: {
  fallbackData?: ChartDataPoint[];
  labelColumnIndex: number;
  table: TableElement;
  useFilteredRows: boolean;
  valueColumnIndex: number;
}) {
  const rows = useFilteredRows ? createTableView(table).rows : getRawTableRows(table);
  const data: ChartDataPoint[] = [];

  rows.forEach((row) => {
    if (row.isHeader || row.isEmptyState) return;

    const value = parseChartNumber(row.cells[valueColumnIndex] ?? "");

    if (value === null) return;

    const fallback = fallbackData[data.length % fallbackData.length];
    const label = (row.cells[labelColumnIndex] ?? "").trim();

    data.push({
      label: label || `Row ${data.length + 1}`,
      value,
      color:
        fallback?.color ??
        defaultChartData[data.length % defaultChartData.length].color,
    });
  });

  return data.slice(0, maxChartDataPoints);
}

export function getTableColumnOptions(table: TableElement) {
  const headerRows = createTableView(table).rows;
  const header = table.headerRow ? headerRows[0] : null;

  return Array.from({ length: Math.max(1, table.columns) }, (_, index) => {
    const headerLabel = header?.cells[index]?.trim();

    return {
      label: headerLabel || `Column ${index + 1}`,
      value: index,
    };
  });
}

export function formatTableDataSourceLabel(
  table: TableElement,
  tableIndex: number,
) {
  return `Table ${tableIndex + 1} (${table.rows} x ${table.columns})`;
}

function getRawTableRows(table: TableElement) {
  return getTableRawRows(table).map((cells, rowIndex) => ({
    cells,
    isEmptyState: false,
    isHeader: table.headerRow && rowIndex === 0,
    sourceRowIndex: rowIndex,
  }));
}

function parseChartNumber(value: string) {
  const normalized = value.trim().replace(/[$,%\s]/g, "").replace(/,/g, "");

  if (!normalized) return null;

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}
