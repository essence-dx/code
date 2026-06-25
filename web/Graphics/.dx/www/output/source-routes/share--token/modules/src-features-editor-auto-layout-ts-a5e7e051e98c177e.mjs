
export const dxSourceText = "import type {\n  DesignAutoLayout,\n  DesignAutoLayoutAlignment,\n  DesignAutoLayoutMode,\n  DesignAutoLayoutWrap,\n  DesignLayoutSizing,\n  DesignLayoutSizingMode,\n  DesignLayer,\n} from \"@/features/editor/types\";\n\nexport type AutoLayoutLayerPatch = {\n  layerId: string;\n  patch: Partial<DesignLayer>;\n};\n\nexport const defaultAutoLayout: DesignAutoLayout = {\n  mode: \"horizontal\",\n  gap: 16,\n  paddingX: 24,\n  paddingY: 24,\n  align: \"start\",\n  wrap: \"nowrap\",\n};\n\nexport const defaultLayoutSizing: DesignLayoutSizing = {\n  horizontal: \"fixed\",\n  vertical: \"fixed\",\n};\n\nexport const autoLayoutModeOptions = [\n  { value: \"none\", label: \"None\" },\n  { value: \"horizontal\", label: \"Horizontal\" },\n  { value: \"vertical\", label: \"Vertical\" },\n] satisfies Array<{ value: DesignAutoLayoutMode | \"none\"; label: string }>;\n\nexport const autoLayoutAlignmentOptions = [\n  { value: \"start\", label: \"Start\" },\n  { value: \"center\", label: \"Center\" },\n  { value: \"end\", label: \"End\" },\n  { value: \"stretch\", label: \"Stretch\" },\n] satisfies Array<{ value: DesignAutoLayoutAlignment; label: string }>;\n\nexport const autoLayoutWrapOptions = [\n  { value: \"nowrap\", label: \"No wrap\" },\n  { value: \"wrap\", label: \"Wrap\" },\n] satisfies Array<{ value: DesignAutoLayoutWrap; label: string }>;\n\nexport const layoutSizingOptions = [\n  { value: \"fixed\", label: \"Fixed\" },\n  { value: \"hug\", label: \"Hug\" },\n  { value: \"fill\", label: \"Fill\" },\n] satisfies Array<{ value: DesignLayoutSizingMode; label: string }>;\n\nexport function getAutoLayoutChildLayers(\n  frame: DesignLayer,\n  layers: DesignLayer[],\n) {\n  const layout = frame.autoLayout;\n\n  if (frame.type !== \"frame\" || !layout) {\n    return [];\n  }\n\n  const ownedChildren = layers.filter((layer) =>\n    isOwnedAutoLayoutChild(frame, layer),\n  );\n  const children =\n    ownedChildren.length > 0\n      ? ownedChildren\n      : layers.filter((layer) => isContainedAutoLayoutChild(frame, layer));\n\n  return sortAutoLayoutChildren(children, layout.mode);\n}\n\nexport function createAutoLayoutParentPatches(\n  frame: DesignLayer,\n  layers: DesignLayer[],\n): AutoLayoutLayerPatch[] {\n  if (frame.type !== \"frame\") {\n    return [];\n  }\n\n  return layers\n    .filter((layer) => isContainedAutoLayoutChild(frame, layer))\n    .filter((layer) => layer.parentId !== frame.id)\n    .map((layer) => ({\n      layerId: layer.id,\n      patch: { parentId: frame.id, absolutePositioned: undefined },\n    }));\n}\n\nexport function createAutoLayoutLayerPatches(\n  frame: DesignLayer,\n  layers: DesignLayer[],\n): AutoLayoutLayerPatch[] {\n  const layout = frame.autoLayout;\n\n  if (frame.type !== \"frame\" || !layout) {\n    return [];\n  }\n\n  const children = getAutoLayoutChildLayers(frame, layers);\n  const innerWidth = Math.max(1, frame.width - layout.paddingX * 2);\n  const innerHeight = Math.max(1, frame.height - layout.paddingY * 2);\n\n  if ((layout.wrap ?? \"nowrap\") === \"wrap\") {\n    return createWrappedAutoLayoutLayerPatches(\n      frame,\n      children,\n      layout,\n      innerWidth,\n      innerHeight,\n    );\n  }\n\n  const frameSizing = getLayerSizing(frame);\n  const mainAxis = layout.mode === \"horizontal\" ? \"horizontal\" : \"vertical\";\n  const crossAxis = layout.mode === \"horizontal\" ? \"vertical\" : \"horizontal\";\n  const mainFillSize =\n    frameSizing[mainAxis] === \"hug\"\n      ? null\n      : getFillChildSize(children, mainAxis, layout.gap, layout.mode === \"horizontal\" ? innerWidth : innerHeight);\n  let cursor =\n    layout.mode === \"horizontal\" ? frame.x + layout.paddingX : frame.y + layout.paddingY;\n\n  const patches = children.map((child) => {\n    const patch: Partial<DesignLayer> = {};\n    const childSizing = getLayerSizing(child);\n    const childWidth =\n      childSizing.horizontal === \"fill\" && mainAxis === \"horizontal\" && mainFillSize !== null\n        ? mainFillSize\n        : child.width;\n    const childHeight =\n      childSizing.vertical === \"fill\" && mainAxis === \"vertical\" && mainFillSize !== null\n        ? mainFillSize\n        : child.height;\n\n    if (layout.mode === \"horizontal\") {\n      patch.x = Math.round(cursor);\n      patch.y = Math.round(\n        getCrossAxisPosition(frame.y, innerHeight, layout.paddingY, childHeight, layout.align),\n      );\n\n      if (layout.align === \"stretch\" || childSizing[crossAxis] === \"fill\") {\n        patch.height = innerHeight;\n      }\n\n      if (childSizing[mainAxis] === \"fill\" && mainFillSize !== null) {\n        patch.width = childWidth;\n      }\n\n      cursor += childWidth + layout.gap;\n    } else {\n      patch.x = Math.round(\n        getCrossAxisPosition(frame.x, innerWidth, layout.paddingX, childWidth, layout.align),\n      );\n      patch.y = Math.round(cursor);\n\n      if (layout.align === \"stretch\" || childSizing[crossAxis] === \"fill\") {\n        patch.width = innerWidth;\n      }\n\n      if (childSizing[mainAxis] === \"fill\" && mainFillSize !== null) {\n        patch.height = childHeight;\n      }\n\n      cursor += childHeight + layout.gap;\n    }\n\n    return {\n      layerId: child.id,\n      patch,\n    };\n  });\n\n  const framePatch = getHugFramePatch(frame, children, layout);\n\n  return framePatch ? [...patches, { layerId: frame.id, patch: framePatch }] : patches;\n}\n\nexport function getAutoLayoutSignature(layer: DesignLayer) {\n  const layout = layer.autoLayout;\n\n  if (!layout) {\n    return \"\";\n  }\n\n  return [\n    layout.mode,\n    layout.gap,\n    layout.paddingX,\n    layout.paddingY,\n    layout.align,\n    layout.wrap ?? \"nowrap\",\n  ].join(\":\");\n}\n\nexport function getLayoutSizingSignature(layer: DesignLayer) {\n  const sizing = getLayerSizing(layer);\n\n  return `${sizing.horizontal}:${sizing.vertical}`;\n}\n\nexport function getLayerSizing(layer: DesignLayer): DesignLayoutSizing {\n  return {\n    ...defaultLayoutSizing,\n    ...layer.layoutSizing,\n  };\n}\n\nfunction getFillChildSize(\n  children: DesignLayer[],\n  axis: keyof DesignLayoutSizing,\n  gap: number,\n  availableSize: number,\n) {\n  const fillChildren = children.filter(\n    (child) => getLayerSizing(child)[axis] === \"fill\",\n  );\n\n  if (fillChildren.length === 0) {\n    return null;\n  }\n\n  const fixedSize = children\n    .filter((child) => getLayerSizing(child)[axis] !== \"fill\")\n    .reduce((total, child) => total + getLayerAxisSize(child, axis), 0);\n  const totalGap = Math.max(0, children.length - 1) * gap;\n  const remainingSize = Math.max(1, availableSize - fixedSize - totalGap);\n\n  return Math.max(1, remainingSize / fillChildren.length);\n}\n\ntype WrappedAutoLayoutItem = {\n  layer: DesignLayer;\n  mainSize: number;\n  crossSize: number;\n};\n\ntype WrappedAutoLayoutLine = {\n  items: WrappedAutoLayoutItem[];\n  mainSize: number;\n  crossSize: number;\n};\n\nfunction createWrappedAutoLayoutLayerPatches(\n  frame: DesignLayer,\n  children: DesignLayer[],\n  layout: DesignAutoLayout,\n  innerWidth: number,\n  innerHeight: number,\n) {\n  const mainAxis = layout.mode === \"horizontal\" ? \"horizontal\" : \"vertical\";\n  const crossAxis = layout.mode === \"horizontal\" ? \"vertical\" : \"horizontal\";\n  const availableMain = layout.mode === \"horizontal\" ? innerWidth : innerHeight;\n  const lines = createWrappedAutoLayoutLines(\n    children,\n    mainAxis,\n    availableMain,\n    layout.gap,\n  );\n  const mainStart =\n    layout.mode === \"horizontal\" ? frame.x + layout.paddingX : frame.y + layout.paddingY;\n  let crossCursor =\n    layout.mode === \"horizontal\" ? frame.y + layout.paddingY : frame.x + layout.paddingX;\n  const patches: AutoLayoutLayerPatch[] = [];\n\n  for (const line of lines) {\n    let mainCursor = mainStart;\n\n    for (const item of line.items) {\n      const sizing = getLayerSizing(item.layer);\n      const patch: Partial<DesignLayer> = {};\n      const shouldStretchCross =\n        layout.align === \"stretch\" || sizing[crossAxis] === \"fill\";\n      const crossSize = shouldStretchCross ? line.crossSize : item.crossSize;\n      const crossPosition = getLineCrossAxisPosition(\n        crossCursor,\n        line.crossSize,\n        crossSize,\n        layout.align,\n      );\n\n      if (layout.mode === \"horizontal\") {\n        patch.x = Math.round(mainCursor);\n        patch.y = Math.round(crossPosition);\n\n        if (shouldStretchCross) {\n          patch.height = Math.round(crossSize);\n        }\n      } else {\n        patch.x = Math.round(crossPosition);\n        patch.y = Math.round(mainCursor);\n\n        if (shouldStretchCross) {\n          patch.width = Math.round(crossSize);\n        }\n      }\n\n      patches.push({ layerId: item.layer.id, patch });\n      mainCursor += item.mainSize + layout.gap;\n    }\n\n    crossCursor += line.crossSize + layout.gap;\n  }\n\n  const framePatch = getWrappedHugFramePatch(frame, lines, layout);\n\n  return framePatch ? [...patches, { layerId: frame.id, patch: framePatch }] : patches;\n}\n\nfunction createWrappedAutoLayoutLines(\n  children: DesignLayer[],\n  mainAxis: keyof DesignLayoutSizing,\n  availableMain: number,\n  gap: number,\n) {\n  const lines: WrappedAutoLayoutLine[] = [];\n  let currentLine: WrappedAutoLayoutLine = {\n    items: [],\n    mainSize: 0,\n    crossSize: 0,\n  };\n\n  for (const layer of children) {\n    const item: WrappedAutoLayoutItem = {\n      layer,\n      mainSize: getLayerAxisSize(layer, mainAxis),\n      crossSize: getLayerAxisSize(\n        layer,\n        mainAxis === \"horizontal\" ? \"vertical\" : \"horizontal\",\n      ),\n    };\n    const nextMainSize =\n      currentLine.items.length === 0\n        ? item.mainSize\n        : currentLine.mainSize + gap + item.mainSize;\n\n    if (currentLine.items.length > 0 && nextMainSize > availableMain) {\n      lines.push(currentLine);\n      currentLine = {\n        items: [],\n        mainSize: 0,\n        crossSize: 0,\n      };\n    }\n\n    currentLine.items.push(item);\n    currentLine.mainSize =\n      currentLine.items.length === 1\n        ? item.mainSize\n        : currentLine.mainSize + gap + item.mainSize;\n    currentLine.crossSize = Math.max(currentLine.crossSize, item.crossSize);\n  }\n\n  if (currentLine.items.length > 0) {\n    lines.push(currentLine);\n  }\n\n  return lines;\n}\n\nfunction getWrappedHugFramePatch(\n  frame: DesignLayer,\n  lines: WrappedAutoLayoutLine[],\n  layout: DesignAutoLayout,\n) {\n  if (lines.length === 0 || !frame.layoutSizing) {\n    return null;\n  }\n\n  const sizing = getLayerSizing(frame);\n  const patch: Partial<DesignLayer> = {};\n  const crossSize =\n    lines.reduce((total, line) => total + line.crossSize, 0) +\n    Math.max(0, lines.length - 1) * layout.gap;\n  const mainSize = Math.max(...lines.map((line) => line.mainSize));\n\n  if (sizing.horizontal === \"hug\") {\n    patch.width =\n      layout.mode === \"horizontal\"\n        ? Math.round(layout.paddingX * 2 + mainSize)\n        : Math.round(layout.paddingX * 2 + crossSize);\n  }\n\n  if (sizing.vertical === \"hug\") {\n    patch.height =\n      layout.mode === \"vertical\"\n        ? Math.round(layout.paddingY * 2 + mainSize)\n        : Math.round(layout.paddingY * 2 + crossSize);\n  }\n\n  return Object.keys(patch).length > 0 ? patch : null;\n}\n\nfunction getHugFramePatch(\n  frame: DesignLayer,\n  children: DesignLayer[],\n  layout: DesignAutoLayout,\n) {\n  if (children.length === 0 || !frame.layoutSizing) {\n    return null;\n  }\n\n  const sizing = getLayerSizing(frame);\n  const patch: Partial<DesignLayer> = {};\n\n  if (sizing.horizontal === \"hug\") {\n    patch.width =\n      layout.mode === \"horizontal\"\n        ? Math.round(\n            layout.paddingX * 2 +\n              children.reduce((total, child) => total + child.width, 0) +\n              Math.max(0, children.length - 1) * layout.gap,\n          )\n        : Math.round(\n            layout.paddingX * 2 + Math.max(...children.map((child) => child.width)),\n          );\n  }\n\n  if (sizing.vertical === \"hug\") {\n    patch.height =\n      layout.mode === \"vertical\"\n        ? Math.round(\n            layout.paddingY * 2 +\n              children.reduce((total, child) => total + child.height, 0) +\n              Math.max(0, children.length - 1) * layout.gap,\n          )\n        : Math.round(\n            layout.paddingY * 2 + Math.max(...children.map((child) => child.height)),\n          );\n  }\n\n  return Object.keys(patch).length > 0 ? patch : null;\n}\n\nfunction getLayerAxisSize(layer: DesignLayer, axis: keyof DesignLayoutSizing) {\n  return axis === \"horizontal\" ? layer.width : layer.height;\n}\n\nfunction isOwnedAutoLayoutChild(frame: DesignLayer, layer: DesignLayer) {\n  return layer.parentId === frame.id && isAutoLayoutChildCandidate(frame, layer);\n}\n\nfunction isContainedAutoLayoutChild(frame: DesignLayer, layer: DesignLayer) {\n  return (\n    isAutoLayoutChildCandidate(frame, layer) &&\n    layer.x >= frame.x &&\n    layer.y >= frame.y &&\n    layer.x + layer.width <= frame.x + frame.width &&\n    layer.y + layer.height <= frame.y + frame.height\n  );\n}\n\nfunction isAutoLayoutChildCandidate(frame: DesignLayer, layer: DesignLayer) {\n  if (\n    layer.id === frame.id ||\n    layer.locked ||\n    !layer.visible ||\n    layer.absolutePositioned\n  ) {\n    return false;\n  }\n\n  return true;\n}\n\nfunction sortAutoLayoutChildren(\n  layers: DesignLayer[],\n  mode: DesignAutoLayoutMode,\n) {\n  return [...layers].sort((left, right) =>\n    mode === \"horizontal\"\n      ? left.x - right.x || left.y - right.y\n      : left.y - right.y || left.x - right.x,\n  );\n}\n\nfunction getCrossAxisPosition(\n  frameStart: number,\n  innerSize: number,\n  padding: number,\n  childSize: number,\n  align: DesignAutoLayoutAlignment,\n) {\n  if (align === \"center\") {\n    return frameStart + padding + (innerSize - childSize) / 2;\n  }\n\n  if (align === \"end\") {\n    return frameStart + padding + innerSize - childSize;\n  }\n\n  return frameStart + padding;\n}\n\nfunction getLineCrossAxisPosition(\n  lineStart: number,\n  lineSize: number,\n  childSize: number,\n  align: DesignAutoLayoutAlignment,\n) {\n  if (align === \"center\") {\n    return lineStart + (lineSize - childSize) / 2;\n  }\n\n  if (align === \"end\") {\n    return lineStart + lineSize - childSize;\n  }\n\n  return lineStart;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/auto-layout.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-auto-layout-ts-a5e7e051e98c177e.mjs",
  "kind": "ts",
  "hash": "a5e7e051e98c177e",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/auto-layout.ts",
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
      "getAutoLayoutChildLayers",
      "createAutoLayoutParentPatches",
      "createAutoLayoutLayerPatches",
      "getAutoLayoutSignature",
      "getLayoutSizingSignature",
      "getLayerSizing",
      "defaultAutoLayout",
      "defaultLayoutSizing",
      "autoLayoutModeOptions",
      "autoLayoutAlignmentOptions",
      "autoLayoutWrapOptions",
      "layoutSizingOptions"
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
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
