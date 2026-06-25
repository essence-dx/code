import { CheckCircle2, Download, FileJson2, Gauge, Scale, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveStewardshipExceptionBudgetLedgerReport,
  BoardReleaseArchiveStewardshipExceptionBudgetLedgerRow,
  BoardReleaseArchiveStewardshipExceptionBudgetStatus,
} from "@/features/projects/board-release-archive-stewardship-exception-budget-ledger";

function statusVariant(status: BoardReleaseArchiveStewardshipExceptionBudgetStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveStewardshipExceptionBudgetStatus }) {
  if (status === "approved") {
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

function BudgetRow({ row }: { row: BoardReleaseArchiveStewardshipExceptionBudgetLedgerRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Scale className="size-3.5" />
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
        <p>Risk {row.acceptedRisk}/100</p>
        <p>Burn-down {row.burnDownPercent}%</p>
        <p>Score {row.budgetScore}/100</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{row.expiryAt}</p>
        <p className="mt-1 truncate font-mono">{row.boardApprovalHash ?? "approval pending"}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.budgetHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveStewardshipExceptionBudgetLedgerPanel({
  report,
}: {
  report: BoardReleaseArchiveStewardshipExceptionBudgetLedgerReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="size-4" />
              Archive stewardship exception budget ledger
            </CardTitle>
            <CardDescription>Track accepted risk, expiry windows, board approval evidence, and burn-down before release archive stewardship exceptions drift.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.budgetScore < 80 ? "destructive" : "outline"}>
              {report.summary.budgetScore}/100 budget
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
          <SummaryTile detail="budget rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="approved rows" label="Approved" value={`${report.summary.approvedCount}`} />
          <SummaryTile detail="watch rows" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="blocked rows" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="workspace" label="Ledger" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Gauge className="size-4" />
            Exception budget next action
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.budgetLedgerHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Budget area</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Expiry and approval</TableHead>
              <TableHead>Burn-down</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <BudgetRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
