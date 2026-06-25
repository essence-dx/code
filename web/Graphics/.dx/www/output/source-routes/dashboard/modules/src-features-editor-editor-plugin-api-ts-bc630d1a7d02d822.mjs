
export const dxSourceText = "  | \"inspect-document\"\n  | \"select-layers\"\n  | \"write-layer-state\";\n\n\n\n\n\n\n\n\n\nexport const pluginPermissionLabels: Record<EditorPluginPermission, string> = {\n  \"inspect-document\": \"Inspect document\",\n  \"select-layers\": \"Select layers\",\n  \"write-layer-state\": \"Write layer state\",\n};\n\nexport const builtInPluginManifests: EditorPluginManifest[] = [\n  {\n    id: \"accessibility-auditor\",\n    name: \"Accessibility auditor\",\n    version: \"1.0.0\",\n    description: \"Reviews visible page layers and selects layers with issues.\",\n    permissions: [\"inspect-document\", \"select-layers\"],\n    runtimeKind: \"hybrid\",\n    entryPoint: \"plugins/accessibility-auditor/command.ts\",\n    sandbox: {\n      isolated: true,\n      networkAccess: \"none\",\n      timeoutMs: 1500,\n      memoryLimitMb: 64,\n    },\n    catalog: {\n      category: \"Review\",\n      surface: \"command-widget\",\n      publishable: true,\n      commandIds: [\"review.accessibility-audit\"],\n      widgetEntry: \"widgets/accessibility-review-card.tsx\",\n      reviewNotes: [\n        \"Read-only inspection and layer selection are safe for review handoff.\",\n      ],\n    },\n  },\n  {\n    id: \"ready-for-dev-marker\",\n    name: \"Ready marker\",\n    version: \"1.0.0\",\n    description: \"Marks selected layers as ready for Dev Mode handoff.\",\n    permissions: [\"write-layer-state\"],\n    runtimeKind: \"plugin\",\n    entryPoint: \"plugins/ready-for-dev-marker/command.ts\",\n    sandbox: {\n      isolated: true,\n      networkAccess: \"none\",\n      timeoutMs: 1200,\n      memoryLimitMb: 48,\n    },\n    catalog: {\n      category: \"Dev Mode\",\n      surface: \"command\",\n      publishable: true,\n      commandIds: [\"dev-mode.ready-marker\"],\n      reviewNotes: [\"Write access is scoped to selected layer state.\"],\n    },\n  },\n];\n\nexport function getPluginPermissionGrantKey(\n  pluginId,\n  permission,\n) {\n  return `${pluginId}:${permission}`;\n}\n\nexport function createPluginApprovalRecord({\n  actorEmail,\n  approvedAt = new Date().toISOString(),\n  id = createPluginRecordId(\"approval\"),\n  manifest,\n}){\n  return {\n    id,\n    pluginId: manifest.id,\n    pluginName: manifest.name,\n    manifestVersion: manifest.version,\n    permissions: [...manifest.permissions],\n    grantKeys: manifest.permissions.map((permission) =>\n      getPluginPermissionGrantKey(manifest.id, permission),\n    ),\n    approvedAt,\n    approvedBy: actorEmail,\n  };\n}\n\nexport function createPluginRunHistoryEntry({\n  action,\n  actorEmail,\n  createdAt = new Date().toISOString(),\n  detail,\n  id = createPluginRecordId(action),\n  manifest,\n  pinnedManifestVersion,\n  status,\n}){\n  return {\n    id,\n    pluginId: manifest.id,\n    pluginName: manifest.name,\n    manifestVersion: manifest.version,\n    pinnedManifestVersion,\n    action,\n    status,\n    detail,\n    actorEmail,\n    createdAt,\n  };\n}\n\nexport function getPluginGrantsForApproval(\n  approval,\n) {\n  return Object.fromEntries(approval.grantKeys.map((key) => [key, true]));\n}\n\nexport function isPluginApprovalCurrent(\n  manifest,\n  approval,\n) {\n  if (!approval) {\n    return false;\n  }\n\n  const expectedGrantKeys = manifest.permissions.map((permission) =>\n    getPluginPermissionGrantKey(manifest.id, permission),\n  );\n\n  return (\n    approval.pluginId === manifest.id &&\n    approval.manifestVersion === manifest.version &&\n    approval.permissions.length === manifest.permissions.length &&\n    expectedGrantKeys.every((key) => approval.grantKeys.includes(key))\n  );\n}\n\nfunction createPluginRecordId(prefix: string) {\n  return `${prefix}-${Date.now().toString(36)}-${Math.random()\n    .toString(36)\n    .slice(2, 8)}`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/editor-plugin-api.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-editor-plugin-api-ts-bc630d1a7d02d822.mjs",
  "kind": "ts",
  "hash": "bc630d1a7d02d822",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": true,
  "transform_kind": "typescript-helper-runtime",
  "runtime_exports": [
    "getPluginPermissionGrantKey",
    "createPluginApprovalRecord",
    "createPluginRunHistoryEntry",
    "getPluginGrantsForApproval",
    "isPluginApprovalCurrent"
  ],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/editor-plugin-api.ts",
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
    "static_imports": [],
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
      "getPluginPermissionGrantKey",
      "createPluginApprovalRecord",
      "createPluginRunHistoryEntry",
      "getPluginGrantsForApproval",
      "isPluginApprovalCurrent"
    ],
    "jsx": false,
    "top_level_await": false,
    "full_nextjs_parity": false,
    "analysis_boundary": "Uses vendored Turbopack ECMAScript and selected Next transform behavior as compatibility references while emitting DX-owned source graph receipts."
  },
  "node_modules_required": false
});
export const dxRuntimeModule = Object.freeze({
  transformed: true,
  transformKind: "typescript-helper-runtime",
  exportNames: ["getPluginPermissionGrantKey","createPluginApprovalRecord","createPluginRunHistoryEntry","getPluginGrantsForApproval","isPluginApprovalCurrent"]
});
  | "inspect-document"
  | "select-layers"
  | "write-layer-state";









