import type {
  DesignComponent,
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";
import { getComponentPropertyDefinitionSignature } from "@/features/editor/component-properties";
import { getComponentSlotSignature } from "@/features/editor/component-slots";
import {
  getAutoLayoutSignature,
  getLayoutSizingSignature,
} from "@/features/editor/auto-layout";
import { getConstraintsSignature } from "@/features/editor/constraints";
import { getEffectStyleSignature } from "@/features/editor/effect-styles";
import {
  getLayoutGridSignature,
  getLayoutGridStyleSignature,
} from "@/features/editor/layout-grids";
import { getLayoutPresetStyleSignature } from "@/features/editor/layout-preset-styles";
import { getPaintStyleSignature } from "@/features/editor/paint-styles";
import { getPaintStackSignature } from "@/features/editor/paint-stack";
import { getTextStyleSignature } from "@/features/editor/text-styles";
import {
  getVariableCollectionSignature,
  getLayerVariableBindingSignature,
  getVariableDefinitionSignature,
} from "@/features/editor/variable-bindings";

export type VersionComparison = {
  metrics: Array<{
    id: string;
    label: string;
    current: number;
    previous: number;
  }>;
  layerChanges: ChangeSummary[];
  componentChanges: ChangeSummary[];
};

export type ChangeSummary = {
  id: string;
  name: string;
  status: "added" | "removed" | "changed";
  details: string[];
};

export function compareDesignDocuments(
  current: DesignDocument,
  previous: DesignDocument,
): VersionComparison {
  const currentPage = getActivePage(current);
  const previousPage = getActivePage(previous);

  return {
    metrics: [
      metric("pages", "Pages", current.pages.length, previous.pages.length),
      metric(
        "layers",
        "Layers",
        currentPage.layers.length,
        previousPage.layers.length,
      ),
      metric(
        "components",
        "Components",
        Object.keys(current.components ?? {}).length,
        Object.keys(previous.components ?? {}).length,
      ),
      metric(
        "variables",
        "Variables",
        Object.keys(current.variableDefinitions ?? current.variables ?? {}).length,
        Object.keys(previous.variableDefinitions ?? previous.variables ?? {})
          .length,
      ),
      metric(
        "variable-modes",
        "Variable modes",
        current.variableModes?.length ?? 1,
        previous.variableModes?.length ?? 1,
      ),
      metric(
        "variable-collections",
        "Variable collections",
        Object.keys(current.variableCollections ?? {}).length,
        Object.keys(previous.variableCollections ?? {}).length,
      ),
      metric(
        "variable-collection-changes",
        "Variable collection changes",
        getVariableCollectionSignature(current.variableCollections) ===
          getVariableCollectionSignature(previous.variableCollections)
          ? 0
          : 1,
        0,
      ),
      metric(
        "variable-changes",
        "Variable changes",
        getVariableDefinitionSignature(current.variableDefinitions) ===
          getVariableDefinitionSignature(previous.variableDefinitions)
          ? 0
          : 1,
        0,
      ),
      metric(
        "comments",
        "Comments",
        currentPage.comments?.length ?? 0,
        previousPage.comments?.length ?? 0,
      ),
      metric(
        "prototype-starts",
        "Prototype starts",
        getPrototypeStartCount(current),
        getPrototypeStartCount(previous),
      ),
      metric(
        "layout-grid-styles",
        "Grid styles",
        Object.keys(current.layoutGridStyles ?? {}).length,
        Object.keys(previous.layoutGridStyles ?? {}).length,
      ),
      metric(
        "layout-grid-style-changes",
        "Grid style changes",
        getLayoutGridStyleSignature(current.layoutGridStyles) ===
          getLayoutGridStyleSignature(previous.layoutGridStyles)
          ? 0
          : 1,
        0,
      ),
      metric(
        "paint-styles",
        "Paint styles",
        Object.keys(current.paintStyles ?? {}).length,
        Object.keys(previous.paintStyles ?? {}).length,
      ),
      metric(
        "paint-style-changes",
        "Paint style changes",
        getPaintStyleSignature(current.paintStyles) ===
          getPaintStyleSignature(previous.paintStyles)
          ? 0
          : 1,
        0,
      ),
      metric(
        "text-styles",
        "Text styles",
        Object.keys(current.textStyles ?? {}).length,
        Object.keys(previous.textStyles ?? {}).length,
      ),
      metric(
        "text-style-changes",
        "Text style changes",
        getTextStyleSignature(current.textStyles) ===
          getTextStyleSignature(previous.textStyles)
          ? 0
          : 1,
        0,
      ),
      metric(
        "effect-styles",
        "Effect styles",
        Object.keys(current.effectStyles ?? {}).length,
        Object.keys(previous.effectStyles ?? {}).length,
      ),
      metric(
        "effect-style-changes",
        "Effect style changes",
        getEffectStyleSignature(current.effectStyles) ===
          getEffectStyleSignature(previous.effectStyles)
          ? 0
          : 1,
        0,
      ),
      metric(
        "layout-preset-styles",
        "Layout presets",
        Object.keys(current.layoutPresetStyles ?? {}).length,
        Object.keys(previous.layoutPresetStyles ?? {}).length,
      ),
      metric(
        "layout-preset-style-changes",
        "Layout preset changes",
        getLayoutPresetStyleSignature(current.layoutPresetStyles) ===
          getLayoutPresetStyleSignature(previous.layoutPresetStyles)
          ? 0
          : 1,
        0,
      ),
    ],
    layerChanges: compareById(
      currentPage.layers,
      previousPage.layers,
      getLayerDetails,
    ),
    componentChanges: compareById(
      Object.values(current.components ?? {}),
      Object.values(previous.components ?? {}),
      getComponentDetails,
    ),
  };
}

function metric(
  id: string,
  label: string,
  current: number,
  previous: number,
) {
  return { id, label, current, previous };
}

function getPrototypeStartCount(document: DesignDocument) {
  return document.pages.filter((page) => page.prototypeStart).length;
}

function compareById<T extends { id: string; name: string }>(
  currentItems: T[],
  previousItems: T[],
  getDetails: (current: T, previous: T) => string[],
) {
  const currentById = new Map(currentItems.map((item) => [item.id, item]));
  const previousById = new Map(previousItems.map((item) => [item.id, item]));
  const changes: ChangeSummary[] = [];

  currentItems.forEach((item) => {
    const previous = previousById.get(item.id);

    if (!previous) {
      changes.push({
        id: item.id,
        name: item.name,
        status: "added",
        details: ["New in current document"],
      });
      return;
    }

    const details = getDetails(item, previous);

    if (details.length > 0) {
      changes.push({
        id: item.id,
        name: item.name,
        status: "changed",
        details,
      });
    }
  });

  previousItems.forEach((item) => {
    if (!currentById.has(item.id)) {
      changes.push({
        id: item.id,
        name: item.name,
        status: "removed",
        details: ["Missing from current document"],
      });
    }
  });

  return changes;
}

function getLayerDetails(current: DesignLayer, previous: DesignLayer) {
  return [
    changed("Name", previous.name, current.name),
    changed("Type", previous.type, current.type),
    changed("Parent frame", previous.parentId, current.parentId),
    changed(
      "Absolute in frame",
      previous.absolutePositioned,
      current.absolutePositioned,
    ),
    current.x !== previous.x || current.y !== previous.y
      ? `Position: ${previous.x}, ${previous.y} -> ${current.x}, ${current.y}`
      : null,
    current.width !== previous.width || current.height !== previous.height
      ? `Size: ${previous.width} x ${previous.height} -> ${current.width} x ${current.height}`
      : null,
    changed("Fill", previous.fill, current.fill),
    changed(
      "Paint stack",
      getPaintStackSignature(previous.fillPaints),
      getPaintStackSignature(current.fillPaints),
    ),
    changed("Stroke", previous.stroke, current.stroke),
    changed(
      "Stroke paint stack",
      getPaintStackSignature(previous.strokePaints),
      getPaintStackSignature(current.strokePaints),
    ),
    changed("Stroke dash", previous.strokeDash, current.strokeDash),
    changed("Stroke cap", previous.strokeLineCap, current.strokeLineCap),
    changed("Stroke join", previous.strokeLineJoin, current.strokeLineJoin),
    changed("Opacity", previous.opacity, current.opacity),
    changed("Rotation", previous.rotation, current.rotation),
    changed("Blend mode", previous.blendMode, current.blendMode),
    changed("Clip content", previous.clipContent, current.clipContent),
    changed("Mask", getMaskSignature(previous), getMaskSignature(current)),
    changed(
      "Variable bindings",
      getLayerVariableBindingSignature(previous),
      getLayerVariableBindingSignature(current),
    ),
    changed(
      "Component properties",
      getLayerComponentPropertySignature(previous),
      getLayerComponentPropertySignature(current),
    ),
    changed(
      "Component slot",
      getComponentSlotSignature(previous),
      getComponentSlotSignature(current),
    ),
    changed(
      "Layout sizing",
      getLayoutSizingSignature(previous),
      getLayoutSizingSignature(current),
    ),
    changed(
      "Constraints",
      getConstraintsSignature(previous),
      getConstraintsSignature(current),
    ),
    changed(
      "Layout grids",
      getLayoutGridSignature(previous.layoutGrids),
      getLayoutGridSignature(current.layoutGrids),
    ),
    changed(
      "Auto layout",
      getAutoLayoutSignature(previous),
      getAutoLayoutSignature(current),
    ),
    changed("Ready for dev", previous.readyForDev, current.readyForDev),
    changed(
      "Dev links",
      getDevLinksSignature(previous),
      getDevLinksSignature(current),
    ),
    changed(
      "Code Connect",
      getCodeConnectSignature(previous),
      getCodeConnectSignature(current),
    ),
    changed(
      "Prototype",
      getPrototypeSignature(previous),
      getPrototypeSignature(current),
    ),
    changed(
      "Connector",
      getConnectorSignature(previous),
      getConnectorSignature(current),
    ),
    changed("Stamp", getStampSignature(previous), getStampSignature(current)),
    changed(
      "Ink preset",
      getInkPresetSignature(previous),
      getInkPresetSignature(current),
    ),
    current.text !== previous.text ? "Text changed" : null,
    changed("Font", previous.fontFamily, current.fontFamily),
    changed("Text align", previous.textAlign, current.textAlign),
    changed("Text resize", previous.textResizeMode, current.textResizeMode),
    changed("Line height", previous.lineHeight, current.lineHeight),
    changed("Letter spacing", previous.letterSpacing, current.letterSpacing),
    changed("Image fit", previous.imageFit, current.imageFit),
    changed("Shadow enabled", previous.shadowEnabled, current.shadowEnabled),
    changed("Shadow color", previous.shadowColor, current.shadowColor),
    changed("Shadow X", previous.shadowX, current.shadowX),
    changed("Shadow Y", previous.shadowY, current.shadowY),
    changed("Shadow blur", previous.shadowBlur, current.shadowBlur),
    changed("Shadow spread", previous.shadowSpread, current.shadowSpread),
    changed("Layer blur", previous.layerBlur, current.layerBlur),
    changed("Background blur", previous.backgroundBlur, current.backgroundBlur),
    changed("Effects visible", previous.effectsVisible, current.effectsVisible),
    changed("Visible", previous.visible, current.visible),
    changed("Locked", previous.locked, current.locked),
  ].filter((item): item is string => Boolean(item));
}

function getConnectorSignature(layer: DesignLayer) {
  const connector = layer.connector;

  if (!connector) {
    return "";
  }

  return [
    connector.sourceLayerId,
    connector.targetLayerId,
    connector.kind,
    connector.arrow,
  ].join("|");
}

function getMaskSignature(layer: DesignLayer) {
  const mask = layer.mask;

  if (!mask) {
    return layer.maskSource ? "mask-source" : "";
  }

  return [
    mask.kind,
    mask.sourceName ?? "",
    mask.x,
    mask.y,
    mask.width,
    mask.height,
    mask.cornerRadius ?? 0,
  ].join("|");
}

function getStampSignature(layer: DesignLayer) {
  return layer.stamp?.kind ?? "";
}

function getInkPresetSignature(layer: DesignLayer) {
  const preset = layer.inkPreset;

  if (!preset) {
    return "";
  }

  return [preset.kind, preset.color, preset.width, preset.opacity].join("|");
}

function getPrototypeSignature(layer: DesignLayer) {
  const prototype = layer.prototype;

  if (!prototype) {
    return "";
  }

  return [
    prototype.targetPageId,
    prototype.trigger,
    prototype.action ?? "navigate",
    prototype.transition,
    prototype.durationMs,
    prototype.preserveScroll ?? false,
    prototype.scrollBehavior ?? (prototype.preserveScroll ? "preserve" : "reset"),
    prototype.overlayPosition ?? "center",
    prototype.closeOnOutside ?? true,
    prototype.deviceFrame ?? "none",
    prototype.smartAnimate ?? false,
  ].join(":");
}

function getLayerComponentPropertySignature(layer: DesignLayer) {
  return Object.entries(layer.componentProperties ?? {})
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([property, value]) => `${property}:${value}`)
    .join("|");
}

