import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type {
  WebsiteFormSubmissionSummary,
  WebsitePublishSummary,
} from "@/db/website-publishing";
import type { ProjectSummary } from "@/features/editor/types";
import type {
  PublishingChannelId,
  PublishingChannelRollup,
  PublishingChannelStatus,
  PublishingChannelTotals,
} from "@/features/publishing/publishing-channel-depth";
import {
  createPublishingAttributionSources,
  createPublishingExperimentViews,
  type PublishingAttributionSource,
  type PublishingExperimentView,
} from "@/features/publishing/publishing-attribution-experiments";

export type PublishingAnalyticsGoal = {
  id: string;
  channelId: PublishingChannelId;
  label: string;
  target: number;
  current: number;
  progress: number;
  status: PublishingChannelStatus;
  detail: string;
};

export type PublishingPerformanceSnapshot = {
  id: string;
  title: string;
  score: number;
  status: PublishingChannelStatus;
  summary: string;
  metrics: Array<{
    label: string;
    value: number | string;
  }>;
};

export type PublishingAnomalyNote = {
  id: string;
  channelId?: PublishingChannelId;
  severity: PublishingChannelStatus;
  title: string;
  detail: string;
  nextAction: string;
};

export type PublishingStakeholderReviewPacket = {
  id: string;
  title: string;
  status: PublishingChannelStatus;
  score: number;
  summary: string;
  highlights: string[];
  risks: string[];
  nextActions: string[];
};

export type {
  PublishingAttributionSource,
  PublishingExperimentVariant,
  PublishingExperimentView,
} from "@/features/publishing/publishing-attribution-experiments";

export type PublishingAnalyticsWorkspace = {
  status: PublishingChannelStatus;
  score: number;
  goals: PublishingAnalyticsGoal[];
  snapshots: PublishingPerformanceSnapshot[];
  anomalies: PublishingAnomalyNote[];
  attributionSources: PublishingAttributionSource[];
  experiments: PublishingExperimentView[];
  stakeholderPacket: PublishingStakeholderReviewPacket;
};

export function createPublishingAnalyticsWorkspace(input: {
  channels: PublishingChannelRollup[];
  totals: PublishingChannelTotals;
  projects?: ProjectSummary[];
  contentScheduleItems?: ContentScheduleSummary[];
  campaigns?: CampaignBoardSummary[];
  websitePublishes?: WebsitePublishSummary[];
  websiteFormSubmissions?: WebsiteFormSubmissionSummary[];
}): PublishingAnalyticsWorkspace {
  const goals = input.channels.map(createGoalForChannel);
  const snapshots = createPerformanceSnapshots(input.channels, input.totals);
  const anomalies = createAnomalyNotes(input.channels, input.totals);
  const attributionSources = createPublishingAttributionSources({
    projects: input.projects ?? [],
    contentScheduleItems: input.contentScheduleItems ?? [],
    campaigns: input.campaigns ?? [],
    websitePublishes: input.websitePublishes ?? [],
    websiteFormSubmissions: input.websiteFormSubmissions ?? [],
  });
  const experiments = createPublishingExperimentViews({
    projects: input.projects ?? [],
    contentScheduleItems: input.contentScheduleItems ?? [],
    campaigns: input.campaigns ?? [],
    websitePublishes: input.websitePublishes ?? [],
    websiteFormSubmissions: input.websiteFormSubmissions ?? [],
  });
  const score = Math.round(
    (average(goals.map((goal) => goal.progress)) +
      average(snapshots.map((snapshot) => snapshot.score)) +
      average(attributionSources.map((source) => source.score)) +
      average(experiments.map((experiment) => experiment.score))) /
      4,
  );
  const status = scoreToStatus(score);

  return {
    status,
    score,
    goals,
    snapshots,
    anomalies,
    attributionSources,
    experiments,
    stakeholderPacket: createStakeholderPacket({
      channels: input.channels,
      totals: input.totals,
      snapshots,
      anomalies,
      score,
      status,
    }),
  };
}

