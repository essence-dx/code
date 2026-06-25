import type {
  DesignLayer,
  DesignTextResizeMode,
} from "@/features/editor/types";

export type TextLayerReviewStatus = "ready" | "review" | "blocked";

export type TextLayerReviewIssue = {
  id: string;
  layerId: string;
  layerName: string;
  status: Exclude<TextLayerReviewStatus, "ready">;
  label: string;
  detail: string;
};

export type TextLayerReviewLayer = {
  layerId: string;
  layerName: string;
  status: TextLayerReviewStatus;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  estimatedLines: number;
  requiredWidth: number;
  requiredHeight: number;
  width: number;
  height: number;
  issues: TextLayerReviewIssue[];
};

export type TextLayerReviewReport = {
  score: number;
  label: "Ready" | "Review" | "Blocked";
  textLayerCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  issueCount: number;
  layers: TextLayerReviewLayer[];
  issues: TextLayerReviewIssue[];
};

export type TextLayerPatch = {
  layerId: string;
  patch: Partial<DesignLayer>;
};

const textPadding = 24;
const fallbackFontFamily = "Inter, Arial, sans-serif";

export function getTextLayerReview(
  layers: DesignLayer[],
): TextLayerReviewReport {
  const textLayers = layers.filter((layer) => layer.text !== undefined);
  const reviewedLayers = textLayers.map(getTextLayerReviewLayer);
  const issues = reviewedLayers.flatMap((layer) => layer.issues);
  const blockedCount = reviewedLayers.filter(
    (layer) => layer.status === "blocked",
  ).length;
  const reviewCount = reviewedLayers.filter(
    (layer) => layer.status === "review",
  ).length;
  const readyCount = reviewedLayers.filter(
    (layer) => layer.status === "ready",
  ).length;
  const score =
    reviewedLayers.length === 0
      ? 100
      : Math.round(
          ((readyCount + reviewCount * 0.55) / reviewedLayers.length) * 100,
        );

  return {
    score,
    label: blockedCount > 0 ? "Blocked" : reviewCount > 0 ? "Review" : "Ready",
    textLayerCount: reviewedLayers.length,
    readyCount,
    reviewCount,
    blockedCount,
    issueCount: issues.length,
    layers: reviewedLayers,
    issues,
  };
}

export function getTextLayerFitPatches(layers: DesignLayer[]): TextLayerPatch[] {
  return layers
    .filter((layer) => layer.text !== undefined)
    .flatMap((layer) => {
      const metrics = getTextLayerMetrics(layer);
      const width = Math.max(layer.width, Math.ceil(metrics.requiredWidth));
      const height = Math.max(layer.height, Math.ceil(metrics.requiredHeight));

      if (width === layer.width && height === layer.height) {
        return [];
      }

      return [{
        layerId: layer.id,
        patch: {
          width,
          height,
        },
      }];
    });
}

export function getTextLayerNormalizePatches(
  layers: DesignLayer[],
): TextLayerPatch[] {
  return layers
    .filter((layer) => layer.text !== undefined)
    .map((layer) => ({
      layerId: layer.id,
      patch: {
        fontFamily: layer.fontFamily ?? fallbackFontFamily,
        fontSize: layer.fontSize ?? 16,
        fontWeight: layer.fontWeight ?? 400,
        lineHeight: 1.35,
        letterSpacing: 0,
      },
    }));
}

export function getTextLayerResizeModePatch(
  layer: DesignLayer,
  textResizeMode: DesignTextResizeMode,
): Partial<DesignLayer> {
  const metrics = getTextLayerMetrics(layer);
  const patch: Partial<DesignLayer> = { textResizeMode };

  if (textResizeMode === "auto-height") {
    patch.height = Math.max(1, Math.ceil(metrics.requiredHeight));
  }

  if (textResizeMode === "auto-width") {
    patch.width = Math.max(1, Math.ceil(metrics.naturalWidth));
    patch.height = Math.max(1, Math.ceil(metrics.naturalHeight));
  }

  return patch;
}

export function getTextLayerTextPatch(
  layer: DesignLayer,
  text: string,
): Partial<DesignLayer> {
  const nextLayer = { ...layer, text };
  const resizePatch =
    layer.textResizeMode && layer.textResizeMode !== "fixed"
      ? getTextLayerResizeModePatch(nextLayer, layer.textResizeMode)
      : {};

  return {
    ...resizePatch,
    text,
  };
}

export function getTextLayerTypographyPatch(
  layer: DesignLayer,
  patch: Partial<
    Pick<
      DesignLayer,
      | "fontFamily"
      | "fontSize"
      | "fontWeight"
      | "lineHeight"
      | "letterSpacing"
      | "textAlign"
    >
  >,
): Partial<DesignLayer> {
  const nextLayer = { ...layer, ...patch };
  const resizePatch =
    layer.textResizeMode && layer.textResizeMode !== "fixed"
      ? getTextLayerResizeModePatch(nextLayer, layer.textResizeMode)
      : {};

  return {
    ...resizePatch,
    ...patch,
  };
}

export function getTextLayerResizeModePatches(
  layers: DesignLayer[],
  textResizeMode: DesignTextResizeMode,
): TextLayerPatch[] {
  return layers
    .filter((layer) => layer.text !== undefined)
    .map((layer) => ({
      layerId: layer.id,
      patch: getTextLayerResizeModePatch(layer, textResizeMode),
    }));
}

export function getTextLayerReadyPatches(
  layers: DesignLayer[],
): TextLayerPatch[] {
  const report = getTextLayerReview(layers);
  const readyLayerIds = new Set(
    report.layers
      .filter((layer) => layer.status !== "blocked")
      .map((layer) => layer.layerId),
  );

  return layers
    .filter((layer) => readyLayerIds.has(layer.id))
    .map((layer) => ({
      layerId: layer.id,
      patch: { readyForDev: true },
    }));
}

