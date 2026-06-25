import { CheckCircle2, Download, FileJson2, RotateCcw, ShieldAlert, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  NativeUpdaterDownloadRehearsalEvidenceFileFormat,
  NativeUpdaterDownloadRehearsalEvidenceReport,
  NativeUpdaterDownloadRehearsalEvidenceStatus,
  NativeUpdaterDownloadRehearsalRow,
} from "@/features/projects/native-updater-download-rehearsal-evidence";

function statusVariant(status: NativeUpdaterDownloadRehearsalEvidenceStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: NativeUpdaterDownloadRehearsalEvidenceStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function FileIcon({ format }: { format: NativeUpdaterDownloadRehearsalEvidenceFileFormat }) {
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

function RehearsalFlag({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <Badge className="gap-1 rounded-md" variant={enabled ? "outline" : "destructive"}>
      {enabled ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
      {label}
    </Badge>
  );
}

function DownloadRow({ row }: { row: NativeUpdaterDownloadRehearsalRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <RotateCcw className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.platform}</p>
            <p className="truncate text-xs text-muted-foreground">{row.rehearsalId}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal">
        <div className="flex flex-wrap gap-1.5">
          <RehearsalFlag enabled={row.byteRangeResumeVerified} label="range resume" />
          <RehearsalFlag enabled={row.checksumVerified} label="checksum" />
          <RehearsalFlag enabled={row.expiredLinkHandled} label="expired link" />
          <RehearsalFlag enabled={row.byteCountReady} label="byte count" />
        </div>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate">{row.downloadUrl || "missing download URL"}</p>
        <p className="mt-1">
          resumed {row.resumedFromByte} / {row.finalByteCount}
        </p>
        <p className="mt-1 truncate font-mono">{row.artifactSha256}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.rehearsalHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function NativeUpdaterDownloadRehearsalEvidencePanel({ report }: { report: NativeUpdaterDownloadRehearsalEvidenceReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="size-4" />
              Native updater download rehearsal
            </CardTitle>
            <CardDescription>Byte-range resume, checksum verification, expired-link handling, and final byte-count evidence for native updater downloads.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.rehearsalScore < 80 ? "destructive" : "outline"}>
              {report.summary.rehearsalScore}/100 rehearsal
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
          <SummaryTile detail="ready rehearsals" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="needs review" label="Review" value={`${report.summary.reviewCount}`} />
          <SummaryTile detail="release blockers" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="expired-link coverage" label="Expired" value={`${report.summary.expiredLinkHandledCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Download action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.rehearsalHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Download</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <DownloadRow key={row.platform} row={row} />)}</TableBody>
        </Table>

        <Badge className="w-fit gap-1 rounded-md" variant="outline">
          <Download className="size-3.5" />
          {report.summary.rehearsalHash}
        </Badge>
      </CardContent>
    </Card>
  );
}