function createGoalForChannel(
  channel: PublishingChannelRollup,
): PublishingAnalyticsGoal {
  if (channel.id === "website") {
    const target = Math.max(1, Math.ceil(channel.analytics.views * 0.03));

    return createGoal({
      id: "website-conversion-goal",
      channelId: channel.id,
      label: "Website response goal",
      current: channel.analytics.submissions,
      target,
      detail: `${channel.analytics.submissions} submissions from ${channel.analytics.views} views`,
    });
  }

  if (channel.id === "campaign") {
    const target = Math.max(1, channel.analytics.deliverables);

    return createGoal({
      id: "campaign-completion-goal",
      channelId: channel.id,
      label: "Campaign completion goal",
      current: channel.analytics.published,
      target,
      detail: `${channel.analytics.published} of ${target} campaign deliverables completed`,
    });
  }

  if (channel.id === "email") {
    const target = Math.max(1, channel.analytics.deliverables);

    return createGoal({
      id: "email-send-goal",
      channelId: channel.id,
      label: "Email send coverage",
      current: channel.analytics.planned + channel.analytics.published,
      target,
      detail: `${channel.analytics.planned + channel.analytics.published} scheduled or sent email items`,
    });
  }

  const target = Math.max(1, channel.analytics.deliverables);

  return createGoal({
    id: "social-rollout-goal",
    channelId: channel.id,
    label: "Social rollout coverage",
    current: channel.analytics.planned + channel.analytics.published,
    target,
    detail: `${channel.analytics.planned + channel.analytics.published} social items queued or published`,
  });
}

function createGoal(input: {
  id: string;
  channelId: PublishingChannelId;
  label: string;
  target: number;
  current: number;
  detail: string;
}): PublishingAnalyticsGoal {
  const progress = ratioScore(input.current, input.target);

  return {
    ...input,
    progress,
    status: scoreToStatus(progress),
  };
}

function createPerformanceSnapshots(
  channels: PublishingChannelRollup[],
  totals: PublishingChannelTotals,
): PublishingPerformanceSnapshot[] {
  const website = channelById(channels, "website");
  const campaign = channelById(channels, "campaign");
  const averageChannelScore = average(channels.map((channel) => channel.score));

  return [
    {
      id: "workspace-performance",
      title: "Workspace performance",
      score: averageChannelScore,
      status: scoreToStatus(averageChannelScore),
      summary: `${totals.published} published from ${totals.planned + totals.published} queued items across ${totals.channels} channels.`,
      metrics: [
        { label: "Planned", value: totals.planned },
        { label: "Published", value: totals.published },
        { label: "Deliverables", value: totals.deliverables },
      ],
    },
    {
      id: "audience-response",
      title: "Audience response",
      score: website?.analytics.views
        ? ratioScore(
            website.analytics.submissions,
            Math.ceil(website.analytics.views * 0.03),
          )
        : 45,
      status: scoreToStatus(
        website?.analytics.views
          ? ratioScore(
              website.analytics.submissions,
              Math.ceil(website.analytics.views * 0.03),
            )
          : 45,
      ),
      summary: `${totals.views} views, ${totals.clicks} clicks, and ${totals.submissions} form submissions.`,
      metrics: [
        { label: "Views", value: totals.views },
        { label: "Clicks", value: totals.clicks },
        { label: "Submissions", value: totals.submissions },
        {
          label: "Response rate",
          value: `${totals.views ? Math.round((totals.submissions / totals.views) * 100) : 0}%`,
        },
      ],
    },
    {
      id: "campaign-readiness",
      title: "Campaign readiness",
      score: campaign?.score ?? 0,
      status: campaign?.status ?? "blocked",
      summary: `${campaign?.analytics.campaigns ?? 0} campaign boards and ${campaign?.analytics.deliverables ?? 0} mapped deliverables.`,
      metrics: [
        { label: "Campaigns", value: campaign?.analytics.campaigns ?? 0 },
        { label: "Deliverables", value: campaign?.analytics.deliverables ?? 0 },
        { label: "Completed", value: campaign?.analytics.published ?? 0 },
      ],
    },
  ];
}

