import { exportLayerToSvg } from "@/features/editor/exporters/svg-exporter";
import {
  getAutoLayoutChildLayers,
  getLayerSizing,
} from "@/features/editor/auto-layout";
import { getLayerConstraints } from "@/features/editor/constraints";
import {
  getComponentSlotName,
  getComponentSlotType,
} from "@/features/editor/component-slots";
import { normalizeLayoutGrid } from "@/features/editor/layout-grids";
import {
  getPrimaryFillValue,
  getPrimaryStrokeValue,
  getVisibleLayerFillPaints,
  getVisibleLayerStrokePaints,
} from "@/features/editor/paint-stack";
import type {
  DesignComment,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";

export type LayerAssetReport = {
  kind: string;
  recommendedFormat: "SVG" | "PNG" | "Source image";
  exportable: boolean;
  notes: string[];
};

export type LayerVariableMatch = {
  property: string;
  token: string;
  value: string;
};

export type LayerAnnotation = {
  id: string;
  text: string;
  status: "open" | "resolved";
  replies: number;
  mentions: string[];
  relativeX: number;
  relativeY: number;
};

export type LayerDevLink = {
  kind: string;
  label: string;
  url: string;
};

export type LayerCodeConnectReport = {
  componentName: string;
  importPath: string;
  props: unknown;
};

export type LayerPrototypeReport = {
  targetPageId: string;
  targetPageName: string;
  trigger: string;
  action: string;
  transition: string;
  durationMs: number;
  preserveScroll: boolean;
  scrollBehavior: string;
  overlayPosition: string;
  closeOnOutside: boolean;
  deviceFrame: string;
  smartAnimate: boolean;
};

export type LayerMeasurementReport = {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    right: number;
    bottom: number;
    centerX: number;
    centerY: number;
  };
  nearestSpacing: LayerSpacingMeasurement[];
};

type LayerSpacingMeasurement = {
  side: "left" | "right" | "top" | "bottom";
  layerId: string;
  layerName: string;
  distance: number;
};

export function getLayerCssCode(layer: DesignLayer) {
  return [
    `${getCssSelector(layer)} {`,
    ...getLayerCssRules(layer).map((rule) => `  ${rule}`),
    `}`,
  ].join("\n");
}

export function getLayerSvgAssetCode(layer: DesignLayer) {
  return exportLayerToSvg(layer);
}

export function getLayerAssetReport(layer: DesignLayer): LayerAssetReport {
  if (layer.type === "image") {
    return {
      kind: layer.imageSrc ? "Image layer" : "Image placeholder",
      recommendedFormat: layer.imageSrc ? "Source image" : "SVG",
      exportable: true,
      notes: [
        layer.imageSrc ? "Source image available" : "No source image attached",
        `Fit: ${layer.imageFit ?? "cover"}`,
      ],
    };
  }

  if (layer.type === "text" || layer.type === "sticky") {
    return {
      kind: layer.type === "sticky" ? "Sticky note" : "Text layer",
      recommendedFormat: "SVG",
      exportable: true,
      notes: [
        `${layer.fontFamily ?? "Inter, Arial, sans-serif"}`,
        `${layer.fontWeight ?? 400} / ${roundNumber(layer.fontSize ?? 16)}px`,
      ],
    };
  }

  if (layer.type === "path") {
    return {
      kind: "Vector path",
      recommendedFormat: "SVG",
      exportable: Boolean(layer.pathData),
      notes: [
        layer.pathData ? "Path data available" : "No path data",
        `Stroke: ${layer.strokeWidth > 0 ? layer.stroke : "none"}`,
      ],
    };
  }

  return {
    kind: `${capitalize(layer.type)} layer`,
    recommendedFormat: "SVG",
    exportable: true,
    notes: [
      `Fill: ${getPrimaryFillValue(layer)}`,
      `Stroke: ${layer.strokeWidth > 0 ? layer.stroke : "none"}`,
    ],
  };
}

