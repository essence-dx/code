import {
  createComponentLibraryManifest,
  type ComponentLibraryManifest,
} from "@/features/editor/component-library-manifest";
import {
  getDesignTokenAndroid,
  getDesignTokenCss,
  getDesignTokenJson,
  getDesignTokenSwift,
  getDesignTokenTailwind,
  type DesignTokenExportInput,
} from "@/features/editor/design-token-export";
import type { DesignDocument } from "@/features/editor/types";

export const designSystemPackageType = "essence.design-system-package";

export type DesignSystemPackage = {
  type: typeof designSystemPackageType;
  version: 1;
  exportedAt: string;
  summary: {
    componentCount: number;
    variableCount: number;
    paintStyleCount: number;
    textStyleCount: number;
    effectStyleCount: number;
    gridStyleCount: number;
    layoutPresetCount: number;
  };
  library: ComponentLibraryManifest["library"];
  components: ComponentLibraryManifest["components"];
  tokens: {
    json: unknown;
    css: string;
    tailwind: string;
    swift: string;
    android: string;
  };
};

export function createDesignSystemPackage(
  document: DesignDocument,
): DesignSystemPackage {
  const libraryManifest = createComponentLibraryManifest(document);
  const tokenInput = getDesignTokenInput(document);
  const tokenJson = getDesignTokenJson(tokenInput);

  return {
    type: designSystemPackageType,
    version: 1,
    exportedAt: new Date().toISOString(),
    summary: {
      componentCount: libraryManifest.components.length,
      variableCount: Object.keys(
        document.variableDefinitions ?? document.variables ?? {},
      ).length,
      paintStyleCount: Object.keys(document.paintStyles ?? {}).length,
      textStyleCount: Object.keys(document.textStyles ?? {}).length,
      effectStyleCount: Object.keys(document.effectStyles ?? {}).length,
      gridStyleCount: Object.keys(document.layoutGridStyles ?? {}).length,
      layoutPresetCount: Object.keys(document.layoutPresetStyles ?? {}).length,
    },
    library: libraryManifest.library,
    components: libraryManifest.components,
    tokens: {
      json: JSON.parse(tokenJson) as unknown,
      css: getDesignTokenCss(tokenInput),
      tailwind: getDesignTokenTailwind(tokenInput),
      swift: getDesignTokenSwift(tokenInput),
      android: getDesignTokenAndroid(tokenInput),
    },
  };
}

function getDesignTokenInput(document: DesignDocument): DesignTokenExportInput {
  return {
    variables: document.variables,
    variableDefinitions: document.variableDefinitions ?? {},
    variableCollections: document.variableCollections ?? {},
    variableModes: document.variableModes ?? [],
    activeVariableModeId: document.activeVariableModeId,
    paintStyles: document.paintStyles ?? {},
    textStyles: document.textStyles ?? {},
    effectStyles: document.effectStyles ?? {},
    layoutGridStyles: document.layoutGridStyles ?? {},
    layoutPresetStyles: document.layoutPresetStyles ?? {},
  };
}
