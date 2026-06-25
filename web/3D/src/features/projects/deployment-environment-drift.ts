import type { ReleaseDeploymentCheckCategory, ReleaseDeploymentChecklist } from "@/features/deployment/release-deployment-checklist";

export type DeploymentEnvironmentDriftId = "brevo-sender" | "turso-target" | "updater-endpoints" | "vercel-env";
export type DeploymentEnvironmentDriftStatus = "blocked" | "ready" | "watch";

export interface DeploymentEnvironmentDriftReleaseOperationsSource {
  blockedChannelCount: number;
  envRows: Array<{ key: string; value: string }>;
  readyChannelCount: number;
  selectedArtifactCount: number;
  targetRows: Array<{ artifactCount: number; missing: boolean; target: string }>;
  unsignedArtifactCount: number;
}

export interface DeploymentEnvironmentDriftRow {
  driftCount: number;
  evidence: string;
  expectedState: string;
  id: DeploymentEnvironmentDriftId;
  label: string;
  nextAction: string;
  observedState: string;
  ownerHint: string;
  status: DeploymentEnvironmentDriftStatus;
}

export interface DeploymentEnvironmentDriftReport {
  generatedAt: string;
  rows: DeploymentEnvironmentDriftRow[];
  summary: {
    blockedCount: number;
    driftCount: number;
    environmentScore: number;
    readyCount: number;
    totalCount: number;
    watchCount: number;
    worstStatus: DeploymentEnvironmentDriftStatus;
  };
}

export interface CreateDeploymentEnvironmentDriftMonitorInput {
  env?: Record<string, string | undefined>;
  expectedBrevoSenderEmail?: string;
  expectedVercelProjectName?: string;
  generatedAt?: string;
  releaseDeploymentChecklist: ReleaseDeploymentChecklist | null;
  releaseOperationsDashboard: DeploymentEnvironmentDriftReleaseOperationsSource | null;
}

const placeholderPattern = /replace-with|your-|example|placeholder|changeme/i;

const statusRank: Record<DeploymentEnvironmentDriftStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const statusScore: Record<DeploymentEnvironmentDriftStatus, number> = {
  blocked: 0,
  watch: 65,
  ready: 100,
};

const requiredVercelEnvKeys = ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "DATABASE_URL", "DATABASE_AUTH_TOKEN", "BREVO_API_KEY", "BREVO_SENDER_EMAIL"] as const;
const recommendedVercelEnvKeys = ["NEXT_PUBLIC_BETTER_AUTH_URL", "BREVO_SENDER_NAME", "VERCEL_PROJECT_NAME"] as const;

function clean(value: string | undefined) {
  return value?.trim().replace(/^\uFEFF/, "").replace(/^\u200B/, "").replace(/^"(.*)"$/, "$1");
}

