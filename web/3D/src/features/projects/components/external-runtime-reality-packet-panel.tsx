import { CheckCircle2, Download, FileJson2, Gauge, ShieldAlert, ShieldCheck, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  ExternalRuntimeRealityFileFormat,
  ExternalRuntimeRealityPacket,
  ExternalRuntimeRealityRow,
  ExternalRuntimeRealityStatus,
} from "@/features/projects/external-runtime-reality-packet";

function statusVariant(status: ExternalRuntimeRealityStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: ExternalRuntimeRealityStatus }) {
  return status === "ready" ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function FileIcon({ format }: { format: ExternalRuntimeRealityFileFormat }) {
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

function RealityFlag({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <Badge className="gap-1 rounded-md" variant={enabled ? "outline" : "destructive"}>
      {enabled ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
      {label}
    </Badge>
  );
}

function RealityRow({ row }: { row: ExternalRuntimeRealityRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Gauge className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.gate}</p>
            <p className="truncate text-xs text-muted-foreground">{row.operatorOwner || "missing owner"}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex flex-wrap gap-1.5">
          <RealityFlag enabled={row.evidenceLinked} label="evidence" />
          <RealityFlag enabled={row.operatorReady} label="owner" />
          <RealityFlag enabled={row.releaseApprovalReady} label="approval" />
          <Badge className="rounded-md" variant={row.score < 90 ? "secondary" : "outline"}>
            {row.score}/100
          </Badge>
        </div>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.evidenceUrl || "missing evidence URL"}</p>
        <p className="mt-1 truncate font-mono">{row.packetHash}</p>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function ExternalRuntimeRealityPacketPanel({ packet }: { packet: ExternalRuntimeRealityPacket }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {packet.summary.releaseApprovalBlocked ? <ShieldAlert className="size-4" /> : <ShieldCheck className="size-4" />}
              External runtime reality packet
            </CardTitle>
            <CardDescription>Release decision packet joining signed package verification, CAD process evidence, and freshness blockers.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(packet.summary.status)}>
              <StatusIcon status={packet.summary.status} />
              {packet.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={packet.summary.releaseApprovalBlocked ? "destructive" : "outline"}>
              {packet.summary.releaseApprovalBlocked ? "approval blocked" : "approval ready"}
            </Badge>
            <Badge className="rounded-md" variant={packet.summary.packetScore < 80 ? "destructive" : "outline"}>
              {packet.summary.packetScore}/100 reality
            </Badge>
            {packet.files.map((file) => (
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
          <SummaryTile detail="reality gates" label="Rows" value={`${packet.summary.rowCount}`} />
          <SummaryTile detail="ready gates" label="Ready" value={`${packet.summary.readyCount}`} />
          <SummaryTile detail="blocked gates" label="Blocked" value={`${packet.summary.blockedCount}`} />
          <SummaryTile detail="operator owned" label="Owners" value={`${packet.summary.operatorReadyCount}`} />
          <SummaryTile detail="release approval" label="Approval" value={packet.summary.releaseApprovalBlocked ? "blocked" : "ready"} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Runtime reality action</p>
          <p className="mt-1 text-sm text-muted-foreground">{packet.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{packet.summary.packetHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Readiness</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{packet.rows.map((row) => <RealityRow key={row.gate} row={row} />)}</TableBody>
        </Table>

        <Badge className="w-fit gap-1 rounded-md" variant="outline">
          <Download className="size-3.5" />
          {packet.summary.packetHash}
        </Badge>
      </CardContent>
    </Card>
  );
}
