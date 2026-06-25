import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  getTemplateCollectionResult,
  getTemplateCollectionsForTemplate,
  searchTemplateCollections,
  templateCollections,
} from "@/features/templates/template-collections";

describe("template collections", () => {
  test("ships starter packs with resolvable catalog templates", () => {
    assert.ok(templateCollections.length >= 4);

    for (const collection of templateCollections) {
      const result = getTemplateCollectionResult(collection);

      assert.ok(result);
      assert.equal(result.templates.length, collection.templateIds.length);
      assert.ok(result.formats.length > 1);
    }
  });

  test("recommends collections by query and template metadata", () => {
    const results = searchTemplateCollections({ query: "launch" });

    assert.equal(results[0].collection.id, "launch-campaign-kit");
    assert.ok(
      results[0].templates.some(
        (template) => template.id === "product-landing-page",
      ),
    );
  });

  test("filters recommended collections by format", () => {
    const results = searchTemplateCollections({
      query: "client",
      format: "document",
    });

    assert.ok(results.length > 0);
    assert.ok(
      results.every((result) =>
        result.templates.some((template) => template.format === "document"),
      ),
    );
  });

  test("finds collections that contain a template", () => {
    const collections = getTemplateCollectionsForTemplate("product-update-email");

    assert.ok(collections.some((collection) => collection.id === "launch-campaign-kit"));
    assert.ok(collections.some((collection) => collection.id === "client-sales-kit"));
  });
});
