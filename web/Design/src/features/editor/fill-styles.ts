import type { CSSProperties } from "react";

import type {
  FillPatternKind,
  FillStyleFields,
  FillStyleMode,
  FillTextureKind,
} from "@/features/editor/types";

export const fillStyleModes = [
  { id: "solid", label: "Solid" },
  { id: "linear-gradient", label: "Linear gradient" },
  { id: "radial-gradient", label: "Radial gradient" },
  { id: "pattern", label: "Pattern" },
  { id: "texture", label: "Texture" },
] satisfies Array<{ id: FillStyleMode; label: string }>;

export const fillPatterns = [
  { id: "diagonal-stripes", label: "Diagonal stripes" },
  { id: "dot-grid", label: "Dot grid" },
  { id: "checker", label: "Checker" },
] satisfies Array<{ id: FillPatternKind; label: string }>;

export const fillTextures = [
  { id: "paper", label: "Paper" },
  { id: "grain", label: "Grain" },
  { id: "linen", label: "Linen" },
] satisfies Array<{ id: FillTextureKind; label: string }>;

export type FillStyleInput = FillStyleFields & {
  fill: string;
};

export type SvgFillDefinition =
  | {
      type: "linear-gradient";
      id: string;
      from: string;
      to: string;
      angle: number;
    }
  | {
      type: "radial-gradient";
      id: string;
      from: string;
      to: string;
    }
  | {
      type: "pattern";
      id: string;
      background: string;
      color: string;
      pattern: FillPatternKind;
      scale: number;
      opacity: number;
    }
  | {
      type: "texture";
      id: string;
      background: string;
      color: string;
      pattern: FillTextureKind;
      scale: number;
      opacity: number;
    };

export function getFillMode(element: FillStyleInput): FillStyleMode {
  return element.fillMode ?? "solid";
}

export function getCssFillStyle(element: FillStyleInput): CSSProperties {
  const mode = getFillMode(element);
  const fill = element.fill;

  if (mode === "linear-gradient") {
    return {
      background: `linear-gradient(${getGradientAngle(
        element,
      )}deg, ${getGradientFrom(element)}, ${getGradientTo(element)})`,
    };
  }

  if (mode === "radial-gradient") {
    return {
      background: `radial-gradient(circle, ${getGradientFrom(
        element,
      )}, ${getGradientTo(element)})`,
    };
  }

  if (mode === "pattern") {
    return {
      backgroundColor: fill,
      ...getPatternCss(element),
    };
  }

  if (mode === "texture") {
    return {
      backgroundColor: fill,
      ...getTextureCss(element),
    };
  }

  return { background: fill };
}

export function getSvgFillPaint(
  element: FillStyleInput,
  idSeed: string,
): {
  fill: string;
  definitions: SvgFillDefinition[];
} {
  const mode = getFillMode(element);
  const id = sanitizeSvgId(idSeed);

  if (mode === "linear-gradient") {
    return {
      fill: `url(#${id})`,
      definitions: [
        {
          type: "linear-gradient",
          id,
          from: getGradientFrom(element),
          to: getGradientTo(element),
          angle: getGradientAngle(element),
        },
      ],
    };
  }

  if (mode === "radial-gradient") {
    return {
      fill: `url(#${id})`,
      definitions: [
        {
          type: "radial-gradient",
          id,
          from: getGradientFrom(element),
          to: getGradientTo(element),
        },
      ],
    };
  }

  if (mode === "pattern") {
    return {
      fill: `url(#${id})`,
      definitions: [
        {
          type: "pattern",
          id,
          background: element.fill,
          color: getPatternColor(element),
          pattern: getPatternKind(element),
          scale: getPatternScale(element),
          opacity: 0.72,
        },
      ],
    };
  }

  if (mode === "texture") {
    return {
      fill: `url(#${id})`,
      definitions: [
        {
          type: "texture",
          id,
          background: element.fill,
          color: getPatternColor(element),
          pattern: getTextureKind(element),
          scale: getPatternScale(element),
          opacity: getTextureOpacity(element),
        },
      ],
    };
  }

  return { fill: element.fill, definitions: [] };
}

export function getFillStyleDefaults(
  mode: FillStyleMode,
  fill = "#38bdf8",
): Partial<FillStyleFields> {
  if (mode === "linear-gradient" || mode === "radial-gradient") {
    return {
      fillMode: mode,
      fillGradientFrom: fill,
      fillGradientTo: "#f97316",
      fillGradientAngle: 90,
    };
  }

  if (mode === "pattern") {
    return {
      fillMode: mode,
      fillPattern: "diagonal-stripes",
      fillPatternColor: "#0f172a",
      fillPatternScale: 16,
    };
  }

  if (mode === "texture") {
    return {
      fillMode: mode,
      fillTexture: "paper",
      fillPatternColor: "#0f172a",
      fillPatternScale: 18,
      fillTextureIntensity: 30,
    };
  }

  return { fillMode: "solid" };
}

