import type {
  NotificationDigestPreview,
  NotificationRouteTopic,
} from "@/features/notifications/notification-preference-routing-types";
import type {
  WorkspaceAnomalyExplanation,
  WorkspaceExecutiveSummary,
  WorkspaceIntelligenceActionPriority,
  WorkspaceIntelligenceArea,
  WorkspaceIntelligenceBriefingCenter,
  WorkspaceIntelligenceBriefingInput,
  WorkspaceIntelligenceDigestCadence,
  WorkspaceIntelligenceDigestPacket,
  WorkspaceIntelligenceSeverity,
  WorkspaceIntelligenceStatus,
  WorkspaceRecommendedAction,
} from "@/features/workspace-intelligence/workspace-intelligence-briefings-types";

export type {
  WorkspaceAnomalyExplanation,
  WorkspaceExecutiveSummary,
  WorkspaceIntelligenceActionPriority,
  WorkspaceIntelligenceArea,
  WorkspaceIntelligenceBriefingCenter,
  WorkspaceIntelligenceBriefingInput,
  WorkspaceIntelligenceDigestCadence,
  WorkspaceIntelligenceDigestPacket,
  WorkspaceIntelligenceSeverity,
  WorkspaceIntelligenceStatus,
  WorkspaceRecommendedAction,
} from "@/features/workspace-intelligence/workspace-intelligence-briefings-types";

type WorkspaceBriefingAreaSource = {
  area: WorkspaceIntelligenceArea;
  title: string;
  status: WorkspaceIntelligenceStatus;
  score: number;
  headline: string;
  detail: string;
  evidence: string[];
  nextActions: string[];
};

export function createWorkspaceIntelligenceBriefingCenter(
  input: WorkspaceIntelligenceBriefingInput,
): WorkspaceIntelligenceBriefingCenter {
  const now = normalizeDate(input.now);
  const generatedAt = now.toISOString();
  const areaSources = createAreaSources(input);
  const executiveSummaries = areaSources
    .map(createExecutiveSummary)
    .sort(compareExecutiveSummaries);
  const recommendedActions = createRecommendedActions(input, areaSources);
  const anomalyExplanations = areaSources
    .filter((source) => source.status !== "ready")
    .map((source) => createAnomalyExplanation(source, recommendedActions))
    .sort(compareAnomalyExplanations);
  const digestPackets = createDigestPackets({
    input,
    generatedAt,
    executiveSummaries,
    anomalyExplanations,
    recommendedActions,
    now,
  });
  const status = aggregateStatus(areaSources.map((source) => source.status));
  const score = average(
    areaSources.map((source) => source.score),
    100,
  );
  const executiveNarrative = createExecutiveNarrative({
    workspaceName: input.workspaceName,
    status,
    score,
    executiveSummaries,
    anomalyExplanations,
  });

  return {
    generatedAt,
    workspaceName: input.workspaceName,
    status,
    score,
    executiveNarrative,
    executiveSummaries,
    anomalyExplanations,
    recommendedActions,
    digestPackets,
    nextActions: recommendedActions
      .slice(0, 6)
      .map((action) => `${action.title}: ${action.detail}`),
    totals: {
      executiveSummaries: executiveSummaries.length,
      anomalyExplanations: anomalyExplanations.length,
      recommendedActions: recommendedActions.length,
      digestPackets: digestPackets.length,
      criticalAnomalies: anomalyExplanations.filter(
        (anomaly) => anomaly.severity === "critical",
      ).length,
      watchAnomalies: anomalyExplanations.filter(
        (anomaly) => anomaly.severity === "watch",
      ).length,
      unreadDigestItems: input.notificationRouting.digestPreview.totalUnread,
      recentAuditEvents: input.auditLogs.length,
    },
  };
}

function createAreaSources(
  input: WorkspaceIntelligenceBriefingInput,
): WorkspaceBriefingAreaSource[] {
  return [
    createObservabilitySource(input),
    createContentOperationsSource(input),
    createPublishingSource(input),
    createPerformanceSource(input),
    createReleaseGovernanceSource(input),
  ];
}

