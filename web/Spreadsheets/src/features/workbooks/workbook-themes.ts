import type {
  CellStyle,
  WorkbookCellStyleDefinition,
  WorkbookTheme,
  WorkbookThemeColors,
  WorkbookThemeFonts,
} from "@/features/workbooks/types";

const themeColorKeys = [
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "danger",
  "good",
  "headerFill",
  "headerText",
  "neutral",
  "primary",
  "secondary",
  "warning",
] satisfies Array<keyof WorkbookThemeColors>;

const defaultFonts = {
  body: "calibri",
  heading: "arial",
  mono: "mono",
} satisfies WorkbookThemeFonts;

const horizontalAlignments = new Set<CellStyle["align"]>([
  "left",
  "center",
  "right",
]);
const verticalAlignments = new Set<NonNullable<CellStyle["verticalAlign"]>>([
  "top",
  "middle",
  "bottom",
]);

export const workbookThemePresets = [
  {
    id: "essence",
    name: "Essence",
    colors: {
      accent1: "#2563eb",
      accent2: "#16a34a",
      accent3: "#f59e0b",
      accent4: "#7c3aed",
      danger: "#dc2626",
      good: "#15803d",
      headerFill: "#dbeafe",
      headerText: "#1e3a8a",
      neutral: "#475569",
      primary: "#0f172a",
      secondary: "#64748b",
      warning: "#a16207",
    },
    fonts: defaultFonts,
    updatedAt: "",
  },
  {
    id: "classic",
    name: "Classic",
    colors: {
      accent1: "#1d4ed8",
      accent2: "#047857",
      accent3: "#b45309",
      accent4: "#be123c",
      danger: "#b91c1c",
      good: "#166534",
      headerFill: "#e0e7ff",
      headerText: "#312e81",
      neutral: "#525252",
      primary: "#111827",
      secondary: "#4b5563",
      warning: "#92400e",
    },
    fonts: {
      body: "arial",
      heading: "georgia",
      mono: "mono",
    },
    updatedAt: "",
  },
  {
    id: "market",
    name: "Market",
    colors: {
      accent1: "#0284c7",
      accent2: "#059669",
      accent3: "#ca8a04",
      accent4: "#c026d3",
      danger: "#e11d48",
      good: "#0f766e",
      headerFill: "#ccfbf1",
      headerText: "#134e4a",
      neutral: "#334155",
      primary: "#0f172a",
      secondary: "#0369a1",
      warning: "#b45309",
    },
    fonts: {
      body: "verdana",
      heading: "arial",
      mono: "mono",
    },
    updatedAt: "",
  },
] satisfies WorkbookTheme[];

export const defaultWorkbookTheme = workbookThemePresets[0];

export type WorkbookThemeUpdate = {
  colors?: Partial<WorkbookThemeColors>;
  fonts?: Partial<WorkbookThemeFonts>;
  presetId?: string;
};

export type CellStylePreset = {
  id: string;
  label: string;
  style: CellStyle;
};

export function normalizeWorkbookTheme(value: unknown): WorkbookTheme {
  if (typeof value !== "object" || value === null) {
    return cloneTheme(defaultWorkbookTheme);
  }

  const candidate = value as Partial<WorkbookTheme>;
  const preset =
    typeof candidate.id === "string"
      ? workbookThemePresets.find((theme) => theme.id === candidate.id)
      : undefined;
  const base = preset ?? defaultWorkbookTheme;

  return {
    id:
      typeof candidate.id === "string" && candidate.id.trim()
        ? candidate.id.trim().slice(0, 40)
        : base.id,
    name:
      typeof candidate.name === "string" && candidate.name.trim()
        ? candidate.name.trim().slice(0, 80)
        : base.name,
    colors: normalizeThemeColors(candidate.colors, base.colors),
    fonts: normalizeThemeFonts(candidate.fonts, base.fonts),
    updatedAt:
      typeof candidate.updatedAt === "string"
        ? candidate.updatedAt.slice(0, 40)
        : "",
  };
}