export function getLayerHandoffCode(
  layer: DesignLayer,
  variables: Record<string, string> = {},
  comments: DesignComment[] = [],
  layers: DesignLayer[] = [],
  pages: DesignPage[] = [],
) {
  const variableMatches = getLayerVariableReport(layer, variables);
  const annotations = getLayerAnnotationReport(layer, comments);
  const devLinks = getLayerDevLinkReport(layer);
  const codeConnect = getLayerCodeConnectReport(layer);
  const prototype = getLayerPrototypeReport(layer, pages);
  const handoff: Record<string, unknown> = {
    id: layer.id,
    name: layer.name,
    type: layer.type,
    parentId: layer.parentId ?? null,
    absolutePositioned: layer.absolutePositioned ?? false,
    readyForDev: layer.readyForDev ?? false,
    geometry: {
      x: roundNumber(layer.x),
      y: roundNumber(layer.y),
      width: roundNumber(layer.width),
      height: roundNumber(layer.height),
      rotation: roundNumber(layer.rotation),
    },
    measurements: getLayerMeasurementReport(layer, layers),
    appearance: {
      fill: getPrimaryFillValue(layer),
      fillPaints: getVisibleLayerFillPaints(layer).map((paint) => ({
        name: paint.name ?? null,
        value: paint.value,
        opacity: roundNumber(paint.opacity),
        blendMode: paint.blendMode ?? "normal",
      })),
      stroke: layer.strokeWidth > 0 ? getPrimaryStrokeValue(layer) : "none",
      strokePaints: getVisibleLayerStrokePaints(layer).map((paint) => ({
        name: paint.name ?? null,
        value: paint.value,
        opacity: roundNumber(paint.opacity),
        blendMode: paint.blendMode ?? "normal",
      })),
      strokeWidth: roundNumber(layer.strokeWidth),
      opacity: roundNumber(layer.opacity),
      blendMode: layer.blendMode ?? "normal",
      clipContent: layer.clipContent ?? false,
      mask: layer.mask
        ? {
            kind: layer.mask.kind,
            sourceName: layer.mask.sourceName ?? null,
            x: roundNumber(layer.mask.x),
            y: roundNumber(layer.mask.y),
            width: roundNumber(layer.mask.width),
            height: roundNumber(layer.mask.height),
          }
        : null,
      maskSource: layer.maskSource ?? false,
    },
  };

  if (layer.autoLayout) {
    handoff.autoLayout = {
      ...layer.autoLayout,
      childCount: getAutoLayoutChildLayers(layer, layers).length,
    };
  }

  if (layer.layoutSizing) {
    handoff.layoutSizing = getLayerSizing(layer);
  }

  if (layer.layoutGrids?.length) {
    handoff.layoutGrids = layer.layoutGrids.map(normalizeLayoutGrid);
  }

  if (layer.constraints) {
    handoff.constraints = getLayerConstraints(layer);
  }

  if (layer.componentId) {
    handoff.component = {
      componentId: layer.componentId,
      variantId: layer.componentVariantId ?? null,
      sourceLayerId: layer.componentLayerId ?? null,
      properties: layer.componentProperties ?? {},
      slot: {
        name: getComponentSlotName(layer),
        type: getComponentSlotType(layer),
      },
    };
  }

  if (layer.text !== undefined) {
    handoff.text = {
      value: layer.text,
      color: layer.textColor ?? "#ffffff",
      fontFamily: layer.fontFamily ?? "Inter, Arial, sans-serif",
      fontSize: roundNumber(layer.fontSize ?? 16),
      fontWeight: layer.fontWeight ?? 400,
      lineHeight: roundNumber(layer.lineHeight ?? 1.25),
      letterSpacing: roundNumber(layer.letterSpacing ?? 0),
      textAlign: layer.textAlign ?? "left",
      resizeMode: layer.textResizeMode ?? "fixed",
    };
  }

  if (layer.type === "image") {
    handoff.image = {
      alt: layer.imageAlt ?? layer.name,
      fit: layer.imageFit ?? "cover",
      hasSource: Boolean(layer.imageSrc),
    };
  }

  if (variableMatches.length > 0) {
    handoff.variables = variableMatches;
  }

  if (annotations.length > 0) {
    handoff.annotations = annotations;
  }

  if (devLinks.length > 0) {
    handoff.devLinks = devLinks;
  }

  if (codeConnect) {
    handoff.codeConnect = codeConnect;
  }

  if (prototype) {
    handoff.prototype = prototype;
  }

  if (layer.connector) {
    handoff.connector = {
      sourceLayerId: layer.connector.sourceLayerId,
      targetLayerId: layer.connector.targetLayerId,
      kind: layer.connector.kind,
      arrow: layer.connector.arrow,
    };
  }

  if (layer.stamp) {
    handoff.stamp = {
      kind: layer.stamp.kind,
    };
  }

  if (layer.inkPreset) {
    handoff.inkPreset = {
      kind: layer.inkPreset.kind,
      color: layer.inkPreset.color,
      width: roundNumber(layer.inkPreset.width),
      opacity: roundNumber(layer.inkPreset.opacity),
    };
  }

  return JSON.stringify(handoff, null, 2);
}

