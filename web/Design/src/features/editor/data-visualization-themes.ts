import type { ChartDataPoint, ChartElement } from "@/features/editor/types";

export type DataChartThemeId =
  | "executive"
  | "growth"
  | "research"
  | "contrast"
  | "print";

export type DataChartTheme = {
  id: DataChartThemeId;
  label: string;
  description: string;
  backgroundColor: string;
  textColor: string;
  axisColor: string;
  colors: string[];
  strokeWidth: number;
  fontSize: number;
};

export const dataChartThemes: DataChartTheme[] = [
  {
    id: "executive",
    label: "Executive",
    description: "Quiet board-ready charts with strong contrast.",
    backgroundColor: "#ffffff",
    textColor: "#0f172a",
    axisColor: "#64748b",
    colors: ["#0f172a", "#2563eb", "#64748b", "#94a3b8", "#38bdf8"],
    strokeWidth: 4,
    fontSize: 13,
  },
  {
    id: "growth",
    label: "Growth",
    description: "Clear revenue and funnel colors for campaign reports.",
    backgroundColor: "#f0fdf4",
    textColor: "#052e16",
    axisColor: "#16a34a",
    colors: ["#16a34a", "#0f766e", "#65a30d", "#0891b2", "#84cc16"],
    strokeWidth: 4,
    fontSize: 13,
  },
  {
    id: "research",
    label: "Research",
    description: "Readable analytical charts for reports and findings.",
    backgroundColor: "#eff6ff",
    textColor: "#172554",
    axisColor: "#60a5fa",
    colors: ["#2563eb", "#0891b2", "#4f46e5", "#7c3aed", "#38bdf8"],
    strokeWidth: 3,
    fontSize: 12,
  },
  {
    id: "contrast",
    label: "Contrast",
    description: "Presentation-safe charts on dark surfaces.",
    backgroundColor: "#111827",
    textColor: "#f8fafc",
    axisColor: "#94a3b8",
    colors: ["#f8fafc", "#38bdf8", "#22c55e", "#facc15", "#fb7185"],
    strokeWidth: 4,
    fontSize: 13,
  },
  {
    id: "print",
    label: "Print",
    description: "Ink-friendly colors for PDF and handoff reports.",
    backgroundColor: "#ffffff",
    textColor: "#18181b",
    axisColor: "#71717a",
    colors: ["#18181b", "#3f3f46", "#71717a", "#a1a1aa", "#d4d4d8"],
    strokeWidth: 3,
    fontSize: 12,
  },
];

export function getDataChartTheme(id: unknown) {
  return (
    dataChartThemes.find((theme) => theme.id === id) ?? dataChartThemes[0]
  );
}

export function applyDataChartTheme(
  chart: ChartElement,
  themeOrId: DataChartTheme | DataChartThemeId,
): ChartElement {
  const theme =
    typeof themeOrId === "string" ? getDataChartTheme(themeOrId) : themeOrId;

  return {
    ...chart,
    backgroundColor: theme.backgroundColor,
    textColor: theme.textColor,
    axisColor: theme.axisColor,
    strokeWidth: theme.strokeWidth,
    fontSize: theme.fontSize,
    data: applyThemeColorsToData(chart.data, theme.colors),
  };
}

export function applyThemeColorsToData(
  data: ChartDataPoint[],
  colors: string[],
) {
  return data.map((point, index) => ({
    ...point,
    color: colors[index % colors.length],
  }));
}
