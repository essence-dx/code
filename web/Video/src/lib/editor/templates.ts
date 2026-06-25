import type { TimelineLayer } from "@/lib/editor/types";
import { createId } from "@/lib/editor/factory";
import { cloneLayerKeyframes } from "@/lib/editor/keyframes";

export interface StickerPreset {
  id: string;
  label: string;
  text: string;
  fill: string;
  background: string;
}

export interface EditorTemplatePreset {
  id: string;
  label: string;
  description: string;
  category: "social" | "ad" | "explainer" | "meme" | "thumbnail" | "banner" | "caption" | "intro" | "outro" | "layout";
  preview: {
    layers: number;
    bestFor: string;
    duration: string;
  };
  createLayers: (trackStart: number, options?: EditorTemplateOptions) => TimelineLayer[];
}

export interface EditorTemplateOptions {
  brandColors?: string[];
}

export interface SavedEditorTemplate {
  id: string;
  label: string;
  description: string;
  layers: TimelineLayer[];
  createdAt: string;
}

export interface SavedTemplateInstantiation {
  layers: TimelineLayer[];
  missingAssetCount: number;
}

export const stickerPresets: StickerPreset[] = [
  { id: "new-tag", label: "New tag", text: "NEW", fill: "#052e16", background: "#86efac" },
  { id: "sale-tag", label: "Sale tag", text: "SALE", fill: "#450a0a", background: "#fca5a5" },
  { id: "like-chip", label: "Like chip", text: "LIKE", fill: "#172554", background: "#93c5fd" },
  { id: "arrow-chip", label: "Arrow chip", text: "WATCH", fill: "#1c1917", background: "#fcd34d" },
];