export function getLayerPrototypeReport(
  layer: DesignLayer,
  pages: DesignPage[] = [],
): LayerPrototypeReport | null {
  const prototype = layer.prototype;

  if (!prototype?.targetPageId) {
    return null;
  }

  return {
    targetPageId: prototype.targetPageId,
    targetPageName:
      pages.find((page) => page.id === prototype.targetPageId)?.name ??
      "Unknown page",
    trigger: prototype.trigger,
    action: prototype.action ?? "navigate",
    transition: prototype.transition,
    durationMs: prototype.durationMs,
    preserveScroll: prototype.preserveScroll ?? false,
    scrollBehavior:
      prototype.scrollBehavior ??
      (prototype.preserveScroll ? "preserve" : "reset"),
    overlayPosition: prototype.overlayPosition ?? "center",
    closeOnOutside: prototype.closeOnOutside ?? true,
    deviceFrame: prototype.deviceFrame ?? "none",
    smartAnimate: prototype.smartAnimate ?? false,
  };
}

export function getLayerCodeConnectReport(
  layer: DesignLayer,
): LayerCodeConnectReport | null {
  const mapping = layer.codeConnect;

  if (!mapping?.componentName.trim() || !mapping.importPath.trim()) {
    return null;
  }

  return {
    componentName: mapping.componentName.trim(),
    importPath: mapping.importPath.trim(),
    props: parseCodeConnectProps(mapping.props),
  };
}

export function getLayerCodeConnectSnippet(layer: DesignLayer) {
  const mapping = getLayerCodeConnectReport(layer);

  if (!mapping) {
    return [
      "// Add a component name and import path in Properties to generate a mapping.",
      `// Layer: ${layer.name}`,
    ].join("\n");
  }

  return [
    `import { ${mapping.componentName} } from "${mapping.importPath}";`,
    "",
    `export const ${getCodeConnectExportName(mapping.componentName)} = {`,
    `  layerId: "${escapeJsString(layer.id)}",`,
    `  layerName: "${escapeJsString(layer.name)}",`,
    `  componentName: "${escapeJsString(mapping.componentName)}",`,
    `  importPath: "${escapeJsString(mapping.importPath)}",`,
    `  props: ${JSON.stringify(mapping.props, null, 2).replace(/\n/g, "\n  ")},`,
    `  example: (props) => <${mapping.componentName} {...props} />,`,
    `};`,
  ].join("\n");
}

export function getLayerDevLinkReport(layer: DesignLayer) {
  return (layer.devLinks ?? [])
    .filter((link) => link.url.trim().length > 0)
    .map((link) => ({
      kind: link.kind,
      label: link.label || getDevLinkLabel(link.kind),
      url: link.url,
    })) satisfies LayerDevLink[];
}

export function getLayerMeasurementReport(
  layer: DesignLayer,
  layers: DesignLayer[] = [],
): LayerMeasurementReport {
  const right = layer.x + layer.width;
  const bottom = layer.y + layer.height;

  return {
    bounds: {
      x: roundNumber(layer.x),
      y: roundNumber(layer.y),
      width: roundNumber(layer.width),
      height: roundNumber(layer.height),
      right: roundNumber(right),
      bottom: roundNumber(bottom),
      centerX: roundNumber(layer.x + layer.width / 2),
      centerY: roundNumber(layer.y + layer.height / 2),
    },
    nearestSpacing: getNearestLayerSpacing(layer, layers),
  };
}

export function getLayerAnnotationReport(
  layer: DesignLayer,
  comments: DesignComment[],
) {
  return comments
    .filter((comment) => isCommentInsideLayer(comment, layer))
    .map((comment) => ({
      id: comment.id,
      text: comment.text,
      status: comment.resolved ? "resolved" : "open",
      replies: comment.replies?.length ?? 0,
      mentions: comment.mentions ?? [],
      relativeX: roundNumber(comment.x - layer.x),
      relativeY: roundNumber(comment.y - layer.y),
    })) satisfies LayerAnnotation[];
}

