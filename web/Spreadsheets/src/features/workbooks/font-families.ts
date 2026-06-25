import type { CellFontFamily } from "@/features/workbooks/types";

export const cellFontFamilyOptions = [
  { value: "arial", label: "Arial" },
  { value: "calibri", label: "Calibri" },
  { value: "georgia", label: "Georgia" },
  { value: "times", label: "Times" },
  { value: "verdana", label: "Verdana" },
  { value: "mono", label: "Mono" },
] satisfies { value: CellFontFamily; label: string }[];

const fontFamilyCss = {
  arial: 'Arial, "Helvetica Neue", sans-serif',
  calibri: 'Calibri, Candara, Segoe, "Segoe UI", sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  times: '"Times New Roman", Times, serif',
  verdana: 'Verdana, Geneva, sans-serif',
  mono: '"Geist Mono", "Courier New", monospace',
} satisfies Record<CellFontFamily, string>;

export function cellFontFamilyToCss(fontFamily?: CellFontFamily) {
  return fontFamily ? fontFamilyCss[fontFamily] : undefined;
}

export function inferCellFontFamily(value: string): CellFontFamily | undefined {
  const normalized = value.toLowerCase();

  if (normalized.includes("calibri")) {
    return "calibri";
  }

  if (normalized.includes("georgia")) {
    return "georgia";
  }

  if (normalized.includes("times")) {
    return "times";
  }

  if (normalized.includes("verdana")) {
    return "verdana";
  }

  if (
    normalized.includes("courier") ||
    normalized.includes("mono") ||
    normalized.includes("consolas")
  ) {
    return "mono";
  }

  if (normalized.includes("arial") || normalized.includes("helvetica")) {
    return "arial";
  }

  return undefined;
}