export const editorTemplates: EditorTemplatePreset[] = [
  {
    id: "meme-captions",
    label: "Meme captions",
    description: "Top and bottom caption blocks.",
    category: "meme",
    preview: { layers: 2, bestFor: "Short-form jokes", duration: "5s" },
    createLayers: (trackStart) => [
      createTextTemplateLayer("Top caption", "ADD HEADLINE", trackStart, 0.5, 0.16, 880, 110, 0, {
        background: "#00000088",
        fontSize: 54,
      }),
      createTextTemplateLayer("Bottom caption", "ADD PUNCHLINE", trackStart + 1, 0.5, 0.84, 880, 110, 0, {
        background: "#00000088",
        fontSize: 54,
      }),
    ],
  },
  {
    id: "lower-third",
    label: "Lower third",
    description: "Name, role, and accent bar.",
    category: "social",
    preview: { layers: 4, bestFor: "Introductions", duration: "5s" },
    createLayers: (trackStart, options) => {
      const brand = templateBrand(options);
      return [
        createShapeTemplateLayer("Lower third plate", trackStart, 0.37, 0.78, 720, 120, brand.surface),
        createShapeTemplateLayer("Accent bar", trackStart + 1, 0.17, 0.78, 20, 120, brand.primary),
        createTextTemplateLayer("Name", "Creator Name", trackStart + 2, 0.42, 0.75, 560, 48, 0, { fill: brand.text, fontSize: 34 }),
        createTextTemplateLayer("Role", "Title or handle", trackStart + 3, 0.42, 0.81, 560, 40, 0, {
          fill: brand.secondary,
          fontSize: 22,
          fontWeight: 500,
        }),
      ];
    },
  },
  {
    id: "outro-cta",
    label: "Outro CTA",
    description: "Closing card with title, handle, and subscribe prompt.",
    category: "outro",
    preview: { layers: 5, bestFor: "End screens", duration: "6s" },
    createLayers: (trackStart, options) => {
      const brand = templateBrand(options);
      return [
        createShapeTemplateLayer("Outro card", trackStart, 0.5, 0.5, 820, 420, brand.surface),
        createShapeTemplateLayer("Outro top rule", trackStart + 1, 0.5, 0.31, 560, 12, brand.primary),
        createTextTemplateLayer("Outro title", "Watch next", trackStart + 2, 0.5, 0.43, 620, 78, 0, {
          fill: brand.text,
          fontSize: 50,
        }),
        createTextTemplateLayer("Outro handle", "@creator", trackStart + 3, 0.5, 0.55, 420, 48, 0, {
          fill: brand.secondary,
          fontSize: 28,
          fontWeight: 600,
        }),
        createTextTemplateLayer("Outro CTA", "Subscribe for more", trackStart + 4, 0.5, 0.68, 420, 58, 0, {
          fill: brand.ctaText,
          background: brand.accent,
          fontSize: 28,
          radius: 14,
        }),
      ];
    },
  },
  {
    id: "product-spotlight",
    label: "Product spotlight",
    description: "Headline, price chip, and callout.",
    category: "ad",
    preview: { layers: 3, bestFor: "Offers and launches", duration: "5s" },
    createLayers: (trackStart) => [
      createTextTemplateLayer("Product headline", "Make it stand out", trackStart, 0.5, 0.18, 860, 90, 0, {
        fill: "#ecfeff",
        background: "#164e63cc",
        fontSize: 48,
      }),
      createTextTemplateLayer("Price chip", "$0 tools", trackStart + 1, 0.79, 0.72, 260, 86, -4, {
        fill: "#1c1917",
        background: "#fde68a",
        fontSize: 40,
      }),
      createShapeTemplateLayer("Spotlight frame", trackStart + 2, 0.5, 0.52, 720, 420, "#ffffff18"),
    ],
  },
  {
    id: "split-screen",
    label: "Split screen",
    description: "Two framed panels for before and after edits.",
    category: "layout",
    preview: { layers: 4, bestFor: "Comparisons", duration: "5s" },
    createLayers: (trackStart) => [
      createShapeTemplateLayer("Left frame", trackStart, 0.28, 0.5, 460, 520, "#ffffff26"),
      createShapeTemplateLayer("Right frame", trackStart + 1, 0.72, 0.5, 460, 520, "#a3a3a326"),
      createTextTemplateLayer("Left label", "Before", trackStart + 2, 0.28, 0.2, 220, 56, 0, { background: "#00000099" }),
      createTextTemplateLayer("Right label", "After", trackStart + 3, 0.72, 0.2, 220, 56, 0, { background: "#00000099" }),
    ],
  },
  {
    id: "shorts-hook",
    label: "Shorts hook",
    description: "Fast hook, proof line, and follow prompt.",
    category: "social",
    preview: { layers: 4, bestFor: "Short clips", duration: "6s" },
    createLayers: (trackStart) => [
      createShapeTemplateLayer("Hook plate", trackStart, 0.5, 0.18, 760, 116, "#171717cc"),
      createTextTemplateLayer("Hook", "STOP SCROLLING", trackStart + 1, 0.5, 0.18, 700, 70, -1, {
        background: "transparent",
        fontSize: 48,
      }),
      createTextTemplateLayer("Proof", "Here is the shortcut", trackStart + 2, 0.5, 0.8, 640, 58, 0, {
        fill: "#171717",
        background: "#e5e5e5",
        fontSize: 32,
      }),
      createTextTemplateLayer("Follow prompt", "SAVE THIS", trackStart + 3, 0.82, 0.12, 220, 54, 4, {
        fill: "#1c1917",
        background: "#fde68a",
        fontSize: 28,
      }),
    ],
  },
  {
    id: "explainer-steps",
    label: "Explainer steps",
    description: "Three-step teaching layout with numbered markers.",
    category: "explainer",
    preview: { layers: 6, bestFor: "Tutorials", duration: "8s" },
    createLayers: (trackStart) => [
      createTextTemplateLayer("Explainer title", "How it works", trackStart, 0.5, 0.16, 760, 70, 0, { fontSize: 46 }),
      createShapeTemplateLayer("Step one marker", trackStart + 1, 0.18, 0.42, 72, 72, "#ffffff"),
      createTextTemplateLayer("Step one", "1", trackStart + 2, 0.18, 0.42, 72, 72, 0, { fill: "#171717", fontSize: 38 }),
      createShapeTemplateLayer("Step two marker", trackStart + 3, 0.5, 0.42, 72, 72, "#a3a3a3"),
      createTextTemplateLayer("Step two", "2", trackStart + 4, 0.5, 0.42, 72, 72, 0, { fill: "#171717", fontSize: 38 }),
      createTextTemplateLayer("Step caption", "Explain each step in plain language", trackStart + 5, 0.5, 0.7, 760, 72, 0, {
        background: "#00000088",
        fontSize: 34,
      }),
    ],
  },
  {
    id: "thumbnail-title",
    label: "Thumbnail title",
    description: "Large title, side tag, and focus frame.",
    category: "thumbnail",
    preview: { layers: 4, bestFor: "Video thumbnails", duration: "5s" },
    createLayers: (trackStart) => [
      createShapeTemplateLayer("Thumbnail focus frame", trackStart, 0.5, 0.53, 840, 520, "#ffffff22"),
      createTextTemplateLayer("Thumbnail title", "BIG RESULT", trackStart + 1, 0.36, 0.25, 560, 118, -3, {
        fill: "#fef2f2",
        background: "#991b1bcc",
        fontSize: 62,
      }),
      createTextTemplateLayer("Thumbnail tag", "FREE", trackStart + 2, 0.78, 0.68, 220, 84, 5, {
        fill: "#052e16",
        background: "#86efac",
        fontSize: 42,
      }),
      createShapeTemplateLayer("Accent slash", trackStart + 3, 0.78, 0.25, 42, 260, "#fde68a"),
    ],
  },
  {
    id: "banner-title",
    label: "Banner title",
    description: "Wide banner title with subtitle and accent rule.",
    category: "banner",
    preview: { layers: 4, bestFor: "Headers and channel art", duration: "5s" },
    createLayers: (trackStart) => [
      createShapeTemplateLayer("Banner plate", trackStart, 0.5, 0.5, 900, 280, "#000000cc"),
      createTextTemplateLayer("Banner title", "Creator Channel", trackStart + 1, 0.5, 0.44, 760, 80, 0, { fontSize: 52 }),
      createTextTemplateLayer("Banner subtitle", "New videos every week", trackStart + 2, 0.5, 0.56, 620, 44, 0, {
        fill: "#d4d4d4",
        fontSize: 26,
        fontWeight: 500,
      }),
      createShapeTemplateLayer("Banner rule", trackStart + 3, 0.5, 0.67, 520, 10, "#ffffff"),
    ],
  },
  {
    id: "intro-title",
    label: "Intro title",
    description: "Opening title, episode line, and motion-ready accent.",
    category: "intro",
    preview: { layers: 5, bestFor: "Series intros", duration: "6s" },
    createLayers: (trackStart, options) => {
      const brand = templateBrand(options);
      return [
        createShapeTemplateLayer("Intro background bar", trackStart, 0.5, 0.52, 780, 220, brand.surface),
        createShapeTemplateLayer("Intro accent", trackStart + 1, 0.2, 0.52, 34, 220, brand.accent),
        createTextTemplateLayer("Intro title", "ESSENCE NOTES", trackStart + 2, 0.52, 0.46, 680, 72, 0, {
          fill: brand.text,
          fontSize: 46,
        }),
        createTextTemplateLayer("Intro episode", "Episode 01", trackStart + 3, 0.52, 0.57, 360, 44, 0, {
          fill: brand.secondary,
          fontSize: 24,
          fontWeight: 500,
        }),
        createTextTemplateLayer("Intro badge", "START", trackStart + 4, 0.78, 0.34, 160, 52, 6, {
          fill: brand.ctaText,
          background: brand.primary,
          fontSize: 28,
        }),
      ];
    },
  },
  {
    id: "caption-stack",
    label: "Caption stack",
    description: "Readable subtitle stack with speaker and emphasis line.",
    category: "caption",
    preview: { layers: 3, bestFor: "Talking-head clips", duration: "5s" },
    createLayers: (trackStart) => [
      createTextTemplateLayer("Speaker label", "SPEAKER", trackStart, 0.2, 0.72, 240, 46, 0, {
        fill: "#171717",
        background: "#e5e5e5",
        fontSize: 24,
      }),
      createTextTemplateLayer("Caption line", "Add the main caption here", trackStart + 1, 0.5, 0.82, 760, 72, 0, {
        background: "#000000aa",
        fontSize: 36,
      }),
      createTextTemplateLayer("Emphasis word", "KEY POINT", trackStart + 2, 0.75, 0.72, 260, 46, 0, {
        fill: "#1c1917",
        background: "#fde68a",
        fontSize: 24,
      }),
    ],
  },
];

