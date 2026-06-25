import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createWorkshopPackApplication,
  createWorkshopRecapSuggestion,
  createWorkshopSessionExport,
  getWorkshopFacilitationPack,
} from "@/features/editor/workshop-facilitation-packs";
import type { DesignElement, DesignPage } from "@/features/editor/types";

describe("workshop facilitation packs", () => {
  test("builds a reusable board with agenda and breakout metadata", () => {
    const page = createPage();
    const application = createWorkshopPackApplication(page, "design-sprint");

    assert.equal(application.sessionUpdates.facilitationPackId, "design-sprint");
    assert.equal(application.sessionUpdates.stage, "planning");
    assert.equal(application.sessionUpdates.votingOpen, true);
    assert.equal(application.sessionUpdates.agendaBlocks?.length, 4);
    assert.equal(application.sessionUpdates.breakoutSections?.length, 3);
    assert.ok(application.elements.some((element) => element.type === "timer"));
    assert.ok(
      application.elements.filter((element) => element.type === "sticky-note")
        .length >= 9,
    );
  });

  test("falls back to the design sprint pack for unknown ids", () => {
    const pack = getWorkshopFacilitationPack(null);

    assert.equal(pack.id, "design-sprint");
  });

  test("exports an actionable markdown session summary", () => {
    const application = createWorkshopPackApplication(createPage(), "retro");
    const stickyNote = application.elements.find(
      (element) => element.type === "sticky-note",
    );
    const page = createPage({
      workshopSession: {
        ...application.sessionUpdates,
        participantCount: 6,
        recapSummary: "Keep releases smaller and assign one owner per action.",
      },
      elements: stickyNote
        ? [
            {
              ...stickyNote,
              workshopVotes: 3,
              workshopReactions: { insight: 2 },
            },
          ]
        : [],
    });
    const exportArtifact = createWorkshopSessionExport(page);

    assert.equal(exportArtifact.fileName, "workshop-session-summary.md");
    assert.match(exportArtifact.markdown, /Pack: Team retro/);
    assert.match(exportArtifact.markdown, /Signals: 5 total/);
    assert.match(exportArtifact.markdown, /Keep releases smaller/);
  });

  test("suggests a recap from the highest-signal target", () => {
    const page = createPage({
      workshopSession: { facilitationPackId: "decision-room" },
      elements: [
        createSticky({
          id: "sticky-1",
          content: "Option B",
          workshopVotes: 4,
          workshopReactions: { question: 2 },
        }),
      ],
    });

    assert.match(createWorkshopRecapSuggestion(page), /Option B/);
    assert.match(createWorkshopRecapSuggestion(page), /6 total signals/);
  });
});

function createPage(overrides: Partial<DesignPage> = {}): DesignPage {
  return {
    id: "page-1",
    name: "Workshop",
    background: "#ffffff",
    width: 2400,
    height: 1350,
    elements: [],
    ...overrides,
  };
}

function createSticky(overrides: Partial<DesignElement> = {}): DesignElement {
  return {
    id: "sticky",
    type: "sticky-note",
    x: 0,
    y: 0,
    width: 180,
    height: 140,
    rotation: 0,
    opacity: 1,
    content: "Idea",
    fill: "#fef3c7",
    textColor: "#111827",
    accentColor: "#f59e0b",
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: 600,
    radius: 12,
    ...overrides,
  } as DesignElement;
}
