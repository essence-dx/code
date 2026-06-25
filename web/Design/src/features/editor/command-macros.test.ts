import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  applyEditorCommandMacro,
  createCommandAutomationQaIssues,
} from "@/features/editor/command-macros";
import {
  createImageElement,
  createPage,
  createShapeElement,
  createTextElement,
} from "@/features/editor/document-factory";
import type { DesignDocument } from "@/features/editor/types";

describe("editor command macros", () => {
  test("tidies selected layer geometry and records the macro run", () => {
    const shape = createShapeElement({
      x: 10.2,
      y: 13.8,
      width: 99.3,
      height: 51.1,
      rotation: 370,
      opacity: 1.4,
    });
    const document = createDocument({ elements: [shape] });
    const result = applyEditorCommandMacro(document, "tidy-selected-layers", {
      selectedElementIds: [shape.id],
      now: "2026-05-16T09:00:00.000Z",
    });
    const updated = result.document.pages[0].elements[0];

    assert.equal(updated.x, 12);
    assert.equal(updated.y, 12);
    assert.equal(updated.width, 100);
    assert.equal(updated.height, 52);
    assert.equal(updated.rotation, 10);
    assert.equal(updated.opacity, 1);
    assert.deepEqual(result.selectedElementIds, [shape.id]);
    assert.equal(
      result.document.metadata?.commandAutomation?.runs[0]?.macroId,
      "tidy-selected-layers",
    );
  });

  test("prepares export pages by clamping layers and adding image alt text", () => {
    const image = createImageElement({
      src: "data:image/png;base64,AAAA",
      alt: "",
      x: -24,
      y: 120,
      width: 360,
      height: 280,
    });
    const document = createDocument({
      background: "transparent",
      elements: [image],
    });
    const result = applyEditorCommandMacro(document, "prepare-export", {
      now: "2026-05-16T09:10:00.000Z",
    });
    const page = result.document.pages[0];
    const updated = page.elements[0];

    assert.equal(page.background, "#ffffff");
    assert.equal(updated.x, 0);
    assert.equal(updated.type, "image");
    assert.equal(updated.alt, "Landing image 1");
    assert.equal(result.changedElementIds.includes(image.id), true);
  });

  test("creates publishing metadata without overwriting existing page copy", () => {
    const document = createDocument({
      notes: "Launch page for paid social and partner traffic.",
      websiteSeoTitle: "Existing SEO title",
      elements: [createTextElement({ content: "Launch" })],
    });
    const result = applyEditorCommandMacro(document, "setup-publishing", {
      projectName: "Spring Campaign",
      now: "2026-05-16T09:20:00.000Z",
    });
    const page = result.document.pages[0];

    assert.equal(page.websiteSeoTitle, "Existing SEO title");
    assert.equal(
      page.websiteSeoDescription,
      "Launch page for paid social and partner traffic.",
    );
    assert.equal(page.websiteNavLabel, "Landing");
    assert.equal(page.websiteHideFromNavigation, false);
  });

  test("reports production QA issues and selects the first layer issue", () => {
    const image = createImageElement({
      src: "data:image/png;base64,AAAA",
      alt: "",
      x: 900,
      y: 500,
      width: 260,
      height: 180,
    });
    const text = createTextElement({ content: "", fontSize: 8 });
    const document = createDocument({
      format: "website",
      elements: [image, text],
    });
    const issues = createCommandAutomationQaIssues(document);
    const result = applyEditorCommandMacro(document, "run-qa-checks", {
      now: "2026-05-16T09:30:00.000Z",
    });

    assert.ok(issues.length >= 4);
    assert.deepEqual(result.selectedElementIds, [image.id]);
    assert.equal(
      result.document.metadata?.commandAutomation?.qaIssues.length,
      issues.length,
    );
  });
});

function createDocument(
  pageOverrides: Parameters<typeof createPage>[0] = {},
): DesignDocument {
  const page = createPage({
    name: "Landing",
    width: 960,
    height: 540,
    ...pageOverrides,
  });

  return {
    version: 1,
    width: 960,
    height: 540,
    pages: [page],
    activePageId: page.id,
  };
}
