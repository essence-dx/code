import { CheckCircle2, Download, FileJson2, ShieldAlert, TriangleAlert, UserCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveEvidenceReviewerPacket,
  BoardReleaseArchiveEvidenceReviewerPacketReport,
  BoardReleaseArchiveEvidenceReviewerPacketStatus,
} from "@/features/projects/board-release-archive-evidence-reviewer-packets";

function statusVariant(status: BoardReleaseArchiveEvidenceReviewerPacketStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveEvidenceReviewerPacketStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function PacketRow({ packet }: { packet: BoardReleaseArchiveEvidenceReviewerPacket }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <UserCheck2 className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{packet.title}</p>
            <p className="truncate text-xs text-muted-foreground">{packet.audience}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(packet.status)}>
          <StatusIcon status={packet.status} />
          {packet.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{packet.visibility}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p className="font-medium">{packet.reviewerName}</p>
        <p className="truncate text-xs text-muted-foreground">{packet.reviewerEmail ?? packet.requiredRole}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p>{packet.acknowledgementWindowHours} hours</p>
        <p className="text-xs text-muted-foreground">{packet.sourceHashes.length} hashes</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{packet.nextAction}</p>
        <p className="mt-1 truncate font-mono">{packet.packetHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveEvidenceReviewerPacketsPanel({
  report,
}: {
  report: BoardReleaseArchiveEvidenceReviewerPacketReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck2 className="size-4" />
              Archive evidence reviewer packets
            </CardTitle>
            <CardDescription>Redacted reviewer packet views with source hashes, acknowledgement windows, and audience-specific evidence controls.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.reviewerScore < 80 ? "destructive" : "outline"}>
              {report.summary.reviewerScore}/100 reviewer
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
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="packet views" label="Packets" value={`${report.summary.packetCount}`} />
          <SummaryTile detail="external redacted" label="External" value={`${report.summary.externalPacketCount}`} />
          <SummaryTile detail="needs acknowledgement" label="Ack required" value={`${report.summary.acknowledgementRequiredCount}`} />
          <SummaryTile detail="ready packets" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="watch packets" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="removed fields" label="Redactions" value={`${report.summary.totalRedactionCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Reviewer packet next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.reviewerPacketHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Packet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>Acknowledgement</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.packets.map((packet) => <PacketRow key={packet.id} packet={packet} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
