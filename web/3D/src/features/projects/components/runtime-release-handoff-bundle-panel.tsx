import { CheckCircle2, Download, FileJson2, FileText, PackageCheck, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RuntimeReleaseHandoffBundle, RuntimeReleaseHandoffBundleFormat, RuntimeReleaseHandoffBundleStatus } from "@/features/projects/runtime-release-handoff-bundle";

function statusVariant(status: RuntimeReleaseHandoffBundleStatus) {
  return status === "ready" ? "outline" : "destructive";
}

function StatusIcon({ status }: { status: RuntimeReleaseHandoffBundleStatus }) {
  return status === "ready" ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function FileIcon({ format }: { format: RuntimeReleaseHandoffBundleFormat }) {
  if (format === "json") {
    return <FileJson2 className="size-4" />;
  }

  if (format === "csv") {
    return <Table2 className="size-4" />;
  }

  return <FileText className="size-4" />;
}

export function RuntimeReleaseHandoffBundlePanel({ bundle }: { bundle: RuntimeReleaseHandoffBundle }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="size-4" />
              Runtime release handoff
            </CardTitle>
            <CardDescription>Audit-safe Markdown, CSV, and JSON approval bundle for runtime release reviewer handoff.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(bundle.summary.status)}>
              <StatusIcon status={bundle.summary.status} />
              {bundle.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={bundle.summary.bundleScore < 100 ? "destructive" : "outline"}>
              {bundle.summary.bundleScore}/100 bundle
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          {bundle.sections.map((section) => (
            <div key={section.id} className="rounded-md border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{section.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{section.nextAction}</p>
                  <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{section.evidenceHash}</p>
                </div>
                <Badge className="shrink-0 rounded-md" variant={statusVariant(section.status)}>
                  {section.score}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {bundle.files.map((file) => (
            <Button key={file.format} render={<a download={file.download} href={file.href} />} className="gap-2" size="sm" variant="outline">
              <FileIcon format={file.format} />
              {file.label}
            </Button>
          ))}
          <Badge className="gap-1 rounded-md" variant="outline">
            <Download className="size-3.5" />
            {bundle.summary.bundleHash}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
