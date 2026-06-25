import { createClient } from "@libsql/client";
import { config } from "dotenv";
import {
  createReleaseDeploymentChecklist,
  formatReleaseDeploymentChecklist,
  type ReleaseDeploymentEnv,
  type ReleaseDeploymentTarget,
  type ReleaseDeploymentTursoConnectivity,
} from "@/features/deployment/release-deployment-checklist";
import {
  getDefaultReleaseDeploymentReportPath,
  getExpectedReleaseDeploymentProjectName,
  getReleaseDeploymentEnv,
  readReleaseDeploymentVercelLinkage,
  writeReleaseDeploymentChecklistReport,
} from "@/features/deployment/server/release-deployment-source";

config({ path: ".env.local" });
config({ path: ".env.production.local", override: true });

const args = new Set(process.argv.slice(2));
const targetArg = process.argv.find((arg) => arg.startsWith("--target="))?.split("=")[1] as ReleaseDeploymentTarget | undefined;
const reportPathArg = process.argv.find((arg) => arg.startsWith("--dashboard-report="))?.split("=")[1];
const target = targetArg && ["local", "preview", "production"].includes(targetArg) ? targetArg : "production";

async function checkTursoConnectivity(env: ReleaseDeploymentEnv): Promise<ReleaseDeploymentTursoConnectivity> {
  if (args.has("--skip-live-db")) {
    return {
      checked: false,
      message: "Live Turso connectivity was skipped by --skip-live-db.",
      ok: false,
    };
  }

  if (!env.DATABASE_URL || !env.DATABASE_AUTH_TOKEN) {
    return {
      checked: true,
      message: "DATABASE_URL and DATABASE_AUTH_TOKEN are required before Turso connectivity can be checked.",
      ok: false,
    };
  }

  const startedAt = Date.now();

  try {
    const client = createClient({
      authToken: env.DATABASE_AUTH_TOKEN,
      url: env.DATABASE_URL,
    });

    await client.execute("select 1 as ready");

    return {
      checked: true,
      latencyMs: Date.now() - startedAt,
      message: "Turso connectivity query succeeded.",
      ok: true,
    };
  } catch (error) {
    return {
      checked: true,
      message: error instanceof Error ? error.message : "Turso connectivity query failed.",
      ok: false,
    };
  }
}

const env = getReleaseDeploymentEnv();
const report = createReleaseDeploymentChecklist({
  env,
  expectedVercelProjectName: getExpectedReleaseDeploymentProjectName(),
  target,
  tursoConnectivity: await checkTursoConnectivity(env),
  vercelLinkage: readReleaseDeploymentVercelLinkage(),
});

if (args.has("--write-dashboard-report") || reportPathArg) {
  writeReleaseDeploymentChecklistReport(report, reportPathArg ?? getDefaultReleaseDeploymentReportPath());
}

if (args.has("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(formatReleaseDeploymentChecklist(report));
}

if (report.status === "fail") {
  process.exitCode = 1;
}
