import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "@/db/client";
import {
  campaignBoard,
  campaignDeliverable,
  contentScheduleItem,
  project,
  type CampaignBoardRow,
  type CampaignDeliverableRow,
} from "@/db/schema";
import { buildCampaignBulkScheduleEntries } from "@/features/campaigns/campaign-bulk-workflows";
import {
  inferCampaignDeliverableChannel,
  isExistingSourceVariant,
  type CampaignBrandSnapshot,
} from "@/features/campaigns/campaign-board";
import type { ProjectSummary } from "@/features/editor/types";
import {
  designResizeProfiles,
  type DesignResizeProfile,
} from "@/features/editor/resize-profiles";
import { createResizedProjectVariant } from "@/db/projects";
import {
  normalizeApprovalStatus,
  type ApprovalStatus,
} from "@/features/review/approval-status";

export type CampaignBoardStatus = "draft" | "active" | "complete";
export type CampaignDeliverableStatus = "planned" | "in-progress" | "done";

export type CampaignDeliverableSummary = {
  id: string;
  projectId: string | null;
  projectName: string | null;
  projectThumbnail: string | null;
  projectWidth: number | null;
  projectHeight: number | null;
  projectSourceProjectId: string | null;
  projectVariantProfileId: string | null;
  projectVariantName: string | null;
  role: string;
  channel: string;
  status: CampaignDeliverableStatus;
  approvalStatus: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
};

export type CampaignBoardSummary = {
  id: string;
  name: string;
  brief: string;
  goal: string;
  audience: string;
  status: CampaignBoardStatus;
  primaryBrandColor: string | null;
  brandLogoName: string | null;
  brandFontFamily: string | null;
  launchAt: string | null;
  deliverables: CampaignDeliverableSummary[];
  createdAt: string;
  updatedAt: string;
};

function normalizeCampaignStatus(value: unknown): CampaignBoardStatus {
  if (value === "draft" || value === "complete") return value;

  return "active";
}

function normalizeDeliverableStatus(value: unknown): CampaignDeliverableStatus {
  if (value === "in-progress" || value === "done") return value;

  return "planned";
}

function normalizeText(value: string, fallback: string, maxLength: number) {
  const text = value.trim().slice(0, maxLength);

  return text || fallback;
}

function toDeliverableSummary(input: {
  row: CampaignDeliverableRow;
  projectName: string | null;
  projectThumbnail: string | null;
  projectWidth: number | null;
  projectHeight: number | null;
  projectSourceProjectId: string | null;
  projectVariantProfileId: string | null;
  projectVariantName: string | null;
}): CampaignDeliverableSummary {
  return {
    id: input.row.id,
    projectId: input.row.projectId,
    projectName: input.projectName,
    projectThumbnail: input.projectThumbnail,
    projectWidth: input.projectWidth,
    projectHeight: input.projectHeight,
    projectSourceProjectId: input.projectSourceProjectId,
    projectVariantProfileId: input.projectVariantProfileId,
    projectVariantName: input.projectVariantName,
    role: input.row.role,
    channel: input.row.channel,
    status: normalizeDeliverableStatus(input.row.status),
    approvalStatus: normalizeApprovalStatus(input.row.approvalStatus),
    createdAt: input.row.createdAt.toISOString(),
    updatedAt: input.row.updatedAt.toISOString(),
  };
}

function toCampaignSummary(input: {
  row: CampaignBoardRow;
  deliverables: CampaignDeliverableSummary[];
}): CampaignBoardSummary {
  return {
    id: input.row.id,
    name: input.row.name,
    brief: input.row.brief,
    goal: input.row.goal,
    audience: input.row.audience,
    status: normalizeCampaignStatus(input.row.status),
    primaryBrandColor: input.row.primaryBrandColor,
    brandLogoName: input.row.brandLogoName,
    brandFontFamily: input.row.brandFontFamily,
    launchAt: input.row.launchAt?.toISOString() ?? null,
    deliverables: input.deliverables,
    createdAt: input.row.createdAt.toISOString(),
    updatedAt: input.row.updatedAt.toISOString(),
  };
}

