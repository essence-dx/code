import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { getTemplateCatalogItem } from "@/features/templates/template-catalog";
import {
  createRemixedTemplateCatalogDocument,
  createRemixedTemplateCatalogItem,
  createTemplateRemixOptions,
  normalizeTemplateRemixInput,
} from "@/features/templates/template-remix";

describe("template remix workflows", () => {
  test("creates lock-safe remix options for catalog starters", () => {
    const template = getTemplateCatalogItem("social-launch-announcement");

    assert.ok(template);

    const options = createTemplateRemixOptions(template);

    assert.equal(options.length, 4);
    assert.ok(
      options.every(
        (option) =>
          option.lockSummary &&
          option.lockSummary.lockedElementCount > 0 &&
          option.lockSummary.editableElementCount > 0,
      ),
    );
  });

  test("swaps format, theme, and content slots while preserving locks", () => {
    const template = getTemplateCatalogItem("social-launch-announcement");

    assert.ok(template);

    const remixedItem = createRemixedTemplateCatalogItem(template, {
      profileId: "presentation-16x9",
      themeId: "calm-system",
      contentPackId: "report",
    });
    const document = createRemixedTemplateCatalogDocument(template, {
      profileId: "presentation-16x9",
      themeId: "calm-system",
      contentPackId: "report",
    });

    assert.equal(remixedItem.format, "presentation");
    assert.equal(document.width, 1920);
    assert.equal(document.height, 1080);
    assert.equal(document.metadata?.templateSourceId, template.id);
    assert.equal(document.metadata?.templateRemixProfileId, "presentation-16x9");
    assert.equal(document.metadata?.templateRemixThemeId, "calm-system");
    assert.equal(document.metadata?.templateRemixContentPackId, "report");
    assert.ok(document.metadata?.templateLockSummary?.lockedElementCount);
    assert.ok(
      document.pages.some((page) =>
        page.elements.some(
          (element) =>
            element.type === "text" &&
            element.content.includes("Turn findings into decisions") &&
            !element.locked,
        ),
      ),
    );
  });

  test("falls back to a safe default for invalid remix form input", () => {
    const normalized = normalizeTemplateRemixInput({
      profileId: "not-real",
      themeId: "",
      contentPackId: null,
    });

    assert.deepEqual(normalized, {
      profileId: "same-format-refresh",
      themeId: "fresh-campaign",
      contentPackId: "launch",
    });
  });
});
