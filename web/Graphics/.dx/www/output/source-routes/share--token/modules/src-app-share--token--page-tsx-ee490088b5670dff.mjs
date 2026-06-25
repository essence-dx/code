import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-editor-canvas-annotation-summary-ts-fc5320adc1c54bfc.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-features-editor-component-analytics-ts-6d341d58b5af3d16.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-editor-component-integrity-review-ts-fbd7632489c1ed1c.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-editor-component-variable-binding-review-ts-d142cac4569df1b3.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-features-editor-component-variable-coverage-ts-dfe8b461570365ce.mjs";
import { dxSourceModule as dep6, dxRuntimeExports as dep6Runtime } from "./src-features-editor-components-shared-comment-handoff-tsx-1bd4ee5f217aa1dc.mjs";
import { dxSourceModule as dep7, dxRuntimeExports as dep7Runtime } from "./src-features-editor-document-stats-ts-a755d567b350cb73.mjs";
import { dxSourceModule as dep8, dxRuntimeExports as dep8Runtime } from "./src-features-editor-exporters-svg-exporter-ts-efc4c8cf16561b46.mjs";
import { dxSourceModule as dep9, dxRuntimeExports as dep9Runtime } from "./src-features-editor-facilitation-review-ts-b177ae2657b5d4fe.mjs";
import { dxSourceModule as dep10, dxRuntimeExports as dep10Runtime } from "./src-features-files-actions-ts-61b6d2d04803c056.mjs";
import { dxSourceModule as dep11, dxRuntimeExports as dep11Runtime } from "./src-features-public-route-analytics-components-public-route-analytics-beacon-tsx-e625d5faf9617e0a.mjs";
import { dxSourceModule as dep12, dxRuntimeExports as dep12Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "import { notFound } from \"next/navigation\";\nimport type { ReactNode } from \"react\";\nimport {\n  Code2,\n  Download,\n  FileJson,\n  Layers3,\n  MessageSquare,\n  Play,\n  Shapes,\n  Timer,\n  TriangleAlert,\n  Vote,\n} from \"lucide-react\";\nimport { Button } from \"@/components/ui/button\";\nimport { getSharedDesignFile } from \"@/features/files/actions\";\nimport { exportDocumentToSvg } from \"@/features/editor/exporters/svg-exporter\";\nimport { getDocumentStats } from \"@/features/editor/document-stats\";\nimport { getFacilitationReview } from \"@/features/editor/facilitation-review\";\nimport { getCanvasAnnotationSummary } from \"@/features/editor/canvas-annotation-summary\";\nimport {\n  getComponentAnalyticsSummary,\n  getComponentUsageAnalytics,\n} from \"@/features/editor/component-analytics\";\nimport { getComponentIntegrityReview } from \"@/features/editor/component-integrity-review\";\nimport { getComponentVariableBindingReview } from \"@/features/editor/component-variable-binding-review\";\nimport { getComponentVariableCoverageReport } from \"@/features/editor/component-variable-coverage\";\nimport { SharedCommentHandoff } from \"@/features/editor/components/shared-comment-handoff\";\nimport { PublicRouteAnalyticsBeacon } from \"@/features/public-route-analytics/components/public-route-analytics-beacon\";\n\ntype SharedFilePageProps = {\n  params: Promise<{\n    token: string;\n  }>;\n};\n\nexport default async function SharedFilePage({ params }: SharedFilePageProps) {\n  const { token } = await params;\n  const file = await getSharedDesignFile(token);\n\n  if (!file) {\n    notFound();\n  }\n\n  const svg = exportDocumentToSvg(file.document);\n  const stats = getDocumentStats(file.document);\n  const components = Object.values(file.document.components ?? {});\n  const componentAnalytics = getComponentUsageAnalytics(\n    components,\n    file.document.pages,\n  );\n  const componentSummary = getComponentAnalyticsSummary(\n    components,\n    componentAnalytics,\n  );\n  const componentIntegrity = getComponentIntegrityReview(\n    components,\n    file.document.pages,\n    componentAnalytics,\n  );\n  const variableBindingReview = getComponentVariableBindingReview(\n    file.document,\n    components,\n  );\n  const variableCoverage = getComponentVariableCoverageReport(\n    file.document,\n    components,\n  );\n  const facilitationReview = getFacilitationReview(stats.activePage);\n  const canvasReview = getCanvasAnnotationSummary(stats.activePage);\n  const svgDownloadHref = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(\n    svg,\n  )}`;\n  const jsonDownloadHref = `data:application/json;charset=utf-8,${encodeURIComponent(\n    JSON.stringify(file.document, null, 2),\n  )}`;\n  const safeFileName = getSafeFileName(file.name);\n\n  return (\n    <main className=\"min-h-screen bg-background text-foreground\">\n      <PublicRouteAnalyticsBeacon routeKind=\"share\" token={token} />\n      <header className=\"flex h-14 items-center justify-between gap-4 border-b border-border bg-card px-4\">\n        <div className=\"min-w-0\">\n          <h1 className=\"truncate text-sm font-medium\">{file.name}</h1>\n          <p className=\"text-xs text-muted-foreground\">\n            {formatPreset(file.permissionPreset)} shared file\n          </p>\n        </div>\n        <div className=\"flex items-center gap-2\">\n          {file.allowDownload ? (\n            <Button asChild size=\"sm\" variant=\"secondary\">\n              <a href={jsonDownloadHref} download={`${safeFileName}.json`}>\n                <FileJson className=\"size-4\" />\n                JSON\n              </a>\n            </Button>\n          ) : null}\n          <Button asChild size=\"sm\" variant=\"secondary\">\n            <a href={`/embed/${token}`} target=\"_blank\" rel=\"noreferrer\">\n              <Code2 className=\"size-4\" />\n              Embed\n            </a>\n          </Button>\n          <Button asChild size=\"sm\" variant=\"secondary\">\n            <a href={`/share/${token}/prototype`}>\n              <Play className=\"size-4\" />\n              Prototype\n            </a>\n          </Button>\n          {file.allowDownload ? (\n            <Button asChild size=\"sm\" variant=\"secondary\">\n              <a href={svgDownloadHref} download={`${safeFileName}.svg`}>\n                <Download className=\"size-4\" />\n                SVG\n              </a>\n            </Button>\n          ) : null}\n        </div>\n      </header>\n      <section className=\"grid min-h-[calc(100vh-3.5rem)] overflow-auto lg:grid-cols-[minmax(0,1fr)_280px] lg:overflow-hidden\">\n        <div className=\"grid overflow-auto p-8\">\n          <div\n            className=\"m-auto max-w-full overflow-auto rounded-md border border-border bg-card p-4 shadow-2xl shadow-black/25\"\n            dangerouslySetInnerHTML={{ __html: svg }}\n          />\n        </div>\n        <aside className=\"border-t border-border bg-card/70 p-4 lg:border-l lg:border-t-0\">\n          <div className=\"space-y-4\">\n            <section className=\"space-y-2\">\n              <h2 className=\"text-xs font-medium uppercase tracking-wide text-muted-foreground\">\n                Handoff\n              </h2>\n              <div className=\"grid grid-cols-2 gap-2\">\n                <StatCard label=\"Pages\" value={stats.pageCount} />\n                <StatCard label=\"Layers\" value={stats.layerCount} />\n                <StatCard label=\"Components\" value={stats.componentCount} />\n                <StatCard label=\"Variables\" value={stats.variableCount} />\n                <StatCard\n                  label=\"Prototype starts\"\n                  value={stats.prototypeStartPages.length}\n                />\n                <StatCard label=\"Hotspots\" value={stats.prototypeHotspotCount} />\n                <StatCard\n                  label=\"Broken links\"\n                  value={stats.brokenPrototypeHotspots.length}\n                />\n              </div>\n            </section>\n            <section className=\"space-y-2\">\n              <h2 className=\"text-xs font-medium uppercase tracking-wide text-muted-foreground\">\n                Active Page\n              </h2>\n              <div className=\"rounded-md border border-border bg-background p-3\">\n                <div className=\"truncate text-sm font-medium\">\n                  {stats.activePage.name}\n                </div>\n                <div className=\"mt-1 font-mono text-xs text-muted-foreground\">\n                  {stats.activePageBounds.width} x {stats.activePageBounds.height}\n                </div>\n              </div>\n            </section>\n            <section className=\"space-y-2\">\n              <h2 className=\"text-xs font-medium uppercase tracking-wide text-muted-foreground\">\n                Facilitation\n              </h2>\n              <div className=\"grid grid-cols-2 gap-2\">\n                <InfoPill\n                  icon={<Vote className=\"size-3.5\" />}\n                  label=\"Votes\"\n                  value={facilitationReview.voteCount}\n                />\n                <InfoPill\n                  icon={<TriangleAlert className=\"size-3.5\" />}\n                  label=\"Blocked\"\n                  value={facilitationReview.blockerCount}\n                />\n              </div>\n              <div className=\"space-y-1.5\">\n                <FacilitationStateCard\n                  icon={<Vote className=\"size-3.5\" />}\n                  label=\"Voting\"\n                  value={\n                    facilitationReview.votingSession\n                      ? `${facilitationReview.votingSession.name} / ${facilitationReview.votingSession.status} / ${facilitationReview.votingSession.voteBudget} votes`\n                      : \"No voting session\"\n                  }\n                />\n                <FacilitationStateCard\n                  icon={<Timer className=\"size-3.5\" />}\n                  label=\"Timer\"\n                  value={\n                    facilitationReview.reviewTimer\n                      ? `${facilitationReview.reviewTimer.name} / ${facilitationReview.reviewTimer.status} / ${facilitationReview.reviewTimer.durationMinutes} min`\n                      : \"No review timer\"\n                  }\n                />\n              </div>\n              {facilitationReview.rows.length > 0 ? (\n                <div className=\"space-y-1.5\">\n                  {facilitationReview.rows.slice(0, 3).map((row) => (\n                    <div\n                      key={row.id}\n                      className=\"rounded-md border border-border bg-background p-2.5 text-xs\"\n                    >\n                      <div className=\"flex min-w-0 items-center justify-between gap-2\">\n                        <span className=\"truncate font-medium\">{row.label}</span>\n                        <span className=\"shrink-0 font-mono text-muted-foreground\">\n                          {row.status}\n                        </span>\n                      </div>\n                      <div className=\"mt-1 truncate text-muted-foreground\">\n                        {row.votes} votes / {row.assignee}\n                      </div>\n                    </div>\n                  ))}\n                </div>\n              ) : null}\n            </section>\n            <section className=\"space-y-2\">\n              <h2 className=\"text-xs font-medium uppercase tracking-wide text-muted-foreground\">\n                Prototype\n              </h2>\n              <div className=\"space-y-2\">\n                {stats.prototypeStartPages.length > 0 ? (\n                  <div className=\"rounded-md border border-border bg-background p-3\">\n                    <div className=\"text-xs text-muted-foreground\">\n                      Start pages\n                    </div>\n                    <div className=\"mt-2 space-y-1\">\n                      {stats.prototypeStartPages.map((page) => (\n                        <div\n                          key={page.id}\n                          className=\"truncate text-sm font-medium\"\n                        >\n                          {page.name}\n                        </div>\n                      ))}\n                    </div>\n                  </div>\n                ) : (\n                  <div className=\"rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground\">\n                    No prototype starting point has been marked.\n                  </div>\n                )}\n                {stats.activePagePrototypeHotspots.length > 0 ? (\n                  <div className=\"space-y-1.5\">\n                    {stats.activePagePrototypeHotspots.map((hotspot) => (\n                      <div\n                        key={hotspot.id}\n                        className=\"rounded-md border border-border bg-background p-2.5 text-xs\"\n                      >\n                        <div className=\"flex min-w-0 items-center justify-between gap-2\">\n                          <span className=\"truncate font-medium\">\n                            {hotspot.name}\n                          </span>\n                          <span className=\"shrink-0 font-mono text-muted-foreground\">\n                            {hotspot.durationMs}ms\n                          </span>\n                        </div>\n                        <div className=\"mt-1 truncate text-muted-foreground\">\n                          {hotspot.trigger} {\"->\"} {hotspot.targetPageName}\n                        </div>\n                        <div className=\"mt-1 truncate font-mono text-[10px] text-muted-foreground\">\n                          {hotspot.transition}\n                          {hotspot.preserveScroll ? \" / preserve scroll\" : \"\"}\n                        </div>\n                      </div>\n                    ))}\n                  </div>\n                ) : (\n                  <div className=\"rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground\">\n                    No hotspots on the active page.\n                  </div>\n                )}\n                {stats.brokenPrototypeHotspots.length > 0 ? (\n                  <div className=\"space-y-1.5 rounded-md border border-red-400/30 bg-red-500/10 p-3\">\n                    <div className=\"flex items-center gap-2 text-xs font-medium text-red-100\">\n                      <TriangleAlert className=\"size-3.5\" />\n                      Broken prototype targets\n                    </div>\n                    {stats.brokenPrototypeHotspots.map((hotspot) => (\n                      <div\n                        key={`${hotspot.pageName}-${hotspot.layerName}-${hotspot.targetPageId}`}\n                        className=\"text-xs text-red-100/80\"\n                      >\n                        {hotspot.pageName} / {hotspot.layerName} points to{\" \"}\n                        <span className=\"font-mono\">{hotspot.targetPageId}</span>\n                      </div>\n                    ))}\n                  </div>\n                ) : null}\n              </div>\n            </section>\n            <section className=\"space-y-2\">\n              <h2 className=\"text-xs font-medium uppercase tracking-wide text-muted-foreground\">\n                Canvas Review\n              </h2>\n              <div className=\"grid grid-cols-2 gap-2\">\n                <InfoPill\n                  icon={<Shapes className=\"size-3.5\" />}\n                  label=\"Connectors\"\n                  value={canvasReview.connectorCount}\n                />\n                <InfoPill\n                  icon={<TriangleAlert className=\"size-3.5\" />}\n                  label=\"Broken\"\n                  value={canvasReview.brokenConnectorCount}\n                />\n                <InfoPill\n                  icon={<Vote className=\"size-3.5\" />}\n                  label=\"Stamps\"\n                  value={canvasReview.stampCount}\n                />\n                <InfoPill\n                  icon={<Layers3 className=\"size-3.5\" />}\n                  label=\"Ink\"\n                  value={canvasReview.inkCount}\n                />\n              </div>\n              <div className=\"space-y-1.5\">\n                {[...canvasReview.stampCounts, ...canvasReview.inkCounts].map(\n                  (item) => (\n                    <div\n                      key={`${item.label}-${item.count}`}\n                      className=\"flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-xs\"\n                    >\n                      <span className=\"truncate text-muted-foreground\">\n                        {item.label}\n                      </span>\n                      <span className=\"font-mono\">{item.count}</span>\n                    </div>\n                  ),\n                )}\n              </div>\n              {canvasReview.rows.length > 0 ? (\n                <div className=\"space-y-1.5\">\n                  {canvasReview.rows.slice(0, 5).map((row) => (\n                    <div\n                      key={row.id}\n                      className=\"rounded-md border border-border bg-background p-2.5 text-xs\"\n                    >\n                      <div className=\"flex min-w-0 items-center justify-between gap-2\">\n                        <span className=\"truncate font-medium\">{row.label}</span>\n                        <span\n                          className={\n                            row.status === \"review\"\n                              ? \"shrink-0 text-red-200\"\n                              : \"shrink-0 text-emerald-200\"\n                          }\n                        >\n                          {row.status}\n                        </span>\n                      </div>\n                      <div className=\"mt-1 truncate text-muted-foreground\">\n                        {row.detail}\n                      </div>\n                    </div>\n                  ))}\n                </div>\n              ) : (\n                <div className=\"rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground\">\n                  No connectors, stamps, or ink annotations on this page.\n                </div>\n              )}\n            </section>\n            <section className=\"space-y-2\">\n              <h2 className=\"text-xs font-medium uppercase tracking-wide text-muted-foreground\">\n                Library\n              </h2>\n              <div className=\"grid grid-cols-2 gap-2\">\n                <InfoPill\n                  icon={<Shapes className=\"size-3.5\" />}\n                  label=\"Components\"\n                  value={componentSummary.componentCount}\n                />\n                <InfoPill\n                  icon={<Layers3 className=\"size-3.5\" />}\n                  label=\"Instances\"\n                  value={componentSummary.instanceCount}\n                />\n                <InfoPill\n                  icon={<TriangleAlert className=\"size-3.5\" />}\n                  label=\"Issues\"\n                  value={componentIntegrity.issueCount}\n                />\n                <InfoPill\n                  icon={<Vote className=\"size-3.5\" />}\n                  label=\"Tokens\"\n                  value={variableCoverage.coveragePercent}\n                />\n                <InfoPill\n                  icon={<TriangleAlert className=\"size-3.5\" />}\n                  label=\"Stale vars\"\n                  value={variableBindingReview.issueCount}\n                />\n              </div>\n              {components.length > 0 && variableCoverage.coveragePercent < 80 ? (\n                <div className=\"rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100\">\n                  Component source variable coverage is{\" \"}\n                  {variableCoverage.coveragePercent}% with{\" \"}\n                  {variableCoverage.matchingRawPropertyCount} raw properties ready\n                  to bind.\n                </div>\n              ) : null}\n              {variableBindingReview.issues.length > 0 ? (\n                <div className=\"space-y-1.5\">\n                  {variableBindingReview.issues.slice(0, 3).map((issue) => (\n                    <div\n                      key={issue.id}\n                      className=\"rounded-md border border-border bg-background p-2.5 text-xs\"\n                    >\n                      <div className=\"flex min-w-0 items-center justify-between gap-2\">\n                        <span className=\"truncate font-medium\">\n                          {issue.layerName}\n                        </span>\n                        <span className=\"shrink-0 text-amber-200\">\n                          {issue.type.replaceAll(\"-\", \" \")}\n                        </span>\n                      </div>\n                      <div className=\"mt-1 truncate text-muted-foreground\">\n                        {issue.componentName} / {issue.propertyLabel}\n                      </div>\n                    </div>\n                  ))}\n                </div>\n              ) : componentIntegrity.issues.length > 0 ? (\n                <div className=\"space-y-1.5\">\n                  {componentIntegrity.issues.slice(0, 4).map((issue) => (\n                    <div\n                      key={issue.id}\n                      className=\"rounded-md border border-border bg-background p-2.5 text-xs\"\n                    >\n                      <div className=\"flex min-w-0 items-center justify-between gap-2\">\n                        <span className=\"truncate font-medium\">\n                          {issue.layerName ?? issue.componentName}\n                        </span>\n                        <span className=\"shrink-0 text-amber-200\">\n                          {issue.type.replaceAll(\"-\", \" \")}\n                        </span>\n                      </div>\n                      <div className=\"mt-1 truncate text-muted-foreground\">\n                        {issue.detail}\n                      </div>\n                    </div>\n                  ))}\n                </div>\n              ) : components.length > 0 ? (\n                <div className=\"rounded-md border border-border bg-background p-3 text-sm text-muted-foreground\">\n                  Component library references are consistent.\n                </div>\n              ) : (\n                <div className=\"rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground\">\n                  No components in this shared file.\n                </div>\n              )}\n            </section>\n            <section className=\"space-y-2\">\n              <h2 className=\"text-xs font-medium uppercase tracking-wide text-muted-foreground\">\n                Layer Breakdown\n              </h2>\n              <div className=\"space-y-1.5\">\n                {stats.layerTypeCounts.length > 0 ? (\n                  stats.layerTypeCounts.map((item) => (\n                    <div\n                      key={item.type}\n                      className=\"flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-sm\"\n                    >\n                      <span className=\"flex min-w-0 items-center gap-2 capitalize\">\n                        <Layers3 className=\"size-3.5 text-muted-foreground\" />\n                        <span className=\"truncate\">{item.type}</span>\n                      </span>\n                      <span className=\"font-mono text-xs text-muted-foreground\">\n                        {item.count}\n                      </span>\n                    </div>\n                  ))\n                ) : (\n                  <div className=\"rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground\">\n                    No layers on this page.\n                  </div>\n                )}\n              </div>\n            </section>\n            <section className=\"grid grid-cols-2 gap-2\">\n              <InfoPill\n                icon={<MessageSquare className=\"size-3.5\" />}\n                label=\"Comments\"\n                value={stats.commentCount}\n              />\n              <InfoPill\n                icon={<Shapes className=\"size-3.5\" />}\n                label=\"Open\"\n                value={stats.unresolvedCommentCount}\n              />\n            </section>\n            {file.allowComments ? (\n              <SharedCommentHandoff comments={stats.activePage.comments ?? []} />\n            ) : null}\n          </div>\n        </aside>\n      </section>\n    </main>\n  );\n}\n\nfunction StatCard({ label, value }: { label: string; value: number }) {\n  return (\n    <div className=\"rounded-md border border-border bg-background p-2.5\">\n      <div className=\"text-[11px] text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 font-mono text-sm\">{value}</div>\n    </div>\n  );\n}\n\nfunction FacilitationStateCard({\n  icon,\n  label,\n  value,\n}: {\n  icon: ReactNode;\n  label: string;\n  value: string;\n}) {\n  return (\n    <div className=\"rounded-md border border-border bg-background p-2.5 text-xs\">\n      <div className=\"flex items-center gap-2 text-muted-foreground\">\n        {icon}\n        <span>{label}</span>\n      </div>\n      <div className=\"mt-1 truncate text-sm font-medium\">{value}</div>\n    </div>\n  );\n}\n\nfunction InfoPill({\n  icon,\n  label,\n  value,\n}: {\n  icon: ReactNode;\n  label: string;\n  value: number;\n}) {\n  return (\n    <div className=\"flex items-center gap-2 rounded-md border border-border bg-background p-2 text-xs text-muted-foreground\">\n      {icon}\n      <span className=\"min-w-0 flex-1 truncate\">{label}</span>\n      <span className=\"font-mono\">{value}</span>\n    </div>\n  );\n}\n\nfunction getSafeFileName(value: string) {\n  return value.replace(/[^\\w.-]+/g, \"-\").replace(/^-+|-+$/g, \"\") || \"design\";\n}\n\nfunction formatPreset(value: string) {\n  return value\n    .split(\"-\")\n    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))\n    .join(\" \");\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/app/share/[token]/page.tsx",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-app-share--token--page-tsx-ee490088b5670dff.mjs",
  "kind": "tsx",
  "hash": "ee490088b5670dff",
  "dependencies": [
    {
      "specifier": "@/components/ui/button",
      "resolved_path": "src/components/ui/button.tsx",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-components-ui-button-tsx-a045a54d4568e98d.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/canvas-annotation-summary",
      "resolved_path": "src/features/editor/canvas-annotation-summary.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-canvas-annotation-summary-ts-fc5320adc1c54bfc.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/component-analytics",
      "resolved_path": "src/features/editor/component-analytics.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-component-analytics-ts-6d341d58b5af3d16.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/component-integrity-review",
      "resolved_path": "src/features/editor/component-integrity-review.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-component-integrity-review-ts-fbd7632489c1ed1c.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/component-variable-binding-review",
      "resolved_path": "src/features/editor/component-variable-binding-review.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-component-variable-binding-review-ts-d142cac4569df1b3.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/component-variable-coverage",
      "resolved_path": "src/features/editor/component-variable-coverage.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-component-variable-coverage-ts-dfe8b461570365ce.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/components/shared-comment-handoff",
      "resolved_path": "src/features/editor/components/shared-comment-handoff.tsx",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-components-shared-comment-handoff-tsx-1bd4ee5f217aa1dc.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/document-stats",
      "resolved_path": "src/features/editor/document-stats.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-document-stats-ts-a755d567b350cb73.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/exporters/svg-exporter",
      "resolved_path": "src/features/editor/exporters/svg-exporter.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-exporters-svg-exporter-ts-efc4c8cf16561b46.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/facilitation-review",
      "resolved_path": "src/features/editor/facilitation-review.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-facilitation-review-ts-b177ae2657b5d4fe.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/files/actions",
      "resolved_path": "src/features/files/actions.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-files-actions-ts-61b6d2d04803c056.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/public-route-analytics/components/public-route-analytics-beacon",
      "resolved_path": "src/features/public-route-analytics/components/public-route-analytics-beacon.tsx",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-public-route-analytics-components-public-route-analytics-beacon-tsx-e625d5faf9617e0a.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "lucide-react",
      "resolved_path": "src/lib/forge/icons/lucide-react.tsx",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs",
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
    }
  ],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/app/share/[token]/page.tsx",
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
    "directives": [],
    "static_imports": [
      {
        "specifier": "next/navigation",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "react",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "lucide-react",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/button",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/files/actions",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/exporters/svg-exporter",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/document-stats",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/facilitation-review",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/canvas-annotation-summary",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/component-analytics",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/component-integrity-review",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/component-variable-binding-review",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/component-variable-coverage",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/components/shared-comment-handoff",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/public-route-analytics/components/public-route-analytics-beacon",
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
    "export_names": [],
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3, dep4, dep5, dep6, dep7, dep8, dep9, dep10, dep11, dep12]);
export default dxSourceModule;
