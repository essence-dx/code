import type {
  DesignDocument,
  DesignEffectStyle,
  DesignLayoutGridStyle,
  DesignLayoutPresetStyle,
  DesignPaintStyle,
  DesignTextStyle,
  DesignVariableDefinition,
} from "@/features/editor/types";
import { resolveVariableValue } from "@/features/editor/variable-bindings";

export type DesignTokenDriftStatus = "synced" | "drift" | "unpaired";

export type DesignTokenDriftRow = {
  id: string;
  styleId: string;
  styleName: string;
  category: string;
  property: string;
  tokenType: TokenType;
  status: DesignTokenDriftStatus;
  styleValue: string;
  variableName?: string;
  variableValue?: string;
  suggestion: string;
};

export type DesignTokenDriftReport = {
  styleCount: number;
  variableCount: number;
  checkedPropertyCount: number;
  syncedCount: number;
  driftCount: number;
  unpairedCount: number;
  rows: DesignTokenDriftRow[];
};

type TokenType = DesignVariableDefinition["type"];

type TokenEntry = {
  name: string;
  type: TokenType;
  value: string;
  keys: Set<string>;
};

type StyleProperty = {
  styleId: string;
  styleName: string;
  category: string;
  property: string;
  value: string | number | undefined | null;
  tokenType: TokenType;
};

export function getDesignTokenDriftReview(
  document: DesignDocument,
): DesignTokenDriftReport {
  const tokens = getTokenEntries(document);
  const properties = getStyleProperties(document);
  const rows = properties.map((property) => {
    const token = findMatchingToken(tokens, property);

    return getDriftRow(property, token);
  });

  return {
    styleCount: getStyleCount(document),
    variableCount: tokens.length,
    checkedPropertyCount: rows.length,
    syncedCount: rows.filter((row) => row.status === "synced").length,
    driftCount: rows.filter((row) => row.status === "drift").length,
    unpairedCount: rows.filter((row) => row.status === "unpaired").length,
    rows: rows.filter((row) => row.status !== "synced"),
  };
}

export function getDesignTokenDriftCsv(report: DesignTokenDriftReport) {
  const header: Array<keyof DesignTokenDriftRow> = [
    "category",
    "styleName",
    "property",
    "tokenType",
    "status",
    "styleValue",
    "variableName",
    "variableValue",
    "suggestion",
  ];

  return [
    ["styleCount", report.styleCount].map(escapeCsvCell).join(","),
    ["checkedPropertyCount", report.checkedPropertyCount]
      .map(escapeCsvCell)
      .join(","),
    ["driftCount", report.driftCount].map(escapeCsvCell).join(","),
    ["unpairedCount", report.unpairedCount].map(escapeCsvCell).join(","),
    "",
    header.join(","),
    ...report.rows.map((row) =>
      header.map((key) => escapeCsvCell(row[key] ?? "")).join(","),
    ),
  ].join("\n");
}

function getTokenEntries(document: DesignDocument): TokenEntry[] {
  const definitionEntries = Object.values(document.variableDefinitions ?? {})
    .map((variable) => {
      const value = resolveVariableValue(variable.id, document);

      if (value === null) {
        return null;
      }

      return createTokenEntry(variable.name, variable.type, value);
    })
    .filter((entry): entry is TokenEntry => Boolean(entry));
  const definitionNames = new Set(definitionEntries.map((entry) => entry.name));
  const legacyEntries = Object.entries(document.variables ?? {})
    .filter(([name]) => !definitionNames.has(name))
    .map(([name, value]) => createTokenEntry(name, inferTokenType(value), value));

  return [...definitionEntries, ...legacyEntries];
}

function getStyleProperties(document: DesignDocument): StyleProperty[] {
  return [
    ...Object.values(document.paintStyles ?? {}).flatMap(getPaintProperties),
    ...Object.values(document.textStyles ?? {}).flatMap(getTextProperties),
    ...Object.values(document.effectStyles ?? {}).flatMap(getEffectProperties),
    ...Object.values(document.layoutGridStyles ?? {}).flatMap(getGridProperties),
    ...Object.values(document.layoutPresetStyles ?? {}).flatMap(
      getLayoutPresetProperties,
    ),
  ].filter((property) => property.value !== undefined && property.value !== null);
}