export const pluginPermissionLabels: Record<EditorPluginPermission, string> = {
  "inspect-document": "Inspect document",
  "select-layers": "Select layers",
  "write-layer-state": "Write layer state",
};

export const builtInPluginManifests: EditorPluginManifest[] = [
  {
    id: "accessibility-auditor",
    name: "Accessibility auditor",
    version: "1.0.0",
    description: "Reviews visible page layers and selects layers with issues.",
    permissions: ["inspect-document", "select-layers"],
    runtimeKind: "hybrid",
    entryPoint: "plugins/accessibility-auditor/command.ts",
    sandbox: {
      isolated: true,
      networkAccess: "none",
      timeoutMs: 1500,
      memoryLimitMb: 64,
    },
    catalog: {
      category: "Review",
      surface: "command-widget",
      publishable: true,
      commandIds: ["review.accessibility-audit"],
      widgetEntry: "widgets/accessibility-review-card.tsx",
      reviewNotes: [
        "Read-only inspection and layer selection are safe for review handoff.",
      ],
    },
  },
  {
    id: "ready-for-dev-marker",
    name: "Ready marker",
    version: "1.0.0",
    description: "Marks selected layers as ready for Dev Mode handoff.",
    permissions: ["write-layer-state"],
    runtimeKind: "plugin",
    entryPoint: "plugins/ready-for-dev-marker/command.ts",
    sandbox: {
      isolated: true,
      networkAccess: "none",
      timeoutMs: 1200,
      memoryLimitMb: 48,
    },
    catalog: {
      category: "Dev Mode",
      surface: "command",
      publishable: true,
      commandIds: ["dev-mode.ready-marker"],
      reviewNotes: ["Write access is scoped to selected layer state."],
    },
  },
];

export function getPluginPermissionGrantKey(
  pluginId,
  permission,
) {
  return `${pluginId}:${permission}`;
}

export function createPluginApprovalRecord({
  actorEmail,
  approvedAt = new Date().toISOString(),
  id = createPluginRecordId("approval"),
  manifest,
}){
  return {
    id,
    pluginId: manifest.id,
    pluginName: manifest.name,
    manifestVersion: manifest.version,
    permissions: [...manifest.permissions],
    grantKeys: manifest.permissions.map((permission) =>
      getPluginPermissionGrantKey(manifest.id, permission),
    ),
    approvedAt,
    approvedBy: actorEmail,
  };
}

export function createPluginRunHistoryEntry({
  action,
  actorEmail,
  createdAt = new Date().toISOString(),
  detail,
  id = createPluginRecordId(action),
  manifest,
  pinnedManifestVersion,
  status,
}){
  return {
    id,
    pluginId: manifest.id,
    pluginName: manifest.name,
    manifestVersion: manifest.version,
    pinnedManifestVersion,
    action,
    status,
    detail,
    actorEmail,
    createdAt,
  };
}

export function getPluginGrantsForApproval(
  approval,
) {
  return Object.fromEntries(approval.grantKeys.map((key) => [key, true]));
}

export function isPluginApprovalCurrent(
  manifest,
  approval,
) {
  if (!approval) {
    return false;
  }

  const expectedGrantKeys = manifest.permissions.map((permission) =>
    getPluginPermissionGrantKey(manifest.id, permission),
  );

  return (
    approval.pluginId === manifest.id &&
    approval.manifestVersion === manifest.version &&
    approval.permissions.length === manifest.permissions.length &&
    expectedGrantKeys.every((key) => approval.grantKeys.includes(key))
  );
}

function createPluginRecordId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
export const dxRuntimeExports = Object.freeze({ getPluginPermissionGrantKey, createPluginApprovalRecord, createPluginRunHistoryEntry, getPluginGrantsForApproval, isPluginApprovalCurrent });
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
