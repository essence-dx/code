import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type {
  BrandFontSummary,
  DesignElement,
  DesignPage,
  ProjectDetail,
  TextElement,
} from "@/features/editor/types";
import { createProfessionalTypographySystemCenter } from "@/features/creation/professional-typography-system";

describe("professional typography system", () => {
  test("builds type scales, font pairing guidance, readability checks, and brand-safe repair packets", () => {
    const center = createProfessionalTypographySystemCenter({
      brandFonts: [
        createBrandFont({
          role: "heading",
          fontFamily: "Fraunces",
          fontSize: 48,
          fontWeight: 800,
        }),
        createBrandFont({
          role: "body",
          fontFamily: "Inter",
          fontSize: 18,
          fontWeight: 450,
        }),
        createBrandFont({
          role: "caption",
          fontFamily: "Inter",
          fontSize: 13,
          fontWeight: 500,
        }),
      ],
      projects: [
        createProject({
          id: "project-promo",
          name: "Spring promo",
          pages: [
            createPage({
              id: "page-promo",
              name: "Promo post",
              elements: [
                textElement({
                  id: "headline",
                  content: "New seasonal launch",
                  fontFamily: "Comic Sans MS",
                  fontSize: 38,
                  fontWeight: 700,
                  color: "#111827",
                  width: 680,
                }),
                textElement({
                  id: "body",
                  content:
                    "A warm launch message for customers who need a clear reason to preorder the kit today.",
                  fontFamily: "Arial",
                  fontSize: 11,
                  fontWeight: 400,
                  color: "#6b7280",
                  width: 760,
                  y: 170,
                }),
                textElement({
                  id: "caption",
                  content: "Preorders close Friday",
                  fontFamily: "Times New Roman",
                  fontSize: 9,
                  fontWeight: 400,
                  color: "#f8fafc",
                  width: 360,
                  y: 260,
                }),
              ],
            }),
          ],
        }),
        createProject({
          id: "project-ready",
          name: "Brand story",
          pages: [
            createPage({
              id: "page-ready",
              name: "Ready story",
              elements: [
                textElement({
                  id: "ready-heading",
                  content: "Pocket Garden",
                  fontFamily: "Fraunces",
                  fontSize: 48,
                  fontWeight: 800,
                  color: "#111827",
                }),
                textElement({
                  id: "ready-body",
                  content: "Grow a calmer balcony with a guided starter kit.",
                  fontFamily: "Inter",
                  fontSize: 18,
                  fontWeight: 450,
                  color: "#111827",
                  y: 170,
                }),
              ],
            }),
          ],
        }),
      ],
      now: "2026-05-19T12:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.projects, 2);
    assert.equal(center.totals.pages, 2);
    assert.equal(center.totals.typeScaleTokens, 5);
    assert.equal(center.totals.fontPairings, 1);
    assert.equal(center.totals.readabilityChecks, 5);
    assert.equal(center.totals.repairPackets, 1);

    const headingToken = center.typeScale.tokens.find(
      (token) => token.role === "heading",
    );
    assert.equal(headingToken?.fontFamily, "Fraunces");
    assert.equal(headingToken?.source, "brand");

    const subheadingToken = center.typeScale.tokens.find(
      (token) => token.role === "subheading",
    );
    assert.equal(subheadingToken?.source, "derived");

    const pairing = center.fontPairings[0];
    assert.equal(pairing.status, "ready");
    assert.equal(pairing.headingFontFamily, "Fraunces");
    assert.equal(pairing.bodyFontFamily, "Inter");

    const captionContrast = center.readabilityChecks.find(
      (check) => check.elementId === "caption" && check.issue === "contrast",
    );
    assert.equal(captionContrast?.status, "blocked");
    assert.ok(captionContrast?.detail.includes("contrast"));

    const bodySize = center.readabilityChecks.find(
      (check) => check.elementId === "body" && check.issue === "small-text",
    );
    assert.equal(bodySize?.status, "review");

    const promo = center.projectReports.find(
      (project) => project.projectId === "project-promo",
    );
    assert.equal(promo?.status, "blocked");
    assert.ok(promo?.nextAction.includes("Apply"));

    const packet = center.repairPackets.find(
      (repair) => repair.projectId === "project-promo",
    );
    assert.equal(packet?.status, "blocked");
    assert.ok(
      packet?.operations.some(
        (operation) => operation.kind === "apply-brand-type-scale",
      ),
    );
    assert.ok(
      packet?.operations.some(
        (operation) => operation.kind === "improve-readability",
      ),
    );

    const decoded = decodePacket(packet?.dataUrl ?? "");
    assert.equal(decoded.kind, "essence-studio.professional-typography-system");
    assert.equal(decoded.repairPacketId, packet?.id);
    assert.ok(decoded.operations.length >= 2);

    const ready = center.projectReports.find(
      (project) => project.projectId === "project-ready",
    );
    assert.equal(ready?.status, "ready");
  });
});

function decodePacket(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    repairPacketId: string;
    operations: unknown[];
  };
}

function createProject(input: {
  id: string;
  name: string;
  pages: DesignPage[];
}): ProjectDetail {
  return {
    id: input.id,
    name: input.name,
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: null,
    editSharePermission: "edit",
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-19T10:00:00.000Z",
    document: {
      version: 1,
      width: 1080,
      height: 1080,
      activePageId: input.pages[0]?.id ?? "page-1",
      pages: input.pages,
    },
  };
}

function createPage(input: {
  id: string;
  name: string;
  elements: DesignElement[];
}): DesignPage {
  return {
    id: input.id,
    name: input.name,
    background: "#ffffff",
    format: "instagram-post",
    width: 1080,
    height: 1080,
    elements: input.elements,
  };
}

function textElement(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: "text",
    type: "text",
    x: 80,
    y: 80,
    width: 560,
    height: 96,
    rotation: 0,
    opacity: 1,
    content: "Text",
    fontSize: 32,
    fontFamily: "Inter",
    fontWeight: 700,
    color: "#111827",
    textAlign: "left",
    letterSpacing: 0,
    lineHeight: 1.2,
    ...overrides,
  };
}

function createBrandFont(
  overrides: Partial<BrandFontSummary> = {},
): BrandFontSummary {
  const role = overrides.role ?? "body";

  return {
    id: `font-${role}`,
    role,
    fontFamily: "Inter",
    fontSize: 18,
    fontWeight: 500,
    letterSpacing: 0,
    lineHeight: 1.3,
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-19T10:00:00.000Z",
    ...overrides,
  };
}
