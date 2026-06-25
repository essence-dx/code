import { CheckCircle2, ClipboardList, Download, FileJson2, ShieldAlert, TriangleAlert, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveGovernanceAutomationFailureLedgerReport,
  BoardReleaseArchiveGovernanceAutomationFailureLedgerRow,
  BoardReleaseArchiveGovernanceAutomationFailureLedgerStatus,
} from "@/features/projects/board-release-archive-governance-automation-failure-ledger";

function statusVariant(status: BoardReleaseArchiveGovernanceAutomationFailureLedgerStatus) {
  if (status === "blocking") {
    return "destructive" as const;
  }

  return status === "monitor" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveGovernanceAutomationFailureLedgerStatus }) {
  if (status === "clear") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocking" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function LedgerRow({ row }: { row: BoardReleaseArchiveGovernanceAutomationFailureLedgerRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Wrench className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="text-xs text-muted-foreground">{row.kind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{row.ownerRole}</p>
        <p>{row.sourceCount} evidence links</p>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant={row.severity === "high" ? "destructive" : "outline"}>
          {row.severity}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.evidenceHash}</p>
        <p className="mt-1 truncate font-mono">{row.remediationHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveGovernanceAutomationFailureLedgerPanel({
  report,
}: {
  report: BoardReleaseArchiveGovernanceAutomationFailureLedgerReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4" />
              Archive governance automation failure ledger
            </CardTitle>
            <CardDescription>Missed triggers, stale recommendations, blocked owners, and remediation approval evidence.</CardDescription>
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail="ledger rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="clear rows" label="Clear" value={`${report.summary.clearCount}`} />
          <SummaryTile detail="monitor rows" label="Monitor" value={`${report.summary.monitorCount}`} />
          <SummaryTile detail="blocking rows" label="Blocking" value={`${report.summary.blockingCount}`} />
          <SummaryTile detail="workspace" label="Ledger" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Failure action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.ledgerHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Failure</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <LedgerRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
