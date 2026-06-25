import { readFileSync } from "node:fs";
import {
  getMediaAssetPipelineReviewCsv,
  getMediaAssetPipelineReviewJson,
  getMediaAssetPipelineReviewMarkdown,
  getMediaAssetPipelineReviewReport,
} from "../src/features/editor/media-asset-pipeline-review";
import type {
  DesignAssetMetadata,
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "../src/features/editor/types";

const generatedAt = "2026-05-19T16:00:00.000Z";
const document = createDocument([
  createImageLayer("hero-photo", "Hero photo", {
    imageSrc: createDataSource("image/png", 620_000),
    imageAlt: "Campaign hero photo",
    metadata: {
      sourceName: "hero.png",
      sourceUrl: "https://assets.example.com/originals/hero.png",
      license: "Commercial usage approved",
      hash: "asset_hero",
      mimeType: "image/png",
      importedAt: generatedAt,
    },
  }),
  createImageLayer("product-video", "Product video", {
    imageSrc: createDataSource("video/mp4", 1_100_000),
    imageAlt: "Product walkthrough video",
    metadata: {
      sourceName: "walkthrough.mp4",
      sourceUrl: "https://assets.example.com/originals/walkthrough.mp4",
      license: "Commercial usage approved",
      hash: "asset_video",
      mimeType: "video/mp4",
      durationSeconds: 42,
      importedAt: generatedAt,
    },
  }),
  createImageLayer("replacement-banner", "Replacement banner", {
    imageSrc: "https://cdn.example.com/banner.webp",
    imageAlt: "Optimized replacement banner",
    metadata: {
      sourceName: "banner.webp",
      sourceUrl: "https://assets.example.com/originals/banner.psd",
      license: "Commercial usage approved",
      hash: "asset_banner_new",
      mimeType: "image/webp",
      importedAt: generatedAt,
      replacementOf: "asset_banner_old",
    },
  }),
  createImageLayer("missing-provenance", "Missing provenance", {
    imageSrc: "https://cdn.example.com/unknown.bmp",
    imageAlt: "",
    metadata: {
      sourceName: "unknown.bmp",
      mimeType: "image/bmp",
    },
  }),
  createImageLayer("missing-source", "Missing source", {
    imageSrc: "",
    imageAlt: "Missing source placeholder",
    metadata: {
      sourceName: "missing.png",
      license: "Unverified upload",
      mimeType: "image/png",
    },
  }),
]);
const readyDocument = createDocument([
  createImageLayer("ready-photo", "Ready photo", {
    imageSrc: "https://cdn.example.com/photo.avif",
    imageAlt: "Ready production photo",
    metadata: {
      sourceName: "photo.avif",
      sourceUrl: "https://assets.example.com/photo.raw",
      license: "Commercial usage approved",
      hash: "asset_photo",
      mimeType: "image/avif",
      importedAt: generatedAt,
    },
  }),
  createImageLayer("ready-replacement", "Ready replacement", {
    imageSrc: "https://cdn.example.com/replacement.webp",
    imageAlt: "Ready replacement image",
    metadata: {
      sourceName: "replacement.webp",
      sourceUrl: "https://assets.example.com/replacement.psd",
      license: "Commercial usage approved",
      hash: "asset_replacement",
      mimeType: "image/webp",
      importedAt: generatedAt,
      replacementOf: "asset_old",
    },
  }),
]);
const report = getMediaAssetPipelineReviewReport({
  document,
  generatedAt,
});
const readyReport = getMediaAssetPipelineReviewReport({
  document: readyDocument,
  generatedAt,
});
const markdown = getMediaAssetPipelineReviewMarkdown(report);
const csv = getMediaAssetPipelineReviewCsv(report);
const json = JSON.parse(getMediaAssetPipelineReviewJson(report)) as {
  bundleManifest: unknown[];
  rows: unknown[];
  summary: {
    compressionCandidateCount: number;
    exportManifestEntryCount: number;
    replacementTrackedCount: number;
    sourceMetadataIssueCount: number;
    status: string;
    uploadProvenanceIssueCount: number;
  };
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const extensionsSource = readFileSync(
  "src/features/editor/components/extensions-panel.tsx",
  "utf8",
);

assert(report.status === "blocked", "Pipeline fixture should block incomplete asset handoff.");
assert(report.imageAssetCount >= 4, "Pipeline should count image assets.");
assert(report.videoAssetCount === 1, "Pipeline should count video assets.");
assert(report.sourceMetadataIssueCount >= 2, "Pipeline should flag source metadata gaps.");
assert(report.uploadProvenanceIssueCount >= 2, "Pipeline should flag upload provenance gaps.");
assert(report.compressionCandidateCount >= 2, "Pipeline should identify compression targets.");
assert(report.replacementTrackedCount === 1, "Pipeline should preserve replacement tracking.");
assert(report.exportManifestEntryCount >= 3, "Pipeline should create export-safe manifest entries.");
assert(
  report.rows.some((row) => row.category === "source-metadata"),
  "Rows should include source metadata evidence.",
);
assert(
  report.rows.some((row) => row.category === "upload-provenance"),
  "Rows should include upload provenance evidence.",
);
assert(
  report.rows.some((row) => row.category === "compression-target"),
  "Rows should include compression target evidence.",
);
assert(
  report.rows.some((row) => row.category === "replacement-tracking"),
  "Rows should include replacement tracking evidence.",
);
assert(
  report.rows.some((row) => row.category === "export-manifest"),
  "Rows should include export manifest evidence.",
);
assert(readyReport.status === "ready", "Ready fixture should pass pipeline review.");
assert(readyReport.blockedCount === 0, "Ready fixture should have no blockers.");
assert(markdown.includes("Media Asset Pipeline Review"), "Markdown should include a clear title.");
assert(markdown.includes("Export Bundle Manifest"), "Markdown should include bundle manifest entries.");
assert(csv.includes("compression-target"), "CSV should include compression target rows.");
assert(json.rows.length === report.rows.length, "JSON should preserve all rows.");
assert(
  json.bundleManifest.length === report.bundleManifest.length,
  "JSON should preserve manifest entries.",
);
assert(json.summary.status === report.status, "JSON summary should preserve status.");
assert(
  json.summary.compressionCandidateCount === report.compressionCandidateCount,
  "JSON summary should preserve compression candidate count.",
);
assert(
  json.summary.exportManifestEntryCount === report.exportManifestEntryCount,
  "JSON summary should preserve manifest entry count.",
);
assert(
  /MediaAssetPipelineReviewPanel/.test(extensionsSource) &&
    /getMediaAssetPipelineReviewReport/.test(extensionsSource),
  "Extensions should wire the media asset pipeline review panel and report.",
);
assert(
  packageJson.scripts["editor:media-asset-pipeline-review-smoke"]?.includes(
    "media-asset-pipeline-review-smoke",
  ),
  "Targeted media asset pipeline smoke command should be listed.",
);

console.log(
  `Media asset pipeline review smoke passed: ${report.score} score, ${report.exportManifestEntryCount} manifest entries, ${report.compressionCandidateCount} compression targets.`,
);

function createDocument(layers: DesignLayer[]): DesignDocument {
  const page: DesignPage = {
    id: "page-media-pipeline",
    name: "Media pipeline",
    background: "#111827",
    layers,
  };

  return {
    version: 1,
    activePageId: page.id,
    pages: [page],
    variables: {},
    components: {},
    updatedAt: generatedAt,
  };
}

function createImageLayer(
  id: string,
  name: string,
  options: {
    imageSrc: string;
    imageAlt: string;
    metadata?: DesignAssetMetadata;
  },
): DesignLayer {
  return {
    id,
    type: "image",
    name,
    x: 120,
    y: 80,
    width: options.metadata?.mimeType?.startsWith("video/") ? 640 : 420,
    height: options.metadata?.mimeType?.startsWith("video/") ? 360 : 280,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: "transparent",
    stroke: "transparent",
    strokeWidth: 0,
    cornerRadius: 0,
    imageSrc: options.imageSrc,
    imageAlt: options.imageAlt,
    imageFit: "cover",
    assetMetadata: options.metadata,
  };
}

function createDataSource(mimeType: string, bytes: number) {
  return `data:${mimeType};base64,${"a".repeat(bytes)}`;
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}
