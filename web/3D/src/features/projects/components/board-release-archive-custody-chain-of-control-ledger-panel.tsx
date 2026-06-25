import { CheckCircle2, Download, FileJson2, KeyRound, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveCustodyChainOfControlLedgerReport,
  BoardReleaseArchiveCustodyChainOfControlLedgerRow,
  BoardReleaseArchiveCustodyChainOfControlStatus,
} from "@/features/projects/board-release-archive-custody-chain-of-control-ledger";

function statusVariant(status: BoardReleaseArchiveCustodyChainOfControlStatus) {
  if (status === "broken") {
    return "destructive" as const;
  }

  return status === "pending" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveCustodyChainOfControlStatus }) {
  if (status === "sealed") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "broken" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function CustodyRow({ row }: { row: BoardReleaseArchiveCustodyChainOfControlLedgerRow }) {
  return (
    <TableRow>
      <TableCell className="w-16 font-mono text-xs text-muted-foreground">{row.sequence}</TableCell>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <KeyRound className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.artifact}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {row.fromOwner} to {row.toOwner}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.handedOffAt ?? "handoff pending"}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p className="font-medium">{row.owner}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{row.evidenceHash}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.custodyHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveCustodyChainOfControlLedgerPanel({
  report,
}: {
  report: BoardReleaseArchiveCustodyChainOfControlLedgerReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />
              Archive custody chain-of-control ledger
            </CardTitle>
            <CardDescription>Owner handoff ledger for accepted verification packets with timestamped custody hashes.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.custodyScore < 80 ? "destructive" : "outline"}>
              {report.summary.custodyScore}/100 custody
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
          <SummaryTile detail="custody handoffs" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="sealed custody" label="Sealed" value={`${report.summary.sealedCount}`} />
          <SummaryTile detail="handoff pending" label="Pending" value={`${report.summary.pendingCount}`} />
          <SummaryTile detail="needs repair" label="Broken" value={`${report.summary.brokenCount}`} />
          <SummaryTile detail="workspace" label="Ledger" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Custody next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.ledgerHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Seq</TableHead>
              <TableHead>Artifact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <CustodyRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
