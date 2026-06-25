import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-accessibility-audit-ts-6060a7b8ab68a612.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-editor-prototype-flow-diagnostics-ts-ea80d97ae57e141d.mjs";
export const dxSourceText = "import type { RetentionPrivacyReport } from \"@/features/admin/admin-retention-privacy\";\nimport {\n  getDocumentAccessibilityAudit,\n  type AccessibilityAudit,\n} from \"@/features/editor/accessibility-audit\";\nimport {\n  getPrototypeFlowDiagnostics,\n  type PrototypeFlowDiagnostics,\n} from \"@/features/editor/prototype-flow-diagnostics\";\nimport type { ProductionDeploySmokeReport } from \"@/features/editor/production-deploy-smoke\";\nimport type { DesignDocument } from \"@/features/editor/types\";\n\nexport type AccessibilityPrivacyReleaseSurface =\n  | \"admin\"\n  | \"editor\"\n  | \"prototype\"\n  | \"share\";\n\nexport type AccessibilityPrivacyReleaseStatus =\n  | \"ready\"\n  | \"review\"\n  | \"blocked\";\n\nexport type AccessibilityPrivacyReleaseRow = {\n  id: string;\n  surface: AccessibilityPrivacyReleaseSurface;\n  status: AccessibilityPrivacyReleaseStatus;\n  label: string;\n  value: string;\n  detail: string;\n  recommendation: string;\n  evidenceCount: number;\n};\n\nexport type AccessibilityPrivacyReleaseChecklist = {\n  generatedAt: string;\n  status: AccessibilityPrivacyReleaseStatus;\n  score: number;\n  readyCount: number;\n  reviewCount: number;\n  blockedCount: number;\n  surfaceCount: number;\n  documentCount: number;\n  checkedLayerCount: number;\n  textLayerCount: number;\n  interactiveLayerCount: number;\n  highAccessibilityIssueCount: number;\n  mediumAccessibilityIssueCount: number;\n  lowAccessibilityIssueCount: number;\n  prototypeIssueCount: number;\n  prototypeBrokenCount: number;\n  privacyReviewCount: number;\n  rows: AccessibilityPrivacyReleaseRow[];\n};\n\nexport type AccessibilityPrivacyReleaseInput = {\n  documents: Array<{\n    id: string;\n    name: string;\n    document: DesignDocument;\n  }>;\n  productionDeploySmoke: ProductionDeploySmokeReport;\n  retentionPrivacy: RetentionPrivacyReport;\n  generatedAt?: string;\n};\n\nexport function getAccessibilityPrivacyReleaseChecklist({\n  documents,\n  generatedAt = new Date().toISOString(),\n  productionDeploySmoke,\n  retentionPrivacy,\n}: AccessibilityPrivacyReleaseInput): AccessibilityPrivacyReleaseChecklist {\n  const accessibility = getWorkspaceAccessibilityAudit(documents);\n  const prototype = getWorkspacePrototypeDiagnostics(documents);\n  const rows = [\n    getEditorAccessibilityRow({ accessibility, documentCount: documents.length }),\n    getEditorRouteSmokeRow(productionDeploySmoke),\n    getAdminPrivacyRow(retentionPrivacy),\n    getAdminRouteSmokeRow(productionDeploySmoke),\n    getSharePrivacyRow(retentionPrivacy),\n    getShareRouteSmokeRow(productionDeploySmoke),\n    getPrototypeFlowRow(prototype),\n    getPrototypeInteractionRow({ accessibility, prototype }),\n  ];\n  const readyCount = rows.filter((row) => row.status === \"ready\").length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n\n  return {\n    generatedAt,\n    status:\n      blockedCount > 0 ? \"blocked\" : reviewCount > 0 ? \"review\" : \"ready\",\n    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 7),\n    readyCount,\n    reviewCount,\n    blockedCount,\n    surfaceCount: new Set(rows.map((row) => row.surface)).size,\n    documentCount: documents.length,\n    checkedLayerCount: accessibility.checkedLayerCount,\n    textLayerCount: accessibility.textLayerCount,\n    interactiveLayerCount: accessibility.interactiveLayerCount,\n    highAccessibilityIssueCount: accessibility.highCount,\n    mediumAccessibilityIssueCount: accessibility.mediumCount,\n    lowAccessibilityIssueCount: accessibility.lowCount,\n    prototypeIssueCount: prototype.issues.length,\n    prototypeBrokenCount: prototype.brokenCount,\n    privacyReviewCount: retentionPrivacy.reviewCount + retentionPrivacy.blockedCount,\n    rows,\n  };\n}\n\nfunction getWorkspaceAccessibilityAudit(\n  documents: AccessibilityPrivacyReleaseInput[\"documents\"],\n): AccessibilityAudit {\n  const pages = documents.flatMap((item) => item.document.pages);\n\n  return getDocumentAccessibilityAudit(pages);\n}\n\nfunction getWorkspacePrototypeDiagnostics(\n  documents: AccessibilityPrivacyReleaseInput[\"documents\"],\n): PrototypeFlowDiagnostics {\n  const reports = documents.map((item) =>\n    getPrototypeFlowDiagnostics(item.document),\n  );\n  const issues = reports\n    .flatMap((report) => report.issues)\n    .sort((left, right) => {\n      if (left.severity !== right.severity) {\n        return getSeverityRank(left.severity) - getSeverityRank(right.severity);\n      }\n\n      return left.pageName.localeCompare(right.pageName);\n    });\n\n  return {\n    pageCount: reports.reduce((total, report) => total + report.pageCount, 0),\n    startPageCount: reports.reduce(\n      (total, report) => total + report.startPageCount,\n      0,\n    ),\n    hotspotCount: reports.reduce(\n      (total, report) => total + report.hotspotCount,\n      0,\n    ),\n    brokenCount: reports.reduce(\n      (total, report) => total + report.brokenCount,\n      0,\n    ),\n    warningCount: issues.length,\n    deadEndCount: reports.reduce(\n      (total, report) => total + report.deadEndCount,\n      0,\n    ),\n    unreachableCount: reports.reduce(\n      (total, report) => total + report.unreachableCount,\n      0,\n    ),\n    pages: reports.flatMap((report) => report.pages),\n    issues,\n  };\n}\n\nfunction getEditorAccessibilityRow({\n  accessibility,\n  documentCount,\n}: {\n  accessibility: AccessibilityAudit;\n  documentCount: number;\n}): AccessibilityPrivacyReleaseRow {\n  return {\n    id: \"editor-accessibility-audit\",\n    surface: \"editor\",\n    status:\n      documentCount === 0\n        ? \"review\"\n        : accessibility.highCount > 0\n          ? \"blocked\"\n          : accessibility.mediumCount + accessibility.lowCount > 0\n            ? \"review\"\n            : \"ready\",\n    label: \"Editor accessibility audit\",\n    value: `${accessibility.score}/100`,\n    detail:\n      documentCount === 0\n        ? \"No saved documents are available for editor accessibility release review.\"\n        : `${accessibility.checkedLayerCount} visible layers, ${accessibility.textLayerCount} text layers, and ${accessibility.interactiveLayerCount} interactive layers were checked.`,\n    recommendation:\n      \"Resolve high contrast, missing alt text, and interactive label issues before release approval.\",\n    evidenceCount: accessibility.issues.length,\n  };\n}\n\nfunction getEditorRouteSmokeRow(\n  productionDeploySmoke: ProductionDeploySmokeReport,\n): AccessibilityPrivacyReleaseRow {\n  return getSmokeRow({\n    id: \"editor-route-smoke-accessibility\",\n    surface: \"editor\",\n    label: \"Editor route release smoke\",\n    kind: \"editor\",\n    productionDeploySmoke,\n    recommendation:\n      \"Run the editor route smoke with seeded content after deployment so accessibility fixes are exercised in the actual shell.\",\n  });\n}\n\nfunction getAdminPrivacyRow(\n  retentionPrivacy: RetentionPrivacyReport,\n): AccessibilityPrivacyReleaseRow {\n  return {\n    id: \"admin-retention-privacy-release\",\n    surface: \"admin\",\n    status: retentionPrivacy.status,\n    label: \"Admin retention privacy\",\n    value: `${retentionPrivacy.score}/100`,\n    detail: `${retentionPrivacy.retainedAuditEventCount} audit events, ${retentionPrivacy.retainedNotificationDeliveryCount} notification records, and ${retentionPrivacy.supportBundleSensitiveAuditMetadataCount} sensitive audit metadata rows are covered.`,\n    recommendation:\n      \"Export retention privacy controls before release and keep support bundle redaction enabled for production diagnostics.\",\n    evidenceCount: retentionPrivacy.rows.length,\n  };\n}\n\nfunction getAdminRouteSmokeRow(\n  productionDeploySmoke: ProductionDeploySmokeReport,\n): AccessibilityPrivacyReleaseRow {\n  return getSmokeRow({\n    id: \"admin-route-smoke-privacy\",\n    surface: \"admin\",\n    label: \"Admin route release smoke\",\n    kind: \"admin\",\n    productionDeploySmoke,\n    recommendation:\n      \"Verify the admin dashboard loads release, audit, user, notification, and privacy panels for the seeded admin.\",\n  });\n}\n\nfunction getSharePrivacyRow(\n  retentionPrivacy: RetentionPrivacyReport,\n): AccessibilityPrivacyReleaseRow {\n  const sensitiveCount =\n    retentionPrivacy.supportBundleSensitiveSessionCount +\n    retentionPrivacy.supportBundleSensitiveAuditMetadataCount;\n\n  return {\n    id: \"share-privacy-evidence\",\n    surface: \"share\",\n    status:\n      sensitiveCount > 0 && !retentionPrivacy.supportBundleRedactionEnabled\n        ? \"review\"\n        : \"ready\",\n    label: \"Share and support evidence privacy\",\n    value: retentionPrivacy.supportBundleRedactionEnabled\n      ? retentionPrivacy.settings.supportBundlePrivacyMode\n      : \"diagnostic\",\n    detail: `${sensitiveCount} sensitive support evidence records are visible in release scope; support bundle privacy mode is ${retentionPrivacy.settings.supportBundlePrivacyMode}.`,\n    recommendation:\n      \"Use redacted or minimal support evidence when attaching share diagnostics to external release handoffs.\",\n    evidenceCount: sensitiveCount,\n  };\n}\n\nfunction getShareRouteSmokeRow(\n  productionDeploySmoke: ProductionDeploySmokeReport,\n): AccessibilityPrivacyReleaseRow {\n  return getSmokeRow({\n    id: \"share-route-smoke-privacy\",\n    surface: \"share\",\n    label: \"Public share route smoke\",\n    kind: \"share\",\n    productionDeploySmoke,\n    recommendation:\n      \"Confirm public share handoff renders without leaking admin-only data or authenticated controls.\",\n  });\n}\n\nfunction getPrototypeFlowRow(\n  prototype: PrototypeFlowDiagnostics,\n): AccessibilityPrivacyReleaseRow {\n  return {\n    id: \"prototype-flow-release\",\n    surface: \"prototype\",\n    status:\n      prototype.brokenCount > 0\n        ? \"blocked\"\n        : prototype.warningCount > 0\n          ? \"review\"\n          : \"ready\",\n    label: \"Prototype flow release\",\n    value: `${prototype.hotspotCount} hotspots`,\n    detail: `${prototype.startPageCount} start pages, ${prototype.brokenCount} broken targets, ${prototype.unreachableCount} unreachable pages, and ${prototype.deadEndCount} dead ends were found.`,\n    recommendation:\n      \"Fix broken hotspots and mark one clear start page before publishing prototype release links.\",\n    evidenceCount: prototype.issues.length,\n  };\n}\n\nfunction getPrototypeInteractionRow({\n  accessibility,\n  prototype,\n}: {\n  accessibility: AccessibilityAudit;\n  prototype: PrototypeFlowDiagnostics;\n}): AccessibilityPrivacyReleaseRow {\n  const interactiveIssueCount = accessibility.issues.filter((issue) =>\n    /prototype|interactive|target|keyboard|trigger/i.test(\n      `${issue.label} ${issue.detail}`,\n    ),\n  ).length;\n\n  return {\n    id: \"prototype-interaction-accessibility\",\n    surface: \"prototype\",\n    status:\n      prototype.hotspotCount === 0\n        ? \"review\"\n        : interactiveIssueCount > 0\n          ? \"review\"\n          : \"ready\",\n    label: \"Prototype interaction accessibility\",\n    value: `${accessibility.interactiveLayerCount} interactions`,\n    detail: `${interactiveIssueCount} interaction-focused accessibility issue${interactiveIssueCount === 1 ? \"\" : \"s\"} are included in the release audit.`,\n    recommendation:\n      \"Check target sizes, visible labels, and click fallbacks for all prototype interactions.\",\n    evidenceCount: interactiveIssueCount,\n  };\n}\n\nfunction getSmokeRow({\n  id,\n  surface,\n  label,\n  kind,\n  productionDeploySmoke,\n  recommendation,\n}: {\n  id: string;\n  surface: AccessibilityPrivacyReleaseSurface;\n  label: string;\n  kind: ProductionDeploySmokeReport[\"rows\"][number][\"kind\"];\n  productionDeploySmoke: ProductionDeploySmokeReport;\n  recommendation: string;\n}): AccessibilityPrivacyReleaseRow {\n  const rows = productionDeploySmoke.rows.filter((row) => row.kind === kind);\n  const status = getRowsStatus(rows.map((row) => row.status));\n\n  return {\n    id,\n    surface,\n    status,\n    label,\n    value: `${rows.length} checks`,\n    detail:\n      rows.length > 0\n        ? rows.map((row) => `${row.label}: ${row.detail}`).join(\" \")\n        : `No ${kind} route smoke rows are registered.`,\n    recommendation,\n    evidenceCount: rows.length,\n  };\n}\n\nfunction getRowsStatus(\n  statuses: ProductionDeploySmokeReport[\"rows\"][number][\"status\"][],\n) {\n  if (statuses.length === 0) {\n    return \"review\";\n  }\n\n  if (statuses.includes(\"blocked\")) {\n    return \"blocked\";\n  }\n\n  if (statuses.includes(\"review\")) {\n    return \"review\";\n  }\n\n  return \"ready\";\n}\n\nfunction getSeverityRank(severity: \"high\" | \"low\" | \"medium\") {\n  if (severity === \"high\") {\n    return 0;\n  }\n\n  return severity === \"medium\" ? 1 : 2;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-accessibility-privacy-release.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-accessibility-privacy-release-ts-efffa0375e28232c.mjs",
  "kind": "ts",
  "hash": "efffa0375e28232c",
  "dependencies": [
    {
      "specifier": "@/features/editor/accessibility-audit",
      "resolved_path": "src/features/editor/accessibility-audit.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-accessibility-audit-ts-6060a7b8ab68a612.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/prototype-flow-diagnostics",
      "resolved_path": "src/features/editor/prototype-flow-diagnostics.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-prototype-flow-diagnostics-ts-ea80d97ae57e141d.mjs",
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
    "source_path": "src/features/admin/admin-accessibility-privacy-release.ts",
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
        "specifier": "@/features/admin/admin-retention-privacy",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/editor/accessibility-audit",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/prototype-flow-diagnostics",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/production-deploy-smoke",
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
      "getAccessibilityPrivacyReleaseChecklist"
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
