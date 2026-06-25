import type { EditorProject, MediaAsset, TimelineLayer } from "@/lib/editor/types";
import type { SelfHostedUploadEvidencePacket, SelfHostedUploadHistoryEntry } from "@/lib/media/self-hosted-upload-history";
import type { HostedReviewLinkSummary } from "@/lib/projects/hosted-review-link-contracts";

export interface CreatorQaSampleProjectFixture {
  project: EditorProject;
  assets: MediaAsset[];
  reviewLinks: HostedReviewLinkSummary[];
  uploadEvidence: SelfHostedUploadEvidencePacket;
}

const fixtureTimestamp = "2026-05-16T00:00:00.000Z";
const fixtureCheckedAt = Date.parse(fixtureTimestamp);

export function createCreatorQaSampleProjectFixture(): CreatorQaSampleProjectFixture {
  const assets = createCreatorQaAssets();
  const project = createCreatorQaProject();

  return {
    project,
    assets,
    reviewLinks: createCreatorQaReviewLinks(project.id),
    uploadEvidence: createCreatorQaUploadEvidence(assets),
  };
}

function createCreatorQaProject(): EditorProject {
  return {
    formatVersion: 1,
    id: "project_creator_qa_fixture",
    title: "Creator QA fixture - launch edit",
    aspectRatio: "16:9",
    socialFormatId: "youtube-16-9",
    width: 1920,
    height: 1080,
    duration: 210,
    fps: 30,
    background: "#0b1020",
    snapInterval: 0.25,
    rippleMode: true,
    layers: [
      mediaLayer({ id: "layer_host_video", assetId: "asset_host_video", name: "Host camera A", track: 0, start: 0, duration: 120 }),
      mediaLayer({ id: "layer_product_video", assetId: "asset_product_video", name: "Product desktop capture", track: 1, start: 35, duration: 95 }),
      mediaLayer({ id: "layer_outro_video", assetId: "asset_outro_video", name: "Outro camera B", track: 0, start: 120, duration: 90 }),
      mediaLayer({ id: "layer_stock_broll", assetId: "asset_stock_broll", name: "Stock B-roll overlay", track: 2, start: 18, duration: 38 }),
      mediaLayer({ id: "layer_stock_cutaway", assetId: "asset_stock_image", kind: "image", name: "Stock cutaway image", track: 3, start: 72, duration: 16 }),
      textLayer({ id: "layer_lower_third", name: "Lower third title", track: 4, start: 10, duration: 18, text: "Launch edit review" }),
      subtitleLayer(),
      mediaLayer({ id: "layer_voiceover", assetId: "asset_voiceover", kind: "audio", name: "Voiceover master", track: 6, start: 0, duration: 210, volume: 0.95 }),
      mediaLayer({ id: "layer_music", assetId: "asset_stock_music", kind: "audio", name: "Stock music bed", track: 7, start: 0, duration: 210, volume: 0.18 }),
      progressLayer(),
    ],
    markers: [
      marker("marker_hook", 0, "Hook"),
      marker("marker_demo", 35, "Demo"),
      marker("marker_cta", 176, "CTA"),
    ],
    mediaCollections: [
      {
        id: "collection_stock",
        name: "Approved stock assets",
        assetIds: ["asset_stock_broll", "asset_stock_image", "asset_stock_music"],
        createdAt: fixtureTimestamp,
        updatedAt: fixtureTimestamp,
      },
    ],
    layerStylePresets: [],
    audioMixPresets: [],
    brandTypographyPresets: [],
    brandKit: {
      logoAssetIds: ["asset_stock_image"],
      fontAssets: [],
      defaultPrimaryColor: "#ffffff",
      defaultSecondaryColor: "#d4d4d4",
      enforceColors: true,
      enforceTypography: false,
      enforceLogo: false,
    },
    updatedAt: fixtureTimestamp,
  };
}

