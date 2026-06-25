import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type {
  WebsiteFormSubmissionSummary,
  WebsitePublishSummary,
} from "@/db/website-publishing";
import type { ProjectSummary } from "@/features/editor/types";
import {
  createPublishingAnalyticsWorkspace,
  type PublishingAnalyticsWorkspace,
} from "@/features/publishing/publishing-analytics-workspace";

export type PublishingChannelId = "social" | "website" | "email" | "campaign";

export type PublishingChannelStatus = "ready" | "attention" | "blocked";

export type PublishingChannelPreset = {
  id: string;
  channelId: PublishingChannelId;
  name: string;
  plannerChannel: string;
  cadence: string;
  captionPrompt: string;
  analyticsFocus: string;
};

export type PublishingChannelCheck = {
  id: string;
  label: string;
  status: PublishingChannelStatus;
  score: number;
  detail: string;
};

export type PublishingChannelQueueItem = {
  id: string;
  title: string;
  detail: string;
  status: string;
  scheduledAt: string | null;
};

export type PublishingChannelRollup = {
  id: PublishingChannelId;
  name: string;
  description: string;
  status: PublishingChannelStatus;
  score: number;
  presets: PublishingChannelPreset[];
  checks: PublishingChannelCheck[];
  queue: PublishingChannelQueueItem[];
  analytics: {
    planned: number;
    published: number;
    cancelled: number;
    deliverables: number;
    campaigns: number;
    views: number;
    clicks: number;
    submissions: number;
    conversionRate: number;
  };
};

export type PublishingChannelTotals = {
  channels: number;
  planned: number;
  published: number;
  deliverables: number;
  views: number;
  clicks: number;
  submissions: number;
};

export type PublishingChannelCenter = {
  status: PublishingChannelStatus;
  score: number;
  channels: PublishingChannelRollup[];
  presets: PublishingChannelPreset[];
  nextActions: string[];
  totals: PublishingChannelTotals;
  analyticsWorkspace: PublishingAnalyticsWorkspace;
};

const socialPlannerChannels = new Set([
  "Instagram",
  "TikTok",
  "YouTube",
  "LinkedIn",
  "Pinterest",
  "X",
]);

const publishingChannelPresets: PublishingChannelPreset[] = [
  {
    id: "social-launch-stack",
    channelId: "social",
    name: "Social launch stack",
    plannerChannel: "Instagram",
    cadence: "Daily launch posts with short caption variants.",
    captionPrompt: "Hook, offer, proof, and one direct call to action.",
    analyticsFocus: "Published ratio and active social queue coverage.",
  },
  {
    id: "website-release",
    channelId: "website",
    name: "Website release",
    plannerChannel: "Website",
    cadence: "Publish once, then review traffic and form responses weekly.",
    captionPrompt: "SEO title, description, domain state, and section links.",
    analyticsFocus: "Views, clicks, form submissions, and domain readiness.",
  },
  {
    id: "email-newsletter",
    channelId: "email",
    name: "Email newsletter",
    plannerChannel: "Email",
    cadence: "One test send before each scheduled audience send.",
    captionPrompt: "Subject, preview text, primary offer, and footer context.",
    analyticsFocus: "Planned email sends and ready email-format designs.",
  },
  {
    id: "campaign-rollout",
    channelId: "campaign",
    name: "Campaign rollout",
    plannerChannel: "Website",
    cadence: "Schedule deliverables from the campaign launch date.",
    captionPrompt: "Brief, audience, channel mapping, and approval notes.",
    analyticsFocus: "Deliverable readiness, approvals, and scheduled coverage.",
  },
];

export function createPublishingChannelCenter(input: {
  projects: ProjectSummary[];
  contentScheduleItems: ContentScheduleSummary[];
  campaigns: CampaignBoardSummary[];
  websitePublishes: WebsitePublishSummary[];
  websiteFormSubmissions: WebsiteFormSubmissionSummary[];
}): PublishingChannelCenter {
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const channels = [
    createSocialRollup(input),
    createWebsiteRollup(input),
    createEmailRollup({ ...input, activeProjects }),
    createCampaignRollup(input),
  ];
  const score = Math.round(
    channels.reduce((total, channel) => total + channel.score, 0) /
      channels.length,
  );
  const totals: PublishingChannelTotals = {
    channels: channels.length,
    planned: channels.reduce(
      (total, channel) => total + channel.analytics.planned,
      0,
    ),
    published: channels.reduce(
      (total, channel) => total + channel.analytics.published,
      0,
    ),
    deliverables: channels.reduce(
      (total, channel) => total + channel.analytics.deliverables,
      0,
    ),
    views: sumWebsiteViews(input.websitePublishes),
    clicks: sumWebsiteClicks(input.websitePublishes),
    submissions: input.websiteFormSubmissions.length,
  };

  return {
    status: scoreToStatus(score),
    score,
    channels,
    presets: publishingChannelPresets,
    nextActions: createNextActions(channels),
    totals,
    analyticsWorkspace: createPublishingAnalyticsWorkspace({
      channels,
      totals,
      projects: activeProjects,
      contentScheduleItems: input.contentScheduleItems,
      campaigns: input.campaigns,
      websitePublishes: input.websitePublishes,
      websiteFormSubmissions: input.websiteFormSubmissions,
    }),
  };
}