function getPaintProperties(style: DesignPaintStyle): StyleProperty[] {
  return [
    {
      styleId: style.id,
      styleName: style.name,
      category: "Paint",
      property: "Value",
      value: style.value,
      tokenType: "color",
    },
  ];
}

function getTextProperties(style: DesignTextStyle): StyleProperty[] {
  return [
    {
      styleId: style.id,
      styleName: style.name,
      category: "Text",
      property: "Font family",
      value: style.fontFamily,
      tokenType: "text",
    },
    {
      styleId: style.id,
      styleName: style.name,
      category: "Text",
      property: "Font size",
      value: style.fontSize,
      tokenType: "number",
    },
    {
      styleId: style.id,
      styleName: style.name,
      category: "Text",
      property: "Font weight",
      value: style.fontWeight,
      tokenType: "number",
    },
    {
      styleId: style.id,
      styleName: style.name,
      category: "Text",
      property: "Line height",
      value: style.lineHeight,
      tokenType: "number",
    },
    {
      styleId: style.id,
      styleName: style.name,
      category: "Text",
      property: "Letter spacing",
      value: style.letterSpacing,
      tokenType: "number",
    },
    {
      styleId: style.id,
      styleName: style.name,
      category: "Text",
      property: "Text color",
      value: style.textColor,
      tokenType: "color",
    },
  ];
}

function getEffectProperties(style: DesignEffectStyle): StyleProperty[] {
  return [
    {
      styleId: style.id,
      styleName: style.name,
      category: "Effect",
      property: "Shadow color",
      value: style.shadowEnabled ? style.shadowColor : null,
      tokenType: "color",
    },
    {
      styleId: style.id,
      styleName: style.name,
      category: "Effect",
      property: "Shadow X",
      value: style.shadowEnabled ? style.shadowX : null,
      tokenType: "number",
    },
    {
      styleId: style.id,
      styleName: style.name,
      category: "Effect",
      property: "Shadow Y",
      value: style.shadowEnabled ? style.shadowY : null,
      tokenType: "number",
    },
    {
      styleId: style.id,
      styleName: style.name,
      category: "Effect",
      property: "Shadow blur",
      value: style.shadowEnabled ? style.shadowBlur : null,
      tokenType: "number",
    },
    {
      styleId: style.id,
      styleName: style.name,
      category: "Effect",
      property: "Shadow spread",
      value: style.shadowEnabled ? style.shadowSpread : null,
      tokenType: "number",
    },
    {
      styleId: style.id,
      styleName: style.name,
      category: "Effect",
      property: "Layer blur",
      value: style.layerBlur,
      tokenType: "number",
    },
    {
      styleId: style.id,
      styleName: style.name,
      category: "Effect",
      property: "Background blur",
      value: style.backgroundBlur,
      tokenType: "number",
    },
  ];
}

function getGridProperties(style: DesignLayoutGridStyle): StyleProperty[] {
  return [
    {
      styleId: style.id,
      styleName: style.name,
      category: "Grid",
      property: "Color",
      value: style.grid.color,
      tokenType: "color",
    },
    {
      styleId: style.id,
      styleName: style.name,
      category: "Grid",
      property: "Size",
      value: style.grid.size,
      tokenType: "number",
    },
    {
      styleId: style.id,
      styleName: style.name,
      category: "Grid",
      property: "Count",
      value: style.grid.count,
      tokenType: "number",
    },
    {
      styleId: style.id,
      styleName: style.name,
      category: "Grid",
      property: "Gutter",
      value: style.grid.gutter,
      tokenType: "number",
    },
    {
      styleId: style.id,
      styleName: style.name,
      category: "Grid",
      property: "Margin",
      value: style.grid.margin,
      tokenType: "number",
    },
  ];
}

