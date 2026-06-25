type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export type ContrastReport = {
  ratio: number;
  label: "AAA" | "AA" | "Low";
};

export function getContrastReport(
  foreground: string,
  background: string,
): ContrastReport | null {
  const foregroundRgb = parseHexColor(foreground);
  const backgroundRgb = parseHexColor(background);

  if (!foregroundRgb || !backgroundRgb) {
    return null;
  }

  const light = getRelativeLuminance(foregroundRgb);
  const dark = getRelativeLuminance(backgroundRgb);
  const ratio =
    (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);

  return {
    ratio,
    label: ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : "Low",
  };
}

function parseHexColor(value: string): RgbColor | null {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^#([0-9a-f]{6})$/);

  if (!match?.[1]) {
    return null;
  }

  return {
    r: Number.parseInt(match[1].slice(0, 2), 16),
    g: Number.parseInt(match[1].slice(2, 4), 16),
    b: Number.parseInt(match[1].slice(4, 6), 16),
  };
}

function getRelativeLuminance(color: RgbColor) {
  const channels = [color.r, color.g, color.b].map((channel) => {
    const value = channel / 255;

    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
