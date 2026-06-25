import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type {
  WebsiteFormSubmissionSummary,
  WebsitePublishSummary,
} from "@/db/website-publishing";
import type {
  ContentDatabaseCenter,
  ContentDatabaseRecord,
  ContentTemplateSurface,
} from "@/features/content-database/content-database";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { PublishingChannelCenter } from "@/features/publishing/publishing-channel-depth";
import type {
  CampaignGeneratedVariant,
  RuleBasedCampaignGenerationCenter,
} from "@/features/campaigns/rule-based-campaign-generation";
import type {
  ProductionDistributionAnalyticsCenter,
  ProductionDistributionAnalyticsStatus,
  ProductionDistributionAttributionPacket,
  ProductionDistributionCampaignAttribution,
  ProductionDistributionChannelAttribution,
  ProductionDistributionFunnelStage,
  ProductionDistributionSourceInfluence,
} from "@/features/distribution/production-distribution-analytics-types";

export type {
  ProductionDistributionAnalyticsCenter,
  ProductionDistributionAnalyticsStatus,
  ProductionDistributionAttributionPacket,
  ProductionDistributionCampaignAttribution,
  ProductionDistributionChannelAttribution,
  ProductionDistributionChannelId,
  ProductionDistributionFunnelStage,
  ProductionDistributionSourceInfluence,
} from "@/features/distribution/production-distribution-analytics-types";

export function createProductionDistributionAnalyticsCenter(input: {
  campaigns: CampaignBoardSummary[];
  campaignGeneration: RuleBasedCampaignGenerationCenter;
  contentDatabase: ContentDatabaseCenter;
  publishingChannelCenter: PublishingChannelCenter;
  contentScheduleItems: ContentScheduleSummary[];
  websitePublishes: WebsitePublishSummary[];
  websiteFormSubmissions: WebsiteFormSubmissionSummary[];
  serverExportJobs: ServerExportJobSummary[];
  generatedAt?: string;
}): ProductionDistributionAnalyticsCenter {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const completedExports = input.serverExportJobs.filter(
    (job) => job.status === "completed",
  );
  const campaignAttribution = input.campaigns
    .map((campaign) =>
      createCampaignAttribution({
        campaign,
        variants: input.campaignGeneration.variants.filter(
          (variant) => variant.campaignId === campaign.id,
        ),
        contentDatabase: input.contentDatabase,
        contentScheduleItems: input.contentScheduleItems,
        websitePublishes: input.websitePublishes,
        websiteFormSubmissions: input.websiteFormSubmissions,
        completedExports,
      }),
    )
    .sort(compareCampaignAttribution);
  const sourceInfluence = createSourceInfluence({
    records: input.contentDatabase.records,
    bindings: input.contentDatabase.bindings,
    variants: input.campaignGeneration.variants,
    campaigns: input.campaigns,
    contentScheduleItems: input.contentScheduleItems,
    websiteFormSubmissions: input.websiteFormSubmissions,
  });
  const channelAttribution = createChannelAttribution({
    campaignAttribution,
    contentScheduleItems: input.contentScheduleItems,
    websitePublishes: input.websitePublishes,
    websiteFormSubmissions: input.websiteFormSubmissions,
    completedExports,
    publishingChannelCenter: input.publishingChannelCenter,
  });
  const totals = createTotals({
    campaigns: input.campaigns,
    campaignAttribution,
    contentDatabase: input.contentDatabase,
    contentScheduleItems: input.contentScheduleItems,
    websitePublishes: input.websitePublishes,
    websiteFormSubmissions: input.websiteFormSubmissions,
    completedExports,
    variants: input.campaignGeneration.variants,
  });
  const funnelStages = createFunnelStages({
    totals,
    campaigns: input.campaigns,
    contentDatabase: input.contentDatabase,
  });
  const score = average([
    average(funnelStages.map((stage) => ratioScore(stage.current, stage.target))),
    average(campaignAttribution.map((row) => row.score), input.campaigns.length ? 35 : 100),
    average(channelAttribution.map((channel) => channel.score)),
    input.contentDatabase.score,
    input.publishingChannelCenter.score,
  ]);
  const hasBlockedEvidence = [
    ...funnelStages.map((stage) => stage.status),
    ...campaignAttribution.map((row) => row.status),
    ...channelAttribution.map((channel) => channel.status),
  ].some((status) => status === "blocked");
  const status = hasBlockedEvidence ? "blocked" : scoreToStatus(score);
  const nextActions = createNextActions({
    funnelStages,
    campaignAttribution,
    sourceInfluence,
    channelAttribution,
  });

  return {
    generatedAt,
    status,
    score,
    funnelStages,
    campaignAttribution,
    sourceInfluence,
    channelAttribution,
    attributionPacket: createAttributionPacket({
      generatedAt,
      status,
      score,
      funnelStages,
      campaignAttribution,
      sourceInfluence,
      channelAttribution,
      nextActions,
      totals,
    }),
    nextActions,
    totals,
  };
}

