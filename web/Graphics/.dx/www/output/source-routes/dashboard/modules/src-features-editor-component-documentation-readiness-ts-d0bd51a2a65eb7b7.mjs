import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-component-properties-ts-dd9412b976db9b22.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-editor-layer-codegen-ts-9d8d9402bfc49e8c.mjs";
export const dxSourceText = "import type { ComponentUsageAnalytics } from \"@/features/editor/component-analytics\";\nimport { getComponentPropertyDefinitions } from \"@/features/editor/component-properties\";\nimport {\n  getLayerCodeConnectReport,\n  getLayerDevLinkReport,\n} from \"@/features/editor/layer-codegen\";\nimport type { DesignComponent } from \"@/features/editor/types\";\n\nexport type ComponentDocumentationStatus = \"ready\" | \"review\" | \"missing\";\n\nexport type ComponentDocumentationItem = {\n  id: string;\n  label: string;\n  detail: string;\n  status: ComponentDocumentationStatus;\n};\n\nexport type ComponentDocumentationReadiness = {\n  items: ComponentDocumentationItem[];\n  readyCount: number;\n  reviewCount: number;\n  missingCount: number;\n  score: number;\n  label: string;\n};\n\nexport type ComponentDocumentationSummary = {\n  readyComponents: number;\n  reviewComponents: number;\n  missingComponents: number;\n  averageScore: number;\n};\n\nexport type ComponentDocumentationAuditRow = {\n  componentName: string;\n  status: string;\n  score: number;\n  readyCount: number;\n  reviewCount: number;\n  missingCount: number;\n  instanceCount: number;\n  variantCount: number;\n  propertyCount: number;\n  slotCount: number;\n  codeConnectCount: number;\n  devLinkCount: number;\n  reviewItems: string;\n  missingItems: string;\n};\n\nexport function getComponentDocumentationReadiness(\n  component: DesignComponent,\n  analytics?: ComponentUsageAnalytics,\n): ComponentDocumentationReadiness {\n  const variantCount = component.variants?.length ?? 0;\n  const propertyCount = Object.keys(\n    getComponentPropertyDefinitions(component),\n  ).length;\n  const explicitSlotCount = component.layers.filter((layer) =>\n    Boolean(layer.componentSlotName?.trim()),\n  ).length;\n  const codeConnectCount = component.layers.filter((layer) =>\n    Boolean(getLayerCodeConnectReport(layer)),\n  ).length;\n  const devLinkCount = component.layers.reduce(\n    (total, layer) => total + getLayerDevLinkReport(layer).length,\n    0,\n  );\n  const instanceCount = analytics?.instanceCount ?? 0;\n\n  const items: ComponentDocumentationItem[] = [\n    {\n      id: \"examples\",\n      label: \"Examples\",\n      detail:\n        instanceCount > 0\n          ? `${instanceCount} placed example${instanceCount === 1 ? \"\" : \"s\"} in files`\n          : \"Insert the component in a file to create a usage example\",\n      status: instanceCount > 0 ? \"ready\" : \"review\",\n    },\n    {\n      id: \"variants\",\n      label: \"Variants\",\n      detail:\n        variantCount > 0\n          ? `${variantCount} variant${variantCount === 1 ? \"\" : \"s\"} defined`\n          : \"Create variants when the component has meaningful states\",\n      status: variantCount > 0 ? \"ready\" : \"review\",\n    },\n    {\n      id: \"props\",\n      label: \"Properties\",\n      detail:\n        propertyCount > 0\n          ? `${propertyCount} editable propert${propertyCount === 1 ? \"y\" : \"ies\"}`\n          : \"Add properties for text, boolean, swap, or variant control\",\n      status: propertyCount > 0 ? \"ready\" : \"review\",\n    },\n    {\n      id: \"slots\",\n      label: \"Slots\",\n      detail:\n        explicitSlotCount === component.layers.length\n          ? `${explicitSlotCount} named slot${explicitSlotCount === 1 ? \"\" : \"s\"}`\n          : `${component.layers.length - explicitSlotCount} layer${component.layers.length - explicitSlotCount === 1 ? \"\" : \"s\"} need slot metadata`,\n      status:\n        component.layers.length > 0 && explicitSlotCount === component.layers.length\n          ? \"ready\"\n          : \"missing\",\n    },\n    {\n      id: \"code-connect\",\n      label: \"Code Connect\",\n      detail:\n        codeConnectCount > 0\n          ? `${codeConnectCount} source layer${codeConnectCount === 1 ? \"\" : \"s\"} mapped`\n          : \"Map at least one source layer to implementation code\",\n      status: codeConnectCount > 0 ? \"ready\" : \"review\",\n    },\n    {\n      id: \"dev-links\",\n      label: \"Dev links\",\n      detail:\n        devLinkCount > 0\n          ? `${devLinkCount} repo, Storybook, issue, or docs link${devLinkCount === 1 ? \"\" : \"s\"}`\n          : \"Attach repo, Storybook, issue, or docs links for handoff\",\n      status: devLinkCount > 0 ? \"ready\" : \"review\",\n    },\n  ];\n  const readyCount = items.filter((item) => item.status === \"ready\").length;\n  const reviewCount = items.filter((item) => item.status === \"review\").length;\n  const missingCount = items.filter((item) => item.status === \"missing\").length;\n  const score = Math.round(\n    ((readyCount + reviewCount * 0.5) / items.length) * 100,\n  );\n\n  return {\n    items,\n    readyCount,\n    reviewCount,\n    missingCount,\n    score,\n    label: getReadinessLabel(missingCount, reviewCount),\n  };\n}\n\nexport function needsComponentDocumentationReview(\n  component: DesignComponent,\n  analytics?: ComponentUsageAnalytics,\n) {\n  const readiness = getComponentDocumentationReadiness(component, analytics);\n\n  return readiness.missingCount > 0 || readiness.reviewCount > 0;\n}\n\nexport function getComponentDocumentationSummary(\n  components: DesignComponent[],\n  analyticsByComponentId: Record<string, ComponentUsageAnalytics>,\n): ComponentDocumentationSummary {\n  if (components.length === 0) {\n    return {\n      readyComponents: 0,\n      reviewComponents: 0,\n      missingComponents: 0,\n      averageScore: 0,\n    };\n  }\n\n  const readiness = components.map((component) =>\n    getComponentDocumentationReadiness(\n      component,\n      analyticsByComponentId[component.id],\n    ),\n  );\n\n  return {\n    readyComponents: readiness.filter(\n      (item) => item.missingCount === 0 && item.reviewCount === 0,\n    ).length,\n    reviewComponents: readiness.filter(\n      (item) => item.missingCount === 0 && item.reviewCount > 0,\n    ).length,\n    missingComponents: readiness.filter((item) => item.missingCount > 0).length,\n    averageScore: Math.round(\n      readiness.reduce((total, item) => total + item.score, 0) /\n        readiness.length,\n    ),\n  };\n}\n\nexport function getComponentDocumentationAuditRows(\n  components: DesignComponent[],\n  analyticsByComponentId: Record<string, ComponentUsageAnalytics>,\n): ComponentDocumentationAuditRow[] {\n  return components.map((component) => {\n    const analytics = analyticsByComponentId[component.id];\n    const readiness = getComponentDocumentationReadiness(component, analytics);\n    const stats = getComponentDocumentationStats(component);\n\n    return {\n      componentName: component.name,\n      status: readiness.label,\n      score: readiness.score,\n      readyCount: readiness.readyCount,\n      reviewCount: readiness.reviewCount,\n      missingCount: readiness.missingCount,\n      instanceCount: analytics?.instanceCount ?? 0,\n      variantCount: stats.variantCount,\n      propertyCount: stats.propertyCount,\n      slotCount: stats.explicitSlotCount,\n      codeConnectCount: stats.codeConnectCount,\n      devLinkCount: stats.devLinkCount,\n      reviewItems: readiness.items\n        .filter((item) => item.status === \"review\")\n        .map((item) => item.label)\n        .join(\"; \"),\n      missingItems: readiness.items\n        .filter((item) => item.status === \"missing\")\n        .map((item) => item.label)\n        .join(\"; \"),\n    };\n  });\n}\n\nexport function getComponentDocumentationCsv(\n  components: DesignComponent[],\n  analyticsByComponentId: Record<string, ComponentUsageAnalytics>,\n) {\n  const rows = getComponentDocumentationAuditRows(\n    components,\n    analyticsByComponentId,\n  );\n  const header: Array<keyof ComponentDocumentationAuditRow> = [\n    \"componentName\",\n    \"status\",\n    \"score\",\n    \"readyCount\",\n    \"reviewCount\",\n    \"missingCount\",\n    \"instanceCount\",\n    \"variantCount\",\n    \"propertyCount\",\n    \"slotCount\",\n    \"codeConnectCount\",\n    \"devLinkCount\",\n    \"reviewItems\",\n    \"missingItems\",\n  ];\n\n  return [\n    header.join(\",\"),\n    ...rows.map((row) =>\n      header.map((key) => escapeCsvCell(row[key])).join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nfunction getComponentDocumentationStats(component: DesignComponent) {\n  return {\n    variantCount: component.variants?.length ?? 0,\n    propertyCount: Object.keys(getComponentPropertyDefinitions(component))\n      .length,\n    explicitSlotCount: component.layers.filter((layer) =>\n      Boolean(layer.componentSlotName?.trim()),\n    ).length,\n    codeConnectCount: component.layers.filter((layer) =>\n      Boolean(getLayerCodeConnectReport(layer)),\n    ).length,\n    devLinkCount: component.layers.reduce(\n      (total, layer) => total + getLayerDevLinkReport(layer).length,\n      0,\n    ),\n  };\n}\n\nfunction escapeCsvCell(value: string | number) {\n  const text = String(value);\n\n  if (!/[\",\\n]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replace(/\"/g, '\"\"')}\"`;\n}\n\nfunction getReadinessLabel(missingCount: number, reviewCount: number) {\n  if (missingCount > 0) {\n    return \"Missing docs\";\n  }\n\n  if (reviewCount > 0) {\n    return \"Needs review\";\n  }\n\n  return \"Ready\";\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/component-documentation-readiness.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-component-documentation-readiness-ts-d0bd51a2a65eb7b7.mjs",
  "kind": "ts",
  "hash": "d0bd51a2a65eb7b7",
  "dependencies": [
    {
      "specifier": "@/features/editor/component-properties",
      "resolved_path": "src/features/editor/component-properties.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-component-properties-ts-dd9412b976db9b22.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/layer-codegen",
      "resolved_path": "src/features/editor/layer-codegen.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-layer-codegen-ts-9d8d9402bfc49e8c.mjs",
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
    "source_path": "src/features/editor/component-documentation-readiness.ts",
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
        "specifier": "@/features/editor/component-analytics",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/editor/component-properties",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/layer-codegen",
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
      "getComponentDocumentationReadiness",
      "needsComponentDocumentationReview",
      "getComponentDocumentationSummary",
      "getComponentDocumentationAuditRows",
      "getComponentDocumentationCsv"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1]);
export default dxSourceModule;
