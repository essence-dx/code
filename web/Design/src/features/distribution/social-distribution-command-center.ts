import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import { createRecoveryPackets } from "@/features/distribution/social-distribution-command-center-packets";
import type {
  SocialApprovalQueueItem,
  SocialCaptionVersion,
  SocialCaptionVersionHistory,
  SocialDistributionCommandCenter,
  SocialDistributionStatus,
  SocialPlatformCropMode,
  SocialPlatformCropPreview,
} from "@/features/distribution/social-distribution-command-center-types";
import {
  aggregateStatus,
  average,
  getSocialCampaignDeliverables,
  getSocialPlatformForChannel,
  getSocialScheduleItems,
  normalizeDate,
  scoreStatus,
  type SocialCampaignDeliverableRef,
  type SocialPlatformSpec,
} from "@/features/distribution/social-distribution-command-center-utils";

export type {
  ScheduledPostRecoveryPacket,
  SocialApprovalQueueItem,
  SocialCaptionVersion,
  SocialCaptionVersionHistory,
  SocialDistributionCommandCenter,
  SocialDistributionStatus,
  SocialPlatformCropMode,
  SocialPlatformCropPreview,
  SocialPlatformId,
} from "@/features/distribution/social-distribution-command-center-types";

export function createSocialDistributionCommandCenter(input: {
  projects: ProjectSummary[];
  projectVersions: ProjectVersionSummary[];
  contentScheduleItems: ContentScheduleSummary[];
  campaigns: CampaignBoardSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: Date | string;
}): SocialDistributionCommandCenter {
  const generatedAt = normalizeDate(input.now).toISOString();
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const projectById = new Map(
    activeProjects.map((project) => [project.id, project]),
  );
  const scheduleItems = getSocialScheduleItems(input.contentScheduleItems);
  const campaignDeliverables = getSocialCampaignDeliverables(input.campaigns);
  const cropPreviews = createCropPreviews({
    scheduleItems,
    campaignDeliverables,
    projectById,
  });
  const approvalQueue = createApprovalQueue({
    scheduleItems,
    campaignDeliverables,
    projectById,
    cropPreviews,
  });
  const captionHistories = createCaptionHistories({
    scheduleItems,
    projectVersions: input.projectVersions,
    auditLogs: input.auditLogs,
  });
  const recoveryPackets = createRecoveryPackets({
    queue: approvalQueue,
    scheduleItems,
    generatedAt,
  });
  const status = aggregateStatus(approvalQueue.map((item) => item.status));
  const score = average([
    average(
      cropPreviews.map((preview) => scoreStatus(preview.status)),
      100,
    ),
    average(
      approvalQueue.map((item) => scoreStatus(item.status)),
      100,
    ),
    average(
      captionHistories.map((history) =>
        history.currentCaption.trim() ? 100 : 45,
      ),
      100,
    ),
  ]);

  return {
    generatedAt,
    status,
    score,
    platformCropPreviews: cropPreviews,
    approvalQueue,
    captionHistories,
    recoveryPackets,
    nextActions: createNextActions({
      approvalQueue,
      cropPreviews,
      recoveryPackets,
    }),
    totals: {
      platforms: new Set(cropPreviews.map((preview) => preview.platformId))
        .size,
      cropPreviews: cropPreviews.length,
      approvalQueue: approvalQueue.length,
      captionHistories: captionHistories.length,
      captionVersions: captionHistories.reduce(
        (total, history) => total + history.versions.length,
        0,
      ),
      recoveryPackets: recoveryPackets.length,
      blockedItems: approvalQueue.filter((item) => item.status === "blocked")
        .length,
    },
  };
}

function createCropPreviews(input: {
  scheduleItems: ContentScheduleSummary[];
  campaignDeliverables: SocialCampaignDeliverableRef[];
  projectById: Map<string, ProjectSummary>;
}): SocialPlatformCropPreview[] {
  const previews = new Map<string, SocialPlatformCropPreview>();

  for (const item of input.scheduleItems) {
    const platform = getSocialPlatformForChannel(item.channel);
    const project = item.projectId
      ? input.projectById.get(item.projectId)
      : null;

    if (!platform || !project) continue;

    previews.set(
      `${platform.id}:${project.id}`,
      createCropPreview(project, platform),
    );
  }

  for (const ref of input.campaignDeliverables) {
    const project = input.projectById.get(ref.deliverable.projectId ?? "");

    if (project) {
      previews.set(
        `${ref.platform.id}:${project.id}`,
        createCropPreview(project, ref.platform),
      );
    }
  }

  return [...previews.values()].sort(
    (left, right) =>
      left.platformLabel.localeCompare(right.platformLabel) ||
      left.projectName.localeCompare(right.projectName),
  );
}