function createCampaignAttribution(input: {
  campaign: CampaignBoardSummary;
  variants: CampaignGeneratedVariant[];
  contentDatabase: ContentDatabaseCenter;
  contentScheduleItems: ContentScheduleSummary[];
  websitePublishes: WebsitePublishSummary[];
  websiteFormSubmissions: WebsiteFormSubmissionSummary[];
  completedExports: ServerExportJobSummary[];
}): ProductionDistributionCampaignAttribution {
  const projectIds = unique(
    input.campaign.deliverables
      .map((deliverable) => deliverable.projectId)
      .filter((projectId): projectId is string => Boolean(projectId)),
  );
  const projectIdSet = new Set(projectIds);
  const sourceRecordIds = findCampaignSourceRecordIds(
    input.campaign,
    input.contentDatabase.records,
    input.variants,
  );
  const scheduledItems = input.contentScheduleItems.filter((item) =>
    matchesCampaignDistributionItem({
      campaign: input.campaign,
      projectIds: projectIdSet,
      title: item.title,
      caption: item.caption,
      projectId: item.projectId,
      projectName: item.projectName,
    }),
  );
  const websitePublishes = input.websitePublishes.filter(
    (publish) =>
      projectIdSet.has(publish.projectId) ||
      namesOverlap(input.campaign.name, publish.title) ||
      namesOverlap(input.campaign.name, publish.projectName ?? ""),
  );
  const websitePublishIds = new Set(websitePublishes.map((publish) => publish.id));
  const formSubmissions = input.websiteFormSubmissions.filter(
    (submission) =>
      websitePublishIds.has(submission.publishId) ||
      projectIdSet.has(submission.projectId),
  );
  const exportArtifacts = input.completedExports.filter(
    (job) =>
      projectIdSet.has(job.projectId) ||
      namesOverlap(input.campaign.name, job.projectName),
  );
  const websiteViews = websitePublishes.reduce(
    (total, publish) => total + publish.viewCount,
    0,
  );
  const websiteClicks = websitePublishes.reduce(
    (total, publish) => total + publish.clickCount,
    0,
  );
  const socialPublishes = scheduledItems.filter(
    (item) => isSocialChannel(item.channel) && item.status === "published",
  ).length;
  const emailPublishes = scheduledItems.filter(
    (item) => item.channel === "Email" && item.status === "published",
  ).length;
  const publishedItems = scheduledItems.filter(
    (item) => item.status === "published",
  ).length;
  const expectedDistribution = Math.max(
    1,
    new Set(input.campaign.deliverables.map((deliverable) => surfaceForChannel(deliverable.channel))).size,
  );
  const responseTarget = websiteViews ? Math.max(1, Math.ceil(websiteViews * 0.005)) : 1;
  const score = average([
    ratioScore(input.variants.length, expectedDistribution),
    ratioScore(sourceRecordIds.length, Math.max(1, expectedDistribution)),
    ratioScore(scheduledItems.length, expectedDistribution),
    ratioScore(publishedItems + websitePublishes.length, expectedDistribution),
    ratioScore(exportArtifacts.length, Math.max(1, projectIds.length)),
    ratioScore(formSubmissions.length, responseTarget),
  ]);
  const status = scoreToStatus(score);

  return {
    id: `distribution-campaign-${input.campaign.id}`,
    campaignId: input.campaign.id,
    campaignName: input.campaign.name,
    audience: input.campaign.audience,
    status,
    score,
    generatedVariants: input.variants.length,
    contentSources: sourceRecordIds.length,
    scheduledPublishes: scheduledItems.length,
    socialPublishes,
    websitePublishes: websitePublishes.filter(
      (publish) => publish.status === "published",
    ).length,
    emailPublishes,
    exportArtifacts: exportArtifacts.length,
    formSubmissions: formSubmissions.length,
    websiteViews,
    websiteClicks,
    conversionRate: websiteViews
      ? Math.round((formSubmissions.length / websiteViews) * 100)
      : 0,
    sourceRecordIds,
    projectIds,
    detail: `${input.variants.length} generated variants, ${scheduledItems.length} scheduled/published items, ${exportArtifacts.length} completed exports, and ${formSubmissions.length} audience responses.`,
  };
}

