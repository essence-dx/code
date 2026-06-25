export type DeployEnvironmentPreflightStatus = "ready" | "review" | "blocked";

export type DeployEnvironmentPreflightCategory =
  | "auth"
  | "database"
  | "email"
  | "runtime"
  | "url";

export type DeployEnvironmentPreflightRow = {
  id: string;
  status: DeployEnvironmentPreflightStatus;
  category: DeployEnvironmentPreflightCategory;
  label: string;
  envKeys: string[];
  required: boolean;
  secret: boolean;
  detail: string;
  recommendation: string;
};

export type DeployEnvironmentPreflightReport = {
  generatedAt: string;
  status: DeployEnvironmentPreflightStatus;
  score: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  requiredCount: number;
  secretCount: number;
  appOrigin: string;
  vercelEnv: string;
  runtime: string;
  rows: DeployEnvironmentPreflightRow[];
  commands: string[];
};

type PreflightEnv = Record<string, string | undefined>;

export function getDeployEnvironmentPreflightReport({
  env,
  generatedAt = new Date().toISOString(),
}: {
  env: PreflightEnv;
  generatedAt?: string;
}): DeployEnvironmentPreflightReport {
  const rows = getPreflightRows(env);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 22 - reviewCount * 7),
    readyCount,
    reviewCount,
    blockedCount,
    requiredCount: rows.filter((row) => row.required).length,
    secretCount: rows.filter((row) => row.secret).length,
    appOrigin: getAppOrigin(env) ?? "not configured",
    vercelEnv: getValue(env, "VERCEL_ENV") || "local",
    runtime: getValue(env, "NEXT_RUNTIME") || "nodejs",
    rows,
    commands: [
      "vercel env ls production",
      "vercel env pull .env.local --environment=production --yes",
      "bun run ops:env-preflight",
      "bun run visual:deploy-smoke -- --base-url <deployment-url>",
    ],
  };
}

function getPreflightRows(env: PreflightEnv) {
  const databaseUrl = getValue(env, "TURSO_DATABASE_URL");
  const remoteDatabase = databaseUrl.startsWith("libsql://");
  const productionRuntime =
    getValue(env, "VERCEL_ENV") === "production" ||
    getValue(env, "NODE_ENV") === "production";
  const authSecret = getValue(env, "BETTER_AUTH_SECRET");
  const appOrigin = getAppOrigin(env);
  const betterAuthOrigin = getOrigin(getValue(env, "BETTER_AUTH_URL"));
  const publicAppOrigin = getOrigin(getValue(env, "NEXT_PUBLIC_APP_URL"));
  const runtime = getValue(env, "NEXT_RUNTIME") || "nodejs";
  const brevoKey = getValue(env, "BREVO_API_KEY");
  const senderEmail = getValue(env, "BREVO_SENDER_EMAIL");
  const adminEmails = getValue(env, "ADMIN_EMAILS");

  return [
    {
      id: "turso-database-url",
      status: getDatabaseUrlStatus(databaseUrl, productionRuntime),
      category: "database",
      label: "Turso database URL",
      envKeys: ["TURSO_DATABASE_URL"],
      required: true,
      secret: false,
      detail: databaseUrl
        ? remoteDatabase
          ? `Remote Turso database configured at ${getSafeDatabaseTarget(databaseUrl)}.`
          : `Local database configured at ${getSafeDatabaseTarget(databaseUrl)}.`
        : "No database URL is configured.",
      recommendation: databaseUrl
        ? productionRuntime && !remoteDatabase
          ? "Use the Turso libsql production database for deployed environments."
          : "Keep this value scoped in Vercel production and preview environments."
        : "Set TURSO_DATABASE_URL before deployment.",
    },
    {
      id: "turso-auth-token",
      status:
        remoteDatabase && !getValue(env, "TURSO_AUTH_TOKEN")
          ? "blocked"
          : "ready",
      category: "database",
      label: "Turso auth token",
      envKeys: ["TURSO_AUTH_TOKEN"],
      required: remoteDatabase,
      secret: true,
      detail: remoteDatabase
        ? getValue(env, "TURSO_AUTH_TOKEN")
          ? "Remote database auth token is present."
          : "Remote libsql databases require an auth token."
        : "Local database URLs do not require a Turso auth token.",
      recommendation:
        "Store TURSO_AUTH_TOKEN as a Vercel secret and keep it out of public env prefixes.",
    },
    {
      id: "better-auth-secret",
      status: !authSecret
        ? "blocked"
        : authSecret.length < 32 || isPlaceholder(authSecret)
          ? "review"
          : "ready",
      category: "auth",
      label: "Better Auth secret",
      envKeys: ["BETTER_AUTH_SECRET"],
      required: true,
      secret: true,
      detail: authSecret
        ? `Session secret is present with ${authSecret.length} characters.`
        : "Session signing secret is missing.",
      recommendation:
        "Use a strong random secret of at least 32 characters in every deployed environment.",
    },
    {
      id: "app-url-origin",
      status: getAppUrlStatus({
        appOrigin,
        betterAuthOrigin,
        publicAppOrigin,
        productionRuntime,
      }),
      category: "url",
      label: "Public app URL",
      envKeys: ["BETTER_AUTH_URL", "NEXT_PUBLIC_APP_URL", "VERCEL_URL"],
      required: true,
      secret: false,
      detail: appOrigin
        ? `Resolved app origin is ${appOrigin}.`
        : "No public application origin could be resolved.",
      recommendation:
        "Set BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL to the deployed HTTPS origin so OTP redirects and trusted origins match.",
    },
    {
      id: "brevo-api-key",
      status: !brevoKey
        ? "blocked"
        : isPlaceholder(brevoKey)
          ? "review"
          : "ready",
      category: "email",
      label: "Brevo API key",
      envKeys: ["BREVO_API_KEY"],
      required: true,
      secret: true,
      detail: brevoKey
        ? `Brevo API key is present (${maskSecret(brevoKey)}).`
        : "Brevo API key is missing.",
      recommendation:
        "Store BREVO_API_KEY as a sensitive Vercel env var and rotate it if it has ever been exposed.",
    },
    {
      id: "brevo-sender-email",
      status: !senderEmail
        ? "blocked"
        : isEmail(senderEmail)
          ? "ready"
          : "review",
      category: "email",
      label: "Brevo sender email",
      envKeys: ["BREVO_SENDER_EMAIL", "BREVO_SENDER_NAME"],
      required: true,
      secret: false,
      detail: senderEmail
        ? `Verification sender is ${senderEmail}.`
        : "Verification sender email is missing.",
      recommendation:
        "Use a verified Brevo sender address for OTP delivery and keep the sender name user-recognizable.",
    },
    {
      id: "admin-allowlist",
      status: adminEmails
        ? adminEmails.split(",").some((email) => isEmail(email.trim()))
          ? "ready"
          : "review"
        : "review",
      category: "auth",
      label: "Admin allowlist",
      envKeys: ["ADMIN_EMAILS"],
      required: true,
      secret: false,
      detail: adminEmails
        ? `${adminEmails.split(",").filter(Boolean).length} admin email value${adminEmails.split(",").filter(Boolean).length === 1 ? "" : "s"} configured.`
        : "ADMIN_EMAILS is not set and the app will fall back to the default seeded admin.",
      recommendation:
        "Set ADMIN_EMAILS explicitly in production so dashboard access does not depend on defaults.",
    },
    {
      id: "vercel-runtime",
      status: getValue(env, "VERCEL")
        ? getValue(env, "VERCEL_ENV") === "production"
          ? "ready"
          : "review"
        : "review",
      category: "runtime",
      label: "Vercel runtime",
      envKeys: ["VERCEL", "VERCEL_ENV", "VERCEL_PROJECT_PRODUCTION_URL"],
      required: true,
      secret: false,
      detail: getValue(env, "VERCEL")
        ? `Running on Vercel ${getValue(env, "VERCEL_ENV") || "unknown"} runtime.`
        : "Current process is not running on Vercel.",
      recommendation:
        "Run this preflight from production or pull production envs locally before approving release.",
    },
    {
      id: "node-runtime",
      status: runtime === "edge" ? "blocked" : "ready",
      category: "runtime",
      label: "Node runtime",
      envKeys: ["NEXT_RUNTIME"],
      required: true,
      secret: false,
      detail:
        runtime === "edge"
          ? "Edge runtime detected for a flow that depends on Better Auth, Brevo, and LibSQL Node-compatible behavior."
          : `Runtime is ${runtime}.`,
      recommendation:
        "Keep auth, email, and database operations on the Node.js runtime.",
    },
    {
      id: "server-actions-key",
      status:
        productionRuntime && !getValue(env, "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY")
          ? "review"
          : "ready",
      category: "runtime",
      label: "Server actions encryption",
      envKeys: ["NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"],
      required: false,
      secret: true,
      detail: getValue(env, "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY")
        ? "Stable server actions encryption key is present."
        : "Stable server actions encryption key is not configured.",
      recommendation:
        "Set NEXT_SERVER_ACTIONS_ENCRYPTION_KEY when promoting identical builds across production instances.",
    },
  ] satisfies DeployEnvironmentPreflightRow[];
}