function createObservabilitySource(
  input: WorkspaceIntelligenceBriefingInput,
): WorkspaceBriefingAreaSource {
  const incidents = input.observability.groups.flatMap(
    (group) => group.incidents,
  );
  const topIncident = incidents.sort(compareIncidents)[0];

  return {
    area: "observability",
    title: "Production health",
    status: normalizeObservabilityStatus(input.observability.status),
    score: input.observability.score,
    headline: topIncident
      ? topIncident.title
      : "Production surfaces are not reporting active incidents.",
    detail: topIncident
      ? topIncident.detail
      : `${input.observability.totals.incidents} active production incidents across export, email, publishing, storage, and collaboration surfaces.`,
    evidence: [
      `${input.observability.totals.critical} critical incidents`,
      `${input.observability.totals.watch} watch incidents`,
      `${input.observability.groups.length} monitored groups`,
      `Checked ${formatDateTime(input.observability.checkedAt)}`,
    ],
    nextActions: topIncident
      ? [`Resolve ${topIncident.title}: ${topIncident.detail}`]
      : [],
  };
}

function createContentOperationsSource(
  input: WorkspaceIntelligenceBriefingInput,
): WorkspaceBriefingAreaSource {
  const totals = input.contentOperations.totals;

  return {
    area: "content-operations",
    title: "Content operations",
    status: input.contentOperations.status,
    score: input.contentOperations.score,
    headline: totals.publicationGaps
      ? `${totals.publicationGaps} publication gaps before campaign launch.`
      : "Campaign publishing calendars are covered.",
    detail: `${totals.campaigns} campaigns carry ${totals.deliverables} deliverables with ${totals.scheduledItems} scheduled planner items and ${totals.blockedCampaigns} blocked campaigns.`,
    evidence: [
      `${totals.campaigns} campaigns`,
      `${totals.deliverables} deliverables`,
      `${totals.publicationGaps} publication gaps`,
      `${totals.teamMembers} team members`,
    ],
    nextActions: input.contentOperations.nextActions,
  };
}

function createPublishingSource(
  input: WorkspaceIntelligenceBriefingInput,
): WorkspaceBriefingAreaSource {
  const totals = input.publishing.totals;

  return {
    area: "publishing",
    title: "Publishing channels",
    status: normalizePublishingStatus(input.publishing.status),
    score: input.publishing.score,
    headline: `${totals.published} published items against ${totals.planned} planned items.`,
    detail: `${totals.channels} channels cover ${totals.deliverables} campaign deliverables, ${totals.views} views, ${totals.clicks} clicks, and ${totals.submissions} submissions.`,
    evidence: [
      `${totals.channels} channels`,
      `${totals.planned} planned`,
      `${totals.published} published`,
      `${totals.submissions} submissions`,
    ],
    nextActions: input.publishing.nextActions,
  };
}

function createPerformanceSource(
  input: WorkspaceIntelligenceBriefingInput,
): WorkspaceBriefingAreaSource {
  const totals = input.performance.totals;

  return {
    area: "performance",
    title: "Workspace performance",
    status: input.performance.status,
    score: input.performance.score,
    headline: totals.slowSurfaceDiagnostics
      ? `${totals.slowSurfaceDiagnostics} slow workspace surfaces need recovery.`
      : "Workspace performance budgets are clear.",
    detail: `${totals.projects} projects represent ${formatBytes(totals.totalAssetBytes)} in assets with ${totals.recoveryRecommendations} recovery recommendations.`,
    evidence: [
      `${totals.projects} projects`,
      `${totals.slowSurfaceDiagnostics} slow diagnostics`,
      `${totals.blockedProjects} blocked projects`,
      `${formatBytes(totals.totalAssetBytes)} assets`,
    ],
    nextActions: input.performance.nextActions,
  };
}

function createReleaseGovernanceSource(
  input: WorkspaceIntelligenceBriefingInput,
): WorkspaceBriefingAreaSource {
  const totals = input.releaseGovernance.totals;

  return {
    area: "release-governance",
    title: "Release governance",
    status: input.releaseGovernance.status,
    score: input.releaseGovernance.score,
    headline: `${totals.reviewGates} release gates need review before stable rollout.`,
    detail: `${totals.affectedProjects} projects and ${totals.publicSurfaces} public surfaces are affected by release governance checks.`,
    evidence: [
      `${totals.componentAdoptionGates} adoption gates`,
      `${totals.breakingChangePreviews} breaking previews`,
      `${totals.affectedProjects} affected projects`,
      `${totals.downstreamImpactPackets} downstream packets`,
    ],
    nextActions: input.releaseGovernance.nextActions,
  };
}

function createExecutiveSummary(
  source: WorkspaceBriefingAreaSource,
): WorkspaceExecutiveSummary {
  return {
    id: `summary-${source.area}`,
    area: source.area,
    title: source.title,
    status: source.status,
    score: source.score,
    headline: source.headline,
    detail: source.detail,
    evidence: source.evidence,
  };
}

