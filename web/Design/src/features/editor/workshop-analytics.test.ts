import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { DesignElement, DesignPage } from "@/features/editor/types";
import {
  createClearWorkshopSignalsUpdate,
  createWorkshopReactionUpdate,
  createWorkshopSessionSummary,
  getWorkshopReactionCount,
  getWorkshopVoteCount,
  normalizeWorkshopSession,
} from "@/features/editor/workshop-analytics";

describe("workshop analytics", () => {
  test("normalizes facilitator session state", () => {
    const session = normalizeWorkshopSession({
      stage: "live",
      votingOpen: false,
      participantCount: 12.6,
      facilitatorNote: "Keep discussion on launch blockers.",
      spotlightElementId: "sticky_1",
    });

    assert.equal(session.stage, "live");
    assert.equal(session.votingOpen, false);
    assert.equal(session.reactionsOpen, true);
    assert.equal(session.participantCount, 13);
    assert.equal(session.spotlightElementId, "sticky_1");
    assert.equal(session.facilitationPackId, null);
    assert.deepEqual(session.agendaBlocks, []);
    assert.deepEqual(session.breakoutSections, []);
  });

  test("summarizes votes, reactions, quiet targets, and top targets", () => {
    const page = {
      id: "page_1",
      name: "Workshop",
      background: "#ffffff",
      workshopSession: { participantCount: 5 },
      elements: [
        createElement({
          id: "sticky_1",
          workshopVotes: 4,
          workshopReactions: { insight: 2, question: 1 },
        }),
        createElement({
          id: "sticky_2",
          workshopVotes: 1,
          workshopReactions: { concern: 2 },
        }),
        createElement({ id: "sticky_3" }),
      ],
    } satisfies DesignPage;

    const summary = createWorkshopSessionSummary(page);

    assert.equal(summary.totalVotes, 5);
    assert.equal(summary.totalReactions, 5);
    assert.equal(summary.totalSignals, 10);
    assert.equal(summary.averageSignalsPerParticipant, 2);
    assert.equal(summary.quietTargetCount, 1);
    assert.equal(summary.reactionTotals.insight, 2);
    assert.equal(summary.reactionTotals.question, 1);
    assert.equal(summary.reactionTotals.concern, 2);
    assert.equal(summary.topTargets[0]?.elementId, "sticky_1");
  });

  test("creates bounded signal updates for elements", () => {
    const element = createElement({
      workshopVotes: 3.2,
      workshopReactions: { insight: 1 },
    });
    const reactionUpdate = createWorkshopReactionUpdate(
      element,
      "insight",
      2,
    );
    const clearUpdate = createClearWorkshopSignalsUpdate();

    assert.equal(getWorkshopVoteCount(element), 3);
    assert.equal(getWorkshopReactionCount(element, "insight"), 1);
    assert.deepEqual(reactionUpdate.workshopReactions, {
      insight: 3,
      question: 0,
      concern: 0,
    });
    assert.deepEqual(clearUpdate, {
      workshopVotes: 0,
      workshopReactions: {
        insight: 0,
        question: 0,
        concern: 0,
      },
    });
  });
});

function createElement(input: Partial<DesignElement> = {}) {
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
    ...input,
  } as DesignElement;
}