export function getLayerVariableReport(
  layer: DesignLayer,
  variables: Record<string, string>,
) {
  const explicitBindings = Object.entries(layer.variableBindings ?? {}).map(
    ([property, token]) => ({
      property,
      token,
      value: variables[token] ?? token,
    }),
  );
  const candidates: Array<[string, string | number | undefined]> = [
    ["fill", getPrimaryFillValue(layer)],
    ["stroke", layer.stroke],
    ["strokeWidth", layer.strokeWidth],
    ["cornerRadius", layer.cornerRadius],
    ["textColor", layer.textColor],
    ["fontSize", layer.fontSize],
    ["lineHeight", layer.lineHeight],
    ["letterSpacing", layer.letterSpacing],
    ["shadowColor", layer.shadowColor],
    ["shadowX", layer.shadowX],
    ["shadowY", layer.shadowY],
    ["shadowBlur", layer.shadowBlur],
    ["shadowSpread", layer.shadowSpread],
    ["layerBlur", layer.layerBlur],
    ["backgroundBlur", layer.backgroundBlur],
  ];

  return [
    ...explicitBindings,
    ...candidates.flatMap(([property, value]) =>
      findVariableMatches(property, value, variables),
    ),
  ];
}

export function getLayerHtmlCode(layer: DesignLayer) {
  const className = getCssClassName(layer);
  const label = escapeHtml(layer.name);
  const readyAttribute = getReadyForDevAttribute(layer);

  if (layer.type === "image") {
    return `<img class="${className}"${readyAttribute} src="${escapeHtml(
      layer.imageSrc ?? "",
    )}" alt="${escapeHtml(layer.imageAlt ?? layer.name)}" />`;
  }

  if (layer.text !== undefined) {
    return `<div class="${className}"${readyAttribute} aria-label="${label}">${escapeHtml(
      layer.text,
    )}</div>`;
  }

  return `<div class="${className}"${readyAttribute} aria-label="${label}"></div>`;
}

export function getLayerJsxCode(layer: DesignLayer) {
  const className = getCssClassName(layer);
  const label = escapeHtml(layer.name);
  const readyAttribute = getReadyForDevAttribute(layer);

  if (layer.type === "image") {
    return `<img className="${className}"${readyAttribute} src="${escapeHtml(
      layer.imageSrc ?? "",
    )}" alt="${escapeHtml(layer.imageAlt ?? layer.name)}" />`;
  }

  if (layer.text !== undefined) {
    return [
      `<div className="${className}"${readyAttribute} aria-label="${label}">`,
      `  {\`${escapeTemplateLiteral(layer.text)}\`}`,
      `</div>`,
    ].join("\n");
  }

  return `<div className="${className}"${readyAttribute} aria-label="${label}" />`;
}

export function getLayerSwiftUICode(layer: DesignLayer) {
  if (layer.text !== undefined) {
    return [
      `Text("${escapeSwiftString(layer.text)}")`,
      `  .font(.custom("${escapeSwiftString(getFontFamilyName(layer))}", size: ${formatNumber(layer.fontSize ?? 16)}))`,
      `  .fontWeight(${getSwiftUIFontWeight(layer.fontWeight ?? 400)})`,
      `  .foregroundStyle(${getSwiftUIColor(layer.textColor ?? "#ffffff")})`,
      `  .multilineTextAlignment(${getSwiftUITextAlign(layer.textAlign ?? "left")})`,
      ...getSwiftUIBackgroundModifiers(layer),
      ...getSwiftUIFrameModifiers(layer),
    ].join("\n");
  }

  if (layer.type === "image") {
    return [
      `AsyncImage(url: URL(string: "${escapeSwiftString(layer.imageSrc ?? "")}")) { image in`,
      `  image`,
      `    .resizable()`,
      `    .aspectRatio(contentMode: ${getSwiftUIImageFit(layer.imageFit ?? "cover")})`,
      `} placeholder: {`,
      `  ${getSwiftUIShape(layer)}.fill(Color.gray.opacity(0.16))`,
      `}`,
      ...getSwiftUIFrameModifiers(layer),
    ].join("\n");
  }

  return [
    `${getSwiftUIShape(layer)}`,
    `  .fill(${getSwiftUIColor(getPrimaryFillValue(layer))})`,
    ...getSwiftUIStrokeModifiers(layer),
    ...getSwiftUIFrameModifiers(layer),
  ].join("\n");
}