function createAnomalyExplanation(
  source: WorkspaceBriefingAreaSource,
  actions: WorkspaceRecommendedAction[],
): WorkspaceAnomalyExplanation {
  const action = actions.find((item) => item.area === source.area);

  return {
    id: `anomaly-${source.area}`,
    area: source.area,
    severity: source.status === "blocked" ? "critical" : "watch",
    title: `${source.title}: ${source.headline}`,
    explanation: `${source.headline} ${source.detail}`,
    evidence: source.evidence,
    recommendedActionId: action?.id ?? "",
  };
}

function createRecommendedActions(
  input: WorkspaceIntelligenceBriefingInput,
  areaSources: WorkspaceBriefingAreaSource[],
): WorkspaceRecommendedAction[] {
  const areaActions = areaSources.flatMap((source) =>
    source.nextActions.slice(0, 3).map((action, index) =>
      createAction({
        id: `action-${source.area}-${index + 1}`,
        area: source.area,
        priority: priorityFromStatus(source.status),
        title: action.split(":")[0]?.trim() || source.title,
        detail: action,
        ownerHint: ownerHintByArea[source.area],
      }),
    ),
  );
  const notificationActions = input.notificationRouting.nextActions
    .slice(0, 2)
    .map((action, index) =>
      createAction({
        id: `action-notifications-${index + 1}`,
        area: "notifications",
        priority:
          input.notificationRouting.status === "blocked" ? "critical" : "high",
        title: action.split(":")[0]?.trim() || "Notification routing",
        detail: action,
        ownerHint: "Workspace admin",
      }),
    );

  return uniqueById([...areaActions, ...notificationActions])
    .sort(compareRecommendedActions)
    .slice(0, 8);
}

function createAction(input: WorkspaceRecommendedAction) {
  return input;
}

function createDigestPackets(input: {
  input: WorkspaceIntelligenceBriefingInput;
  generatedAt: string;
  executiveSummaries: WorkspaceExecutiveSummary[];
  anomalyExplanations: WorkspaceAnomalyExplanation[];
  recommendedActions: WorkspaceRecommendedAction[];
  now: Date;
}): WorkspaceIntelligenceDigestPacket[] {
  const daily = createDigestPacket({
    source: input,
    cadence: input.input.notificationRouting.digestPreview.cadence,
    audience: "Executive daily brief",
    scheduledFor: input.input.notificationRouting.digestPreview.scheduledFor,
    topics: createDigestTopics(input.input.notificationRouting.digestPreview),
  });
  const weekly = createDigestPacket({
    source: input,
    cadence: "weekly",
    audience: "Operator weekly recovery brief",
    scheduledFor: createWeeklyDigestAt(input.now).toISOString(),
    topics: [
      "observability",
      "content-operations",
      "publishing",
      "performance",
      "release-governance",
    ],
  });

  return [daily, weekly];
}

function createDigestPacket(input: {
  source: {
    input: WorkspaceIntelligenceBriefingInput;
    generatedAt: string;
    executiveSummaries: WorkspaceExecutiveSummary[];
    anomalyExplanations: WorkspaceAnomalyExplanation[];
    recommendedActions: WorkspaceRecommendedAction[];
  };
  cadence: WorkspaceIntelligenceDigestCadence;
  audience: string;
  scheduledFor: string;
  topics: string[];
}): WorkspaceIntelligenceDigestPacket {
  const payload = {
    kind: "essence-studio.workspace-intelligence-briefing",
    schemaVersion: 1,
    workspaceName: input.source.input.workspaceName,
    generatedAt: input.source.generatedAt,
    cadence: input.cadence,
    audience: input.audience,
    scheduledFor: input.scheduledFor,
    topics: input.topics,
    executiveNarrative: createExecutiveNarrative({
      workspaceName: input.source.input.workspaceName,
      status: aggregateStatus(
        input.source.executiveSummaries.map((summary) => summary.status),
      ),
      score: average(
        input.source.executiveSummaries.map((summary) => summary.score),
        100,
      ),
      executiveSummaries: input.source.executiveSummaries,
      anomalyExplanations: input.source.anomalyExplanations,
    }),
    executiveSummaries: input.source.executiveSummaries,
    anomalyExplanations: input.source.anomalyExplanations,
    recommendedActions: input.source.recommendedActions,
    recentAuditLogIds: input.source.input.auditLogs.map((log) => log.id),
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    id: `workspace-briefing-${input.cadence}`,
    cadence: input.cadence,
    audience: input.audience,
    scheduledFor: input.scheduledFor,
    topics: input.topics,
    fileName: `workspace-intelligence-${input.cadence}-${slugify(input.source.input.workspaceName)}.json`,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    json,
  };
}