function createSourceInfluence(input: {
  records: ContentDatabaseRecord[];
  bindings: ContentDatabaseCenter["bindings"];
  variants: CampaignGeneratedVariant[];
  campaigns: CampaignBoardSummary[];
  contentScheduleItems: ContentScheduleSummary[];
  websiteFormSubmissions: WebsiteFormSubmissionSummary[];
}): ProductionDistributionSourceInfluence[] {
  return input.records
    .map((record) => {
      const bindings = input.bindings.filter(
        (binding) => binding.recordId === record.id,
      );
      const surfaces = uniqueSurfaces([
        ...record.targetSurfaces,
        ...bindings.map((binding) => binding.surface),
      ]);
      const campaignIds = unique(
        record.sources
          .filter((source) => source.type === "campaign")
          .map((source) => source.id),
      );
      const attributedVariants = input.variants.filter(
        (variant) =>
          variant.sourceTrace.some((trace) => trace.sourceId === record.id) ||
          Object.prototype.hasOwnProperty.call(
            variant.variableMap,
            record.variableKey,
          ),
      );
      const attributedCampaignIds = new Set([
        ...campaignIds,
        ...attributedVariants.map((variant) => variant.campaignId),
      ]);
      const campaignNames = input.campaigns
        .filter((campaign) => attributedCampaignIds.has(campaign.id))
        .map((campaign) => campaign.name);
      const scheduledPublishes = input.contentScheduleItems.filter((item) =>
        [item.title, item.caption, item.projectName ?? ""].some((value) =>
          includesAny(value, [record.value, record.label, ...campaignNames]),
        ),
      ).length;
      const formSubmissions = surfaces.includes("website")
        ? input.websiteFormSubmissions.length
        : 0;
      const score = average([
        ratioScore(surfaces.length, 3),
        ratioScore(attributedVariants.length, 1),
        ratioScore(scheduledPublishes + formSubmissions, 1),
      ]);

      return {
        id: `distribution-source-${record.id}`,
        recordId: record.id,
        variableKey: record.variableKey,
        label: record.label,
        status: scoreToStatus(score),
        surfaces,
        campaignIds: [...attributedCampaignIds],
        attributedVariants: attributedVariants.length,
        scheduledPublishes,
        formSubmissions,
        detail: `${record.label} appears on ${surfaces.length} surface${plural(surfaces.length)} with ${attributedVariants.length} generated variant${plural(attributedVariants.length)}.`,
      };
    })
    .sort(
      (left, right) =>
        right.attributedVariants - left.attributedVariants ||
        right.scheduledPublishes - left.scheduledPublishes ||
        right.surfaces.length - left.surfaces.length ||
        statusWeight(left.status) - statusWeight(right.status) ||
        left.label.localeCompare(right.label),
    )
    .slice(0, 16);
}

