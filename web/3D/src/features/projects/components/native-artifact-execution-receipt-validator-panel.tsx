import { CheckCircle2, Download, FileJson2, PackageCheck, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  NativeArtifactExecutionReceiptFileFormat,
  NativeArtifactExecutionReceiptStatus,
  NativeArtifactExecutionReceiptValidatorReport,
} from "@/features/projects/native-artifact-execution-receipt-validator";

function statusVariant(status: NativeArtifactExecutionReceiptStatus) {
  return status === "blocked" ? "destructive" : "outline";
}

function StatusIcon({ status }: { status: NativeArtifactExecutionReceiptStatus }) {
  return status === "blocked" ? <TriangleAlert className="size-3.5" /> : <CheckCircle2 className="size-3.5" />;
}

function FileIcon({ format }: { format: NativeArtifactExecutionReceiptFileFormat }) {
  return format === "json" ? <FileJson2 className="size-4" /> : <Table2 className="size-4" />;
}

export function NativeArtifactExecutionReceiptValidatorPanel({ report }: { report: NativeArtifactExecutionReceiptValidatorReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="size-4" />
              Native artifact execution receipts
            </CardTitle>
            <CardDescription>Validation for uploaded signed artifacts against updater manifests, certificate fingerprints, and release-channel expectations.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.validationScore < 100 ? "destructive" : "outline"}>
              {report.summary.validationScore}/100 receipts
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 xl:grid-cols-3">
          {report.rows.map((row) => (
            <div key={row.receiptId} className="rounded-md border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.fileName}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{row.manifestFileName}</p>
                </div>
                <Badge className="shrink-0 gap-1 rounded-md" variant={statusVariant(row.status)}>
                  <StatusIcon status={row.status} />
                  {row.status}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <Badge className="rounded-md" variant={row.manifestMatchesArtifact ? "outline" : "destructive"}>
                  manifest
                </Badge>
                <Badge className="rounded-md" variant={row.certificateMatchesExpectation ? "outline" : "destructive"}>
                  certificate
                </Badge>
                <Badge className="rounded-md" variant={row.channelMatchesExpectation ? "outline" : "destructive"}>
                  channel
                </Badge>
              </div>
              <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{row.validationHash}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {report.files.map((file) => (
            <Button key={file.format} render={<a download={file.download} href={file.href} />} className="gap-2" size="sm" variant="outline">
              <FileIcon format={file.format} />
              {file.label}
            </Button>
          ))}
          <Badge className="gap-1 rounded-md" variant="outline">
            <Download className="size-3.5" />
            {report.summary.validationHash}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