function createCropPreview(
  project: ProjectSummary,
  platform: SocialPlatformSpec,
): SocialPlatformCropPreview {
  const sourceRatio = project.width / project.height;
  const targetRatio = platform.width / platform.height;
  const ratioDelta = Math.abs(sourceRatio - targetRatio);
  const cropMode = getCropMode(sourceRatio, targetRatio, ratioDelta);
  const status = ratioDelta <= 0.03 ? "ready" : "review";
  const scalePercent = Math.round(
    Math.min(platform.width / project.width, platform.height / project.height) *
      100,
  );

  return {
    id: `crop-${platform.id}-${project.id}`,
    platformId: platform.id,
    platformLabel: platform.label,
    projectId: project.id,
    projectName: project.name,
    sourceWidth: project.width,
    sourceHeight: project.height,
    targetWidth: platform.width,
    targetHeight: platform.height,
    targetLabel: platform.targetLabel,
    cropMode,
    status,
    scalePercent,
    safeAreaWarning:
      status === "ready"
        ? null
        : `Review safe area before exporting ${platform.targetLabel}.`,
    detail:
      status === "ready"
        ? `${project.name} already matches ${platform.targetLabel}.`
        : `${project.name} is ${project.width} x ${project.height}; preview against ${platform.width} x ${platform.height} before posting.`,
  };
}

function createApprovalQueue(input: {
  scheduleItems: ContentScheduleSummary[];
  campaignDeliverables: SocialCampaignDeliverableRef[];
  projectById: Map<string, ProjectSummary>;
  cropPreviews: SocialPlatformCropPreview[];
}): SocialApprovalQueueItem[] {
  const cropByKey = new Map(
    input.cropPreviews.map((preview) => [
      `${preview.platformId}:${preview.projectId}`,
      preview,
    ]),
  );
  const deliverableByProject = new Map(
    input.campaignDeliverables.map((ref) => [
      `${ref.platform.id}:${ref.deliverable.projectId}`,
      ref,
    ]),
  );
  const queue = input.scheduleItems.flatMap((item) => {
    const platform = getSocialPlatformForChannel(item.channel);
    const project = item.projectId
      ? input.projectById.get(item.projectId)
      : null;

    if (!platform || !project) return [];

    const deliverableRef = deliverableByProject.get(
      `${platform.id}:${project.id}`,
    );
    const cropPreview = cropByKey.get(`${platform.id}:${project.id}`) ?? null;

    return [
      createQueueItem({
        platform,
        project,
        scheduleItem: item,
        deliverableRef: deliverableRef ?? null,
        cropPreview,
      }),
    ];
  });

  for (const ref of input.campaignDeliverables) {
    const project = input.projectById.get(ref.deliverable.projectId ?? "");

    if (!project) continue;
    if (
      queue.some(
        (item) =>
          item.platformId === ref.platform.id && item.projectId === project.id,
      )
    ) {
      continue;
    }

    queue.push(
      createQueueItem({
        platform: ref.platform,
        project,
        scheduleItem: null,
        deliverableRef: ref,
        cropPreview: cropByKey.get(`${ref.platform.id}:${project.id}`) ?? null,
      }),
    );
  }

  return queue.sort(
    (left, right) =>
      statusWeight(left.status) - statusWeight(right.status) ||
      (left.scheduledAt ?? "").localeCompare(right.scheduledAt ?? "") ||
      left.projectName.localeCompare(right.projectName),
  );
}

function createQueueItem(input: {
  platform: SocialPlatformSpec;
  project: ProjectSummary;
  scheduleItem: ContentScheduleSummary | null;
  deliverableRef: SocialCampaignDeliverableRef | null;
  cropPreview: SocialPlatformCropPreview | null;
}): SocialApprovalQueueItem {
  const captionReady = Boolean(input.scheduleItem?.caption.trim());
  const approvalStatus =
    input.deliverableRef?.deliverable.approvalStatus ??
    input.project.approvalStatus ??
    "missing";
  const status = createQueueStatus({
    approvalStatus,
    scheduleStatus:
      input.scheduleItem?.status ??
      input.deliverableRef?.deliverable.status ??
      "unscheduled",
    captionReady,
    cropStatus: input.cropPreview?.status ?? "blocked",
  });

  return {
    id: `social-queue-${input.platform.id}-${input.project.id}`,
    platformId: input.platform.id,
    platformLabel: input.platform.label,
    scheduleItemId: input.scheduleItem?.id ?? null,
    campaignId: input.deliverableRef?.campaignId ?? null,
    campaignName: input.deliverableRef?.campaignName ?? null,
    deliverableId: input.deliverableRef?.deliverable.id ?? null,
    projectId: input.project.id,
    projectName: input.project.name,
    scheduledAt: input.scheduleItem?.scheduledAt ?? null,
    scheduleStatus:
      input.scheduleItem?.status ??
      input.deliverableRef?.deliverable.status ??
      "unscheduled",
    approvalStatus,
    captionReady,
    cropPreviewId: input.cropPreview?.id ?? null,
    status,
    nextAction: createQueueNextAction({
      status,
      projectName: input.project.name,
      captionReady,
      approvalStatus,
      cropStatus: input.cropPreview?.status ?? "blocked",
    }),
  };
}