function createCreatorQaAssets(): MediaAsset[] {
  return [
    asset({
      id: "asset_host_video",
      name: "host-camera-a.mp4",
      type: "video",
      mimeType: "video/mp4",
      size: 94_000_000,
      duration: 124,
      width: 1920,
      height: 1080,
      source: "tauri-fs",
      storageKey: "G:\\Kapwing\\fixtures\\creator-qa\\host-camera-a.mp4",
      objectUrl: "file:///G:/Kapwing/fixtures/creator-qa/host-camera-a.mp4",
    }),
    asset({
      id: "asset_product_video",
      name: "product-desktop-capture.mp4",
      type: "video",
      mimeType: "video/mp4",
      size: 126_000_000,
      duration: 98,
      width: 1920,
      height: 1080,
      source: "tauri-fs",
      storageKey: "G:\\Kapwing\\fixtures\\creator-qa\\product-desktop-capture.mp4",
      objectUrl: "file:///G:/Kapwing/fixtures/creator-qa/product-desktop-capture.mp4",
    }),
    asset({
      id: "asset_outro_video",
      name: "outro-camera-b.mp4",
      type: "video",
      mimeType: "video/mp4",
      size: 68_000_000,
      duration: 92,
      width: 1920,
      height: 1080,
      source: "browser-opfs",
      storageKey: "opfs://creator-qa/outro-camera-b.mp4",
      objectUrl: "blob:creator-qa/outro-camera-b",
    }),
    asset({
      id: "asset_stock_broll",
      name: "stock-editor-broll.mp4",
      type: "video",
      mimeType: "video/mp4",
      size: 22_000_000,
      duration: 40,
      width: 1920,
      height: 1080,
      source: "self-hosted-url",
      storageKey: "https://cdn.example.test/creator-qa/stock-editor-broll.mp4",
      objectUrl: "https://cdn.example.test/creator-qa/stock-editor-broll.mp4",
    }),
    asset({
      id: "asset_stock_image",
      name: "stock-product-cutaway.webp",
      type: "image",
      mimeType: "image/webp",
      size: 2_200_000,
      duration: 0,
      width: 1920,
      height: 1080,
      source: "self-hosted-url",
      storageKey: "https://cdn.example.test/creator-qa/stock-product-cutaway.webp",
      objectUrl: "https://cdn.example.test/creator-qa/stock-product-cutaway.webp",
    }),
    asset({
      id: "asset_voiceover",
      name: "voiceover-master.wav",
      type: "audio",
      mimeType: "audio/wav",
      size: 31_000_000,
      duration: 210,
      source: "browser-indexeddb",
      storageKey: "indexeddb://creator-qa/voiceover-master.wav",
      objectUrl: "blob:creator-qa/voiceover-master",
      waveformPeaks: [0.12, 0.4, 0.52, 0.34, 0.6, 0.45, 0.22],
    }),
    asset({
      id: "asset_stock_music",
      name: "stock-music-bed.mp3",
      type: "audio",
      mimeType: "audio/mpeg",
      size: 7_600_000,
      duration: 210,
      source: "self-hosted-url",
      storageKey: "https://cdn.example.test/creator-qa/stock-music-bed.mp3",
      objectUrl: "https://cdn.example.test/creator-qa/stock-music-bed.mp3",
      waveformPeaks: [0.18, 0.2, 0.22, 0.2, 0.18],
    }),
  ];
}

function createCreatorQaReviewLinks(projectId: string): HostedReviewLinkSummary[] {
  return [
    reviewLink({ id: "review_link_comment", projectId, permission: "comment-only", title: "Creator QA comment review", token: "creator-qa-comment" }),
    reviewLink({ id: "review_link_download", projectId, permission: "download", title: "Creator QA download handoff", token: "creator-qa-download" }),
  ];
}

function createCreatorQaUploadEvidence(assets: MediaAsset[]): SelfHostedUploadEvidencePacket {
  const stockAssets = assets.filter((asset) => asset.source === "self-hosted-url");
  const entries: SelfHostedUploadHistoryEntry[] = stockAssets.map((assetItem, index) => ({
    id: `upload_check_creator_qa_${index + 1}`,
    assetId: assetItem.id,
    assetName: assetItem.name,
    status: "verified",
    publicUrl: assetItem.storageKey,
    checkedAt: fixtureCheckedAt + index,
    httpStatus: 200,
    message: "Public media URL is reachable.",
  }));

  return {
    schemaVersion: 1,
    exportedAt: fixtureCheckedAt,
    entryCount: entries.length,
    verifiedCount: entries.length,
    limitedCount: 0,
    failedCount: 0,
    entries,
  };
}

function asset(input: Omit<MediaAsset, "createdAt">): MediaAsset {
  return {
    ...input,
    createdAt: fixtureTimestamp,
  };
}

function mediaLayer(input: {
  id: string;
  assetId: string;
  kind?: "video" | "image" | "audio";
  name: string;
  track: number;
  start: number;
  duration: number;
  volume?: number;
}): TimelineLayer {
  const kind = input.kind ?? "video";

  return layer({
    ...input,
    kind,
    volume: input.volume ?? 1,
    transform: kind === "audio" ? transform(1, 1) : transform(1728, 972),
    style: style({ opacity: kind === "audio" ? 0 : 1 }),
  });
}