function getCodeConnectSignature(layer: DesignLayer) {
  const mapping = layer.codeConnect;

  if (!mapping) {
    return "";
  }

  return [
    mapping.componentName,
    mapping.importPath,
    mapping.props ?? "",
  ].join(":");
}

function getDevLinksSignature(layer: DesignLayer) {
  return (layer.devLinks ?? [])
    .map((link) => `${link.kind}:${link.url}`)
    .sort()
    .join(", ");
}

function changed(
  label: string,
  previous: boolean | number | string | null | undefined,
  current: boolean | number | string | null | undefined,
) {
  return previous !== current
    ? `${label}: ${formatValue(previous)} -> ${formatValue(current)}`
    : null;
}

function formatValue(value: boolean | number | string | null | undefined) {
  if (value === undefined || value === null || value === "") {
    return "none";
  }

  return String(value);
}

function getComponentDetails(
  current: DesignComponent,
  previous: DesignComponent,
) {
  return [
    current.name !== previous.name
      ? `Name: ${previous.name} -> ${current.name}`
      : null,
    current.layers.length !== previous.layers.length
      ? `Layers: ${previous.layers.length} -> ${current.layers.length}`
      : null,
    (current.variants?.length ?? 0) !== (previous.variants?.length ?? 0)
      ? `Variants: ${previous.variants?.length ?? 0} -> ${
          current.variants?.length ?? 0
        }`
      : null,
    changed(
      "Component properties",
      getComponentPropertyDefinitionSignature(previous),
      getComponentPropertyDefinitionSignature(current),
    ),
    current.width !== previous.width || current.height !== previous.height
      ? `Bounds: ${previous.width} x ${previous.height} -> ${current.width} x ${current.height}`
      : null,
  ].filter((item): item is string => Boolean(item));
}

function getActivePage(document: DesignDocument): DesignPage {
  return (
    document.pages.find((page) => page.id === document.activePageId) ??
    document.pages[0] ?? {
      id: "missing",
      name: "Missing page",
      background: "#000000",
      layers: [],
    }
  );
}