function getLayoutPresetProperties(
  style: DesignLayoutPresetStyle,
): StyleProperty[] {
  return [
    {
      styleId: style.id,
      styleName: style.name,
      category: "Layout",
      property: "Mode",
      value: style.autoLayout?.mode,
      tokenType: "text",
    },
    {
      styleId: style.id,
      styleName: style.name,
      category: "Layout",
      property: "Gap",
      value: style.autoLayout?.gap,
      tokenType: "number",
    },
    {
      styleId: style.id,
      styleName: style.name,
      category: "Layout",
      property: "Padding X",
      value: style.autoLayout?.paddingX,
      tokenType: "number",
    },
    {
      styleId: style.id,
      styleName: style.name,
      category: "Layout",
      property: "Padding Y",
      value: style.autoLayout?.paddingY,
      tokenType: "number",
    },
  ];
}

function getDriftRow(
  property: StyleProperty,
  token: TokenEntry | undefined,
): DesignTokenDriftRow {
  const styleValue = normalizeValue(property.value);

  if (!token) {
    return {
      id: getRowId(property),
      styleId: property.styleId,
      styleName: property.styleName,
      category: property.category,
      property: property.property,
      tokenType: property.tokenType,
      status: "unpaired",
      styleValue,
      suggestion: `Create a ${property.tokenType} variable named ${getSuggestedVariableName(
        property,
      )} with value ${styleValue}.`,
    };
  }

  const variableValue = normalizeValue(token.value);

  return {
    id: getRowId(property),
    styleId: property.styleId,
    styleName: property.styleName,
    category: property.category,
    property: property.property,
    tokenType: property.tokenType,
    status: styleValue === variableValue ? "synced" : "drift",
    styleValue,
    variableName: token.name,
    variableValue,
    suggestion:
      styleValue === variableValue
        ? "No action needed."
        : `Sync the style to ${token.name} (${variableValue}) or update the variable to ${styleValue}.`,
  };
}

function findMatchingToken(tokens: TokenEntry[], property: StyleProperty) {
  const candidates = getPropertyKeys(property);

  return tokens.find(
    (token) =>
      token.type === property.tokenType &&
      candidates.some((candidate) => token.keys.has(candidate)),
  );
}

function createTokenEntry(
  name: string,
  type: TokenType,
  value: string,
): TokenEntry {
  return {
    name,
    type,
    value,
    keys: getTokenKeys(name),
  };
}

function getTokenKeys(name: string) {
  const parts = name.split(/[/.]+/).filter(Boolean);
  const lastPart = parts.at(-1) ?? name;

  return new Set([normalizeName(name), normalizeName(lastPart)]);
}

function getPropertyKeys(property: StyleProperty) {
  const styleName = normalizeName(property.styleName);
  const propertyName = normalizeName(property.property);
  const category = normalizeName(property.category);

  return [
    styleName,
    propertyName,
    `${styleName}-${propertyName}`,
    `${category}-${styleName}`,
    `${category}-${styleName}-${propertyName}`,
  ];
}

function getSuggestedVariableName(property: StyleProperty) {
  return `${property.category}/${property.styleName}/${property.property}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

function getStyleCount(document: DesignDocument) {
  return (
    Object.keys(document.paintStyles ?? {}).length +
    Object.keys(document.textStyles ?? {}).length +
    Object.keys(document.effectStyles ?? {}).length +
    Object.keys(document.layoutGridStyles ?? {}).length +
    Object.keys(document.layoutPresetStyles ?? {}).length
  );
}

function getRowId(property: StyleProperty) {
  return `${property.category}:${property.styleId}:${property.property}`;
}

function inferTokenType(value: string): TokenType {
  if (value.startsWith("#") || value.startsWith("rgb") || value === "transparent") {
    return "color";
  }

  return Number.isFinite(Number(value)) ? "number" : "text";
}

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeValue(value: string | number | undefined | null) {
  return String(value ?? "").trim().toLowerCase();
}

function escapeCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}
