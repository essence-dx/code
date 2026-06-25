import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type {
  DesignElement,
  DesignPage,
  DesignPresetId,
  ProjectDetail,
} from "@/features/editor/types";
import {
  createMixedFormatProjectOrchestration,
  createMixedFormatWorkspaceOrchestration,
  inferVisualSuitePageType,
} from "@/features/visual-suite/mixed-format-orchestration";

describe("mixed format orchestration", () => {
  test("classifies pages across the visual suite", () => {
    const project = createProject({
      pages: [
        createPage({ format: "document", elements: [textElement()] }),
        createPage({ format: "spreadsheet", elements: [tableElement()] }),
        createPage({
          format: "website",
          websiteSeoTitle: "Launch",
          websiteSeoDescription: "Launch page",
          elements: [textElement()],
        }),
        createPage({ format: "video", elements: [videoElement()] }),
      ],
    });

    const pageTypes = project.document.pages.map((page) =>
      inferVisualSuitePageType({ page, project }),
    );

    assert.deepEqual(pageTypes, ["docs", "sheets", "websites", "videos"]);
  });

  test("scores mixed-format project readiness and actions", () => {
    const report = createMixedFormatProjectOrchestration(
      createProject({
        pages: [
          createPage({
            id: "doc",
            name: "Proposal",
            format: "document",
            elements: [textElement()],
            notes: "Client notes",
          }),
          createPage({
            id: "site",
            name: "Landing",
            format: "website",
            websiteSeoTitle: "Launch",
            websiteSeoDescription: "Launch page for campaign.",
            elements: [textElement()],
          }),
          createPage({
            id: "email",
            name: "Follow-up email",
            format: "email-template",
            elements: [textElement()],
          }),
        ],
      }),
    );

    assert.equal(report.isMixedFormat, true);
    assert.deepEqual(report.pageTypes, ["docs", "websites", "email"]);
    assert.equal(report.status, "ready");
    assert.equal(report.nextBestActions.length, 0);
  });

  test("surfaces suite coverage and single-format gaps", () => {
    const report = createMixedFormatWorkspaceOrchestration([
      createProject({
        pages: [
          createPage({
            format: "instagram-post",
            elements: [textElement()],
          }),
        ],
      }),
    ]);

    assert.equal(report.totals.projects, 1);
    assert.equal(report.totals.mixedFormatProjects, 0);
    assert.equal(
      report.suiteCoverage.find((item) => item.pageType === "social")
        ?.pageCount,
      1,
    );
    assert.equal(
      report.projects[0]?.nextBestActions.some((action) =>
        action.includes("second page type"),
      ),
      true,
    );
  });
});

function createProject(input: {
  pages: DesignPage[];
  width?: number;
  height?: number;
}): ProjectDetail {
  return {
    id: "project-1",
    name: "Campaign suite",
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
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
    document: {
      version: 1,
      width: input.width ?? 1080,
      height: input.height ?? 1080,
      activePageId: input.pages[0]?.id ?? "page-1",
      pages: input.pages,
    },
  };
}

function createPage(input: Partial<DesignPage> = {}): DesignPage {
  return {
    id: input.id ?? "page-1",
    name: input.name ?? "Page",
    background: input.background ?? "#ffffff",
    format: input.format as DesignPresetId | undefined,
    width: input.width,
    height: input.height,
    notes: input.notes,
    websiteSeoTitle: input.websiteSeoTitle,
    websiteSeoDescription: input.websiteSeoDescription,
    websiteNavLabel: input.websiteNavLabel,
    websiteNavGroup: input.websiteNavGroup,
    websiteHideFromNavigation: input.websiteHideFromNavigation,
    workshopSession: input.workshopSession,
    transition: input.transition,
    audienceInteraction: input.audienceInteraction,
    elements: input.elements ?? [],
  };
}

function textElement(): DesignElement {
  return {
    id: "text",
    type: "text",
    x: 0,
    y: 0,
    width: 200,
    height: 80,
    rotation: 0,
    opacity: 1,
    content: "Hello",
    fontSize: 24,
    fontFamily: "Inter",
    fontWeight: 600,
    color: "#111111",
    textAlign: "left",
    lineHeight: 1.2,
    letterSpacing: 0,
    textEffect: "none",
    textEffectColor: "#000000",
  } as DesignElement;
}

function tableElement(): DesignElement {
  return {
    id: "table",
    type: "table",
    x: 0,
    y: 0,
    width: 400,
    height: 240,
    rotation: 0,
    opacity: 1,
    rows: 1,
    columns: 2,
    cells: ["Metric", "Value"],
    fontSize: 14,
    fontFamily: "Inter",
    fontWeight: 500,
    textColor: "#111111",
    headerRow: true,
    headerFill: "#f8fafc",
    bodyFill: "#ffffff",
    borderColor: "#d1d5db",
    borderWidth: 1,
    cellPadding: 8,
  } as DesignElement;
}

function videoElement(): DesignElement {
  return {
    id: "video",
    type: "video",
    x: 0,
    y: 0,
    width: 360,
    height: 640,
    rotation: 0,
    opacity: 1,
    src: "video.mp4",
    title: "Clip",
    mimeType: "video/mp4",
    objectFit: "cover",
    showControls: true,
    muted: false,
    loop: false,
    autoplay: false,
    timelineStartSeconds: 0,
    timelineDurationSeconds: 10,
    trimStartSeconds: 0,
    trimEndSeconds: null,
    volume: 1,
    subtitleCues: [],
    transitionIn: "none",
    transitionOut: "none",
    transitionDurationSeconds: 0,
  } as DesignElement;
}
