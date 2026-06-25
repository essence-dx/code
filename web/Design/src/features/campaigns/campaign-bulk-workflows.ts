import type {
  CampaignBoardSummary,
  CampaignDeliverableSummary,
} from "@/db/campaigns";

export const campaignScheduleCadenceOptions = [0, 1, 2, 3, 7] as const;

export type CampaignBulkScheduleDeliverable = {
  deliverableId: string;
  projectId: string;
  projectName: string;
  role: string;
  channel: string;
};

export type CampaignBulkScheduleEntry = {
  deliverableId: string;
  projectId: string;
  title: string;
  channel: string;
  caption: string;
  scheduledAt: Date;
};

export type CampaignDownloadManifest = {
  campaign: {
    id: string;
    name: string;
    status: string;
    goal: string;
    audience: string;
    launchAt: string | null;
  };
  exportedAt: string;
  deliverables: Array<{
    id: string;
    projectId: string | null;
    projectName: string;
    role: string;
    channel: string;
    status: string;
    approvalStatus: string;
    width: number | null;
    height: number | null;
    editPath: string | null;
    hasThumbnail: boolean;
  }>;
};

function normalizeText(value: string, fallback: string, maxLength: number) {
  const text = value.trim().slice(0, maxLength);

  return text || fallback;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function normalizeCampaignScheduleCadenceDays(value: unknown) {
  const cadence = Number(value);

  if (!Number.isFinite(cadence)) return 1;

  return Math.max(0, Math.min(30, Math.floor(cadence)));
}

export function mapCampaignChannelToPlannerChannel(channel: string) {
  const normalized = channel.toLowerCase();

  if (normalized.includes("email")) return "Email";
  if (normalized.includes("website")) return "Website";
  if (normalized.includes("video")) return "TikTok";
  if (normalized.includes("presentation")) return "LinkedIn";
  if (normalized.includes("pin")) return "Pinterest";
  if (normalized.includes("youtube")) return "YouTube";
  if (normalized.includes("x")) return "X";

  return "Instagram";
}

export function buildCampaignBulkScheduleEntries(input: {
  campaignName: string;
  deliverables: CampaignBulkScheduleDeliverable[];
  startAt: Date;
  cadenceDays: number;
  caption: string;
}) {
  if (Number.isNaN(input.startAt.getTime())) {
    return [];
  }

  const cadenceDays = normalizeCampaignScheduleCadenceDays(input.cadenceDays);
  const caption = normalizeText(input.caption, input.campaignName, 500);

  return input.deliverables.map((deliverable, index) => ({
    deliverableId: deliverable.deliverableId,
    projectId: deliverable.projectId,
    title: normalizeText(
      `${input.campaignName} - ${deliverable.projectName}`,
      deliverable.projectName,
      100,
    ),
    channel: mapCampaignChannelToPlannerChannel(deliverable.channel),
    caption,
    scheduledAt: addDays(input.startAt, index * cadenceDays),
  })) satisfies CampaignBulkScheduleEntry[];
}

export function buildCampaignDownloadManifest(input: {
  campaign: CampaignBoardSummary;
  deliverables: CampaignDeliverableSummary[];
  exportedAt?: Date;
}) {
  return {
    campaign: {
      id: input.campaign.id,
      name: input.campaign.name,
      status: input.campaign.status,
      goal: input.campaign.goal,
      audience: input.campaign.audience,
      launchAt: input.campaign.launchAt,
    },
    exportedAt: (input.exportedAt ?? new Date()).toISOString(),
    deliverables: input.deliverables.map((deliverable) => ({
      id: deliverable.id,
      projectId: deliverable.projectId,
      projectName: deliverable.projectName ?? "Deleted design",
      role: deliverable.role,
      channel: deliverable.channel,
      status: deliverable.status,
      approvalStatus: deliverable.approvalStatus,
      width: deliverable.projectWidth,
      height: deliverable.projectHeight,
      editPath: deliverable.projectId
        ? `/editor/${deliverable.projectId}`
        : null,
      hasThumbnail: Boolean(deliverable.projectThumbnail),
    })),
  } satisfies CampaignDownloadManifest;
}

export function createCampaignManifestCsv(manifest: CampaignDownloadManifest) {
  const rows = [
    [
      "Campaign",
      "Project",
      "Role",
      "Channel",
      "Status",
      "Approval",
      "Width",
      "Height",
      "Edit path",
    ],
    ...manifest.deliverables.map((deliverable) => [
      manifest.campaign.name,
      deliverable.projectName,
      deliverable.role,
      deliverable.channel,
      deliverable.status,
      deliverable.approvalStatus,
      deliverable.width ?? "",
      deliverable.height ?? "",
      deliverable.editPath ?? "",
    ]),
  ];

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}
