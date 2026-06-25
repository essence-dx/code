import { CheckCircle2, Download, Scale, ShieldAlert, TriangleAlert, UserRoundCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReviewerWorkloadBalancingReport,
  BoardReviewerWorkloadRow,
  BoardReviewerWorkloadStatus,
} from "@/features/projects/board-reviewer-workload-balancing";

function statusVariant(status: BoardReviewerWorkloadStatus | BoardReviewerWorkloadBalancingReport["summary"]["status"]) {
  if (status === "blocked" || status === "overloaded") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReviewerWorkloadStatus | BoardReviewerWorkloadBalancingReport["summary"]["status"] }) {
  if (status === "ready" || status === "balanced") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" || status === "overloaded" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function WorkloadRow({ row }: { row: BoardReviewerWorkloadRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <UserRoundCheck className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.reviewerName}</p>
            <p className="truncate text-xs text-muted-foreground">{row.reviewerEmail ?? "Needs assignment"}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.workloadPoints} points</p>
      </TableCell>
      <TableCell className="text-sm">
        <p className="font-medium">
          {row.agendaItemCount}/{row.packetReviewCount}/{row.pendingAcknowledgementCount}/{row.exceptionSignoffCount}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">agenda / packets / ack / exceptions</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-3">{row.tasks.map((task) => task.label).join("; ")}</p>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-3">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReviewerWorkloadBalancingPanel({ report }: { report: BoardReviewerWorkloadBalancingReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="size-4" />
              Board reviewer workload
            </CardTitle>
            <CardDescription>Balances agenda ownership, packet reviews, route acknowledgements, and exception sign-offs before board closeout.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.balanceScore < 80 ? "destructive" : "outline"}>
              {report.summary.balanceScore}/100 balance
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
          <SummaryTile detail="reviewers" label="People" value={`${report.summary.reviewerCount}`} />
          <SummaryTile detail="total load" label="Points" value={`${report.summary.totalWorkloadPoints}`} />
          <SummaryTile detail="redistribute" label="Overloaded" value={`${report.summary.overloadedReviewerCount}`} />
          <SummaryTile detail="needs owner" label="Unassigned" value={`${report.summary.unassignedTaskCount}`} />
          <SummaryTile detail="monitor" label="Watch" value={`${report.summary.watchReviewerCount}`} />
          <SummaryTile detail="workspace" label="Workload" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Workload next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reviewer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mix</TableHead>
              <TableHead>Tasks</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <WorkloadRow key={row.reviewerEmail ?? row.reviewerName} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