function textLayer(input: { id: string; name: string; track: number; start: number; duration: number; text: string }): TimelineLayer {
  return layer({
    ...input,
    kind: "text",
    transform: { x: 0.5, y: 0.78, width: 860, height: 130, rotation: 0, scale: 1, framing: "fit", crop: { x: 0, y: 0, width: 1, height: 1 } },
    style: style({ background: "#000000cc", fill: "#fafafa", fontSize: 54, radius: 12, shadowBlur: 12, shadowColor: "#000000" }),
  });
}

function subtitleLayer(): TimelineLayer {
  return layer({
    id: "layer_captions",
    kind: "subtitle",
    name: "Reviewed captions",
    track: 5,
    start: 0,
    duration: 210,
    transform: { x: 0.5, y: 0.88, width: 1320, height: 150, rotation: 0, scale: 1, framing: "fit", crop: { x: 0, y: 0, width: 1, height: 1 } },
    style: style({ background: "#000000cc", fontSize: 46, radius: 10 }),
    cues: [
      { id: "cue_hook", start: 0, end: 4.5, text: "Here is the release edit before it ships.", emphasis: "strong" },
      { id: "cue_demo", start: 36, end: 42, text: "The product demo uses live captures and approved stock.", emphasis: "normal" },
      { id: "cue_voiceover", start: 96, end: 103, text: "Voiceover, captions, and music are checked together.", emphasis: "normal" },
      { id: "cue_handoff", start: 176, end: 184, text: "Review links and upload proof are ready for handoff.", emphasis: "strong" },
    ],
  });
}

function progressLayer(): TimelineLayer {
  return layer({
    id: "layer_progress",
    kind: "progress",
    name: "Delivery progress bar",
    track: 8,
    start: 0,
    duration: 210,
    transform: { x: 0.5, y: 0.965, width: 1540, height: 18, rotation: 0, scale: 1, framing: "fit", crop: { x: 0, y: 0, width: 1, height: 1 } },
    style: style({ fill: "#ffffff", background: "#171717cc", radius: 999, shadowBlur: 10, shadowColor: "#ffffff" }),
  });
}

function layer(input: Partial<TimelineLayer> & Pick<TimelineLayer, "id" | "kind" | "name" | "track" | "start" | "duration">): TimelineLayer {
  return {
    trimStart: 0,
    playbackRate: 1,
    speed: { reversed: false, preservePitch: true, ramp: { enabled: false, mode: "linear", startRate: 1, endRate: 1 } },
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    locked: false,
    muted: false,
    hidden: false,
    transform: transform(1280, 720),
    motion: { preset: "none", intensity: 1 },
    transition: { in: "fade", out: "fade", duration: 0.35 },
    style: style(),
    reviewStatus: "approved",
    reviewUpdatedAt: fixtureTimestamp,
    createdAt: fixtureTimestamp,
    updatedAt: fixtureTimestamp,
    ...input,
  };
}

function transform(width: number, height: number): TimelineLayer["transform"] {
  return {
    x: 0.5,
    y: 0.5,
    width,
    height,
    rotation: 0,
    scale: 1,
    flipX: false,
    flipY: false,
    framing: "fill",
    crop: { x: 0, y: 0, width: 1, height: 1 },
  };
}

function style(overrides: Partial<TimelineLayer["style"]> = {}): TimelineLayer["style"] {
  return {
    fill: "#ffffff",
    stroke: "transparent",
    background: "transparent",
    fontFamily: "Geist",
    fontSize: 42,
    fontWeight: 700,
    radius: 8,
    opacity: 1,
    blur: 0,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    borderWidth: 0,
    shadowBlur: 0,
    shadowColor: "#000000",
    ...overrides,
  };
}

function marker(id: string, time: number, label: string) {
  return {
    id,
    time,
    label,
    color: "#ffffff",
    createdAt: fixtureTimestamp,
    updatedAt: fixtureTimestamp,
  };
}

function reviewLink(input: {
  id: string;
  projectId: string;
  permission: HostedReviewLinkSummary["permission"];
  title: string;
  token: string;
}): HostedReviewLinkSummary {
  return {
    id: input.id,
    projectId: input.projectId,
    title: input.title,
    url: `https://essence-kapwing-blue.vercel.app/share/${input.token}`,
    permission: input.permission,
    enabled: true,
    expired: false,
    exportName: "creator-qa-launch-edit.mp4",
    expiresAt: "2026-06-16T00:00:00.000Z",
    createdAt: fixtureTimestamp,
    updatedAt: fixtureTimestamp,
  };
}
