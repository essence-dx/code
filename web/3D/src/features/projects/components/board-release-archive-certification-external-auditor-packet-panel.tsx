import { CheckCircle2, Download, FileJson2, ShieldAlert, TriangleAlert, UserRoundCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveCertificationAuditorPacketRow,
  BoardReleaseArchiveCertificationAuditorPacketStatus,
  BoardReleaseArchiveCertificationExternalAuditorPacketReport,
} from "@/features/projects/board-release-archive-certification-external-auditor-packet";

function statusVariant(status: BoardReleaseArchiveCertificationAuditorPacketStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveCertificationAuditorPacketStatus }) {
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

function PacketRow({ row }: { row: BoardReleaseArchiveCertificationAuditorPacketRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <UserRoundCheck className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="truncate text-xs text-muted-foreground">{row.kind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.sourceStatus}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p className="font-medium">{row.auditorAudience}</p>
        <p className="text-xs text-muted-foreground">expires {row.accessExpiresAt}</p>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.redactionScope}</p>
        <p className="mt-1 truncate">{row.redactedFields.length} redactions</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.acknowledgementProofHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveCertificationExternalAuditorPacketPanel({
  report,
}: {
  report: BoardReleaseArchiveCertificationExternalAuditorPacketReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserRoundCheck className="size-4" />
              Archive certification external auditor packet
            </CardTitle>
            <CardDescription>Scoped auditor packet with redactions, access expiry, source hashes, and acknowledgement proof for certification review.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.packetScore < 80 ? "destructive" : "outline"}>
              {report.summary.packetScore}/100 packet
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
          <SummaryTile detail="auditor views" label="Packets" value={`${report.summary.packetCount}`} />
          <SummaryTile detail="ready views" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="watch views" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="blocked views" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="removed fields" label="Redactions" value={`${report.summary.redactionCount}`} />
          <SummaryTile detail="workspace" label="Auditor" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Auditor packet next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.externalPacketHash}</p>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{report.summary.acknowledgementProofHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Packet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Acknowledgement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <PacketRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