export async function listCampaignBoards(userId: string) {
  const campaigns = await getDb()
    .select()
    .from(campaignBoard)
    .where(eq(campaignBoard.userId, userId))
    .orderBy(desc(campaignBoard.updatedAt))
    .limit(12);

  if (!campaigns.length) {
    return [];
  }

  const campaignIds = campaigns.map((campaign) => campaign.id);
  const deliverableRows = await getDb()
    .select({
      deliverable: campaignDeliverable,
      projectName: project.name,
      projectThumbnail: project.thumbnail,
      projectWidth: project.width,
      projectHeight: project.height,
      projectSourceProjectId: project.sourceProjectId,
      projectVariantProfileId: project.variantProfileId,
      projectVariantName: project.variantName,
    })
    .from(campaignDeliverable)
    .leftJoin(project, eq(campaignDeliverable.projectId, project.id))
    .where(
      and(
        eq(campaignDeliverable.userId, userId),
        inArray(campaignDeliverable.campaignId, campaignIds),
      ),
    )
    .orderBy(desc(campaignDeliverable.updatedAt));

  const groupedDeliverables = new Map<string, CampaignDeliverableSummary[]>();

  for (const row of deliverableRows) {
    const list = groupedDeliverables.get(row.deliverable.campaignId) ?? [];
    list.push(
      toDeliverableSummary({
        row: row.deliverable,
        projectName: row.projectName,
        projectThumbnail: row.projectThumbnail,
        projectWidth: row.projectWidth,
        projectHeight: row.projectHeight,
        projectSourceProjectId: row.projectSourceProjectId,
        projectVariantProfileId: row.projectVariantProfileId,
        projectVariantName: row.projectVariantName,
      }),
    );
    groupedDeliverables.set(row.deliverable.campaignId, list);
  }

  return campaigns.map((row) =>
    toCampaignSummary({
      row,
      deliverables: groupedDeliverables.get(row.id) ?? [],
    }),
  );
}

