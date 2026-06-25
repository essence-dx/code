export type ReleaseDeploymentTarget = "local" | "preview" | "production";
export type ReleaseDeploymentCheckStatus = "pass" | "warning" | "fail";
export type ReleaseDeploymentCheckCategory = "auth" | "database" | "email" | "vercel";

export interface ReleaseDeploymentEnv {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  BREVO_API_KEY?: string;
  BREVO_SENDER_EMAIL?: string;
  BREVO_SENDER_NAME?: string;
  DATABASE_AUTH_TOKEN?: string;
  DATABASE_URL?: string;
  NEXT_PUBLIC_BETTER_AUTH_URL?: string;
}

export interface ReleaseDeploymentVercelLinkage {
  orgId?: string;
  projectId?: string;
  projectName?: string;
}

export interface ReleaseDeploymentTursoConnectivity {
  checked: boolean;
  latencyMs?: number;
  message: string;
  ok: boolean;
}

export interface ReleaseDeploymentCheck {
  category: ReleaseDeploymentCheckCategory;
  key: string;
  message: string;
  status: ReleaseDeploymentCheckStatus;
  title: string;
}

export interface ReleaseDeploymentChecklist {
  blockerCount: number;
  checks: ReleaseDeploymentCheck[];
  generatedAt: string;
  status: ReleaseDeploymentCheckStatus;
  summary: string;
  target: ReleaseDeploymentTarget;
  warningCount: number;
}

export interface ReleaseDeploymentChecklistInput {
  env: ReleaseDeploymentEnv;
  expectedVercelProjectName?: string;
  generatedAt?: string;
  target?: ReleaseDeploymentTarget;
  tursoConnectivity?: ReleaseDeploymentTursoConnectivity;
  vercelLinkage?: ReleaseDeploymentVercelLinkage | null;
}

const placeholderPattern = /replace-with|your-|example|placeholder|changeme/i;

function clean(value: string | undefined) {
  return value?.trim().replace(/^\uFEFF/, "").replace(/^\u200B/, "").replace(/^"(.*)"$/, "$1");
}

function hasUsableSecret(value: string | undefined, minimumLength: number) {
  const cleaned = clean(value);

  return Boolean(cleaned && cleaned.length >= minimumLength && !placeholderPattern.test(cleaned));
}

function isEmail(value: string | undefined) {
  const cleaned = clean(value);

  return Boolean(cleaned && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned));
}

function parseUrl(value: string | undefined) {
  const cleaned = clean(value);

  if (!cleaned) {
    return null;
  }

  try {
    return new URL(cleaned);
  } catch {
    return null;
  }
}

function makeCheck(category: ReleaseDeploymentCheckCategory, key: string, title: string, status: ReleaseDeploymentCheckStatus, message: string): ReleaseDeploymentCheck {
  return { category, key, message, status, title };
}

function checkDatabase(env: ReleaseDeploymentEnv, tursoConnectivity?: ReleaseDeploymentTursoConnectivity): ReleaseDeploymentCheck[] {
  const databaseUrl = clean(env.DATABASE_URL);
  const databaseAuthToken = clean(env.DATABASE_AUTH_TOKEN);
  const checks = [
    makeCheck(
      "database",
      "database-url",
      "Turso database URL",
      databaseUrl?.startsWith("libsql://") || databaseUrl?.startsWith("https://") ? "pass" : "fail",
      databaseUrl ? "Database URL is present and uses a Turso/libSQL-compatible scheme." : "DATABASE_URL is required.",
    ),
    makeCheck(
      "database",
      "database-token",
      "Turso database auth token",
      hasUsableSecret(databaseAuthToken, 24) ? "pass" : "fail",
      databaseAuthToken ? "Database auth token is present." : "DATABASE_AUTH_TOKEN is required.",
    ),
  ];

  if (!tursoConnectivity || !tursoConnectivity.checked) {
    checks.push(
      makeCheck(
        "database",
        "turso-connectivity",
        "Turso connectivity",
        "warning",
        tursoConnectivity?.message ?? "Live Turso connectivity was not checked. Run the release checklist with live DB access before deployment.",
      ),
    );
  } else {
    checks.push(
      makeCheck(
        "database",
        "turso-connectivity",
        "Turso connectivity",
        tursoConnectivity.ok ? "pass" : "fail",
        tursoConnectivity.ok
          ? `Turso query succeeded${tursoConnectivity.latencyMs === undefined ? "." : ` in ${tursoConnectivity.latencyMs}ms.`}`
          : tursoConnectivity.message,
      ),
    );
  }

  return checks;
}