export function getLayerComposeCode(layer: DesignLayer) {
  if (layer.text !== undefined) {
    return [
      `Text(`,
      `  text = "${escapeKotlinString(layer.text)}",`,
      `  color = ${getComposeColor(layer.textColor ?? "#ffffff")},`,
      `  fontSize = ${formatNumber(layer.fontSize ?? 16)}.sp,`,
      `  fontWeight = FontWeight(${layer.fontWeight ?? 400}),`,
      `  textAlign = ${getComposeTextAlign(layer.textAlign ?? "left")},`,
      `  modifier = ${getComposeModifier(layer)}`,
      `)`,
    ].join("\n");
  }

  if (layer.type === "image") {
    return [
      `Box(`,
      `  modifier = ${getComposeModifier(layer)}`,
      `    .background(${getComposeColor("#d4d4d8")}, ${getComposeShape(layer)})`,
      `)`,
      `// Image source: ${layer.imageSrc ? escapeLineComment(layer.imageSrc) : "add source asset"}`,
      `// Fit: ${layer.imageFit ?? "cover"}`,
    ].join("\n");
  }

  return [
    `Box(`,
    `  modifier = ${getComposeModifier(layer)}`,
    `    .background(${getComposeColor(getPrimaryFillValue(layer))}, ${getComposeShape(layer)})${getComposeBorderModifier(layer)}`,
    `)`,
  ].join("\n");
}

function getLayerCssRules(layer: DesignLayer) {
  return [
    "position: absolute;",
    `left: ${formatPx(layer.x)};`,
    `top: ${formatPx(layer.y)};`,
    `width: ${formatPx(layer.width)};`,
    `height: ${formatPx(layer.height)};`,
    layer.rotation ? `transform: rotate(${formatNumber(layer.rotation)}deg);` : null,
    layer.opacity < 1 ? `opacity: ${formatNumber(layer.opacity)};` : null,
    getBackgroundRule(layer),
    getBorderRule(layer),
    layer.cornerRadius > 0 ? `border-radius: ${formatPx(layer.cornerRadius)};` : null,
    layer.blendMode && layer.blendMode !== "normal"
      ? `mix-blend-mode: ${layer.blendMode};`
      : null,
    getBoxShadowRule(layer),
    getFilterRule(layer),
    layer.clipContent ? "overflow: hidden;" : null,
    ...getTextRules(layer),
    ...getImageRules(layer),
  ].filter((rule): rule is string => Boolean(rule));
}

function getBackgroundRule(layer: DesignLayer) {
  const visiblePaints = getVisibleLayerFillPaints(layer);

  if (layer.type === "image" || visiblePaints.length === 0) {
    return null;
  }

  return `background: ${visiblePaints.map((paint) => paint.value).join(", ")};`;
}

function getBorderRule(layer: DesignLayer) {
  const stroke = getPrimaryStrokeValue(layer);

  if (layer.strokeWidth <= 0 || stroke === "transparent") {
    return null;
  }

  return `border: ${formatPx(layer.strokeWidth)} solid ${stroke};`;
}

function getBoxShadowRule(layer: DesignLayer) {
  if (!(layer.effectsVisible ?? true) || !layer.shadowEnabled) {
    return null;
  }

  return `box-shadow: ${formatPx(layer.shadowX ?? 0)} ${formatPx(
    layer.shadowY ?? 12,
  )} ${formatPx(layer.shadowBlur ?? 24)} ${formatPx(
    layer.shadowSpread ?? 0,
  )} ${layer.shadowColor ?? "rgb(0 0 0 / 0.24)"};`;
}

function getFilterRule(layer: DesignLayer) {
  if (!(layer.effectsVisible ?? true) || !layer.layerBlur) {
    return null;
  }

  return `filter: blur(${formatPx(layer.layerBlur)});`;
}

