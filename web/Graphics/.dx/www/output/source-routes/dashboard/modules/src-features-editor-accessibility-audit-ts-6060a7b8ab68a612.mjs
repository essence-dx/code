import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-color-contrast-ts-fd45c4a737ad3504.mjs";
export const dxSourceText = "import { getContrastReport } from \"@/features/editor/color-contrast\";\nimport type { LayerPatch } from \"@/features/editor/document-utils\";\nimport type { DesignLayer, DesignPage } from \"@/features/editor/types\";\n\nexport type AccessibilityIssueSeverity = \"high\" | \"medium\" | \"low\";\n\nexport type AccessibilityIssue = {\n  id: string;\n  pageId?: string;\n  pageName?: string;\n  layerId?: string;\n  severity: AccessibilityIssueSeverity;\n  label: string;\n  detail: string;\n  fixable?: boolean;\n};\n\nexport type AccessibilityAudit = {\n  score: number;\n  issues: AccessibilityIssue[];\n  highCount: number;\n  mediumCount: number;\n  lowCount: number;\n  checkedLayerCount: number;\n  textLayerCount: number;\n  interactiveLayerCount: number;\n};\n\nexport function getAccessibilityAudit(page: DesignPage): AccessibilityAudit {\n  return getAuditForLayers(page, page.layers);\n}\n\nexport function getDocumentAccessibilityAudit(\n  pages: DesignPage[],\n): AccessibilityAudit {\n  const audits = pages.map(getAccessibilityAudit);\n  const issues = audits.flatMap((audit) => audit.issues);\n  const highCount = issues.filter((issue) => issue.severity === \"high\").length;\n  const mediumCount = issues.filter(\n    (issue) => issue.severity === \"medium\",\n  ).length;\n  const lowCount = issues.filter((issue) => issue.severity === \"low\").length;\n\n  return {\n    score: Math.max(0, 100 - highCount * 18 - mediumCount * 8 - lowCount * 3),\n    issues,\n    highCount,\n    mediumCount,\n    lowCount,\n    checkedLayerCount: audits.reduce(\n      (total, audit) => total + audit.checkedLayerCount,\n      0,\n    ),\n    textLayerCount: audits.reduce(\n      (total, audit) => total + audit.textLayerCount,\n      0,\n    ),\n    interactiveLayerCount: audits.reduce(\n      (total, audit) => total + audit.interactiveLayerCount,\n      0,\n    ),\n  };\n}\n\nexport function getSelectedAccessibilityAudit(\n  page: DesignPage,\n  selectedLayerIds: string[],\n): AccessibilityAudit {\n  const selected = new Set(selectedLayerIds);\n\n  return getAuditForLayers(\n    page,\n    page.layers.filter((layer) => selected.has(layer.id)),\n  );\n}\n\nexport function getAccessibilityAuditCsv(audit: AccessibilityAudit) {\n  return [\n    [\"severity\", \"page\", \"layerId\", \"label\", \"detail\", \"fixable\"],\n    ...audit.issues.map((issue) => [\n      issue.severity,\n      issue.pageName ?? \"\",\n      issue.layerId ?? \"\",\n      issue.label,\n      issue.detail,\n      issue.fixable ? \"yes\" : \"no\",\n    ]),\n  ]\n    .map((row) => row.map(formatCsvCell).join(\",\"))\n    .join(\"\\n\");\n}\n\nexport function getAccessibilityAuditMarkdown(\n  audit: AccessibilityAudit,\n  title = \"Accessibility Audit\",\n) {\n  const lines = [\n    `# ${title}`,\n    \"\",\n    `Score: ${audit.score}`,\n    `High issues: ${audit.highCount}`,\n    `Medium issues: ${audit.mediumCount}`,\n    `Low issues: ${audit.lowCount}`,\n    `Checked layers: ${audit.checkedLayerCount}`,\n    `Text layers: ${audit.textLayerCount}`,\n    `Interactive layers: ${audit.interactiveLayerCount}`,\n    \"\",\n    \"## Issues\",\n    \"\",\n  ];\n\n  if (audit.issues.length === 0) {\n    lines.push(\"- No accessibility issues found.\");\n  }\n\n  for (const issue of audit.issues) {\n    const scope = issue.pageName ? `${issue.pageName}: ` : \"\";\n    lines.push(\n      `- ${issue.severity.toUpperCase()} - ${scope}${issue.label}. ${issue.detail}`,\n    );\n  }\n\n  return lines.join(\"\\n\");\n}\n\nexport function getAccessibilityQuickFixPatches(\n  page: DesignPage,\n  audit: AccessibilityAudit = getAccessibilityAudit(page),\n): LayerPatch[] {\n  const layerById = new Map(page.layers.map((layer) => [layer.id, layer]));\n  const patchByLayerId = new Map<string, Partial<DesignLayer>>();\n\n  for (const issue of audit.issues) {\n    if (!issue.layerId || issue.pageId !== page.id) {\n      continue;\n    }\n\n    const layer = layerById.get(issue.layerId);\n    const patch = layer ? getQuickFixPatch(layer, issue, page.layers) : null;\n\n    if (!layer || !patch) {\n      continue;\n    }\n\n    patchByLayerId.set(layer.id, {\n      ...patchByLayerId.get(layer.id),\n      ...patch,\n    });\n  }\n\n  return Array.from(patchByLayerId.entries()).map(([layerId, patch]) => ({\n    layerId,\n    patch,\n  }));\n}\n\nfunction getAuditForLayers(\n  page: DesignPage,\n  layers: DesignLayer[],\n): AccessibilityAudit {\n  const visibleLayers = layers.filter((layer) => layer.visible);\n  const issues = visibleLayers.flatMap((layer) =>\n    getLayerIssues(layer, page).map((issue) => ({\n      ...issue,\n      id: `${page.id}:${issue.id}`,\n      pageId: page.id,\n      pageName: page.name,\n    })),\n  );\n  const highCount = issues.filter((issue) => issue.severity === \"high\").length;\n  const mediumCount = issues.filter(\n    (issue) => issue.severity === \"medium\",\n  ).length;\n  const lowCount = issues.filter((issue) => issue.severity === \"low\").length;\n\n  return {\n    score: Math.max(0, 100 - highCount * 18 - mediumCount * 8 - lowCount * 3),\n    issues,\n    highCount,\n    mediumCount,\n    lowCount,\n    checkedLayerCount: visibleLayers.length,\n    textLayerCount: visibleLayers.filter((layer) => layer.text !== undefined)\n      .length,\n    interactiveLayerCount: visibleLayers.filter((layer) =>\n      Boolean(layer.prototype),\n    ).length,\n  };\n}\n\nfunction getLayerIssues(layer: DesignLayer, page: DesignPage) {\n  const issues: AccessibilityIssue[] = [];\n\n  if (!layer.visible) {\n    return issues;\n  }\n\n  if (layer.type === \"image\" && !layer.imageAlt?.trim()) {\n    issues.push({\n      id: `${layer.id}:image-alt`,\n      layerId: layer.id,\n      severity: \"high\",\n      label: \"Missing image alt text\",\n      detail: `${layer.name} needs a concise image description.`,\n      fixable: true,\n    });\n  }\n\n  if (layer.text !== undefined) {\n    const background = getTextBackground(layer, page);\n    const contrast = getContrastReport(layer.textColor ?? \"#111111\", background);\n\n    if (contrast?.label === \"Low\") {\n      issues.push({\n        id: `${layer.id}:contrast`,\n        layerId: layer.id,\n        severity: \"high\",\n        label: \"Low text contrast\",\n        detail: `${layer.name} is ${contrast.ratio.toFixed(2)}:1 against ${background}.`,\n      });\n    } else if (!contrast && !isTransparentColor(background)) {\n      issues.push({\n        id: `${layer.id}:contrast-unknown`,\n        layerId: layer.id,\n        severity: \"medium\",\n        label: \"Manual contrast review\",\n        detail: `${layer.name} sits on a non-solid background that needs visual contrast review.`,\n      });\n    }\n\n    if ((layer.fontSize ?? 16) < 12) {\n      issues.push({\n        id: `${layer.id}:font-size`,\n        layerId: layer.id,\n        severity: \"medium\",\n        label: \"Small text\",\n        detail: `${layer.name} is below 12px.`,\n        fixable: true,\n      });\n    }\n  }\n\n  if (\n    layer.prototype &&\n    (Math.min(layer.width, layer.height) < 44 || layer.opacity < 0.4)\n  ) {\n    issues.push({\n      id: `${layer.id}:target-size`,\n      layerId: layer.id,\n      severity: \"medium\",\n      label: \"Small prototype target\",\n      detail: `${layer.name} may be hard to activate in preview.`,\n    });\n  }\n\n  if (layer.prototype && !getAccessibleLayerLabel(layer)) {\n    issues.push({\n      id: `${layer.id}:keyboard-label`,\n      layerId: layer.id,\n      severity: \"high\",\n      label: \"Missing keyboard label\",\n      detail:\n        \"Interactive prototype layers need visible text, alt text, or a meaningful layer name.\",\n      fixable: true,\n    });\n  }\n\n  if (layer.prototype?.trigger && layer.prototype.trigger !== \"click\") {\n    issues.push({\n      id: `${layer.id}:keyboard-trigger`,\n      layerId: layer.id,\n      severity: \"medium\",\n      label: \"Keyboard fallback needed\",\n      detail: `${layer.name} uses a ${layer.prototype.trigger} trigger, so add a click fallback before handoff.`,\n    });\n  }\n\n  if (hasGenericLayerName(layer)) {\n    issues.push({\n      id: `${layer.id}:name`,\n      layerId: layer.id,\n      severity: \"low\",\n      label: \"Generic layer name\",\n      detail: \"Rename the layer for cleaner handoff and screen-reader context.\",\n      fixable: true,\n    });\n  }\n\n  return issues;\n}\n\nfunction getTextBackground(layer: DesignLayer, page: DesignPage) {\n  const parent = page.layers.find((candidate) => candidate.id === layer.parentId);\n\n  return parent?.fill && parent.fill !== \"transparent\"\n    ? parent.fill\n    : page.background;\n}\n\nfunction getAccessibleLayerLabel(layer: DesignLayer) {\n  const text = layer.text?.replace(/\\s+/g, \" \").trim();\n\n  if (text) {\n    return text;\n  }\n\n  const imageAlt = layer.imageAlt?.trim();\n\n  if (imageAlt) {\n    return imageAlt;\n  }\n\n  return hasGenericLayerName(layer) ? \"\" : layer.name.trim();\n}\n\nfunction hasGenericLayerName(layer: DesignLayer) {\n  return !layer.name.trim() || /^layer\\s*\\d*$/i.test(layer.name.trim());\n}\n\nfunction isTransparentColor(value: string) {\n  return value === \"transparent\" || value === \"rgba(0,0,0,0)\";\n}\n\nfunction getQuickFixPatch(\n  layer: DesignLayer,\n  issue: AccessibilityIssue,\n  layers: DesignLayer[],\n): Partial<DesignLayer> | null {\n  if (issue.label === \"Missing image alt text\" && layer.type === \"image\") {\n    return { imageAlt: getSafeAccessibleName(layer, layers) };\n  }\n\n  if (issue.label === \"Missing keyboard label\") {\n    return layer.type === \"image\"\n      ? { imageAlt: getSafeAccessibleName(layer, layers) }\n      : { name: getSafeAccessibleName(layer, layers) };\n  }\n\n  if (issue.label === \"Generic layer name\") {\n    return { name: getSafeAccessibleName(layer, layers) };\n  }\n\n  if (issue.label === \"Small text\" && layer.text !== undefined) {\n    return { fontSize: Math.max(12, layer.fontSize ?? 16) };\n  }\n\n  return null;\n}\n\nfunction getSafeAccessibleName(layer: DesignLayer, layers: DesignLayer[]) {\n  const currentName = layer.name.trim();\n\n  if (currentName && !hasGenericLayerName(layer)) {\n    return currentName;\n  }\n\n  const sameTypeIndex =\n    layers.filter((candidate) => candidate.type === layer.type).findIndex(\n      (candidate) => candidate.id === layer.id,\n    ) + 1;\n\n  return `${toDisplayType(layer.type)} ${Math.max(1, sameTypeIndex)}`;\n}\n\nfunction toDisplayType(type: DesignLayer[\"type\"]) {\n  return type\n    .split(\"-\")\n    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))\n    .join(\" \");\n}\n\nfunction formatCsvCell(value: string | number) {\n  const text = String(value);\n\n  if (!/[\",\\n]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/accessibility-audit.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-accessibility-audit-ts-6060a7b8ab68a612.mjs",
  "kind": "ts",
  "hash": "6060a7b8ab68a612",
  "dependencies": [
    {
      "specifier": "@/features/editor/color-contrast",
      "resolved_path": "src/features/editor/color-contrast.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-color-contrast-ts-fd45c4a737ad3504.mjs",
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
    "source_path": "src/features/editor/accessibility-audit.ts",
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
        "specifier": "@/features/editor/color-contrast",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/document-utils",
        "side_effect_only": false,
        "type_only": true
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
      "getAccessibilityAudit",
      "getDocumentAccessibilityAudit",
      "getSelectedAccessibilityAudit",
      "getAccessibilityAuditCsv",
      "getAccessibilityAuditMarkdown",
      "getAccessibilityQuickFixPatches"
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
