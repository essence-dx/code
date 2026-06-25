import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type {
  DesignElement,
  DesignPage,
  ProjectDetail,
  ShapeElement,
  TextElement,
} from "@/features/editor/types";
import { createRuleBasedLayoutIntelligenceCenter } from "@/features/creation/rule-based-layout-intelligence";

describe("rule-based layout intelligence", () => {
  test("audits spacing, hierarchy, responsive suggestions, and one-click repairs", () => {
    const center = createRuleBasedLayoutIntelligenceCenter({
      projects: [
        createProject({
          id: "project-launch",
          name: "Launch social kit",
          pages: [
            createPage({
              id: "page-cramped",
              name: "Cramped launch post",
              elements: [
                textElement({
                  id: "eyebrow",
                  content: "Launch offer",
                  x: 48,
                  y: 34,
                  width: 360,
                  height: 34,
                  fontSize: 18,
                }),
                textElement({
                  id: "headline",
                  content: "Pocket Garden",
                  x: 46,
                  y: 64,
                  width: 560,
                  height: 72,
                  fontSize: 32,
                }),
                textElement({
                  id: "body",
                  content: "Reserve the guided balcony kit before Friday.",
                  x: 92,
                  y: 122,
                  width: 620,
                  height: 96,
                  fontSize: 40,
                }),
                shapeElement({
                  id: "cta",
                  x: 54,
                  y: 204,
                  width: 420,
                  height: 92,
                }),
              ],
            }),
          ],
        }),
        createProject({
          id: "project-ready",
          name: "Clean launch story",
          pages: [
            createPage({
              id: "page-ready",
              name: "Ready story",
              width: 1080,
              height: 1920,
              elements: [
                textElement({
                  id: "ready-headline",
                  content: "Pocket Garden",
                  x: 96,
                  y: 180,
                  width: 760,
                  height: 112,
                  fontSize: 56,
                }),
                textElement({
                  id: "ready-body",
                  content: "Grow a calmer balcony with a guided starter kit.",
                  x: 96,
                  y: 340,
                  width: 720,
                  height: 120,
                  fontSize: 26,
                }),
                shapeElement({
                  id: "ready-cta",
                  x: 96,
                  y: 520,
                  width: 420,
                  height: 96,
                }),
              ],
            }),
          ],
        }),
      ],
      now: "2026-05-19T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.projects, 2);
    assert.equal(center.totals.pages, 2);
    assert.equal(center.totals.spacingAudits, 4);
    assert.equal(center.totals.hierarchyChecks, 2);
    assert.equal(center.totals.responsiveSuggestions, 4);
    assert.equal(center.totals.repairPlans, 3);

    const launch = center.projectReports.find(
      (project) => project.projectId === "project-launch",
    );
    assert.equal(launch?.status, "blocked");
    assert.ok(launch?.nextAction.includes("Apply"));

    const crampedSpacing = center.spacingAudits.find(
      (audit) =>
        audit.pageId === "page-cramped" && audit.issue === "cramped-spacing",
    );
    assert.equal(crampedSpacing?.status, "blocked");
    assert.ok(crampedSpacing?.elementIds.includes("headline"));
    assert.ok(crampedSpacing?.elementIds.includes("body"));

    const hierarchy = center.hierarchyChecks.find(
      (check) => check.pageId === "page-cramped",
    );
    assert.equal(hierarchy?.status, "blocked");
    assert.equal(hierarchy?.issue, "body-outsizes-heading");

    const storySuggestion = center.responsiveSuggestions.find(
      (suggestion) =>
        suggestion.pageId === "page-cramped" &&
        suggestion.targetFormatId === "mobile-story",
    );
    assert.equal(storySuggestion?.status, "review");
    assert.ok(storySuggestion?.steps.some((step) => step.includes("Scale")));

    const repair = center.repairPlans.find(
      (plan) => plan.pageId === "page-cramped",
    );
    assert.equal(repair?.status, "blocked");
    assert.ok(
      repair?.operations.some(
        (operation) => operation.kind === "distribute-vertical-spacing",
      ),
    );
    assert.ok(
      repair?.operations.some(
        (operation) => operation.kind === "restore-text-hierarchy",
      ),
    );

    const packet = decodePacket(repair?.dataUrl ?? "");
    assert.equal(packet.kind, "essence-studio.rule-based-layout-intelligence");
    assert.equal(packet.repairPlanId, repair?.id);
    assert.ok(packet.operations.length >= 2);

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
    repairPlanId: string;
    operations: unknown[];
  };
}

function createProject(input: {
  id: string;
  name: string;
  pages: DesignPage[];
  width?: number;
  height?: number;
}): ProjectDetail {
  return {
    id: input.id,
    name: input.name,
    width: input.width ?? 1080,
    height: input.height ?? 1080,
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
      width: input.width ?? 1080,
      height: input.height ?? 1080,
      activePageId: input.pages[0]?.id ?? "page-1",
      pages: input.pages,
    },
  };
}

function createPage(input: {
  id: string;
  name: string;
  elements: DesignElement[];
  width?: number;
  height?: number;
}): DesignPage {
  return {
    id: input.id,
    name: input.name,
    background: "#ffffff",
    format: "instagram-post",
    width: input.width ?? 1080,
    height: input.height ?? 1080,
    elements: input.elements,
  };
}

function textElement(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: "text",
    type: "text",
    x: 80,
    y: 80,
    width: 480,
    height: 80,
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

function shapeElement(overrides: Partial<ShapeElement> = {}): ShapeElement {
  return {
    id: "shape",
    type: "shape",
    x: 80,
    y: 200,
    width: 320,
    height: 80,
    rotation: 0,
    opacity: 1,
    shape: "rectangle",
    fill: "#111827",
    stroke: "#111827",
    strokeWidth: 0,
    radius: 20,
    ...overrides,
  };
}
