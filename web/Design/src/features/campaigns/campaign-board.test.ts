import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createCampaignBrandSnapshot,
  getCampaignDerivativeSource,
  getRecommendedCampaignDerivativeProfiles,
  inferCampaignDeliverableChannel,
} from "@/features/campaigns/campaign-board";

describe("campaign board helpers", () => {
  test("creates a brand snapshot from the selected brand kit", () => {
    const snapshot = createCampaignBrandSnapshot({
      requestedColor: "#2563EB",
      colors: [
        {
          id: "color-1",
          color: "#0f172a",
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "color-2",
          color: "#2563eb",
          createdAt: "",
          updatedAt: "",
        },
      ],
      logos: [
        {
          id: "logo-1",
          name: "Core mark",
          mimeType: "image/png",
          dataUrl: "",
          sizeBytes: 1,
          width: 100,
          height: 100,
          createdAt: "",
          updatedAt: "",
        },
      ],
      fonts: [
        {
          id: "font-1",
          role: "body",
          fontFamily: "Inter",
          fontSize: 16,
          fontWeight: 400,
          letterSpacing: 0,
          lineHeight: 1.4,
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "font-2",
          role: "heading",
          fontFamily: "Geist",
          fontSize: 48,
          fontWeight: 800,
          letterSpacing: 0,
          lineHeight: 1.1,
          createdAt: "",
          updatedAt: "",
        },
      ],
    });

    assert.deepEqual(snapshot, {
      primaryBrandColor: "#2563eb",
      brandLogoName: "Core mark",
      brandFontFamily: "Geist",
    });
  });

  test("infers readable deliverable channels from dimensions", () => {
    assert.equal(
      inferCampaignDeliverableChannel({ width: 1080, height: 1080 }),
      "Social",
    );
    assert.equal(
      inferCampaignDeliverableChannel({ width: 1920, height: 1080 }),
      "Presentation",
    );
    assert.equal(
      inferCampaignDeliverableChannel({ width: 1080, height: 1920 }),
      "Vertical video",
    );
    assert.equal(
      inferCampaignDeliverableChannel({
        width: 1440,
        height: 2200,
        variantName: "Website",
      }),
      "Website",
    );
  });

  test("chooses an original deliverable as the campaign derivative source", () => {
    const source = getCampaignDerivativeSource([
      {
        projectId: "story",
        projectSourceProjectId: "hero",
        projectVariantProfileId: "story-reel",
        projectWidth: 1080,
        projectHeight: 1920,
      },
      {
        projectId: "hero",
        projectSourceProjectId: null,
        projectVariantProfileId: null,
        projectWidth: 1200,
        projectHeight: 800,
      },
    ]);

    assert.equal(source?.projectId, "hero");
  });

  test("recommends missing derivative profiles without repeating linked variants", () => {
    const profiles = getRecommendedCampaignDerivativeProfiles({
      sourceProjectId: "hero",
      limit: 4,
      deliverables: [
        {
          projectId: "hero",
          projectSourceProjectId: null,
          projectVariantProfileId: null,
          projectWidth: 1200,
          projectHeight: 800,
        },
        {
          projectId: "story",
          projectSourceProjectId: "hero",
          projectVariantProfileId: "story-reel",
          projectWidth: 1080,
          projectHeight: 1920,
        },
        {
          projectId: "square",
          projectSourceProjectId: "hero",
          projectVariantProfileId: null,
          projectWidth: 1080,
          projectHeight: 1080,
        },
      ],
    });

    assert.deepEqual(
      profiles.map((profile) => profile.id),
      ["presentation-wide", "website-hero", "email-banner", "instagram-portrait"],
    );
  });
});
