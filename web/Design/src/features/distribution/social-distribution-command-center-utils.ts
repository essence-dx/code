import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type {
  SocialDistributionStatus,
  SocialPlatformId,
} from "@/features/distribution/social-distribution-command-center-types";

export type SocialPlatformSpec = {
  id: SocialPlatformId;
  label: string;
  channels: string[];
  width: number;
  height: number;
  targetLabel: string;
};

export type SocialCampaignDeliverableRef = {
  campaignId: string;
  campaignName: string;
  deliverable: CampaignBoardSummary["deliverables"][number];
  platform: SocialPlatformSpec;
};

export const socialPlatformSpecs: SocialPlatformSpec[] = [
  {
    id: "instagram",
    label: "Instagram",
    channels: ["Instagram", "Social"],
    width: 1080,
    height: 1080,
    targetLabel: "1080 x 1080 square",
  },
  {
    id: "tiktok",
    label: "TikTok",
    channels: ["TikTok"],
    width: 1080,
    height: 1920,
    targetLabel: "1080 x 1920 vertical",
  },
  {
    id: "youtube",
    label: "YouTube Shorts",
    channels: ["YouTube"],
    width: 1080,
    height: 1920,
    targetLabel: "1080 x 1920 vertical",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    channels: ["LinkedIn"],
    width: 1200,
    height: 627,
    targetLabel: "1200 x 627 feed",
  },
  {
    id: "pinterest",
    label: "Pinterest",
    channels: ["Pinterest"],
    width: 1000,
    height: 1500,
    targetLabel: "1000 x 1500 pin",
  },
  {
    id: "x",
    label: "X",
    channels: ["X"],
    width: 1600,
    height: 900,
    targetLabel: "1600 x 900 post",
  },
];

export function getSocialPlatformForChannel(channel: string) {
  return socialPlatformSpecs.find((platform) =>
    platform.channels.some(
      (candidate) => candidate.toLowerCase() === channel.toLowerCase(),
    ),
  );
}

export function getSocialScheduleItems(items: ContentScheduleSummary[]) {
  return items.filter((item) => getSocialPlatformForChannel(item.channel));
}

export function getSocialCampaignDeliverables(
  campaigns: CampaignBoardSummary[],
): SocialCampaignDeliverableRef[] {
  return campaigns.flatMap((campaign) =>
    campaign.deliverables.flatMap((deliverable) => {
      const platform = getSocialPlatformForChannel(deliverable.channel);

      if (!platform || !deliverable.projectId) return [];

      return [
        {
          campaignId: campaign.id,
          campaignName: campaign.name,
          deliverable,
          platform,
        },
      ];
    }),
  );
}

export function aggregateStatus(
  statuses: SocialDistributionStatus[],
): SocialDistributionStatus {
  if (!statuses.length) return "blocked";
  if (statuses.some((status) => status === "blocked")) return "blocked";
  if (statuses.some((status) => status === "review")) return "review";

  return "ready";
}

export function scoreStatus(status: SocialDistributionStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 68;

  return 32;
}

export function scoreToStatus(score: number): SocialDistributionStatus {
  if (score >= 82) return "ready";
  if (score >= 58) return "review";

  return "blocked";
}

export function average(values: number[], fallback = 0) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

export function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function normalizeDate(value: Date | string | undefined) {
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);

  return new Date();
}

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "social-post"
  );
}
