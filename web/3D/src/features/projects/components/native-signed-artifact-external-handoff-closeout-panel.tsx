import { BadgeCheck, CheckCircle2, Download, FileJson2, PackageCheck, ShieldAlert, Table2, TriangleAlert, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  NativeSignedArtifactExternalHandoffCloseoutFileFormat,
  NativeSignedArtifactExternalHandoffCloseoutReport,
  NativeSignedArtifactExternalHandoffCloseoutStatus,
  NativeSignedArtifactExternalHandoffRow,
} from "@/features/projects/native-signed-artifact-external-handoff-closeout";

function statusVariant(status: NativeSignedArtifactExternalHandoffCloseoutStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: NativeSignedArtifactExternalHandoffCloseoutStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function FileIcon({ format }: { format: NativeSignedArtifactExternalHandoffCloseoutFileFormat }) {
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

function CloseoutFlag({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <Badge className="gap-1 rounded-md" variant={enabled ? "outline" : "destructive"}>
      {enabled ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
      {label}
    </Badge>
  );
}

function HandoffRow({ row }: { row: NativeSignedArtifactExternalHandoffRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
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
      <TableCell className="max-w-[340px] whitespace-normal">
        <div className="flex flex-wrap gap-1.5">
          <CloseoutFlag enabled={row.attachmentLocationReady} label="location" />
          <CloseoutFlag enabled={row.ownerReady} label="owner" />
          <CloseoutFlag enabled={row.releaseGateDocumented} label="gate" />
          <CloseoutFlag enabled={row.evidencePacketLinked} label="packet" />
        </div>
      </TableCell>
      <TableCell className="max-w-[380px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.artifactAttachmentLocation || "missing artifact attachment location"}</p>
        <p className="mt-1 truncate">{row.blockingGate || "missing blocked gate"}</p>
        <p className="mt-1 truncate">{row.handoffOwner || "missing owner"}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.closeoutHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function NativeSignedArtifactExternalHandoffCloseoutPanel({ report }: { report: NativeSignedArtifactExternalHandoffCloseoutReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="size-4" />
              Native signed artifact handoff closeout
            </CardTitle>
            <CardDescription>External certificate-backed artifact attachment points, owner acknowledgement, and release gates that remain blocked until real signed artifacts are attached.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.closeoutScore < 80 ? "destructive" : "outline"}>
              {report.summary.closeoutScore}/100 closeout
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
          <SummaryTile detail="ready closeouts" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="release blockers" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="blocked gates tracked" label="Gates" value={`${report.summary.blockedReleaseGateCount}`} />
          <SummaryTile detail="owners acknowledged" label="Owners" value={`${report.summary.ownerAcknowledgedCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Closeout action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.closeoutHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Artifact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Closeout</TableHead>
              <TableHead>Ownership</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <HandoffRow key={row.platform} row={row} />)}</TableBody>
        </Table>

        <div className="flex flex-wrap gap-2">
          <Badge className="gap-1 rounded-md" variant="outline">
            <Download className="size-3.5" />
            {report.summary.closeoutHash}
          </Badge>
          <Badge className="gap-1 rounded-md" variant="outline">
            <UserCheck className="size-3.5" />
            owner acknowledged
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