function createCaptionHistories(input: {
  scheduleItems: ContentScheduleSummary[];
  projectVersions: ProjectVersionSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
}): SocialCaptionVersionHistory[] {
  return input.scheduleItems.map((item) => {
    const platform = getSocialPlatformForChannel(item.channel);
    const auditVersions = input.auditLogs
      .filter((log) => log.targetId === item.id)
      .flatMap((log): SocialCaptionVersion[] => {
        const caption =
          typeof log.metadata.caption === "string" ? log.metadata.caption : "";

        if (!caption.trim()) return [];

        return [
          {
            id: `caption-audit-${log.id}`,
            source: "audit-log",
            label: log.summary,
            caption,
            createdAt: log.createdAt,
          },
        ];
      });
    const projectVersions = input.projectVersions
      .filter((version) => version.projectId === item.projectId)
      .map(
        (version): SocialCaptionVersion => ({
          id: `caption-project-version-${version.id}`,
          source: "project-version",
          label: version.name,
          caption: item.caption || item.title,
          createdAt: version.createdAt,
        }),
      );
    const versions = [
      ...auditVersions,
      ...projectVersions,
      {
        id: `caption-current-${item.id}`,
        source: "schedule" as const,
        label: "Current scheduled caption",
        caption: item.caption,
        createdAt: item.updatedAt,
      },
    ].sort(
      (left, right) =>
        Date.parse(left.createdAt) - Date.parse(right.createdAt) ||
        left.id.localeCompare(right.id),
    );

    return {
      id: `caption-history-${item.id}`,
      scheduleItemId: item.id,
      projectId: item.projectId,
      projectName: item.projectName,
      platformId: platform?.id ?? "instagram",
      platformLabel: platform?.label ?? item.channel,
      currentCaption: item.caption,
      versions,
    };
  });
}

function createQueueStatus(input: {
  approvalStatus: SocialApprovalQueueItem["approvalStatus"];
  scheduleStatus: string;
  captionReady: boolean;
  cropStatus: SocialDistributionStatus;
}): SocialDistributionStatus {
  if (
    input.approvalStatus === "changes-requested" ||
    input.approvalStatus === "missing" ||
    input.scheduleStatus === "cancelled" ||
    !input.captionReady
  ) {
    return "blocked";
  }

  if (
    input.approvalStatus !== "approved" ||
    input.cropStatus !== "ready" ||
    input.scheduleStatus !== "published"
  ) {
    return "review";
  }

  return "ready";
}

function createQueueNextAction(input: {
  status: SocialDistributionStatus;
  projectName: string;
  captionReady: boolean;
  approvalStatus: SocialApprovalQueueItem["approvalStatus"];
  cropStatus: SocialDistributionStatus;
}) {
  if (!input.captionReady) {
    return `Write a platform caption for ${input.projectName}.`;
  }

  if (input.approvalStatus === "changes-requested") {
    return `Resolve requested changes for ${input.projectName}.`;
  }

  if (input.cropStatus !== "ready") {
    return `Review platform crop preview for ${input.projectName}.`;
  }

  if (input.status === "review") {
    return `Confirm approval and scheduled-post state for ${input.projectName}.`;
  }

  return `${input.projectName} is ready for social distribution.`;
}

function createNextActions(input: {
  approvalQueue: SocialApprovalQueueItem[];
  cropPreviews: SocialPlatformCropPreview[];
  recoveryPackets: { projectName: string }[];
}) {
  const actions = input.approvalQueue
    .filter((item) => item.status !== "ready")
    .slice(0, 4)
    .map((item) => item.nextAction);
  const reviewCropCount = input.cropPreviews.filter(
    (preview) => preview.status === "review",
  ).length;

  if (reviewCropCount) {
    actions.push(
      `Review ${reviewCropCount} platform crop preview${reviewCropCount === 1 ? "" : "s"} before export.`,
    );
  }

  if (input.recoveryPackets.length) {
    actions.push(
      `Download ${input.recoveryPackets.length} scheduled-post recovery packet${input.recoveryPackets.length === 1 ? "" : "s"}.`,
    );
  }

  return [...new Set(actions)].slice(0, 6);
}

function getCropMode(
  sourceRatio: number,
  targetRatio: number,
  ratioDelta: number,
): SocialPlatformCropMode {
  if (ratioDelta <= 0.03) return "fit";

  return sourceRatio > targetRatio ? "crop" : "pad";
}

function statusWeight(status: SocialDistributionStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}