export function createStickerLayer(preset: StickerPreset, track: number): TimelineLayer {
  return {
    ...createTextTemplateLayer(preset.label, preset.text, track, 0.74, 0.28, 240, 92, -6, {
      fill: preset.fill,
      background: preset.background,
      fontSize: 42,
      fontWeight: 900,
    }),
    kind: "sticker",
  };
}

export function createSavedTimelineTemplate(label: string, layers: TimelineLayer[]): SavedEditorTemplate | null {
  const templateLayers = layers.filter((layer) => !layer.hidden);
  if (!templateLayers.length) return null;

  const now = new Date().toISOString();
  const minStart = Math.min(...templateLayers.map((layer) => layer.start));
  const minTrack = Math.min(...templateLayers.map((layer) => layer.track));
  const groupIds = new Map<string, string>();
  const normalizedLayers = templateLayers.map((layer) =>
    cloneTemplateLayer(layer, {
      start: Math.max(0, layer.start - minStart),
      track: Math.max(0, layer.track - minTrack),
      groupId: templateGroupId(layer.groupId, groupIds),
    }),
  );

  return {
    id: createId("template"),
    label: cleanTemplateLabel(label),
    description: `${normalizedLayers.length} ${normalizedLayers.length === 1 ? "layer" : "layers"}`,
    layers: normalizedLayers,
    createdAt: now,
  };
}

