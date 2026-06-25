import { Archive, CheckCircle2, Download, FileJson2, PackageCheck, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseOperationsExportPacket,
  BoardReleaseOperationsExportPacketFile,
  BoardReleaseOperationsExportPacketReport,
  BoardReleaseOperationsExportPacketStatus,
} from "@/features/projects/board-release-operations-export-packets";

function statusVariant(status: BoardReleaseOperationsExportPacketStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseOperationsExportPacketStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(value));
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

function PacketRow({ packet }: { packet: BoardReleaseOperationsExportPacket }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <PackageCheck className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{packet.releasePromotionId ?? "Unassigned release"}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{packet.packetId}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(packet.status)}>
          <StatusIcon status={packet.status} />
          {packet.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">signed {formatDate(packet.signedAt)}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{packet.notificationEligibleRouteCount} routes</p>
        <p>{packet.varianceCount} variances</p>
      </TableCell>
      <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
        <p>{packet.signerName}</p>
        <p className="truncate font-mono">{packet.signatureHash}</p>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate font-mono">{packet.manifestHash}</p>
        <p className="mt-1 truncate font-mono">{packet.packetHash}</p>
      </TableCell>
    </TableRow>
  );
}

function FileRow({ file }: { file: BoardReleaseOperationsExportPacketFile }) {
  return (
    <TableRow>
      <TableCell>
        <Badge className="rounded-md" variant="outline">
          {file.fileKind}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[360px] truncate font-mono text-xs text-muted-foreground">{file.fileName}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{file.rowCount}</TableCell>
      <TableCell className="max-w-[360px] truncate font-mono text-xs text-muted-foreground">{file.fileHash}</TableCell>
    </TableRow>
  );
}

export function BoardReleaseOperationsExportPacketsPanel({ report }: { report: BoardReleaseOperationsExportPacketReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="size-4" />
              Board release operations export packets
            </CardTitle>
            <CardDescription>Signed manifests that bundle archive records, notification route evidence, and variance summaries.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.exportFileCount} files
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.jsonFileName} href={report.jsonDataUri}>
              <FileJson2 className="size-4" />
              JSON
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <SummaryTile detail="export packets" label="Packets" value={`${report.summary.packetCount}`} />
          <SummaryTile detail="signed packets" label="Signed" value={`${report.summary.signedPacketCount}`} />
          <SummaryTile detail="blocked packets" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="variance rows" label="Variance" value={`${report.summary.varianceCount}`} />
          <SummaryTile detail="blockers" label="Blockers" value={`${report.summary.varianceBlockerCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Export packet next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Packet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Signature</TableHead>
              <TableHead>Hashes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.packets.map((packet) => <PacketRow key={packet.packetId} packet={packet} />)}</TableBody>
        </Table>

        <div className="rounded-md border bg-background p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Archive className="size-4" />
            Manifest files
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kind</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{report.files.map((file) => <FileRow file={file} key={`${file.fileKind}:${file.fileName}`} />)}</TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
