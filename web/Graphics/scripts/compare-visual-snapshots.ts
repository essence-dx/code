import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  decodePng,
  diffPngPixels,
  getPixelDiffThresholdsFromEnv,
  readPngDimensions,
  type PixelDiffResult,
  type PixelDiffThresholds,
} from "./visual-png";

type SnapshotManifest = {
  baseUrl: string;
  runId: string;
  results: VisualSnapshotResult[];
};

type VisualSnapshotResult = {
  id: string;
  label: string;
  url: string;
  file: string;
  viewport: {
    width: number;
    height: number;
  };
  capturedAt: string;
  status: "captured";
};

type SnapshotImageMeta = {
  sha256: string;
  bytes: number;
  width: number;
  height: number;
};

type SnapshotComparisonRow = {
  id: string;
  label: string;
  status: "unchanged" | "changed" | "added" | "missing";
  baselineFile?: string;
  currentFile?: string;
  baseline?: SnapshotImageMeta;
  current?: SnapshotImageMeta;
  pixelDiff?: PixelDiffResult;
  notes: string[];
};

type SnapshotComparison = {
  comparedAt: string;
  baselineRunId: string;
  currentRunId: string;
  baselineBaseUrl: string;
  currentBaseUrl: string;
  thresholds: PixelDiffThresholds;
  summary: {
    total: number;
    unchanged: number;
    changed: number;
    added: number;
    missing: number;
  };
  rows: SnapshotComparisonRow[];
};

async function main() {
  const [baselineDir, currentDir, outputPath] = process.argv.slice(2);

  if (!baselineDir || !currentDir) {
    console.error(
      "Usage: bun scripts/compare-visual-snapshots.ts <baseline-run-dir> <current-run-dir> [output-json]",
    );
    process.exitCode = 1;
    return;
  }

  const thresholds = getPixelDiffThresholdsFromEnv();
  const comparison = await compareSnapshotRuns(
    baselineDir,
    currentDir,
    thresholds,
  );
  const targetPath =
    outputPath ?? path.join(path.resolve(currentDir), "comparison.json");

  await writeFile(targetPath, `${JSON.stringify(comparison, null, 2)}\n`, "utf8");

  console.log(
    [
      `Compared ${comparison.summary.total} visual surfaces.`,
      `${comparison.summary.unchanged} unchanged`,
      `${comparison.summary.changed} changed`,
      `${comparison.summary.added} added`,
      `${comparison.summary.missing} missing`,
      `Thresholds: ${formatThresholds(comparison.thresholds)}`,
      `Report: ${targetPath}`,
    ].join(" / "),
  );

  if (comparison.summary.changed > 0 || comparison.summary.missing > 0) {
    process.exitCode = 1;
  }
}

async function compareSnapshotRuns(
  baselineDir: string,
  currentDir: string,
  thresholds: PixelDiffThresholds,
): Promise<SnapshotComparison> {
  const baselineManifest = await readSnapshotManifest(baselineDir);
  const currentManifest = await readSnapshotManifest(currentDir);
  const baselineById = new Map(
    baselineManifest.results.map((result) => [result.id, result]),
  );
  const currentById = new Map(
    currentManifest.results.map((result) => [result.id, result]),
  );
  const ids = Array.from(
    new Set([...baselineById.keys(), ...currentById.keys()]),
  ).sort();
  const rows: SnapshotComparisonRow[] = [];

  for (const id of ids) {
    const baseline = baselineById.get(id);
    const current = currentById.get(id);

    if (!baseline && current) {
      rows.push({
        id,
        label: current.label,
        status: "added",
        currentFile: resolveSnapshotFile(currentDir, current.file),
        current: await readImageMeta(resolveSnapshotFile(currentDir, current.file)),
        notes: ["Surface was not present in the baseline run."],
      });
      continue;
    }

    if (baseline && !current) {
      rows.push({
        id,
        label: baseline.label,
        status: "missing",
        baselineFile: resolveSnapshotFile(baselineDir, baseline.file),
        baseline: await readImageMeta(
          resolveSnapshotFile(baselineDir, baseline.file),
        ),
        notes: ["Surface is missing from the current run."],
      });
      continue;
    }

    if (!baseline || !current) {
      continue;
    }

    const baselineFile = resolveSnapshotFile(baselineDir, baseline.file);
    const currentFile = resolveSnapshotFile(currentDir, current.file);
    const baselineMeta = await readImageMeta(baselineFile);
    const currentMeta = await readImageMeta(currentFile);
    const imageChange = await getImageChange(
      baselineFile,
      currentFile,
      baselineMeta,
      currentMeta,
      thresholds,
    );

    rows.push({
      id,
      label: current.label || baseline.label,
      status: imageChange.changed ? "changed" : "unchanged",
      baselineFile,
      currentFile,
      baseline: baselineMeta,
      current: currentMeta,
      pixelDiff: imageChange.pixelDiff,
      notes: imageChange.notes,
    });
  }

  return {
    comparedAt: new Date().toISOString(),
    baselineRunId: baselineManifest.runId,
    currentRunId: currentManifest.runId,
    baselineBaseUrl: baselineManifest.baseUrl,
    currentBaseUrl: currentManifest.baseUrl,
    thresholds,
    summary: getSummary(rows),
    rows,
  };
}