function getDatabaseUrlStatus(
  databaseUrl: string,
  productionRuntime: boolean,
): DeployEnvironmentPreflightStatus {
  if (!databaseUrl) {
    return "blocked";
  }

  if (productionRuntime && !databaseUrl.startsWith("libsql://")) {
    return "review";
  }

  return "ready";
}

function getAppUrlStatus(input: {
  appOrigin: string | null;
  betterAuthOrigin: string | null;
  publicAppOrigin: string | null;
  productionRuntime: boolean;
}): DeployEnvironmentPreflightStatus {
  if (!input.appOrigin) {
    return "blocked";
  }

  if (input.productionRuntime && !input.appOrigin.startsWith("https://")) {
    return "review";
  }

  if (
    input.betterAuthOrigin &&
    input.publicAppOrigin &&
    input.betterAuthOrigin !== input.publicAppOrigin
  ) {
    return "review";
  }

  return "ready";
}

function getAppOrigin(env: PreflightEnv) {
  return (
    getOrigin(getValue(env, "BETTER_AUTH_URL")) ??
    getOrigin(getValue(env, "NEXT_PUBLIC_APP_URL")) ??
    getOrigin(getVercelOrigin(env))
  );
}

function getVercelOrigin(env: PreflightEnv) {
  const productionUrl = getValue(env, "VERCEL_PROJECT_PRODUCTION_URL");
  const deploymentUrl = getValue(env, "VERCEL_URL");
  const value = productionUrl || deploymentUrl;

  return value ? `https://${value.replace(/^https?:\/\//, "")}` : "";
}

function getOrigin(value: string) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getSafeDatabaseTarget(value: string) {
  if (!value) {
    return "not configured";
  }

  try {
    const url = new URL(value);
    return url.protocol === "file:" ? "local sqlite file" : url.host;
  } catch {
    return value.startsWith("file:") ? "local sqlite file" : "configured URL";
  }
}

function getValue(env: PreflightEnv, key: string) {
  return env[key]?.trim() ?? "";
}

function maskSecret(value: string) {
  if (value.length <= 8) {
    return "present";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function isPlaceholder(value: string) {
  return /^(replace|your|change|todo|example|test)[-_]/i.test(value);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