export function instantiateSavedTemplate(
  template: SavedEditorTemplate,
  trackStart: number,
  availableAssetIds: Set<string>,
): SavedTemplateInstantiation {
  let missingAssetCount = 0;
  const groupIds = new Map<string, string>();
  const layers = template.layers.flatMap((layer) => {
    if (layer.assetId && !availableAssetIds.has(layer.assetId)) {
      missingAssetCount += 1;
      return [];
    }

    return [
      cloneTemplateLayer(layer, {
        track: layer.track + trackStart,
        groupId: templateGroupId(layer.groupId, groupIds),
      }),
    ];
  });

  return { layers, missingAssetCount };
}

function createTextTemplateLayer(
  name: string,
  text: string,
  track: number,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
  style: Partial<TimelineLayer["style"]> = {},
): TimelineLayer {
  const now = new Date().toISOString();

  return {
    id: createId("layer"),
    kind: "text",
    name,
    track,
    start: 0,
    duration: 5,
    trimStart: 0,
    playbackRate: 1,
    text,
    locked: false,
    muted: false,
    hidden: false,
    transform: {
      x,
      y,
      width,
      height,
      rotation,
      scale: 1,
    },
    style: {
      fill: "#ffffff",
      stroke: "transparent",
      background: "transparent",
      fontFamily: "Geist",
      fontSize: 36,
      fontWeight: 800,
      radius: 10,
      opacity: 1,
      blur: 0,
      ...style,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function cloneTemplateLayer(layer: TimelineLayer, patch: Partial<TimelineLayer> = {}): TimelineLayer {
  const now = new Date().toISOString();

  return {
    ...layer,
    id: createId("layer"),
    transform: { ...layer.transform, crop: layer.transform.crop ? { ...layer.transform.crop } : undefined },
    style: { ...layer.style },
    keyframes: cloneLayerKeyframes(layer.keyframes),
    cues: layer.cues?.map((cue) => ({ ...cue, id: createId("cue") })),
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

function cleanTemplateLabel(label: string) {
  const trimmed = label.trim().replace(/\s+/g, " ");
  return trimmed || "Saved template";
}

function templateBrand(options: EditorTemplateOptions | undefined) {
  const colors = (options?.brandColors ?? []).filter((color) => /^#[0-9a-f]{6}$/i.test(color));
  const primary = colors[0] ?? "#ffffff";
  const secondary = colors[1] ?? "#d4d4d4";
  const accent = colors[2] ?? "#a3a3a3";

  return {
    primary,
    secondary,
    accent,
    surface: withAlpha(colors[3] ?? "#171717", "cc"),
    text: colors[4] ?? "#ffffff",
    ctaText: readableTextOn(accent),
  };
}

function withAlpha(color: string, alpha: string) {
  return color.length === 7 ? `${color}${alpha}` : color;
}

function readableTextOn(color: string) {
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.58 ? "#171717" : "#ffffff";
}

function templateGroupId(groupId: string | undefined, groupIds: Map<string, string>) {
  if (!groupId) return undefined;
  const existing = groupIds.get(groupId);
  if (existing) return existing;

  const next = createId("group");
  groupIds.set(groupId, next);
  return next;
}

function createShapeTemplateLayer(
  name: string,
  track: number,
  x: number,
  y: number,
  width: number,
  height: number,
  background: string,
): TimelineLayer {
  const now = new Date().toISOString();

  return {
    id: createId("layer"),
    kind: "shape",
    name,
    track,
    start: 0,
    duration: 5,
    trimStart: 0,
    playbackRate: 1,
    locked: false,
    muted: false,
    hidden: false,
    transform: {
      x,
      y,
      width,
      height,
      rotation: 0,
      scale: 1,
    },
    style: {
      fill: background,
      stroke: "transparent",
      background,
      fontFamily: "Geist",
      fontSize: 1,
      fontWeight: 400,
      radius: 18,
      opacity: 1,
      blur: 0,
    },
    createdAt: now,
    updatedAt: now,
  };
}
