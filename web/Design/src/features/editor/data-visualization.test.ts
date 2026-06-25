import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createChartElement, createPage } from "@/features/editor/document-factory";
import {
  createDataRefreshDiagnostics,
  createDataReportHandoffBundle,
} from "@/features/editor/data-visualization-diagnostics";
import { createDataDashboardTemplateElements } from "@/features/editor/data-visualization-templates";
import { applyDataChartTheme } from "@/features/editor/data-visualization-themes";
import type {
  ChartElement,
  DesignDocument,
  TableElement,
} from "@/features/editor/types";

describe("data visualization workflows", () => {
  test("creates dashboard templates with linked charts and refreshable data", () => {
    const elements = createDataDashboardTemplateElements({
      templateId: "channel-performance",
      themeId: "growth",
      canvasWidth: 1200,
    });
    const tables = elements.filter(isTableElement);
    const charts = elements.filter(isChartElement);

    assert.equal(tables.length, 1);
    assert.equal(charts.length, 3);
    assert.ok(charts.every((chart) => chart.dataSourceTableId === tables[0]?.id));
    assert.ok(charts.every((chart) => chart.data.length > 0));
    assert.equal(tables[0]?.dataSourceStatus, "synced");
  });

  test("applies reusable chart themes to all data points", () => {
    const chart = createChartElement({
      data: [
        { label: "A", value: 10, color: "#000000" },
        { label: "B", value: 20, color: "#000000" },
      ],
    });
    const themed = applyDataChartTheme(chart, "contrast");

    assert.equal(themed.backgroundColor, "#111827");
    assert.equal(themed.textColor, "#f8fafc");
    assert.deepEqual(
      themed.data.map((point) => point.color),
      ["#f8fafc", "#38bdf8"],
    );
  });

  test("creates ready report handoff bundles from dashboard pages", () => {
    const document = createDocument(
      createDataDashboardTemplateElements({
        templateId: "executive-kpi",
        themeId: "executive",
      }),
    );
    const bundle = createDataReportHandoffBundle(
      document,
      document.activePageId,
      "2026-05-16T10:00:00.000Z",
    );

    assert.equal(bundle.status, "ready");
    assert.equal(bundle.publishReady, true);
    assert.equal(bundle.pages[0]?.chartCount, 3);
    assert.equal(bundle.pages[0]?.tableCount, 1);
    assert.equal(bundle.diagnostics.every((item) => item.status === "ready"), true);
  });

  test("blocks diagnostics when linked chart source is missing", () => {
    const document = createDocument([
      createChartElement({
        dataSourceTableId: "missing-table",
      }),
    ]);
    const diagnostics = createDataRefreshDiagnostics(
      document,
      document.activePageId,
    );

    assert.equal(
      diagnostics.some(
        (item) =>
          item.status === "blocked" && item.label === "Broken chart source",
      ),
      true,
    );
  });
});

function createDocument(elements: DesignDocument["pages"][number]["elements"]) {
  const page = createPage({
    name: "Report",
    width: 1200,
    height: 900,
    elements,
  });

  return {
    version: 1,
    width: 1200,
    height: 900,
    pages: [page],
    activePageId: page.id,
  } satisfies DesignDocument;
}

function isTableElement(element: unknown): element is TableElement {
  return Boolean(element && (element as TableElement).type === "table");
}

function isChartElement(element: unknown): element is ChartElement {
  return Boolean(element && (element as ChartElement).type === "chart");
}
