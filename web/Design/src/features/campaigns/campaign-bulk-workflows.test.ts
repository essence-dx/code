import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type {
  CampaignBoardSummary,
  CampaignDeliverableSummary,
} from "@/db/campaigns";
import {
  buildCampaignBulkScheduleEntries,
  buildCampaignDownloadManifest,
  createCampaignManifestCsv,
  mapCampaignChannelToPlannerChannel,
  normalizeCampaignScheduleCadenceDays,
} from "@/features/campaigns/campaign-bulk-workflows";

describe("campaign bulk workflows", () => {
  test("maps campaign channels to planner channels", () => {
    assert.equal(mapCampaignChannelToPlannerChannel("Website hero"), "Website");
    assert.equal(mapCampaignChannelToPlannerChannel("Email banner"), "Email");
    assert.equal(mapCampaignChannelToPlannerChannel("Vertical video"), "TikTok");
    assert.equal(mapCampaignChannelToPlannerChannel("Social square"), "Instagram");
  });

  test("builds spaced schedule entries from selected deliverables", () => {
    const entries = buildCampaignBulkScheduleEntries({
      campaignName: "Spring launch",
      startAt: new Date(2026, 4, 15, 10),
      cadenceDays: 2,
      caption: "Launch copy",
      deliverables: [
        {
          deliverableId: "deliverable-1",
          projectId: "project-1",
          projectName: "Hero post",
          role: "Hero",
          channel: "Social",
        },
        {
          deliverableId: "deliverable-2",
          projectId: "project-2",
          projectName: "Email header",
          role: "Email",
          channel: "Email",
        },
      ],
    });

    assert.equal(entries.length, 2);
    assert.equal(entries[0]?.title, "Spring launch - Hero post");
    assert.equal(entries[0]?.channel, "Instagram");
    assert.equal(entries[1]?.channel, "Email");
    assert.equal(entries[1]?.scheduledAt.getDate(), 17);
  });

  test("normalizes cadence and creates escaped download CSV", () => {
    const manifest = buildCampaignDownloadManifest({
      campaign: makeCampaign(),
      deliverables: [makeDeliverable()],
      exportedAt: new Date("2026-05-15T00:00:00.000Z"),
    });
    const csv = createCampaignManifestCsv(manifest);

    assert.equal(normalizeCampaignScheduleCadenceDays("bad"), 1);
    assert.equal(normalizeCampaignScheduleCadenceDays(40), 30);
    assert.equal(manifest.deliverables[0]?.editPath, "/editor/project-1");
    assert.match(csv, /"Project, with comma"/);
  });
});

function makeCampaign(): CampaignBoardSummary {
  return {
    id: "campaign-1",
    name: "Campaign",
    brief: "",
    goal: "",
    audience: "",
    status: "active",
    primaryBrandColor: null,
    brandLogoName: null,
    brandFontFamily: null,
    launchAt: null,
    deliverables: [],
    createdAt: "",
    updatedAt: "",
  };
}

function makeDeliverable(): CampaignDeliverableSummary {
  return {
    id: "deliverable-1",
    projectId: "project-1",
    projectName: "Project, with comma",
    projectThumbnail: "data:image/png;base64,abc",
    projectWidth: 1080,
    projectHeight: 1080,
    projectSourceProjectId: null,
    projectVariantProfileId: null,
    projectVariantName: null,
    role: "Hero",
    channel: "Social",
    status: "planned",
    approvalStatus: "draft",
    createdAt: "",
    updatedAt: "",
  };
}
