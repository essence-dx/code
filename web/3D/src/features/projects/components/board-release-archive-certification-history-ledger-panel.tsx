import { CheckCircle2, Download, FileJson2, History, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveCertificationHistoryEntry,
  BoardReleaseArchiveCertificationHistoryLedgerReport,
  BoardReleaseArchiveCertificationHistoryLedgerStatus,
} from "@/features/projects/board-release-archive-certification-history-ledger";

function statusVariant(status: BoardReleaseArchiveCertificationHistoryLedgerStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "historical" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveCertificationHistoryLedgerStatus }) {
  if (status === "current") {
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

function LedgerRow({ row }: { row: BoardReleaseArchiveCertificationHistoryEntry }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <History className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.version}</p>
            <p className="truncate text-xs text-muted-foreground">{row.issuedAt}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.revocationState}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p className="font-medium">{row.issuer}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{row.issuerNote}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate font-mono">{row.certificateHash}</p>
        <p className="mt-1 truncate">parent {row.parentCertificateHash ?? "none"}</p>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveCertificationHistoryLedgerPanel({
  report,
}: {
  report: BoardReleaseArchiveCertificationHistoryLedgerReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4" />
              Archive certification history ledger
            </CardTitle>
            <CardDescription>Versioned certificate history with issuer notes, parent hashes, and revocation state for archive closeout certification.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.ledgerScore < 80 ? "destructive" : "outline"}>
              {report.summary.ledgerScore}/100 ledger
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
          <SummaryTile detail="ledger versions" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="current version" label="Current" value={report.summary.currentVersion} />
          <SummaryTile detail="active versions" label="Active" value={`${report.summary.activeCount}`} />
          <SummaryTile detail="superseded versions" label="Superseded" value={`${report.summary.supersededCount}`} />
          <SummaryTile detail="revocation holds" label="Holds" value={`${report.summary.revocationHoldCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Certification ledger next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.ledgerHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issuer</TableHead>
              <TableHead>Hashes</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <LedgerRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