export function getTextLayerReviewCsv(report: TextLayerReviewReport) {
  return [
    [
      "status",
      "layer",
      "layerId",
      "fontFamily",
      "fontSize",
      "lineHeight",
      "letterSpacing",
      "width",
      "height",
      "estimatedLines",
      "requiredWidth",
      "requiredHeight",
      "issues",
    ],
    ...report.layers.map((layer) => [
      layer.status,
      layer.layerName,
      layer.layerId,
      layer.fontFamily,
      layer.fontSize,
      layer.lineHeight,
      layer.letterSpacing,
      layer.width,
      layer.height,
      layer.estimatedLines,
      layer.requiredWidth,
      layer.requiredHeight,
      layer.issues
        .map((issue) => `${issue.status}: ${issue.label} - ${issue.detail}`)
        .join(" | "),
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

function getTextLayerReviewLayer(layer: DesignLayer): TextLayerReviewLayer {
  const metrics = getTextLayerMetrics(layer);
  const issues: TextLayerReviewIssue[] = [];

  if (!layer.text?.trim()) {
    issues.push(createIssue(layer, "review", "Empty text", "Layer has no readable copy."));
  }

  if (!layer.fontFamily?.trim()) {
    issues.push(
      createIssue(
        layer,
        "review",
        "Missing font",
        `Falls back to ${fallbackFontFamily}.`,
      ),
    );
  }

  if (metrics.fontSize < 10) {
    issues.push(
      createIssue(
        layer,
        "review",
        "Tiny text",
        `${metrics.fontSize}px text may be hard to read or inspect.`,
      ),
    );
  }

  if (metrics.lineHeight < 1.05) {
    issues.push(
      createIssue(
        layer,
        "blocked",
        "Tight line height",
        `${metrics.lineHeight} line height can clip multi-line text.`,
      ),
    );
  }

  if (Math.abs(metrics.letterSpacing) > metrics.fontSize * 0.2) {
    issues.push(
      createIssue(
        layer,
        "review",
        "Extreme tracking",
        `${metrics.letterSpacing}px tracking may export differently across platforms.`,
      ),
    );
  }

  if (metrics.requiredHeight > layer.height + 1) {
    issues.push(
      createIssue(
        layer,
        "blocked",
        "Text overflow",
        `Needs about ${Math.ceil(metrics.requiredHeight)}px height; current box is ${Math.round(layer.height)}px.`,
      ),
    );
  }

  if (metrics.requiredWidth > layer.width + 1) {
    issues.push(
      createIssue(
        layer,
        "review",
        "Long word risk",
        `Longest word needs about ${Math.ceil(metrics.requiredWidth)}px width; current box is ${Math.round(layer.width)}px.`,
      ),
    );
  }

  const status = issues.some((issue) => issue.status === "blocked")
    ? "blocked"
    : issues.length > 0
      ? "review"
      : "ready";

  return {
    layerId: layer.id,
    layerName: layer.name,
    status,
    fontFamily: metrics.fontFamily,
    fontSize: metrics.fontSize,
    lineHeight: metrics.lineHeight,
    letterSpacing: metrics.letterSpacing,
    estimatedLines: metrics.estimatedLines,
    requiredWidth: Math.ceil(metrics.requiredWidth),
    requiredHeight: Math.ceil(metrics.requiredHeight),
    width: Math.round(layer.width),
    height: Math.round(layer.height),
    issues,
  };
}

function getTextLayerMetrics(layer: DesignLayer) {
  const fontFamily = layer.fontFamily?.trim() || fallbackFontFamily;
  const fontSize = layer.fontSize ?? 16;
  const lineHeight = layer.lineHeight ?? 1.25;
  const letterSpacing = layer.letterSpacing ?? 0;
  const text = layer.text ?? "";
  const availableWidth = Math.max(1, layer.width - textPadding);
  const averageCharacterWidth = Math.max(
    4,
    fontSize * 0.52 + Math.max(0, letterSpacing) * 0.35,
  );
  const charactersPerLine = Math.max(
    1,
    Math.floor(availableWidth / averageCharacterWidth),
  );
  const wrappedLines = text.split("\n").reduce((count, line) => {
    return count + Math.max(1, Math.ceil(line.length / charactersPerLine));
  }, 0);
  const longestWord = text
    .split(/\s+/)
    .reduce((longest, word) => Math.max(longest, word.length), 0);
  const explicitLines = text.split("\n");
  const longestExplicitLine = explicitLines.reduce(
    (longest, line) => Math.max(longest, line.length),
    0,
  );
  const requiredWidth = longestWord * averageCharacterWidth + textPadding;
  const requiredHeight = wrappedLines * fontSize * lineHeight + textPadding;
  const naturalWidth =
    Math.max(1, longestExplicitLine) * averageCharacterWidth + textPadding;
  const naturalHeight =
    Math.max(1, explicitLines.length) * fontSize * lineHeight + textPadding;

  return {
    fontFamily,
    fontSize,
    lineHeight,
    letterSpacing,
    estimatedLines: wrappedLines,
    requiredWidth,
    requiredHeight,
    naturalWidth,
    naturalHeight,
  };
}

function createIssue(
  layer: DesignLayer,
  status: Exclude<TextLayerReviewStatus, "ready">,
  label: string,
  detail: string,
): TextLayerReviewIssue {
  return {
    id: `${layer.id}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    layerId: layer.id,
    layerName: layer.name,
    status,
    label,
    detail,
  };
}

function formatCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