function getTextRules(layer: DesignLayer) {
  if (layer.text === undefined) {
    return [];
  }

  return [
    `color: ${layer.textColor ?? "#ffffff"};`,
    `font-family: ${layer.fontFamily ?? "Inter, Arial, sans-serif"};`,
    `font-size: ${formatPx(layer.fontSize ?? 16)};`,
    `font-weight: ${layer.fontWeight ?? 400};`,
    `line-height: ${formatNumber(layer.lineHeight ?? 1.25)};`,
    layer.letterSpacing
      ? `letter-spacing: ${formatPx(layer.letterSpacing)};`
      : null,
    `text-align: ${layer.textAlign ?? "left"};`,
    `white-space: ${layer.textResizeMode === "auto-width" ? "pre" : "pre-wrap"};`,
  ].filter((rule): rule is string => Boolean(rule));
}

function getImageRules(layer: DesignLayer) {
  if (layer.type !== "image") {
    return [];
  }

  return [
    layer.imageSrc ? `background-image: url("${escapeCssUrl(layer.imageSrc)}");` : null,
    "background-position: center;",
    getImageFitRule(layer),
    "background-repeat: no-repeat;",
  ].filter((rule): rule is string => Boolean(rule));
}

function getImageFitRule(layer: DesignLayer) {
  if ((layer.imageFit ?? "cover") === "fill") {
    return "background-size: 100% 100%;";
  }

  return `background-size: ${layer.imageFit ?? "cover"};`;
}

function getSwiftUIShape(layer: DesignLayer) {
  if (layer.type === "ellipse") {
    return "Ellipse()";
  }

  return `RoundedRectangle(cornerRadius: ${formatNumber(layer.cornerRadius)})`;
}

function getSwiftUIBackgroundModifiers(layer: DesignLayer) {
  const fill = getPrimaryFillValue(layer);

  if (fill === "transparent") {
    return [];
  }

  return [
    `  .background(${getSwiftUIShape(layer)}.fill(${getSwiftUIColor(fill)}))`,
  ];
}

function getSwiftUIStrokeModifiers(layer: DesignLayer) {
  if (layer.strokeWidth <= 0 || layer.stroke === "transparent") {
    return [];
  }

  return [
    `  .overlay(${getSwiftUIShape(layer)}.stroke(${getSwiftUIColor(
      layer.stroke,
    )}, lineWidth: ${formatNumber(layer.strokeWidth)}))`,
  ];
}

function getSwiftUIFrameModifiers(layer: DesignLayer) {
  return [
    `  .frame(width: ${formatNumber(layer.width)}, height: ${formatNumber(layer.height)})`,
    layer.opacity < 1 ? `  .opacity(${formatNumber(layer.opacity)})` : null,
    layer.rotation
      ? `  .rotationEffect(.degrees(${formatNumber(layer.rotation)}))`
      : null,
    `  .position(x: ${formatNumber(layer.x + layer.width / 2)}, y: ${formatNumber(
      layer.y + layer.height / 2,
    )})`,
  ].filter((modifier): modifier is string => Boolean(modifier));
}

function getSwiftUIColor(value: string) {
  const color = parseColor(value);

  if (!color) {
    return "Color.clear";
  }

  return `Color(red: ${formatNumber(color.red / 255)}, green: ${formatNumber(
    color.green / 255,
  )}, blue: ${formatNumber(color.blue / 255)}, opacity: ${formatNumber(
    color.alpha,
  )})`;
}

function getSwiftUIFontWeight(weight: number) {
  if (weight >= 800) {
    return ".heavy";
  }

  if (weight >= 700) {
    return ".bold";
  }

  if (weight >= 600) {
    return ".semibold";
  }

  if (weight >= 500) {
    return ".medium";
  }

  if (weight <= 300) {
    return ".light";
  }

  return ".regular";
}

function getSwiftUITextAlign(value: string) {
  if (value === "center") {
    return ".center";
  }

  if (value === "right") {
    return ".trailing";
  }

  return ".leading";
}

function getSwiftUIImageFit(value: string) {
  return value === "contain" ? ".fit" : ".fill";
}