function createDigestTopics(preview: NotificationDigestPreview) {
  return Object.entries(preview.topicCounts)
    .filter(([, count]) => count > 0)
    .map(([topic]) => topic as NotificationRouteTopic);
}

function createExecutiveNarrative(input: {
  workspaceName: string;
  status: WorkspaceIntelligenceStatus;
  score: number;
  executiveSummaries: WorkspaceExecutiveSummary[];
  anomalyExplanations: WorkspaceAnomalyExplanation[];
}) {
  const topSummary = input.executiveSummaries[0];
  const critical = input.anomalyExplanations.filter(
    (anomaly) => anomaly.severity === "critical",
  ).length;
  const watch = input.anomalyExplanations.filter(
    (anomaly) => anomaly.severity === "watch",
  ).length;

  if (!topSummary) {
    return `${input.workspaceName} is ${input.status} at ${input.score}/100 with no briefing signals yet.`;
  }

  return `${input.workspaceName} is ${input.status} at ${input.score}/100. ${topSummary.title} leads the brief: ${topSummary.headline} ${critical} critical and ${watch} watch anomalies need review.`;
}

function normalizePublishingStatus(status: "ready" | "attention" | "blocked") {
  if (status === "attention") return "review";

  return status;
}

function normalizeObservabilityStatus(
  status: "healthy" | "watch" | "critical",
) {
  if (status === "healthy") return "ready";
  if (status === "watch") return "review";

  return "blocked";
}

function aggregateStatus(statuses: WorkspaceIntelligenceStatus[]) {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("review")) return "review";

  return "ready";
}

function priorityFromStatus(
  status: WorkspaceIntelligenceStatus,
): WorkspaceIntelligenceActionPriority {
  if (status === "blocked") return "critical";
  if (status === "review") return "high";

  return "normal";
}

function severityWeight(severity: WorkspaceIntelligenceSeverity) {
  if (severity === "critical") return 2;
  if (severity === "watch") return 1;

  return 0;
}

function statusWeight(status: WorkspaceIntelligenceStatus) {
  if (status === "blocked") return 2;
  if (status === "review") return 1;

  return 0;
}

function compareExecutiveSummaries(
  left: WorkspaceExecutiveSummary,
  right: WorkspaceExecutiveSummary,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    left.score - right.score ||
    left.title.localeCompare(right.title)
  );
}

function compareAnomalyExplanations(
  left: WorkspaceAnomalyExplanation,
  right: WorkspaceAnomalyExplanation,
) {
  return (
    severityWeight(right.severity) - severityWeight(left.severity) ||
    left.title.localeCompare(right.title)
  );
}

function compareRecommendedActions(
  left: WorkspaceRecommendedAction,
  right: WorkspaceRecommendedAction,
) {
  return (
    actionPriorityWeight(right.priority) -
      actionPriorityWeight(left.priority) ||
    left.title.localeCompare(right.title)
  );
}

function compareIncidents(
  left: { status: "healthy" | "watch" | "critical"; title: string },
  right: { status: "healthy" | "watch" | "critical"; title: string },
) {
  return (
    observabilityWeight(right.status) - observabilityWeight(left.status) ||
    left.title.localeCompare(right.title)
  );
}

function observabilityWeight(status: "healthy" | "watch" | "critical") {
  if (status === "critical") return 2;
  if (status === "watch") return 1;

  return 0;
}

function actionPriorityWeight(priority: WorkspaceIntelligenceActionPriority) {
  if (priority === "critical") return 2;
  if (priority === "high") return 1;

  return 0;
}

function createWeeklyDigestAt(now: Date) {
  const scheduled = new Date(now);
  scheduled.setUTCDate(scheduled.getUTCDate() + 7);
  scheduled.setUTCHours(9, 0, 0, 0);

  return scheduled;
}

function normalizeDate(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function average(values: number[], fallback: number) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  const uniqueItems: T[] = [];

  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    uniqueItems.push(item);
  }

  return uniqueItems;
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;

  return `${Math.round(value / (1024 * 1024))} MB`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toISOString();
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace"
  );
}

const ownerHintByArea: Record<WorkspaceIntelligenceArea, string> = {
  observability: "Operations owner",
  "content-operations": "Content lead",
  publishing: "Publishing owner",
  performance: "Studio performance owner",
  "release-governance": "Design system owner",
};
