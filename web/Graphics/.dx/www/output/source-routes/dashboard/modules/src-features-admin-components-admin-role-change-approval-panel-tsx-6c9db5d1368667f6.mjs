import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-alert-tsx-2d34801893b59373.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-components-ui-textarea-tsx-e9e5c08778d4836d.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-features-admin-admin-role-change-actions-ts-20f115cc1bb47ec2.mjs";
import { dxSourceModule as dep6, dxRuntimeExports as dep6Runtime } from "./src-features-admin-admin-role-change-approval-ts-323e96da34f25655.mjs";
import { dxSourceModule as dep7, dxRuntimeExports as dep7Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport { useMemo, useState, useTransition } from \"react\";\nimport { useRouter } from \"next/navigation\";\nimport { CheckCircle2, ShieldCheck, UsersRound, XCircle } from \"lucide-react\";\nimport { Alert, AlertDescription } from \"@/components/ui/alert\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport { Textarea } from \"@/components/ui/textarea\";\nimport {\n  bulkDecideAdminRoleChangeRequests,\n  decideAdminRoleChangeRequest,\n} from \"@/features/admin/admin-role-change-actions\";\nimport {\n  formatRole,\n  type RoleChangeApprovalQueue,\n  type RoleChangeApprovalRequest,\n} from \"@/features/admin/admin-role-change-approval\";\n\ntype AdminRoleChangeApprovalPanelProps = {\n  queue: RoleChangeApprovalQueue;\n};\n\nexport function AdminRoleChangeApprovalPanel({\n  queue,\n}: AdminRoleChangeApprovalPanelProps) {\n  const router = useRouter();\n  const [selectedIds, setSelectedIds] = useState<string[]>([]);\n  const [notes, setNotes] = useState<Record<string, string>>({});\n  const [bulkNote, setBulkNote] = useState(\"\");\n  const [message, setMessage] = useState<string | null>(null);\n  const [error, setError] = useState<string | null>(null);\n  const [isPending, startTransition] = useTransition();\n  const pendingRequests = useMemo(\n    () => queue.requests.filter((request) => request.status === \"pending\"),\n    [queue.requests],\n  );\n  const selectedPendingIds = selectedIds.filter((requestId) =>\n    pendingRequests.some((request) => request.requestId === requestId),\n  );\n\n  function toggleSelected(requestId: string) {\n    setSelectedIds((current) =>\n      current.includes(requestId)\n        ? current.filter((id) => id !== requestId)\n        : [...current, requestId],\n    );\n  }\n\n  function decideOne(\n    request: RoleChangeApprovalRequest,\n    decision: \"approve\" | \"reject\",\n  ) {\n    setMessage(null);\n    setError(null);\n    startTransition(async () => {\n      try {\n        await decideAdminRoleChangeRequest({\n          requestId: request.requestId,\n          decision,\n          reviewerNote: notes[request.requestId] ?? \"\",\n        });\n        setSelectedIds((current) =>\n          current.filter((id) => id !== request.requestId),\n        );\n        setMessage(`${request.targetEmail} role request ${decision}d.`);\n        router.refresh();\n      } catch (decisionError) {\n        setError(\n          decisionError instanceof Error\n            ? decisionError.message\n            : \"Could not review role request.\",\n        );\n      }\n    });\n  }\n\n  function decideSelected(decision: \"approve\" | \"reject\") {\n    if (selectedPendingIds.length === 0) {\n      return;\n    }\n\n    setMessage(null);\n    setError(null);\n    startTransition(async () => {\n      try {\n        const result = await bulkDecideAdminRoleChangeRequests({\n          requestIds: selectedPendingIds,\n          decision,\n          reviewerNote: bulkNote,\n        });\n        setSelectedIds([]);\n        setBulkNote(\"\");\n        setMessage(\n          `${result.decided} role request${result.decided === 1 ? \"\" : \"s\"} ${decision}d${\n            result.skipped > 0 ? `, ${result.skipped} skipped` : \"\"\n          }.`,\n        );\n        router.refresh();\n      } catch (decisionError) {\n        setError(\n          decisionError instanceof Error\n            ? decisionError.message\n            : \"Could not review selected role requests.\",\n        );\n      }\n    });\n  }\n\n  return (\n    <Card>\n      <CardHeader className=\"gap-3 md:flex-row md:items-start md:justify-between\">\n        <div>\n          <CardTitle className=\"flex items-center gap-2\">\n            <UsersRound className=\"size-4\" />\n            Collaborator role approvals\n          </CardTitle>\n          <CardDescription>\n            Review elevated access requests before commenter or editor roles are\n            applied to files.\n          </CardDescription>\n        </div>\n        <Badge variant={queue.pendingCount > 0 ? \"outline\" : \"secondary\"}>\n          {queue.pendingCount} pending\n        </Badge>\n      </CardHeader>\n      <CardContent className=\"grid gap-4\">\n        {message ? (\n          <Alert>\n            <CheckCircle2 className=\"size-4\" />\n            <AlertDescription>{message}</AlertDescription>\n          </Alert>\n        ) : null}\n\n        {error ? (\n          <Alert variant=\"destructive\">\n            <AlertDescription>{error}</AlertDescription>\n          </Alert>\n        ) : null}\n\n        <div className=\"grid gap-2 sm:grid-cols-3\">\n          <Metric label=\"Pending\" value={queue.pendingCount} />\n          <Metric label=\"Approved\" value={queue.approvedCount} />\n          <Metric label=\"Rejected\" value={queue.rejectedCount} />\n        </div>\n\n        <div className=\"rounded-md border border-border bg-muted/20 p-3\">\n          <div className=\"flex flex-col gap-3 lg:flex-row lg:items-end\">\n            <div className=\"min-w-0 flex-1\">\n              <div className=\"text-sm font-medium\">Bulk decision note</div>\n              <Textarea\n                value={bulkNote}\n                onChange={(event) => setBulkNote(event.target.value)}\n                placeholder=\"Reviewer note for selected requests...\"\n                className=\"mt-2 min-h-20\"\n                disabled={isPending}\n              />\n            </div>\n            <div className=\"grid gap-2 sm:grid-cols-2 lg:w-72\">\n              <Button\n                type=\"button\"\n                variant=\"secondary\"\n                disabled={isPending || selectedPendingIds.length === 0}\n                onClick={() => decideSelected(\"approve\")}\n              >\n                <ShieldCheck className=\"size-4\" />\n                Approve selected\n              </Button>\n              <Button\n                type=\"button\"\n                variant=\"outline\"\n                disabled={isPending || selectedPendingIds.length === 0}\n                onClick={() => decideSelected(\"reject\")}\n              >\n                <XCircle className=\"size-4\" />\n                Reject selected\n              </Button>\n            </div>\n          </div>\n        </div>\n\n        <div className=\"grid gap-3\">\n          {queue.requests.length > 0 ? (\n            queue.requests.map((request) => (\n              <RoleChangeRequestCard\n                key={request.requestId}\n                request={request}\n                selected={selectedIds.includes(request.requestId)}\n                note={notes[request.requestId] ?? \"\"}\n                disabled={isPending}\n                onNoteChange={(note) =>\n                  setNotes((current) => ({\n                    ...current,\n                    [request.requestId]: note,\n                  }))\n                }\n                onToggleSelected={() => toggleSelected(request.requestId)}\n                onApprove={() => decideOne(request, \"approve\")}\n                onReject={() => decideOne(request, \"reject\")}\n              />\n            ))\n          ) : (\n            <div className=\"rounded-md border border-border bg-muted/20 p-4 text-sm text-muted-foreground\">\n              No collaborator role-change requests have been recorded yet.\n            </div>\n          )}\n        </div>\n      </CardContent>\n    </Card>\n  );\n}\n\nfunction RoleChangeRequestCard({\n  disabled,\n  note,\n  onApprove,\n  onNoteChange,\n  onReject,\n  onToggleSelected,\n  request,\n  selected,\n}: {\n  disabled: boolean;\n  note: string;\n  onApprove: () => void;\n  onNoteChange: (note: string) => void;\n  onReject: () => void;\n  onToggleSelected: () => void;\n  request: RoleChangeApprovalRequest;\n  selected: boolean;\n}) {\n  const pending = request.status === \"pending\";\n\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-3\">\n      <div className=\"flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between\">\n        <div className=\"min-w-0\">\n          <div className=\"flex flex-wrap items-center gap-2\">\n            <div className=\"font-medium\">{request.targetEmail}</div>\n            <Badge variant={getStatusVariant(request.status)}>\n              {request.status}\n            </Badge>\n            <Badge variant=\"outline\">\n              {formatRole(request.currentRole)} to{\" \"}\n              {formatRole(request.requestedRole)}\n            </Badge>\n          </div>\n          <div className=\"mt-1 text-xs text-muted-foreground\">\n            {request.fileName} / requested by {request.requesterEmail} /{\" \"}\n            {formatDate(request.createdAt)}\n          </div>\n          {request.reviewerEmail ? (\n            <div className=\"mt-1 text-xs text-muted-foreground\">\n              Reviewed by {request.reviewerEmail}\n              {request.decidedAt ? ` / ${formatDate(request.decidedAt)}` : \"\"}\n            </div>\n          ) : null}\n          {request.reviewerNote ? (\n            <p className=\"mt-2 text-xs text-muted-foreground\">\n              {request.reviewerNote}\n            </p>\n          ) : null}\n        </div>\n        <Button\n          type=\"button\"\n          size=\"sm\"\n          variant={selected ? \"secondary\" : \"outline\"}\n          disabled={disabled || !pending}\n          onClick={onToggleSelected}\n        >\n          {selected ? \"Selected\" : \"Select\"}\n        </Button>\n      </div>\n\n      {pending ? (\n        <div className=\"mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end\">\n          <Textarea\n            value={note}\n            onChange={(event) => onNoteChange(event.target.value)}\n            placeholder=\"Reviewer note for this role change...\"\n            className=\"min-h-20\"\n            disabled={disabled}\n          />\n          <div className=\"grid grid-cols-2 gap-2 lg:w-56\">\n            <Button\n              type=\"button\"\n              variant=\"secondary\"\n              disabled={disabled}\n              onClick={onApprove}\n            >\n              Approve\n            </Button>\n            <Button\n              type=\"button\"\n              variant=\"outline\"\n              disabled={disabled}\n              onClick={onReject}\n            >\n              Reject\n            </Button>\n          </div>\n        </div>\n      ) : null}\n    </div>\n  );\n}\n\nfunction Metric({ label, value }: { label: string; value: number }) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-3 text-xs\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 font-mono text-base text-foreground\">{value}</div>\n    </div>\n  );\n}\n\nfunction getStatusVariant(status: RoleChangeApprovalRequest[\"status\"]) {\n  if (status === \"approved\") {\n    return \"secondary\";\n  }\n\n  return status === \"pending\" ? \"outline\" : \"destructive\";\n}\n\nfunction formatDate(value: string) {\n  return new Intl.DateTimeFormat(undefined, {\n    dateStyle: \"medium\",\n    timeStyle: \"short\",\n  }).format(new Date(value));\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-role-change-approval-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-role-change-approval-panel-tsx-6c9db5d1368667f6.mjs",
  "kind": "tsx",
  "hash": "6c9db5d1368667f6",
  "dependencies": [
    {
      "specifier": "@/components/ui/alert",
      "resolved_path": "src/components/ui/alert.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-alert-tsx-2d34801893b59373.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
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
      "specifier": "@/components/ui/textarea",
      "resolved_path": "src/components/ui/textarea.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-textarea-tsx-e9e5c08778d4836d.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-role-change-actions",
      "resolved_path": "src/features/admin/admin-role-change-actions.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-role-change-actions-ts-20f115cc1bb47ec2.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-role-change-approval",
      "resolved_path": "src/features/admin/admin-role-change-approval.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-role-change-approval-ts-323e96da34f25655.mjs",
      "kind": "ts",
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
    "source_path": "src/features/admin/components/admin-role-change-approval-panel.tsx",
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
        "specifier": "@/components/ui/alert",
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
        "specifier": "@/components/ui/textarea",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-role-change-actions",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-role-change-approval",
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
      "AdminRoleChangeApprovalPanel"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3, dep4, dep5, dep6, dep7]);
export default dxSourceModule;