function createSocialRollup(input: {
  contentScheduleItems: ContentScheduleSummary[];
  campaigns: CampaignBoardSummary[];
}): PublishingChannelRollup {
  const plannerItems = input.contentScheduleItems.filter((item) =>
    socialPlannerChannels.has(item.channel),
  );
  const deliverables = input.campaigns.flatMap((campaign) =>
    campaign.deliverables.filter((deliverable) =>
      isSocialChannel(deliverable.channel),
    ),
  );
  const captionedItems = plannerItems.filter((item) => item.caption.trim());
  const checks = [
    createCheck({
      id: "social-queue",
      label: "Social queue",
      score: plannerItems.length ? 100 : deliverables.length ? 65 : 0,
      detail: `${plannerItems.length} scheduled social items`,
    }),
    createCheck({
      id: "social-captions",
      label: "Caption coverage",
      score: plannerItems.length
        ? ratioScore(captionedItems.length, plannerItems.length)
        : 55,
      detail: `${captionedItems.length} of ${plannerItems.length} items have captions`,
    }),
    createCheck({
      id: "social-deliverables",
      label: "Campaign social deliverables",
      score: deliverables.length ? 100 : 45,
      detail: `${deliverables.length} campaign deliverables map to social`,
    }),
  ];

  return createRollup({
    id: "social",
    name: "Social",
    description: "Short-form and feed publishing across social networks.",
    presets: presetsForChannel("social"),
    checks,
    queue: plannerItems.map(createPlannerQueueItem).slice(0, 5),
    analytics: createAnalytics({
      plannerItems,
      deliverables: deliverables.length,
      campaigns: countCampaignsWithChannel(input.campaigns, isSocialChannel),
    }),
  });
}

function createWebsiteRollup(input: {
  contentScheduleItems: ContentScheduleSummary[];
  websitePublishes: WebsitePublishSummary[];
  websiteFormSubmissions: WebsiteFormSubmissionSummary[];
}): PublishingChannelRollup {
  const plannerItems = input.contentScheduleItems.filter(
    (item) => item.channel === "Website",
  );
  const publishedSites = input.websitePublishes.filter(
    (publish) => publish.status === "published",
  );
  const domainsReady = publishedSites.filter((publish) =>
    publish.customDomains.some(
      (domain) =>
        domain.status === "verified" && domain.platformStatus === "attached",
    ),
  );
  const checks = [
    createCheck({
      id: "website-published",
      label: "Published sites",
      score: publishedSites.length ? 100 : plannerItems.length ? 65 : 0,
      detail: `${publishedSites.length} active published sites`,
    }),
    createCheck({
      id: "website-analytics",
      label: "Analytics signal",
      score: sumWebsiteViews(input.websitePublishes) ? 100 : 55,
      detail: `${sumWebsiteViews(input.websitePublishes)} views and ${sumWebsiteClicks(input.websitePublishes)} clicks`,
    }),
    createCheck({
      id: "website-domains",
      label: "Domain readiness",
      score: publishedSites.length
        ? Math.max(65, ratioScore(domainsReady.length, publishedSites.length))
        : 45,
      detail: `${domainsReady.length} published sites have attached verified domains`,
    }),
  ];

  return createRollup({
    id: "website",
    name: "Website",
    description: "Hosted website publishing, domains, and audience responses.",
    presets: presetsForChannel("website"),
    checks,
    queue: [
      ...publishedSites.map(createWebsiteQueueItem),
      ...plannerItems.map(createPlannerQueueItem),
    ].slice(0, 5),
    analytics: createAnalytics({
      plannerItems,
      published: publishedSites.length,
      views: sumWebsiteViews(input.websitePublishes),
      clicks: sumWebsiteClicks(input.websitePublishes),
      submissions: input.websiteFormSubmissions.length,
    }),
  });
}