function createChannelAttribution(input: {
  campaignAttribution: ProductionDistributionCampaignAttribution[];
  contentScheduleItems: ContentScheduleSummary[];
  websitePublishes: WebsitePublishSummary[];
  websiteFormSubmissions: WebsiteFormSubmissionSummary[];
  completedExports: ServerExportJobSummary[];
  publishingChannelCenter: PublishingChannelCenter;
}): ProductionDistributionChannelAttribution[] {
  const rows: ProductionDistributionChannelAttribution[] = [
    createSocialChannelAttribution(input),
    createWebsiteChannelAttribution(input),
    createEmailChannelAttribution(input),
    createExportChannelAttribution(input),
  ];

  return rows.sort(
    (left, right) =>
      statusWeight(left.status) - statusWeight(right.status) ||
      right.score - left.score ||
      left.label.localeCompare(right.label),
  );
}

function createSocialChannelAttribution(input: {
  campaignAttribution: ProductionDistributionCampaignAttribution[];
  contentScheduleItems: ContentScheduleSummary[];
  publishingChannelCenter: PublishingChannelCenter;
}) {
  const items = input.contentScheduleItems.filter((item) =>
    isSocialChannel(item.channel),
  );
  const publishedItems = items.filter((item) => item.status === "published");
  const rollup = input.publishingChannelCenter.channels.find(
    (channel) => channel.id === "social",
  );
  const score = average([
    rollup?.score ?? 0,
    ratioScore(publishedItems.length, Math.max(1, items.length)),
  ]);

  return createChannelRow({
    id: "social",
    label: "Social",
    score,
    campaigns: input.campaignAttribution.filter((row) => row.socialPublishes)
      .length,
    generatedVariants: input.campaignAttribution.reduce(
      (total, row) => total + Math.min(row.generatedVariants, row.socialPublishes),
      0,
    ),
    plannedPublishes: items.length,
    publishedItems: publishedItems.length,
    exportArtifacts: 0,
    websiteViews: 0,
    websiteClicks: 0,
    formSubmissions: 0,
    detail: `${publishedItems.length} published social item${plural(publishedItems.length)} from ${items.length} scheduled social item${plural(items.length)}.`,
  });
}

function createWebsiteChannelAttribution(input: {
  campaignAttribution: ProductionDistributionCampaignAttribution[];
  websitePublishes: WebsitePublishSummary[];
  websiteFormSubmissions: WebsiteFormSubmissionSummary[];
  publishingChannelCenter: PublishingChannelCenter;
}) {
  const publishedSites = input.websitePublishes.filter(
    (publish) => publish.status === "published",
  );
  const views = input.websitePublishes.reduce(
    (total, publish) => total + publish.viewCount,
    0,
  );
  const clicks = input.websitePublishes.reduce(
    (total, publish) => total + publish.clickCount,
    0,
  );
  const rollup = input.publishingChannelCenter.channels.find(
    (channel) => channel.id === "website",
  );
  const responseTarget = views ? Math.max(1, Math.ceil(views * 0.005)) : 1;
  const score = average([
    rollup?.score ?? 0,
    ratioScore(publishedSites.length, Math.max(1, input.websitePublishes.length)),
    ratioScore(input.websiteFormSubmissions.length, responseTarget),
  ]);

  return createChannelRow({
    id: "website",
    label: "Website",
    score,
    campaigns: input.campaignAttribution.filter((row) => row.websitePublishes)
      .length,
    generatedVariants: input.campaignAttribution.filter(
      (row) => row.websitePublishes,
    ).length,
    plannedPublishes: input.websitePublishes.length,
    publishedItems: publishedSites.length,
    exportArtifacts: 0,
    websiteViews: views,
    websiteClicks: clicks,
    formSubmissions: input.websiteFormSubmissions.length,
    detail: `${views} views, ${clicks} clicks, and ${input.websiteFormSubmissions.length} form response${plural(input.websiteFormSubmissions.length)}.`,
  });
}

