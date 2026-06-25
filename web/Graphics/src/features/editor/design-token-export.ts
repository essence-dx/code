import type {
  DesignEffectStyle,
  DesignLayoutGridStyle,
  DesignLayoutPresetStyle,
  DesignPaintStyle,
  DesignTextStyle,
  DesignVariableCollection,
  DesignVariableDefinition,
  DesignVariableMode,
} from "@/features/editor/types";
import {
  defaultVariableMode,
  getVariableCollections,
  getActiveVariableModeId,
  resolveVariableValue,
} from "@/features/editor/variable-bindings";

export type DesignTokenExportInput = {
  variables: Record<string, string>;
  variableDefinitions: Record<string, DesignVariableDefinition>;
  variableCollections: Record<string, DesignVariableCollection>;
  variableModes: DesignVariableMode[];
  activeVariableModeId?: string;
  paintStyles: Record<string, DesignPaintStyle>;
  textStyles: Record<string, DesignTextStyle>;
  effectStyles: Record<string, DesignEffectStyle>;
  layoutGridStyles: Record<string, DesignLayoutGridStyle>;
  layoutPresetStyles: Record<string, DesignLayoutPresetStyle>;
};

export function getDesignTokenJson(input: DesignTokenExportInput) {
  const definitions = getMergedVariableDefinitions(input);
  const collections = getVariableCollections(input);
  const context = {
    variableDefinitions: definitions,
    variableModes: input.variableModes,
    activeVariableModeId: input.activeVariableModeId,
  };
  const activeModeId = getActiveVariableModeId(context);

  return JSON.stringify(
    {
      activeModeId,
      modes: input.variableModes.length
        ? input.variableModes
        : [defaultVariableMode],
      collections,
      variables: Object.fromEntries(
        Object.values(definitions).map((variable) => [
          variable.name,
          {
            type: variable.type,
            collectionId: variable.collectionId ?? null,
            aliasOf: variable.aliasOf ?? null,
            values: variable.values,
            resolved: resolveVariableValue(variable.id, context),
          },
        ]),
      ),
      styles: {
        paints: input.paintStyles,
        text: input.textStyles,
        effects: input.effectStyles,
        grids: input.layoutGridStyles,
        layoutPresets: input.layoutPresetStyles,
      },
    },
    null,
    2,
  );
}

export function getDesignTokenCss(input: DesignTokenExportInput) {
  const definitions = getMergedVariableDefinitions(input);
  const context = {
    variableDefinitions: definitions,
    variableModes: input.variableModes,
    activeVariableModeId: input.activeVariableModeId,
  };
  const variableRules = Object.values(definitions)
    .map((variable) => {
      const value = resolveVariableValue(variable.id, context);

      if (value === null) {
        return null;
      }

      return `  --${toTokenName(variable.name)}: ${formatCssTokenValue(
        variable.type,
        value,
      )};`;
    })
    .filter((rule): rule is string => Boolean(rule));
  const paintRules = Object.values(input.paintStyles).map(
    (style) => `  --paint-${toTokenName(style.name)}: ${style.value};`,
  );
  const textRules = Object.values(input.textStyles).flatMap((style) => [
    `  --font-family-${toTokenName(style.name)}: ${style.fontFamily};`,
    `  --font-size-${toTokenName(style.name)}: ${style.fontSize}px;`,
    `  --font-weight-${toTokenName(style.name)}: ${style.fontWeight};`,
    `  --line-height-${toTokenName(style.name)}: ${style.lineHeight};`,
    `  --letter-spacing-${toTokenName(style.name)}: ${style.letterSpacing}px;`,
  ]);
  const effectRules = Object.values(input.effectStyles).flatMap((style) => [
    style.shadowEnabled
      ? `  --shadow-${toTokenName(style.name)}: ${style.shadowX ?? 0}px ${
          style.shadowY ?? 0
        }px ${style.shadowBlur ?? 0}px ${style.shadowSpread ?? 0}px ${
          style.shadowColor ?? "rgb(0 0 0 / 0.24)"
        };`
      : null,
    style.layerBlur
      ? `  --blur-${toTokenName(style.name)}: ${style.layerBlur}px;`
      : null,
  ].filter((rule): rule is string => Boolean(rule)));
  const gridRules = Object.values(input.layoutGridStyles).flatMap((style) => [
    `  --grid-${toTokenName(style.name)}-count: ${style.grid.count};`,
    `  --grid-${toTokenName(style.name)}-gutter: ${style.grid.gutter}px;`,
    `  --grid-${toTokenName(style.name)}-margin: ${style.grid.margin}px;`,
  ]);
  const layoutPresetRules = Object.values(input.layoutPresetStyles).flatMap(
    (style) =>
      [
        style.autoLayout
          ? `  --layout-${toTokenName(style.name)}-direction: ${
              style.autoLayout.mode
            };`
          : null,
        style.autoLayout
          ? `  --layout-${toTokenName(style.name)}-gap: ${
              style.autoLayout.gap
            }px;`
          : null,
        style.autoLayout
          ? `  --layout-${toTokenName(style.name)}-padding-x: ${
              style.autoLayout.paddingX
            }px;`
          : null,
        style.autoLayout
          ? `  --layout-${toTokenName(style.name)}-padding-y: ${
              style.autoLayout.paddingY
            }px;`
          : null,
        style.autoLayout
          ? `  --layout-${toTokenName(style.name)}-align: ${
              style.autoLayout.align
            };`
          : null,
        style.autoLayout
          ? `  --layout-${toTokenName(style.name)}-wrap: ${
              style.autoLayout.wrap ?? "nowrap"
            };`
          : null,
        `  --layout-${toTokenName(style.name)}-sizing-x: ${
          style.layoutSizing.horizontal
        };`,
        `  --layout-${toTokenName(style.name)}-sizing-y: ${
          style.layoutSizing.vertical
        };`,
      ].filter((rule): rule is string => Boolean(rule)),
  );

  return [
    ":root {",
    ...variableRules,
    ...paintRules,
    ...textRules,
    ...effectRules,
    ...gridRules,
    ...layoutPresetRules,
    "}",
  ].join("\n");
}

