#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

import { parseArgs, requireArg } from "./artifact_tool_utils.mjs";

function usage() {
  return [
    "Usage:",
    "  node scripts/cleanup_presentation_workspace.mjs --workspace <dir> --output-dir <dir> --final-pptx <file>",
    "",
    "Validates a final PPTX and its retained thread-scoped presentation workspace.",
    "This helper does not delete files.",
    "",
    "Options:",
    "  --workspace <dir>           Retained thread-scoped task workspace.",
    "  --output-dir <dir>          Directory containing the final PPTX.",
    "  --final-pptx <file>         Exact final PPTX to validate.",
    "  --dry-run                   Accepted for backward compatibility; no files are removed.",
  ].join("\n");
}

function isWithin(child, parent) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const workspace = path.resolve(requireArg(args, "workspace"));
  const outputDir = path.resolve(requireArg(args, "output-dir"));
  const finalPptx = path.resolve(requireArg(args, "final-pptx"));
  const dryRun = Boolean(args["dry-run"]);
  if (path.extname(finalPptx).toLowerCase() !== ".pptx") {
    throw new Error(`Expected --final-pptx to end in .pptx: ${finalPptx}`);
  }
  if (path.dirname(finalPptx) !== outputDir) {
    throw new Error(`Expected --final-pptx to be directly inside --output-dir: ${finalPptx}`);
  }
  if (isWithin(outputDir, workspace)) {
    throw new Error(
      [
        `Final output directory must be outside the retained workspace: ${outputDir}`,
        "Use a directory under outputs/ or another user-provided output directory.",
      ].join("\n"),
    );
  }
  const workspaceExists = await fs
    .stat(workspace)
    .then((stat) => stat.isDirectory())
    .catch(() => false);
  if (!workspaceExists) {
    throw new Error(`Retained workspace does not exist: ${workspace}`);
  }
  const finalExists = await fs
    .stat(finalPptx)
    .then((stat) => stat.isFile())
    .catch(() => false);
  if (!finalExists) {
    throw new Error(`Final PPTX does not exist: ${finalPptx}`);
  }

  console.log(
    JSON.stringify(
      {
        workspace,
        outputDir,
        finalPptx,
        dryRun,
        retained: true,
        removed: [],
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  console.error(usage());
  process.exit(1);
});