function createEmailChannelAttribution(input: {
  campaignAttribution: ProductionDistributionCampaignAttribution[];
  contentScheduleItems: ContentScheduleSummary[];
  completedExports: ServerExportJobSummary[];
  publishingChannelCenter: PublishingChannelCenter;
}) {
  const items = input.contentScheduleItems.filter(
    (item) => item.channel === "Email",
  );
  const publishedItems = items.filter((item) => item.status === "published");
  const htmlExports = input.completedExports.filter((job) => job.format === "html");
  const rollup = input.publishingChannelCenter.channels.find(
    (channel) => channel.id === "email",
  );
  const score = average([
    rollup?.score ?? 0,
    ratioScore(publishedItems.length, Math.max(1, items.length)),
    ratioScore(htmlExports.length, Math.max(1, items.length)),
  ]);

  return createChannelRow({
    id: "email",
    label: "Email",
    score,
    campaigns: input.campaignAttribution.filter((row) => row.emailPublishes)
      .length,
    generatedVariants: input.campaignAttribution.filter((row) => row.emailPublishes)
      .length,
    plannedPublishes: items.length,
    publishedItems: publishedItems.length,
    exportArtifacts: htmlExports.length,
    websiteViews: 0,
    websiteClicks: 0,
    formSubmissions: 0,
    detail: `${publishedItems.length} published email item${plural(publishedItems.length)} and ${htmlExports.length} completed HTML export${plural(htmlExports.length)}.`,
  });
}

function createExportChannelAttribution(input: {
  campaignAttribution: ProductionDistributionCampaignAttribution[];
  completedExports: ServerExportJobSummary[];
}) {
  const campaignProjects = new Set(
    input.campaignAttribution.flatMap((row) => row.projectIds),
  );
  const campaignExports = input.completedExports.filter((job) =>
    campaignProjects.has(job.projectId),
  );
  const target = Math.max(1, campaignProjects.size);
  const score = ratioScore(campaignExports.length, target);

  return createChannelRow({
    id: "export",
    label: "Exports",
    score,
    campaigns: input.campaignAttribution.filter((row) => row.exportArtifacts)
      .length,
    generatedVariants: input.campaignAttribution.reduce(
      (total, row) => total + row.generatedVariants,
      0,
    ),
    plannedPublishes: target,
    publishedItems: campaignExports.length,
    exportArtifacts: campaignExports.length,
    websiteViews: 0,
    websiteClicks: 0,
    formSubmissions: 0,
    detail: `${campaignExports.length} completed export artifact${plural(campaignExports.length)} for ${campaignProjects.size} campaign design${plural(campaignProjects.size)}.`,
  });
}

function createChannelRow(input: Omit<ProductionDistributionChannelAttribution, "status">) {
  return {
    ...input,
    status: scoreToStatus(input.score),
  };
}

function createTotals(input: {
  campaigns: CampaignBoardSummary[];
  campaignAttribution: ProductionDistributionCampaignAttribution[];
  contentDatabase: ContentDatabaseCenter;
  contentScheduleItems: ContentScheduleSummary[];
  websitePublishes: WebsitePublishSummary[];
  websiteFormSubmissions: WebsiteFormSubmissionSummary[];
  completedExports: ServerExportJobSummary[];
  variants: CampaignGeneratedVariant[];
}): ProductionDistributionAnalyticsCenter["totals"] {
  const publishedItems = input.contentScheduleItems.filter(
    (item) => item.status === "published",
  );

  return {
    campaigns: input.campaigns.length,
    variants: input.variants.length,
    contentSources: input.contentDatabase.totals.records,
    scheduledPublishes: input.contentScheduleItems.length,
    publishedItems: publishedItems.length,
    websitePublishes: input.websitePublishes.filter(
      (publish) => publish.status === "published",
    ).length,
    emailPublishes: publishedItems.filter((item) => item.channel === "Email")
      .length,
    socialPublishes: publishedItems.filter((item) => isSocialChannel(item.channel))
      .length,
    exportArtifacts: input.completedExports.length,
    formSubmissions: input.websiteFormSubmissions.length,
    websiteViews: input.websitePublishes.reduce(
      (total, publish) => total + publish.viewCount,
      0,
    ),
    websiteClicks: input.websitePublishes.reduce(
      (total, publish) => total + publish.clickCount,
      0,
    ),
  };
}

