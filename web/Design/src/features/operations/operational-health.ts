export type OperationalHealthStatus = "healthy" | "warning" | "critical";

export type OperationalHealthCheck = {
  id: string;
  label: string;
  status: OperationalHealthStatus;
  detail: string;
  metric?: string;
};

export type OperationalHealthGroup = {
  id: string;
  title: string;
  description: string;
  status: OperationalHealthStatus;
  checks: OperationalHealthCheck[];
};

export type OperationalHealthReport = {
  checkedAt: string;
  status: OperationalHealthStatus;
  groups: OperationalHealthGroup[];
};

export type OperationalHealthInput = {
  now: Date;
  database: {
    hasUrl: boolean;
    hasToken: boolean;
    reachable: boolean;
    userCount: number;
    projectCount: number;
    templateCount: number;
  };
  auth: {
    hasSecret: boolean;
    hasConfiguredAdminEmails: boolean;
    userCount: number;
    verifiedUserCount: number;
    activeSessionCount: number;
  };
  email: {
    hasBrevo: boolean;
    hasSmtp: boolean;
    recentEmailCount: number;
    recentFailedEmailCount: number;
    recentQueuedEmailCount: number;
  };
  storage: {
    assetCount: number;
    totalBytes: number;
    quotaBytes: number;
  };
  vercel: {
    isVercelRuntime: boolean;
    environment: string | null;
    hasAppUrl: boolean;
    hasDeploymentUrl: boolean;
  };
  tauri: {
    hasConfig: boolean;
    hasRustEntrypoint: boolean;
  };
};

const statusPriority: Record<OperationalHealthStatus, number> = {
  healthy: 0,
  warning: 1,
  critical: 2,
};

