import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createPrintPreflightReport } from "@/features/editor/print-preflight";
import type { DesignDocument, DesignPage } from "@/features/editor/types";

describe("print preflight", () => {
  test("passes a 300 DPI business card with centered printable content", () => {
    const page = createPrintPage({
      format: "business-card",
      width: 1050,
      height: 600,
      elements: [
        {
          id: "headline",
          type: "text",
          content: "Essence",
          x: 240,
          y: 200,
          width: 560,
          height: 120,
          rotation: 0,
          opacity: 1,
          fontSize: 72,
          fontFamily: "Geist",
          fontWeight: 800,
          color: "#111827",
          textAlign: "center",
          letterSpacing: 0,
          lineHeight: 1,
        },
      ],
    });

    const report = createPrintPreflightReport({
      document: createDocument(page),
      page,
    });

    assert.equal(report.status, "pass");
    assert.equal(report.estimatedDpi, 300);
    assert.equal(report.score, 100);
  });

  test("warns when visible layers sit inside the safe margin", () => {
    const page = createPrintPage({
      width: 1050,
      height: 600,
      elements: [
        {
          id: "edge-copy",
          type: "text",
          content: "Too close",
          x: 10,
          y: 20,
          width: 200,
          height: 80,
          rotation: 0,
          opacity: 1,
          fontSize: 36,
          fontFamily: "Geist",
          fontWeight: 700,
          color: "#111827",
          textAlign: "left",
          letterSpacing: 0,
          lineHeight: 1,
        },
      ],
    });

    const report = createPrintPreflightReport({
      document: createDocument(page),
      page,
    });

    assert.equal(
      report.checks.find((check) => check.id === "safe-area")?.status,
      "warning",
    );
  });

  test("fails empty transparent pages for export readiness", () => {
    const page = createPrintPage({
      background: "transparent",
      elements: [],
    });

    const report = createPrintPreflightReport({
      document: createDocument(page),
      page,
    });

    assert.equal(report.status, "fail");
    assert.equal(
      report.checks.find((check) => check.id === "background")?.status,
      "warning",
    );
    assert.equal(
      report.checks.find((check) => check.id === "export")?.status,
      "fail",
    );
  });
});

function createPrintPage(overrides: Partial<DesignPage> = {}): DesignPage {
  return {
    id: "page-1",
    name: "Page 1",
    background: "#ffffff",
    width: 1050,
    height: 600,
    elements: [],
    ...overrides,
  };
}

function createDocument(page: DesignPage): DesignDocument {
  return {
    version: 1,
    width: page.width ?? 1050,
    height: page.height ?? 600,
    pages: [page],
    activePageId: page.id,
  };
}
