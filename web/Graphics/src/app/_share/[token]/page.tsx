import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  Code2,
  Download,
  FileJson,
  Layers3,
  MessageSquare,
  Play,
  Shapes,
  Timer,
  TriangleAlert,
  Vote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSharedDesignFile } from "@/features/files/actions";
import { exportDocumentToSvg } from "@/features/editor/exporters/svg-exporter";
import { getDocumentStats } from "@/features/editor/document-stats";
import { getFacilitationReview } from "@/features/editor/facilitation-review";
import { getCanvasAnnotationSummary } from "@/features/editor/canvas-annotation-summary";
import {
  getComponentAnalyticsSummary,
  getComponentUsageAnalytics,
} from "@/features/editor/component-analytics";
import { getComponentIntegrityReview } from "@/features/editor/component-integrity-review";
import { getComponentVariableBindingReview } from "@/features/editor/component-variable-binding-review";
import { getComponentVariableCoverageReport } from "@/features/editor/component-variable-coverage";
import { SharedCommentHandoff } from "@/features/editor/components/shared-comment-handoff";
import { PublicRouteAnalyticsBeacon } from "@/features/public-route-analytics/components/public-route-analytics-beacon";

type SharedFilePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function SharedFilePage({ params }: SharedFilePageProps) {
  const { token } = await params;
  const file = await getSharedDesignFile(token);

  if (!file) {
    notFound();
  }

  const svg = exportDocumentToSvg(file.document);
  const stats = getDocumentStats(file.document);
  const components = Object.values(file.document.components ?? {});
  const componentAnalytics = getComponentUsageAnalytics(
    components,
    file.document.pages,
  );
  const componentSummary = getComponentAnalyticsSummary(
    components,
    componentAnalytics,
  );
  const componentIntegrity = getComponentIntegrityReview(
    components,
    file.document.pages,
    componentAnalytics,
  );
  const variableBindingReview = getComponentVariableBindingReview(
    file.document,
    components,
  );
  const variableCoverage = getComponentVariableCoverageReport(
    file.document,
    components,
  );
  const facilitationReview = getFacilitationReview(stats.activePage);
  const canvasReview = getCanvasAnnotationSummary(stats.activePage);
  const svgDownloadHref = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    svg,
  )}`;
  const jsonDownloadHref = `data:application/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(file.document, null, 2),
  )}`;
  const safeFileName = getSafeFileName(file.name);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicRouteAnalyticsBeacon routeKind="share" token={token} />
      <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-card px-4">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-medium">{file.name}</h1>
          <p className="text-xs text-muted-foreground">
            {formatPreset(file.permissionPreset)} shared file
          </p>
        </div>
        <div className="flex items-center gap-2">
          {file.allowDownload ? (
            <Button asChild size="sm" variant="secondary">
              <a href={jsonDownloadHref} download={`${safeFileName}.json`}>
                <FileJson className="size-4" />
                JSON
              </a>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="secondary">
            <a href={`/embed/${token}`} target="_blank" rel="noreferrer">
              <Code2 className="size-4" />
              Embed
            </a>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <a href={`/share/${token}/prototype`}>
              <Play className="size-4" />
              Prototype
            </a>
          </Button>
          {file.allowDownload ? (
            <Button asChild size="sm" variant="secondary">
              <a href={svgDownloadHref} download={`${safeFileName}.svg`}>
                <Download className="size-4" />
                SVG
              </a>
            </Button>
          ) : null}
        </div>
      </header>
      <section className="grid min-h-[calc(100vh-3.5rem)] overflow-auto lg:grid-cols-[minmax(0,1fr)_280px] lg:overflow-hidden">
        <div className="grid overflow-auto p-8">
          <div
            className="m-auto max-w-full overflow-auto rounded-md border border-border bg-card p-4 shadow-2xl shadow-black/25"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
        <aside className="border-t border-border bg-card/70 p-4 lg:border-l lg:border-t-0">
          <div className="space-y-4">
            <section className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Inspect
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Pages" value={stats.pageCount} />
                <StatCard label="Layers" value={stats.layerCount} />
                <StatCard label="Components" value={stats.componentCount} />
                <StatCard label="Variables" value={stats.variableCount} />
                <StatCard
                  label="Prototype starts"
                  value={stats.prototypeStartPages.length}
                />
                <StatCard label="Hotspots" value={stats.prototypeHotspotCount} />
                <StatCard
                  label="Broken links"
                  value={stats.brokenPrototypeHotspots.length}
                />
              </div>
            </section>
            <section className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Active Page
              </h2>
              <div className="rounded-md border border-border bg-background p-3">
                <div className="truncate text-sm font-medium">
                  {stats.activePage.name}
                </div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {stats.activePageBounds.width} x {stats.activePageBounds.height}
                </div>
              </div>
            </section>
            <section className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Facilitation
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <InfoPill
                  icon={<Vote className="size-3.5" />}
                  label="Votes"
                  value={facilitationReview.voteCount}
                />
                <InfoPill
                  icon={<TriangleAlert className="size-3.5" />}
                  label="Blocked"
                  value={facilitationReview.blockerCount}
                />
              </div>
              <div className="space-y-1.5">
                <FacilitationStateCard
                  icon={<Vote className="size-3.5" />}
                  label="Voting"
                  value={
                    facilitationReview.votingSession
                      ? `${facilitationReview.votingSession.name} / ${facilitationReview.votingSession.status} / ${facilitationReview.votingSession.voteBudget} votes`
                      : "No voting session"
                  }
                />
                <FacilitationStateCard
                  icon={<Timer className="size-3.5" />}
                  label="Timer"
                  value={
                    facilitationReview.reviewTimer
                      ? `${facilitationReview.reviewTimer.name} / ${facilitationReview.reviewTimer.status} / ${facilitationReview.reviewTimer.durationMinutes} min`
                      : "No review timer"
                  }
                />
              </div>
              {facilitationReview.rows.length > 0 ? (
                <div className="space-y-1.5">
                  {facilitationReview.rows.slice(0, 3).map((row) => (
                    <div
                      key={row.id}
                      className="rounded-md border border-border bg-background p-2.5 text-xs"
                    >
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <span className="truncate font-medium">{row.label}</span>
                        <span className="shrink-0 font-mono text-muted-foreground">
                          {row.status}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-muted-foreground">
                        {row.votes} votes / {row.assignee}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
            <section className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Prototype
              </h2>
              <div className="space-y-2">
                {stats.prototypeStartPages.length > 0 ? (
                  <div className="rounded-md border border-border bg-background p-3">
                    <div className="text-xs text-muted-foreground">
                      Start pages
                    </div>
                    <div className="mt-2 space-y-1">
                      {stats.prototypeStartPages.map((page) => (
                        <div
                          key={page.id}
                          className="truncate text-sm font-medium"
                        >
                          {page.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                    No prototype starting point has been marked.
                  </div>
                )}
                {stats.activePagePrototypeHotspots.length > 0 ? (
                  <div className="space-y-1.5">
                    {stats.activePagePrototypeHotspots.map((hotspot) => (
                      <div
                        key={hotspot.id}
                        className="rounded-md border border-border bg-background p-2.5 text-xs"
                      >
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="truncate font-medium">
                            {hotspot.name}
                          </span>
                          <span className="shrink-0 font-mono text-muted-foreground">
                            {hotspot.durationMs}ms
                          </span>
                        </div>
                        <div className="mt-1 truncate text-muted-foreground">
                          {hotspot.trigger} {"->"} {hotspot.targetPageName}
                        </div>
                        <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                          {hotspot.transition}
                          {hotspot.preserveScroll ? " / preserve scroll" : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                    No hotspots on the active page.
                  </div>
                )}
                {stats.brokenPrototypeHotspots.length > 0 ? (
                  <div className="space-y-1.5 rounded-md border border-red-400/30 bg-red-500/10 p-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-red-100">
                      <TriangleAlert className="size-3.5" />
                      Broken prototype targets
                    </div>
                    {stats.brokenPrototypeHotspots.map((hotspot) => (
                      <div
                        key={`${hotspot.pageName}-${hotspot.layerName}-${hotspot.targetPageId}`}
                        className="text-xs text-red-100/80"
                      >
                        {hotspot.pageName} / {hotspot.layerName} points to{" "}
                        <span className="font-mono">{hotspot.targetPageId}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
            <section className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Canvas Review
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <InfoPill
                  icon={<Shapes className="size-3.5" />}
                  label="Connectors"
                  value={canvasReview.connectorCount}
                />
                <InfoPill
                  icon={<TriangleAlert className="size-3.5" />}
                  label="Broken"
                  value={canvasReview.brokenConnectorCount}
                />
                <InfoPill
                  icon={<Vote className="size-3.5" />}
                  label="Stamps"
                  value={canvasReview.stampCount}
                />
                <InfoPill
                  icon={<Layers3 className="size-3.5" />}
                  label="Ink"
                  value={canvasReview.inkCount}
                />
              </div>
              <div className="space-y-1.5">
                {[...canvasReview.stampCounts, ...canvasReview.inkCounts].map(
                  (item) => (
                    <div
                      key={`${item.label}-${item.count}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-xs"
                    >
                      <span className="truncate text-muted-foreground">
                        {item.label}
                      </span>
                      <span className="font-mono">{item.count}</span>
                    </div>
                  ),
                )}
              </div>
              {canvasReview.rows.length > 0 ? (
                <div className="space-y-1.5">
                  {canvasReview.rows.slice(0, 5).map((row) => (
                    <div
                      key={row.id}
                      className="rounded-md border border-border bg-background p-2.5 text-xs"
                    >
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <span className="truncate font-medium">{row.label}</span>
                        <span
                          className={
                            row.status === "review"
                              ? "shrink-0 text-red-200"
                              : "shrink-0 text-emerald-200"
                          }
                        >
                          {row.status}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-muted-foreground">
                        {row.detail}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No connectors, stamps, or ink annotations on this page.
                </div>
              )}
            </section>
            <section className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Library
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <InfoPill
                  icon={<Shapes className="size-3.5" />}
                  label="Components"
                  value={componentSummary.componentCount}
                />
                <InfoPill
                  icon={<Layers3 className="size-3.5" />}
                  label="Instances"
                  value={componentSummary.instanceCount}
                />
                <InfoPill
                  icon={<TriangleAlert className="size-3.5" />}
                  label="Issues"
                  value={componentIntegrity.issueCount}
                />
                <InfoPill
                  icon={<Vote className="size-3.5" />}
                  label="Tokens"
                  value={variableCoverage.coveragePercent}
                />
                <InfoPill
                  icon={<TriangleAlert className="size-3.5" />}
                  label="Stale vars"
                  value={variableBindingReview.issueCount}
                />
              </div>
              {components.length > 0 && variableCoverage.coveragePercent < 80 ? (
                <div className="rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">
                  Component source variable coverage is{" "}
                  {variableCoverage.coveragePercent}% with{" "}
                  {variableCoverage.matchingRawPropertyCount} raw properties ready
                  to bind.
                </div>
              ) : null}
              {variableBindingReview.issues.length > 0 ? (
                <div className="space-y-1.5">
                  {variableBindingReview.issues.slice(0, 3).map((issue) => (
                    <div
                      key={issue.id}
                      className="rounded-md border border-border bg-background p-2.5 text-xs"
                    >
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <span className="truncate font-medium">
                          {issue.layerName}
                        </span>
                        <span className="shrink-0 text-amber-200">
                          {issue.type.replaceAll("-", " ")}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-muted-foreground">
                        {issue.componentName} / {issue.propertyLabel}
                      </div>
                    </div>
                  ))}
                </div>
              ) : componentIntegrity.issues.length > 0 ? (
                <div className="space-y-1.5">
                  {componentIntegrity.issues.slice(0, 4).map((issue) => (
                    <div
                      key={issue.id}
                      className="rounded-md border border-border bg-background p-2.5 text-xs"
                    >
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <span className="truncate font-medium">
                          {issue.layerName ?? issue.componentName}
                        </span>
                        <span className="shrink-0 text-amber-200">
                          {issue.type.replaceAll("-", " ")}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-muted-foreground">
                        {issue.detail}
                      </div>
                    </div>
                  ))}
                </div>
              ) : components.length > 0 ? (
                <div className="rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
                  Component library references are consistent.
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No components in this shared file.
                </div>
              )}
            </section>
            <section className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Layer Breakdown
              </h2>
              <div className="space-y-1.5">
                {stats.layerTypeCounts.length > 0 ? (
                  stats.layerTypeCounts.map((item) => (
                    <div
                      key={item.type}
                      className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2 capitalize">
                        <Layers3 className="size-3.5 text-muted-foreground" />
                        <span className="truncate">{item.type}</span>
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {item.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                    No layers on this page.
                  </div>
                )}
              </div>
            </section>
            <section className="grid grid-cols-2 gap-2">
              <InfoPill
                icon={<MessageSquare className="size-3.5" />}
                label="Comments"
                value={stats.commentCount}
              />
              <InfoPill
                icon={<Shapes className="size-3.5" />}
                label="Open"
                value={stats.unresolvedCommentCount}
              />
            </section>
            {file.allowComments ? (
              <SharedCommentHandoff comments={stats.activePage.comments ?? []} />
            ) : null}
          </div>
        </aside>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background p-2.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm">{value}</div>
    </div>
  );
}

function FacilitationStateCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-2.5 text-xs">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  );
}

function InfoPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-background p-2 text-xs text-muted-foreground">
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function getSafeFileName(value: string) {
  return value.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "design";
}

function formatPreset(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
