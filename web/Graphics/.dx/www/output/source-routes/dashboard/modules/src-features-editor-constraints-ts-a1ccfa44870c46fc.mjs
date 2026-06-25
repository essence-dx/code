
export const dxSourceText = "import type {\n  DesignConstraints,\n  DesignHorizontalConstraint,\n  DesignLayer,\n  DesignVerticalConstraint,\n} from \"@/features/editor/types\";\n\nexport type ConstraintLayerPatch = {\n  layerId: string;\n  patch: Partial<DesignLayer>;\n};\n\ntype Rect = Pick<DesignLayer, \"x\" | \"y\" | \"width\" | \"height\">;\n\nexport const defaultConstraints: DesignConstraints = {\n  horizontal: \"left\",\n  vertical: \"top\",\n};\n\nexport const horizontalConstraintOptions = [\n  { value: \"left\", label: \"Left\" },\n  { value: \"right\", label: \"Right\" },\n  { value: \"left-right\", label: \"Left & right\" },\n  { value: \"center\", label: \"Center\" },\n  { value: \"scale\", label: \"Scale\" },\n] satisfies Array<{ value: DesignHorizontalConstraint; label: string }>;\n\nexport const verticalConstraintOptions = [\n  { value: \"top\", label: \"Top\" },\n  { value: \"bottom\", label: \"Bottom\" },\n  { value: \"top-bottom\", label: \"Top & bottom\" },\n  { value: \"center\", label: \"Center\" },\n  { value: \"scale\", label: \"Scale\" },\n] satisfies Array<{ value: DesignVerticalConstraint; label: string }>;\n\nexport function getLayerConstraints(layer: DesignLayer): DesignConstraints {\n  return {\n    ...defaultConstraints,\n    ...layer.constraints,\n  };\n}\n\nexport function getConstraintsSignature(layer: DesignLayer) {\n  const constraints = getLayerConstraints(layer);\n\n  return `${constraints.horizontal}:${constraints.vertical}`;\n}\n\nexport function createFrameResizeConstraintPatches({\n  frame,\n  nextFrame,\n  layers,\n}: {\n  frame: DesignLayer;\n  nextFrame: Rect;\n  layers: DesignLayer[];\n}): ConstraintLayerPatch[] {\n  if (frame.type !== \"frame\") {\n    return [];\n  }\n\n  return layers\n    .filter((layer) => layer.parentId === frame.id && !layer.locked)\n    .map((layer) => ({\n      layerId: layer.id,\n      patch: getConstrainedChildPatch(frame, nextFrame, layer),\n    }));\n}\n\nfunction getConstrainedChildPatch(\n  frame: Rect,\n  nextFrame: Rect,\n  layer: DesignLayer,\n) {\n  const constraints = getLayerConstraints(layer);\n  const horizontal = getHorizontalConstraintPatch(\n    frame,\n    nextFrame,\n    layer,\n    constraints.horizontal,\n  );\n  const vertical = getVerticalConstraintPatch(\n    frame,\n    nextFrame,\n    layer,\n    constraints.vertical,\n  );\n\n  return {\n    ...horizontal,\n    ...vertical,\n  };\n}\n\nfunction getHorizontalConstraintPatch(\n  frame: Rect,\n  nextFrame: Rect,\n  layer: DesignLayer,\n  constraint: DesignHorizontalConstraint,\n) {\n  const left = layer.x - frame.x;\n  const right = frame.x + frame.width - layer.x - layer.width;\n  const centerOffset = layer.x + layer.width / 2 - (frame.x + frame.width / 2);\n  const scale = nextFrame.width / Math.max(1, frame.width);\n\n  if (constraint === \"right\") {\n    return {\n      x: Math.round(nextFrame.x + nextFrame.width - right - layer.width),\n    };\n  }\n\n  if (constraint === \"left-right\") {\n    return {\n      x: Math.round(nextFrame.x + left),\n      width: Math.max(1, Math.round(nextFrame.width - left - right)),\n    };\n  }\n\n  if (constraint === \"center\") {\n    return {\n      x: Math.round(nextFrame.x + nextFrame.width / 2 + centerOffset - layer.width / 2),\n    };\n  }\n\n  if (constraint === \"scale\") {\n    return {\n      x: Math.round(nextFrame.x + left * scale),\n      width: Math.max(1, Math.round(layer.width * scale)),\n    };\n  }\n\n  return {\n    x: Math.round(nextFrame.x + left),\n  };\n}\n\nfunction getVerticalConstraintPatch(\n  frame: Rect,\n  nextFrame: Rect,\n  layer: DesignLayer,\n  constraint: DesignVerticalConstraint,\n) {\n  const top = layer.y - frame.y;\n  const bottom = frame.y + frame.height - layer.y - layer.height;\n  const centerOffset = layer.y + layer.height / 2 - (frame.y + frame.height / 2);\n  const scale = nextFrame.height / Math.max(1, frame.height);\n\n  if (constraint === \"bottom\") {\n    return {\n      y: Math.round(nextFrame.y + nextFrame.height - bottom - layer.height),\n    };\n  }\n\n  if (constraint === \"top-bottom\") {\n    return {\n      y: Math.round(nextFrame.y + top),\n      height: Math.max(1, Math.round(nextFrame.height - top - bottom)),\n    };\n  }\n\n  if (constraint === \"center\") {\n    return {\n      y: Math.round(nextFrame.y + nextFrame.height / 2 + centerOffset - layer.height / 2),\n    };\n  }\n\n  if (constraint === \"scale\") {\n    return {\n      y: Math.round(nextFrame.y + top * scale),\n      height: Math.max(1, Math.round(layer.height * scale)),\n    };\n  }\n\n  return {\n    y: Math.round(nextFrame.y + top),\n  };\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/constraints.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-constraints-ts-a1ccfa44870c46fc.mjs",
  "kind": "ts",
  "hash": "a1ccfa44870c46fc",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/constraints.ts",
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
      "getLayerConstraints",
      "getConstraintsSignature",
      "createFrameResizeConstraintPatches",
      "defaultConstraints",
      "horizontalConstraintOptions",
      "verticalConstraintOptions"
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
