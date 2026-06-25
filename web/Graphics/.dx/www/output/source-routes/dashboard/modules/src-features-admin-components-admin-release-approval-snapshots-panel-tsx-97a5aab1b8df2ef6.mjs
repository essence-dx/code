import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-alert-tsx-2d34801893b59373.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-components-ui-input-tsx-5c00dcef4bc2ae59.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-components-ui-label-tsx-e0903213582531e3.mjs";
import { dxSourceModule as dep6, dxRuntimeExports as dep6Runtime } from "./src-components-ui-textarea-tsx-e9e5c08778d4836d.mjs";
import { dxSourceModule as dep7, dxRuntimeExports as dep7Runtime } from "./src-features-admin-actions-ts-7a34f9e31ee697de.mjs";
import { dxSourceModule as dep8, dxRuntimeExports as dep8Runtime } from "./src-features-admin-admin-release-approval-snapshots-export-ts-ddfbe0746969c2b1.mjs";
import { dxSourceModule as dep9, dxRuntimeExports as dep9Runtime } from "./src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs";
import { dxSourceModule as dep10, dxRuntimeExports as dep10Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport { type FormEvent, type ReactNode, useState, useTransition } from \"react\";\nimport { useRouter } from \"next/navigation\";\nimport {\n  ClipboardCopy,\n  Download,\n  ExternalLink,\n  FileJson2,\n  Rocket,\n  ShieldCheck,\n} from \"lucide-react\";\nimport { Alert, AlertDescription } from \"@/components/ui/alert\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport { Input } from \"@/components/ui/input\";\nimport { Label } from \"@/components/ui/label\";\nimport { Textarea } from \"@/components/ui/textarea\";\nimport { createAdminReleaseApprovalSnapshot } from \"@/features/admin/actions\";\nimport type { DeployEnvironmentPreflightReport } from \"@/features/admin/deploy-environment-preflight\";\nimport type { AdminOperationalIncidentReport } from \"@/features/admin/admin-operational-incidents\";\nimport type {\n  AdminReleaseApprovalDefaults,\n  AdminReleaseApprovalSnapshot,\n  AdminReleaseApprovalSnapshotStatus,\n} from \"@/features/admin/admin-release-approval-snapshots\";\nimport {\n  getAdminReleaseApprovalSnapshotsCsv,\n  getAdminReleaseApprovalSnapshotsJson,\n  getAdminReleaseApprovalSnapshotsMarkdown,\n} from \"@/features/admin/admin-release-approval-snapshots-export\";\nimport { downloadTextFile } from \"@/features/editor/components/library-release-panel-shared\";\n\ntype AdminReleaseApprovalSnapshotsPanelProps = {\n  defaults: AdminReleaseApprovalDefaults;\n  deployEnvironmentPreflight: DeployEnvironmentPreflightReport;\n  operationalIncidentReview: AdminOperationalIncidentReport;\n  snapshots: AdminReleaseApprovalSnapshot[];\n};\n\nexport function AdminReleaseApprovalSnapshotsPanel({\n  defaults,\n  deployEnvironmentPreflight,\n  operationalIncidentReview,\n  snapshots,\n}: AdminReleaseApprovalSnapshotsPanelProps) {\n  const router = useRouter();\n  const [releaseLabel, setReleaseLabel] = useState(\"\");\n  const [commitSha, setCommitSha] = useState(defaults.commitSha);\n  const [deploymentUrl, setDeploymentUrl] = useState(defaults.deploymentUrl);\n  const [smokeArtifactsText, setSmokeArtifactsText] = useState(\"\");\n  const [rollbackNotes, setRollbackNotes] = useState(\"\");\n  const [message, setMessage] = useState<string | null>(null);\n  const [error, setError] = useState<string | null>(null);\n  const [isPending, startTransition] = useTransition();\n  const latestSnapshot = snapshots[0];\n\n  function handleSubmit(event: FormEvent<HTMLFormElement>) {\n    event.preventDefault();\n    setMessage(null);\n    setError(null);\n    startTransition(async () => {\n      try {\n        const result = await createAdminReleaseApprovalSnapshot({\n          releaseLabel,\n          commitSha,\n          deploymentUrl,\n          smokeArtifactsText,\n          rollbackNotes,\n          preflightStatus: deployEnvironmentPreflight.status,\n          preflightScore: deployEnvironmentPreflight.score,\n          incidentStatus: operationalIncidentReview.status,\n          incidentScore: operationalIncidentReview.score,\n        });\n\n        setMessage(`Release approval snapshot saved: ${result.snapshotId}`);\n        setSmokeArtifactsText(\"\");\n        setRollbackNotes(\"\");\n        router.refresh();\n      } catch (caught) {\n        setError(\n          caught instanceof Error\n            ? caught.message\n            : \"Release approval snapshot failed.\",\n        );\n      }\n    });\n  }\n\n  function exportJson() {\n    downloadTextFile({\n      content: getAdminReleaseApprovalSnapshotsJson(snapshots),\n      filename: \"release-approval-snapshots.json\",\n      type: \"application/json;charset=utf-8\",\n    });\n  }\n\n  function exportCsv() {\n    downloadTextFile({\n      content: getAdminReleaseApprovalSnapshotsCsv(snapshots),\n      filename: \"release-approval-snapshots.csv\",\n      type: \"text/csv;charset=utf-8\",\n    });\n  }\n\n  function exportMarkdown() {\n    downloadTextFile({\n      content: getAdminReleaseApprovalSnapshotsMarkdown(snapshots),\n      filename: \"release-approval-snapshots.md\",\n      type: \"text/markdown;charset=utf-8\",\n    });\n  }\n\n  function copyMarkdown() {\n    void navigator.clipboard.writeText(\n      getAdminReleaseApprovalSnapshotsMarkdown(snapshots),\n    );\n  }\n\n  return (\n    <div className=\"grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]\">\n      <Card>\n        <CardHeader>\n          <div className=\"flex items-start justify-between gap-3\">\n            <div>\n              <CardTitle className=\"flex items-center gap-2\">\n                <Rocket className=\"size-4\" />\n                Release approval\n              </CardTitle>\n              <CardDescription>\n                Durable approval evidence for production deploy decisions.\n              </CardDescription>\n            </div>\n            <Badge variant={latestSnapshot ? \"secondary\" : \"outline\"}>\n              {snapshots.length} snapshots\n            </Badge>\n          </div>\n        </CardHeader>\n        <CardContent>\n          <form className=\"grid gap-3\" onSubmit={handleSubmit}>\n            <div className=\"grid gap-3 md:grid-cols-2\">\n              <Field id=\"release-label\" label=\"Release label\">\n                <Input\n                  id=\"release-label\"\n                  value={releaseLabel}\n                  onChange={(event) => setReleaseLabel(event.target.value)}\n                  placeholder=\"Production release\"\n                />\n              </Field>\n              <Field id=\"release-commit\" label=\"Commit\">\n                <Input\n                  id=\"release-commit\"\n                  value={commitSha}\n                  onChange={(event) => setCommitSha(event.target.value)}\n                  placeholder=\"git commit sha\"\n                  required\n                />\n              </Field>\n            </div>\n            <Field id=\"release-deployment-url\" label=\"Deployment URL\">\n              <Input\n                id=\"release-deployment-url\"\n                value={deploymentUrl}\n                onChange={(event) => setDeploymentUrl(event.target.value)}\n                placeholder=\"https://...\"\n                required\n              />\n            </Field>\n            <Field id=\"release-smoke-artifacts\" label=\"Smoke artifacts\">\n              <Textarea\n                id=\"release-smoke-artifacts\"\n                value={smokeArtifactsText}\n                onChange={(event) => setSmokeArtifactsText(event.target.value)}\n                placeholder=\"One report path or URL per line\"\n                required\n              />\n            </Field>\n            <Field id=\"release-rollback-notes\" label=\"Rollback notes\">\n              <Textarea\n                id=\"release-rollback-notes\"\n                value={rollbackNotes}\n                onChange={(event) => setRollbackNotes(event.target.value)}\n                placeholder=\"Rollback command, previous deployment, and recovery owner\"\n                required\n              />\n            </Field>\n\n            <div className=\"grid gap-2 text-xs md:grid-cols-2\">\n              <StatusMetric\n                label=\"Deploy preflight\"\n                status={deployEnvironmentPreflight.status}\n                score={deployEnvironmentPreflight.score}\n              />\n              <StatusMetric\n                label=\"Incident review\"\n                status={operationalIncidentReview.status}\n                score={operationalIncidentReview.score}\n              />\n            </div>\n\n            {message ? (\n              <Alert>\n                <ShieldCheck className=\"size-4\" />\n                <AlertDescription>{message}</AlertDescription>\n              </Alert>\n            ) : null}\n            {error ? (\n              <Alert variant=\"destructive\">\n                <AlertDescription>{error}</AlertDescription>\n              </Alert>\n            ) : null}\n\n            <Button type=\"submit\" disabled={isPending}>\n              <ShieldCheck className=\"size-4\" />\n              {isPending ? \"Saving snapshot...\" : \"Save approval snapshot\"}\n            </Button>\n          </form>\n        </CardContent>\n      </Card>\n\n      <Card>\n        <CardHeader className=\"gap-3 md:flex-row md:items-center md:justify-between\">\n          <div>\n            <CardTitle>Approval history</CardTitle>\n            <CardDescription>\n              Reviewer, commit, deployment, smoke evidence, and rollback notes.\n            </CardDescription>\n          </div>\n          <div className=\"grid grid-cols-4 gap-2\">\n            <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportJson}>\n              <FileJson2 className=\"size-3.5\" />\n              JSON\n            </Button>\n            <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportCsv}>\n              <Download className=\"size-3.5\" />\n              CSV\n            </Button>\n            <Button\n              type=\"button\"\n              size=\"sm\"\n              variant=\"outline\"\n              onClick={exportMarkdown}\n            >\n              <Download className=\"size-3.5\" />\n              MD\n            </Button>\n            <Button\n              type=\"button\"\n              size=\"sm\"\n              variant=\"outline\"\n              onClick={copyMarkdown}\n            >\n              <ClipboardCopy className=\"size-3.5\" />\n              Copy\n            </Button>\n          </div>\n        </CardHeader>\n        <CardContent>\n          {snapshots.length === 0 ? (\n            <div className=\"rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground\">\n              No release approval snapshots have been recorded.\n            </div>\n          ) : (\n            <div className=\"grid gap-2\">\n              {snapshots.slice(0, 6).map((snapshot) => (\n                <SnapshotRow key={snapshot.id} snapshot={snapshot} />\n              ))}\n            </div>\n          )}\n        </CardContent>\n      </Card>\n    </div>\n  );\n}\n\nfunction Field({\n  id,\n  label,\n  children,\n}: {\n  id: string;\n  label: string;\n  children: ReactNode;\n}) {\n  return (\n    <div className=\"grid gap-1.5\">\n      <Label htmlFor={id}>{label}</Label>\n      {children}\n    </div>\n  );\n}\n\nfunction StatusMetric({\n  label,\n  status,\n  score,\n}: {\n  label: string;\n  status: AdminReleaseApprovalSnapshotStatus;\n  score: number;\n}) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/30 p-2\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 flex items-center justify-between gap-2\">\n        <Badge variant={getStatusVariant(status)}>{status}</Badge>\n        <span className=\"font-mono text-sm\">{score}</span>\n      </div>\n    </div>\n  );\n}\n\nfunction SnapshotRow({ snapshot }: { snapshot: AdminReleaseApprovalSnapshot }) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-3 text-sm\">\n      <div className=\"flex flex-wrap items-start justify-between gap-2\">\n        <div className=\"min-w-0\">\n          <div className=\"truncate font-medium\">{snapshot.releaseLabel}</div>\n          <div className=\"mt-1 text-xs text-muted-foreground\">\n            {snapshot.reviewerEmail} at {formatDate(snapshot.createdAt)}\n          </div>\n        </div>\n        <div className=\"flex flex-wrap gap-1\">\n          <Badge variant={getStatusVariant(snapshot.preflightStatus)}>\n            preflight {snapshot.preflightScore}\n          </Badge>\n          <Badge variant={getStatusVariant(snapshot.incidentStatus)}>\n            incidents {snapshot.incidentScore}\n          </Badge>\n        </div>\n      </div>\n      <div className=\"mt-2 grid gap-2 text-xs md:grid-cols-2\">\n        <div className=\"truncate font-mono text-muted-foreground\">\n          {snapshot.commitSha}\n        </div>\n        <Button\n          asChild\n          type=\"button\"\n          size=\"sm\"\n          variant=\"ghost\"\n          className=\"h-6 justify-start px-1.5\"\n        >\n          <a href={snapshot.deploymentUrl} target=\"_blank\" rel=\"noreferrer\">\n            <ExternalLink className=\"size-3.5\" />\n            Deployment\n          </a>\n        </Button>\n      </div>\n      <div className=\"mt-2 flex flex-wrap gap-1\">\n        <Badge variant=\"outline\">\n          {snapshot.smokeArtifacts.length} smoke artifacts\n        </Badge>\n        <Badge variant=\"outline\">rollback captured</Badge>\n      </div>\n    </div>\n  );\n}\n\nfunction getStatusVariant(status: AdminReleaseApprovalSnapshotStatus) {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  return status === \"review\" ? \"secondary\" : \"outline\";\n}\n\nfunction formatDate(value: string) {\n  return new Intl.DateTimeFormat(undefined, {\n    dateStyle: \"medium\",\n    timeStyle: \"short\",\n  }).format(new Date(value));\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-release-approval-snapshots-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-release-approval-snapshots-panel-tsx-97a5aab1b8df2ef6.mjs",
  "kind": "tsx",
  "hash": "97a5aab1b8df2ef6",
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
      "specifier": "@/components/ui/input",
      "resolved_path": "src/components/ui/input.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-input-tsx-5c00dcef4bc2ae59.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/components/ui/label",
      "resolved_path": "src/components/ui/label.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-label-tsx-e0903213582531e3.mjs",
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
      "specifier": "@/features/admin/actions",
      "resolved_path": "src/features/admin/actions.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-actions-ts-7a34f9e31ee697de.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-release-approval-snapshots-export",
      "resolved_path": "src/features/admin/admin-release-approval-snapshots-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-approval-snapshots-export-ts-ddfbe0746969c2b1.mjs",
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
    "source_path": "src/features/admin/components/admin-release-approval-snapshots-panel.tsx",
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
        "specifier": "@/components/ui/input",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/label",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/textarea",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/actions",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/deploy-environment-preflight",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-operational-incidents",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-approval-snapshots",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-approval-snapshots-export",
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
      "AdminReleaseApprovalSnapshotsPanel"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3, dep4, dep5, dep6, dep7, dep8, dep9, dep10]);
export default dxSourceModule;
