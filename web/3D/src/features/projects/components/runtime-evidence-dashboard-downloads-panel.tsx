import { CheckCircle2, Download, FileJson2, FileText, History, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RuntimeDeployVerificationHistory } from "@/features/projects/runtime-deploy-verification-history";
import {
  createRuntimeEvidenceDashboardDownloads,
  type RuntimeEvidenceDashboardDownload,
} from "@/features/projects/runtime-evidence-dashboard-downloads";
import type { RuntimeQaPacket } from "@/features/projects/runtime-qa-packet";

function formatIcon(format: RuntimeEvidenceDashboardDownload["format"]) {
  if (format === "json") {
    return <FileJson2 className="size-4" />;
  }

  if (format === "csv") {
    return <Table2 className="size-4" />;
  }

  return <FileText className="size-4" />;
}

function statusVariant(status: "blocked" | "ready") {
  return status === "blocked" ? "destructive" : "outline";
}

function StatusIcon({ status }: { status: "blocked" | "ready" }) {
  return status === "ready" ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function DownloadControl({ download }: { download: RuntimeEvidenceDashboardDownload }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            {formatIcon(download.format)}
            <span className="truncate">{download.label}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{download.description}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{download.hash}</p>
        </div>
        <Button render={<a download={download.download} href={download.href} />} className="h-8 shrink-0 gap-2" size="sm" variant="outline">
          <Download className="size-4" />
          Download
        </Button>
      </div>
    </div>
  );
}

export function RuntimeEvidenceDashboardDownloadsPanel({
  deployHistory,
  runtimeQaPacket,
}: {
  deployHistory?: RuntimeDeployVerificationHistory | null;
  runtimeQaPacket: RuntimeQaPacket;
}) {
  const downloads = createRuntimeEvidenceDashboardDownloads({ deployHistory, runtimeQaPacket });

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4" />
              Runtime evidence downloads
            </CardTitle>
            <CardDescription>Reviewer-ready runtime QA and deploy verification packet downloads for release evidence review.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(runtimeQaPacket.summary.status)}>
              <StatusIcon status={runtimeQaPacket.summary.status} />
              QA {runtimeQaPacket.summary.status}
            </Badge>
            {deployHistory ? (
              <Badge className="gap-1 rounded-md" variant={statusVariant(deployHistory.summary.status)}>
                <StatusIcon status={deployHistory.summary.status} />
                Deploy {deployHistory.summary.status}
              </Badge>
            ) : null}
            <Badge className="rounded-md" variant={runtimeQaPacket.summary.qaScore < 80 ? "destructive" : "outline"}>
              {runtimeQaPacket.summary.qaScore}/100 QA
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {downloads.map((download) => (
          <DownloadControl key={download.id} download={download} />
        ))}
      </CardContent>
    </Card>
  );
}