async function readSnapshotManifest(runDir: string) {
  const manifestPath = path.join(path.resolve(runDir), "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as unknown;

  if (!isSnapshotManifest(manifest)) {
    throw new Error(`Invalid visual snapshot manifest: ${manifestPath}`);
  }

  return manifest;
}

async function readImageMeta(file: string): Promise<SnapshotImageMeta> {
  const buffer = await readFile(file);

  return {
    sha256: createHash("sha256").update(buffer).digest("hex"),
    bytes: buffer.byteLength,
    ...readPngDimensions(buffer, file),
  };
}

async function getImageChange(
  baselineFile: string,
  currentFile: string,
  baseline: SnapshotImageMeta,
  current: SnapshotImageMeta,
  thresholds: PixelDiffThresholds,
) {
  const notes: string[] = [];
  let pixelDiff: PixelDiffResult | undefined;

  if (baseline.width !== current.width || baseline.height !== current.height) {
    notes.push(
      `Dimensions changed from ${baseline.width}x${baseline.height} to ${current.width}x${current.height}.`,
    );

    return {
      changed: true,
      notes,
      pixelDiff,
    };
  }

  if (baseline.sha256 === current.sha256) {
    return {
      changed: false,
      notes,
      pixelDiff,
    };
  }

  pixelDiff = diffPngPixels(
    decodePng(await readFile(baselineFile), baselineFile),
    decodePng(await readFile(currentFile), currentFile),
    thresholds,
  );
  notes.push(
    `Pixel diff: ${pixelDiff.changedPixels}/${pixelDiff.comparedPixels} pixels (${formatRatio(pixelDiff.changedRatio)}), max channel delta ${pixelDiff.maxChannelDelta}, average channel delta ${pixelDiff.averageChannelDelta.toFixed(3)}.`,
  );

  if (pixelDiff.passed) {
    notes.push("Pixel diff is within configured thresholds.");
  } else {
    notes.push("Pixel diff exceeds configured thresholds.");
  }

  if (baseline.bytes !== current.bytes) {
    notes.push(`File size changed by ${current.bytes - baseline.bytes} bytes.`);
  }

  return {
    changed: !pixelDiff.passed,
    notes,
    pixelDiff,
  };
}

function getSummary(rows: SnapshotComparisonRow[]) {
  return rows.reduce(
    (summary, row) => ({
      ...summary,
      [row.status]: summary[row.status] + 1,
    }),
    {
      total: rows.length,
      unchanged: 0,
      changed: 0,
      added: 0,
      missing: 0,
    },
  );
}

function resolveSnapshotFile(runDir: string, file: string) {
  return path.isAbsolute(file) ? file : path.join(path.resolve(runDir), file);
}

function formatThresholds(thresholds: PixelDiffThresholds) {
  return [
    `ratio<=${formatRatio(thresholds.maxChangedPixelRatio)}`,
    `pixels<=${thresholds.maxChangedPixels}`,
    `channel<=${thresholds.channelDelta}`,
  ].join(", ");
}

function formatRatio(value: number) {
  return `${(value * 100).toFixed(4)}%`;
}

function isSnapshotManifest(value: unknown): value is SnapshotManifest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const manifest = value as Partial<SnapshotManifest>;

  return (
    typeof manifest.baseUrl === "string" &&
    typeof manifest.runId === "string" &&
    Array.isArray(manifest.results) &&
    manifest.results.every(isSnapshotResult)
  );
}

function isSnapshotResult(value: unknown): value is VisualSnapshotResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Partial<VisualSnapshotResult>;

  return (
    typeof result.id === "string" &&
    typeof result.label === "string" &&
    typeof result.url === "string" &&
    typeof result.file === "string" &&
    result.status === "captured"
  );
}

void main();
