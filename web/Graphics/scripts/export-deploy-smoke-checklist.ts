import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getProductionDeploySmokeCsv,
  getProductionDeploySmokeJson,
  getProductionDeploySmokeMarkdown,
  getProductionDeploySmokeReport,
} from "../src/features/editor/production-deploy-smoke";
import {
  createVisualFixtureDocument,
  visualFixtureShareToken,
} from "../src/features/editor/visual-fixture-document";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = path.resolve(
    args.outputDir ??
      process.env.ESSENCE_DEPLOY_SMOKE_OUTPUT_DIR ??
      "artifacts/visual-regression/deploy-smoke",
  );
  const document = createVisualFixtureDocument();
  const activePage =
    document.pages.find((page) => page.id === document.activePageId) ??
    document.pages[0];

  if (!activePage) {
    throw new Error("Visual fixture did not create an active page.");
  }

  const report = getProductionDeploySmokeReport({
    document,
    activePage,
    baseUrl:
      args.baseUrl ??
      process.env.ESSENCE_VISUAL_BASE_URL ??
      "https://<deployment-url>",
    shareToken:
      args.shareToken ??
      process.env.ESSENCE_VISUAL_SHARE_TOKEN ??
      visualFixtureShareToken,
  });

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    path.join(outputDir, "production-deploy-smoke.json"),
    `${getProductionDeploySmokeJson(report)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outputDir, "production-deploy-smoke.csv"),
    `${getProductionDeploySmokeCsv(report)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outputDir, "production-deploy-smoke.md"),
    `${getProductionDeploySmokeMarkdown(report)}\n`,
    "utf8",
  );

  console.log(
    [
      `Production deploy smoke checklist: ${report.status}`,
      `score ${report.score}`,
      `${report.readyCount}/${report.routeCount} routes ready`,
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
    baseUrl: parsed["base-url"],
    outputDir: parsed["output-dir"],
    shareToken: parsed["share-token"],
  };
}

void main();
