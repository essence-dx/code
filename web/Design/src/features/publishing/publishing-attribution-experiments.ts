import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type {
  WebsiteFormSubmissionSummary,
  WebsitePublishSummary,
} from "@/db/website-publishing";
import type { ProjectSummary } from "@/features/editor/types";
import type {
  PublishingChannelId,
  PublishingChannelStatus,
} from "@/features/publishing/publishing-channel-depth";

export type PublishingAttributionSource = {
  id: string;
  channelId: PublishingChannelId | "variant";
  label: string;
  sourceType: "website" | "email" | "social" | "campaign" | "variant";
  status: PublishingChannelStatus;
  score: number;
  detail: string;
  metrics: Array<{
    label: string;
    value: number | string;
  }>;
};

export type PublishingExperimentVariant = {
  id: string;
  label: string;
  detail: string;
  metricLabel: string;
  metricValue: number | string;
  score: number;
  status: PublishingChannelStatus;
};

export type PublishingExperimentView = {
  id: string;
  title: string;
  channelId: PublishingChannelId | "variant";
  hypothesis: string;
  status: PublishingChannelStatus;
  score: number;
  variants: PublishingExperimentVariant[];
  winnerLabel: string | null;
  nextAction: string;
};

export function createPublishingAttributionSources(input: {
  projects: ProjectSummary[];
  contentScheduleItems: ContentScheduleSummary[];
  campaigns: CampaignBoardSummary[];
  websitePublishes: WebsitePublishSummary[];
  websiteFormSubmissions: WebsiteFormSubmissionSummary[];
}): PublishingAttributionSource[] {
  const websiteSources = input.websitePublishes.map((publish) =>
    createWebsiteAttributionSource(publish, input.websiteFormSubmissions),
  );
  const plannerSources = createPlannerAttributionSources(input.contentScheduleItems);
  const campaignSources = input.campaigns.map(createCampaignAttributionSource);
  const variantSources = createVariantAttributionSources(input.projects);

  return [
    ...websiteSources,
    ...plannerSources,
    ...campaignSources,
    ...variantSources,
  ]
    .sort(
      (left, right) =>
        statusWeight[left.status] - statusWeight[right.status] ||
        right.score - left.score ||
        left.label.localeCompare(right.label),
    )
    .slice(0, 10);
}

export function createPublishingExperimentViews(input: {
  projects: ProjectSummary[];
  contentScheduleItems: ContentScheduleSummary[];
  campaigns: CampaignBoardSummary[];
  websitePublishes: WebsitePublishSummary[];
  websiteFormSubmissions: WebsiteFormSubmissionSummary[];
}): PublishingExperimentView[] {
  return [
    createWebsiteExperiment(input.websitePublishes, input.websiteFormSubmissions),
    createEmailExperiment(input.contentScheduleItems),
    ...createCampaignExperiments(input.campaigns),
    ...createVariantExperiments(input.projects),
  ]
    .filter(
      (experiment): experiment is PublishingExperimentView =>
        experiment !== null && experiment.variants.length > 0,
    )
    .sort(
      (left, right) =>
        statusWeight[left.status] - statusWeight[right.status] ||
        right.score - left.score ||
        left.title.localeCompare(right.title),
    )
    .slice(0, 8);
}

function createWebsiteAttributionSource(
  publish: WebsitePublishSummary,
  submissions: WebsiteFormSubmissionSummary[],
): PublishingAttributionSource {
  const submissionCount = submissions.filter(
    (submission) => submission.publishId === publish.id,
  ).length;
  const target = publish.viewCount
    ? Math.max(1, Math.ceil(publish.viewCount * 0.03))
    : 1;
  const score = publish.viewCount ? ratioScore(submissionCount, target) : 45;

  return {
    id: `website-${publish.id}`,
    channelId: "website",
    label: publish.title,
    sourceType: "website",
    status: scoreToStatus(score),
    score,
    detail: `${publish.slug} attributed ${publish.viewCount} views, ${publish.clickCount} clicks, and ${submissionCount} submissions.`,
    metrics: [
      { label: "Views", value: publish.viewCount },
      { label: "Clicks", value: publish.clickCount },
      { label: "Submissions", value: submissionCount },
      {
        label: "Conversion",
        value: `${publish.viewCount ? Math.round((submissionCount / publish.viewCount) * 100) : 0}%`,
      },
    ],
  };
}

