import { desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { session, user, workbook } from "@/db/schema";
import {
  listAuditLogs,
  type AuditLogRow,
} from "@/features/audit/audit-log-service";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";

export type DashboardUserRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  activeSessions: number;
  workbookCount: number;
};

export type DashboardWorkbookRow = {
  id: string;
  name: string;
  ownerEmail: string;
  folderName: string;
  isFavorite: boolean;
  isTemplate: boolean;
  lastOpenedAt: string | null;
  updatedAt: string;
};

export type DashboardSettingRow = {
  label: string;
  value: string;
  status: "ready" | "attention";
};

export type DashboardData = {
  isAdmin: boolean;
  adminEmail: string;
  stats: {
    users: number;
    verifiedUsers: number;
    activeSessions: number;
    workbooks: number;
    auditEvents: number;
  };
  users: DashboardUserRow[];
  workbooks: DashboardWorkbookRow[];
  settings: DashboardSettingRow[];
  auditLogs: AuditLogRow[];
};

export function getAdminEmail() {
  return (process.env.ADMIN_SEED_EMAIL ?? "admin@mail.com").toLowerCase();
}

export function isDashboardAdmin(email: string) {
  return email.toLowerCase() === getAdminEmail();
}

function toIsoDate(value: Date | null | undefined) {
  if (!value || Number.isNaN(value.getTime())) {
    return null;
  }

  return value.toISOString();
}

export async function getDashboardData(currentUser: {
  id: string;
  email: string;
}): Promise<DashboardData> {
  const db = getDb();
  const isAdmin = isDashboardAdmin(currentUser.email);
  const now = Date.now();

  const [userRows, sessionRows, workbookRows] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt)),
    db
      .select({
        userId: session.userId,
        expiresAt: session.expiresAt,
      })
      .from(session),
    db
      .select({
        id: workbook.id,
        ownerId: workbook.ownerId,
        name: workbook.name,
        data: workbook.data,
        updatedAt: workbook.updatedAt,
      })
      .from(workbook)
      .orderBy(desc(workbook.updatedAt)),
  ]);
  const auditLogs = await listAuditLogs({
    userId: currentUser.id,
    isAdmin,
    limit: 80,
  });

  const visibleUserIds = new Set(
    isAdmin ? userRows.map((row) => row.id) : [currentUser.id],
  );
  const emailByUserId = new Map(userRows.map((row) => [row.id, row.email]));
  const activeSessionsByUserId = new Map<string, number>();
  const workbookCountByUserId = new Map<string, number>();

  for (const row of sessionRows) {
    if (row.expiresAt.getTime() <= now) {
      continue;
    }

    activeSessionsByUserId.set(
      row.userId,
      (activeSessionsByUserId.get(row.userId) ?? 0) + 1,
    );
  }

  for (const row of workbookRows) {
    workbookCountByUserId.set(
      row.ownerId,
      (workbookCountByUserId.get(row.ownerId) ?? 0) + 1,
    );
  }

  const visibleUsers = userRows
    .filter((row) => visibleUserIds.has(row.id))
    .map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      emailVerified: row.emailVerified,
      createdAt: row.createdAt.toISOString(),
      activeSessions: activeSessionsByUserId.get(row.id) ?? 0,
      workbookCount: workbookCountByUserId.get(row.id) ?? 0,
    }));

  const visibleWorkbooks = workbookRows
    .filter((row) => visibleUserIds.has(row.ownerId))
    .map((row) => {
      const document = normalizeWorkbookDocument(row.data);

      return {
        id: row.id,
        name: row.name,
        ownerEmail: emailByUserId.get(row.ownerId) ?? "Unknown user",
        folderName: document.metadata.folderName,
        isFavorite: document.metadata.favorite,
        isTemplate: document.metadata.isTemplate,
        lastOpenedAt: toIsoDate(
          document.metadata.lastOpenedAt ? new Date(document.metadata.lastOpenedAt) : null,
        ),
        updatedAt: row.updatedAt.toISOString(),
      };
    });

  const settings: DashboardSettingRow[] = [
    {
      label: "Canonical URL",
      value: process.env.BETTER_AUTH_URL ?? "Not configured",
      status: process.env.BETTER_AUTH_URL ? "ready" : "attention",
    },
    {
      label: "Public app URL",
      value: process.env.NEXT_PUBLIC_APP_URL ?? "Not configured",
      status: process.env.NEXT_PUBLIC_APP_URL ? "ready" : "attention",
    },
    {
      label: "Email sender",
      value: process.env.BREVO_SENDER_EMAIL ?? "ajju40959@gmail.com",
      status: process.env.BREVO_API_KEY ? "ready" : "attention",
    },
    {
      label: "Email confirmation",
      value: process.env.BREVO_API_KEY ? "Configured" : "Missing key",
      status: process.env.BREVO_API_KEY ? "ready" : "attention",
    },
  ];

  return {
    isAdmin,
    adminEmail: getAdminEmail(),
    stats: {
      users: userRows.length,
      verifiedUsers: userRows.filter((row) => row.emailVerified).length,
      activeSessions: sessionRows.filter((row) => row.expiresAt.getTime() > now).length,
      workbooks: workbookRows.length,
      auditEvents: auditLogs.length,
    },
    users: visibleUsers,
    workbooks: visibleWorkbooks,
    settings,
    auditLogs,
  };
}
