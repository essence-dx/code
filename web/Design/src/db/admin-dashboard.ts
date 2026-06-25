import { desc } from "drizzle-orm";

import { getDb } from "@/db/client";
import { getOperationalHealthData } from "@/db/operational-health";
import { authEmail, designTemplate, project, session, user } from "@/db/schema";
import {
  normalizeTemplateMarketplaceStatus,
  type TemplateMarketplaceStatus,
} from "@/features/templates/template-marketplace";
import type { OperationalHealthReport } from "@/features/operations/operational-health";

export type AdminDashboardUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminDashboardSession = {
  id: string;
  userId: string;
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
};

export type AdminDashboardEmail = {
  id: string;
  recipient: string;
  subject: string;
  purpose: string;
  deliveryStatus: string;
  errorMessage: string | null;
  createdAt: string;
};

export type AdminDashboardProject = {
  id: string;
  userId: string;
  name: string;
  width: number;
  height: number;
  starred: boolean;
  deleted: boolean;
  updatedAt: string;
};

export type AdminDashboardTemplate = {
  id: string;
  userId: string;
  name: string;
  width: number;
  height: number;
  approvalStatus: string;
  marketplaceStatus: TemplateMarketplaceStatus;
  marketplaceCollection: string | null;
  marketplaceSeason: string | null;
  marketplaceReviewNote: string;
  marketplacePublishedAt: string | null;
  marketplaceUseCount: number;
  marketplaceViewCount: number;
  updatedAt: string;
};

export type AdminDashboardData = {
  users: AdminDashboardUser[];
  sessions: AdminDashboardSession[];
  emails: AdminDashboardEmail[];
  projects: AdminDashboardProject[];
  templates: AdminDashboardTemplate[];
  health: OperationalHealthReport;
};

export function isAdminEmail(email: string) {
  const configured = process.env.ADMIN_EMAILS?.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean) ?? ["admin@mail.com"];

  return configured.includes(email.toLowerCase());
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [users, sessions, emails, projects, templates, health] =
    await Promise.all([
      getDb().select().from(user).orderBy(desc(user.createdAt)).limit(50),
      getDb().select().from(session).orderBy(desc(session.createdAt)).limit(50),
      getDb()
        .select()
        .from(authEmail)
        .orderBy(desc(authEmail.createdAt))
        .limit(50),
      getDb().select().from(project).orderBy(desc(project.updatedAt)).limit(50),
      getDb()
        .select()
        .from(designTemplate)
        .orderBy(desc(designTemplate.updatedAt))
        .limit(50),
      getOperationalHealthData(),
    ]);

  return {
    users: users.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      emailVerified: row.emailVerified,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    sessions: sessions.map((row) => ({
      id: row.id,
      userId: row.userId,
      token: row.token,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    })),
    emails: emails.map((row) => ({
      id: row.id,
      recipient: row.recipient,
      subject: row.subject,
      purpose: row.purpose,
      deliveryStatus: row.deliveryStatus,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
    })),
    projects: projects.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      width: row.width,
      height: row.height,
      starred: row.starred,
      deleted: Boolean(row.deletedAt),
      updatedAt: row.updatedAt.toISOString(),
    })),
    templates: templates.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      width: row.width,
      height: row.height,
      approvalStatus: row.approvalStatus,
      marketplaceStatus: normalizeTemplateMarketplaceStatus(
        row.marketplaceStatus,
      ),
      marketplaceCollection: row.marketplaceCollection,
      marketplaceSeason: row.marketplaceSeason,
      marketplaceReviewNote: row.marketplaceReviewNote,
      marketplacePublishedAt: row.marketplacePublishedAt?.toISOString() ?? null,
      marketplaceUseCount: row.marketplaceUseCount,
      marketplaceViewCount: row.marketplaceViewCount,
      updatedAt: row.updatedAt.toISOString(),
    })),
    health,
  };
}
