import {
  getLinkedChartData,
  getLinkedTable,
} from "@/features/editor/chart-data-binding";
import type {
  ChartElement,
  DesignDocument,
  DesignElement,
  DesignPage,
  TableElement,
} from "@/features/editor/types";

export type DataVizStatus = "ready" | "review" | "blocked";

export type DataRefreshDiagnostic = {
  id: string;
  label: string;
  status: DataVizStatus;
  detail: string;
  targetId: string | null;
};

export type DataReportHandoffBundle = {
  id: string;
  title: string;
  generatedAt: string;
  publishReady: boolean;
  status: DataVizStatus;
  score: number;
  diagnostics: DataRefreshDiagnostic[];
  pages: Array<{
    id: string;
    name: string;
    chartCount: number;
    tableCount: number;
    linkedChartCount: number;
    brokenChartCount: number;
  }>;
  charts: Array<{
    id: string;
    pageName: string;
    type: ChartElement["chartType"];
    linkedTableId: string | null;
    dataPoints: number;
  }>;
  tables: Array<{
    id: string;
    pageName: string;
    rows: number;
    columns: number;
    sourceKind: string;
    sourceStatus: string;
    lastSyncedAt: string | null;
  }>;
};

export function createDataRefreshDiagnostics(
  document: DesignDocument,
  pageId?: string | null,
): DataRefreshDiagnostic[] {
  const pages = getReportPages(document, pageId);
  const diagnostics: DataRefreshDiagnostic[] = [];

  if (!pages.length) {
    return [
      {
        id: "document:composition",
        label: "Report pages",
        status: "blocked",
        detail: "No report page was found for this handoff bundle.",
        targetId: null,
      },
    ];
  }

  for (const page of pages) {
    const tables = getPageTables(page);
    const charts = getPageCharts(page);

    diagnostics.push(createPageCompositionDiagnostic(page, tables, charts));

    for (const table of tables) {
      diagnostics.push(createTableSourceDiagnostic(table));
    }

    for (const chart of charts) {
      diagnostics.push(createChartSourceDiagnostic(chart, page.elements));
    }
  }

  return diagnostics;
}

export function createDataReportHandoffBundle(
  document: DesignDocument,
  pageId?: string | null,
  generatedAt = new Date().toISOString(),
): DataReportHandoffBundle {
  const pages = getReportPages(document, pageId);
  const diagnostics = createDataRefreshDiagnostics(document, pageId);
  const blocked = diagnostics.filter((item) => item.status === "blocked");
  const review = diagnostics.filter((item) => item.status === "review");
  const score = Math.max(0, 100 - blocked.length * 24 - review.length * 10);
  const status: DataVizStatus = blocked.length
    ? "blocked"
    : review.length
      ? "review"
      : "ready";

  return {
    id: `data-report-${generatedAt.replace(/[^0-9a-z]/gi, "").slice(0, 14)}`,
    title: document.metadata?.templateSourceName ?? "Essence data report",
    generatedAt,
    publishReady: status === "ready" && score >= 80,
    status,
    score,
    diagnostics,
    pages: pages.map((page) => {
      const charts = getPageCharts(page);
      const tables = getPageTables(page);
      const brokenChartCount = charts.filter(
        (chart) => chart.dataSourceTableId && !getLinkedTable(chart, page.elements),
      ).length;

      return {
        id: page.id,
        name: page.name,
        chartCount: charts.length,
        tableCount: tables.length,
        linkedChartCount: charts.filter((chart) => chart.dataSourceTableId)
          .length,
        brokenChartCount,
      };
    }),
    charts: pages.flatMap((page) =>
      getPageCharts(page).map((chart) => ({
        id: chart.id,
        pageName: page.name,
        type: chart.chartType,
        linkedTableId: chart.dataSourceTableId ?? null,
        dataPoints: getLinkedChartData(chart, page.elements).length || chart.data.length,
      })),
    ),
    tables: pages.flatMap((page) =>
      getPageTables(page).map((table) => ({
        id: table.id,
        pageName: page.name,
        rows: table.rows,
        columns: table.columns,
        sourceKind: table.dataSourceKind ?? "manual",
        sourceStatus: table.dataSourceStatus ?? "manual",
        lastSyncedAt: table.dataSourceLastSyncedAt ?? null,
      })),
    ),
  };
}

