import type { ContentScheduleSummary } from "@/db/content-planner";
import { getSocialPublisherHref } from "@/features/content-planner/social-publishing";
import type {
  ScheduledPostRecoveryPacket,
  SocialApprovalQueueItem,
} from "@/features/distribution/social-distribution-command-center-types";
import { slugify } from "@/features/distribution/social-distribution-command-center-utils";

export function createRecoveryPackets(input: {
  queue: SocialApprovalQueueItem[];
  scheduleItems: ContentScheduleSummary[];
  generatedAt: string;
}): ScheduledPostRecoveryPacket[] {
  const scheduleById = new Map(
    input.scheduleItems.map((item) => [item.id, item]),
  );

  return input.queue
    .filter((item) => item.status === "blocked" && item.scheduleItemId)
    .map((item) => {
      const scheduleItem = scheduleById.get(item.scheduleItemId ?? "");
      const publisherHref = scheduleItem
        ? getSocialPublisherHref(scheduleItem)
        : null;
      const payload = {
        generatedAt: input.generatedAt,
        scheduleItemId: item.scheduleItemId,
        projectId: item.projectId,
        projectName: item.projectName,
        platform: item.platformLabel,
        scheduledAt: item.scheduledAt,
        approvalStatus: item.approvalStatus,
        captionReady: item.captionReady,
        publisherHref,
        nextAction: item.nextAction,
      };
      const json = JSON.stringify(payload, null, 2);

      return {
        id: `recovery-${item.scheduleItemId}`,
        scheduleItemId: item.scheduleItemId ?? "",
        projectId: item.projectId,
        projectName: item.projectName,
        platformId: item.platformId,
        platformLabel: item.platformLabel,
        fileName: `${slugify(item.projectName)}-${item.platformId}-recovery.json`,
        dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
        status: "ready",
        steps: [
          "Resolve the approval or caption blocker listed in this packet.",
          "Refresh the platform crop preview before scheduling again.",
          publisherHref
            ? `Open the manual publisher target: ${publisherHref}`
            : "Open the platform publisher after the schedule item is restored.",
          "Update the scheduled post status after recovery is complete.",
        ],
      } satisfies ScheduledPostRecoveryPacket;
    });
}