function createPlannerAttributionSources(
  items: ContentScheduleSummary[],
): PublishingAttributionSource[] {
  const grouped = new Map<string, ContentScheduleSummary[]>();

  for (const item of items) {
    const channelKey = normalizeChannelKey(item.channel);
    grouped.set(channelKey, [...(grouped.get(channelKey) ?? []), item]);
  }

  return Array.from(grouped.entries()).map(([channel, channelItems]) => {
    const published = channelItems.filter((item) => item.status === "published");
    const planned = channelItems.filter((item) => item.status === "planned");
    const captioned = channelItems.filter((item) => item.caption.trim());
    const score = average([
      ratioScore(published.length + planned.length, channelItems.length),
      ratioScore(captioned.length, channelItems.length),
    ]);
    const channelId = channel === "email" ? "email" : "social";

    return {
      id: `planner-${channel}`,
      channelId,
      label: `${formatTitle(channel)} planner attribution`,
      sourceType: channelId,
      status: scoreToStatus(score),
      score,
      detail: `${channelItems.length} scheduled ${channel} item${channelItems.length === 1 ? "" : "s"} with ${captioned.length} captioned.`,
      metrics: [
        { label: "Planned", value: planned.length },
        { label: "Published", value: published.length },
        { label: "Captioned", value: captioned.length },
      ],
    };
  });
}

function createCampaignAttributionSource(
  campaign: CampaignBoardSummary,
): PublishingAttributionSource {
  const done = campaign.deliverables.filter(
    (deliverable) => deliverable.status === "done",
  );
  const approved = campaign.deliverables.filter(
    (deliverable) => deliverable.approvalStatus === "approved",
  );
  const score = campaign.deliverables.length
    ? average([
        ratioScore(done.length, campaign.deliverables.length),
        ratioScore(approved.length, campaign.deliverables.length),
      ])
    : 35;

  return {
    id: `campaign-${campaign.id}`,
    channelId: "campaign",
    label: campaign.name,
    sourceType: "campaign",
    status: scoreToStatus(score),
    score,
    detail: `${campaign.goal || "Campaign"} has ${campaign.deliverables.length} deliverables for ${campaign.audience || "the target audience"}.`,
    metrics: [
      { label: "Deliverables", value: campaign.deliverables.length },
      { label: "Approved", value: approved.length },
      { label: "Done", value: done.length },
    ],
  };
}

function createVariantAttributionSources(
  projects: ProjectSummary[],
): PublishingAttributionSource[] {
  return Array.from(groupReusableVariants(projects).entries()).map(
    ([key, variants]) => {
      const approved = variants.filter(
        (variant) => variant.approvalStatus === "approved",
      );
      const score = ratioScore(approved.length, variants.length);

      return {
        id: `variant-${key}`,
        channelId: "variant",
        label: variants[0]?.variantName ?? "Reusable variant set",
        sourceType: "variant",
        status: scoreToStatus(score),
        score,
        detail: `${variants.length} reusable content variant${variants.length === 1 ? "" : "s"} share a source or resize profile.`,
        metrics: [
          { label: "Variants", value: variants.length },
          { label: "Approved", value: approved.length },
          {
            label: "Formats",
            value: new Set(variants.map((variant) => variant.variantProfileId))
              .size,
          },
        ],
      };
    },
  );
}

function createWebsiteExperiment(
  publishes: WebsitePublishSummary[],
  submissions: WebsiteFormSubmissionSummary[],
): PublishingExperimentView | null {
  if (!publishes.length) return null;

  return createExperiment({
    id: "website-offer-experiment",
    title: "Website offer experiment",
    channelId: "website",
    hypothesis:
      "Compare published site offers by conversion from views to submissions.",
    variants: publishes.map((publish) => {
      const submissionCount = submissions.filter(
        (submission) => submission.publishId === publish.id,
      ).length;
      const conversion = publish.viewCount
        ? Math.round((submissionCount / publish.viewCount) * 100)
        : 0;
      const score = average([
        publish.viewCount ? Math.min(100, publish.viewCount) : 35,
        publish.clickCount ? Math.min(100, publish.clickCount * 4) : 20,
        conversion ? Math.min(100, conversion * 20) : 20,
      ]);

      return createExperimentVariant({
        id: publish.id,
        label: publish.title,
        detail: `${publish.viewCount} views, ${publish.clickCount} clicks, ${submissionCount} submissions`,
        metricLabel: "Conversion",
        metricValue: `${conversion}%`,
        score,
      });
    }),
  });
}

function createEmailExperiment(
  items: ContentScheduleSummary[],
): PublishingExperimentView | null {
  const emailItems = items.filter((item) => item.channel === "Email");
  if (!emailItems.length) return null;

  return createExperiment({
    id: "email-copy-experiment",
    title: "Email copy experiment",
    channelId: "email",
    hypothesis: "Compare scheduled email variants by send readiness and copy depth.",
    variants: emailItems.map((item) =>
      createExperimentVariant({
        id: item.id,
        label: item.title,
        detail: item.caption || "No send notes attached.",
        metricLabel: "Readiness",
        metricValue: item.caption ? "Captioned" : "Missing copy",
        score:
          item.status === "published"
            ? 100
            : item.caption.trim()
              ? 75
              : 35,
      }),
    ),
  });
}