export function getGradientFrom(element: FillStyleInput) {
  return element.fillGradientFrom ?? element.fill;
}

export function getGradientTo(element: FillStyleInput) {
  return element.fillGradientTo ?? "#ffffff";
}

export function getGradientAngle(element: FillStyleInput) {
  return clampNumber(element.fillGradientAngle, 0, 360, 90);
}

export function getPatternKind(element: FillStyleInput): FillPatternKind {
  return element.fillPattern ?? "diagonal-stripes";
}

export function getTextureKind(element: FillStyleInput): FillTextureKind {
  return element.fillTexture ?? "paper";
}

export function getPatternColor(element: FillStyleInput) {
  return element.fillPatternColor ?? "#0f172a";
}

export function getPatternScale(element: FillStyleInput) {
  return clampNumber(element.fillPatternScale, 6, 64, 16);
}

export function getTextureOpacity(element: FillStyleInput) {
  return clampNumber(element.fillTextureIntensity, 0, 100, 30) / 100;
}

function getPatternCss(element: FillStyleInput): CSSProperties {
  const color = getPatternColor(element);
  const scale = getPatternScale(element);
  const transparent = "transparent";

  if (getPatternKind(element) === "dot-grid") {
    return {
      backgroundImage: `radial-gradient(circle, ${rgba(
        color,
        0.75,
      )} 1.5px, ${transparent} 2px)`,
      backgroundSize: `${scale}px ${scale}px`,
    };
  }

  if (getPatternKind(element) === "checker") {
    return {
      backgroundImage: [
        `linear-gradient(45deg, ${rgba(color, 0.55)} 25%, ${transparent} 25%)`,
        `linear-gradient(-45deg, ${rgba(color, 0.55)} 25%, ${transparent} 25%)`,
        `linear-gradient(45deg, ${transparent} 75%, ${rgba(color, 0.55)} 75%)`,
        `linear-gradient(-45deg, ${transparent} 75%, ${rgba(color, 0.55)} 75%)`,
      ].join(", "),
      backgroundPosition: `0 0, 0 ${scale / 2}px, ${scale / 2}px -${scale / 2}px, -${scale / 2}px 0px`,
      backgroundSize: `${scale}px ${scale}px`,
    };
  }

  return {
    backgroundImage: `repeating-linear-gradient(135deg, ${rgba(
      color,
      0.7,
    )} 0 2px, ${transparent} 2px ${scale}px)`,
  };
}

function getTextureCss(element: FillStyleInput): CSSProperties {
  const color = getPatternColor(element);
  const opacity = getTextureOpacity(element);
  const scale = getPatternScale(element);
  const texture = getTextureKind(element);

  if (texture === "grain") {
    return {
      backgroundImage: [
        `radial-gradient(circle at 20% 30%, ${rgba(color, opacity)} 0 1px, transparent 1.5px)`,
        `radial-gradient(circle at 70% 60%, ${rgba(color, opacity * 0.8)} 0 1px, transparent 1.5px)`,
      ].join(", "),
      backgroundSize: `${scale}px ${scale}px, ${scale * 1.4}px ${scale * 1.4}px`,
    };
  }

  if (texture === "linen") {
    return {
      backgroundImage: [
        `repeating-linear-gradient(0deg, ${rgba(color, opacity)} 0 1px, transparent 1px ${scale}px)`,
        `repeating-linear-gradient(90deg, ${rgba(color, opacity * 0.8)} 0 1px, transparent 1px ${scale}px)`,
      ].join(", "),
    };
  }

  return {
    backgroundImage: [
      `linear-gradient(135deg, ${rgba(color, opacity)} 25%, transparent 25%)`,
      `linear-gradient(315deg, ${rgba(color, opacity * 0.7)} 25%, transparent 25%)`,
    ].join(", "),
    backgroundPosition: `0 0, ${scale / 2}px ${scale / 2}px`,
    backgroundSize: `${scale}px ${scale}px`,
  };
}

function sanitizeSvgId(value: string) {
  return `fill-${value.replace(/[^a-zA-Z0-9_-]/g, "") || "paint"}`;
}

function rgba(hex: string, alpha: number) {
  const normalized = normalizeHexColor(hex);
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, alpha))})`;
}

function normalizeHexColor(value: string) {
  const trimmed = value.trim().toLowerCase();

  if (/^#[0-9a-f]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-f]{3}$/.test(trimmed)) {
    return `#${trimmed
      .slice(1)
      .split("")
      .map((part) => `${part}${part}`)
      .join("")}`;
  }

  return "#0f172a";
}

function clampNumber(
  value: number | null | undefined,
  min: number,
  max: number,
  fallback: number,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;

  return Math.min(max, Math.max(min, Math.round(value)));
}
