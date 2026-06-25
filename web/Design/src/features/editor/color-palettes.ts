export type EditorColorPalette = {
  name: string;
  colors: readonly string[];
};

export const editorColorPalettes = [
  {
    name: "Studio",
    colors: ["#111827", "#ffffff", "#ef4444", "#f59e0b", "#0ea5e9"],
  },
  {
    name: "Fresh",
    colors: ["#064e3b", "#ecfdf5", "#10b981", "#84cc16", "#06b6d4"],
  },
  {
    name: "Editorial",
    colors: ["#18181b", "#f4f4f5", "#52525b", "#a1a1aa", "#e4e4e7"],
  },
  {
    name: "Signal",
    colors: ["#1e1b4b", "#eef2ff", "#4f46e5", "#d946ef", "#fb7185"],
  },
  {
    name: "Warm",
    colors: ["#3f1d0b", "#fff7ed", "#ea580c", "#fbbf24", "#dc2626"],
  },
] as const satisfies readonly EditorColorPalette[];