function checkAuth(env: ReleaseDeploymentEnv, target: ReleaseDeploymentTarget): ReleaseDeploymentCheck[] {
  const authUrl = parseUrl(env.BETTER_AUTH_URL);
  const publicAuthUrl = parseUrl(env.NEXT_PUBLIC_BETTER_AUTH_URL);
  const authUrlIsLocal = authUrl?.hostname === "localhost" || authUrl?.hostname === "127.0.0.1";
  const authUrlOk = target === "local" ? Boolean(authUrl) : authUrl?.protocol === "https:";
  const publicAuthUrlOk = !publicAuthUrl || publicAuthUrl.href === authUrl?.href || (target === "local" ? Boolean(publicAuthUrl) : publicAuthUrl.protocol === "https:");

  return [
    makeCheck(
      "auth",
      "better-auth-secret",
      "Better Auth secret",
      hasUsableSecret(env.BETTER_AUTH_SECRET, 32) ? "pass" : "fail",
      "BETTER_AUTH_SECRET must be a non-placeholder secret of at least 32 characters.",
    ),
    makeCheck(
      "auth",
      "better-auth-url",
      "Better Auth URL",
      authUrlOk ? "pass" : "fail",
      authUrl
        ? target === "production" && authUrlIsLocal
          ? "Production auth URL must not point at localhost."
          : "BETTER_AUTH_URL is present for the selected target."
        : "BETTER_AUTH_URL is required.",
    ),
    makeCheck(
      "auth",
      "public-better-auth-url",
      "Public auth URL",
      publicAuthUrlOk ? "pass" : "warning",
      publicAuthUrl ? "NEXT_PUBLIC_BETTER_AUTH_URL is present and compatible with the selected target." : "NEXT_PUBLIC_BETTER_AUTH_URL is optional but recommended for deployed auth flows.",
    ),
  ];
}

function checkEmail(env: ReleaseDeploymentEnv): ReleaseDeploymentCheck[] {
  return [
    makeCheck(
      "email",
      "brevo-api-key",
      "Brevo API key",
      hasUsableSecret(env.BREVO_API_KEY, 40) && clean(env.BREVO_API_KEY)?.startsWith("xkeysib-") ? "pass" : "fail",
      "BREVO_API_KEY must be present and look like a Brevo SMTP API key.",
    ),
    makeCheck(
      "email",
      "brevo-sender-email",
      "Brevo sender email",
      isEmail(env.BREVO_SENDER_EMAIL) ? "pass" : "fail",
      "BREVO_SENDER_EMAIL must be configured as a valid verified sender address.",
    ),
    makeCheck(
      "email",
      "brevo-sender-name",
      "Brevo sender name",
      clean(env.BREVO_SENDER_NAME) ? "pass" : "warning",
      "BREVO_SENDER_NAME is recommended so OTP emails arrive with a recognizable product sender.",
    ),
  ];
}

function checkVercel(vercelLinkage: ReleaseDeploymentVercelLinkage | null | undefined, expectedProjectName: string | undefined): ReleaseDeploymentCheck[] {
  const projectId = clean(vercelLinkage?.projectId);
  const orgId = clean(vercelLinkage?.orgId);
  const projectName = clean(vercelLinkage?.projectName);
  const expected = clean(expectedProjectName);

  return [
    makeCheck(
      "vercel",
      "vercel-project-id",
      "Vercel project id",
      projectId?.startsWith("prj_") ? "pass" : "fail",
      projectId ? "Vercel project linkage has a project id." : ".vercel/project.json is missing or incomplete.",
    ),
    makeCheck(
      "vercel",
      "vercel-org-id",
      "Vercel team or user id",
      orgId?.startsWith("team_") || orgId?.startsWith("user_") ? "pass" : "fail",
      orgId ? "Vercel project linkage has an owning scope id." : ".vercel/project.json must include orgId.",
    ),
    makeCheck(
      "vercel",
      "vercel-project-name",
      "Vercel project name",
      projectName && (!expected || projectName === expected) ? "pass" : "fail",
      projectName
        ? expected && projectName !== expected
          ? `Linked project is ${projectName}, expected ${expected}.`
          : "Linked Vercel project name matches the expected project."
        : ".vercel/project.json must include projectName.",
    ),
  ];
}

export function createReleaseDeploymentChecklist(input: ReleaseDeploymentChecklistInput): ReleaseDeploymentChecklist {
  const target = input.target ?? "production";
  const checks = [
    ...checkAuth(input.env, target),
    ...checkDatabase(input.env, input.tursoConnectivity),
    ...checkEmail(input.env),
    ...checkVercel(input.vercelLinkage, input.expectedVercelProjectName),
  ];
  const blockerCount = checks.filter((check) => check.status === "fail").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const status: ReleaseDeploymentCheckStatus = blockerCount > 0 ? "fail" : warningCount > 0 ? "warning" : "pass";

  return {
    blockerCount,
    checks,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status,
    summary:
      status === "pass"
        ? "Release deployment checklist passed."
        : status === "warning"
          ? "Release deployment checklist passed with warnings."
          : "Release deployment checklist has release blockers.",
    target,
    warningCount,
  };
}

export function formatReleaseDeploymentChecklist(report: ReleaseDeploymentChecklist) {
  const lines = [
    `Release deployment checklist: ${report.status.toUpperCase()}`,
    `Target: ${report.target}`,
    `Blockers: ${report.blockerCount}`,
    `Warnings: ${report.warningCount}`,
    "",
    ...report.checks.map((check) => `[${check.status.toUpperCase()}] ${check.title}: ${check.message}`),
  ];

  return lines.join("\n");
}
