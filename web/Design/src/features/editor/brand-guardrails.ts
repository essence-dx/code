import type {
  BrandColorSummary,
  BrandFontRole,
  BrandFontSummary,
  BrandLogoSummary,
  ChartDataPoint,
  DesignDocument,
  DesignElement,
} from "@/features/editor/types";

export type BrandGuardrailIssue = {
  id: string;
  tone: "warning" | "missing";
  label: string;
  detail: string;
};

export type BrandGuardrailReport = {
  score: number;
  issues: BrandGuardrailIssue[];
};

const neutralColors = new Set([
  "#000000",
  "#111111",
  "#111827",
  "#18181b",
  "#ffffff",
  "#f8fafc",
  "#f9fafb",
  "#fafafa",
  "#e5e7eb",
  "#d4d4d8",
  "#cbd5e1",
  "transparent",
]);

export function createBrandGuardrailReport(input: {
  document: DesignDocument;
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
  brandLogos: BrandLogoSummary[];
}): BrandGuardrailReport {
  const issues: BrandGuardrailIssue[] = [];
  const brandColorSet = new Set(
    input.brandColors.map((item) => normalizeColor(item.color)),
  );
  const brandFontSet = new Set(input.brandFonts.map((item) => item.fontFamily));
  const colorViolations =
    brandColorSet.size > 0
      ? countOffBrandColors(input.document, brandColorSet)
      : 0;
  const fontViolations =
    brandFontSet.size > 0
      ? countOffBrandFonts(input.document, brandFontSet)
      : 0;

  if (input.brandColors.length === 0) {
    issues.push({
      id: "missing-colors",
      tone: "missing",
      label: "No brand colors",
      detail: "Save at least one brand swatch to enforce color use.",
    });
  } else if (colorViolations > 0) {
    issues.push({
      id: "off-brand-colors",
      tone: "warning",
      label: "Off-brand colors",
      detail: `${colorViolations} layer color value${colorViolations === 1 ? "" : "s"} outside the brand palette.`,
    });
  }

  if (input.brandFonts.length === 0) {
    issues.push({
      id: "missing-fonts",
      tone: "missing",
      label: "No brand fonts",
      detail: "Save heading/body brand fonts before locking typography.",
    });
  } else if (fontViolations > 0) {
    issues.push({
      id: "off-brand-fonts",
      tone: "warning",
      label: "Off-brand fonts",
      detail: `${fontViolations} text-bearing layer${fontViolations === 1 ? "" : "s"} outside the brand font set.`,
    });
  }

  if (input.brandLogos.length === 0) {
    issues.push({
      id: "missing-logos",
      tone: "missing",
      label: "No brand logos",
      detail: "Upload a reusable brand mark to complete the kit.",
    });
  } else if (!documentUsesBrandLogo(input.document, input.brandLogos)) {
    issues.push({
      id: "unused-logo",
      tone: "warning",
      label: "Logo not used",
      detail: "This design does not include a saved brand logo layer yet.",
    });
  }

  return {
    score: Math.max(0, 100 - issues.length * 18),
    issues,
  };
}

export function applyBrandKitToDocument(input: {
  document: DesignDocument;
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
}): DesignDocument {
  const palette = input.brandColors.map((item) => item.color);
  const primary = palette[0] ?? "#111827";
  const secondary = palette[1] ?? primary;
  const accent = palette[2] ?? secondary;
  const headingFont = getBrandFont(input.brandFonts, "heading");
  const bodyFont = getBrandFont(input.brandFonts, "body");

  return {
    ...input.document,
    pages: input.document.pages.map((page) => ({
      ...page,
      background: "#ffffff",
      elements: page.elements.map((element, index) =>
        element.locked
          ? element
          : applyBrandKitToElement({
              element,
              index,
              primary,
              secondary,
              accent,
              headingFont,
              bodyFont,
            }),
      ),
    })),
  };
}