function createCampaignExperiments(
  campaigns: CampaignBoardSummary[],
): Array<PublishingExperimentView | null> {
  return campaigns.map((campaign) => {
    if (!campaign.deliverables.length) return null;

    return createExperiment({
      id: `campaign-${campaign.id}-experiment`,
      title: `${campaign.name} deliverable experiment`,
      channelId: "campaign",
      hypothesis:
        "Compare campaign deliverables by approval and completion signal.",
      variants: campaign.deliverables.map((deliverable) =>
        createExperimentVariant({
          id: deliverable.id,
          label: deliverable.projectName ?? deliverable.role,
          detail: `${deliverable.role} for ${deliverable.channel}`,
          metricLabel: "State",
          metricValue: `${deliverable.approvalStatus}/${deliverable.status}`,
          score: average([
            deliverable.approvalStatus === "approved" ? 100 : 45,
            deliverable.status === "done"
              ? 100
              : deliverable.status === "in-progress"
                ? 65
                : 35,
          ]),
        }),
      ),
    });
  });
}

function createVariantExperiments(
  projects: ProjectSummary[],
): Array<PublishingExperimentView | null> {
  return Array.from(groupReusableVariants(projects).entries()).map(
    ([key, variants]) =>
      createExperiment({
        id: `variant-${key}-experiment`,
        title: `${variants[0]?.variantName ?? "Reusable"} content variants`,
        channelId: "variant",
        hypothesis: "Compare reusable resized variants by approval and freshness.",
        variants: variants.map((variant) =>
          createExperimentVariant({
            id: variant.id,
            label: variant.name,
            detail: `${variant.variantName ?? variant.variantProfileId ?? "Variant"} - ${variant.width} x ${variant.height}`,
            metricLabel: "Approval",
            metricValue: approvalLabel(variant.approvalStatus),
            score:
              variant.approvalStatus === "approved"
                ? 100
                : variant.approvalStatus === "in-review"
                  ? 70
                  : variant.approvalStatus === "draft"
                    ? 45
                    : 20,
          }),
        ),
      }),
  );
}

function createExperiment(input: {
  id: string;
  title: string;
  channelId: PublishingChannelId | "variant";
  hypothesis: string;
  variants: PublishingExperimentVariant[];
}): PublishingExperimentView {
  const score = average(input.variants.map((variant) => variant.score));
  const sortedVariants = [...input.variants].sort(
    (left, right) =>
      right.score - left.score || left.label.localeCompare(right.label),
  );
  const winner = sortedVariants[0] ?? null;

  return {
    id: input.id,
    title: input.title,
    channelId: input.channelId,
    hypothesis: input.hypothesis,
    status: scoreToStatus(score),
    score,
    variants: sortedVariants,
    winnerLabel: winner?.label ?? null,
    nextAction:
      score >= 80
        ? "Promote the winning variant and keep monitoring the next result window."
        : "Improve weak variants before declaring a winner.",
  };
}

function createExperimentVariant(input: {
  id: string;
  label: string;
  detail: string;
  metricLabel: string;
  metricValue: number | string;
  score: number;
}): PublishingExperimentVariant {
  return {
    ...input,
    status: scoreToStatus(input.score),
  };
}

function groupReusableVariants(projects: ProjectSummary[]) {
  const grouped = new Map<string, ProjectSummary[]>();

  for (const project of projects) {
    if (
      project.deletedAt ||
      (!project.sourceProjectId && !project.variantProfileId)
    ) {
      continue;
    }

    const key = project.sourceProjectId ?? `profile-${project.variantProfileId}`;
    grouped.set(key, [...(grouped.get(key) ?? []), project]);
  }

  return grouped;
}

function average(values: number[]) {
  if (!values.length) return 0;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function ratioScore(current: number, target: number) {
  if (!target) return 0;

  return Math.min(100, Math.round((current / target) * 100));
}

function scoreToStatus(score: number): PublishingChannelStatus {
  if (score >= 80) return "ready";
  if (score >= 50) return "attention";

  return "blocked";
}

const statusWeight: Record<PublishingChannelStatus, number> = {
  blocked: 0,
  attention: 1,
  ready: 2,
};

function normalizeChannelKey(channel: string) {
  return channel.trim().toLowerCase() === "email"
    ? "email"
    : channel.trim().toLowerCase() || "social";
}

function formatTitle(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function approvalLabel(status: ProjectSummary["approvalStatus"]) {
  if (status === "approved") return "Approved";
  if (status === "in-review") return "In review";
  if (status === "changes-requested") return "Changes requested";

  return "Draft";
}