function createEmailRollup(input: {
  activeProjects: ProjectSummary[];
  contentScheduleItems: ContentScheduleSummary[];
  campaigns: CampaignBoardSummary[];
}): PublishingChannelRollup {
  const plannerItems = input.contentScheduleItems.filter(
    (item) => item.channel === "Email",
  );
  const deliverables = input.campaigns.flatMap((campaign) =>
    campaign.deliverables.filter((deliverable) =>
      isEmailChannel(deliverable.channel),
    ),
  );
  const emailReadyProjects = input.activeProjects.filter(isEmailFormatProject);
  const checks = [
    createCheck({
      id: "email-designs",
      label: "Email-ready designs",
      score: emailReadyProjects.length ? 100 : deliverables.length ? 70 : 35,
      detail: `${emailReadyProjects.length} active designs fit email-friendly dimensions`,
    }),
    createCheck({
      id: "email-queue",
      label: "Email queue",
      score: plannerItems.length ? 100 : deliverables.length ? 60 : 0,
      detail: `${plannerItems.length} scheduled email sends`,
    }),
    createCheck({
      id: "email-captions",
      label: "Send copy",
      score: plannerItems.length
        ? ratioScore(
            plannerItems.filter((item) => item.caption.trim()).length,
            plannerItems.length,
          )
        : 55,
      detail: `${plannerItems.filter((item) => item.caption.trim()).length} scheduled email items include send notes`,
    }),
  ];

  return createRollup({
    id: "email",
    name: "Email",
    description: "Email design export, test-send, and planned send readiness.",
    presets: presetsForChannel("email"),
    checks,
    queue: plannerItems.map(createPlannerQueueItem).slice(0, 5),
    analytics: createAnalytics({
      plannerItems,
      deliverables: deliverables.length,
      campaigns: countCampaignsWithChannel(input.campaigns, isEmailChannel),
    }),
  });
}

function createCampaignRollup(input: {
  contentScheduleItems: ContentScheduleSummary[];
  campaigns: CampaignBoardSummary[];
}): PublishingChannelRollup {
  const campaignDeliverables = input.campaigns.flatMap(
    (campaign) => campaign.deliverables,
  );
  const approvedDeliverables = campaignDeliverables.filter(
    (deliverable) => deliverable.approvalStatus === "approved",
  );
  const completeDeliverables = campaignDeliverables.filter(
    (deliverable) => deliverable.status === "done",
  );
  const scheduledProjectIds = new Set(
    input.contentScheduleItems
      .map((item) => item.projectId)
      .filter((projectId): projectId is string => Boolean(projectId)),
  );
  const scheduledDeliverables = campaignDeliverables.filter(
    (deliverable) =>
      deliverable.projectId && scheduledProjectIds.has(deliverable.projectId),
  );
  const checks = [
    createCheck({
      id: "campaign-boards",
      label: "Campaign boards",
      score: input.campaigns.length ? 100 : 0,
      detail: `${input.campaigns.length} campaign boards`,
    }),
    createCheck({
      id: "campaign-approvals",
      label: "Deliverable approvals",
      score: campaignDeliverables.length
        ? ratioScore(approvedDeliverables.length, campaignDeliverables.length)
        : input.campaigns.length
          ? 35
          : 0,
      detail: `${approvedDeliverables.length} of ${campaignDeliverables.length} deliverables are approved`,
    }),
    createCheck({
      id: "campaign-scheduled",
      label: "Scheduled coverage",
      score: campaignDeliverables.length
        ? ratioScore(scheduledDeliverables.length, campaignDeliverables.length)
        : input.campaigns.length
          ? 35
          : 0,
      detail: `${scheduledDeliverables.length} campaign deliverables are on the planner`,
    }),
  ];

  return createRollup({
    id: "campaign",
    name: "Campaign",
    description: "Multi-format campaign deliverables and rollout readiness.",
    presets: presetsForChannel("campaign"),
    checks,
    queue: input.campaigns.map(createCampaignQueueItem).slice(0, 5),
    analytics: createAnalytics({
      plannerItems: input.contentScheduleItems.filter((item) =>
        scheduledProjectIds.has(item.projectId ?? ""),
      ),
      published: completeDeliverables.length,
      deliverables: campaignDeliverables.length,
      campaigns: input.campaigns.length,
    }),
  });
}

function createRollup(input: {
  id: PublishingChannelId;
  name: string;
  description: string;
  presets: PublishingChannelPreset[];
  checks: PublishingChannelCheck[];
  queue: PublishingChannelQueueItem[];
  analytics: PublishingChannelRollup["analytics"];
}): PublishingChannelRollup {
  const score = Math.round(
    input.checks.reduce((total, check) => total + check.score, 0) /
      input.checks.length,
  );

  return {
    ...input,
    status: scoreToStatus(score),
    score,
  };
}

