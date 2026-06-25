import {
  BarChart3,
  ClipboardCopy,
  Download,
  ExternalLink,
  FileJson2,
  Globe2,
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
import type {
  AdminPublicRouteAnalyticsReport,
  AdminPublicRouteAnalyticsStatus,
} from "@/features/admin/admin-public-route-analytics";
import {
  getAdminPublicRouteAnalyticsCsv,
  getAdminPublicRouteAnalyticsJson,
  getAdminPublicRouteAnalyticsMarkdown,
} from "@/features/admin/admin-public-route-analytics-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminPublicRouteAnalyticsPanelProps = {
  report: AdminPublicRouteAnalyticsReport;
};

export function AdminPublicRouteAnalyticsPanel({
  report,
}: AdminPublicRouteAnalyticsPanelProps) {
  function exportJson() {
    downloadTextFile({
      filename: "public-route-analytics.json",
      content: getAdminPublicRouteAnalyticsJson(report),
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      filename: "public-route-analytics.csv",
      content: getAdminPublicRouteAnalyticsCsv(report),
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      filename: "public-route-analytics.md",
      content: getAdminPublicRouteAnalyticsMarkdown(report),
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminPublicRouteAnalyticsMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-4" />
            Public route analytics
          </CardTitle>
          <CardDescription>
            Privacy-safe share, prototype, and embed visits with referrer
            origins, user-agent families, token scopes, retention windows, and
            release evidence exports.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Badge variant={report.storageAvailable ? "outline" : "destructive"}>
            {report.storageAvailable ? "storage ready" : "storage blocked"}
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
          <Metric label="Events" value={report.eventCount} />
          <Metric label="Last 24h" value={report.last24hEventCount} />
          <Metric label="Last 7d" value={report.last7dEventCount} />
          <Metric label="Missing" value={report.missingCoverageCount} />
          <Metric label="External" value={report.externalReferrerCount} />
          <Metric label="Expired" value={report.retentionExpiredCount} />
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-3">
            {report.routes.slice(0, 9).map((route) => (
              <div
                key={route.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      {route.referrerKinds.includes("external") ? (
                        <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <Globe2 className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">{route.fileName}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="outline">{route.routeKind}</Badge>
                      <Badge variant={getStatusVariant(route.status)}>
                        {route.status}
                      </Badge>
                      <Badge variant="secondary">{route.eventCount} events</Badge>
                      <Badge variant="outline">
                        <ShieldCheck className="size-3" />
                        {route.tokenScope}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-muted-foreground">
                    {route.latestAt ? formatDate(route.latestAt) : "no events"}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs md:grid-cols-4">
                  <Info label="24h" value={`${route.last24hCount}`} />
                  <Info label="7d" value={`${route.last7dCount}`} />
                  <Info
                    label="Referrers"
                    value={route.referrerKinds.join(", ") || "none"}
                  />
                  <Info
                    label="Agents"
                    value={route.userAgentFamilies.join(", ") || "none"}
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {route.recommendation}
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

function getStatusVariant(status: AdminPublicRouteAnalyticsStatus) {
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