export function createOperationalHealthReport(
  input: OperationalHealthInput,
): OperationalHealthReport {
  const groups: OperationalHealthGroup[] = [
    createGroup({
      id: "database",
      title: "Database",
      description: "Turso credentials, live query access, and core content rows.",
      checks: [
        {
          id: "database-env",
          label: "Turso environment",
          status:
            input.database.hasUrl && input.database.hasToken
              ? "healthy"
              : "critical",
          detail:
            input.database.hasUrl && input.database.hasToken
              ? "Database URL and auth token are configured."
              : "TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing.",
        },
        {
          id: "database-query",
          label: "Query health",
          status: input.database.reachable ? "healthy" : "critical",
          detail: input.database.reachable
            ? "Core dashboard queries are responding."
            : "The application could not complete a database probe.",
          metric: `${input.database.userCount} users`,
        },
        {
          id: "database-content",
          label: "Content records",
          status:
            input.database.projectCount || input.database.templateCount
              ? "healthy"
              : "warning",
          detail: "Active projects and templates are visible to operations.",
          metric: `${input.database.projectCount} projects / ${input.database.templateCount} templates`,
        },
      ],
    }),
    createGroup({
      id: "auth",
      title: "Auth",
      description: "Better Auth secret, admin allowlist, verified users, and sessions.",
      checks: [
        {
          id: "auth-secret",
          label: "Auth secret",
          status: input.auth.hasSecret ? "healthy" : "critical",
          detail: input.auth.hasSecret
            ? "Auth signing secret is configured."
            : "BETTER_AUTH_SECRET or AUTH_SECRET is missing.",
        },
        {
          id: "auth-admins",
          label: "Admin allowlist",
          status: input.auth.hasConfiguredAdminEmails ? "healthy" : "warning",
          detail: input.auth.hasConfiguredAdminEmails
            ? "Admin emails are explicitly configured."
            : "Using the default admin fallback; configure ADMIN_EMAILS for production.",
        },
        {
          id: "auth-verified-users",
          label: "Verified users",
          status:
            input.auth.userCount === 0 || input.auth.verifiedUserCount > 0
              ? "healthy"
              : "warning",
          detail: "Email verification data is present for account access checks.",
          metric: `${input.auth.verifiedUserCount}/${input.auth.userCount} verified`,
        },
        {
          id: "auth-sessions",
          label: "Active sessions",
          status: "healthy",
          detail: "Session table is queryable for account management.",
          metric: `${input.auth.activeSessionCount} sessions`,
        },
      ],
    }),
    createGroup({
      id: "email",
      title: "Email",
      description: "Transactional provider configuration and recent delivery health.",
      checks: [
        {
          id: "email-provider",
          label: "Provider",
          status: input.email.hasBrevo || input.email.hasSmtp ? "healthy" : "warning",
          detail: input.email.hasBrevo
            ? "Brevo API email delivery is configured."
            : input.email.hasSmtp
              ? "SMTP email delivery is configured."
              : "No provider is configured; auth emails will use preview mode.",
        },
        {
          id: "email-failures",
          label: "Recent failures",
          status:
            input.email.recentFailedEmailCount >= 5
              ? "critical"
              : input.email.recentFailedEmailCount > 0
                ? "warning"
                : "healthy",
          detail: "Recent auth and test email records are being tracked.",
          metric: `${input.email.recentFailedEmailCount} failed / ${input.email.recentQueuedEmailCount} queued`,
        },
        {
          id: "email-activity",
          label: "Email activity",
          status: "healthy",
          detail: "Recent email audit records are available for support.",
          metric: `${input.email.recentEmailCount} recent records`,
        },
      ],
    }),
    createGroup({
      id: "storage",
      title: "Storage",
      description: "Uploaded and brand asset storage usage against the app quota.",
      checks: [
        {
          id: "storage-quota",
          label: "Quota usage",
          status: getStorageStatus(input.storage.totalBytes, input.storage.quotaBytes),
          detail: "Stored upload and brand-logo bytes are below critical limits.",
          metric: `${formatOperationalBytes(input.storage.totalBytes)} / ${formatOperationalBytes(input.storage.quotaBytes)}`,
        },
        {
          id: "storage-records",
          label: "Asset records",
          status: "healthy",
          detail: "Asset tables are queryable for cleanup and quota views.",
          metric: `${input.storage.assetCount} assets`,
        },
      ],
    }),
    createGroup({
      id: "vercel",
      title: "Vercel",
      description: "Deployment runtime and public app URL readiness.",
      checks: [
        {
          id: "vercel-runtime",
          label: "Runtime",
          status: input.vercel.isVercelRuntime ? "healthy" : "warning",
          detail: input.vercel.isVercelRuntime
            ? `Running on Vercel${input.vercel.environment ? ` (${input.vercel.environment})` : ""}.`
            : "This runtime does not expose Vercel deployment metadata.",
        },
        {
          id: "vercel-url",
          label: "Public URL",
          status:
            input.vercel.hasAppUrl || input.vercel.hasDeploymentUrl
              ? "healthy"
              : "warning",
          detail:
            input.vercel.hasAppUrl || input.vercel.hasDeploymentUrl
              ? "Public app or deployment URL is configured."
              : "Set NEXT_PUBLIC_APP_URL or rely on VERCEL_URL in production.",
        },
      ],
    }),
    createGroup({
      id: "tauri",
      title: "Tauri",
      description: "Desktop shell source files needed for packaged app workflows.",
      checks: [
        {
          id: "tauri-config",
          label: "Config",
          status: input.tauri.hasConfig ? "healthy" : "warning",
          detail: input.tauri.hasConfig
            ? "Tauri configuration is present."
            : "Tauri configuration was not found in this runtime.",
        },
        {
          id: "tauri-rust",
          label: "Rust entrypoint",
          status: input.tauri.hasRustEntrypoint ? "healthy" : "warning",
          detail: input.tauri.hasRustEntrypoint
            ? "Desktop Rust entrypoint is present."
            : "Desktop Rust entrypoint was not found in this runtime.",
        },
      ],
    }),
  ];

  return {
    checkedAt: input.now.toISOString(),
    status: getWorstStatus(groups.map((group) => group.status)),
    groups,
  };
}

export function formatOperationalBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function createGroup(input: Omit<OperationalHealthGroup, "status">) {
  return {
    ...input,
    status: getWorstStatus(input.checks.map((check) => check.status)),
  };
}

function getStorageStatus(bytes: number, quotaBytes: number) {
  if (quotaBytes <= 0) return "warning";

  const usage = bytes / quotaBytes;

  if (usage >= 0.9) return "critical";
  if (usage >= 0.7) return "warning";

  return "healthy";
}

function getWorstStatus(statuses: OperationalHealthStatus[]) {
  return statuses.reduce<OperationalHealthStatus>(
    (worst, status) =>
      statusPriority[status] > statusPriority[worst] ? status : worst,
    "healthy",
  );
}