export async function createCampaignBoard(input: {
  userId: string;
  name: string;
  brief: string;
  goal: string;
  audience: string;
  status?: string;
  launchAt?: Date | null;
  projectIds: string[];
  brand: CampaignBrandSnapshot;
}) {
  const projectIds = [...new Set(input.projectIds)].slice(0, 12);
  const selectedProjects = projectIds.length
    ? await getDb()
        .select({
          id: project.id,
          name: project.name,
          width: project.width,
          height: project.height,
          sourceProjectId: project.sourceProjectId,
          variantName: project.variantName,
          variantProfileId: project.variantProfileId,
        })
        .from(project)
        .where(
          and(
            eq(project.userId, input.userId),
            isNull(project.deletedAt),
            inArray(project.id, projectIds),
          ),
        )
    : [];
  const projectOrder = new Map(projectIds.map((id, index) => [id, index]));
  selectedProjects.sort(
    (a, b) => (projectOrder.get(a.id) ?? 0) - (projectOrder.get(b.id) ?? 0),
  );

  const now = new Date();
  const [campaign] = await getDb()
    .insert(campaignBoard)
    .values({
      id: nanoid(),
      userId: input.userId,
      name: normalizeText(input.name, "Untitled campaign", 120),
      brief: normalizeText(input.brief, "", 1200),
      goal: normalizeText(input.goal, "", 240),
      audience: normalizeText(input.audience, "", 240),
      status: normalizeCampaignStatus(input.status),
      primaryBrandColor: input.brand.primaryBrandColor,
      brandLogoName: input.brand.brandLogoName,
      brandFontFamily: input.brand.brandFontFamily,
      launchAt:
        input.launchAt && !Number.isNaN(input.launchAt.getTime())
          ? input.launchAt
          : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (selectedProjects.length) {
    await getDb().insert(campaignDeliverable).values(
      selectedProjects.map((item, index) => ({
        id: nanoid(),
        campaignId: campaign.id,
        userId: input.userId,
        projectId: item.id,
        role: index === 0 ? "Hero deliverable" : `Deliverable ${index + 1}`,
        channel: inferCampaignDeliverableChannel(item),
        status: "planned",
        approvalStatus: "draft",
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  return toCampaignSummary({
    row: campaign,
    deliverables: selectedProjects.map((item, index) => ({
      id: "",
      projectId: item.id,
      projectName: item.name,
      projectThumbnail: null,
      projectWidth: item.width,
      projectHeight: item.height,
      projectSourceProjectId: item.sourceProjectId,
      projectVariantProfileId: item.variantProfileId,
      projectVariantName: item.variantName,
      role: index === 0 ? "Hero deliverable" : `Deliverable ${index + 1}`,
      channel: inferCampaignDeliverableChannel(item),
      status: "planned",
      approvalStatus: "draft",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    })),
  });
}

export async function createCampaignDerivativeVariants(input: {
  userId: string;
  campaignId: string;
  sourceProjectId: string;
  profileIds: string[];
}) {
  const profiles = getUniqueCampaignProfiles(input.profileIds);

  if (!profiles.length) {
    return [];
  }

  const [campaign] = await getDb()
    .select({ id: campaignBoard.id })
    .from(campaignBoard)
    .where(
      and(
        eq(campaignBoard.id, input.campaignId),
        eq(campaignBoard.userId, input.userId),
      ),
    )
    .limit(1);

  if (!campaign) {
    return [];
  }

  const deliverableRows = await getDb()
    .select({
      deliverable: campaignDeliverable,
      projectId: project.id,
      projectSourceProjectId: project.sourceProjectId,
      projectVariantProfileId: project.variantProfileId,
      projectWidth: project.width,
      projectHeight: project.height,
    })
    .from(campaignDeliverable)
    .leftJoin(project, eq(campaignDeliverable.projectId, project.id))
    .where(
      and(
        eq(campaignDeliverable.userId, input.userId),
        eq(campaignDeliverable.campaignId, input.campaignId),
      ),
    );

  const sourceIsInCampaign = deliverableRows.some(
    (row) => row.deliverable.projectId === input.sourceProjectId,
  );

  if (!sourceIsInCampaign) {
    return [];
  }

  const missingProfiles = profiles.filter(
    (profile) =>
      !deliverableRows.some((row) =>
        isExistingSourceVariant({
          deliverable: {
            projectId: row.deliverable.projectId,
            projectSourceProjectId: row.projectSourceProjectId,
            projectVariantProfileId: row.projectVariantProfileId,
            projectWidth: row.projectWidth,
            projectHeight: row.projectHeight,
          },
          sourceProjectId: input.sourceProjectId,
          profile,
        }),
      ),
  );

  const createdProjects: ProjectSummary[] = [];

  for (const profile of missingProfiles) {
    const variant = await createResizedProjectVariant({
      userId: input.userId,
      projectId: input.sourceProjectId,
      profile,
    });

    if (variant) {
      createdProjects.push(variant);
    }
  }

  if (!createdProjects.length) {
    return [];
  }

  const now = new Date();
  await getDb().insert(campaignDeliverable).values(
    createdProjects.map((item) => ({
      id: nanoid(),
      campaignId: input.campaignId,
      userId: input.userId,
      projectId: item.id,
      role: `${item.variantName ?? "Derivative"} variant`,
      channel: inferCampaignDeliverableChannel({
        width: item.width,
        height: item.height,
        variantName: item.variantName,
      }),
      status: "planned",
      approvalStatus: "draft",
      createdAt: now,
      updatedAt: now,
    })),
  );

  await getDb()
    .update(campaignBoard)
    .set({ updatedAt: now })
    .where(
      and(
        eq(campaignBoard.id, input.campaignId),
        eq(campaignBoard.userId, input.userId),
      ),
    );

  return createdProjects;
}

export async function bulkScheduleCampaignDeliverables(input: {
  userId: string;
  campaignId: string;
  deliverableIds: string[];
  startAt: Date;
  cadenceDays: number;
  caption: string;
}) {
  const deliverableIds = [...new Set(input.deliverableIds)].slice(0, 24);

  if (!deliverableIds.length || Number.isNaN(input.startAt.getTime())) {
    return 0;
  }

  const [campaign] = await getDb()
    .select({
      id: campaignBoard.id,
      name: campaignBoard.name,
    })
    .from(campaignBoard)
    .where(
      and(
        eq(campaignBoard.id, input.campaignId),
        eq(campaignBoard.userId, input.userId),
      ),
    )
    .limit(1);

  if (!campaign) {
    return 0;
  }

  const rows = await getDb()
    .select({
      deliverableId: campaignDeliverable.id,
      projectId: project.id,
      projectName: project.name,
      role: campaignDeliverable.role,
      channel: campaignDeliverable.channel,
    })
    .from(campaignDeliverable)
    .innerJoin(project, eq(campaignDeliverable.projectId, project.id))
    .where(
      and(
        eq(campaignDeliverable.userId, input.userId),
        eq(campaignDeliverable.campaignId, campaign.id),
        inArray(campaignDeliverable.id, deliverableIds),
        eq(project.userId, input.userId),
        isNull(project.deletedAt),
      ),
    );
  const order = new Map(deliverableIds.map((id, index) => [id, index]));
  const deliverables = rows
    .sort(
      (left, right) =>
        (order.get(left.deliverableId) ?? 0) -
        (order.get(right.deliverableId) ?? 0),
    )
    .map((row) => ({
      deliverableId: row.deliverableId,
      projectId: row.projectId,
      projectName: row.projectName,
      role: row.role,
      channel: row.channel,
    }));
  const entries = buildCampaignBulkScheduleEntries({
    campaignName: campaign.name,
    deliverables,
    startAt: input.startAt,
    cadenceDays: input.cadenceDays,
    caption: input.caption,
  });

  if (!entries.length) {
    return 0;
  }

  const now = new Date();
  await getDb().insert(contentScheduleItem).values(
    entries.map((entry) => ({
      id: nanoid(),
      userId: input.userId,
      projectId: entry.projectId,
      title: entry.title,
      channel: entry.channel,
      caption: entry.caption,
      status: "planned",
      scheduledAt: entry.scheduledAt,
      createdAt: now,
      updatedAt: now,
    })),
  );

  await getDb()
    .update(campaignBoard)
    .set({ updatedAt: now })
    .where(
      and(
        eq(campaignBoard.id, campaign.id),
        eq(campaignBoard.userId, input.userId),
      ),
    );

  return entries.length;
}

function getUniqueCampaignProfiles(profileIds: string[]) {
  const profileById = new Map(
    designResizeProfiles.map((profile) => [profile.id, profile]),
  );
  const profiles: DesignResizeProfile[] = [];
  const seen = new Set<string>();

  for (const profileId of profileIds) {
    if (seen.has(profileId)) continue;

    const profile = profileById.get(profileId);

    if (!profile) continue;

    seen.add(profile.id);
    profiles.push(profile);

    if (profiles.length >= 8) break;
  }

  return profiles;
}

export async function updateCampaignDeliverableApprovalStatus(input: {
  userId: string;
  campaignId: string;
  deliverableId: string;
  approvalStatus: ApprovalStatus;
}) {
  const now = new Date();
  const [row] = await getDb()
    .update(campaignDeliverable)
    .set({
      approvalStatus: normalizeApprovalStatus(input.approvalStatus),
      updatedAt: now,
    })
    .where(
      and(
        eq(campaignDeliverable.id, input.deliverableId),
        eq(campaignDeliverable.campaignId, input.campaignId),
        eq(campaignDeliverable.userId, input.userId),
      ),
    )
    .returning();

  if (!row) return null;

  await getDb()
    .update(campaignBoard)
    .set({ updatedAt: now })
    .where(
      and(
        eq(campaignBoard.id, input.campaignId),
        eq(campaignBoard.userId, input.userId),
      ),
    );

  return row;
}
