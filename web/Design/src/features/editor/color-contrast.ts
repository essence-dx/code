type RgbColor = {
  r: number;
  g: number;
  b: number;
};

type TextContrastInput = {
  textColor: string;
  textColors?: readonly string[];
  backgroundColor: string;
  fontSize: number;
  fontWeight: number;
};

export type TextContrastStatus = {
  ratio: number;
  formattedRatio: string;
  requiredRatio: number;
  passesAA: boolean;
  isLargeText: boolean;
  suggestedTextColor: string;
  suggestedRatio: number;
};

const black = "#000000";
const white = "#ffffff";

export function getTextContrastStatus({
  textColor,
  textColors,
  backgroundColor,
  fontSize,
  fontWeight,
}: TextContrastInput): TextContrastStatus {
  const colorsToCheck = textColors?.length ? textColors : [textColor];
  const ratio = Math.min(
    ...colorsToCheck.map((color) => getContrastRatio(color, backgroundColor)),
  );
  const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
  const requiredRatio = isLargeText ? 3 : 4.5;
  const passesAA = ratio >= requiredRatio;
  const blackRatio = getContrastRatio(black, backgroundColor);
  const whiteRatio = getContrastRatio(white, backgroundColor);
  const suggestedTextColor = blackRatio >= whiteRatio ? black : white;
  const suggestedRatio = Math.max(blackRatio, whiteRatio);

  return {
    ratio,
    formattedRatio: `${ratio.toFixed(2)}:1`,
    requiredRatio,
    passesAA,
    isLargeText,
    suggestedTextColor,
    suggestedRatio,
  };
}

export function getContrastRatio(
  foregroundColor: string,
  backgroundColor: string,
) {
  const foreground = parseColor(foregroundColor, black);
  const background = parseColor(backgroundColor, white);
  const foregroundLuminance = getRelativeLuminance(foreground);
  const backgroundLuminance = getRelativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function parseColor(value: string, fallback: string): RgbColor {
  return parseHexColor(value) ?? parseRgbColor(value) ?? parseHexColor(fallback)!;
}

function parseHexColor(value: string): RgbColor | null {
  const normalized = value.trim().toLowerCase();

  if (/^#[0-9a-f]{3}$/.test(normalized)) {
    const [, r, g, b] = normalized;

    return {
      r: Number.parseInt(`${r}${r}`, 16),
      g: Number.parseInt(`${g}${g}`, 16),
      b: Number.parseInt(`${b}${b}`, 16),
    };
  }

  if (!/^#[0-9a-f]{6}$/.test(normalized)) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function parseRgbColor(value: string): RgbColor | null {
  const match = value.trim().match(/^rgba?\(([^)]+)\)$/i);

  if (!match) {
    return null;
  }

  const [r, g, b] = match[1]
    .split(",")
    .slice(0, 3)
    .map((channel) => clampChannel(Number.parseFloat(channel.trim())));

  if ([r, g, b].some((channel) => Number.isNaN(channel))) {
    return null;
  }

  return { r, g, b };
}

function clampChannel(channel: number) {
  return Math.min(255, Math.max(0, channel));
}

function getRelativeLuminance({ r, g, b }: RgbColor) {
  const [linearR, linearG, linearB] = [r, g, b].map((channel) => {
    const normalized = channel / 255;

    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;
}
