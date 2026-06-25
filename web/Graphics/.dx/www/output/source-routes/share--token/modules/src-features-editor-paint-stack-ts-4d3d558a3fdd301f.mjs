import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-lib-forge-utils-nanoid-ts-eb21cd53da2dc635.mjs";
export const dxSourceText = "import { nanoid } from \"nanoid\";\nimport type { DesignLayer, DesignPaint } from \"@/features/editor/types\";\n\nconst defaultPaintBlendMode = \"normal\";\n\nexport function createLayerPaint(\n  value: string,\n  options: Partial<Omit<DesignPaint, \"id\" | \"value\">> = {},\n): DesignPaint {\n  return {\n    id: nanoid(),\n    name: options.name,\n    value,\n    visible: options.visible ?? true,\n    opacity: clampPaintOpacity(options.opacity ?? 1),\n    blendMode: options.blendMode ?? defaultPaintBlendMode,\n  };\n}\n\nexport function getLayerFillPaints(layer: DesignLayer): DesignPaint[] {\n  const paints = layer.fillPaints?.length\n    ? layer.fillPaints\n    : [\n        {\n          id: \"legacy-fill\",\n          value: layer.fill,\n          visible: true,\n          opacity: 1,\n          blendMode: layer.blendMode ?? defaultPaintBlendMode,\n        },\n      ];\n\n  return paints.map(normalizeLayerPaint);\n}\n\nexport function getLayerStrokePaints(layer: DesignLayer): DesignPaint[] {\n  const paints = layer.strokePaints?.length\n    ? layer.strokePaints\n    : [\n        {\n          id: \"legacy-stroke\",\n          value: layer.stroke,\n          visible: true,\n          opacity: 1,\n          blendMode: \"normal\",\n        },\n      ];\n\n  return paints.map(normalizeLayerPaint);\n}\n\nexport function getVisibleLayerFillPaints(layer: DesignLayer) {\n  return getLayerFillPaints(layer).filter(\n    (paint) => paint.visible && paint.opacity > 0 && paint.value !== \"transparent\",\n  );\n}\n\nexport function getVisibleLayerStrokePaints(layer: DesignLayer) {\n  if (layer.strokeWidth <= 0) {\n    return [];\n  }\n\n  return getLayerStrokePaints(layer).filter(\n    (paint) => paint.visible && paint.opacity > 0 && paint.value !== \"transparent\",\n  );\n}\n\nexport function getPrimaryFillValue(layer: DesignLayer) {\n  return getVisibleLayerFillPaints(layer)[0]?.value ?? \"transparent\";\n}\n\nexport function getPrimaryFillBlendMode(layer: DesignLayer) {\n  return getVisibleLayerFillPaints(layer)[0]?.blendMode ?? \"normal\";\n}\n\nexport function getPrimaryStrokeValue(layer: DesignLayer) {\n  return getVisibleLayerStrokePaints(layer)[0]?.value ?? \"transparent\";\n}\n\nexport function getFillPaintLayerPatch(paints: DesignPaint[]): Partial<DesignLayer> {\n  const normalizedPaints = paints.map(normalizeLayerPaint);\n  const primaryPaint =\n    normalizedPaints.find((paint) => paint.visible && paint.opacity > 0) ??\n    normalizedPaints[0];\n\n  return {\n    fillPaints: normalizedPaints,\n    fill: primaryPaint?.value ?? \"transparent\",\n    blendMode: primaryPaint?.blendMode ?? \"normal\",\n  };\n}\n\nexport function getStrokePaintLayerPatch(\n  paints: DesignPaint[],\n): Partial<DesignLayer> {\n  const normalizedPaints = paints.map(normalizeLayerPaint);\n  const primaryPaint =\n    normalizedPaints.find((paint) => paint.visible && paint.opacity > 0) ??\n    normalizedPaints[0];\n\n  return {\n    strokePaints: normalizedPaints,\n    stroke: primaryPaint?.value ?? \"transparent\",\n  };\n}\n\nexport function getPrimaryFillPaintPatch(\n  layer: DesignLayer,\n  patch: Partial<Pick<DesignPaint, \"value\" | \"blendMode\">>,\n): Partial<DesignLayer> {\n  const paints = getLayerFillPaints(layer);\n  const targetIndex = Math.max(\n    0,\n    paints.findIndex((paint) => paint.visible && paint.opacity > 0),\n  );\n  const nextPaints = paints.map((paint, index) =>\n    index === targetIndex\n      ? {\n          ...paint,\n          ...patch,\n        }\n      : paint,\n  );\n\n  return getFillPaintLayerPatch(nextPaints);\n}\n\nexport function getPrimaryStrokePaintPatch(\n  layer: DesignLayer,\n  patch: Partial<Pick<DesignPaint, \"value\" | \"blendMode\">>,\n): Partial<DesignLayer> {\n  const paints = getLayerStrokePaints(layer);\n  const targetIndex = Math.max(\n    0,\n    paints.findIndex((paint) => paint.visible && paint.opacity > 0),\n  );\n  const nextPaints = paints.map((paint, index) =>\n    index === targetIndex\n      ? {\n          ...paint,\n          ...patch,\n        }\n      : paint,\n  );\n\n  return getStrokePaintLayerPatch(nextPaints);\n}\n\nexport function getPaintStackSignature(paints: DesignPaint[] | undefined) {\n  if (!paints?.length) {\n    return \"\";\n  }\n\n  return paints\n    .map((paint) => {\n      const normalized = normalizeLayerPaint(paint);\n\n      return [\n        normalized.visible ? \"on\" : \"off\",\n        normalized.value,\n        normalized.opacity.toFixed(2),\n        normalized.blendMode ?? \"normal\",\n      ].join(\":\");\n    })\n    .join(\"|\");\n}\n\nexport function normalizeLayerPaint(paint: DesignPaint): DesignPaint {\n  return {\n    id: paint.id || nanoid(),\n    name: paint.name,\n    value: paint.value || \"transparent\",\n    visible: paint.visible ?? true,\n    opacity: clampPaintOpacity(paint.opacity ?? 1),\n    blendMode: paint.blendMode ?? defaultPaintBlendMode,\n  };\n}\n\nexport function setLinearGradientStop(\n  value: string,\n  stopIndex: number,\n  color: string,\n  position: number,\n) {\n  const gradient = parseLinearGradient(value);\n\n  if (!gradient || !gradient.stops[stopIndex]) {\n    return value;\n  }\n\n  const stops = gradient.stops.map((stop, index) =>\n    index === stopIndex\n      ? {\n          color,\n          position: clampStopPosition(position),\n        }\n      : stop,\n  );\n\n  return stringifyLinearGradient(gradient.angle, stops);\n}\n\nexport function parseLinearGradient(value: string) {\n  const match = value.match(/^linear-gradient\\((.+)\\)$/i);\n\n  if (!match?.[1]) {\n    return null;\n  }\n\n  const parts = splitGradientParts(match[1]);\n  const anglePart = parts[0]?.trim() ?? \"90deg\";\n  const angleMatch = anglePart.match(/^(-?\\d+(?:\\.\\d+)?)deg$/i);\n  const angle = angleMatch ? Number.parseFloat(angleMatch[1]) : 90;\n  const stopParts = angleMatch ? parts.slice(1) : parts;\n  const stops = stopParts\n    .map(parseGradientStop)\n    .filter((stop): stop is { color: string; position: number } =>\n      Boolean(stop),\n    );\n\n  return stops.length >= 2\n    ? {\n        angle,\n        stops,\n      }\n    : null;\n}\n\nfunction stringifyLinearGradient(\n  angle: number,\n  stops: Array<{ color: string; position: number }>,\n) {\n  const stopText = stops\n    .map((stop) => `${stop.color} ${clampStopPosition(stop.position)}%`)\n    .join(\", \");\n\n  return `linear-gradient(${Math.round(angle)}deg, ${stopText})`;\n}\n\nfunction parseGradientStop(part: string) {\n  const trimmed = part.trim();\n  const match = trimmed.match(/^(.+?)\\s+(-?\\d+(?:\\.\\d+)?)%$/);\n\n  if (!match?.[1] || !match[2]) {\n    return {\n      color: trimmed,\n      position: 0,\n    };\n  }\n\n  return {\n    color: match[1].trim(),\n    position: clampStopPosition(Number.parseFloat(match[2])),\n  };\n}\n\nfunction splitGradientParts(value: string) {\n  const parts: string[] = [];\n  let depth = 0;\n  let current = \"\";\n\n  for (const character of value) {\n    if (character === \"(\") {\n      depth += 1;\n    }\n\n    if (character === \")\") {\n      depth -= 1;\n    }\n\n    if (character === \",\" && depth === 0) {\n      parts.push(current);\n      current = \"\";\n      continue;\n    }\n\n    current += character;\n  }\n\n  if (current.trim()) {\n    parts.push(current);\n  }\n\n  return parts;\n}\n\nfunction clampPaintOpacity(value: number) {\n  if (!Number.isFinite(value)) {\n    return 1;\n  }\n\n  return Math.min(1, Math.max(0, value));\n}\n\nfunction clampStopPosition(value: number) {\n  if (!Number.isFinite(value)) {\n    return 0;\n  }\n\n  return Math.min(100, Math.max(0, Math.round(value)));\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/paint-stack.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-paint-stack-ts-4d3d558a3fdd301f.mjs",
  "kind": "ts",
  "hash": "4d3d558a3fdd301f",
  "dependencies": [
    {
      "specifier": "nanoid",
      "resolved_path": "src/lib/forge/utils/nanoid.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-lib-forge-utils-nanoid-ts-eb21cd53da2dc635.mjs",
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
    "source_path": "src/features/editor/paint-stack.ts",
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
        "specifier": "nanoid",
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
      "createLayerPaint",
      "getLayerFillPaints",
      "getLayerStrokePaints",
      "getVisibleLayerFillPaints",
      "getVisibleLayerStrokePaints",
      "getPrimaryFillValue",
      "getPrimaryFillBlendMode",
      "getPrimaryStrokeValue",
      "getFillPaintLayerPatch",
      "getStrokePaintLayerPatch",
      "getPrimaryFillPaintPatch",
      "getPrimaryStrokePaintPatch",
      "getPaintStackSignature",
      "normalizeLayerPaint",
      "setLinearGradientStop",
      "parseLinearGradient"
    ],
    "jsx": false,
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
export const dxLinkedDependencies = Object.freeze([dep0]);
export default dxSourceModule;
