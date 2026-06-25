import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  createReleaseDeploymentChecklist,
  type ReleaseDeploymentEnv,
  type ReleaseDeploymentChecklist,
  type ReleaseDeploymentTarget,
  type ReleaseDeploymentTursoConnectivity,
  type ReleaseDeploymentVercelLinkage,
} from "../release-deployment-checklist";

export function getReleaseDeploymentEnv(source: NodeJS.ProcessEnv = process.env): ReleaseDeploymentEnv {
  return {
    BETTER_AUTH_SECRET: source.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: source.BETTER_AUTH_URL,
    BREVO_API_KEY: source.BREVO_API_KEY,
    BREVO_SENDER_EMAIL: source.BREVO_SENDER_EMAIL,
    BREVO_SENDER_NAME: source.BREVO_SENDER_NAME,
    DATABASE_AUTH_TOKEN: source.DATABASE_AUTH_TOKEN,
    DATABASE_URL: source.DATABASE_URL,
    NEXT_PUBLIC_BETTER_AUTH_URL: source.NEXT_PUBLIC_BETTER_AUTH_URL,
  };
}

export function getExpectedReleaseDeploymentProjectName(source: NodeJS.ProcessEnv = process.env) {
  return source.VERCEL_PROJECT_NAME || "essence-spline";
}

export function readReleaseDeploymentVercelLinkage(cwd = process.cwd()): ReleaseDeploymentVercelLinkage | null {
  const projectPath = join(cwd, ".vercel", "project.json");

  if (!existsSync(projectPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(projectPath, "utf8")) as ReleaseDeploymentVercelLinkage;
  } catch {
    return null;
  }
}

export function getDefaultReleaseDeploymentReportPath(cwd = process.cwd()) {
  return join(cwd, ".release", "deployment-checklist.json");
}

function isReleaseDeploymentChecklist(value: unknown): value is ReleaseDeploymentChecklist {
  const candidate = value as Partial<ReleaseDeploymentChecklist> | null;

  return Boolean(
    candidate &&
      typeof candidate.generatedAt === "string" &&
      ["local", "preview", "production"].includes(String(candidate.target)) &&
      ["pass", "warning", "fail"].includes(String(candidate.status)) &&
      Array.isArray(candidate.checks) &&
      typeof candidate.blockerCount === "number" &&
      typeof candidate.warningCount === "number",
  );
}

export function readReleaseDeploymentChecklistReport(path = getDefaultReleaseDeploymentReportPath()): ReleaseDeploymentChecklist | null {
  if (!existsSync(path)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;

    return isReleaseDeploymentChecklist(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeReleaseDeploymentChecklistReport(report: ReleaseDeploymentChecklist, path = getDefaultReleaseDeploymentReportPath()) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`);

  return path;
}

export function createSkippedTursoConnectivity(message = "Live Turso connectivity is checked by the release CLI before deployment."): ReleaseDeploymentTursoConnectivity {
  return {
    checked: false,
    message,
    ok: false,
  };
}

export function createDashboardReleaseDeploymentChecklist(options: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  generatedAt?: string;
  reportPath?: string;
  target?: ReleaseDeploymentTarget;
} = {}) {
  const reportPath = options.reportPath ?? options.env?.ESSENCE_RELEASE_DEPLOYMENT_REPORT_PATH;
  const report = readReleaseDeploymentChecklistReport(reportPath ?? getDefaultReleaseDeploymentReportPath(options.cwd));

  if (report) {
    return report;
  }

  const env = getReleaseDeploymentEnv(options.env);

  return createReleaseDeploymentChecklist({
    env,
    expectedVercelProjectName: getExpectedReleaseDeploymentProjectName(options.env),
    generatedAt: options.generatedAt,
    target: options.target ?? "production",
    tursoConnectivity: createSkippedTursoConnectivity(),
    vercelLinkage: readReleaseDeploymentVercelLinkage(options.cwd),
  });
}