function createAnomalyNotes(
  channels: PublishingChannelRollup[],
  totals: PublishingChannelTotals,
): PublishingAnomalyNote[] {
  const anomalies: PublishingAnomalyNote[] = [];

  for (const channel of channels) {
    const weakestCheck = [...channel.checks].sort(
      (left, right) => left.score - right.score,
    )[0];

    if (channel.status === "blocked") {
      anomalies.push({
        id: `${channel.id}-blocked`,
        channelId: channel.id,
        severity: "blocked",
        title: `${channel.name} is blocked`,
        detail: weakestCheck?.detail ?? "Channel setup needs review.",
        nextAction: `Resolve the lowest ${channel.name.toLowerCase()} readiness check.`,
      });
    } else if (channel.status === "attention") {
      anomalies.push({
        id: `${channel.id}-attention`,
        channelId: channel.id,
        severity: "attention",
        title: `${channel.name} needs attention`,
        detail: weakestCheck?.detail ?? "Channel setup needs review.",
        nextAction: `Improve the weakest ${channel.name.toLowerCase()} signal before the next review.`,
      });
    }

    if (channel.analytics.cancelled > channel.analytics.published) {
      anomalies.push({
        id: `${channel.id}-cancelled-pressure`,
        channelId: channel.id,
        severity: "attention",
        title: `${channel.name} has cancellation pressure`,
        detail: `${channel.analytics.cancelled} cancelled items versus ${channel.analytics.published} published items.`,
        nextAction: "Review cancelled work and replace necessary items on the planner.",
      });
    }
  }

  if (totals.views >= 50 && totals.submissions === 0) {
    anomalies.push({
      id: "website-traffic-no-submissions",
      channelId: "website",
      severity: "attention",
      title: "Website traffic has no submissions",
      detail: `${totals.views} views have produced no form submissions yet.`,
      nextAction: "Review calls to action, form placement, and page offer clarity.",
    });
  }

  if (totals.clicks > totals.views) {
    anomalies.push({
      id: "clicks-exceed-views",
      channelId: "website",
      severity: "attention",
      title: "Click count is higher than view count",
      detail: `${totals.clicks} clicks are recorded against ${totals.views} views.`,
      nextAction: "Check analytics event duplication before sharing the report.",
    });
  }

  return anomalies.slice(0, 8);
}

function createStakeholderPacket(input: {
  channels: PublishingChannelRollup[];
  totals: PublishingChannelTotals;
  snapshots: PublishingPerformanceSnapshot[];
  anomalies: PublishingAnomalyNote[];
  score: number;
  status: PublishingChannelStatus;
}): PublishingStakeholderReviewPacket {
  const readyChannels = input.channels.filter(
    (channel) => channel.status === "ready",
  );
  const risks = input.anomalies.map(
    (anomaly) => `${anomaly.title}: ${anomaly.nextAction}`,
  );
  const nextActions = input.channels
    .filter((channel) => channel.status !== "ready")
    .sort(
      (left, right) =>
        statusWeight[left.status] - statusWeight[right.status] ||
        left.score - right.score,
    )
    .map((channel) => {
      const weakestCheck = [...channel.checks].sort(
        (left, right) => left.score - right.score,
      )[0];

      return weakestCheck
        ? `${channel.name}: ${weakestCheck.label} - ${weakestCheck.detail}`
        : `${channel.name}: review setup`;
    })
    .slice(0, 5);

  return {
    id: "publishing-stakeholder-packet",
    title: "Publishing stakeholder review",
    status: input.status,
    score: input.score,
    summary: `${readyChannels.length} of ${input.channels.length} channels are ready with ${input.totals.published} published items, ${input.totals.views} views, and ${input.totals.submissions} submissions.`,
    highlights: [
      `${readyChannels.length} ready channel${readyChannels.length === 1 ? "" : "s"}`,
      `${input.totals.published} published item${input.totals.published === 1 ? "" : "s"}`,
      `${input.totals.deliverables} campaign deliverable${input.totals.deliverables === 1 ? "" : "s"}`,
      ...input.snapshots
        .filter((snapshot) => snapshot.status === "ready")
        .map((snapshot) => `${snapshot.title}: ${snapshot.summary}`),
    ].slice(0, 6),
    risks: risks.length
      ? risks.slice(0, 6)
      : ["No major publishing anomalies detected."],
    nextActions: nextActions.length
      ? nextActions
      : ["Share the packet with stakeholders and continue monitoring results."],
  };
}

function channelById(
  channels: PublishingChannelRollup[],
  channelId: PublishingChannelId,
) {
  return channels.find((channel) => channel.id === channelId);
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
