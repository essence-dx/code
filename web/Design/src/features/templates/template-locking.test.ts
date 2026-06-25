import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createTemplateCatalogDocument } from "@/features/templates/template-catalog-documents";
import { getTemplateCatalogItem } from "@/features/templates/template-catalog";
import { summarizeTemplateLocks } from "@/features/templates/template-locking";

describe("template locking", () => {
  test("locks structural template regions while keeping content editable", () => {
    const template = getTemplateCatalogItem("product-update-email");

    assert.ok(template);

    const document = createTemplateCatalogDocument(template);
    const summary = summarizeTemplateLocks(document);
    const firstPage = document.pages[0];

    assert.equal(document.metadata?.templateSourceId, template.id);
    assert.ok(summary.lockedElementCount > 0);
    assert.ok(summary.editableElementCount > 0);
    assert.ok(firstPage.elements.some((element) => element.type === "text" && !element.locked));
    assert.ok(firstPage.elements.some((element) => element.type === "shape" && element.locked));
  });

  test("records template lock summary metadata on generated documents", () => {
    const template = getTemplateCatalogItem("strategy-workshop-board");

    assert.ok(template);

    const document = createTemplateCatalogDocument(template);

    assert.equal(document.metadata?.templateSourceName, template.name);
    assert.equal(
      document.metadata?.templateLockSummary?.lockedElementCount,
      summarizeTemplateLocks(document).lockedElementCount,
    );
    assert.ok(document.metadata?.templateLockSummary?.rules.includes("Lock structural connectors"));
  });
});