function applyBrandKitToElement({
  element,
  index,
  primary,
  secondary,
  accent,
  headingFont,
  bodyFont,
}: {
  element: DesignElement;
  index: number;
  primary: string;
  secondary: string;
  accent: string;
  headingFont: BrandFontSummary | null;
  bodyFont: BrandFontSummary | null;
}): DesignElement {
  const cycleColor = [primary, secondary, accent][index % 3];

  if (element.type === "text") {
    const isHeading = element.fontSize >= 32 || element.fontWeight >= 700;
    const font = isHeading ? headingFont : bodyFont;

    return {
      ...element,
      fontFamily: font?.fontFamily ?? element.fontFamily,
      fontSize: font?.fontSize ?? element.fontSize,
      fontWeight: font?.fontWeight ?? element.fontWeight,
      letterSpacing: font?.letterSpacing ?? element.letterSpacing,
      lineHeight: font?.lineHeight ?? element.lineHeight,
      color: primary,
      textGradientEnabled: false,
    };
  }

  if (element.type === "document") {
    const font = bodyFont ?? headingFont;

    return {
      ...element,
      fontFamily: font?.fontFamily ?? element.fontFamily,
      textColor: primary,
      headingColor: secondary,
      surfaceColor: "#ffffff",
      borderColor: cycleColor,
    };
  }

  if (element.type === "shape") {
    return element.shape === "line"
      ? { ...element, stroke: primary }
      : {
          ...element,
          fill: cycleColor,
          fillGradientFrom: cycleColor,
          fillGradientTo: accent,
          fillPatternColor: primary,
          stroke: primary,
        };
  }

  if (element.type === "sticky-note") {
    const font = bodyFont ?? headingFont;

    return {
      ...element,
      fill: "#ffffff",
      textColor: primary,
      accentColor: cycleColor,
      fontFamily: font?.fontFamily ?? element.fontFamily,
      fontSize: font?.fontSize ?? element.fontSize,
      fontWeight: font?.fontWeight ?? element.fontWeight,
    };
  }

  if (element.type === "connector") {
    return {
      ...element,
      stroke: primary,
      labelColor: primary,
    };
  }

  if (element.type === "draw") {
    return element.tool === "eraser" ? element : { ...element, stroke: primary };
  }

  if (element.type === "path") {
    return {
      ...element,
      fill: cycleColor,
      fillGradientFrom: cycleColor,
      fillGradientTo: accent,
      fillPatternColor: primary,
      stroke: primary,
    };
  }

  if (element.type === "svg") {
    return {
      ...element,
      preserveColors: false,
      fillColor: cycleColor,
      strokeColor: primary,
    };
  }

  if (element.type === "qr") {
    return {
      ...element,
      qrForeground: primary,
      qrBackground: "#ffffff",
    };
  }

  if (element.type === "table") {
    const font = bodyFont ?? headingFont;

    return {
      ...element,
      fontFamily: font?.fontFamily ?? element.fontFamily,
      fontWeight: font?.fontWeight ?? element.fontWeight,
      textColor: primary,
      headerFill: secondary,
      bodyFill: "#ffffff",
      borderColor: primary,
    };
  }

  if (element.type === "chart") {
    return {
      ...element,
      textColor: primary,
      axisColor: primary,
      data: element.data.map((point, pointIndex) =>
        applyChartColor(point, [primary, secondary, accent], pointIndex),
      ),
    };
  }

  if (element.type === "form") {
    const font = bodyFont ?? headingFont;

    return {
      ...element,
      fontFamily: font?.fontFamily ?? element.fontFamily,
      textColor: element.fieldKind === "button" ? "#ffffff" : primary,
      surfaceColor: "#ffffff",
      fieldColor: "#f8fafc",
      borderColor: primary,
      accentColor: secondary,
    };
  }

  if (element.type === "embed" || element.type === "timer") {
    const font = bodyFont ?? headingFont;

    return {
      ...element,
      fontFamily: font?.fontFamily ?? element.fontFamily,
      textColor: primary,
      surfaceColor: "#ffffff",
      borderColor: primary,
      accentColor: secondary,
    };
  }

  return element;
}

function countOffBrandColors(
  document: DesignDocument,
  brandColorSet: Set<string>,
) {
  let count = 0;

  for (const page of document.pages) {
    for (const color of getElementColors({
      type: "page",
      background: page.background,
    })) {
      if (isOffBrandColor(color, brandColorSet)) count += 1;
    }

    for (const element of page.elements) {
      for (const color of getElementColors(element)) {
        if (isOffBrandColor(color, brandColorSet)) count += 1;
      }
    }
  }

  return count;
}

