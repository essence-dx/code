import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createFirstPartyTemplateLibraryExpansion,
  templateCatalogItems,
} from "@/features/templates/first-party-template-library-expansion";

describe("first-party template library expansion", () => {
  test("builds larger industry packs from original catalog templates", () => {
    const expansion = createFirstPartyTemplateLibraryExpansion();

    assert.equal(expansion.status, "ready");
    assert.ok(expansion.totals.catalogTemplates >= 24);
    assert.ok(expansion.totals.industryPacks >= 8);
    assert.ok(expansion.totals.readyPacks >= 4);
    assert.ok(expansion.totals.componentSystems >= 12);
    assert.ok(expansion.totals.curationLanes >= expansion.totals.industryPacks);
    assert.equal(expansion.totals.provenanceReadyPercent, 100);
    assert.ok(
      expansion.libraryPacket.dataUrl.startsWith("data:application/json"),
    );
  });

  test("routes thin packs through QA and marketplace curation workflows", () => {
    const thinCatalog = templateCatalogItems.filter(
      (template) => template.industry !== "Food and beverage",
    );
    const expansion = createFirstPartyTemplateLibraryExpansion(thinCatalog);
    const foodPack = expansion.industryPacks.find(
      (pack) => pack.industry === "Food and beverage",
    );

    assert.equal(foodPack?.status, "blocked");
    assert.equal(
      foodPack?.qaGates.some(
        (gate) => gate.id === "format-coverage" && gate.status === "blocked",
      ),
      true,
    );
    assert.equal(
      foodPack?.curationWorkflow.lanes.some(
        (lane) =>
          lane.id === "backfill-formats" &&
          lane.status === "blocked" &&
          lane.actions.some((action) => action.includes("Food and beverage")),
      ),
      true,
    );
    assert.ok(expansion.nextActions[0]?.includes("Food and beverage"));
  });
});