function createPageCompositionDiagnostic(
  page: DesignPage,
  tables: TableElement[],
  charts: ChartElement[],
): DataRefreshDiagnostic {
  if (!tables.length && !charts.length) {
    return {
      id: `${page.id}:composition`,
      label: `${page.name} data composition`,
      status: "blocked",
      detail: "Add at least one table and chart before preparing a report.",
      targetId: page.id,
    };
  }

  if (!tables.length || !charts.length) {
    return {
      id: `${page.id}:composition`,
      label: `${page.name} data composition`,
      status: "review",
      detail: "Pair a source table with chart layers for a stronger report.",
      targetId: page.id,
    };
  }

  return {
    id: `${page.id}:composition`,
    label: `${page.name} data composition`,
    status: "ready",
    detail: `${tables.length} source table${tables.length === 1 ? "" : "s"} and ${charts.length} chart${charts.length === 1 ? "" : "s"} found.`,
    targetId: page.id,
  };
}

function createTableSourceDiagnostic(table: TableElement): DataRefreshDiagnostic {
  if (table.dataSourceStatus === "error") {
    return {
      id: `${table.id}:source`,
      label: "Table data source",
      status: "blocked",
      detail: table.dataSourceMessage || "The linked data source failed to refresh.",
      targetId: table.id,
    };
  }

  if (!table.dataSourceKind) {
    return {
      id: `${table.id}:source`,
      label: "Manual table data",
      status: "review",
      detail: "Manual data is usable, but reports are stronger with a refreshable source.",
      targetId: table.id,
    };
  }

  const lastSyncedAt = table.dataSourceLastSyncedAt
    ? Date.parse(table.dataSourceLastSyncedAt)
    : 0;
  const stale = lastSyncedAt ? ageInHours(lastSyncedAt) > 24 : true;

  return {
    id: `${table.id}:source`,
    label: "Refreshable table data",
    status: stale ? "review" : "ready",
    detail: stale
      ? "Refresh this source before publishing the report."
      : "The linked data source has a recent successful refresh.",
    targetId: table.id,
  };
}

function createChartSourceDiagnostic(
  chart: ChartElement,
  pageElements: DesignElement[],
): DataRefreshDiagnostic {
  if (!chart.dataSourceTableId) {
    return {
      id: `${chart.id}:source`,
      label: "Manual chart data",
      status: "review",
      detail: "Bind this chart to a table to keep report data traceable.",
      targetId: chart.id,
    };
  }

  const table = getLinkedTable(chart, pageElements);

  if (!table) {
    return {
      id: `${chart.id}:source`,
      label: "Broken chart source",
      status: "blocked",
      detail: "The linked source table is no longer on this page.",
      targetId: chart.id,
    };
  }

  const data = getLinkedChartData(chart, pageElements);

  if (!data.length) {
    return {
      id: `${chart.id}:source`,
      label: "Empty chart source",
      status: "blocked",
      detail: "Choose a numeric value column with usable rows.",
      targetId: chart.id,
    };
  }

  return {
    id: `${chart.id}:source`,
    label: "Linked chart source",
    status: "ready",
    detail: `${data.length} linked data point${data.length === 1 ? "" : "s"} ready.`,
    targetId: chart.id,
  };
}

function getReportPages(document: DesignDocument, pageId?: string | null) {
  if (!pageId) return document.pages;

  return document.pages.filter((page) => page.id === pageId);
}

function getPageTables(page: DesignPage) {
  return page.elements.filter(
    (element): element is TableElement => element.type === "table",
  );
}

function getPageCharts(page: DesignPage) {
  return page.elements.filter(
    (element): element is ChartElement => element.type === "chart",
  );
}

function ageInHours(timestamp: number) {
  const hour = 60 * 60 * 1000;

  return Math.floor((Date.now() - timestamp) / hour);
}
