import {
  BarChart3,
  ClipboardCopy,
  Download,
  ExternalLink,
  FileJson2,
  GitFork,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAdminEmbedRouteAnalyticsJoinCsv,
  getAdminEmbedRouteAnalyticsJoinJson,
  getAdminEmbedRouteAnalyticsJoinMarkdown,
  type AdminEmbedRouteAnalyticsJoinReport,
  type AdminEmbedRouteAnalyticsJoinStatus,
} from "@/features/admin/admin-embed-route-analytics-join";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminEmbedRouteAnalyticsJoinPanelProps = {
  report: AdminEmbedRouteAnalyticsJoinReport;
};

export function AdminEmbedRouteAnalyticsJoinPanel({
  report,
}: AdminEmbedRouteAnalyticsJoinPanelProps) {
  function exportJson() {
    downloadTextFile({
      filename: "embed-route-analytics-join.json",
      content: getAdminEmbedRouteAnalyticsJoinJson(report),
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      filename: "embed-route-analytics-join.csv",
      content: getAdminEmbedRouteAnalyticsJoinCsv(report),
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      filename: "embed-route-analytics-join.md",
      content: getAdminEmbedRouteAnalyticsJoinMarkdown(report),
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminEmbedRouteAnalyticsJoinMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <GitFork className="size-4" />
            Embed route analytics join
          </CardTitle>
          <CardDescription>
            Joined route funnels, referrer health, public-link exposure, embed
            host evidence, and admin exports for presentations and Sites routes.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Button type="button" size="sm" variant="outline" onClick={exportJson}>
            <FileJson2 className="size-3.5" />
            JSON
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
            <Download className="size-3.5" />
            CSV
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={exportMarkdown}
          >
            <Download className="size-3.5" />
            MD
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={copyMarkdown}
          >
            <ClipboardCopy className="size-3.5" />
            Copy
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Funnels" value={report.routeFunnelCount} />
          <Metric label="Events" value={report.totalRouteEventCount} />
          <Metric label="External" value={report.externalReferrerOriginCount} />
          <Metric label="Blocked" value={report.blockedObservedOriginCount} />
          <Metric label="Exposure" value={report.downloadExposureCount} />
          <Metric label="Exports" value={report.adminExportCount} />
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-3">
            {report.routeFunnels.slice(0, 8).map((funnel) => (
              <div
                key={funnel.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      <BarChart3 className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{funnel.fileName}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant={getStatusVariant(funnel.status)}>
                        {funnel.status}
                      </Badge>
                      <Badge variant="outline">
                        share {funnel.shareEvents}
                      </Badge>
                      <Badge variant="outline">
                        prototype {funnel.prototypeEvents}
                      </Badge>
                      <Badge variant="outline">embed {funnel.embedEvents}</Badge>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-muted-foreground">
                    {funnel.latestAt ? formatDate(funnel.latestAt) : "no events"}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
                  <Info
                    label="Share to prototype"
                    value={`${funnel.shareToPrototypePercent}%`}
                  />
                  <Info
                    label="Prototype to embed"
                    value={`${funnel.prototypeToEmbedPercent}%`}
                  />
                  <Info
                    label="Missing"
                    value={funnel.missingRouteKinds.join(", ") || "none"}
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {funnel.recommendation}
                </p>
              </div>
            ))}
          </div>

          <div className="grid content-start gap-3">
            {report.rows.slice(0, 9).map((row) => (
              <div
                key={row.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate text-sm font-medium">
                    {row.label}
                  </div>
                  <Badge variant={getStatusVariant(row.status)}>
                    {row.status}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline">{row.category}</Badge>
                  <Badge variant="secondary">{row.count}</Badge>
                  {row.category === "referrer-health" ? (
                    <Badge variant="outline">
                      <ExternalLink className="size-3" />
                      referrer
                    </Badge>
                  ) : null}
                  {row.category === "exposure-review" ? (
                    <Badge variant="outline">
                      <ShieldCheck className="size-3" />
                      exposure
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{row.detail}</p>
                <p className="mt-2 text-xs">{row.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium">{value}</div>
    </div>
  );
}

function getStatusVariant(status: AdminEmbedRouteAnalyticsJoinStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