function hasUsableValue(value: string | undefined) {
  const cleaned = clean(value);

  return Boolean(cleaned && !placeholderPattern.test(cleaned));
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

function checksForCategories(checklist: ReleaseDeploymentChecklist | null, categories: ReleaseDeploymentCheckCategory[]) {
  return checklist?.checks.filter((check) => categories.includes(check.category)) ?? [];
}

function issueCounts(checks: ReturnType<typeof checksForCategories>) {
  return {
    failCount: checks.filter((check) => check.status === "fail").length,
    warningCount: checks.filter((check) => check.status === "warning").length,
  };
}

function missingKeys(keys: readonly string[], env: Record<string, string | undefined>) {
  return keys.filter((key) => !hasUsableValue(env[key]));
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function createVercelEnvRow(input: {
  checklist: ReleaseDeploymentChecklist | null;
  env: Record<string, string | undefined>;
  expectedProjectName?: string;
}): DeploymentEnvironmentDriftRow {
  const checks = checksForCategories(input.checklist, ["auth", "database", "email", "vercel"]);
  const issues = issueCounts(checks);
  const missingRequired = missingKeys(requiredVercelEnvKeys, input.env);
  const missingRecommended = missingKeys(recommendedVercelEnvKeys, input.env);
  const observedProjectName = clean(input.env.VERCEL_PROJECT_NAME);
  const expectedProjectName = clean(input.expectedProjectName);
  const projectMismatch = Boolean(expectedProjectName && observedProjectName && observedProjectName !== expectedProjectName);
  const driftCount = missingRequired.length * 2 + missingRecommended.length + issues.failCount * 2 + issues.warningCount + (projectMismatch ? 2 : 0);
  const status: DeploymentEnvironmentDriftStatus = missingRequired.length > 0 || issues.failCount > 0 || projectMismatch ? "blocked" : missingRecommended.length > 0 || issues.warningCount > 0 ? "watch" : "ready";

  return {
    driftCount,
    evidence: `${checks.length} release checklist checks, ${countLabel(issues.failCount, "blocker")}, ${countLabel(issues.warningCount, "warning")}.`,
    expectedState: "Production deployment has auth, database, email, and Vercel linkage env keys without placeholders.",
    id: "vercel-env",
    label: "Vercel env vars",
    nextAction:
      status === "ready"
        ? "Keep production and preview env keys synchronized before each release campaign."
        : "Set the missing or mismatched Vercel environment variables and rerun the release deployment checklist.",
    observedState: `${requiredVercelEnvKeys.length - missingRequired.length}/${requiredVercelEnvKeys.length} required keys, ${
      recommendedVercelEnvKeys.length - missingRecommended.length
    }/${recommendedVercelEnvKeys.length} recommended keys, project ${observedProjectName || "not set"}.`,
    ownerHint: "Web release owner",
    status,
  };
}

function createTursoTargetRow(input: {
  checklist: ReleaseDeploymentChecklist | null;
  env: Record<string, string | undefined>;
}): DeploymentEnvironmentDriftRow {
  const checks = checksForCategories(input.checklist, ["database"]);
  const issues = issueCounts(checks);
  const databaseUrl = parseUrl(input.env.DATABASE_URL);
  const missing = missingKeys(["DATABASE_URL", "DATABASE_AUTH_TOKEN"], input.env);
  const validScheme = databaseUrl?.protocol === "libsql:" || databaseUrl?.protocol === "https:";
  const tokenUsable = hasUsableSecret(input.env.DATABASE_AUTH_TOKEN, 24);
  const invalidScheme = Boolean(clean(input.env.DATABASE_URL) && !validScheme);
  const driftCount = missing.length * 2 + (invalidScheme ? 2 : 0) + (tokenUsable ? 0 : 1) + issues.failCount * 2 + issues.warningCount;
  const status: DeploymentEnvironmentDriftStatus = missing.length > 0 || invalidScheme || !tokenUsable || issues.failCount > 0 ? "blocked" : issues.warningCount > 0 ? "watch" : "ready";

  return {
    driftCount,
    evidence: `${checks.length} Turso checks, ${countLabel(issues.failCount, "blocker")}, ${countLabel(issues.warningCount, "warning")}.`,
    expectedState: "DATABASE_URL points at the active Turso/libSQL target and DATABASE_AUTH_TOKEN is usable.",
    id: "turso-target",
    label: "Turso target",
    nextAction:
      status === "ready"
        ? "Keep live connectivity checked from the release CLI before production deploys."
        : "Update the Turso URL/token pair and rerun live database connectivity before accepting release traffic.",
    observedState: `Database scheme ${databaseUrl?.protocol.replace(":", "") || "missing"}, token ${tokenUsable ? "present" : "missing or weak"}, host ${databaseUrl?.host || "not set"}.`,
    ownerHint: "Data owner",
    status,
  };
}

function createBrevoSenderRow(input: {
  checklist: ReleaseDeploymentChecklist | null;
  env: Record<string, string | undefined>;
  expectedSenderEmail?: string;
}): DeploymentEnvironmentDriftRow {
  const checks = checksForCategories(input.checklist, ["email"]);
  const issues = issueCounts(checks);
  const apiKeyUsable = hasUsableSecret(input.env.BREVO_API_KEY, 40) && clean(input.env.BREVO_API_KEY)?.startsWith("xkeysib-");
  const senderEmail = clean(input.env.BREVO_SENDER_EMAIL);
  const expectedSenderEmail = clean(input.expectedSenderEmail);
  const senderEmailValid = isEmail(senderEmail);
  const senderMismatch = Boolean(expectedSenderEmail && senderEmailValid && senderEmail?.toLowerCase() !== expectedSenderEmail.toLowerCase());
  const missingSenderName = !hasUsableValue(input.env.BREVO_SENDER_NAME);
  const driftCount = (apiKeyUsable ? 0 : 2) + (senderEmailValid ? 0 : 2) + (senderMismatch ? 2 : 0) + (missingSenderName ? 1 : 0) + issues.failCount * 2 + issues.warningCount;
  const status: DeploymentEnvironmentDriftStatus =
    !apiKeyUsable || !senderEmailValid || senderMismatch || issues.failCount > 0 ? "blocked" : missingSenderName || issues.warningCount > 0 ? "watch" : "ready";

  return {
    driftCount,
    evidence: `${checks.length} Brevo checks, ${countLabel(issues.failCount, "blocker")}, ${countLabel(issues.warningCount, "warning")}.`,
    expectedState: expectedSenderEmail ? `Brevo API key is active and sender email is ${expectedSenderEmail}.` : "Brevo API key is active and sender email is verified.",
    id: "brevo-sender",
    label: "Brevo sender",
    nextAction:
      status === "ready"
        ? "Keep OTP and notification sender verification aligned with the Brevo workspace."
        : "Verify the Brevo API key and sender identity before sending auth or workspace notification emails.",
    observedState: `API key ${apiKeyUsable ? "present" : "missing or invalid"}, sender ${senderEmail || "not set"}, name ${missingSenderName ? "missing" : "present"}.`,
    ownerHint: "Messaging owner",
    status,
  };
}

function createUpdaterEndpointRow(input: {
  dashboard: DeploymentEnvironmentDriftReleaseOperationsSource | null;
  env: Record<string, string | undefined>;
}): DeploymentEnvironmentDriftRow {
  if (!input.dashboard) {
    return {
      driftCount: 3,
      evidence: "Desktop release operations dashboard is not available for this workspace session.",
      expectedState: "Generated updater URLs, signatures, and version env rows are available for signed desktop bundles.",
      id: "updater-endpoints",
      label: "Updater endpoints",
      nextAction: "Open release operations, generate the desktop updater env rows, and rerun this drift monitor.",
      observedState: "No updater dashboard source.",
      ownerHint: "Desktop release owner",
      status: "blocked",
    };
  }

  const endpointRows = input.dashboard.envRows.filter(
    (row) => row.key === "DESKTOP_UPDATE_VERSION" || row.key.startsWith("DESKTOP_UPDATE_URL_") || row.key.startsWith("DESKTOP_UPDATE_SIGNATURE_"),
  );
  const urlRows = endpointRows.filter((row) => row.key.startsWith("DESKTOP_UPDATE_URL_"));
  const signatureRows = endpointRows.filter((row) => row.key.startsWith("DESKTOP_UPDATE_SIGNATURE_"));
  const missingTargets = input.dashboard.targetRows.filter((row) => row.missing);
  const unappliedRows = endpointRows.filter((row) => !hasUsableValue(input.env[row.key]));
  const changedRows = endpointRows.filter((row) => hasUsableValue(input.env[row.key]) && clean(input.env[row.key]) !== row.value);
  const nonHttpsUrls = urlRows.filter((row) => parseUrl(row.value)?.protocol !== "https:");
  const noEndpointRows = urlRows.length === 0 || signatureRows.length === 0;
  const releaseBlocked =
    noEndpointRows ||
    input.dashboard.selectedArtifactCount === 0 ||
    input.dashboard.blockedChannelCount > 0 ||
    input.dashboard.unsignedArtifactCount > 0 ||
    missingTargets.length > 0 ||
    nonHttpsUrls.length > 0;
  const driftCount =
    (noEndpointRows ? 3 : 0) +
    (input.dashboard.selectedArtifactCount === 0 ? 2 : 0) +
    input.dashboard.blockedChannelCount * 2 +
    input.dashboard.unsignedArtifactCount * 2 +
    missingTargets.length * 2 +
    nonHttpsUrls.length * 2 +
    unappliedRows.length +
    changedRows.length;
  const status: DeploymentEnvironmentDriftStatus = releaseBlocked ? "blocked" : unappliedRows.length > 0 || changedRows.length > 0 ? "watch" : "ready";

  return {
    driftCount,
    evidence: `${input.dashboard.readyChannelCount} ready channels, ${input.dashboard.blockedChannelCount} blocked channels, ${countLabel(
      input.dashboard.unsignedArtifactCount,
      "unsigned artifact",
    )}.`,
    expectedState: "Signed bundle updater URL and signature env rows are generated and applied to deployment env.",
    id: "updater-endpoints",
    label: "Updater endpoints",
    nextAction:
      status === "ready"
        ? "Keep generated updater env rows applied after each signed desktop bundle promotion."
        : unappliedRows.length > 0 || changedRows.length > 0
          ? "Apply the generated updater environment rows to Vercel and rerun release operations."
          : "Resolve missing targets, unsigned bundles, or blocked desktop release channels before publishing updater metadata.",
    observedState: `${urlRows.length} URL rows, ${signatureRows.length} signatures, ${countLabel(missingTargets.length, "missing target")}, ${countLabel(
      unappliedRows.length,
      "unapplied env row",
    )}, ${countLabel(changedRows.length, "changed env row")}.`,
    ownerHint: "Desktop release owner",
    status,
  };
}

function summarizeRows(rows: DeploymentEnvironmentDriftRow[]): DeploymentEnvironmentDriftReport["summary"] {
  const worstStatus = rows.reduce<DeploymentEnvironmentDriftStatus>((worst, row) => (statusRank[row.status] < statusRank[worst] ? row.status : worst), "ready");

  return {
    blockedCount: rows.filter((row) => row.status === "blocked").length,
    driftCount: rows.reduce((sum, row) => sum + row.driftCount, 0),
    environmentScore: Math.round(rows.reduce((sum, row) => sum + statusScore[row.status], 0) / Math.max(rows.length, 1)),
    readyCount: rows.filter((row) => row.status === "ready").length,
    totalCount: rows.length,
    watchCount: rows.filter((row) => row.status === "watch").length,
    worstStatus,
  };
}

export function createDeploymentEnvironmentDriftMonitor(input: CreateDeploymentEnvironmentDriftMonitorInput): DeploymentEnvironmentDriftReport {
  const env = input.env ?? {};
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const rows = [
    createVercelEnvRow({
      checklist: input.releaseDeploymentChecklist,
      env,
      expectedProjectName: input.expectedVercelProjectName,
    }),
    createTursoTargetRow({
      checklist: input.releaseDeploymentChecklist,
      env,
    }),
    createBrevoSenderRow({
      checklist: input.releaseDeploymentChecklist,
      env,
      expectedSenderEmail: input.expectedBrevoSenderEmail,
    }),
    createUpdaterEndpointRow({
      dashboard: input.releaseOperationsDashboard,
      env,
    }),
  ];

  return {
    generatedAt,
    rows,
    summary: summarizeRows(rows),
  };
}
