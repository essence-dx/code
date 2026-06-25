export type StylePreset = {
  id: string;
  name: string;
  description: string;
  fontFamily: string;
  headingWeight: number;
  bodyWeight: number;
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  border: string;
  primary: string;
  secondary: string;
  accent: string;
  chartColors: string[];
};

export const stylePresets = [
  {
    id: "studio-minimal",
    name: "Studio Minimal",
    description: "Quiet editorial layouts with strong black type.",
    fontFamily: "Geist",
    headingWeight: 800,
    bodyWeight: 500,
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#111827",
    mutedText: "#475569",
    border: "#cbd5e1",
    primary: "#111827",
    secondary: "#64748b",
    accent: "#0ea5e9",
    chartColors: ["#111827", "#0ea5e9", "#64748b", "#94a3b8"],
  },
  {
    id: "market-pop",
    name: "Market Pop",
    description: "Bright social graphics with punchy color blocks.",
    fontFamily: "Arial",
    headingWeight: 800,
    bodyWeight: 600,
    background: "#fff7ed",
    surface: "#ffffff",
    text: "#1f2937",
    mutedText: "#9a3412",
    border: "#fdba74",
    primary: "#f97316",
    secondary: "#facc15",
    accent: "#22c55e",
    chartColors: ["#f97316", "#22c55e", "#facc15", "#0ea5e9"],
  },
  {
    id: "night-signal",
    name: "Night Signal",
    description: "Dark launch screens with crisp cyan accents.",
    fontFamily: "Geist",
    headingWeight: 800,
    bodyWeight: 500,
    background: "#020617",
    surface: "#0f172a",
    text: "#f8fafc",
    mutedText: "#cbd5e1",
    border: "#334155",
    primary: "#38bdf8",
    secondary: "#818cf8",
    accent: "#22c55e",
    chartColors: ["#38bdf8", "#818cf8", "#22c55e", "#f8fafc"],
  },
  {
    id: "garden-note",
    name: "Garden Note",
    description: "Fresh education and wellness pages.",
    fontFamily: "Georgia",
    headingWeight: 700,
    bodyWeight: 500,
    background: "#f0fdf4",
    surface: "#ffffff",
    text: "#14532d",
    mutedText: "#166534",
    border: "#bbf7d0",
    primary: "#16a34a",
    secondary: "#86efac",
    accent: "#0f766e",
    chartColors: ["#16a34a", "#0f766e", "#86efac", "#14532d"],
  },
  {
    id: "violet-deck",
    name: "Violet Deck",
    description: "Polished presentations with jewel accents.",
    fontFamily: "Verdana",
    headingWeight: 800,
    bodyWeight: 500,
    background: "#faf5ff",
    surface: "#ffffff",
    text: "#2e1065",
    mutedText: "#6b21a8",
    border: "#d8b4fe",
    primary: "#7c3aed",
    secondary: "#c084fc",
    accent: "#ec4899",
    chartColors: ["#7c3aed", "#ec4899", "#c084fc", "#0ea5e9"],
  },
  {
    id: "print-plain",
    name: "Print Plain",
    description: "Clean printable documents with restrained color.",
    fontFamily: "Times New Roman",
    headingWeight: 700,
    bodyWeight: 400,
    background: "#ffffff",
    surface: "#ffffff",
    text: "#18181b",
    mutedText: "#52525b",
    border: "#d4d4d8",
    primary: "#18181b",
    secondary: "#71717a",
    accent: "#2563eb",
    chartColors: ["#18181b", "#2563eb", "#71717a", "#a1a1aa"],
  },
] satisfies StylePreset[];
