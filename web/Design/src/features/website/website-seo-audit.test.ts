import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createWebsiteSeoAudit } from "@/features/website/website-seo-audit";

describe("website SEO audit", () => {
  test("scores complete publish metadata", () => {
    const audit = createWebsiteSeoAudit({
      projectName: "Spring Campaign",
      title: "Spring Campaign",
      seoTitle: "Spring Campaign Landing Page",
      seoDescription:
        "Browse the new spring campaign, compare offers, book a consultation, and explore the newest product stories.",
      slug: "spring-campaign",
    });

    assert.equal(audit.score, audit.total);
  });

  test("warns on missing metadata and unreadable slugs", () => {
    const audit = createWebsiteSeoAudit({
      projectName: "",
      title: "",
      seoTitle: "Short",
      seoDescription: "Too short.",
      slug: "Spring Campaign!",
    });

    assert.equal(audit.score, 0);
    assert.deepEqual(
      audit.items.map((item) => item.status),
      ["warning", "warning", "warning", "warning", "warning"],
    );
  });
});
