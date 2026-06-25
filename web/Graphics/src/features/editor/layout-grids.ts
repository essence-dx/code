import type {
  DesignLayoutGrid,
  DesignLayoutGridAlignment,
  DesignLayoutGridKind,
  DesignLayoutGridStyle,
} from "@/features/editor/types";

export const layoutGridKindOptions = [
  { value: "grid", label: "Grid" },
  { value: "columns", label: "Columns" },
  { value: "rows", label: "Rows" },
] as const satisfies ReadonlyArray<{
  value: DesignLayoutGridKind;
  label: string;
}>;

export const layoutGridAlignmentOptions = [
  { value: "stretch", label: "Stretch" },
  { value: "start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "end", label: "End" },
] as const satisfies ReadonlyArray<{
  value: DesignLayoutGridAlignment;
  label: string;
}>;

export const layoutGridPresetOptions = [
  {
    id: "mobile-columns",
    label: "Mobile",
    grid: {
      name: "Mobile columns",
      kind: "columns",
      count: 4,
      gutter: 16,
      margin: 16,
      alignment: "stretch",
      color: "#38bdf8",
      opacity: 0.18,
      size: 8,
    },
  },
  {
    id: "desktop-columns",
    label: "Desktop",
    grid: {
      name: "Desktop columns",
      kind: "columns",
      count: 12,
      gutter: 24,
      margin: 64,
      alignment: "stretch",
      color: "#60a5fa",
      opacity: 0.16,
      size: 8,
    },
  },
  {
    id: "rows-8",
    label: "Rows",
    grid: {
      name: "8px rows",
      kind: "rows",
      count: 16,
      gutter: 8,
      margin: 24,
      alignment: "stretch",
      color: "#a78bfa",
      opacity: 0.16,
      size: 8,
    },
  },
  {
    id: "square-8",
    label: "8px",
    grid: {
      name: "8px grid",
      kind: "grid",
      count: 8,
      gutter: 0,
      margin: 0,
      alignment: "stretch",
      color: "#f8fafc",
      opacity: 0.1,
      size: 8,
    },
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  grid: Omit<DesignLayoutGrid, "id" | "visible">;
}>;

export const defaultLayoutGrid: DesignLayoutGrid = {
  id: "",
  name: "Layout grid",
  kind: "columns",
  visible: true,
  color: "#38bdf8",
  opacity: 0.16,
  size: 8,
  count: 12,
  gutter: 24,
  margin: 64,
  alignment: "stretch",
};

export function normalizeLayoutGrid(grid: DesignLayoutGrid): DesignLayoutGrid {
  return {
    ...defaultLayoutGrid,
    ...grid,
    opacity: clampNumber(grid.opacity, 0.02, 1),
    size: Math.max(1, Math.round(grid.size)),
    count: Math.max(1, Math.round(grid.count)),
    gutter: Math.max(0, Math.round(grid.gutter)),
    margin: Math.max(0, Math.round(grid.margin)),
  };
}

export function getLayoutGridSignature(grids?: DesignLayoutGrid[]) {
  return (grids ?? [])
    .map(normalizeLayoutGrid)
    .map((grid) =>
      [
        grid.name,
        grid.kind,
        grid.visible ? "visible" : "hidden",
        grid.count,
        grid.size,
        grid.gutter,
        grid.margin,
        grid.alignment,
        grid.color,
        Number(grid.opacity.toFixed(2)),
      ].join(":"),
    )
    .join("|");
}

export function getLayoutGridStyleSignature(
  styles?: Record<string, DesignLayoutGridStyle>,
) {
  return Object.values(styles ?? {})
    .map((style) =>
      [style.name, getLayoutGridSignature([styleToGrid(style)])].join(":"),
    )
    .sort()
    .join("|");
}

export function gridToStyleValue(
  grid: DesignLayoutGrid,
): DesignLayoutGridStyle["grid"] {
  const normalized = normalizeLayoutGrid(grid);

  return {
    name: normalized.name,
    kind: normalized.kind,
    color: normalized.color,
    opacity: normalized.opacity,
    size: normalized.size,
    count: normalized.count,
    gutter: normalized.gutter,
    margin: normalized.margin,
    alignment: normalized.alignment,
  };
}

export function styleToGrid(style: DesignLayoutGridStyle): DesignLayoutGrid {
  return normalizeLayoutGrid({
    ...style.grid,
    id: style.id,
    visible: true,
  });
}

export function getLayoutGridCssColor(grid: DesignLayoutGrid) {
  const opacity = clampNumber(grid.opacity, 0, 1);
  const hex = grid.color.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    const red = Number.parseInt(hex.slice(1, 3), 16);
    const green = Number.parseInt(hex.slice(3, 5), 16);
    const blue = Number.parseInt(hex.slice(5, 7), 16);

    return `rgb(${red} ${green} ${blue} / ${opacity})`;
  }

  return `color-mix(in oklch, ${grid.color} ${Math.round(
    opacity * 100,
  )}%, transparent)`;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}