export function getDesignTokenTailwind(input: DesignTokenExportInput) {
  const definitions = getMergedVariableDefinitions(input);
  const context = getTokenContext(input, definitions);
  const colorTokens = getResolvedVariablesByType(definitions, context, "color");
  const numberTokens = getResolvedVariablesByType(definitions, context, "number");

  return [
    "export default {",
    "  theme: {",
    "    extend: {",
    "      colors: {",
    ...colorTokens.map(
      ([name, value]) => `        "${toTokenName(name)}": "${value}",`,
    ),
    "      },",
    "      spacing: {",
    ...numberTokens.map(
      ([name, value]) => `        "${toTokenName(name)}": "${value}px",`,
    ),
    "      },",
    "      borderRadius: {",
    ...numberTokens
      .filter(([name]) => name.includes("radius"))
      .map(([name, value]) => `        "${toTokenName(name)}": "${value}px",`),
    "      },",
    "    },",
    "  },",
    "};",
  ].join("\n");
}

export function getDesignTokenSwift(input: DesignTokenExportInput) {
  const definitions = getMergedVariableDefinitions(input);
  const context = getTokenContext(input, definitions);

  return [
    "enum EssenceTokens {",
    ...Object.values(definitions).flatMap((variable) => {
      const value = resolveVariableValue(variable.id, context);

      if (value === null) {
        return [];
      }

      return [
        `  static let ${toCodeIdentifier(variable.name)} = ${
          variable.type === "number" ? value : `"${escapeString(value)}"`
        }`,
      ];
    }),
    "}",
  ].join("\n");
}

export function getDesignTokenAndroid(input: DesignTokenExportInput) {
  const definitions = getMergedVariableDefinitions(input);
  const context = getTokenContext(input, definitions);

  return [
    "<resources>",
    ...Object.values(definitions).flatMap((variable) => {
      const value = resolveVariableValue(variable.id, context);

      if (value === null) {
        return [];
      }

      if (variable.type === "color") {
        return [`  <color name="${toTokenName(variable.name)}">${value}</color>`];
      }

      if (variable.type === "number") {
        return [`  <dimen name="${toTokenName(variable.name)}">${value}dp</dimen>`];
      }

      return [
        `  <string name="${toTokenName(variable.name)}">${escapeXml(
          value,
        )}</string>`,
      ];
    }),
    "</resources>",
  ].join("\n");
}

function getMergedVariableDefinitions(
  input: DesignTokenExportInput,
): Record<string, DesignVariableDefinition> {
  const now = new Date().toISOString();

  return {
    ...Object.fromEntries(
      Object.entries(input.variables).map(([name, value]) => [
        name,
        createLegacyVariableDefinition(name, value, now),
      ]),
    ),
    ...input.variableDefinitions,
  };
}

function createLegacyVariableDefinition(
  name: string,
  value: string,
  now: string,
) {
  const type = inferVariableType(value);

  return {
    id: name,
    name,
    type,
    collectionId: type === "color" ? "paint" : type === "text" ? "text" : "layout",
    values: { [defaultVariableMode.id]: value },
    createdAt: now,
    updatedAt: now,
  } satisfies DesignVariableDefinition;
}

function getTokenContext(
  input: DesignTokenExportInput,
  definitions: Record<string, DesignVariableDefinition>,
) {
  return {
    variableDefinitions: definitions,
    variableModes: input.variableModes,
    activeVariableModeId: input.activeVariableModeId,
  };
}

function getResolvedVariablesByType(
  definitions: Record<string, DesignVariableDefinition>,
  context: Pick<
    DesignTokenExportInput,
    "activeVariableModeId" | "variableDefinitions" | "variableModes"
  >,
  type: DesignVariableDefinition["type"],
) {
  return Object.values(definitions)
    .filter((variable) => variable.type === type)
    .map((variable) => [variable.name, resolveVariableValue(variable.id, context)] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] !== null);
}

function inferVariableType(value: string): DesignVariableDefinition["type"] {
  if (value.startsWith("#") || value.startsWith("rgb") || value === "transparent") {
    return "color";
  }

  return Number.isFinite(Number(value)) ? "number" : "text";
}

function formatCssTokenValue(
  type: DesignVariableDefinition["type"],
  value: string,
) {
  if (type === "number") {
    return Number.isFinite(Number(value)) ? `${value}px` : value;
  }

  return value;
}

function toTokenName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toCodeIdentifier(value: string) {
  const identifier = toTokenName(value).replace(/-([a-z0-9])/g, (_, letter) =>
    String(letter).toUpperCase(),
  );

  return /^[a-zA-Z_]/.test(identifier) ? identifier : `token${identifier}`;
}

function escapeString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
