import type {
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
  ProjectDetail,
} from "@/features/editor/types";
import type {
  MediaBumperOutroPreset,
  MediaLowerThirdPreset,
} from "@/features/media-delivery/media-brand-delivery-kits-types";

export function createMediaLowerThirdPresets(input: {
  project: ProjectDetail;
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
}): MediaLowerThirdPreset[] {
  const headingFont =
    findBrandFont(input.brandFonts, "heading") ??
    findBrandFont(input.brandFonts, "subheading");
  const captionFont =
    findBrandFont(input.brandFonts, "caption") ??
    findBrandFont(input.brandFonts, "body");
  const surfaceColor = input.brandColors[0]?.color ?? "#111827";
  const accentColor = input.brandColors[1]?.color ?? "#0ea5e9";
  const textColor = getReadableTextColor(surfaceColor);

  return [
    {
      id: `lower-third-speaker-${input.project.id}`,
      role: "speaker",
      label: "Speaker lower third",
      fontFamily: headingFont?.fontFamily ?? "Geist",
      fontSize: headingFont?.fontSize ?? 40,
      fontWeight: headingFont?.fontWeight ?? 800,
      textColor,
      surfaceColor,
      accentColor,
      durationSeconds: 4,
      safeAreaPercent: 8,
      previewText: "Name / Role",
    },
    {
      id: `lower-third-section-${input.project.id}`,
      role: "section",
      label: "Section title lower third",
      fontFamily: headingFont?.fontFamily ?? "Geist",
      fontSize: Math.max(24, Math.round((headingFont?.fontSize ?? 36) * 0.82)),
      fontWeight: headingFont?.fontWeight ?? 760,
      textColor,
      surfaceColor,
      accentColor,
      durationSeconds: 3,
      safeAreaPercent: 8,
      previewText: "Segment headline",
    },
    {
      id: `lower-third-cta-${input.project.id}`,
      role: "call-to-action",
      label: "CTA lower third",
      fontFamily: captionFont?.fontFamily ?? headingFont?.fontFamily ?? "Geist",
      fontSize: captionFont?.fontSize ?? 20,
      fontWeight: captionFont?.fontWeight ?? 700,
      textColor,
      surfaceColor,
      accentColor,
      durationSeconds: 5,
      safeAreaPercent: 10,
      previewText: "Visit / Subscribe / Learn more",
    },
  ];
}

export function createMediaBumperOutroPresets(input: {
  project: ProjectDetail;
  brandColors: BrandColorSummary[];
  brandLogos: BrandLogoSummary[];
}): MediaBumperOutroPreset[] {
  const backgroundColor = input.brandColors[0]?.color ?? "#111827";
  const accentColor = input.brandColors[1]?.color ?? "#0ea5e9";
  const textColor = getReadableTextColor(backgroundColor);
  const logoIncluded = input.brandLogos.length > 0;

  return [
    {
      id: `bumper-${input.project.id}`,
      kind: "bumper",
      label: "Brand bumper",
      durationSeconds: 2.5,
      backgroundColor,
      textColor,
      accentColor,
      logoIncluded,
      copy: input.project.name,
    },
    {
      id: `outro-${input.project.id}`,
      kind: "outro",
      label: "Outro card",
      durationSeconds: 4,
      backgroundColor,
      textColor,
      accentColor,
      logoIncluded,
      copy: "Follow, subscribe, or visit the campaign destination.",
    },
  ];
}

function findBrandFont(
  fonts: BrandFontSummary[],
  role: BrandFontSummary["role"],
) {
  return fonts.find((font) => font.role === role) ?? null;
}

function getReadableTextColor(surfaceColor: string) {
  const hex = surfaceColor.replace("#", "");
  if (hex.length !== 6) return "#ffffff";
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.6 ? "#111827" : "#ffffff";
}
