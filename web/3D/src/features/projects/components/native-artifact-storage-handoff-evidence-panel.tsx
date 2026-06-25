import { CheckCircle2, CloudUpload, Download, FileJson2, PackageCheck, ShieldAlert, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  NativeArtifactStorageHandoffEvidenceReport,
  NativeArtifactStorageHandoffFileFormat,
  NativeArtifactStorageHandoffRow,
  NativeArtifactStorageHandoffStatus,
} from "@/features/projects/native-artifact-storage-handoff-evidence";

function statusVariant(status: NativeArtifactStorageHandoffStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: NativeArtifactStorageHandoffStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function FileIcon({ format }: { format: NativeArtifactStorageHandoffFileFormat }) {
  return format === "json" ? <FileJson2 className="size-4" /> : <Table2 className="size-4" />;
}

function SummaryTile({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function EvidenceFlag({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <Badge className="gap-1 rounded-md" variant={enabled ? "outline" : "secondary"}>
      {enabled ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
      {label}
    </Badge>
  );
}

function HandoffRow({ row }: { row: NativeArtifactStorageHandoffRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <PackageCheck className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.artifactFileName}</p>
            <p className="truncate text-xs text-muted-foreground">{row.platform}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
        <p>{row.storageProvider}</p>
        <p className="mt-1 truncate">{row.accessPolicy}</p>
        <p className="mt-1 truncate">{row.storageUrl || "missing hosted URL"}</p>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex flex-wrap gap-1.5">
          <EvidenceFlag enabled={row.checksumVerified} label="checksum" />
          <EvidenceFlag enabled={row.retentionReady} label={`${row.retentionDays}d retention`} />
          <EvidenceFlag enabled={row.updaterManifestLinked} label="manifest" />
        </div>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.handoffHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function NativeArtifactStorageHandoffEvidencePanel({ report }: { report: NativeArtifactStorageHandoffEvidenceReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CloudUpload className="size-4" />
              Native artifact storage handoff
            </CardTitle>
            <CardDescription>Hosted package evidence for signed artifacts, retention readiness, checksums, and updater manifest linkage.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.handoffScore < 80 ? "destructive" : "outline"}>
              {report.summary.handoffScore}/100 handoff
            </Badge>
            {report.files.map((file) => (
              <Button key={file.format} render={<a download={file.download} href={file.href} />} className="h-8 gap-2" size="sm" variant="outline">
                <FileIcon format={file.format} />
                {file.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail="platform rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="ready storage" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="needs review" label="Review" value={`${report.summary.reviewCount}`} />
          <SummaryTile detail="release blockers" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="provider" label="Provider" value={report.provider} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Storage action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.handoffHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Artifact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Hosting</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <HandoffRow key={row.platform} row={row} />)}</TableBody>
        </Table>

        <Badge className="w-fit gap-1 rounded-md" variant="outline">
          <Download className="size-3.5" />
          {report.summary.handoffHash}
        </Badge>
      </CardContent>
    </Card>
  );
}
