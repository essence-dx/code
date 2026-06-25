import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-admin-actions-ts-7a34f9e31ee697de.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-admin-admin-collaboration-handoff-operations-export-ts-a50c25aaf31f6af9.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs";
import { dxSourceModule as dep6, dxRuntimeExports as dep6Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport { useState, useTransition, type ReactNode } from \"react\";\nimport { useRouter } from \"next/navigation\";\nimport {\n  Archive,\n  CheckCircle2,\n  ClipboardCopy,\n  Download,\n  Eraser,\n  FileJson2,\n  MessageSquareWarning,\n  RadioTower,\n  ScreenShare,\n  UserCheck,\n  Users,\n} from \"lucide-react\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport type {\n  AdminCollaborationHandoffOperationsReport,\n  AdminCollaborationHandoffStatus,\n} from \"@/features/admin/admin-collaboration-handoff-operations\";\nimport {\n  archiveCollaborationHandoffEvidence,\n  assignCollaborationHandoffOwner,\n  clearCollaborationHandoffStaleSnapshot,\n  resolveCollaborationHandoffQueue,\n} from \"@/features/admin/actions\";\nimport {\n  getAdminCollaborationHandoffOperationsCsv,\n  getAdminCollaborationHandoffOperationsJson,\n  getAdminCollaborationHandoffOperationsMarkdown,\n} from \"@/features/admin/admin-collaboration-handoff-operations-export\";\nimport { downloadTextFile } from \"@/features/editor/components/library-release-panel-shared\";\n\ntype AdminCollaborationHandoffOperationsPanelProps = {\n  report: AdminCollaborationHandoffOperationsReport;\n};\n\nexport function AdminCollaborationHandoffOperationsPanel({\n  report,\n}: AdminCollaborationHandoffOperationsPanelProps) {\n  const router = useRouter();\n  const [pendingAction, setPendingAction] = useState<string | null>(null);\n  const [actionError, setActionError] = useState<string | null>(null);\n  const [, startTransition] = useTransition();\n\n  function exportJson() {\n    downloadTextFile({\n      filename: \"collaboration-handoff-operations.json\",\n      content: getAdminCollaborationHandoffOperationsJson(report),\n      type: \"application/json;charset=utf-8\",\n    });\n  }\n\n  function exportCsv() {\n    downloadTextFile({\n      filename: \"collaboration-handoff-operations.csv\",\n      content: getAdminCollaborationHandoffOperationsCsv(report),\n      type: \"text/csv;charset=utf-8\",\n    });\n  }\n\n  function exportMarkdown() {\n    downloadTextFile({\n      filename: \"collaboration-handoff-operations.md\",\n      content: getAdminCollaborationHandoffOperationsMarkdown(report),\n      type: \"text/markdown;charset=utf-8\",\n    });\n  }\n\n  function copyMarkdown() {\n    void navigator.clipboard.writeText(\n      getAdminCollaborationHandoffOperationsMarkdown(report),\n    );\n  }\n\n  function runRoomAction(actionId: string, action: () => Promise<unknown>) {\n    setActionError(null);\n    setPendingAction(actionId);\n    startTransition(() => {\n      void action()\n        .then(() => router.refresh())\n        .catch((error) => {\n          setActionError(\n            error instanceof Error ? error.message : \"Room action failed.\",\n          );\n        })\n        .finally(() => setPendingAction(null));\n    });\n  }\n\n  return (\n    <Card>\n      <CardHeader className=\"gap-3 md:flex-row md:items-center md:justify-between\">\n        <div>\n          <CardTitle className=\"flex items-center gap-2\">\n            <ScreenShare className=\"size-4\" />\n            Collaboration handoff rooms\n          </CardTitle>\n          <CardDescription>\n            Replay freshness, unresolved mentions, presenter ownership,\n            conflict queues, and admin escalation exports.\n          </CardDescription>\n        </div>\n        <div className=\"flex flex-wrap items-center gap-2\">\n          <Badge variant={getStatusVariant(report.status)}>\n            {report.status} {report.score}\n          </Badge>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportJson}>\n            <FileJson2 className=\"size-3.5\" />\n            JSON\n          </Button>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportCsv}>\n            <Download className=\"size-3.5\" />\n            CSV\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={exportMarkdown}\n          >\n            <Download className=\"size-3.5\" />\n            MD\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={copyMarkdown}\n          >\n            <ClipboardCopy className=\"size-3.5\" />\n            Copy\n          </Button>\n        </div>\n      </CardHeader>\n      <CardContent className=\"grid gap-4\">\n        <div className=\"grid gap-2 md:grid-cols-3 xl:grid-cols-6\">\n          <Metric label=\"Rooms\" value={report.roomCount} />\n          <Metric label=\"Captured\" value={report.capturedRoomCount} />\n          <Metric label=\"Fresh\" value={report.replayFreshCount} />\n          <Metric label=\"Mentions\" value={report.unresolvedMentionCount} />\n          <Metric label=\"Conflicts\" value={report.conflictQueueCount} />\n          <Metric label=\"Escalations\" value={report.escalationQueueCount} />\n        </div>\n        {actionError ? (\n          <div className=\"rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive\">\n            {actionError}\n          </div>\n        ) : null}\n\n        <div className=\"grid gap-3 xl:grid-cols-[1.15fr_0.85fr]\">\n          <div className=\"grid gap-3\">\n            {report.rooms.slice(0, 8).map((room) => (\n              <div\n                key={room.id}\n                className=\"rounded-md border border-border bg-muted/20 p-3\"\n              >\n                <div className=\"flex items-start justify-between gap-3\">\n                  <div className=\"min-w-0\">\n                    <div className=\"flex items-center gap-2 font-medium\">\n                      <Users className=\"size-4 shrink-0 text-muted-foreground\" />\n                      <span className=\"truncate\">{room.fileName}</span>\n                    </div>\n                    <div className=\"mt-2 flex flex-wrap gap-1\">\n                      <Badge variant={getStatusVariant(room.status)}>\n                        {room.status}\n                      </Badge>\n                      <Badge variant=\"outline\">{room.ownerEmail}</Badge>\n                      <Badge variant={room.roomCaptured ? \"outline\" : \"secondary\"}>\n                        {room.roomCaptured ? \"captured\" : \"missing room\"}\n                      </Badge>\n                      {room.handoffOwnerEmail ? (\n                        <Badge variant=\"outline\">\n                          owner {room.handoffOwnerEmail}\n                        </Badge>\n                      ) : null}\n                      {room.evidenceArchivedAt ? (\n                        <Badge variant=\"outline\">evidence archived</Badge>\n                      ) : null}\n                      {room.mentionQueueResolvedAt ? (\n                        <Badge variant=\"outline\">mentions resolved</Badge>\n                      ) : null}\n                      {room.escalationQueueResolvedAt ? (\n                        <Badge variant=\"outline\">escalations resolved</Badge>\n                      ) : null}\n                    </div>\n                  </div>\n                  <Badge variant={getStatusVariant(room.syncReplay.status)}>\n                    replay {room.syncReplay.status}\n                  </Badge>\n                </div>\n                <div className=\"mt-3 grid gap-2 text-xs md:grid-cols-4\">\n                  <Info label=\"Chat\" value={`${room.chatMessageCount}`} />\n                  <Info label=\"Presence\" value={`${room.presenceEventCount}`} />\n                  <Info label=\"Mentions\" value={`${room.unresolvedMentionCount}`} />\n                  <Info\n                    label=\"Age\"\n                    value={\n                      room.roomAgeMinutes === null\n                        ? \"none\"\n                        : `${Math.round(room.roomAgeMinutes)}m`\n                    }\n                  />\n                </div>\n                <div className=\"mt-3 rounded-md border border-border bg-background p-2 text-xs\">\n                  <div className=\"flex items-center gap-2 font-medium\">\n                    <RadioTower className=\"size-3.5 text-muted-foreground\" />\n                    Presenter: {room.presenter.status}\n                  </div>\n                  <p className=\"mt-1 text-muted-foreground\">\n                    {room.presenter.summary}\n                  </p>\n                </div>\n                <div className=\"mt-3 flex flex-wrap gap-2\">\n                  <RoomActionButton\n                    actionId={`${room.id}-assign-owner`}\n                    icon={<UserCheck className=\"size-3.5\" />}\n                    label={room.handoffAssignedAt ? \"Reassign owner\" : \"Assign owner\"}\n                    pendingAction={pendingAction}\n                    onClick={() =>\n                      runRoomAction(`${room.id}-assign-owner`, () =>\n                        assignCollaborationHandoffOwner({\n                          fileId: room.fileId,\n                          ownerEmail: room.ownerEmail,\n                          ownerName: getOwnerName(room.ownerEmail),\n                        }),\n                      )\n                    }\n                  />\n                  <RoomActionButton\n                    actionId={`${room.id}-archive`}\n                    icon={<Archive className=\"size-3.5\" />}\n                    label={room.evidenceArchivedAt ? \"Archive again\" : \"Archive\"}\n                    pendingAction={pendingAction}\n                    onClick={() =>\n                      runRoomAction(`${room.id}-archive`, () =>\n                        archiveCollaborationHandoffEvidence({\n                          fileId: room.fileId,\n                        }),\n                      )\n                    }\n                  />\n                  <RoomActionButton\n                    actionId={`${room.id}-clear-stale`}\n                    disabled={\n                      room.roomAgeMinutes !== null &&\n                      room.roomAgeMinutes <= 60 * 24\n                    }\n                    icon={<Eraser className=\"size-3.5\" />}\n                    label=\"Clear stale\"\n                    pendingAction={pendingAction}\n                    onClick={() =>\n                      runRoomAction(`${room.id}-clear-stale`, () =>\n                        clearCollaborationHandoffStaleSnapshot({\n                          fileId: room.fileId,\n                        }),\n                      )\n                    }\n                  />\n                  <RoomActionButton\n                    actionId={`${room.id}-resolve-mentions`}\n                    disabled={room.unresolvedMentionCount === 0}\n                    icon={<CheckCircle2 className=\"size-3.5\" />}\n                    label=\"Resolve mentions\"\n                    pendingAction={pendingAction}\n                    onClick={() =>\n                      runRoomAction(`${room.id}-resolve-mentions`, () =>\n                        resolveCollaborationHandoffQueue({\n                          fileId: room.fileId,\n                          queue: \"mentions\",\n                        }),\n                      )\n                    }\n                  />\n                  <RoomActionButton\n                    actionId={`${room.id}-resolve-escalations`}\n                    disabled={room.escalationCount === 0}\n                    icon={<CheckCircle2 className=\"size-3.5\" />}\n                    label=\"Resolve escalations\"\n                    pendingAction={pendingAction}\n                    onClick={() =>\n                      runRoomAction(`${room.id}-resolve-escalations`, () =>\n                        resolveCollaborationHandoffQueue({\n                          fileId: room.fileId,\n                          queue: \"escalations\",\n                        }),\n                      )\n                    }\n                  />\n                </div>\n              </div>\n            ))}\n          </div>\n\n          <div className=\"grid content-start gap-3\">\n            {report.rows.slice(0, 8).map((row) => (\n              <div\n                key={row.id}\n                className=\"rounded-md border border-border bg-muted/20 p-3\"\n              >\n                <div className=\"flex items-center justify-between gap-2\">\n                  <div className=\"min-w-0 truncate text-sm font-medium\">\n                    {row.label}\n                  </div>\n                  <Badge variant={getStatusVariant(row.status)}>\n                    {row.status}\n                  </Badge>\n                </div>\n                <div className=\"mt-2 flex flex-wrap gap-1\">\n                  <Badge variant=\"outline\">{row.category}</Badge>\n                  <Badge variant=\"secondary\">\n                    <MessageSquareWarning className=\"size-3\" />\n                    {row.count}\n                  </Badge>\n                </div>\n                <p className=\"mt-2 text-xs text-muted-foreground\">{row.detail}</p>\n                <p className=\"mt-2 text-xs\">{row.recommendation}</p>\n              </div>\n            ))}\n          </div>\n        </div>\n      </CardContent>\n    </Card>\n  );\n}\n\nfunction Metric({ label, value }: { label: string; value: number }) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-3\">\n      <div className=\"text-xs text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 font-mono text-2xl font-semibold\">{value}</div>\n    </div>\n  );\n}\n\nfunction Info({ label, value }: { label: string; value: string }) {\n  return (\n    <div className=\"rounded-md border border-border bg-background p-2\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 truncate font-medium\">{value}</div>\n    </div>\n  );\n}\n\nfunction RoomActionButton({\n  actionId,\n  disabled = false,\n  icon,\n  label,\n  onClick,\n  pendingAction,\n}: {\n  actionId: string;\n  disabled?: boolean;\n  icon: ReactNode;\n  label: string;\n  onClick: () => void;\n  pendingAction: string | null;\n}) {\n  const pending = pendingAction === actionId;\n\n  return (\n    <Button\n      type=\"button\"\n      size=\"sm\"\n      variant=\"outline\"\n      disabled={Boolean(pendingAction) || disabled}\n      onClick={onClick}\n    >\n      {icon}\n      {pending ? \"Working\" : label}\n    </Button>\n  );\n}\n\nfunction getOwnerName(email: string) {\n  return email.split(\"@\")[0] || email;\n}\n\nfunction getStatusVariant(status: AdminCollaborationHandoffStatus) {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  return status === \"review\" ? \"secondary\" : \"outline\";\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-collaboration-handoff-operations-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-collaboration-handoff-operations-panel-tsx-2ee158c691806845.mjs",
  "kind": "tsx",
  "hash": "2ee158c691806845",
  "dependencies": [
    {
      "specifier": "@/components/ui/badge",
      "resolved_path": "src/components/ui/badge.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/components/ui/button",
      "resolved_path": "src/components/ui/button.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-button-tsx-a045a54d4568e98d.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/components/ui/card",
      "resolved_path": "src/components/ui/card.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-card-tsx-62d56c5e9cb9789f.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/actions",
      "resolved_path": "src/features/admin/actions.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-actions-ts-7a34f9e31ee697de.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-collaboration-handoff-operations-export",
      "resolved_path": "src/features/admin/admin-collaboration-handoff-operations-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-collaboration-handoff-operations-export-ts-a50c25aaf31f6af9.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/components/library-release-panel-shared",
      "resolved_path": "src/features/editor/components/library-release-panel-shared.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "lucide-react",
      "resolved_path": "src/lib/forge/icons/lucide-react.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "next/navigation",
      "resolved_path": null,
      "chunk_output": null,
      "kind": "compiler-intrinsic",
      "resolver_source": "compiler-intrinsic",
      "node_modules_required": false
    },
    {
      "specifier": "react",
      "resolved_path": null,
      "chunk_output": null,
      "kind": "compiler-intrinsic",
      "resolver_source": "compiler-intrinsic",
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
    "source_path": "src/features/admin/components/admin-collaboration-handoff-operations-panel.tsx",
    "source_kind": "tsx",
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
    "directives": [
      {
        "value": "use client",
        "scope": "module-prologue",
        "line": 1,
        "column": 1
      }
    ],
    "static_imports": [
      {
        "specifier": "react",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "next/navigation",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "lucide-react",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/badge",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/button",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/card",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-collaboration-handoff-operations",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/actions",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-collaboration-handoff-operations-export",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/components/library-release-panel-shared",
        "side_effect_only": false,
        "type_only": false
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
      "AdminCollaborationHandoffOperationsPanel"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3, dep4, dep5, dep6]);
export default dxSourceModule;
