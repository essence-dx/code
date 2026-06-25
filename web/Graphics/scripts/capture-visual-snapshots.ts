import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ensureSignedIn,
  loadPlaywright,
  normalizeBaseUrl,
  waitForBodyText,
} from "./visual-browser";
import {
  getRuntimeIssueSummary,
  startRuntimeIssueCapture,
} from "./visual-runtime";
import type { RuntimeIssue } from "../src/features/editor/runtime-observability";

type VisualSurface = {
  id: string;
  label: string;
  path: string;
  waitForText: string;
  viewport: {
    width: number;
    height: number;
  };
};

type VisualSnapshotResult = {
  id: string;
  label: string;
  url: string;
  viewport: VisualSurface["viewport"];
  file: string;
  capturedAt: string;
  status: "captured";
  runtimeIssueCount: number;
  runtimeErrorCount: number;
  runtimeWarningCount: number;
  runtimeIssues: RuntimeIssue[];
};

async function main() {
  const playwright = await loadPlaywright();
  const baseUrl = normalizeBaseUrl(
    process.env.ESSENCE_VISUAL_BASE_URL ?? "http://localhost:3000",
  );
  const outputRoot = path.resolve(
    process.env.ESSENCE_VISUAL_OUTPUT_DIR ?? "artifacts/visual-regression",
  );
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.join(outputRoot, runId);

  await mkdir(outputDir, { recursive: true });

  const browser = await playwright.chromium.launch({
    headless: process.env.ESSENCE_VISUAL_HEADLESS !== "0",
  });
  const results: VisualSnapshotResult[] = [];
  const runtimeIssues: RuntimeIssue[] = [];
  const visualSurfaces = getVisualSurfaces();

  try {
    for (const surface of visualSurfaces) {
      const context = await browser.newContext({ viewport: surface.viewport });
      const page = await context.newPage();

      try {
        await ensureSignedIn(page, baseUrl);
        const url = `${baseUrl}${surface.path}`;
        const runtimeCapture = startRuntimeIssueCapture(page, {
          source: "visual-snapshot",
          surfaceId: surface.id,
          surfaceLabel: surface.label,
          url,
        });
        await page.goto(url, { waitUntil: "networkidle" });
        await waitForBodyText(page, surface.waitForText);

        const file = path.join(outputDir, `${surface.id}.png`);
        await page.screenshot({ path: file, fullPage: true });
        const runtimeReport = runtimeCapture.report();
        runtimeCapture.stop();
        runtimeIssues.push(...runtimeReport.issues);
        results.push({
          id: surface.id,
          label: surface.label,
          url,
          viewport: surface.viewport,
          file,
          capturedAt: new Date().toISOString(),
          status: "captured",
          runtimeIssueCount: runtimeReport.issueCount,
          runtimeErrorCount: runtimeReport.errorCount,
          runtimeWarningCount: runtimeReport.warningCount,
          runtimeIssues: runtimeReport.issues,
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  await writeFile(
    path.join(outputDir, "manifest.json"),
    `${JSON.stringify(
      {
        baseUrl,
        runId,
        results,
        runtime: getRuntimeIssueSummary(runtimeIssues),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outputDir, "runtime-issues.json"),
    `${JSON.stringify(getRuntimeIssueSummary(runtimeIssues), null, 2)}\n`,
    "utf8",
  );

  console.log(`Captured ${results.length} visual snapshots in ${outputDir}`);
}

function getVisualSurfaces(): VisualSurface[] {
  const fileId = process.env.ESSENCE_VISUAL_FILE_ID?.trim();
  const shareToken = process.env.ESSENCE_VISUAL_SHARE_TOKEN?.trim();
  const editorPath = fileId ? `/?file=${encodeURIComponent(fileId)}` : "/";
  const surfaces: VisualSurface[] = [
    {
      id: "editor-desktop",
      label: "Authenticated editor desktop",
      path: editorPath,
      waitForText: "Files",
      viewport: { width: 1440, height: 960 },
    },
    {
      id: "editor-mobile",
      label: "Authenticated editor mobile",
      path: editorPath,
      waitForText: "Files",
      viewport: { width: 390, height: 844 },
    },
    {
      id: "admin-dashboard",
      label: "Authenticated admin dashboard",
      path: "/dashboard",
      waitForText: "Admin",
      viewport: { width: 1440, height: 960 },
    },
  ];

  if (shareToken) {
    surfaces.push(
      {
        id: "share-handoff",
        label: "Public share handoff",
        path: `/share/${encodeURIComponent(shareToken)}`,
        waitForText: "shared file",
        viewport: { width: 1440, height: 960 },
      },
      {
        id: "share-prototype",
        label: "Public share prototype",
        path: `/share/${encodeURIComponent(shareToken)}/prototype`,
        waitForText: "Prototype",
        viewport: { width: 1440, height: 960 },
      },
    );
  }

  return surfaces;
}

void main();