function createAnalytics(input: {
  plannerItems: ContentScheduleSummary[];
  published?: number;
  deliverables?: number;
  campaigns?: number;
  views?: number;
  clicks?: number;
  submissions?: number;
}): PublishingChannelRollup["analytics"] {
  const planned = input.plannerItems.filter(
    (item) => item.status === "planned",
  ).length;
  const published =
    input.published ??
    input.plannerItems.filter((item) => item.status === "published").length;
  const cancelled = input.plannerItems.filter(
    (item) => item.status === "cancelled",
  ).length;
  const views = input.views ?? 0;
  const submissions = input.submissions ?? 0;

  return {
    planned,
    published,
    cancelled,
    deliverables: input.deliverables ?? 0,
    campaigns: input.campaigns ?? 0,
    views,
    clicks: input.clicks ?? 0,
    submissions,
    conversionRate: views ? Math.round((submissions / views) * 100) : 0,
  };
}

function createCheck(input: {
  id: string;
  label: string;
  score: number;
  detail: string;
}): PublishingChannelCheck {
  return {
    id: input.id,
    label: input.label,
    status: scoreToStatus(input.score),
    score: input.score,
    detail: input.detail,
  };
}

function createPlannerQueueItem(
  item: ContentScheduleSummary,
): PublishingChannelQueueItem {
  return {
    id: item.id,
    title: item.title,
    detail: `${item.channel} - ${item.projectName ?? "No linked design"}`,
    status: item.status,
    scheduledAt: item.scheduledAt,
  };
}

function createWebsiteQueueItem(
  publish: WebsitePublishSummary,
): PublishingChannelQueueItem {
  return {
    id: publish.id,
    title: publish.title,
    detail: `/site/${publish.slug} - ${publish.viewCount} views, ${publish.clickCount} clicks`,
    status: publish.status,
    scheduledAt: publish.publishedAt,
  };
}

function createCampaignQueueItem(
  campaign: CampaignBoardSummary,
): PublishingChannelQueueItem {
  return {
    id: campaign.id,
    title: campaign.name,
    detail: `${campaign.deliverables.length} deliverables - ${campaign.audience || "No audience set"}`,
    status: campaign.status,
    scheduledAt: campaign.launchAt,
  };
}

function createNextActions(channels: PublishingChannelRollup[]) {
  return channels
    .filter((channel) => channel.status !== "ready")
    .sort((left, right) => left.score - right.score)
    .map((channel) => {
      const check = [...channel.checks].sort(
        (left, right) => left.score - right.score,
      )[0];

      return check
        ? `${channel.name}: ${check.label} - ${check.detail}`
        : `${channel.name}: review channel setup`;
    })
    .slice(0, 4);
}

function presetsForChannel(channelId: PublishingChannelId) {
  return publishingChannelPresets.filter(
    (preset) => preset.channelId === channelId,
  );
}

function countCampaignsWithChannel(
  campaigns: CampaignBoardSummary[],
  predicate: (channel: string) => boolean,
) {
  return campaigns.filter((campaign) =>
    campaign.deliverables.some((deliverable) => predicate(deliverable.channel)),
  ).length;
}

function isSocialChannel(channel: string) {
  const normalized = channel.toLowerCase();

  return (
    socialPlannerChannels.has(channel) ||
    normalized.includes("social") ||
    normalized.includes("instagram") ||
    normalized.includes("tiktok") ||
    normalized.includes("youtube") ||
    normalized.includes("linkedin") ||
    normalized.includes("pinterest") ||
    normalized === "x"
  );
}

function isEmailChannel(channel: string) {
  return channel.toLowerCase().includes("email");
}

function isEmailFormatProject(project: ProjectSummary) {
  const ratio = project.width / Math.max(project.height, 1);

  return project.width >= 600 && project.width <= 1600 && ratio <= 1.6;
}

function sumWebsiteViews(publishes: WebsitePublishSummary[]) {
  return publishes.reduce((total, publish) => total + publish.viewCount, 0);
}

function sumWebsiteClicks(publishes: WebsitePublishSummary[]) {
  return publishes.reduce((total, publish) => total + publish.clickCount, 0);
}

function ratioScore(current: number, total: number) {
  if (!total) return 0;

  return Math.round((current / total) * 100);
}

function scoreToStatus(score: number): PublishingChannelStatus {
  if (score >= 80) return "ready";
  if (score >= 50) return "attention";

  return "blocked";
}