function createFunnelStages(input: {
  totals: ProductionDistributionAnalyticsCenter["totals"];
  campaigns: CampaignBoardSummary[];
  contentDatabase: ContentDatabaseCenter;
}): ProductionDistributionFunnelStage[] {
  const campaignCount = Math.max(1, input.campaigns.length);
  const deliverableCount = Math.max(
    1,
    input.campaigns.reduce(
      (total, campaign) => total + campaign.deliverables.length,
      0,
    ),
  );
  const responseTarget = input.totals.websiteViews
    ? Math.max(1, Math.ceil(input.totals.websiteViews * 0.005))
    : 1;

  return [
    createFunnelStage({
      id: "content-sources",
      label: "Content sources",
      current: input.totals.contentSources,
      target: Math.max(1, campaignCount * 4),
      detail: `${input.totals.contentSources} reusable records feed ${campaignCount} campaign${plural(campaignCount)}.`,
    }),
    createFunnelStage({
      id: "campaign-variants",
      label: "Campaign variants",
      current: input.totals.variants,
      target: Math.max(1, campaignCount * 3),
      detail: `${input.totals.variants} generated variants across social, website, email, and other surfaces.`,
    }),
    createFunnelStage({
      id: "distribution-publishes",
      label: "Distribution publishes",
      current: input.totals.publishedItems + input.totals.websitePublishes,
      target: deliverableCount,
      detail: `${input.totals.publishedItems} planner items and ${input.totals.websitePublishes} websites are published.`,
    }),
    createFunnelStage({
      id: "export-artifacts",
      label: "Export artifacts",
      current: input.totals.exportArtifacts,
      target: deliverableCount,
      detail: `${input.totals.exportArtifacts} completed export artifacts for ${deliverableCount} campaign deliverable${plural(deliverableCount)}.`,
    }),
    createFunnelStage({
      id: "audience-response",
      label: "Audience response",
      current: input.totals.formSubmissions,
      target: responseTarget,
      detail: `${input.totals.formSubmissions} form response${plural(input.totals.formSubmissions)} from ${input.totals.websiteViews} website views.`,
    }),
  ];
}

function createFunnelStage(input: {
  id: ProductionDistributionFunnelStage["id"];
  label: string;
  current: number;
  target: number;
  detail: string;
}): ProductionDistributionFunnelStage {
  const conversionRate = ratioScore(input.current, input.target);

  return {
    ...input,
    conversionRate,
    status: scoreToStatus(conversionRate),
  };
}

function findCampaignSourceRecordIds(
  campaign: CampaignBoardSummary,
  records: ContentDatabaseRecord[],
  variants: CampaignGeneratedVariant[],
) {
  const fromRecords = records
    .filter((record) =>
      record.sources.some(
        (source) => source.type === "campaign" && source.id === campaign.id,
      ),
    )
    .map((record) => record.id);
  const fromVariants = variants.flatMap((variant) =>
    variant.sourceTrace
      .filter((trace) => trace.sourceType === "content-record")
      .map((trace) => trace.sourceId),
  );

  return unique([...fromRecords, ...fromVariants]);
}

function matchesCampaignDistributionItem(input: {
  campaign: CampaignBoardSummary;
  projectIds: Set<string>;
  title: string;
  caption: string;
  projectId: string | null;
  projectName: string | null;
}) {
  if (input.projectId && input.projectIds.has(input.projectId)) return true;

  const values = [
    input.campaign.name,
    input.campaign.goal,
    input.campaign.audience,
    ...input.campaign.deliverables.map(
      (deliverable) => deliverable.projectName ?? deliverable.role,
    ),
  ];

  return [input.title, input.caption, input.projectName ?? ""].some((value) =>
    includesAny(value, values),
  );
}

