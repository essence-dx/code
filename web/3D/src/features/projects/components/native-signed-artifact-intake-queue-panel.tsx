import { CheckCircle2, Download, FileJson2, PackageCheck, ShieldCheck, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  NativeSignedArtifactIntakeQueueFileFormat,
  NativeSignedArtifactIntakeQueueReport,
  NativeSignedArtifactIntakeQueueRow,
  NativeSignedArtifactIntakeQueueStatus,
} from "@/features/projects/native-signed-artifact-intake-queue";

function statusVariant(status: NativeSignedArtifactIntakeQueueStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: NativeSignedArtifactIntakeQueueStatus }) {
  return status === "ready" ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function FileIcon({ format }: { format: NativeSignedArtifactIntakeQueueFileFormat }) {
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

function IntakeFlag({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <Badge className="gap-1 rounded-md" variant={enabled ? "outline" : "destructive"}>
      {enabled ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
      {label}
    </Badge>
  );
}

function IntakeRow({ row }: { row: NativeSignedArtifactIntakeQueueRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <PackageCheck className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.platform}</p>
            <p className="truncate text-xs text-muted-foreground">{row.fileName}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[380px] whitespace-normal">
        <div className="flex flex-wrap gap-1.5">
          <IntakeFlag enabled={row.checksumReady} label="checksum" />
          <IntakeFlag enabled={row.signerReady} label="signer" />
          <IntakeFlag enabled={row.timestampReady} label="timestamp" />
          <IntakeFlag enabled={row.revocationReady} label="revocation" />
        </div>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate">{row.uploadOwner || "missing owner"}</p>
        <p className="mt-1 truncate">{row.signerIdentity || "missing signer"}</p>
        <p className="mt-1 truncate">{row.timestampAuthority || "missing timestamp authority"}</p>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate">{row.revocationStatus}</p>
        <p className="mt-1 truncate font-mono">{row.intakeHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function NativeSignedArtifactIntakeQueuePanel({ report }: { report: NativeSignedArtifactIntakeQueueReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Signed artifact intake queue
            </CardTitle>
            <CardDescription>Certificate-backed Windows, macOS, and Linux package intake with checksum, signer, timestamp, revocation, owner, and exportable fulfillment evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.intakeScore < 80 ? "destructive" : "outline"}>
              {report.summary.intakeScore}/100 intake
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
          <SummaryTile detail="ready rows" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="checksums" label="Checksum" value={`${report.summary.checksumReadyCount}`} />
          <SummaryTile detail="signers" label="Signer" value={`${report.summary.signerReadyCount}`} />
          <SummaryTile detail="clear revocations" label="Revocation" value={`${report.summary.revocationClearCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Intake action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.intakeHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <IntakeRow key={row.platform} row={row} />)}</TableBody>
        </Table>

        <Badge className="w-fit gap-1 rounded-md" variant="outline">
          <Download className="size-3.5" />
          {report.summary.intakeHash}
        </Badge>
      </CardContent>
    </Card>
  );
}
