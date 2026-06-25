import {
  ClipboardCopy,
  Download,
  FileJson2,
  Frame,
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
  AdminEmbedSecurityReport,
  AdminEmbedSecurityStatus,
} from "@/features/admin/admin-embed-security";
import {
  getAdminEmbedSecurityCsv,
  getAdminEmbedSecurityJson,
  getAdminEmbedSecurityMarkdown,
} from "@/features/admin/admin-embed-security-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminEmbedSecurityPanelProps = {
  report: AdminEmbedSecurityReport;
};

export function AdminEmbedSecurityPanel({
  report,
}: AdminEmbedSecurityPanelProps) {
  function exportJson() {
    downloadTextFile({
      filename: "embed-security.json",
      content: getAdminEmbedSecurityJson(report),
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      filename: "embed-security.csv",
      content: getAdminEmbedSecurityCsv(report),
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      filename: "embed-security.md",
      content: getAdminEmbedSecurityMarkdown(report),
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(getAdminEmbedSecurityMarkdown(report));
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Frame className="size-4" />
            Embed security
          </CardTitle>
          <CardDescription>
            Host allowlists, frame policy headers, sandbox presets, and observed
            host evidence for externally embedded design views.
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
          <Metric label="Embeds" value={report.embedShareCount} />
          <Metric label="Allowlisted" value={report.configuredAllowlistCount} />
          <Metric label="Observed" value={report.observedOriginCount} />
          <Metric label="Blocked" value={report.blockedObservedOriginCount} />
          <Metric label="Missing" value={report.missingHostEvidenceCount} />
          <Metric label="Strict" value={report.strictSandboxCount} />
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-3">
            {report.targets.slice(0, 8).map((target) => (
              <div
                key={target.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      <Globe2 className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{target.fileName}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant={getStatusVariant(target.status)}>
                        {target.status}
                      </Badge>
                      <Badge variant="outline">{target.framePolicy}</Badge>
                      <Badge variant="secondary">{target.sandboxPreset}</Badge>
                      <Badge variant={target.configured ? "outline" : "secondary"}>
                        <ShieldCheck className="size-3" />
                        {target.configured ? "configured" : "default"}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-muted-foreground">
                    {target.eventCount} events
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
                  <Info
                    label="Allowlist"
                    value={target.allowedOrigins.join(", ") || "self only"}
                  />
                  <Info
                    label="Observed"
                    value={target.observedOrigins.join(", ") || "none"}
                  />
                  <Info
                    label="Blocked"
                    value={target.blockedObservedOrigins.join(", ") || "none"}
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {target.sandboxAttributes}
                </p>
              </div>
            ))}
          </div>

          <div className="grid content-start gap-3">
            {report.rows.slice(0, 8).map((row) => (
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

function getStatusVariant(status: AdminEmbedSecurityStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
