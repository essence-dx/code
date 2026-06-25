import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getDeployEnvironmentPreflightJson,
  getDeployEnvironmentPreflightMarkdown,
} from "../src/features/admin/deploy-environment-preflight-export";
import {
  getDeployEnvironmentPreflightReport,
} from "../src/features/admin/deploy-environment-preflight";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = path.resolve(
    args.outputDir ??
      process.env.ESSENCE_DEPLOY_PREFLIGHT_OUTPUT_DIR ??
      "artifacts/production-hardening/env-preflight",
  );
  const report = getDeployEnvironmentPreflightReport({
    env: process.env,
  });

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    path.join(outputDir, "deploy-environment-preflight.json"),
    `${getDeployEnvironmentPreflightJson(report)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outputDir, "deploy-environment-preflight.md"),
    `${getDeployEnvironmentPreflightMarkdown(report)}\n`,
    "utf8",
  );

  console.log(
    [
      `Deploy environment preflight: ${report.status}`,
      `score ${report.score}`,
      `${report.readyCount} ready`,
      `${report.reviewCount} review`,
      `${report.blockedCount} blocked`,
      `Output: ${outputDir}`,
    ].join(" / "),
  );

  if (report.status === "blocked") {
    process.exitCode = 1;
  }
}

function parseArgs(args: string[]) {
  const parsed: Record<string, string> = {};

  for (let index = 0; index < args.length; index += 1) {
    const item = args[index];

    if (!item.startsWith("--")) {
      continue;
    }

    const key = item.slice(2);
    const next = args[index + 1];

    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return {
    outputDir: parsed["output-dir"],
  };
}

void main();
