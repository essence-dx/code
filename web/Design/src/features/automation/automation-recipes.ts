import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectSummary } from "@/features/editor/types";

export const automationRecipeIds = [
  "scheduled-export",
  "publishing-reminder",
  "review-nudge",
  "campaign-cadence",
] as const;

export type AutomationRecipeId = (typeof automationRecipeIds)[number];

export type AutomationRecipeTarget = {
  id: string;
  label: string;
  helper: string;
};

export type AutomationRecipeSummary = {
  id: AutomationRecipeId;
  title: string;
  description: string;
  targetLabel: string;
  actionLabel: string;
  defaultStartAt: string;
  cadenceDays: number | null;
  targets: AutomationRecipeTarget[];
  disabledReason: string | null;
  metrics: Array<{ label: string; value: string }>;
};

export function createAutomationRecipeSummaries(input: {
  projects: ProjectSummary[];
  campaigns: CampaignBoardSummary[];
  reviewTasks: ReviewTaskSummary[];
  contentScheduleItems: ContentScheduleSummary[];
  serverExportJobs: ServerExportJobSummary[];
  now?: Date;
}): AutomationRecipeSummary[] {
  const now = input.now ?? new Date();
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const projectsWithoutCompletedExport = activeProjects.filter(
    (project) =>
      !input.serverExportJobs.some(
        (job) => job.projectId === project.id && job.status === "completed",
      ),
  );
  const openReviewTasks = input.reviewTasks.filter(
    (task) => task.taskStatus !== "done",
  );
  const campaignTargets = input.campaigns.filter((campaign) =>
    campaign.deliverables.some((deliverable) => deliverable.projectId),
  );
  const upcomingPlannedItems = input.contentScheduleItems.filter(
    (item) =>
      item.status === "planned" &&
      new Date(item.scheduledAt).getTime() >= startOfDay(now).getTime(),
  );

  return [
    {
      id: "scheduled-export",
      title: "Scheduled export prep",
      description:
        "Queue a durable PDF handoff export request and remind the workspace to complete the final artifact.",
      targetLabel: "Design",
      actionLabel: "Queue export",
      defaultStartAt: addDays(now, 1).toISOString(),
      cadenceDays: null,
      targets: projectTargets(
        projectsWithoutCompletedExport.length
          ? projectsWithoutCompletedExport
          : activeProjects,
      ),
      disabledReason: activeProjects.length
        ? null
        : "Create a design before applying this recipe.",
      metrics: [
        {
          label: "Missing exports",
          value: String(projectsWithoutCompletedExport.length),
        },
        {
          label: "Server exports",
          value: String(input.serverExportJobs.length),
        },
      ],
    },
    {
      id: "publishing-reminder",
      title: "Publishing reminder",
      description:
        "Create a planned content item so a design has a visible publishing reminder on the calendar.",
      targetLabel: "Design",
      actionLabel: "Schedule reminder",
      defaultStartAt: addDays(now, 2).toISOString(),
      cadenceDays: null,
      targets: projectTargets(activeProjects),
      disabledReason: activeProjects.length
        ? null
        : "Create a design before scheduling reminders.",
      metrics: [
        {
          label: "Planned items",
          value: String(upcomingPlannedItems.length),
        },
        {
          label: "Active designs",
          value: String(activeProjects.length),
        },
      ],
    },
    {
      id: "review-nudge",
      title: "Review nudge",
      description:
        "Send a workspace notification that groups open review tasks and points reviewers back to the dashboard.",
      targetLabel: "Review scope",
      actionLabel: "Send nudge",
      defaultStartAt: now.toISOString(),
      cadenceDays: null,
      targets: reviewTargets(openReviewTasks),
      disabledReason: openReviewTasks.length
        ? null
        : "No open review tasks need a nudge.",
      metrics: [
        {
          label: "Open tasks",
          value: String(openReviewTasks.length),
        },
        {
          label: "Assigned",
          value: String(
            openReviewTasks.filter((task) => task.taskAssigneeName).length,
          ),
        },
      ],
    },
    {
      id: "campaign-cadence",
      title: "Recurring campaign tasks",
      description:
        "Schedule campaign deliverables into the content planner with a reusable cadence.",
      targetLabel: "Campaign",
      actionLabel: "Create cadence",
      defaultStartAt:
        nearestCampaignLaunch(campaignTargets, now) ?? addDays(now, 3).toISOString(),
      cadenceDays: 3,
      targets: campaignTargets.map((campaign) => ({
        id: campaign.id,
        label: campaign.name,
        helper: `${campaign.deliverables.length} deliverables`,
      })),
      disabledReason: campaignTargets.length
        ? null
        : "Create a campaign with deliverables before applying this recipe.",
      metrics: [
        {
          label: "Campaigns",
          value: String(campaignTargets.length),
        },
        {
          label: "Deliverables",
          value: String(
            campaignTargets.reduce(
              (total, campaign) => total + campaign.deliverables.length,
              0,
            ),
          ),
        },
      ],
    },
  ];
}

export function normalizeAutomationRecipeId(
  value: unknown,
): AutomationRecipeId | null {
  return automationRecipeIds.includes(value as AutomationRecipeId)
    ? (value as AutomationRecipeId)
    : null;
}

export function normalizeAutomationCadenceDays(value: unknown) {
  const parsed =
    typeof value === "string" || typeof value === "number"
      ? Number(value)
      : 3;

  if (!Number.isFinite(parsed)) return 3;

  return Math.max(1, Math.min(30, Math.round(parsed)));
}

function projectTargets(projects: ProjectSummary[]): AutomationRecipeTarget[] {
  return projects.slice(0, 12).map((project) => ({
    id: project.id,
    label: project.name,
    helper: `${project.width}x${project.height}`,
  }));
}

function reviewTargets(tasks: ReviewTaskSummary[]): AutomationRecipeTarget[] {
  const grouped = new Map<string, { projectName: string; count: number }>();

  for (const task of tasks) {
    const current = grouped.get(task.projectId) ?? {
      projectName: task.projectName,
      count: 0,
    };

    grouped.set(task.projectId, {
      projectName: current.projectName,
      count: current.count + 1,
    });
  }

  return Array.from(grouped.entries()).map(([projectId, item]) => ({
    id: projectId,
    label: item.projectName,
    helper: `${item.count} open task${item.count === 1 ? "" : "s"}`,
  }));
}

function nearestCampaignLaunch(
  campaigns: CampaignBoardSummary[],
  now: Date,
) {
  const launches = campaigns
    .map((campaign) => campaign.launchAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((date) => date.getTime() >= now.getTime())
    .sort((left, right) => left.getTime() - right.getTime());

  return launches[0]?.toISOString() ?? null;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);

  next.setDate(next.getDate() + days);
  next.setHours(9, 0, 0, 0);

  return next;
}

function startOfDay(date: Date) {
  const day = new Date(date);

  day.setHours(0, 0, 0, 0);

  return day;
}
