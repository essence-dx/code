import { existsSync } from "node:fs";
import { join } from "node:path";

import { count, desc, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  authEmail,
  brandLogo,
  designTemplate,
  project,
  session,
  user,
  userAsset,
} from "@/db/schema";
import {
  createOperationalHealthReport,
  type OperationalHealthReport,
} from "@/features/operations/operational-health";

const operationalStorageQuotaBytes = 100 * 1024 * 1024;

export async function getOperationalHealthData(): Promise<OperationalHealthReport> {
  const [
    userCountRows,
    verifiedUserCountRows,
    activeSessionCountRows,
    projectCountRows,
    templateCountRows,
    recentEmails,
    uploadStorage,
    brandStorage,
  ] = await Promise.all([
    getDb().select({ value: count() }).from(user),
    getDb()
      .select({ value: count() })
      .from(user)
      .where(eq(user.emailVerified, true)),
    getDb().select({ value: count() }).from(session),
    getDb()
      .select({ value: count() })
      .from(project)
      .where(isNull(project.deletedAt)),
    getDb().select({ value: count() }).from(designTemplate),
    getDb()
      .select({
        deliveryStatus: authEmail.deliveryStatus,
      })
      .from(authEmail)
      .orderBy(desc(authEmail.createdAt))
      .limit(50),
    getDb()
      .select({
        count: count(),
        totalBytes: sql<number>`coalesce(sum(${userAsset.sizeBytes}), 0)`,
      })
      .from(userAsset),
    getDb()
      .select({
        count: count(),
        totalBytes: sql<number>`coalesce(sum(${brandLogo.sizeBytes}), 0)`,
      })
      .from(brandLogo),
  ]);
  const uploadStats = uploadStorage[0];
  const brandStats = brandStorage[0];
  const userCount = Number(userCountRows[0]?.value ?? 0);
  const verifiedUserCount = Number(verifiedUserCountRows[0]?.value ?? 0);
  const activeSessionCount = Number(activeSessionCountRows[0]?.value ?? 0);
  const projectCount = Number(projectCountRows[0]?.value ?? 0);
  const templateCount = Number(templateCountRows[0]?.value ?? 0);
  const recentFailedEmailCount = recentEmails.filter(
    (email) => email.deliveryStatus === "failed",
  ).length;
  const recentQueuedEmailCount = recentEmails.filter(
    (email) => email.deliveryStatus === "queued",
  ).length;

  return createOperationalHealthReport({
    now: new Date(),
    database: {
      hasUrl: Boolean(process.env.TURSO_DATABASE_URL?.trim()),
      hasToken: Boolean(process.env.TURSO_AUTH_TOKEN?.trim()),
      reachable: true,
      userCount,
      projectCount,
      templateCount,
    },
    auth: {
      hasSecret: Boolean(
        process.env.BETTER_AUTH_SECRET?.trim() ||
          process.env.AUTH_SECRET?.trim(),
      ),
      hasConfiguredAdminEmails: Boolean(process.env.ADMIN_EMAILS?.trim()),
      userCount,
      verifiedUserCount,
      activeSessionCount,
    },
    email: {
      hasBrevo: Boolean(process.env.BREVO_API_KEY?.trim()),
      hasSmtp: Boolean(process.env.SMTP_HOST?.trim()),
      recentEmailCount: recentEmails.length,
      recentFailedEmailCount,
      recentQueuedEmailCount,
    },
    storage: {
      assetCount:
        Number(uploadStats?.count ?? 0) + Number(brandStats?.count ?? 0),
      totalBytes:
        Number(uploadStats?.totalBytes ?? 0) +
        Number(brandStats?.totalBytes ?? 0),
      quotaBytes: operationalStorageQuotaBytes,
    },
    vercel: {
      isVercelRuntime: process.env.VERCEL === "1",
      environment: process.env.VERCEL_ENV ?? null,
      hasAppUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
      hasDeploymentUrl: Boolean(process.env.VERCEL_URL?.trim()),
    },
    tauri: {
      hasConfig: safeExists("src-tauri/tauri.conf.json"),
      hasRustEntrypoint:
        safeExists("src-tauri/src/lib.rs") ||
        safeExists("src-tauri/src/main.rs"),
    },
  });
}

function safeExists(relativePath: string) {
  try {
    return existsSync(join(process.cwd(), relativePath));
  } catch {
    return false;
  }
}
