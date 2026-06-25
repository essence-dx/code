import type { DesignPresetId } from "@/features/editor/types";

export type DesignPreset = {
  id: DesignPresetId;
  name: string;
  description: string;
  width: number;
  height: number;
};

export const customDesignDimensionLimits = {
  min: 64,
  max: 8000,
};

export const designPresets: DesignPreset[] = [
  {
    id: "instagram-post",
    name: "Social post",
    description: "Square content for social feeds.",
    width: 1080,
    height: 1080,
  },
  {
    id: "presentation",
    name: "Presentation",
    description: "16:9 slides and pitch decks.",
    width: 1920,
    height: 1080,
  },
  {
    id: "document",
    name: "Document",
    description: "A4 pages for proposals and one-pagers.",
    width: 794,
    height: 1123,
  },
  {
    id: "whiteboard",
    name: "Whiteboard",
    description: "Wide freeform planning canvas.",
    width: 2400,
    height: 1350,
  },
  {
    id: "poster",
    name: "Poster",
    description: "Print-friendly vertical artwork.",
    width: 1080,
    height: 1350,
  },
  {
    id: "infographic",
    name: "Infographic",
    description: "Tall visual explainers and data stories.",
    width: 800,
    height: 2000,
  },
  {
    id: "resume",
    name: "Resume",
    description: "Letter-size personal profile layouts.",
    width: 816,
    height: 1056,
  },
  {
    id: "business-card",
    name: "Business card",
    description: "Standard horizontal contact cards.",
    width: 1050,
    height: 600,
  },
  {
    id: "flyer",
    name: "Flyer",
    description: "Letter-size event and promo sheets.",
    width: 1275,
    height: 1650,
  },
  {
    id: "banner",
    name: "Banner",
    description: "Wide website and social headers.",
    width: 1920,
    height: 480,
  },
  {
    id: "spreadsheet",
    name: "Sheet",
    description: "Grid-first analysis and planning boards.",
    width: 1600,
    height: 1000,
  },
  {
    id: "website",
    name: "Website",
    description: "Long responsive page design canvas.",
    width: 1440,
    height: 2200,
  },
  {
    id: "video",
    name: "Vertical video",
    description: "Short-form 9:16 video storyboards.",
    width: 1080,
    height: 1920,
  },
  {
    id: "print-product",
    name: "Print product",
    description: "High-resolution merchandise and print layouts.",
    width: 1500,
    height: 2100,
  },
  {
    id: "email-template",
    name: "Email template",
    description: "Newsletter and campaign email layouts.",
    width: 1200,
    height: 1800,
  },
  {
    id: "course",
    name: "Course design",
    description: "Learning handouts and lesson assets.",
    width: 1200,
    height: 1600,
  },
  {
    id: "logo",
    name: "Logo",
    description: "Compact brand marks and icons.",
    width: 800,
    height: 800,
  },
];

export function getDesignPreset(id: FormDataEntryValue | null) {
  return designPresets.find((preset) => preset.id === id) ?? designPresets[0];
}

export function parseCustomDesignDimension(value: FormDataEntryValue | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return null;

  return Math.round(
    Math.min(
      customDesignDimensionLimits.max,
      Math.max(customDesignDimensionLimits.min, parsed),
    ),
  );
}
