import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-document-utils-ts-1de3e47e0f5b178c.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-editor-paint-stack-ts-4d3d558a3fdd301f.mjs";
export const dxSourceText = "import { getActivePage } from \"@/features/editor/document-utils\";\nimport {\n  getPrimaryFillValue,\n  getPrimaryStrokeValue,\n} from \"@/features/editor/paint-stack\";\nimport type {\n  DesignDocument,\n  DesignLayer,\n  DesignPage,\n} from \"@/features/editor/types\";\n\nexport type PageSvgFrame = {\n  svg: string;\n  bounds: {\n    x: number;\n    y: number;\n    width: number;\n    height: number;\n  };\n};\n\nexport function exportDocumentToSvg(document: DesignDocument) {\n  return exportPageToSvg(getActivePage(document));\n}\n\nexport function exportPageToSvg(page: DesignPage) {\n  return exportPageToSvgFrame(page).svg;\n}\n\nexport function exportPageToSvgFrame(page: DesignPage): PageSvgFrame {\n  const visibleLayers = page.layers.filter((layer) => layer.visible);\n  const bounds = getBounds(visibleLayers);\n  const width = Math.max(1, bounds.width);\n  const height = Math.max(1, bounds.height);\n\n  const svg = [\n    `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${width}\" height=\"${height}\" viewBox=\"${bounds.x} ${bounds.y} ${width} ${height}\">`,\n    `<rect x=\"${bounds.x}\" y=\"${bounds.y}\" width=\"${width}\" height=\"${height}\" fill=\"${escapeAttribute(page.background)}\"/>`,\n    ...visibleLayers.map(layerToSvg),\n    \"</svg>\",\n  ].join(\"\");\n\n  return {\n    svg,\n    bounds: {\n      ...bounds,\n      width,\n      height,\n    },\n  };\n}\n\nexport function exportLayerToSvg(layer: DesignLayer) {\n  const padding = getLayerExportPadding(layer);\n  const width = Math.max(1, Math.ceil(layer.width + padding * 2));\n  const height = Math.max(1, Math.ceil(layer.height + padding * 2));\n\n  return [\n    `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${width}\" height=\"${height}\" viewBox=\"${layer.x - padding} ${layer.y - padding} ${width} ${height}\">`,\n    layerToSvg(layer),\n    \"</svg>\",\n  ].join(\"\");\n}\n\nfunction getBounds(layers: DesignLayer[]) {\n  if (layers.length === 0) {\n    return { x: 0, y: 0, width: 1200, height: 800 };\n  }\n\n  const minX = Math.min(...layers.map((layer) => layer.x));\n  const minY = Math.min(...layers.map((layer) => layer.y));\n  const maxX = Math.max(...layers.map((layer) => layer.x + layer.width));\n  const maxY = Math.max(...layers.map((layer) => layer.y + layer.height));\n  const padding = 48;\n\n  return {\n    x: Math.floor(minX - padding),\n    y: Math.floor(minY - padding),\n    width: Math.ceil(maxX - minX + padding * 2),\n    height: Math.ceil(maxY - minY + padding * 2),\n  };\n}\n\nfunction getLayerExportPadding(layer: DesignLayer) {\n  const rotationPadding = layer.rotation ? 48 : 0;\n  const shadowPadding = layer.shadowEnabled\n    ? Math.max(\n        Math.abs(layer.shadowX ?? 0),\n        Math.abs(layer.shadowY ?? 12),\n        layer.shadowBlur ?? 24,\n        layer.shadowSpread ?? 0,\n      )\n    : 0;\n  const blurPadding = Math.max(layer.layerBlur ?? 0, layer.backgroundBlur ?? 0);\n\n  return Math.ceil(Math.max(rotationPadding, shadowPadding, blurPadding));\n}\n\nfunction layerToSvg(layer: DesignLayer) {\n  const centerX = layer.x + layer.width / 2;\n  const centerY = layer.y + layer.height / 2;\n  const common = [\n    `opacity=\"${layer.opacity}\"`,\n    getStrokeAttributes(layer),\n    getStyleAttribute(layer),\n    `transform=\"rotate(${layer.rotation} ${centerX} ${centerY})\"`,\n  ].join(\" \");\n\n  if (layer.type === \"ellipse\") {\n    return withLayerMask(\n      layer,\n      `<ellipse cx=\"${layer.x + layer.width / 2}\" cy=\"${layer.y + layer.height / 2}\" rx=\"${layer.width / 2}\" ry=\"${layer.height / 2}\" fill=\"${escapeAttribute(getPrimaryFillValue(layer))}\" ${common}/>`,\n    );\n  }\n\n  if (layer.type === \"image\" && layer.imageSrc) {\n    const strokeRect =\n      layer.strokeWidth > 0 && layer.stroke !== \"transparent\"\n        ? `<rect x=\"${layer.x}\" y=\"${layer.y}\" width=\"${layer.width}\" height=\"${layer.height}\" rx=\"${layer.cornerRadius}\" fill=\"transparent\" ${getStrokeAttributes(layer)}/>`\n        : \"\";\n\n    return withLayerMask(\n      layer,\n      [\n        `<g opacity=\"${layer.opacity}\" ${getStyleAttribute(layer)} transform=\"rotate(${layer.rotation} ${centerX} ${centerY})\">`,\n        `<image href=\"${escapeAttribute(layer.imageSrc)}\" x=\"${layer.x}\" y=\"${layer.y}\" width=\"${layer.width}\" height=\"${layer.height}\" preserveAspectRatio=\"${getImagePreserveAspectRatio(layer)}\"/>`,\n        strokeRect,\n        \"</g>\",\n      ].join(\"\"),\n    );\n  }\n\n  if (layer.type === \"path\" && layer.pathData) {\n    const box = layer.pathViewBox ?? {\n      x: layer.x,\n      y: layer.y,\n      width: layer.width,\n      height: layer.height,\n    };\n    const viewBox = [\n      box.x,\n      box.y,\n      Math.max(1, box.width),\n      Math.max(1, box.height),\n    ].join(\" \");\n\n    return withLayerMask(\n      layer,\n      [\n        `<g opacity=\"${layer.opacity}\" ${getStyleAttribute(layer)} transform=\"rotate(${layer.rotation} ${centerX} ${centerY})\">`,\n        `<svg x=\"${layer.x}\" y=\"${layer.y}\" width=\"${layer.width}\" height=\"${layer.height}\" viewBox=\"${viewBox}\" preserveAspectRatio=\"none\" overflow=\"${layer.clipContent ? \"hidden\" : \"visible\"}\">`,\n        `<path d=\"${escapeAttribute(layer.pathData)}\" fill=\"${escapeAttribute(getPrimaryFillValue(layer))}\" fill-rule=\"${layer.fillRule ?? \"nonzero\"}\" clip-rule=\"${layer.fillRule ?? \"nonzero\"}\" ${getStrokeAttributes(layer)}/>`,\n        \"</svg>\",\n        \"</g>\",\n      ].join(\"\"),\n    );\n  }\n\n  if (layer.text !== undefined) {\n    return withLayerMask(layer, textLayerToSvg(layer, common));\n  }\n\n  return withLayerMask(\n    layer,\n    `<rect x=\"${layer.x}\" y=\"${layer.y}\" width=\"${layer.width}\" height=\"${layer.height}\" rx=\"${layer.cornerRadius}\" fill=\"${escapeAttribute(getPrimaryFillValue(layer))}\" ${common}/>`,\n  );\n}\n\nfunction withLayerMask(layer: DesignLayer, svg: string) {\n  if (!layer.mask) {\n    return svg;\n  }\n\n  const clipId = `mask-${escapeAttribute(layer.id)}`;\n\n  return [\n    `<defs><clipPath id=\"${clipId}\" clipPathUnits=\"userSpaceOnUse\">${maskToSvg(layer)}</clipPath></defs>`,\n    `<g clip-path=\"url(#${clipId})\">`,\n    svg,\n    \"</g>\",\n  ].join(\"\");\n}\n\nfunction maskToSvg(layer: DesignLayer) {\n  const mask = layer.mask;\n\n  if (!mask) {\n    return \"\";\n  }\n\n  if (mask.kind === \"ellipse\") {\n    const cx = layer.x + mask.x + mask.width / 2;\n    const cy = layer.y + mask.y + mask.height / 2;\n\n    return `<ellipse cx=\"${cx}\" cy=\"${cy}\" rx=\"${mask.width / 2}\" ry=\"${mask.height / 2}\"/>`;\n  }\n\n  if (mask.kind === \"path\" && mask.pathData) {\n    return `<path d=\"${escapeAttribute(mask.pathData)}\" transform=\"translate(${layer.x} ${layer.y})\"/>`;\n  }\n\n  return `<rect x=\"${layer.x + mask.x}\" y=\"${layer.y + mask.y}\" width=\"${mask.width}\" height=\"${mask.height}\" rx=\"${mask.cornerRadius ?? 0}\"/>`;\n}\n\nfunction getStrokeAttributes(layer: DesignLayer) {\n  const stroke = getPrimaryStrokeValue(layer);\n  const attributes = [\n    `stroke=\"${escapeAttribute(stroke)}\"`,\n    `stroke-width=\"${layer.strokeWidth}\"`,\n    `stroke-linecap=\"${layer.strokeLineCap ?? \"butt\"}\"`,\n    `stroke-linejoin=\"${layer.strokeLineJoin ?? \"miter\"}\"`,\n  ];\n  const dash = layer.strokeDash?.trim();\n\n  if (dash) {\n    attributes.push(`stroke-dasharray=\"${escapeAttribute(dash)}\"`);\n  }\n\n  return attributes.join(\" \");\n}\n\nfunction getImagePreserveAspectRatio(layer: DesignLayer) {\n  if (layer.imageFit === \"contain\") {\n    return \"xMidYMid meet\";\n  }\n\n  if (layer.imageFit === \"fill\") {\n    return \"none\";\n  }\n\n  return \"xMidYMid slice\";\n}\n\nfunction textLayerToSvg(layer: DesignLayer, common: string) {\n  const fontSize = layer.fontSize ?? 16;\n  const lineHeight = fontSize * (layer.lineHeight ?? 1.25);\n  const x = getTextX(layer);\n  const lines = (layer.text ?? \"\").split(/\\r?\\n/);\n\n  return [\n    `<g ${common}>`,\n    `<rect x=\"${layer.x}\" y=\"${layer.y}\" width=\"${layer.width}\" height=\"${layer.height}\" rx=\"${layer.cornerRadius}\" fill=\"${escapeAttribute(getPrimaryFillValue(layer))}\"/>`,\n    `<text x=\"${x}\" y=\"${layer.y + 12 + fontSize}\" fill=\"${escapeAttribute(layer.textColor ?? \"#ffffff\")}\" font-size=\"${fontSize}\" font-weight=\"${layer.fontWeight ?? 400}\" font-family=\"${escapeAttribute(layer.fontFamily ?? \"Inter, Arial, sans-serif\")}\" letter-spacing=\"${layer.letterSpacing ?? 0}\" text-anchor=\"${getTextAnchor(layer)}\">`,\n    ...lines.map(\n      (line, index) =>\n        `<tspan x=\"${x}\" dy=\"${index === 0 ? 0 : lineHeight}\">${escapeText(line)}</tspan>`,\n    ),\n    \"</text>\",\n    \"</g>\",\n  ].join(\"\");\n}\n\nfunction getTextX(layer: DesignLayer) {\n  if (layer.textAlign === \"center\") {\n    return layer.x + layer.width / 2;\n  }\n\n  if (layer.textAlign === \"right\") {\n    return layer.x + layer.width - 12;\n  }\n\n  return layer.x + 12;\n}\n\nfunction getTextAnchor(layer: DesignLayer) {\n  if (layer.textAlign === \"center\") {\n    return \"middle\";\n  }\n\n  if (layer.textAlign === \"right\") {\n    return \"end\";\n  }\n\n  return \"start\";\n}\n\nfunction getStyleAttribute(layer: DesignLayer) {\n  const filters = [];\n\n  if (layer.shadowEnabled) {\n    filters.push(\n      `drop-shadow(${layer.shadowX ?? 0}px ${layer.shadowY ?? 12}px ${layer.shadowBlur ?? 24}px ${layer.shadowColor ?? \"rgb(0 0 0 / 0.24)\"})`,\n    );\n  }\n\n  if ((layer.layerBlur ?? 0) > 0) {\n    filters.push(`blur(${layer.layerBlur}px)`);\n  }\n\n  return filters.length > 0\n    ? `style=\"filter: ${escapeAttribute(filters.join(\" \"))}\"`\n    : \"\";\n}\n\nfunction escapeAttribute(value: string) {\n  return value\n    .replaceAll(\"&\", \"&amp;\")\n    .replaceAll('\"', \"&quot;\")\n    .replaceAll(\"<\", \"&lt;\")\n    .replaceAll(\">\", \"&gt;\");\n}\n\nfunction escapeText(value: string) {\n  return value\n    .replaceAll(\"&\", \"&amp;\")\n    .replaceAll(\"<\", \"&lt;\")\n    .replaceAll(\">\", \"&gt;\");\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/exporters/svg-exporter.ts",
  "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-features-editor-exporters-svg-exporter-ts-efc4c8cf16561b46.mjs",
  "kind": "ts",
  "hash": "efc4c8cf16561b46",
  "dependencies": [
    {
      "specifier": "@/features/editor/document-utils",
      "resolved_path": "src/features/editor/document-utils.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-features-editor-document-utils-ts-1de3e47e0f5b178c.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/paint-stack",
      "resolved_path": "src/features/editor/paint-stack.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-features-editor-paint-stack-ts-4d3d558a3fdd301f.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    }
  ],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/exporters/svg-exporter.ts",
    "source_kind": "ts",
    "parser_backend": "oxc-parser",
    "diagnostics": 0,
    "compatibility_reference": {
      "upstream_crates": [
        "turbopack-ecmascript"
      ],
      "reference_only": true,
      "runtime_build_adoption": false,
      "public_runtime_dependency": false,
      "vendor_root": "vendor/next-rust",
      "vendor_commit": "f3f56ecec2f3f8cefa0f0a1323ea406740251d5c",
      "next_transform_references": [
        "next-custom-transforms::track_dynamic_imports",
        "next-custom-transforms::react_server_components"
      ],
      "copied_code": false
    },
    "output_model": {
      "contract": "dx.www.moduleGraph",
      "compiler_owns_output": true,
      "public_architecture": "DX-owned source graph analysis"
    },
    "runtime_boundaries": {
      "next_runtime_required": false,
      "react_runtime_required": false,
      "rsc_required": false,
      "node_modules_required": false
    },
    "directives": [],
    "static_imports": [
      {
        "specifier": "@/features/editor/document-utils",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/paint-stack",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/types",
        "side_effect_only": false,
        "type_only": true
      }
    ],
    "dynamic_imports": [],
    "unresolved_dynamic_imports": [],
    "unsupported_dynamic_imports": [],
    "dynamic_import_analysis": {
      "status": "none-observed",
      "static_count": 0,
      "unresolved_count": 0,
      "unsupported_count": 0,
      "boundary": "source-owned dynamic import analysis; static specifiers become evidence, expressions remain unresolved, and unsupported call forms stay as adapter-boundary receipts"
    },
    "export_names": [
      "exportDocumentToSvg",
      "exportPageToSvg",
      "exportPageToSvgFrame",
      "exportLayerToSvg"
    ],
    "jsx": true,
    "top_level_await": false,
    "full_nextjs_parity": false,
    "analysis_boundary": "Uses vendored Turbopack ECMAScript and selected Next transform behavior as compatibility references while emitting DX-owned source graph receipts."
  },
  "node_modules_required": false
});
export const dxRuntimeModule = Object.freeze({
  transformed: false,
  transformKind: "metadata-only",
  exportNames: []
});
export const dxRuntimeExports = Object.freeze({});
export const dxLinkedDependencies = Object.freeze([dep0, dep1]);
export default dxSourceModule;
