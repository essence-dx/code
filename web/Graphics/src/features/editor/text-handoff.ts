import type { DesignLayer } from "@/features/editor/types";

export type TextHandoffTokenMatch = {
  property: string;
  token: string;
  value: string;
};

export type TextHandoffEntry = {
  layerId: string;
  layerName: string;
  selector: string;
  css: string;
  platformNotes: string[];
  tokenMatches: TextHandoffTokenMatch[];
};

export type TextHandoffReport = {
  textLayerCount: number;
  tokenMatchCount: number;
  entries: TextHandoffEntry[];
};

export function getTextHandoffReport(
  layers: DesignLayer[],
  variables: Record<string, string> = {},
): TextHandoffReport {
  const entries = layers
    .filter((layer) => layer.text !== undefined)
    .map((layer) => createTextHandoffEntry(layer, variables));

  return {
    textLayerCount: entries.length,
    tokenMatchCount: entries.reduce(
      (count, entry) => count + entry.tokenMatches.length,
      0,
    ),
    entries,
  };
}

export function getTextHandoffMarkdown(report: TextHandoffReport) {
  const lines = [
    "# Selected Text Handoff",
    "",
    `Text layers: ${report.textLayerCount}`,
    `Token matches: ${report.tokenMatchCount}`,
    "",
  ];

  if (report.entries.length === 0) {
    lines.push("No selected text layers.");
  }

  for (const entry of report.entries) {
    lines.push(`## ${entry.layerName}`, "", "```css", entry.css, "```", "");

    if (entry.tokenMatches.length > 0) {
      lines.push("Token matches:");
      for (const match of entry.tokenMatches) {
        lines.push(`- ${match.property}: ${match.token} (${match.value})`);
      }
      lines.push("");
    }

    if (entry.platformNotes.length > 0) {
      lines.push("Platform notes:");
      for (const note of entry.platformNotes) {
        lines.push(`- ${note}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function getTextHandoffJson(report: TextHandoffReport) {
  return JSON.stringify(report, null, 2);
}

function createTextHandoffEntry(
  layer: DesignLayer,
  variables: Record<string, string>,
): TextHandoffEntry {
  const selector = `.${toCssClassName(layer.name)}`;

  return {
    layerId: layer.id,
    layerName: layer.name,
    selector,
    css: getTextLayerCss(layer, selector),
    platformNotes: getPlatformNotes(layer),
    tokenMatches: getTokenMatches(layer, variables),
  };
}

function getTextLayerCss(layer: DesignLayer, selector: string) {
  const rules = [
    `color: ${layer.textColor ?? "#ffffff"};`,
    `font-family: ${layer.fontFamily ?? "Inter, Arial, sans-serif"};`,
    `font-size: ${formatPx(layer.fontSize ?? 16)};`,
    `font-weight: ${layer.fontWeight ?? 400};`,
    `line-height: ${formatNumber(layer.lineHeight ?? 1.25)};`,
    `letter-spacing: ${formatPx(layer.letterSpacing ?? 0)};`,
    `text-align: ${layer.textAlign ?? "left"};`,
    `white-space: ${layer.textResizeMode === "auto-width" ? "pre" : "pre-wrap"};`,
    layer.textResizeMode === "auto-height" ? "height: auto;" : null,
    layer.textResizeMode === "auto-width" ? "width: max-content;" : null,
  ].filter((rule): rule is string => Boolean(rule));

  return [`${selector} {`, ...rules.map((rule) => `  ${rule}`), "}"].join("\n");
}

function getPlatformNotes(layer: DesignLayer) {
  const notes: string[] = [];
  const resizeMode = layer.textResizeMode ?? "fixed";

  if (resizeMode === "auto-width") {
    notes.push("Auto-width text should hug content and preserve explicit line breaks.");
  }

  if (resizeMode === "auto-height") {
    notes.push("Auto-height text should keep width fixed and grow vertically.");
  }

  if (!layer.fontFamily?.trim()) {
    notes.push("Font family is missing; use the document fallback or map a product font.");
  }

  if ((layer.lineHeight ?? 1.25) < 1.1) {
    notes.push("Line height is tight; native platforms may clip descenders.");
  }

  return notes;
}

function getTokenMatches(
  layer: DesignLayer,
  variables: Record<string, string>,
): TextHandoffTokenMatch[] {
  const values = [
    { property: "textColor", value: layer.textColor ?? "#ffffff" },
    { property: "fontFamily", value: layer.fontFamily ?? "Inter, Arial, sans-serif" },
    { property: "fontSize", value: layer.fontSize ?? 16 },
    { property: "lineHeight", value: layer.lineHeight ?? 1.25 },
    { property: "letterSpacing", value: layer.letterSpacing ?? 0 },
  ];
  const tokenValues = Object.entries(variables).map(([token, value]) => ({
    token,
    value,
    normalized: normalizeVariableValue(value),
  }));

  return values.flatMap((item) => {
    const normalized = normalizeVariableValue(item.value);
    const match = tokenValues.find((token) => token.normalized === normalized);

    return match
      ? [{
          property: item.property,
          token: match.token,
          value: String(item.value),
        }]
      : [];
  });
}

function normalizeVariableValue(value: string | number) {
  return String(value).trim().toLowerCase().replace(/px$/, "");
}

function toCssClassName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "text-layer"
  );
}

function formatPx(value: number) {
  return `${formatNumber(value)}px`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