function countOffBrandFonts(
  document: DesignDocument,
  brandFontSet: Set<string>,
) {
  let count = 0;

  for (const page of document.pages) {
    for (const element of page.elements) {
      const fontFamily = getElementFontFamily(element);

      if (fontFamily && !brandFontSet.has(fontFamily)) {
        count += 1;
      }
    }
  }

  return count;
}

function getElementColors(
  element: DesignElement | { type: "page"; background: string },
) {
  if (element.type === "page") return [element.background];
  if (element.type === "text") {
    return [
      element.color,
      element.textGradientFrom,
      element.textGradientTo,
      element.textEffectColor,
    ];
  }
  if (element.type === "document") {
    return [
      element.textColor,
      element.headingColor,
      element.surfaceColor,
      element.borderColor,
    ];
  }
  if (element.type === "shape") {
    return [
      element.fill,
      element.fillGradientFrom,
      element.fillGradientTo,
      element.fillPatternColor,
      element.stroke,
    ];
  }
  if (element.type === "sticky-note") {
    return [element.fill, element.textColor, element.accentColor];
  }
  if (element.type === "connector") {
    return [element.stroke, element.labelColor];
  }
  if (element.type === "draw") return [element.stroke];
  if (element.type === "path") {
    return [
      element.fill,
      element.fillGradientFrom,
      element.fillGradientTo,
      element.fillPatternColor,
      element.stroke,
    ];
  }
  if (element.type === "svg") return [element.fillColor, element.strokeColor];
  if (element.type === "qr")
    return [element.qrForeground, element.qrBackground];
  if (element.type === "table") {
    return [
      element.textColor,
      element.headerFill,
      element.bodyFill,
      element.borderColor,
    ];
  }
  if (element.type === "chart") {
    return [
      element.backgroundColor,
      element.textColor,
      element.axisColor,
      ...element.data.map((point) => point.color),
    ];
  }
  if (element.type === "form") {
    return [
      element.textColor,
      element.surfaceColor,
      element.fieldColor,
      element.borderColor,
      element.accentColor,
    ];
  }
  if (element.type === "embed" || element.type === "timer") {
    return [
      element.textColor,
      element.surfaceColor,
      element.borderColor,
      element.accentColor,
    ];
  }

  return [];
}

function getElementFontFamily(element: DesignElement) {
  if (
    element.type === "text" ||
    element.type === "table" ||
    element.type === "form" ||
    element.type === "embed" ||
    element.type === "timer" ||
    element.type === "document" ||
    element.type === "sticky-note"
  ) {
    return element.fontFamily;
  }

  return null;
}

function documentUsesBrandLogo(
  document: DesignDocument,
  brandLogos: BrandLogoSummary[],
) {
  const logoNames = brandLogos.map((logo) => normalizeName(logo.name));

  return document.pages.some((page) =>
    page.elements.some((element) => {
      if (element.type === "image") {
        return logoNames.some((name) =>
          normalizeName(element.alt).includes(name),
        );
      }

      if (element.type === "svg") {
        return logoNames.some((name) =>
          normalizeName(element.name).includes(name),
        );
      }

      return false;
    }),
  );
}

function isOffBrandColor(
  color: string | null | undefined,
  brandColorSet: Set<string>,
) {
  const normalized = normalizeColor(color);

  return (
    normalized.length > 0 &&
    !neutralColors.has(normalized) &&
    !brandColorSet.has(normalized)
  );
}

function normalizeColor(color: string | null | undefined) {
  return color?.trim().toLowerCase() ?? "";
}

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "");
}

function getBrandFont(brandFonts: BrandFontSummary[], role: BrandFontRole) {
  return (
    brandFonts.find((font) => font.role === role) ??
    brandFonts.find((font) => font.role === "body") ??
    brandFonts[0] ??
    null
  );
}

function applyChartColor(
  point: ChartDataPoint,
  palette: string[],
  pointIndex: number,
) {
  return {
    ...point,
    color: palette[pointIndex % palette.length],
  };
}
