import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createTemplateCatalogDiscovery,
  getTemplateCatalogFilterOptions,
  getRelatedTemplateCatalogItems,
  getTemplateCatalogItem,
  searchTemplateCatalog,
  templateCatalogItems,
} from "@/features/templates/template-catalog";
import { createTemplateCatalogDocument } from "@/features/templates/template-catalog-documents";

describe("template catalog", () => {
  test("ships unique starter templates across major Canva-style formats", () => {
    const ids = new Set(templateCatalogItems.map((item) => item.id));
    const formats = new Set(templateCatalogItems.map((item) => item.format));

    assert.equal(ids.size, templateCatalogItems.length);
    assert.ok(formats.has("instagram-post"));
    assert.ok(formats.has("presentation"));
    assert.ok(formats.has("document"));
    assert.ok(formats.has("whiteboard"));
    assert.ok(formats.has("website"));
    assert.ok(formats.has("email-template"));
    assert.ok(formats.has("video"));
  });

  test("filters starters by query, format, and category metadata", () => {
    const results = searchTemplateCatalog({
      query: "landing",
      format: "website",
      category: "Website",
      industry: "SaaS",
      season: "Evergreen",
      platform: "Website",
    });

    assert.deepEqual(
      results.map((item) => item.id),
      ["product-landing-page"],
    );
  });

  test("exposes stable filter options for the gallery", () => {
    const options = getTemplateCatalogFilterOptions();

    assert.ok(options.categories.includes("Marketing"));
    assert.ok(options.formats.includes("presentation"));
    assert.ok(options.seasons.includes("Back to school"));
    assert.ok(options.platforms.includes("Email"));
  });

  test("summarizes discovery facets and original asset provenance", () => {
    const discovery = createTemplateCatalogDiscovery();

    assert.equal(discovery.totals.templates, templateCatalogItems.length);
    assert.ok(discovery.totals.formats >= 7);
    assert.equal(discovery.provenance.missingNotes, 0);
    assert.equal(discovery.provenance.readyPercent, 100);
    assert.ok(
      discovery.recommendedFacets.some((facet) => facet.label === "Evergreen"),
    );
  });

  test("finds related starters from matching metadata", () => {
    const related = getRelatedTemplateCatalogItems("product-landing-page", 3);

    assert.ok(related.length > 0);
    assert.ok(
      related.some(
        (item) =>
          item.category === "Website" ||
          item.industry === "SaaS" ||
          item.tags.some((tag) => tag === "website"),
      ),
    );
  });

  test("creates editable documents from catalog starters", () => {
    const website = getTemplateCatalogItem("product-landing-page");

    assert.ok(website);

    const document = createTemplateCatalogDocument(website);

    assert.equal(document.width, website.width);
    assert.equal(document.height, website.height);
    assert.equal(document.pages.length, 3);
    assert.ok(document.pages.some((page) => page.elements.length > 0));
  });

  test("applies brand-safe template locks to catalog documents", () => {
    const template = getTemplateCatalogItem("social-launch-announcement");

    assert.ok(template);

    const document = createTemplateCatalogDocument(template);

    assert.equal(document.metadata?.templateSourceId, template.id);
    assert.ok(document.metadata?.templateLockSummary);
    assert.ok(document.pages[0].elements.some((element) => element.locked));
    assert.ok(
      document.pages[0].elements.some(
        (element) => element.type === "text" && !element.locked,
      ),
    );
  });
});