function getComposeModifier(layer: DesignLayer) {
  return [
    "Modifier",
    `    .offset(x = ${formatNumber(layer.x)}.dp, y = ${formatNumber(layer.y)}.dp)`,
    `    .size(width = ${formatNumber(layer.width)}.dp, height = ${formatNumber(layer.height)}.dp)`,
    layer.rotation ? `    .rotate(${formatNumber(layer.rotation)}f)` : null,
    layer.opacity < 1 ? `    .alpha(${formatNumber(layer.opacity)}f)` : null,
  ]
    .filter((modifier): modifier is string => Boolean(modifier))
    .join("\n");
}

function getComposeShape(layer: DesignLayer) {
  if (layer.type === "ellipse") {
    return "CircleShape";
  }

  return `RoundedCornerShape(${formatNumber(layer.cornerRadius)}.dp)`;
}

function getComposeBorderModifier(layer: DesignLayer) {
  if (layer.strokeWidth <= 0 || layer.stroke === "transparent") {
    return "";
  }

  return `\n    .border(${formatNumber(layer.strokeWidth)}.dp, ${getComposeColor(
    layer.stroke,
  )}, ${getComposeShape(layer)})`;
}

function getComposeColor(value: string) {
  const color = parseColor(value);

  if (!color) {
    return "Color.Transparent";
  }

  const alpha = toHex(Math.round(color.alpha * 255));

  return `Color(0x${alpha}${toHex(color.red)}${toHex(color.green)}${toHex(
    color.blue,
  )})`;
}

function getComposeTextAlign(value: string) {
  if (value === "center") {
    return "TextAlign.Center";
  }

  if (value === "right") {
    return "TextAlign.End";
  }

  if (value === "justify") {
    return "TextAlign.Justify";
  }

  return "TextAlign.Start";
}

function getCssSelector(layer: DesignLayer) {
  return `.${getCssClassName(layer)}`;
}

function getReadyForDevAttribute(layer: DesignLayer) {
  return layer.readyForDev ? ' data-ready-for-dev="true"' : "";
}