export function mergeWorkbookTheme(
  currentTheme: WorkbookTheme | undefined,
  updates: WorkbookThemeUpdate,
): WorkbookTheme {
  const preset = updates.presetId
    ? workbookThemePresets.find((theme) => theme.id === updates.presetId)
    : undefined;
  const base = preset ? cloneTheme(preset) : normalizeWorkbookTheme(currentTheme);

  return {
    ...base,
    colors: normalizeThemeColors(
      {
        ...base.colors,
        ...(updates.colors ?? {}),
      },
      base.colors,
    ),
    fonts: normalizeThemeFonts(
      {
        ...base.fonts,
        ...(updates.fonts ?? {}),
      },
      base.fonts,
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeWorkbookCellStyles(
  value: unknown,
): WorkbookCellStyleDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<WorkbookCellStyleDefinition[]>((styles, item) => {
    const normalized = normalizeWorkbookCellStyle(item);

    if (normalized && !styles.some((style) => style.id === normalized.id)) {
      styles.push(normalized);
    }

    return styles;
  }, []);
}

export function createManagedCellStyle(
  name: string,
  style: CellStyle,
): WorkbookCellStyleDefinition {
  const now = new Date().toISOString();

  return {
    id: `style_${crypto.randomUUID()}`,
    name: cleanWorkbookCellStyleName(name),
    style: normalizeCellStyle(style),
    updatedAt: now,
  };
}

export function getWorkbookCellStylePresets(
  theme: WorkbookTheme,
  managedStyles: WorkbookCellStyleDefinition[],
): CellStylePreset[] {
  return [
    ...createThemeCellStylePresets(theme),
    ...managedStyles.map((style) => ({
      id: style.id,
      label: style.name,
      style: style.style,
    })),
  ];
}

export function createThemeCellStylePresets(
  theme: WorkbookTheme,
): CellStylePreset[] {
  return [
    {
      id: "theme-header",
      label: "Header",
      style: {
        background: theme.colors.headerFill,
        bold: true,
        fontFamily: theme.fonts.heading,
        foreground: theme.colors.headerText,
      },
    },
    {
      id: "theme-total",
      label: "Total",
      style: {
        background: tint(theme.colors.good),
        bold: true,
        fontFamily: theme.fonts.heading,
        foreground: theme.colors.good,
        numberFormat: "currency",
      },
    },
    {
      id: "theme-input",
      label: "Input",
      style: {
        background: tint(theme.colors.warning),
        foreground: theme.colors.warning,
      },
    },
    {
      id: "theme-good",
      label: "Good",
      style: {
        background: tint(theme.colors.good),
        foreground: theme.colors.good,
      },
    },
    {
      id: "theme-bad",
      label: "Bad",
      style: {
        background: tint(theme.colors.danger),
        foreground: theme.colors.danger,
      },
    },
    {
      id: "theme-neutral",
      label: "Neutral",
      style: {
        background: tint(theme.colors.neutral),
        foreground: theme.colors.neutral,
      },
    },
  ];
}

export function normalizeCellStyle(style: CellStyle): CellStyle {
  const textRotation = Number(style.textRotation);
  const normalized: CellStyle = {
    ...style,
    bold: style.bold === true ? true : undefined,
    italic: style.italic === true ? true : undefined,
    underline: style.underline === true ? true : undefined,
    strikethrough: style.strikethrough === true ? true : undefined,
    align: horizontalAlignments.has(style.align) ? style.align : undefined,
    verticalAlign: style.verticalAlign && verticalAlignments.has(style.verticalAlign)
      ? style.verticalAlign
      : undefined,
    textRotation: Number.isFinite(textRotation)
      ? Math.min(Math.max(Math.round(textRotation), -90), 90)
      : undefined,
    verticalText: style.verticalText === true ? true : undefined,
    shrinkToFit: style.shrinkToFit === true ? true : undefined,
    background:
      typeof style.background === "string"
        ? normalizeHexColor(style.background, style.background)
        : undefined,
    foreground:
      typeof style.foreground === "string"
        ? normalizeHexColor(style.foreground, style.foreground)
        : undefined,
    fontSize: Number.isFinite(style.fontSize)
      ? Math.min(Math.max(Math.round(style.fontSize ?? 14), 8), 72)
      : undefined,
    indent: Number.isFinite(style.indent)
      ? Math.min(Math.max(Math.round(style.indent ?? 0), 0), 6)
      : undefined,
    wrap: style.wrap === true ? true : undefined,
  };

  for (const [key, value] of Object.entries(normalized)) {
    if (value === undefined) {
      delete normalized[key as keyof CellStyle];
    }
  }

  return normalized;
}

function normalizeWorkbookCellStyle(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<WorkbookCellStyleDefinition>;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.style !== "object" ||
    candidate.style === null
  ) {
    return null;
  }

  return {
    id: candidate.id.trim().slice(0, 80),
    name: cleanWorkbookCellStyleName(candidate.name),
    description:
      typeof candidate.description === "string"
        ? candidate.description.trim().slice(0, 160)
        : undefined,
    style: normalizeCellStyle(candidate.style),
    builtIn: candidate.builtIn === true ? true : undefined,
    updatedAt:
      typeof candidate.updatedAt === "string"
        ? candidate.updatedAt.slice(0, 40)
        : "",
  } satisfies WorkbookCellStyleDefinition;
}

function normalizeThemeColors(
  value: unknown,
  fallback: WorkbookThemeColors,
): WorkbookThemeColors {
  const candidate =
    typeof value === "object" && value !== null
      ? (value as Partial<WorkbookThemeColors>)
      : {};

  return Object.fromEntries(
    themeColorKeys.map((key) => [
      key,
      normalizeHexColor(candidate[key], fallback[key]),
    ]),
  ) as WorkbookThemeColors;
}

function normalizeThemeFonts(
  value: unknown,
  fallback: WorkbookThemeFonts,
): WorkbookThemeFonts {
  const candidate =
    typeof value === "object" && value !== null
      ? (value as Partial<WorkbookThemeFonts>)
      : {};

  return {
    body: normalizeFont(candidate.body, fallback.body),
    heading: normalizeFont(candidate.heading, fallback.heading),
    mono: normalizeFont(candidate.mono, fallback.mono),
  };
}

function normalizeFont(
  value: unknown,
  fallback: WorkbookThemeFonts[keyof WorkbookThemeFonts],
) {
  return value === "arial" ||
    value === "calibri" ||
    value === "georgia" ||
    value === "times" ||
    value === "verdana" ||
    value === "mono"
    ? value
    : fallback;
}

function normalizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();

  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toLowerCase() : fallback;
}

export function cleanWorkbookCellStyleName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 80) || "Cell style";
}

function cloneTheme(theme: WorkbookTheme): WorkbookTheme {
  return {
    id: theme.id,
    name: theme.name,
    colors: { ...theme.colors },
    fonts: { ...theme.fonts },
    updatedAt: theme.updatedAt,
  };
}

function tint(color: string) {
  const hex = color.replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * 0.84);

  return `#${[mix(red), mix(green), mix(blue)]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}
