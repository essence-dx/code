import { escapeHtmlAttribute, getEmbedCode, resolveEmbedDisplayOptions, type EmbedDisplayOptionInput } from "./share-links";

export const PLATFORM_EMBED_PRESETS = [
  { id: "framer", label: "Framer" },
  { id: "webflow", label: "Webflow" },
  { id: "notion", label: "Notion" },
  { id: "shopify", label: "Shopify" },
  { id: "play", label: "Play" },
  { id: "wix", label: "Wix" },
  { id: "wix-studio", label: "Wix Studio" },
  { id: "typedream", label: "Typedream" },
  { id: "tome", label: "Tome" },
  { id: "toddle", label: "Toddle" },
  { id: "instant", label: "Instant" },
] as const;

export type PlatformEmbedPresetId = (typeof PLATFORM_EMBED_PRESETS)[number]["id"];

interface PlatformEmbedPresetOptions {
  embedUrl: string;
  embedOptions?: EmbedDisplayOptionInput;
  sceneName: string;
  shareUrl: string;
}

function getIframeEmbed(embedUrl: string, sceneName: string, embedOptions?: EmbedDisplayOptionInput) {
  return getEmbedCode(embedUrl, sceneName, embedOptions);
}

function getResponsiveIframeEmbed(embedUrl: string, sceneName: string, embedOptions?: EmbedDisplayOptionInput) {
  const escapedTitle = escapeHtmlAttribute(sceneName);
  const escapedUrl = escapeHtmlAttribute(embedUrl);
  const display = resolveEmbedDisplayOptions({ ...embedOptions, responsive: true });
  const background = display.transparentBackground ? "background:transparent;" : "";

  return `<div style="position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;border-radius:${display.radius}px;${background}">
  <iframe src="${escapedUrl}" title="${escapedTitle}" style="position:absolute;inset:0;width:100%;height:100%;border:0;${background}" allow="fullscreen; xr-spatial-tracking" loading="lazy"></iframe>
</div>`;
}

function getShopifyLiquidEmbed(embedUrl: string, sceneName: string, embedOptions?: EmbedDisplayOptionInput) {
  const escapedTitle = escapeHtmlAttribute(sceneName);
  const escapedUrl = escapeHtmlAttribute(embedUrl);
  const display = resolveEmbedDisplayOptions(embedOptions);
  const background = display.transparentBackground ? "background:transparent;" : "";

  return `<section class="essence-spline-scene" style="width:100%;min-height:${display.height}px;${background}">
  <iframe src="${escapedUrl}" title="${escapedTitle}" style="width:100%;height:${display.height}px;border:0;border-radius:${display.radius}px;overflow:hidden;${background}" allow="fullscreen; xr-spatial-tracking" loading="lazy"></iframe>
</section>`;
}

function getWixStudioEmbed(embedUrl: string, sceneName: string) {
  const escapedTitle = escapeHtmlAttribute(sceneName);
  const escapedUrl = escapeHtmlAttribute(embedUrl);

  return `<style>
  html,
  body {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: transparent;
  }

  .essence-spline-wix-studio {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .essence-spline-wix-studio iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
  }
</style>
<div class="essence-spline-wix-studio" aria-label="${escapedTitle}">
  <iframe src="${escapedUrl}" title="${escapedTitle}" allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope" loading="lazy"></iframe>
</div>`;
}

export function getPlatformEmbedPresetCode(presetId: PlatformEmbedPresetId, { embedOptions, embedUrl, sceneName, shareUrl }: PlatformEmbedPresetOptions) {
  switch (presetId) {
    case "framer":
    case "webflow":
    case "typedream":
    case "toddle":
    case "instant":
      return getResponsiveIframeEmbed(embedUrl, sceneName, embedOptions);
    case "notion":
    case "play":
    case "tome":
      return shareUrl;
    case "shopify":
      return getShopifyLiquidEmbed(embedUrl, sceneName, embedOptions);
    case "wix":
      return getIframeEmbed(embedUrl, sceneName, embedOptions);
    case "wix-studio":
      return getWixStudioEmbed(embedUrl, sceneName);
  }

  const exhaustivePreset: never = presetId;
  return exhaustivePreset;
}

export function getPlatformEmbedPresetPayloads(options: PlatformEmbedPresetOptions) {
  return PLATFORM_EMBED_PRESETS.map((preset) => ({
    ...preset,
    code: getPlatformEmbedPresetCode(preset.id, options),
  }));
}