function getCssClassName(layer: DesignLayer) {
  return (
    layer.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "design-layer"
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatPx(value: number) {
  return `${formatNumber(value)}px`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function roundNumber(value: number) {
  return Number(value.toFixed(2));
}

function findVariableMatches(
  property: string,
  value: string | number | undefined,
  variables: Record<string, string>,
) {
  if (value === undefined || value === "transparent") {
    return [];
  }

  return Object.entries(variables)
    .filter(([, variableValue]) => valuesMatchVariable(value, variableValue))
    .map(([token, variableValue]) => ({
      property,
      token,
      value: variableValue,
    }));
}

function isCommentInsideLayer(comment: DesignComment, layer: DesignLayer) {
  const left = Math.min(layer.x, layer.x + layer.width);
  const right = Math.max(layer.x, layer.x + layer.width);
  const top = Math.min(layer.y, layer.y + layer.height);
  const bottom = Math.max(layer.y, layer.y + layer.height);

  return (
    comment.x >= left &&
    comment.x <= right &&
    comment.y >= top &&
    comment.y <= bottom
  );
}

function getNearestLayerSpacing(layer: DesignLayer, layers: DesignLayer[]) {
  const siblings = layers.filter(
    (candidate) => candidate.id !== layer.id && candidate.visible,
  );
  const measurements = [
    findNearestSpacing(layer, siblings, "left"),
    findNearestSpacing(layer, siblings, "right"),
    findNearestSpacing(layer, siblings, "top"),
    findNearestSpacing(layer, siblings, "bottom"),
  ];

  return measurements.filter(
    (measurement): measurement is LayerSpacingMeasurement =>
      Boolean(measurement),
  );
}

function findNearestSpacing(
  layer: DesignLayer,
  siblings: DesignLayer[],
  side: LayerSpacingMeasurement["side"],
) {
  const candidates = siblings
    .map((sibling) => getLayerSpacing(layer, sibling, side))
    .filter(
      (measurement): measurement is LayerSpacingMeasurement =>
        Boolean(measurement),
    )
    .sort((first, second) => first.distance - second.distance);

  return candidates[0] ?? null;
}

function getLayerSpacing(
  layer: DesignLayer,
  sibling: DesignLayer,
  side: LayerSpacingMeasurement["side"],
) {
  const layerRight = layer.x + layer.width;
  const layerBottom = layer.y + layer.height;
  const siblingRight = sibling.x + sibling.width;
  const siblingBottom = sibling.y + sibling.height;

  if (side === "left") {
    if (
      siblingRight > layer.x ||
      !rangesOverlap(layer.y, layerBottom, sibling.y, siblingBottom)
    ) {
      return null;
    }

    return createSpacingMeasurement(side, sibling, layer.x - siblingRight);
  }

  if (side === "right") {
    if (
      sibling.x < layerRight ||
      !rangesOverlap(layer.y, layerBottom, sibling.y, siblingBottom)
    ) {
      return null;
    }

    return createSpacingMeasurement(side, sibling, sibling.x - layerRight);
  }

  if (side === "top") {
    if (
      siblingBottom > layer.y ||
      !rangesOverlap(layer.x, layerRight, sibling.x, siblingRight)
    ) {
      return null;
    }

    return createSpacingMeasurement(side, sibling, layer.y - siblingBottom);
  }

  if (
    sibling.y < layerBottom ||
    !rangesOverlap(layer.x, layerRight, sibling.x, siblingRight)
  ) {
    return null;
  }

  return createSpacingMeasurement(side, sibling, sibling.y - layerBottom);
}

function createSpacingMeasurement(
  side: LayerSpacingMeasurement["side"],
  layer: DesignLayer,
  distance: number,
) {
  return {
    side,
    layerId: layer.id,
    layerName: layer.name,
    distance: roundNumber(distance),
  };
}

function rangesOverlap(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number,
) {
  return firstStart < secondEnd && secondStart < firstEnd;
}

function getDevLinkLabel(kind: string) {
  if (kind === "storybook") {
    return "Storybook";
  }

  if (kind === "github") {
    return "GitHub";
  }

  if (kind === "jira") {
    return "Jira";
  }

  if (kind === "vscode") {
    return "VS Code";
  }

  if (kind === "docs") {
    return "Docs";
  }

  return kind;
}

function parseCodeConnectProps(value: string | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return {};
  }

  try {
    return JSON.parse(trimmedValue) as unknown;
  } catch {
    return { raw: trimmedValue };
  }
}

function getCodeConnectExportName(componentName: string) {
  const normalizedName =
    componentName
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .map(capitalize)
      .join("") || "Layer";

  return `${normalizedName.charAt(0).toLowerCase()}${normalizedName.slice(
    1,
  )}CodeConnect`;
}

function valuesMatchVariable(value: string | number, variableValue: string) {
  const normalizedValue = normalizeVariableValue(value);
  const normalizedVariable = normalizeVariableValue(variableValue);

  return normalizedValue !== "" && normalizedValue === normalizedVariable;
}

function normalizeVariableValue(value: string | number) {
  if (typeof value === "number") {
    return formatNumber(value);
  }

  return value.trim().toLowerCase();
}

function parseColor(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized === "transparent") {
    return { red: 0, green: 0, blue: 0, alpha: 0 };
  }

  const hex = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/);

  if (hex) {
    const raw = hex[1];
    const expanded =
      raw.length === 3
        ? raw
            .split("")
            .map((item) => item + item)
            .join("")
        : raw;

    return {
      red: Number.parseInt(expanded.slice(0, 2), 16),
      green: Number.parseInt(expanded.slice(2, 4), 16),
      blue: Number.parseInt(expanded.slice(4, 6), 16),
      alpha:
        expanded.length === 8
          ? Number.parseInt(expanded.slice(6, 8), 16) / 255
          : 1,
    };
  }

  const rgb = normalized.match(
    /^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\)$/,
  );

  if (rgb) {
    return {
      red: clampColor(Number(rgb[1])),
      green: clampColor(Number(rgb[2])),
      blue: clampColor(Number(rgb[3])),
      alpha: rgb[4] ? Math.min(1, Math.max(0, Number(rgb[4]))) : 1,
    };
  }

  return null;
}

function clampColor(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function toHex(value: number) {
  return clampColor(value).toString(16).padStart(2, "0").toUpperCase();
}

function getFontFamilyName(layer: DesignLayer) {
  return (layer.fontFamily ?? "Inter").split(",")[0]?.trim() || "Inter";
}

function escapeCssUrl(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function escapeJsString(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function escapeSwiftString(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n");
}

function escapeKotlinString(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n");
}

function escapeLineComment(value: string) {
  return value.replaceAll("\n", " ").replaceAll("\r", " ");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeTemplateLiteral(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("${", "\\${");
}
