import type { TemplateCatalogFormat } from "@/features/templates/template-catalog";

export type TemplateRemixProfileId =
  | "same-format-refresh"
  | "social-square"
  | "presentation-16x9"
  | "website-landing"
  | "print-poster"
  | "email-campaign";

export type TemplateRemixThemeId =
  | "clean-contrast"
  | "fresh-campaign"
  | "editorial-warmth"
  | "calm-system";

export type TemplateRemixContentPackId =
  | "launch"
  | "event"
  | "education"
  | "portfolio"
  | "report";

export type TemplateRemixInput = {
  profileId: TemplateRemixProfileId;
  themeId: TemplateRemixThemeId;
  contentPackId: TemplateRemixContentPackId;
};

export type TemplateRemixInputLike = {
  profileId?: unknown;
  themeId?: unknown;
  contentPackId?: unknown;
};

export type TemplateRemixProfile = {
  id: TemplateRemixProfileId;
  label: string;
  description: string;
  format: TemplateCatalogFormat | "source";
  width: number | "source";
  height: number | "source";
  platform: string | "source";
};

export type TemplateRemixTheme = {
  id: TemplateRemixThemeId;
  label: string;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
};

export type TemplateRemixContentPack = {
  id: TemplateRemixContentPackId;
  label: string;
  headline: string;
  description: string;
  usageNotes: string;
  category: string;
  industry: string;
  tags: string[];
};

export const defaultRemixInput: TemplateRemixInput = {
  profileId: "same-format-refresh",
  themeId: "fresh-campaign",
  contentPackId: "launch",
};

export const templateRemixProfiles: TemplateRemixProfile[] = [
  {
    id: "same-format-refresh",
    label: "Same format refresh",
    description: "Keep the source size and swap theme plus content slots.",
    format: "source",
    width: "source",
    height: "source",
    platform: "source",
  },
  {
    id: "social-square",
    label: "Social square",
    description: "Convert the starter into a square social campaign asset.",
    format: "instagram-post",
    width: 1080,
    height: 1080,
    platform: "Instagram",
  },
  {
    id: "presentation-16x9",
    label: "Presentation 16:9",
    description: "Turn the idea into a three-page presentation starter.",
    format: "presentation",
    width: 1920,
    height: 1080,
    platform: "Presentation",
  },
  {
    id: "website-landing",
    label: "Website landing",
    description: "Create a hosted-page structure with hero, proof, and contact.",
    format: "website",
    width: 1440,
    height: 2200,
    platform: "Website",
  },
  {
    id: "print-poster",
    label: "Print poster",
    description: "Adapt the hierarchy into a vertical poster layout.",
    format: "poster",
    width: 1080,
    height: 1350,
    platform: "Print",
  },
  {
    id: "email-campaign",
    label: "Email campaign",
    description: "Create an email-safe campaign starter with CTA space.",
    format: "email-template",
    width: 1200,
    height: 1800,
    platform: "Email",
  },
];

export const templateRemixThemes: TemplateRemixTheme[] = [
  {
    id: "clean-contrast",
    label: "Clean contrast",
    accentColor: "#111827",
    surfaceColor: "#f8fafc",
    textColor: "#020617",
  },
  {
    id: "fresh-campaign",
    label: "Fresh campaign",
    accentColor: "#0f766e",
    surfaceColor: "#ecfeff",
    textColor: "#0f172a",
  },
  {
    id: "editorial-warmth",
    label: "Editorial warmth",
    accentColor: "#be123c",
    surfaceColor: "#fff1f2",
    textColor: "#1f2937",
  },
  {
    id: "calm-system",
    label: "Calm system",
    accentColor: "#2563eb",
    surfaceColor: "#eff6ff",
    textColor: "#111827",
  },
];

export const templateRemixContentPacks: TemplateRemixContentPack[] = [
  {
    id: "launch",
    label: "Launch story",
    headline: "Launch the next chapter",
    description:
      "A focused story for announcing what changed and why it matters.",
    usageNotes: "Replace the headline, proof points, CTA, and audience detail.",
    category: "Marketing",
    industry: "SaaS",
    tags: ["launch", "announcement", "campaign", "conversion"],
  },
  {
    id: "event",
    label: "Event push",
    headline: "Bring the right people into the room",
    description:
      "A practical event narrative with date, venue, highlights, and CTA.",
    usageNotes:
      "Swap in the event details, speaker proof, schedule, and RSVP link.",
    category: "Events",
    industry: "Community",
    tags: ["event", "meetup", "rsvp", "community"],
  },
  {
    id: "education",
    label: "Learning asset",
    headline: "Make the lesson clear and useful",
    description:
      "A teaching-friendly structure for objectives, activity, and recap.",
    usageNotes:
      "Edit the objectives, practice prompts, activity steps, and summary.",
    category: "Education",
    industry: "Learning",
    tags: ["education", "lesson", "worksheet", "course"],
  },
  {
    id: "portfolio",
    label: "Portfolio proof",
    headline: "Show the work with evidence",
    description:
      "A portfolio-ready narrative for outcomes, process, and contact.",
    usageNotes:
      "Replace placeholders with project results, role, and contact details.",
    category: "Career",
    industry: "Creative",
    tags: ["portfolio", "profile", "proof", "career"],
  },
  {
    id: "report",
    label: "Report summary",
    headline: "Turn findings into decisions",
    description: "A concise reporting flow for metrics, insight, and next actions.",
    usageNotes:
      "Connect real metrics, source notes, recommendations, and owners.",
    category: "Analytics",
    industry: "Research",
    tags: ["report", "metrics", "insight", "dashboard"],
  },
];
