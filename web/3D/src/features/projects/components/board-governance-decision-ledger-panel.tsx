import { CheckCircle2, Download, Landmark, Link2, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardGovernanceDecisionLedgerReport,
  BoardGovernanceDecisionLedgerRow,
  BoardGovernanceDecisionLedgerStatus,
} from "@/features/projects/board-governance-decision-ledger";

function statusVariant(status: BoardGovernanceDecisionLedgerStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardGovernanceDecisionLedgerStatus }) {
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

function DecisionRow({ row }: { row: BoardGovernanceDecisionLedgerRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Landmark className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{row.detail}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.score}/100</p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-sm">
        <p className="font-medium">{row.owner}</p>
        <p className="mt-1 text-xs text-muted-foreground">{row.source}</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-3">{row.nextAction}</p>
      </TableCell>
      <TableCell className="max-w-[220px] break-all font-mono text-xs text-muted-foreground">{row.sourceHash ?? row.sourceId}</TableCell>
    </TableRow>
  );
}

export function BoardGovernanceDecisionLedgerPanel({ report }: { report: BoardGovernanceDecisionLedgerReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="size-4" />
              Board governance decision ledger
            </CardTitle>
            <CardDescription>Agenda decisions, packet approvals, exceptions, audit export findings, and closeout controls in one traceable ledger.</CardDescription>
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
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="ledger rows" label="Decisions" value={`${report.summary.decisionCount}`} />
          <SummaryTile detail="source links" label="Sources" value={`${report.summary.linkedSourceCount}`} />
          <SummaryTile detail="needs action" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="monitor" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="complete" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="workspace" label="Ledger" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Decision next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            <Link2 className="mr-1 inline size-3.5" />
            {report.summary.linkedSourceCount} linked governance source{report.summary.linkedSourceCount === 1 ? "" : "s"} are attached to this closeout ledger.
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Decision</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Next action</TableHead>
              <TableHead>Source hash</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.decisions.map((row) => <DecisionRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