function createAttributionPacket(input: {
  generatedAt: string;
  status: ProductionDistributionAnalyticsStatus;
  score: number;
  funnelStages: ProductionDistributionFunnelStage[];
  campaignAttribution: ProductionDistributionCampaignAttribution[];
  sourceInfluence: ProductionDistributionSourceInfluence[];
  channelAttribution: ProductionDistributionChannelAttribution[];
  nextActions: string[];
  totals: ProductionDistributionAnalyticsCenter["totals"];
}): ProductionDistributionAttributionPacket {
  return {
    fileName: "production-distribution-attribution.json",
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(input, null, 2),
    )}`,
  };
}

function createNextActions(input: {
  funnelStages: ProductionDistributionFunnelStage[];
  campaignAttribution: ProductionDistributionCampaignAttribution[];
  sourceInfluence: ProductionDistributionSourceInfluence[];
  channelAttribution: ProductionDistributionChannelAttribution[];
}) {
  const actions = [
    ...input.funnelStages
      .filter((stage) => stage.status !== "ready")
      .map((stage) => `Improve ${stage.label.toLowerCase()}: ${stage.detail}`),
    ...input.campaignAttribution
      .filter((row) => row.status !== "ready")
      .map((row) => `${row.campaignName}: ${row.detail}`),
    ...input.channelAttribution
      .filter((channel) => channel.status !== "ready")
      .map((channel) => `${channel.label}: ${channel.detail}`),
    ...input.sourceInfluence
      .filter((source) => source.status !== "ready")
      .map((source) => `${source.label}: ${source.detail}`),
  ];

  return actions.length
    ? actions.slice(0, 5)
    : ["Distribution attribution is connected across content, campaign, channel, export, and audience response evidence."];
}

function isSocialChannel(channel: string) {
  return [
    "Instagram",
    "TikTok",
    "YouTube",
    "LinkedIn",
    "Pinterest",
    "X",
  ].includes(channel);
}

function surfaceForChannel(channel: string): ContentTemplateSurface {
  if (channel === "Website") return "website";
  if (channel === "Email") return "email";
  return "social";
}

function namesOverlap(left: string, right: string) {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);

  if (!leftTokens.size || !rightTokens.size) return false;

  return [...leftTokens].some((token) => token.length > 3 && rightTokens.has(token));
}

function includesAny(value: string, candidates: string[]) {
  const normalized = normalizeLookup(value);

  return candidates
    .map(normalizeLookup)
    .filter((candidate) => candidate.length >= 3)
    .some((candidate) => normalized.includes(candidate));
}

function tokenSet(value: string) {
  return new Set(normalizeLookup(value).split(" ").filter(Boolean));
}

function normalizeLookup(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function uniqueSurfaces(values: ContentTemplateSurface[]) {
  const order: Record<ContentTemplateSurface, number> = {
    text: 0,
    table: 1,
    website: 2,
    email: 3,
    social: 4,
  };

  return [...new Set(values)].sort((left, right) => order[left] - order[right]);
}

function compareCampaignAttribution(
  left: ProductionDistributionCampaignAttribution,
  right: ProductionDistributionCampaignAttribution,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    right.score - left.score ||
    right.formSubmissions - left.formSubmissions ||
    left.campaignName.localeCompare(right.campaignName)
  );
}

function average(values: number[], fallback = 0) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function ratioScore(current: number, target: number) {
  if (target <= 0) return current > 0 ? 100 : 0;

  return Math.min(100, Math.round((current / target) * 100));
}

function scoreToStatus(score: number): ProductionDistributionAnalyticsStatus {
  if (score >= 80) return "ready";
  if (score >= 50) return "review";
  return "blocked";
}

function statusWeight(status: ProductionDistributionAnalyticsStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;
  return 2;
}

function plural(count: number) {
  return count === 1 ? "" : "s";
}
